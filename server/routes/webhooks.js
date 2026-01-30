const express = require("express");
const Stripe = require("stripe");
const prisma = require("../db/client");
const { resolveMinecraftUuid } = require("../services/mojang");

const router = express.Router();

function getStripe(){
  const key = process.env.STRIPE_SECRET_KEY;
  if(!key){
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key, { apiVersion: "2023-10-16" });
}

router.post("/stripe", async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if(!webhookSecret){
    console.warn("STRIPE_WEBHOOK_SECRET not set; refusing webhook.");
    return res.status(500).send("Webhook secret missing");
  }

  const signature = req.headers["stripe-signature"];
  let event;

  try{
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  }catch(error){
    console.error("Stripe webhook signature verification failed:", error.message);
    return res.status(400).send("Invalid signature");
  }

  const existing = await prisma.order.findFirst({
    where: { provider_event_id: event.id }
  });
  if(existing){
    return res.json({ received: true, duplicate: true });
  }

  if(event.type !== "checkout.session.completed"){
    return res.json({ received: true });
  }

  const session = event.data.object;
  const plotId = session.metadata?.plot_id;
  if(!plotId){
    console.warn("checkout.session.completed missing plot_id metadata");
    return res.json({ received: true });
  }

  const buyerName = session.metadata?.minecraft_username || session.customer_details?.name || "Unknown";
  const buyerEmail = session.customer_details?.email || session.customer_email || session.metadata?.email || null;

  const plot = await prisma.plot.findUnique({ where: { plot_id: plotId } });
  if(!plot){
    console.warn(`Plot ${plotId} not found for session ${session.id}`);
    return res.json({ received: true });
  }

  const ownerUuid = await resolveMinecraftUuid(buyerName);

  // Transaction ensures plot availability, order update, and fulfillment creation stay consistent.
  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.plot.updateMany({
      where: { plot_id: plotId, status: "available" },
      data: { status: "owned", owner_name: buyerName, owner_uuid: ownerUuid }
    });

    if(updateResult.count === 0){
      // Plot already owned: record the failed order and handle refund manually in Stripe if needed.
      await tx.order.upsert({
        where: { stripe_session_id: session.id },
        update: {
          status: "failed",
          provider_event_id: event.id,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          amount_cents: session.amount_total || plot?.price_cents || 0
        },
        create: {
          provider: "stripe",
          provider_event_id: event.id,
          stripe_session_id: session.id,
          plot_id: plotId,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          amount_cents: session.amount_total || plot?.price_cents || 0,
          status: "failed"
        }
      });
      return;
    }

    await tx.order.upsert({
      where: { stripe_session_id: session.id },
      update: {
        status: "fulfilled",
        provider_event_id: event.id,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        amount_cents: session.amount_total || plot?.price_cents || 0
      },
      create: {
        provider: "stripe",
        provider_event_id: event.id,
        stripe_session_id: session.id,
        plot_id: plotId,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        amount_cents: session.amount_total || plot?.price_cents || 0,
        status: "fulfilled"
      }
    });

    await tx.fulfillment.create({
      data: {
        plot_id: plotId,
        owner_name: buyerName,
        owner_uuid: ownerUuid,
        status: "pending"
      }
    });
  });

  res.json({ received: true });
});

module.exports = router;

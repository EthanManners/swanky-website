const express = require("express");
const Stripe = require("stripe");
const prisma = require("../db/client");

const router = express.Router();

function getStripe(){
  const key = process.env.STRIPE_SECRET_KEY;
  if(!key){
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key, { apiVersion: "2023-10-16" });
}

router.post("/create", async (req, res) => {
  const { plot_id: plotId, minecraft_username: username, email } = req.body || {};

  if(!plotId || !username){
    return res.status(400).json({ error: "plot_id and minecraft_username are required" });
  }

  const plot = await prisma.plot.findUnique({ where: { plot_id: plotId } });
  if(!plot){
    return res.status(404).json({ error: "Plot not found" });
  }
  if(plot.status !== "available"){
    return res.status(409).json({ error: "Plot is not available" });
  }

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";

  let session;
  try{
    const stripe = getStripe();
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plot.price_cents,
            product_data: {
              name: `Plot ${plot.plot_id}`,
              description: plot.district ? `District: ${plot.district}` : "Land plot"
            }
          }
        }
      ],
      success_url: `${baseUrl}/ledger/?success=1&plot_id=${encodeURIComponent(plot.plot_id)}`,
      cancel_url: `${baseUrl}/ledger/?canceled=1&plot_id=${encodeURIComponent(plot.plot_id)}`,
      metadata: {
        plot_id: plot.plot_id,
        minecraft_username: username,
        email: email || ""
      },
      customer_email: email || undefined
    });
  }catch(error){
    console.error("Stripe checkout error:", error);
    return res.status(500).json({ error: "Unable to create checkout session" });
  }

  await prisma.order.create({
    data: {
      provider: "stripe",
      stripe_session_id: session.id,
      plot_id: plot.plot_id,
      buyer_name: username,
      buyer_email: email || null,
      amount_cents: plot.price_cents,
      status: "pending"
    }
  });

  res.json({ url: session.url });
});

module.exports = router;

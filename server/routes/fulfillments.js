const express = require("express");
const prisma = require("../db/client");

const router = express.Router();

router.get("/", async (req, res) => {
  const status = req.query.status;
  const where = status ? { status } : {};

  const fulfillments = await prisma.fulfillment.findMany({
    where,
    select: {
      id: true,
      plot_id: true,
      owner_uuid: true,
      owner_name: true,
      status: true,
      attempts: true,
      last_error: true,
      created_at: true,
      updated_at: true
    },
    orderBy: { created_at: "asc" }
  });

  res.json(fulfillments);
});

module.exports = router;

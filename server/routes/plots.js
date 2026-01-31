const express = require("express");
const prisma = require("../db/client");

const router = express.Router();

router.get("/", async (req, res) => {
  const plots = await prisma.plot.findMany({
    select: {
      plot_id: true,
      status: true,
      price_cents: true,
      area_m2: true,
      owner_name: true,
      district: true
    },
    orderBy: { plot_id: "asc" }
  });

  res.json(plots);
});

router.get("/:plotId", async (req, res) => {
  const plotId = req.params.plotId;
  const plot = await prisma.plot.findUnique({
    where: { plot_id: plotId },
    select: {
      plot_id: true,
      status: true,
      price_cents: true,
      area_m2: true,
      owner_name: true,
      owner_uuid: true,
      district: true
    }
  });

  if(!plot){
    return res.status(404).json({ error: "Plot not found" });
  }

  res.json(plot);
});

module.exports = router;

const path = require("path");
const express = require("express");
require("dotenv").config();

const plotsRouter = require("./routes/plots");
const checkoutRouter = require("./routes/checkout");
const fulfillmentRouter = require("./routes/fulfillments");
const webhookRouter = require("./routes/webhooks");

const app = express();

const jsonParser = express.json();

app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));
app.use((req, res, next) => {
  if(req.originalUrl.startsWith("/api/webhooks/stripe")){
    return next();
  }
  return jsonParser(req, res, next);
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/plots", plotsRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/fulfillments", fulfillmentRouter);
app.use("/api/webhooks", webhookRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

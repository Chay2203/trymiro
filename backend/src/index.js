require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const webhookRouter = require("./routes/webhook");
const authRouter = require("./routes/auth");
const dashboardRouter = require("./routes/dashboard");
const captureRouter = require("./routes/capture");
const leadsRouter = require("./routes/leads");
const demoRouter = require("./routes/demo");
const apiKeyAuth = require("./middleware/apiKey");
const jwtAuth = require("./middleware/jwt");
const { processAbandonedCheckouts } = require("./jobs/abandonment");

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Webhook route FIRST — needs raw body, HMAC auth
app.use(webhookRouter);

// 2. CORS + JSON parsing for all other routes
app.use(cors());
app.use(express.json());

// 3. Health check (no auth)
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// 4. Demo route (public, no auth)
app.use(demoRouter);

// 5. Auth routes (no auth required)
app.use(authRouter);

// 6. Dashboard routes (JWT auth)
app.use("/dashboard", jwtAuth, dashboardRouter);

// 7. API key auth for remaining routes
app.use(apiKeyAuth);

// 8. API-key authenticated routes
app.use(captureRouter);
app.use(leadsRouter);

// Cron: every 15 minutes
cron.schedule("*/15 * * * *", () => {
  processAbandonedCheckouts().catch((err) =>
    console.error("[cron] Unhandled error:", err)
  );
});

app.listen(PORT, () => {
  console.log(`Recart backend listening on port ${PORT}`);

  // Self-ping to prevent Render cold starts
  const APP_URL = process.env.APP_URL;
  if (APP_URL) {
    setInterval(() => {
      fetch(`${APP_URL}/health`).catch(() => {});
    }, 5 * 60 * 1000); // every 5 minutes
  }
});

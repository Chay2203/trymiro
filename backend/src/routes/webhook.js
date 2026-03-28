const crypto = require("crypto");
const { Router } = require("express");
const pool = require("../db");

const router = Router();

router.post("/webhook", express_raw(), async (req, res) => {
  const hmacHeader = req.headers["x-shopify-hmac-sha256"];
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmacHeader || !secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const computedHmac = crypto
    .createHmac("sha256", secret)
    .update(req.body) // raw Buffer
    .digest("base64");

  const bufA = Buffer.from(hmacHeader, "base64");
  const bufB = Buffer.from(computedHmac, "base64");

  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return res.status(401).json({ error: "Invalid HMAC" });
  }

  try {
    const payload = JSON.parse(req.body.toString());
    const { checkout_token } = payload;

    if (!checkout_token) {
      return res.status(400).json({ error: "checkout_token missing from payload" });
    }

    const { rows } = await pool.query(
      `UPDATE abandoned_checkouts
         SET status = 'converted', converted_at = now()
       WHERE checkout_token = $1
       RETURNING *`,
      [checkout_token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Checkout not found" });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function express_raw() {
  const express = require("express");
  return express.raw({ type: "application/json" });
}

module.exports = router;

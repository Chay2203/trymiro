const express = require("express");
const { triggerCall } = require("../services/vapi");

const router = express.Router();

// In-memory rate limit: max 2 calls per IP per hour
const rateLimitMap = new Map();
const MAX_CALLS = 2;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { timestamps: [now] });
    return false;
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_CALLS) {
    return true;
  }

  entry.timestamps.push(now);
  return false;
}

// Clean up stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) rateLimitMap.delete(ip);
  }
}, 10 * 60 * 1000);

router.post("/demo/call", async (req, res) => {
  try {
    const { phone } = req.body;

    const cleaned = phone.replace(/[^0-9+]/g, "");
    if (!cleaned || !/^\+?[0-9]{7,15}$/.test(cleaned)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid phone number." });
    }

    // Rate limiting disabled for testing
    // const ip = req.ip || req.connection.remoteAddress;
    // if (isRateLimited(ip)) {
    //   return res.status(429).json({
    //     error: "Too many demo calls. Please try again later.",
    //   });
    // }

    await triggerCall({
      phone: phone.trim(),
      customer_name: "Basil",
      shop: "Miro Demo Store",
      cart_value: 149.99,
      cart_items: [
        { name: "Running Shoes", qty: 1, price: 89.99 },
        { name: "Sport Socks (3-pack)", qty: 1, price: 14.99 },
        { name: "Water Bottle", qty: 1, price: 45.01 },
      ],
      email: "demo@trymiro.com",
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[demo/call] Error:", err.message);
    res.status(500).json({ error: "Failed to place the demo call. Please try again." });
  }
});

module.exports = router;

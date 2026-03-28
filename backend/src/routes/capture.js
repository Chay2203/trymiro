const { Router } = require("express");
const pool = require("../db");

const router = Router();

router.post("/capture", async (req, res) => {
  const { checkout_token, email, phone, cart_value, cart_items } = req.body;
  const shop = req.shop;
  const orgId = req.orgId || null;

  if (!checkout_token) {
    return res.status(400).json({ error: "checkout_token is required" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO abandoned_checkouts
         (shop, checkout_token, email, phone, cart_value, cart_items, org_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (checkout_token) DO UPDATE SET
         email      = COALESCE(EXCLUDED.email, abandoned_checkouts.email),
         phone      = COALESCE(EXCLUDED.phone, abandoned_checkouts.phone),
         cart_value  = COALESCE(EXCLUDED.cart_value, abandoned_checkouts.cart_value),
         cart_items  = COALESCE(EXCLUDED.cart_items, abandoned_checkouts.cart_items),
         org_id     = COALESCE(EXCLUDED.org_id, abandoned_checkouts.org_id)
       RETURNING *`,
      [shop, checkout_token, email || null, phone || null, cart_value || null, cart_items ? JSON.stringify(cart_items) : null, orgId]
    );

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Capture error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

const crypto = require("crypto");
const pool = require("../db");

async function apiKeyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const rawKey = authHeader.slice(7);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  try {
    const { rows } = await pool.query(
      "SELECT shop, mode, org_id FROM api_keys WHERE key_hash = $1",
      [keyHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    req.shop = rows[0].shop;
    req.apiMode = rows[0].mode;
    req.orgId = rows[0].org_id;
    next();
  } catch (err) {
    console.error("API key auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = apiKeyAuth;

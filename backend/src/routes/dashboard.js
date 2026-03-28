const { Router } = require("express");
const crypto = require("crypto");
const pool = require("../db");

const router = Router();

router.get("/stats", async (req, res) => {
  const orgId = req.user.orgId;
  const { from, to } = req.query;

  const conditions = ["org_id = $1"];
  const params = [orgId];

  if (from) {
    conditions.push(`captured_at >= $${params.length + 1}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`captured_at <= $${params.length + 1}`);
    params.push(to);
  }

  const where = conditions.join(" AND ");

  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_checkouts,
         COUNT(*) FILTER (WHERE status = 'captured')::int AS pending_count,
         COUNT(*) FILTER (WHERE status = 'recovery_attempted')::int AS recovery_attempted_count,
         COUNT(*) FILTER (WHERE status = 'recovered')::int AS recovered_count,
         COUNT(*) FILTER (WHERE status = 'converted')::int AS converted_count,

         COALESCE(SUM(cart_value), 0)::numeric AS total_cart_value,
         COALESCE(SUM(cart_value) FILTER (WHERE status = 'captured'), 0)::numeric AS pending_revenue,
         COALESCE(SUM(cart_value) FILTER (WHERE status IN ('recovered', 'converted')), 0)::numeric AS recovered_revenue,
         COALESCE(SUM(cart_value) FILTER (WHERE status = 'recovery_attempted'), 0)::numeric AS in_progress_revenue,

         CASE WHEN COUNT(*) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE status = 'converted')::numeric / COUNT(*)::numeric * 100, 2)
           ELSE 0 END AS conversion_rate,

         CASE WHEN COUNT(*) FILTER (WHERE status IN ('recovery_attempted', 'recovered', 'converted')) > 0
           THEN ROUND(
             COUNT(*) FILTER (WHERE status IN ('recovered', 'converted'))::numeric /
             COUNT(*) FILTER (WHERE status IN ('recovery_attempted', 'recovered', 'converted'))::numeric * 100, 2)
           ELSE 0 END AS recovery_success_rate

       FROM abandoned_checkouts
       WHERE ${where}`,
      params
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recovery-chart", async (req, res) => {
  const orgId = req.user.orgId;
  const { from, to } = req.query;

  const conditions = ["org_id = $1"];
  const params = [orgId];

  if (from) {
    conditions.push(`captured_at >= $${params.length + 1}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`captured_at <= $${params.length + 1}`);
    params.push(to);
  }

  const where = conditions.join(" AND ");

  try {
    const { rows } = await pool.query(
      `SELECT
         captured_at::date AS day,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('recovered', 'converted'))::int AS recovered,
         COALESCE(SUM(cart_value) FILTER (WHERE status IN ('recovered', 'converted')), 0)::numeric AS recovered_value,
         COALESCE(SUM(cart_value), 0)::numeric AS total_value
       FROM abandoned_checkouts
       WHERE ${where}
       GROUP BY captured_at::date
       ORDER BY day ASC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("Recovery chart error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const VALID_STATUSES = ["captured", "recovery_attempted", "recovered", "converted"];

router.get("/recent", async (req, res) => {
  const orgId = req.user.orgId;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const { status } = req.query;

  const conditions = ["org_id = $1"];
  const params = [orgId];

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }

  params.push(limit);

  try {
    const { rows } = await pool.query(
      `SELECT * FROM abandoned_checkouts
       WHERE ${conditions.join(" AND ")}
       ORDER BY captured_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("Dashboard recent error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- API Key Management ---

router.post("/api-keys", async (req, res) => {
  const orgId = req.user.orgId;
  const { shop, mode } = req.body;

  if (!shop) {
    return res.status(400).json({ error: "shop is required" });
  }

  if (mode && !["live", "test"].includes(mode)) {
    return res.status(400).json({ error: 'mode must be "live" or "test"' });
  }

  try {
    const rawKey = crypto.randomBytes(32).toString("hex");
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const { rows } = await pool.query(
      `INSERT INTO api_keys (key_hash, shop, mode, org_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, shop, mode, created_at`,
      [keyHash, shop, mode || "test", orgId]
    );

    res.status(201).json({ ...rows[0], key: rawKey });
  } catch (err) {
    console.error("Create API key error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api-keys", async (req, res) => {
  const orgId = req.user.orgId;

  try {
    const { rows } = await pool.query(
      `SELECT id, shop, mode, created_at
       FROM api_keys
       WHERE org_id = $1
       ORDER BY created_at DESC`,
      [orgId]
    );

    res.json(rows);
  } catch (err) {
    console.error("List API keys error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api-keys/:id", async (req, res) => {
  const orgId = req.user.orgId;
  const keyId = req.params.id;

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM api_keys WHERE id = $1 AND org_id = $2`,
      [keyId, orgId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "API key not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Delete API key error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

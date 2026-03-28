const { Router } = require("express");
const pool = require("../db");

const router = Router();

const VALID_STATUSES = ["captured", "recovery_attempted", "recovered", "converted"];

router.get("/leads", async (req, res) => {
  const shop = req.shop;
  const { status } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  const conditions = ["shop = $1"];
  const params = [shop];

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }

  params.push(limit, offset);

  try {
    const { rows } = await pool.query(
      `SELECT * FROM abandoned_checkouts
       WHERE ${conditions.join(" AND ")}
       ORDER BY captured_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("Leads error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

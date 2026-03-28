const pool = require("../db");
const { triggerCall } = require("../services/vapi");

async function processAbandonedCheckouts() {
  console.log("[cron] Checking for abandoned checkouts…");

  const { rows: checkouts } = await pool.query(
    `SELECT * FROM abandoned_checkouts
     WHERE status = 'captured'
       AND phone IS NOT NULL
       AND captured_at < now() - INTERVAL '1 hour'
     ORDER BY captured_at ASC
     LIMIT 50`
  );

  console.log(`[cron] Found ${checkouts.length} checkout(s) to process.`);

  for (const checkout of checkouts) {
    try {
      await triggerCall(checkout);

      await pool.query(
        `UPDATE abandoned_checkouts
           SET status = 'recovery_attempted', recovery_at = now()
         WHERE id = $1`,
        [checkout.id]
      );

      console.log(`[cron] Recovery call triggered for ${checkout.id}`);
    } catch (err) {
      // Leave as 'captured' so it retries next cycle
      console.error(`[cron] Failed to call ${checkout.id}:`, err.message);
    }
  }
}

module.exports = { processAbandonedCheckouts };

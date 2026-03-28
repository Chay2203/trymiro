require("dotenv").config();
const crypto = require("crypto");
const pool = require("../src/db");

async function seed() {
  const orgId = process.argv[2];
  const shop = process.argv[3];
  const mode = process.argv[4] || "test";

  if (!orgId || !shop) {
    console.error("Usage: node scripts/seed-api-key.js <org_id> <shop> [mode]");
    process.exit(1);
  }

  if (!["live", "test"].includes(mode)) {
    console.error('Mode must be "live" or "test"');
    process.exit(1);
  }

  const rawKey = crypto.randomBytes(32).toString("hex");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  await pool.query(
    "INSERT INTO api_keys (key_hash, shop, mode, org_id) VALUES ($1, $2, $3, $4)",
    [keyHash, shop, mode, orgId]
  );

  console.log("API key created successfully.");
  console.log(`Org ID: ${orgId}`);
  console.log(`Shop: ${shop}`);
  console.log(`Mode: ${mode}`);
  console.log(`Raw key (save this — it won't be shown again):\n${rawKey}`);

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

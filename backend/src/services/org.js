const pool = require("../db");

async function createOrgAndUser(orgName, email, passwordHash) {
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: orgRows } = await client.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *`,
      [orgName, slug]
    );
    const org = orgRows[0];

    const { rows: userRows } = await client.query(
      `INSERT INTO users (org_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'owner') RETURNING id, org_id, email, role, created_at`,
      [org.id, email, passwordHash]
    );

    await client.query("COMMIT");
    return { org, user: userRows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, org_id, email, password_hash, role FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

module.exports = { createOrgAndUser, findUserByEmail };

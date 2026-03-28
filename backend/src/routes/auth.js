const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createOrgAndUser, findUserByEmail } = require("../services/org");

const router = Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, orgId: user.org_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

router.post("/auth/signup", async (req, res) => {
  const { orgName, email, password } = req.body;

  if (!orgName || !email || !password) {
    return res.status(400).json({ error: "orgName, email, and password are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { org, user } = await createOrgAndUser(orgName, email, passwordHash);
    const token = signToken(user);

    res.status(201).json({ token, org: { id: org.id, name: org.name, slug: org.slug }, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email or organization slug already exists" });
    }
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, orgId: user.org_id } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

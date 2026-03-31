const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../../db/postgres");
const ApiError = require("../../../utils/apiError");
const { jwtSecret } = require("../../../config/env");

async function signup({ email, password, role = "manager", name, phone, address }) {
  const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length) throw new ApiError(409, "Email already registered");

  // Managers require profile info and start as pending (awaiting admin approval)
  if (role === "manager") {
    if (!name?.trim()) throw new ApiError(400, "Full name is required for manager registration");
    if (!phone?.trim()) throw new ApiError(400, "Phone number is required for manager registration");
    if (!address?.trim()) throw new ApiError(400, "Address is required for manager registration");
  }

  const hashed = await bcrypt.hash(password, 10);
  const status = role === "manager" ? "pending" : "active";

  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, role, status, name, phone, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, role, status, name`,
    [email, hashed, role, status, name || null, phone || null, address || null]
  );
  return rows[0];
}

async function login(email, password) {
  const { rows } = await db.query(
    "SELECT id, email, password_hash, role, status, name FROM users WHERE email = $1",
    [email]
  );
  if (!rows.length) throw new ApiError(401, "Invalid email or password");

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  if (user.status === "pending") {
    throw new ApiError(403, "Your account is pending admin approval. You will be notified by email once approved.");
  }
  if (user.status === "rejected") {
    throw new ApiError(403, "Your account registration has been rejected. Please contact the administrator.");
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    jwtSecret,
    { expiresIn: "12h" }
  );
  return { token, user: { id: user.id, email: user.email, role: user.role, name: user.name } };
}

module.exports = { signup, login };

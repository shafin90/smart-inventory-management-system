const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../../db/postgres");
const ApiError = require("../../../utils/apiError");
const { jwtSecret } = require("../../../config/env");

async function signup(email, password, role = "manager") {
  const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length) throw new ApiError(409, "Email already registered");

  const hashed = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role",
    [email, hashed, role]
  );
  return rows[0];
}

async function login(email, password) {
  const { rows } = await db.query("SELECT id, email, password_hash, role FROM users WHERE email = $1", [email]);
  if (!rows.length) throw new ApiError(401, "Invalid email or password");

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: "12h" });
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

module.exports = { signup, login };

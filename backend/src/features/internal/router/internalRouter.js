/**
 * Internal-only routes — never exposed in the frontend app.
 * Protected by INTERNAL_SECRET header. Use Postman or CLI only.
 *
 * POST /api/internal/create-admin
 *   Header: X-Internal-Secret: <INTERNAL_SECRET from .env>
 *   Body:   { email, password }
 */
const express = require("express");
const { z } = require("zod");
const bcrypt = require("bcryptjs");
const db = require("../../../db/postgres");
const ApiError = require("../../../utils/apiError");

const router = express.Router();

// Secret-key guard — must match INTERNAL_SECRET env var
router.use((req, _res, next) => {
  const secret = process.env.INTERNAL_SECRET;
  if (!secret) return next(new ApiError(503, "Internal routes are disabled (INTERNAL_SECRET not set)"));
  if (req.headers["x-internal-secret"] !== secret) {
    return next(new ApiError(401, "Invalid internal secret"));
  }
  next();
});

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Admin password must be at least 8 characters"),
});

router.post("/create-admin", async (req, res, next) => {
  try {
    const { email, password } = createAdminSchema.parse(req.body);

    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length) throw new ApiError(409, "Email already registered");

    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, 'admin'::user_role, 'active'::user_status)
       RETURNING id, email, role, status`,
      [email, hashed]
    );

    res.status(201).json({ message: "Admin account created", user: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

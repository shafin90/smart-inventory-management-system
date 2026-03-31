const { z } = require("zod");
const authService = require("../service/authService");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Public signup is MANAGER only — admin accounts are created via the
// internal /api/internal/create-admin endpoint (Postman / CLI only)
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
});

async function signup(req, res, next) {
  try {
    const body = signupSchema.parse(req.body);
    const user = await authService.signup({ ...body, role: "manager" });
    res.status(201).json({
      message: "Registration successful. Your account is pending admin approval.",
      user,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const data = await authService.login(email, password);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login };

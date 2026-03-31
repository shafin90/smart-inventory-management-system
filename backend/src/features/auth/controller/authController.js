const { z } = require("zod");
const authService = require("../service/authService");

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

async function signup(req, res, next) {
  try {
    const payload = authSchema.parse(req.body);
    const user = await authService.signup(payload.email, payload.password);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const payload = authSchema.parse(req.body);
    const result = await authService.login(payload.email, payload.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login };

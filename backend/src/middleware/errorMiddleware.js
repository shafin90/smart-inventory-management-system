const ApiError = require("../utils/apiError");

function errorMiddleware(err, req, res, _next) {
  // Zod v4 validation errors
  if (err.name === "ZodError") {
    const messages = (err.issues || []).map((i) => `${i.path.join(".")}: ${i.message}`);
    return res.status(400).json({ message: "Validation error", errors: messages });
  }

  // PostgreSQL constraint violations
  if (err.code === "23505") {
    return res.status(409).json({ message: "Duplicate entry — resource already exists." });
  }
  if (err.code === "23503") {
    return res.status(400).json({ message: "Invalid reference — related resource not found." });
  }
  if (err.code === "23514") {
    return res.status(400).json({ message: "Constraint violation — check value ranges." });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  // Known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // Unknown server errors — log full details, return generic message
  const requestId = req.headers["x-request-id"] || "–";
  console.error(`[ERROR] requestId=${requestId} method=${req.method} path=${req.path}`, err);

  return res.status(500).json({ message: "Internal server error" });
}

module.exports = errorMiddleware;

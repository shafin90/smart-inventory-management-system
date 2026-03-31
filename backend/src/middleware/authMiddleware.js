const jwt = require("jsonwebtoken");
const ApiError = require("../utils/apiError");
const { jwtSecret } = require("../config/env");

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next(new ApiError(401, "Unauthorized"));

  const token = authHeader.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return next(new ApiError(401, "Invalid token"));
  }
}

module.exports = authMiddleware;

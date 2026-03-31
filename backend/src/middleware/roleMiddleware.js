const ApiError = require("../utils/apiError");

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Access denied. Insufficient permissions."));
    }
    return next();
  };
}

module.exports = requireRole;

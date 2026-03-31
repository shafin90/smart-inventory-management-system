const redis = require("../db/redis");

async function invalidateDashboardCache() {
  try {
    await redis.del("dashboard:today");
  } catch (err) {
    console.warn("Cache invalidation warning:", err.message);
  }
}

module.exports = { invalidateDashboardCache };

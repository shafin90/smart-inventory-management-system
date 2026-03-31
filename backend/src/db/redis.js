const { createClient } = require("redis");
const { redisUrl } = require("../config/env");

const redis = createClient({ url: redisUrl });
redis.on("error", (err) => console.error("Redis error:", err.message));

module.exports = redis;

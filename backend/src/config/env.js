const dotenv = require("dotenv");

dotenv.config();

// Fail fast if required env vars are missing
const REQUIRED = ["DATABASE_URL", "JWT_SECRET", "REDIS_URL", "RABBITMQ_URL"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

if (process.env.JWT_SECRET === "super-secret-key") {
  console.warn(
    "[SECURITY WARNING] JWT_SECRET is using the default insecure value. " +
    "Set a strong secret in your .env file before deploying to production."
  );
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  dbPoolMax: Number(process.env.DB_POOL_MAX) || 20,
  dbPoolMin: Number(process.env.DB_POOL_MIN) || 2,
  redisUrl: process.env.REDIS_URL,
  rabbitmqUrl: process.env.RABBITMQ_URL,
  corsOrigin: process.env.CORS_ORIGIN || "*",
};

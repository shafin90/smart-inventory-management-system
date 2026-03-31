const app = require("./app");
const { port } = require("./config/env");
const redis = require("./db/redis");
const { connectQueue } = require("./queue/rabbitmq");
const { startConsumer } = require("./queue/consumer");

async function retry(fn, label, retries = 15, delayMs = 2000) {
  let lastError;
  for (let i = 1; i <= retries; i += 1) {
    try {
      await fn();
      return;
    } catch (err) {
      lastError = err;
      console.warn(`${label} connection attempt ${i}/${retries} failed: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function start() {
  try {
    await retry(() => redis.connect(), "Redis");
    await retry(() => connectQueue(), "RabbitMQ");
    await startConsumer();

    const server = app.listen(port, () =>
      console.log(`Backend running on http://localhost:${port}`)
    );

    // Graceful shutdown
    function shutdown(signal) {
      console.log(`\nReceived ${signal}. Shutting down gracefully…`);
      server.close(async () => {
        try {
          await redis.quit();
          console.log("Redis disconnected.");
        } catch (_) {}
        console.log("HTTP server closed.");
        process.exit(0);
      });

      // Force-exit if graceful shutdown takes too long
      setTimeout(() => {
        console.error("Forced exit after timeout.");
        process.exit(1);
      }, 10000);
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("Startup error:", err.message);
    process.exit(1);
  }
}

// Catch unhandled promise rejections to prevent silent crashes
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
  process.exit(1);
});

start();

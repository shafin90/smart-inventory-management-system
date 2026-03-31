const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("crypto");

const { nodeEnv, corsOrigin } = require("./config/env");
const authMiddleware = require("./middleware/authMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

const authRouter = require("./features/auth/router/authRouter");
const categoryRouter = require("./features/category/router/categoryRouter");
const productRouter = require("./features/product/router/productRouter");
const orderRouter = require("./features/order/router/orderRouter");
const restockRouter = require("./features/restock/router/restockRouter");
const dashboardRouter = require("./features/dashboard/router/dashboardRouter");
const activityRouter = require("./features/activity/router/activityRouter");
const adminRouter    = require("./features/admin/router/adminRouter");
const internalRouter = require("./features/internal/router/internalRouter");

const app = express();

// Trust X-Forwarded-For from reverse proxy / load balancer so that rate
// limiting and logging work correctly per real client IP
app.set("trust proxy", 1);

// Attach a correlation ID to every request for traceable error logs
app.use((req, _res, next) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || randomUUID();
  next();
});

app.use(compression());

// CORS — restrict origins via CORS_ORIGIN env var (comma-separated list)
// Defaults to "*" for local dev; always set explicitly in production
const allowedOrigins = corsOrigin === "*"
  ? true
  : corsOrigin.split(",").map((o) => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));

app.use(helmet());

// Use minimal format in dev, Apache-style combined format in production
app.use(morgan(nodeEnv === "production" ? "combined" : "dev"));

// Reject requests with unexpectedly large bodies (prevents memory exhaustion)
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Global rate limiter — 300 req/min per IP (accounts for SPA polling)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests — please slow down." },
});

// Strict limiter for auth: 20 attempts/min prevents brute-force
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts — try again in a minute." },
});

app.use(globalLimiter);

app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.use("/api/auth", authLimiter, authRouter);

app.use("/api/categories", authMiddleware, categoryRouter);
app.use("/api/products", authMiddleware, productRouter);
app.use("/api/orders", authMiddleware, orderRouter);
app.use("/api/restock-queue", authMiddleware, restockRouter);
app.use("/api/dashboard", authMiddleware, dashboardRouter);
app.use("/api/activities", authMiddleware, activityRouter);
app.use("/api/admin", authMiddleware, adminRouter);

// Internal routes — no auth middleware, guarded by X-Internal-Secret header
// Never import or call these from the frontend
app.use("/api/internal", internalRouter);

app.use(errorMiddleware);

module.exports = app;

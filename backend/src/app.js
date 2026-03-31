const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { randomUUID } = require("crypto");

const authMiddleware = require("./middleware/authMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

const authRouter = require("./features/auth/router/authRouter");
const categoryRouter = require("./features/category/router/categoryRouter");
const productRouter = require("./features/product/router/productRouter");
const orderRouter = require("./features/order/router/orderRouter");
const restockRouter = require("./features/restock/router/restockRouter");
const dashboardRouter = require("./features/dashboard/router/dashboardRouter");
const activityRouter = require("./features/activity/router/activityRouter");

const app = express();

// Attach a request ID to every request for traceable error logs
app.use((req, _res, next) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || randomUUID();
  next();
});

app.use(compression());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// Global rate limiter: 200 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests — please slow down." },
});

// Stricter limiter for auth endpoints: 20 requests per minute per IP
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

app.use(errorMiddleware);

module.exports = app;

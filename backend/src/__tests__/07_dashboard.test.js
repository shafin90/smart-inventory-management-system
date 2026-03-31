/**
 * Spec Feature 7: Dashboard
 * - Total orders today
 * - Pending vs Completed counts
 * - Low stock items count
 * - Revenue today
 * - Product summary with stock label
 * - Cache hit returns cached data
 */
require("./setup");

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const db = require("../db/postgres");
const redis = require("../db/redis");

const token = jwt.sign({ id: 1, email: "admin@test.com", role: "admin" }, "super-secret-key");
const auth = { Authorization: `Bearer ${token}` };

const mockDashboardData = {
  total_orders_today: "3",
  pending_orders: "2",
  completed_orders: "1",
  revenue_today: "1999.97",
  low_stock_count: "4",
  product_summary: [
    { name: "iPhone 13", stock_quantity: 3, stock_label: "Low Stock" },
    { name: "T-Shirt", stock_quantity: 20, stock_label: "OK" },
  ],
};

describe("Feature 7: Dashboard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns all required dashboard metrics on cache miss", async () => {
    redis.get.mockResolvedValueOnce(null); // cache miss
    db.query
      .mockResolvedValueOnce({ rows: [{ total_orders_today: "3", pending_orders: "2", completed_orders: "1", revenue_today: "1999.97" }] })
      .mockResolvedValueOnce({ rows: [{ low_stock_count: "4" }] })
      .mockResolvedValueOnce({ rows: mockDashboardData.product_summary });

    const res = await request(app).get("/api/dashboard").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total_orders_today");
    expect(res.body).toHaveProperty("pending_orders");
    expect(res.body).toHaveProperty("completed_orders");
    expect(res.body).toHaveProperty("revenue_today");
    expect(res.body).toHaveProperty("low_stock_count");
    expect(res.body).toHaveProperty("product_summary");
    expect(Array.isArray(res.body.product_summary)).toBe(true);
  });

  it("returns cached data on cache hit (no DB call)", async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify(mockDashboardData));

    const res = await request(app).get("/api/dashboard").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.total_orders_today).toBe("3");
    expect(db.query).not.toHaveBeenCalled(); // no DB calls on cache hit
  });

  it("returns product summary with Low Stock / OK labels", async () => {
    redis.get.mockResolvedValueOnce(null);
    db.query
      .mockResolvedValueOnce({ rows: [{ total_orders_today: "1", pending_orders: "1", completed_orders: "0", revenue_today: "0" }] })
      .mockResolvedValueOnce({ rows: [{ low_stock_count: "1" }] })
      .mockResolvedValueOnce({
        rows: [
          { name: "iPhone 13", stock_quantity: 2, stock_label: "Low Stock" },
          { name: "T-Shirt", stock_quantity: 50, stock_label: "OK" },
        ],
      });

    const res = await request(app).get("/api/dashboard").set(auth);

    expect(res.status).toBe(200);
    const iphoneEntry = res.body.product_summary.find((p) => p.name === "iPhone 13");
    expect(iphoneEntry.stock_label).toBe("Low Stock");
  });

  it("rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(401);
  });
});

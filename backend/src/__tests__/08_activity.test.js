/**
 * Spec Feature 8: Activity Log
 * - Returns latest 5-10 system actions
 * - Logs are created when orders are created/updated
 * - Logs are created when products are created/restocked
 */
require("./setup");

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const db = require("../db/postgres");
const { logActivity } = require("../features/activity/service/activityService");
const { getRecentActivities } = require("../features/activity/service/activityService");

const token = jwt.sign({ id: 1, email: "admin@test.com", role: "admin" }, "super-secret-key");
const auth = { Authorization: `Bearer ${token}` };

describe("Feature 8: Activity Log", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("GET /api/activities", () => {
    it("returns the latest 10 activity logs", async () => {
      getRecentActivities.mockResolvedValueOnce([
        { id: 10, message: "Order #42 created by user", created_at: new Date().toISOString() },
        { id: 9, message: 'Stock updated for "iPhone 13"', created_at: new Date().toISOString() },
        { id: 8, message: 'Product "Headphone" added to Restock Queue', created_at: new Date().toISOString() },
      ]);

      const res = await request(app).get("/api/activities").set(auth);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(10);
    });

    it("returns empty array when no activity", async () => {
      getRecentActivities.mockResolvedValueOnce([]);

      const res = await request(app).get("/api/activities").set(auth);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("Activity creation side effects", () => {
    it("creating an order logs activity automatically", async () => {
      const client = { query: jest.fn(), release: jest.fn() };
      db.getClient.mockResolvedValue(client);

      client.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: "Phone", price: "100", status: "Active", stock_quantity: 5, min_stock_threshold: 2 }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 55, customer_name: "Heidi", total_price: "100", status: "Pending" }] })
        .mockResolvedValueOnce(undefined) // order_item insert
        .mockResolvedValueOnce({ rows: [{ id: 1, stock_quantity: 4, min_stock_threshold: 2 }] }) // stock updated
        .mockResolvedValueOnce(undefined); // COMMIT
      // updateRestockQueue → stock=4 >= threshold=2 → DELETE (default mock returns { rows: [] })

      await request(app)
        .post("/api/orders")
        .set(auth)
        .send({ customerName: "Heidi", items: [{ productId: 1, quantity: 1 }] });

      expect(logActivity).toHaveBeenCalledWith(
        expect.stringMatching(/Order #55 created/i),
        1
      );
    });

    it("updating order status logs activity automatically", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, status: "Shipped" }] });

      await request(app)
        .patch("/api/orders/1/status")
        .set(auth)
        .send({ status: "Shipped" });

      expect(logActivity).toHaveBeenCalledWith(
        expect.stringMatching(/Order #1 marked as Shipped/i),
        1
      );
    });
  });
});

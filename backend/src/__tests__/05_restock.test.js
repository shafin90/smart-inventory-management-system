/**
 * Spec Feature 5: Restock Queue (Low Stock Management)
 * - Auto-added to queue when stock < threshold
 * - Ordered by lowest stock first
 * - Priority: High / Medium / Low based on stock ratio
 * - Manual restock removes from queue
 */
require("./setup");

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const db = require("../db/postgres");

const token = jwt.sign({ id: 1, email: "admin@test.com", role: "admin" }, "super-secret-key");
const auth = { Authorization: `Bearer ${token}` };

describe("Feature 5: Restock Queue", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("Priority Calculation", () => {
    it("calculates High priority when stock <= 30% of threshold", async () => {
      // stock=1, threshold=10 → 10% → High
      db.query
        .mockResolvedValueOnce({ rows: [] })    // SELECT from restock_queue (not existing)
        .mockResolvedValueOnce(undefined)       // INSERT INTO restock_queue
        .mockResolvedValueOnce({ rows: [{ name: "Widget" }] }); // SELECT name for log

      const { updateRestockQueue } = require("../features/product/service/productService");
      await updateRestockQueue(1, 1, 10);

      const insertCall = db.query.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("INSERT INTO restock_queue")
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toContain("High");
    });

    it("calculates Medium priority when stock is 31-70% of threshold", async () => {
      // stock=5, threshold=10 → 50% → Medium
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ name: "Widget" }] });

      const { updateRestockQueue } = require("../features/product/service/productService");
      await updateRestockQueue(1, 5, 10);

      const insertCall = db.query.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("INSERT INTO restock_queue")
      );
      expect(insertCall[1]).toContain("Medium");
    });

    it("removes from queue when stock >= threshold", async () => {
      // stock=10, threshold=5 → above threshold → DELETE
      const { updateRestockQueue } = require("../features/product/service/productService");
      await updateRestockQueue(1, 10, 5);

      const deleteCall = db.query.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("DELETE FROM restock_queue")
      );
      expect(deleteCall).toBeDefined();
    });
  });

  describe("GET /api/restock-queue", () => {
    it("returns restock queue ordered by lowest stock", async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 1, product_id: 1, product_name: "iPhone", stock_quantity: 1, priority: "High" },
          { id: 2, product_id: 2, product_name: "iPad", stock_quantity: 3, priority: "Medium" },
        ],
      });

      const res = await request(app).get("/api/restock-queue").set(auth);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].stock_quantity).toBeLessThanOrEqual(res.body[1].stock_quantity);
    });
  });

  describe("PATCH /api/products/:id/restock", () => {
    it("restocks a product and removes from restock queue", async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: "iPhone", stock_quantity: 15, min_stock_threshold: 5, status: "Active" }],
        }) // UPDATE products SET stock_quantity
        .mockResolvedValueOnce(undefined); // DELETE FROM restock_queue (inside restockProduct)
      // updateRestockQueue → stock=15 >= threshold=5 → DELETE (handled by default mock)

      const res = await request(app)
        .patch("/api/products/1/restock")
        .set(auth)
        .send({ quantity: 10 });

      expect(res.status).toBe(200);
      expect(res.body.stock_quantity).toBe(15);
    });

    it("rejects zero or negative restock quantity (400)", async () => {
      const res = await request(app)
        .patch("/api/products/1/restock")
        .set(auth)
        .send({ quantity: 0 });

      expect(res.status).toBe(400);
    });
  });
});

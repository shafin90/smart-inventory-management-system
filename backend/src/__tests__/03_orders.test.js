/**
 * Spec Feature 3: Order Management
 * - Create order with multiple products
 * - List orders with pagination, filter by status/date
 * - Update order status through lifecycle
 * - Cancel an order
 */
require("./setup");

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const db = require("../db/postgres");

const token = jwt.sign({ id: 1, email: "admin@test.com", role: "admin" }, "super-secret-key");
const auth = { Authorization: `Bearer ${token}` };

function mockOrderTransaction(products, order) {
  const client = {
    query: jest.fn(),
    release: jest.fn(),
  };
  db.getClient.mockResolvedValue(client);
  client.query
    .mockResolvedValueOnce(undefined) // BEGIN
    .mockResolvedValueOnce({ rows: products }) // SELECT products
    .mockResolvedValueOnce({ rows: [order] }) // INSERT order
    .mockResolvedValueOnce(undefined) // INSERT order_item 1
    .mockResolvedValueOnce({ rows: [{ id: products[0].id, stock_quantity: 8, min_stock_threshold: 5 }] }) // UPDATE stock
    .mockResolvedValueOnce(undefined); // COMMIT
  // updateRestockQueue uses db.query (not client.query); stock=8 >= threshold=5 → default mock deletes
  return client;
}

describe("Feature 3: Order Management", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("POST /api/orders", () => {
    it("creates an order and returns it with id", async () => {
      const products = [{ id: 1, name: "iPhone 13", price: "999.99", status: "Active", stock_quantity: 10, min_stock_threshold: 5 }];
      const order = { id: 42, customer_name: "Alice", total_price: "999.99", status: "Pending" };
      mockOrderTransaction(products, order);

      const res = await request(app)
        .post("/api/orders")
        .set(auth)
        .send({ customerName: "Alice", items: [{ productId: 1, quantity: 1 }] });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 42, customer_name: "Alice" });
    });

    it("rejects order with no items (400)", async () => {
      const res = await request(app)
        .post("/api/orders")
        .set(auth)
        .send({ customerName: "Bob", items: [] });

      expect(res.status).toBe(400);
    });

    it("rejects missing customerName (400)", async () => {
      const res = await request(app)
        .post("/api/orders")
        .set(auth)
        .send({ items: [{ productId: 1, quantity: 1 }] });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/orders", () => {
    it("returns paginated orders list", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, customer_name: "Alice", status: "Pending" }] })
        .mockResolvedValueOnce({ rows: [{ total: "1" }] });

      const res = await request(app)
        .get("/api/orders?page=1&limit=10")
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ data: expect.any(Array), total: 1 });
    });

    it("filters orders by status", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, status: "Delivered" }] })
        .mockResolvedValueOnce({ rows: [{ total: "1" }] });

      const res = await request(app)
        .get("/api/orders?status=Delivered")
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data[0].status).toBe("Delivered");
    });
  });

  describe("PATCH /api/orders/:id/status", () => {
    it("updates order status to Confirmed", async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Confirmed" }],
      });

      const res = await request(app)
        .patch("/api/orders/1/status")
        .set(auth)
        .send({ status: "Confirmed" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Confirmed");
    });

    it("rejects invalid status value (400)", async () => {
      const res = await request(app)
        .patch("/api/orders/1/status")
        .set(auth)
        .send({ status: "Refunded" }); // not a valid enum

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent order", async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch("/api/orders/9999/status")
        .set(auth)
        .send({ status: "Cancelled" });

      expect(res.status).toBe(404);
    });
  });
});

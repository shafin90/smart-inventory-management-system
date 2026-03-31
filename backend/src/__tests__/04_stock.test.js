/**
 * Spec Feature 4: Stock Handling Rules
 * - Stock deducted automatically on order
 * - Warning when requested quantity > available stock (400)
 * - Product status set to 'Out of Stock' when stock reaches 0
 */
require("./setup");

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const db = require("../db/postgres");

const token = jwt.sign({ id: 1, email: "admin@test.com", role: "admin" }, "super-secret-key");
const auth = { Authorization: `Bearer ${token}` };

describe("Feature 4: Stock Handling Rules", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects order when requested quantity exceeds stock", async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    db.getClient.mockResolvedValue(client);

    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: "Laptop", price: "1000", status: "Active", stock_quantity: 2, min_stock_threshold: 5 }],
      }); // only 2 in stock

    const res = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({ customerName: "Carol", items: [{ productId: 1, quantity: 5 }] }); // wants 5

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only 2 items available/i);
  });

  it("marks product Out of Stock when stock reaches 0 after order", async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    db.getClient.mockResolvedValue(client);

    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: "Last Item", price: "50", status: "Active", stock_quantity: 1, min_stock_threshold: 5 }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 10, customer_name: "Dan", total_price: "50", status: "Pending" }] })
      .mockResolvedValueOnce(undefined) // INSERT order_item
      .mockResolvedValueOnce({ rows: [{ id: 1, stock_quantity: 0, min_stock_threshold: 5 }] }) // stock deducted to 0
      .mockResolvedValueOnce(undefined); // COMMIT

    // updateRestockQueue uses db.query (not client.query)
    db.query
      .mockResolvedValueOnce({ rows: [] })                      // SELECT FROM restock_queue (not in queue yet)
      .mockResolvedValueOnce(undefined)                         // INSERT INTO restock_queue
      .mockResolvedValueOnce({ rows: [{ name: "Last Item" }] }); // SELECT name for activity log

    const res = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({ customerName: "Dan", items: [{ productId: 1, quantity: 1 }] });

    // Order created, and inside the service updateRestockQueue is called with stock=0
    expect(res.status).toBe(201);

    // Verify that the stock UPDATE query used 'Out of Stock' status (the CASE statement)
    const updateCall = client.query.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("Out of Stock")
    );
    expect(updateCall).toBeDefined();
  });
});

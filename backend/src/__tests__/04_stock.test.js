/**
 * Spec Feature 4: Stock Handling Rules
 * - Stock deducted automatically on order
 * - Warning when requested quantity > available stock (400)
 * - Product status set to 'Out of Stock' when stock reaches 0
 * - SELECT FOR UPDATE ensures no race-condition overselling
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
      }); // SELECT ... FOR UPDATE — only 2 in stock

    const res = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({ customerName: "Carol", items: [{ productId: 1, quantity: 5 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only 2 items available/i);
  });

  it("uses SELECT FOR UPDATE to lock rows (prevents race condition)", () => {
    // The only reliable way to test DB-level locking without a real PG instance
    // is to assert the SQL contains FOR UPDATE. Behavioral proof requires actual
    // PG REPEATABLE READ / SERIALIZABLE — not achievable with mocks.
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../features/order/service/orderService.js"),
      "utf8"
    );
    expect(source).toMatch(/FOR UPDATE/i);
  });

  it("marks product Out of Stock when stock reaches 0 after order", async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    db.getClient.mockResolvedValue(client);

    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: "Last Item", price: "50", status: "Active", stock_quantity: 1, min_stock_threshold: 5 }],
      })                                                                          // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 10, customer_name: "Dan", total_price: "50", status: "Pending" }] }) // INSERT order
      .mockResolvedValueOnce(undefined)                                           // INSERT order_item
      .mockResolvedValueOnce({ rows: [{ id: 1, stock_quantity: 0, min_stock_threshold: 5 }] }) // UPDATE stock
      // updateRestockQueue now runs INSIDE the transaction via client (stock < threshold)
      .mockResolvedValueOnce({ rows: [] })                                        // SELECT FROM restock_queue
      .mockResolvedValueOnce(undefined)                                           // INSERT INTO restock_queue
      .mockResolvedValueOnce(undefined);                                          // COMMIT

    // Product name lookup for logActivity (still uses pool, not client)
    db.query.mockResolvedValueOnce({ rows: [{ name: "Last Item" }] });

    const res = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({ customerName: "Dan", items: [{ productId: 1, quantity: 1 }] });

    expect(res.status).toBe(201);

    // Verify the stock UPDATE used Out of Stock status
    const updateCall = client.query.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("Out of Stock")
    );
    expect(updateCall).toBeDefined();
  });

  it("restock queue insert is inside the order transaction (atomicity)", async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    db.getClient.mockResolvedValue(client);

    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: "Widget", price: "10", status: "Active", stock_quantity: 3, min_stock_threshold: 5 }],
      })                                // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 20, customer_name: "Eve", total_price: "20", status: "Pending" }] })
      .mockResolvedValueOnce(undefined) // INSERT order_item
      .mockResolvedValueOnce({ rows: [{ id: 1, stock_quantity: 1, min_stock_threshold: 5 }] }) // stock now 1
      // updateRestockQueue should run via client (inside TX) since stock=1 < threshold=5
      .mockResolvedValueOnce({ rows: [] })  // SELECT FROM restock_queue (via client)
      .mockResolvedValueOnce(undefined)     // INSERT INTO restock_queue (via client)
      .mockResolvedValueOnce(undefined);    // COMMIT

    db.query.mockResolvedValueOnce({ rows: [{ name: "Widget" }] }); // product name for log

    const res = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({ customerName: "Eve", items: [{ productId: 1, quantity: 2 }] });

    expect(res.status).toBe(201);

    // All 8 client.query calls should have happened (including restock queue inside TX)
    expect(client.query).toHaveBeenCalledTimes(8);

    // The restock_queue INSERT should use the transaction client
    const restockInsert = client.query.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("INSERT INTO restock_queue")
    );
    expect(restockInsert).toBeDefined();
  });
});

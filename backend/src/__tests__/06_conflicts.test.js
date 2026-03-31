/**
 * Spec Feature 6: Conflict Detection
 * - Prevent duplicate product entries in same order
 * - Prevent ordering inactive (Out of Stock) products
 * - Exact error messages as per spec
 */
require("./setup");

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const db = require("../db/postgres");

const token = jwt.sign({ id: 1, email: "admin@test.com", role: "admin" }, "super-secret-key");
const auth = { Authorization: `Bearer ${token}` };

describe("Feature 6: Conflict Detection", () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects duplicate productId in same order with "already added" message', async () => {
    const res = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({
        customerName: "Eve",
        items: [
          { productId: 1, quantity: 1 },
          { productId: 1, quantity: 2 }, // duplicate!
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already added to the order/i);
  });

  it('rejects ordering an Out of Stock product with "currently unavailable" message', async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    db.getClient.mockResolvedValue(client);

    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: "Broken Phone", price: "100", status: "Out of Stock", stock_quantity: 0, min_stock_threshold: 5 }],
      });

    const res = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({ customerName: "Frank", items: [{ productId: 1, quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/currently unavailable/i);
  });

  it("rejects ordering a product that does not exist", async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    db.getClient.mockResolvedValue(client);

    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // product not found → productMap has no entry

    const res = await request(app)
      .post("/api/orders")
      .set(auth)
      .send({ customerName: "Grace", items: [{ productId: 9999, quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/currently unavailable/i);
  });
});

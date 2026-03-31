/**
 * Spec Feature 2: Product & Category Setup
 * - Create category
 * - Create product with valid category
 * - Invalid category rejects with 400
 * - Product status auto-set to 'Out of Stock' when stockQuantity = 0
 * - Pagination & search on list
 */
require("./setup");

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const db = require("../db/postgres");

const token = jwt.sign({ id: 1, email: "admin@test.com", role: "admin" }, "super-secret-key");
const auth = { Authorization: `Bearer ${token}` };

describe("Feature 2: Product & Category Setup", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("POST /api/categories", () => {
    it("creates a new category", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: "Electronics" }] });

      const res = await request(app)
        .post("/api/categories")
        .set(auth)
        .send({ name: "Electronics" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: "Electronics" });
    });

    it("rejects empty category name with 400", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set(auth)
        .send({ name: "" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/products", () => {
    it("creates a product with valid category", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // category exists
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: "iPhone 13", status: "Active", stock_quantity: 10, min_stock_threshold: 5 }],
        }) // insert
        .mockResolvedValueOnce({ rows: [] }); // restock queue check

      const res = await request(app)
        .post("/api/products")
        .set(auth)
        .send({ name: "iPhone 13", categoryId: 1, price: 999.99, stockQuantity: 10, minStockThreshold: 5 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: "iPhone 13" });
    });

    it("auto-sets status to Out of Stock when stockQuantity is 0", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // category check
        .mockResolvedValueOnce({
          rows: [{ id: 2, name: "Headphones", status: "Out of Stock", stock_quantity: 0, min_stock_threshold: 5 }],
        })                                            // INSERT product
        .mockResolvedValueOnce({ rows: [] })          // SELECT from restock_queue (empty → new entry)
        .mockResolvedValueOnce(undefined)             // INSERT INTO restock_queue
        .mockResolvedValueOnce({ rows: [{ name: "Headphones" }] }); // SELECT name for log

      const res = await request(app)
        .post("/api/products")
        .set(auth)
        .send({ name: "Headphones", categoryId: 1, price: 49.99, stockQuantity: 0, minStockThreshold: 5 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("Out of Stock");
    });

    it("rejects product with non-existent category (400)", async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // category not found

      const res = await request(app)
        .post("/api/products")
        .set(auth)
        .send({ name: "Laptop", categoryId: 9999, price: 1200, stockQuantity: 5, minStockThreshold: 2 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid category/i);
    });

    it("rejects missing required fields with 400", async () => {
      const res = await request(app)
        .post("/api/products")
        .set(auth)
        .send({ name: "X" }); // missing categoryId, price, etc.

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/products", () => {
    it("returns paginated product list", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: "iPhone 13" }] })
        .mockResolvedValueOnce({ rows: [{ total: "1" }] });

      const res = await request(app)
        .get("/api/products?page=1&limit=10")
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ data: expect.any(Array), total: 1, page: 1, totalPages: 1 });
    });

    it("filters products by search term", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: "iPhone 13" }] })
        .mockResolvedValueOnce({ rows: [{ total: "1" }] });

      const res = await request(app)
        .get("/api/products?search=iphone")
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe("iPhone 13");
    });
  });
});

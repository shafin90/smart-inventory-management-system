/**
 * Bonus: Role-Based Access Control
 * - Admin can delete products
 * - Manager cannot delete products (403)
 * - Unauthenticated requests rejected (401)
 */
require("./setup");

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const db = require("../db/postgres");

const adminToken = jwt.sign({ id: 1, email: "admin@test.com", role: "admin" }, "super-secret-key");
const managerToken = jwt.sign({ id: 2, email: "mgr@test.com", role: "manager" }, "super-secret-key");

describe("Bonus: Role-Based Access Control", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("DELETE /api/products/:id (admin only)", () => {
    it("allows admin to delete a product", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] }) // no order_items
        .mockResolvedValueOnce(undefined)    // DELETE from restock_queue
        .mockResolvedValueOnce(undefined);   // DELETE from products

      const res = await request(app)
        .delete("/api/products/1")
        .set({ Authorization: `Bearer ${adminToken}` });

      expect(res.status).toBe(204);
    });

    it("blocks manager from deleting a product (403)", async () => {
      const res = await request(app)
        .delete("/api/products/1")
        .set({ Authorization: `Bearer ${managerToken}` });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });

    it("blocks unauthenticated request (401)", async () => {
      const res = await request(app).delete("/api/products/1");
      expect(res.status).toBe(401);
    });
  });

  describe("Token validation", () => {
    it("rejects malformed JWT (401)", async () => {
      const res = await request(app)
        .get("/api/dashboard")
        .set({ Authorization: "Bearer this.is.fake" });

      expect(res.status).toBe(401);
    });

    it("rejects request with no Authorization header (401)", async () => {
      const res = await request(app).get("/api/products");
      expect(res.status).toBe(401);
    });
  });
});

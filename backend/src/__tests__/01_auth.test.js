/**
 * Spec Feature 1: Authentication
 * - Signup with email + password
 * - Login returns JWT token
 * - Demo credentials work
 * - Duplicate email rejected
 * - Wrong password rejected
 */
require("./setup");

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../app");
const db = require("../db/postgres");

const DEMO_EMAIL = "admin@demo.com";
const DEMO_PASS = "password123";

describe("Feature 1: Authentication", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("POST /api/auth/signup", () => {
    it("creates a new user and returns id/email/role", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] }) // no existing user
        .mockResolvedValueOnce({ rows: [{ id: 1, email: "user@test.com", role: "manager" }] });

      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "user@test.com", password: "secure123" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 1, email: "user@test.com", role: "manager" });
    });

    it("rejects duplicate email with 409", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // user already exists

      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "dup@test.com", password: "secure123" });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already registered/i);
    });

    it("rejects invalid email format with 400", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "not-an-email", password: "secure123" });

      expect(res.status).toBe(400);
    });

    it("rejects short password with 400", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ email: "ok@test.com", password: "123" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns JWT token for valid credentials", async () => {
      const hash = await bcrypt.hash(DEMO_PASS, 10);
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: DEMO_EMAIL, password_hash: hash, role: "admin" }],
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: DEMO_EMAIL, password: DEMO_PASS });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toMatchObject({ email: DEMO_EMAIL, role: "admin" });
    });

    it("rejects wrong password with 401", async () => {
      const hash = await bcrypt.hash("correct-password", 10);
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: "user@test.com", password_hash: hash, role: "manager" }],
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "user@test.com", password: "wrong-password" });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it("rejects unknown email with 401", async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "ghost@test.com", password: "anypass" });

      expect(res.status).toBe(401);
    });
  });
});

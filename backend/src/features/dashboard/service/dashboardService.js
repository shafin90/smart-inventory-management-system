const db = require("../../../db/postgres");
const redis = require("../../../db/redis");

const CACHE_KEY = "dashboard:today";
const CACHE_TTL = 60; // seconds

async function getDashboard(userRole) {
  // Only cache for non-admin (admin sees pending manager count which is dynamic)
  if (userRole !== "admin") {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn("[Cache] Redis read failed, falling back to DB:", err.message);
    }
  }

  const [{ rows: orderRows }, { rows: lowStockRows }, { rows: productSummary }] = await Promise.all([
    db.query(
      `SELECT
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)                          AS total_orders_today,
        COUNT(*) FILTER (WHERE status = 'Pending')                                        AS pending_count,
        COUNT(*) FILTER (WHERE status = 'Confirmed')                                      AS confirmed_count,
        COUNT(*) FILTER (WHERE status = 'Shipped')                                        AS shipped_count,
        COUNT(*) FILTER (WHERE status = 'Delivered')                                      AS delivered_count,
        COUNT(*) FILTER (WHERE status = 'Cancelled')                                      AS cancelled_count,
        COUNT(*) FILTER (WHERE status IN ('Pending','Confirmed','Shipped'))                AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'Delivered')                                      AS completed_orders,
        COALESCE(SUM(total_price) FILTER (
          WHERE DATE(created_at) = CURRENT_DATE AND status <> 'Cancelled'), 0)            AS revenue_today
      FROM orders`
    ),
    db.query("SELECT COUNT(*) AS low_stock_count FROM products WHERE stock_quantity < min_stock_threshold"),
    db.query(
      `SELECT name, stock_quantity, min_stock_threshold,
        CASE WHEN stock_quantity < min_stock_threshold THEN 'Low Stock' ELSE 'OK' END AS stock_label
      FROM products
      ORDER BY stock_quantity ASC
      LIMIT 10`
    ),
  ]);

  const payload = {
    ...orderRows[0],
    low_stock_count: lowStockRows[0].low_stock_count,
    product_summary: productSummary,
  };

  // Add pending manager count for admin
  if (userRole === "admin") {
    const { rows } = await db.query(
      "SELECT COUNT(*) AS pending_managers FROM users WHERE status = 'pending'::user_status AND role = 'manager'"
    );
    payload.pending_managers = Number(rows[0].pending_managers);
  }

  if (userRole !== "admin") {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(payload), { EX: CACHE_TTL });
    } catch (err) {
      console.warn("[Cache] Redis write failed:", err.message);
    }
  }

  return payload;
}

module.exports = { getDashboard };

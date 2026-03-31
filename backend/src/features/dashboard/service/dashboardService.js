const db = require("../../../db/postgres");
const redis = require("../../../db/redis");

async function getDashboard() {
  const cacheKey = "dashboard:today";
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const [{ rows: orderRows }, { rows: lowStockRows }, { rows: productSummary }] = await Promise.all([
    db.query(
      `SELECT
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS total_orders_today,
        COUNT(*) FILTER (WHERE status IN ('Pending','Confirmed','Shipped')) AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'Delivered') AS completed_orders,
        COALESCE(SUM(total_price) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status <> 'Cancelled'), 0) AS revenue_today
      FROM orders`
    ),
    db.query("SELECT COUNT(*) AS low_stock_count FROM products WHERE stock_quantity < min_stock_threshold"),
    db.query(
      `SELECT name, stock_quantity, min_stock_threshold,
        CASE WHEN stock_quantity < min_stock_threshold THEN 'Low Stock' ELSE 'OK' END AS stock_label
      FROM products
      ORDER BY stock_quantity ASC
      LIMIT 10`
    )
  ]);

  const payload = {
    ...orderRows[0],
    low_stock_count: lowStockRows[0].low_stock_count,
    product_summary: productSummary
  };

  await redis.set(cacheKey, JSON.stringify(payload), { EX: 60 });
  return payload;
}

module.exports = { getDashboard };

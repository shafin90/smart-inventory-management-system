const db = require("../../../db/postgres");
const { publishRestockEvent } = require("../../../queue/rabbitmq");
const ApiError = require("../../../utils/apiError");
const { logActivity } = require("../../activity/service/activityService");

function calculatePriority(stock, threshold) {
  if (stock <= Math.floor(threshold * 0.3)) return "High";
  if (stock <= Math.floor(threshold * 0.7)) return "Medium";
  return "Low";
}

async function createProduct(payload) {
  const category = await db.query("SELECT id FROM categories WHERE id = $1", [payload.categoryId]);
  if (!category.rows.length) {
    throw new ApiError(400, "Invalid category. Please create/select a valid category first.");
  }

  const status = payload.stockQuantity === 0 ? "Out of Stock" : "Active";
  try {
    const { rows } = await db.query(
      `INSERT INTO products (name, category_id, price, stock_quantity, min_stock_threshold, status)
       VALUES ($1,$2,$3,$4,$5,$6::product_status) RETURNING *`,
      [payload.name, payload.categoryId, payload.price, payload.stockQuantity, payload.minStockThreshold, status]
    );
    return rows[0];
  } catch (err) {
    if (err.code === "23503") {
      throw new ApiError(400, "Invalid category. Please create/select a valid category first.");
    }
    throw err;
  }
}

async function listProducts({ search = "", page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  const [{ rows }, { rows: countRows }] = await Promise.all([
    db.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.name ILIKE $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) AS total FROM products p WHERE p.name ILIKE $1`,
      [`%${search}%`]
    )
  ]);
  return { data: rows, total: Number(countRows[0].total), page, limit, totalPages: Math.ceil(Number(countRows[0].total) / limit) };
}

async function deleteProduct(id) {
  const inUse = await db.query("SELECT id FROM order_items WHERE product_id = $1 LIMIT 1", [id]);
  if (inUse.rows.length) {
    const ApiError = require("../../../utils/apiError");
    throw new ApiError(409, "Cannot delete product that has associated orders.");
  }
  await db.query("DELETE FROM restock_queue WHERE product_id = $1", [id]);
  await db.query("DELETE FROM products WHERE id = $1", [id]);
}

async function restockProduct(id, quantity) {
  const { rows } = await db.query("UPDATE products SET stock_quantity = stock_quantity + $1, status = 'Active'::product_status WHERE id = $2 RETURNING *", [quantity, id]);
  await db.query("DELETE FROM restock_queue WHERE product_id = $1", [id]);
  return rows[0];
}

async function updateRestockQueue(productId, stockQuantity, minStockThreshold) {
  if (stockQuantity < minStockThreshold) {
    const priority = calculatePriority(stockQuantity, minStockThreshold);
    const existing = await db.query("SELECT id FROM restock_queue WHERE product_id = $1", [productId]);
    await db.query(
      `INSERT INTO restock_queue (product_id, priority)
       VALUES ($1, $2)
       ON CONFLICT (product_id) DO UPDATE SET priority = EXCLUDED.priority, updated_at = NOW()`,
      [productId, priority]
    );
    publishRestockEvent({ productId, priority, stockQuantity });
    if (!existing.rows.length) {
      const product = await db.query("SELECT name FROM products WHERE id = $1", [productId]);
      if (product.rows[0]) {
        await logActivity(`Product "${product.rows[0].name}" added to Restock Queue`);
      }
    }
  } else {
    await db.query("DELETE FROM restock_queue WHERE product_id = $1", [productId]);
  }
}

module.exports = { createProduct, listProducts, restockProduct, updateRestockQueue, deleteProduct };

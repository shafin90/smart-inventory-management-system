const db = require("../../../db/postgres");
const ApiError = require("../../../utils/apiError");
const productService = require("../../product/service/productService");

const ORDER_STATUS = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

async function createOrder({ customerName, items, userId }) {
  const ids = items.map((i) => i.productId);
  if (new Set(ids).size !== ids.length) {
    throw new ApiError(409, "This product is already added to the order.");
  }

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    // FOR UPDATE: row-level locks prevent concurrent orders from overselling
    // the same product. Without this, two simultaneous requests can both read
    // stock=10 and both pass validation, resulting in stock going negative.
    const productData = await client.query(
      `SELECT id, name, price, status, stock_quantity, min_stock_threshold
       FROM products WHERE id = ANY($1)
       FOR UPDATE`,
      [ids]
    );
    const productMap = new Map(productData.rows.map((row) => [row.id, row]));

    let totalPrice = 0;
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product || product.status !== "Active") {
        throw new ApiError(400, "This product is currently unavailable.");
      }
      if (item.quantity > product.stock_quantity) {
        throw new ApiError(400, `Only ${product.stock_quantity} items available in stock`);
      }
      totalPrice += Number(product.price) * item.quantity;
    }

    const orderResult = await client.query(
      "INSERT INTO orders (customer_name, total_price, status, created_by) VALUES ($1, $2, 'Pending', $3) RETURNING *",
      [customerName, totalPrice, userId]
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      const product = productMap.get(item.productId);
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4)",
        [order.id, item.productId, item.quantity, product.price]
      );
      const updated = await client.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - $1,
             status = CASE WHEN stock_quantity - $1 <= 0
                          THEN 'Out of Stock'::product_status
                          ELSE 'Active'::product_status END,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, stock_quantity, min_stock_threshold`,
        [item.quantity, item.productId]
      );
      const p = updated.rows[0];
      // Pass the transaction client so restock queue changes are atomic
      await productService.updateRestockQueue(p.id, p.stock_quantity, p.min_stock_threshold, client);
    }

    await client.query("COMMIT");
    return order;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getOrderWithItems(id) {
  const order = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
  if (!order.rows.length) throw new ApiError(404, "Order not found");
  const items = await db.query(
    `SELECT oi.*, p.name as product_name FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [id]
  );
  return { ...order.rows[0], items: items.rows };
}

async function listOrders({ status, date, page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  const conditions = ["1=1"];
  const params = [];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (date) { params.push(date); conditions.push(`DATE(created_at) = $${params.length}`); }

  const where = conditions.join(" AND ");
  const [{ rows }, { rows: countRows }] = await Promise.all([
    db.query(
      `SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    db.query(`SELECT COUNT(*) AS total FROM orders WHERE ${where}`, params)
  ]);
  return { data: rows, total: Number(countRows[0].total), page, limit, totalPages: Math.ceil(Number(countRows[0].total) / limit) };
}

// Valid next status transitions for managers (must follow this flow strictly)
const MANAGER_NEXT = { Pending: "Confirmed", Confirmed: "Shipped", Shipped: "Delivered" };

async function updateOrderStatus(id, status, userRole = "admin") {
  if (!ORDER_STATUS.includes(status)) throw new ApiError(400, "Invalid order status");

  // Fetch current order
  const current = await db.query("SELECT id, status FROM orders WHERE id = $1", [id]);
  if (!current.rows.length) throw new ApiError(404, "Order not found");
  const currentStatus = current.rows[0].status;

  // Already at terminal state
  if (["Delivered", "Cancelled"].includes(currentStatus)) {
    throw new ApiError(400, `Order is already ${currentStatus} and cannot be updated`);
  }

  if (userRole === "manager") {
    if (status === "Cancelled") {
      // Managers can only cancel before shipping
      if (["Shipped", "Delivered"].includes(currentStatus)) {
        throw new ApiError(403, "Managers cannot cancel an order that has already been shipped");
      }
    } else {
      // Must follow strict flow: Pending → Confirmed → Shipped → Delivered
      const allowed = MANAGER_NEXT[currentStatus];
      if (status !== allowed) {
        throw new ApiError(
          403,
          allowed
            ? `Order status can only be moved to "${allowed}" from "${currentStatus}"`
            : `Order in "${currentStatus}" status cannot be advanced further`
        );
      }
    }
  }

  const { rows } = await db.query(
    "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, id]
  );
  return rows[0];
}

module.exports = { createOrder, listOrders, updateOrderStatus, getOrderWithItems };

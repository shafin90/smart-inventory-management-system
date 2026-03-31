const db = require("../../../db/postgres");

async function listQueue() {
  const { rows } = await db.query(
    `SELECT rq.id, rq.priority, p.id as product_id, p.name as product_name, p.stock_quantity, p.min_stock_threshold
     FROM restock_queue rq
     JOIN products p ON p.id = rq.product_id
     ORDER BY p.stock_quantity ASC, rq.updated_at DESC`
  );
  return rows;
}

async function removeQueueItem(id) {
  await db.query("DELETE FROM restock_queue WHERE id = $1", [id]);
}

module.exports = { listQueue, removeQueueItem };

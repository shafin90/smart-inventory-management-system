const db = require("../../../db/postgres");

async function logActivity(message, userId = null) {
  await db.query("INSERT INTO activity_logs (message, user_id) VALUES ($1, $2)", [message, userId]);
}

async function getRecentActivities(limit = 10) {
  const { rows } = await db.query(
    "SELECT id, message, created_at FROM activity_logs ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return rows;
}

module.exports = { logActivity, getRecentActivities };

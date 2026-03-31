const db = require("../../../db/postgres");
const ApiError = require("../../../utils/apiError");
const { sendMail } = require("../../../utils/mailer");

async function listUsers({ status, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}::user_status`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRes = await db.query(`SELECT COUNT(*) FROM users ${where}`, params);
  const total = Number(countRes.rows[0].count);

  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT id, email, role, status, name, phone, address, created_at
     FROM users ${where}
     ORDER BY
       CASE status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
       created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function approveUser(id) {
  const { rows } = await db.query(
    `UPDATE users SET status = 'active'::user_status
     WHERE id = $1 AND role = 'manager'
     RETURNING id, email, name, status`,
    [id]
  );
  if (!rows.length) throw new ApiError(404, "Manager not found");

  const user = rows[0];
  await sendMail({
    to: user.email,
    subject: "Your Inventory OS Account Has Been Approved",
    text: `Hello ${user.name || ""},\n\nGreat news! Your account has been approved by the administrator. You can now log in to Inventory OS.\n\nBest regards,\nInventory OS Team`,
    html: `<p>Hello <strong>${user.name || ""}</strong>,</p><p>Great news! Your account has been <strong>approved</strong> by the administrator. You can now <a href="#">log in to Inventory OS</a>.</p><p>Best regards,<br/>Inventory OS Team</p>`,
  });
  return user;
}

async function rejectUser(id) {
  const { rows } = await db.query(
    `UPDATE users SET status = 'rejected'::user_status
     WHERE id = $1 AND role = 'manager'
     RETURNING id, email, name, status`,
    [id]
  );
  if (!rows.length) throw new ApiError(404, "Manager not found");

  const user = rows[0];
  await sendMail({
    to: user.email,
    subject: "Your Inventory OS Account Registration",
    text: `Hello ${user.name || ""},\n\nWe regret to inform you that your account registration has been rejected. Please contact the administrator if you believe this is a mistake.\n\nBest regards,\nInventory OS Team`,
    html: `<p>Hello <strong>${user.name || ""}</strong>,</p><p>We regret to inform you that your account registration has been <strong>rejected</strong>. Please contact the administrator if you believe this is a mistake.</p><p>Best regards,<br/>Inventory OS Team</p>`,
  });
  return user;
}

async function deleteUser(id, requestingUserId) {
  if (Number(id) === Number(requestingUserId)) {
    throw new ApiError(400, "You cannot delete your own account");
  }
  // Fetch target user to verify they are not an admin
  const target = await db.query("SELECT role FROM users WHERE id = $1", [id]);
  if (!target.rows.length) throw new ApiError(404, "User not found");
  if (target.rows[0].role === "admin") {
    throw new ApiError(403, "Admin accounts cannot be deleted");
  }
  const { rows } = await db.query(
    "DELETE FROM users WHERE id = $1 RETURNING id, email",
    [id]
  );
  return rows[0];
}

async function changeRole(id, role, requestingUserId) {
  if (Number(id) === Number(requestingUserId)) {
    throw new ApiError(400, "You cannot change your own role");
  }
  const { rows } = await db.query(
    "UPDATE users SET role = $1::user_role WHERE id = $2 RETURNING id, email, role",
    [role, id]
  );
  if (!rows.length) throw new ApiError(404, "User not found");
  return rows[0];
}

async function getPendingCount() {
  const { rows } = await db.query(
    "SELECT COUNT(*) FROM users WHERE status = 'pending'::user_status AND role = 'manager'"
  );
  return Number(rows[0].count);
}

module.exports = { listUsers, approveUser, rejectUser, deleteUser, changeRole, getPendingCount };

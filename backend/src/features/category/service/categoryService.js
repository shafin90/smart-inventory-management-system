const db = require("../../../db/postgres");

async function createCategory(name) {
  const { rows } = await db.query("INSERT INTO categories (name) VALUES ($1) RETURNING *", [name]);
  return rows[0];
}

async function listCategories() {
  const { rows } = await db.query("SELECT * FROM categories ORDER BY name ASC");
  return rows;
}

module.exports = { createCategory, listCategories };

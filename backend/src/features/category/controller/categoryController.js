const { z } = require("zod");
const service = require("../service/categoryService");

const schema = z.object({ name: z.string().min(2) });

async function create(req, res, next) {
  try {
    const payload = schema.parse(req.body);
    const category = await service.createCategory(payload.name);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

async function list(_req, res, next) {
  try {
    const categories = await service.listCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list };

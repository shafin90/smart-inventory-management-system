const { z } = require("zod");
const service = require("../service/productService");
const { logActivity } = require("../../activity/service/activityService");
const { invalidateDashboardCache } = require("../../../utils/cache");

const createSchema = z.object({
  name: z.string().min(2),
  categoryId: z.number().int(),
  price: z.number().positive(),
  stockQuantity: z.number().int().nonnegative(),
  minStockThreshold: z.number().int().nonnegative()
});

const restockSchema = z.object({ quantity: z.number().int().positive() });

async function create(req, res, next) {
  try {
    const payload = createSchema.parse(req.body);
    const product = await service.createProduct(payload);
    await service.updateRestockQueue(product.id, product.stock_quantity, product.min_stock_threshold);
    await logActivity(`Product "${product.name}" created`, req.user?.id || null);
    await invalidateDashboardCache();
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const result = await service.listProducts({ search: req.query.search || "", page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function restock(req, res, next) {
  try {
    const payload = restockSchema.parse(req.body);
    const product = await service.restockProduct(Number(req.params.id), payload.quantity);
    await service.updateRestockQueue(product.id, product.stock_quantity, product.min_stock_threshold);
    await logActivity(`Stock updated for "${product.name}"`, req.user?.id || null);
    await invalidateDashboardCache();
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteProduct(Number(req.params.id));
    await logActivity(`Product #${req.params.id} deleted by admin`, req.user?.id || null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, restock, remove };

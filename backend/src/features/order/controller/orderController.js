const { z } = require("zod");
const service = require("../service/orderService");
const { logActivity } = require("../../activity/service/activityService");
const { invalidateDashboardCache } = require("../../../utils/cache");

const createSchema = z.object({
  customerName: z.string().min(2),
  items: z.array(z.object({ productId: z.number().int(), quantity: z.number().int().positive() })).min(1)
});

const statusSchema = z.object({
  status: z.enum(["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"])
});

async function create(req, res, next) {
  try {
    const payload = createSchema.parse(req.body);
    const order = await service.createOrder({ ...payload, userId: req.user.id });
    await logActivity(`Order #${order.id} created by user`, req.user.id);
    await invalidateDashboardCache();
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const result = await service.listOrders({ status: req.query.status, date: req.query.date, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const order = await service.getOrderWithItems(Number(req.params.id));
    res.json(order);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const payload = statusSchema.parse(req.body);
    const order = await service.updateOrderStatus(Number(req.params.id), payload.status);
    await logActivity(`Order #${order.id} marked as ${payload.status}`, req.user.id);
    await invalidateDashboardCache();
    res.json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, updateStatus };

const service = require("../service/restockService");

async function list(_req, res, next) {
  try {
    const items = await service.listQueue();
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.removeQueueItem(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, remove };

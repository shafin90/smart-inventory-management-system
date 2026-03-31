const service = require("../service/dashboardService");

async function getSummary(_req, res, next) {
  try {
    const data = await service.getDashboard();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };

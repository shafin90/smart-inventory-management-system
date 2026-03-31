const service = require("../service/dashboardService");

async function getSummary(req, res, next) {
  try {
    const data = await service.getDashboard(req.user?.role);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };

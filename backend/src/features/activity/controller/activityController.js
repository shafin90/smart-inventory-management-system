const { getRecentActivities } = require("../service/activityService");

async function list(_req, res, next) {
  try {
    const data = await getRecentActivities(10);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { list };

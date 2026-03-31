const express = require("express");
const controller = require("../controller/dashboardController");

const router = express.Router();
router.get("/", controller.getSummary);

module.exports = router;

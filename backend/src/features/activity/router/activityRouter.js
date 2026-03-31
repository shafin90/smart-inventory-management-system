const express = require("express");
const controller = require("../controller/activityController");

const router = express.Router();
router.get("/", controller.list);

module.exports = router;

const express = require("express");
const controller = require("../controller/categoryController");
const requireRole = require("../../../middleware/roleMiddleware");

const router = express.Router();

router.get("/", controller.list);
router.post("/", requireRole("admin"), controller.create); // admin only

module.exports = router;

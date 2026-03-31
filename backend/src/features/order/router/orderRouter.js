const express = require("express");
const controller = require("../controller/orderController");

const router = express.Router();
router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.patch("/:id/status", controller.updateStatus);
router.patch("/:id/cancel", (req, _res, next) => { req.body.status = "Cancelled"; return next(); }, controller.updateStatus);

module.exports = router;

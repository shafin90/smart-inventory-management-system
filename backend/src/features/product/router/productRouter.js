const express = require("express");
const controller = require("../controller/productController");
const requireRole = require("../../../middleware/roleMiddleware");

const router = express.Router();
router.post("/", controller.create);
router.get("/", controller.list);
router.patch("/:id/restock", controller.restock);
router.delete("/:id", requireRole("admin"), controller.remove);

module.exports = router;

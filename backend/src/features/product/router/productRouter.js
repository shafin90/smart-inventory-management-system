const express = require("express");
const controller = require("../controller/productController");
const requireRole = require("../../../middleware/roleMiddleware");

const router = express.Router();

router.get("/", controller.list);
router.patch("/:id/restock", controller.restock);               // both roles

router.post("/", requireRole("admin"), controller.create);       // admin only
router.delete("/:id", requireRole("admin"), controller.remove);  // admin only

module.exports = router;

const express = require("express");
const controller = require("../controller/adminController");
const requireRole = require("../../../middleware/roleMiddleware");

const router = express.Router();

// All admin routes require admin role
router.use(requireRole("admin"));

router.get("/users", controller.listUsers);
router.patch("/users/:id/approve", controller.approveUser);
router.patch("/users/:id/reject", controller.rejectUser);
router.delete("/users/:id", controller.deleteUser);
router.patch("/users/:id/role", controller.changeRole);

module.exports = router;

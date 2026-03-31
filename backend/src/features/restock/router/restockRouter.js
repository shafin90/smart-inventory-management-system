const express = require("express");
const controller = require("../controller/restockController");

const router = express.Router();
router.get("/", controller.list);
router.delete("/:id", controller.remove);

module.exports = router;

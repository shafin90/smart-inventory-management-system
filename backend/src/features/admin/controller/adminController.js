const { z } = require("zod");
const adminService = require("../service/adminService");

async function listUsers(req, res, next) {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const result = await adminService.listUsers({ status, page: Number(page), limit: Number(limit) });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function approveUser(req, res, next) {
  try {
    const user = await adminService.approveUser(req.params.id);
    res.json({ message: "User approved", user });
  } catch (err) {
    next(err);
  }
}

async function rejectUser(req, res, next) {
  try {
    const user = await adminService.rejectUser(req.params.id);
    res.json({ message: "User rejected", user });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const deleted = await adminService.deleteUser(req.params.id, req.user.id);
    res.json({ message: "User deleted", deleted });
  } catch (err) {
    next(err);
  }
}

async function changeRole(req, res, next) {
  try {
    const { role } = z.object({ role: z.enum(["admin", "manager"]) }).parse(req.body);
    const user = await adminService.changeRole(req.params.id, role, req.user.id);
    res.json({ message: "Role updated", user });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, approveUser, rejectUser, deleteUser, changeRole };

import { useState, useEffect, useCallback } from "react";
import * as adminService from "../service/adminService";

export function useAdmin(active) {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const fetchUsers = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    try {
      const data = await adminService.getUsers({ status: statusFilter, page, limit: 15 });
      setUsers(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [active, statusFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const approve = async (id) => {
    try {
      await adminService.approveUser(id);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve user");
    }
  };

  const reject = async (id) => {
    try {
      await adminService.rejectUser(id);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject user");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await adminService.deleteUser(id);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
    }
  };

  const updateRole = async (id, role) => {
    try {
      await adminService.changeRole(id, role);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change role");
    }
  };

  return {
    users, total, page, totalPages, loading, error,
    statusFilter, setStatusFilter,
    changePage: setPage,
    approve, reject, remove, updateRole,
  };
}

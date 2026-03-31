import { useEffect, useState } from "react";
import { createOrderService, listOrdersService, updateOrderStatusService } from "../service/orderService";
import { listProductsService } from "../../products/service/productService";

export function useOrders(active) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", date: "" });
  const limit = 10;

  const refresh = async (p = page, f = filters) => {
    const params = { page: p, limit };
    if (f.status) params.status = f.status;
    if (f.date) params.date = f.date;
    const result = await listOrdersService(params);
    setOrders(result.data);
    setTotal(result.total);
  };

  useEffect(() => {
    if (!active) return;
    Promise.all([
      refresh(1, { status: "", date: "" }),
      listProductsService({ page: 1, limit: 100 }).then((r) => setProducts(r.data)),
    ]).catch(() => {});
  }, [active]);

  const applyFilters = async (f) => {
    setFilters(f);
    setPage(1);
    await refresh(1, f);
  };

  const changePage = async (p) => {
    setPage(p);
    await refresh(p, filters);
  };

  const createOrder = async (payload) => {
    setError("");
    try {
      await createOrderService(payload);
      await refresh(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Order creation failed");
    }
  };

  const updateStatus = async (id, status) => {
    setError("");
    try {
      await updateOrderStatusService(id, status);
      await refresh(page, filters);
    } catch (err) {
      setError(err.response?.data?.message || "Status update failed");
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return { orders, products, total, page, totalPages, changePage, error, filters, applyFilters, createOrder, updateStatus };
}

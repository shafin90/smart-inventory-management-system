import { useEffect, useState } from "react";
import {
  createCategoryService,
  createProductService,
  deleteProductService,
  listCategoriesService,
  listProductsService,
  restockProductService,
} from "../service/productService";

export function useProducts(active) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const limit = 10;

  const refreshCategories = async () => {
    const cats = await listCategoriesService();
    setCategories(cats);
  };

  const refresh = async (p = page, s = search) => {
    const result = await listProductsService({ page: p, limit, search: s });
    setProducts(result.data);
    setTotal(result.total);
  };

  useEffect(() => {
    if (!active) return;
    Promise.all([refresh(1, ""), refreshCategories()]).catch(() => {});
  }, [active]);

  const applySearch = async (s) => {
    setSearch(s);
    setPage(1);
    await refresh(1, s);
  };

  const changePage = async (p) => {
    setPage(p);
    await refresh(p, search);
  };

  const create = async (payload) => {
    setError("");
    try {
      await createProductService(payload);
      await refresh(page, search);
    } catch (err) {
      setError(err.response?.data?.message || "Create product failed");
    }
  };

  const restock = async (id, quantity) => {
    setError("");
    try {
      await restockProductService(id, quantity);
      await refresh(page, search);
    } catch (err) {
      setError(err.response?.data?.message || "Restock failed");
    }
  };

  const remove = async (id) => {
    setError("");
    try {
      await deleteProductService(id);
      await refresh(page, search);
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const createCategory = async (name) => {
    setError("");
    try {
      await createCategoryService(name);
      await refreshCategories();
    } catch (err) {
      setError(err.response?.data?.message || "Create category failed");
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return { products, categories, total, page, totalPages, search, applySearch, changePage, create, createCategory, restock, remove, error };
}

import { useEffect, useState } from "react";
import { listRestockService, removeRestockService } from "../service/restockService";
import { restockProductService } from "../../products/service/productService";

export function useRestock(active) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const refresh = async () => setItems(await listRestockService());

  useEffect(() => {
    if (active) refresh().catch(() => {});
  }, [active]);

  const remove = async (id) => {
    await removeRestockService(id);
    await refresh();
  };

  const restock = async (productId, quantity) => {
    setError("");
    try {
      await restockProductService(productId, quantity);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Restock failed");
    }
  };

  return { items, remove, restock, error };
}

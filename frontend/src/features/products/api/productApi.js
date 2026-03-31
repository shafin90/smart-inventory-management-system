import httpClient from "../../../shared/api/httpClient";
export const listProductsApi   = (params) => httpClient.get("/products", { params });
export const createProductApi  = (payload) => httpClient.post("/products", payload);
export const restockProductApi = (id, quantity) => httpClient.patch(`/products/${id}/restock`, { quantity });
export const deleteProductApi  = (id) => httpClient.delete(`/products/${id}`);
export const listCategoriesApi = () => httpClient.get("/categories");
export const createCategoryApi = (name) => httpClient.post("/categories", { name });

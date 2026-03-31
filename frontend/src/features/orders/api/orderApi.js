import httpClient from "../../../shared/api/httpClient";
export const createOrderApi = (payload) => httpClient.post("/orders", payload);
export const listOrdersApi = (params) => httpClient.get("/orders", { params });
export const updateOrderStatusApi = (id, status) => httpClient.patch(`/orders/${id}/status`, { status });

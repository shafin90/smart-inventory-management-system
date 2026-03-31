import httpClient from "../../../shared/api/httpClient";
export const listRestockApi = () => httpClient.get("/restock-queue");
export const removeRestockApi = (id) => httpClient.delete(`/restock-queue/${id}`);

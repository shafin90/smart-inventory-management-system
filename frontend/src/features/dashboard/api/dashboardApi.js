import httpClient from "../../../shared/api/httpClient";

export const getDashboardApi = () => httpClient.get("/dashboard");

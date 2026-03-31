import { getDashboardApi } from "../api/dashboardApi";

export const getDashboardService = async () => (await getDashboardApi()).data;

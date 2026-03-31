import httpClient from "../../../shared/api/httpClient";
export const listActivitiesApi = () => httpClient.get("/activities");

import httpClient from "../../../shared/api/httpClient";

export const loginApi = (payload) => httpClient.post("/auth/login", payload);
export const signupApi = (payload) => httpClient.post("/auth/signup", payload);

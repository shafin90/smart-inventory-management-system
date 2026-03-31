import { loginApi, signupApi } from "../api/authApi";

export const loginService = async (email, password) => (await loginApi({ email, password })).data;

export const signupService = async (payload) => (await signupApi(payload)).data;

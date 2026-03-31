import { useState } from "react";
import { loginService, signupService } from "../service/authService";
import rootStore from "../../../stores/rootStore";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (email, password) => {
    setLoading(true);
    setError("");
    try {
      const data = await loginService(email, password);
      rootStore.setAuth(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password) => {
    setLoading(true);
    setError("");
    try {
      await signupService(email, password);
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
      setLoading(false);
    }
  };

  return { login, signup, loading, error };
}

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

  /**
   * Returns { pending: true } if the signup created a manager account
   * that is now awaiting admin approval (so the UI can show a pending screen).
   */
  const signup = async ({ email, password, name, phone, address }) => {
    const role = "manager"; // public signup is always manager
    setLoading(true);
    setError("");
    try {
      const data = await signupService({ email, password, role, name, phone, address });
      if (data?.user?.status === "pending") {
        setLoading(false);
        return { pending: true };
      }
      // Admin signups go straight to login
      await login(email, password);
      return null;
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
      setLoading(false);
      return null;
    }
  };

  return { login, signup, loading, error };
}

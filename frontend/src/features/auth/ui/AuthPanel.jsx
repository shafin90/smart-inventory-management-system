import { useState } from "react";
import { useAuth } from "../hook/useAuth";

const DEMO = { email: "demo@inventory.com", password: "password123" };

export default function AuthPanel() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, signup, loading, error } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "login") login(email, password);
    else signup(email, password);
  };

  const handleDemo = () => {
    setEmail(DEMO.email);
    setPassword(DEMO.password);
    login(DEMO.email, DEMO.password);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: 40 }}>🏪</div>
          <h1>Smart Inventory OS</h1>
          <p>Manage products, orders & stock levels</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${mode === "login" ? " active" : ""}`} onClick={() => setMode("login")}>Login</button>
          <button className={`auth-tab${mode === "signup" ? " active" : ""}`} onClick={() => setMode("signup")}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="alert alert-error">⚠️ {error}</div>}
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary" style={{ width: "100%", height: 40 }} disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Login →" : "Create Account →"}
            </button>
            <button type="button" className="btn auth-demo-btn" style={{ width: "100%", height: 40 }} onClick={handleDemo} disabled={loading}>
              🚀 Demo Login (pre-filled)
            </button>
          </div>
        </form>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "var(--gray-400)" }}>
          Demo: demo@inventory.com / password123
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "../hook/useAuth";

const DEMO_ADMIN   = { email: "demo@inventory.com",  password: "password123" };
const DEMO_MANAGER = { email: "manager@demo.com",     password: "password123" };

export default function AuthPanel() {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [address, setAddress]   = useState("");
  const [pending, setPending]   = useState(false);

  const { login, signup, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === "login") {
      login(email, password);
    } else {
      const result = await signup({ email, password, role: "manager", name, phone, address });
      if (result?.pending) setPending(true);
    }
  };

  if (pending) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>⏳</div>
          <h2 style={{ marginBottom: 8 }}>Registration Submitted!</h2>
          <p style={{ color: "var(--gray-500)", marginBottom: 20, lineHeight: 1.6 }}>
            Your manager account is <strong>pending admin approval</strong>.<br />
            You will receive an email once approved.
          </p>
          <button className="btn btn-secondary" onClick={() => { setPending(false); setMode("login"); }}>
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: 40 }}>🏪</div>
          <h1>Smart Inventory OS</h1>
          <p>Manage products, orders &amp; stock levels</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${mode === "login" ? " active" : ""}`} onClick={() => setMode("login")}>
            Login
          </button>
          <button className={`auth-tab${mode === "signup" ? " active" : ""}`} onClick={() => setMode("signup")}>
            Manager Sign Up
          </button>
        </div>

        {mode === "signup" && (
          <div style={{ background: "var(--warning-light)", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
            ⚠ Manager accounts require <strong>admin approval</strong> before you can log in.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {/* Manager-only extra fields on signup */}
          {mode === "signup" && (
            <>
              <div className="auth-field">
                <label>Full Name *</label>
                <input placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="auth-field">
                <label>Phone Number *</label>
                <input placeholder="+880 1XXX-XXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="auth-field">
                <label>Address *</label>
                <textarea
                  placeholder="Street, City, Country"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  required
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--gray-200)", fontSize: 13, resize: "vertical" }}
                />
              </div>
            </>
          )}

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <div className="auth-actions">
            <button type="submit" className="btn btn-primary" style={{ width: "100%", height: 40 }} disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Login →" : "Submit Registration →"}
            </button>

            {mode === "login" && (
              <>
                <button
                  type="button"
                  className="btn auth-demo-btn"
                  style={{ width: "100%", height: 40 }}
                  onClick={() => { setEmail(DEMO_ADMIN.email); setPassword(DEMO_ADMIN.password); login(DEMO_ADMIN.email, DEMO_ADMIN.password); }}
                  disabled={loading}
                >
                  🔑 Demo Login (Admin)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: "100%", height: 38 }}
                  onClick={() => { setEmail(DEMO_MANAGER.email); setPassword(DEMO_MANAGER.password); login(DEMO_MANAGER.email, DEMO_MANAGER.password); }}
                  disabled={loading}
                >
                  👤 Demo Login (Manager)
                </button>
              </>
            )}
          </div>
        </form>

        {mode === "login" && (
          <p style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--gray-400)" }}>
            Admin: demo@inventory.com / password123 &nbsp;|&nbsp; Manager: manager@demo.com / password123
          </p>
        )}
      </div>
    </div>
  );
}

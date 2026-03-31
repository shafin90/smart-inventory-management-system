import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";
import {
  LayoutDashboard, Clock, TrendingUp, Package,
  ShoppingCart, AlertTriangle,
} from "lucide-react";
import { useDashboard } from "../hook/useDashboard";
import rootStore from "../../../stores/rootStore";

const STATUS_COLORS = {
  Pending:   "#f59e0b",
  Confirmed: "#3b82f6",
  Shipped:   "#8b5cf6",
  Delivered: "#10b981",
  Cancelled: "#ef4444",
};

export default function DashboardPanel({ active }) {
  const data    = useDashboard(active);
  const isAdmin = rootStore.isAdmin;

  if (!active) return null;
  if (!data) return (
    <div className="section-header">
      <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LayoutDashboard size={20} /> Dashboard
      </h1>
      <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--gray-400)" }}>Loading dashboard…</div>
    </div>
  );

  const chartData = [
    { name: "Pending",   value: Number(data.pending_count   || 0), color: STATUS_COLORS.Pending   },
    { name: "Confirmed", value: Number(data.confirmed_count || 0), color: STATUS_COLORS.Confirmed },
    { name: "Shipped",   value: Number(data.shipped_count   || 0), color: STATUS_COLORS.Shipped   },
    { name: "Delivered", value: Number(data.delivered_count || 0), color: STATUS_COLORS.Delivered },
    { name: "Cancelled", value: Number(data.cancelled_count || 0), color: STATUS_COLORS.Cancelled },
  ];

  return (
    <>
      <div className="section-header">
        <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LayoutDashboard size={20} /> Dashboard
        </h1>
        <span style={{ fontSize: 12, color: "var(--gray-400)" }}>Live data — refreshed on load</span>
      </div>

      {/* Admin: pending managers alert */}
      {isAdmin && data.pending_managers > 0 && (
        <div
          style={{
            background: "var(--warning-light, #fef3c7)",
            border: "1px solid var(--warning, #f59e0b)",
            borderRadius: 10,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <Clock size={20} color="var(--warning)" />
          <div style={{ flex: 1 }}>
            <strong>{data.pending_managers} manager account{data.pending_managers > 1 ? "s" : ""} pending approval</strong>
            <span style={{ fontSize: 12, color: "var(--gray-500)", marginLeft: 8 }}>
              Go to User Management to review
            </span>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => rootStore.setTab("admin")}>
            Review
          </button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Orders Today</div>
          <div className="stat-value blue">{data.total_orders_today}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue Today</div>
          <div className="stat-value green">${Number(data.revenue_today).toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Progress</div>
          <div className="stat-value amber">{data.pending_orders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Delivered</div>
          <div className="stat-value green">{data.completed_orders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value red">{data.low_stock_count}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={15} /> Orders by Status
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, "Orders"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--gray-100)" }}>
            {chartData.map(({ name, value, color }) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
                <span style={{ color: "var(--gray-500)" }}>{name}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Package size={15} /> Product Stock Summary
          </div>
          <div className="table-wrap" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.product_summary || []).map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td>{p.stock_quantity} left</td>
                    <td>
                      <span className={`badge ${p.stock_label === "Low Stock" ? "badge-red" : "badge-green"}`}>
                        {p.stock_label}
                      </span>
                    </td>
                  </tr>
                ))}
                {!(data.product_summary || []).length && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "var(--gray-400)", padding: "24px" }}>
                      No products yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

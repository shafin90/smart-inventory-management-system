import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useDashboard } from "../hook/useDashboard";

export default function DashboardPanel({ active }) {
  const data = useDashboard(active);
  if (!active) return null;
  if (!data) return (
    <div className="section-header">
      <h1 className="section-title">Dashboard</h1>
      <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--gray-400)" }}>Loading dashboard…</div>
    </div>
  );

  const chartData = [
    { name: "Pending",   value: Number(data.pending_orders   || 0) },
    { name: "Completed", value: Number(data.completed_orders || 0) },
  ];

  return (
    <>
      <div className="section-header">
        <h1 className="section-title">📊 Dashboard</h1>
        <span style={{ fontSize: 12, color: "var(--gray-400)" }}>Live data — refreshed on load</span>
      </div>

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
          <div className="stat-label">Pending Orders</div>
          <div className="stat-value amber">{data.pending_orders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed Orders</div>
          <div className="stat-value green">{data.completed_orders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value red">{data.low_stock_count}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          <div className="card-title">📈 Pending vs Completed</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">📦 Product Stock Summary</div>
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
                  <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--gray-400)", padding: "24px" }}>No products yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

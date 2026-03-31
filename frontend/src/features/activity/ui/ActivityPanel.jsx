import { Clock, ShoppingCart, TrendingUp, RefreshCw, Plus, Trash2 } from "lucide-react";
import { useActivity } from "../hook/useActivity";

function getActivityIcon(message) {
  if (message.includes("Order") && message.includes("created"))  return <ShoppingCart size={14} color="var(--primary)" />;
  if (message.includes("marked as"))                             return <TrendingUp    size={14} color="var(--success)" />;
  if (message.includes("Stock updated"))                         return <TrendingUp    size={14} color="var(--success)" />;
  if (message.includes("Restock Queue"))                         return <RefreshCw     size={14} color="var(--warning)" />;
  if (message.includes("added"))                                 return <Plus          size={14} color="var(--primary)" />;
  if (message.includes("deleted") || message.includes("removed")) return <Trash2      size={14} color="var(--danger)"  />;
  return <Clock size={14} color="var(--gray-400)" />;
}

export default function ActivityPanel({ active }) {
  const items = useActivity(active);
  if (!active) return null;

  return (
    <>
      <div className="section-header">
        <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={20} /> Activity Log
        </h1>
        <span style={{ fontSize: 12, color: "var(--gray-400)" }}>Latest {items.length} system actions</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ margin: 0, border: "none", borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontSize: 12, color: "var(--gray-500)", whiteSpace: "nowrap" }}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    <br />
                    <span style={{ fontSize: 11, color: "var(--gray-400)" }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      {getActivityIcon(item.message)}
                      {item.message}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={2}>
                    <div className="empty-state">
                      <Clock size={32} strokeWidth={1.2} color="var(--gray-300)" />
                      <p>No activity recorded yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

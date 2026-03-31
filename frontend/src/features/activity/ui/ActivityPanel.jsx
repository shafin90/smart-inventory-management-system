import { useActivity } from "../hook/useActivity";

export default function ActivityPanel({ active }) {
  const items = useActivity(active);
  if (!active) return null;

  return (
    <>
      <div className="section-header">
        <h1 className="section-title">🕐 Activity Log</h1>
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
                    <span style={{ fontSize: 13 }}>
                      {item.message.includes("Order") && "🛒 "}
                      {item.message.includes("Stock updated") && "📈 "}
                      {item.message.includes("Restock Queue") && "🔄 "}
                      {item.message.includes("created") && !item.message.includes("Order") && "➕ "}
                      {item.message.includes("deleted") && "🗑 "}
                      {item.message}
                    </span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={2}>
                    <div className="empty-state">
                      <div className="empty-icon">🕐</div>
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

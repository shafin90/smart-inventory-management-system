import { useState } from "react";
import { RefreshCw, Check, X, PackageCheck, AlertTriangle } from "lucide-react";
import { useRestock } from "../hook/useRestock";

const priorityClass = (p) => ({ High: "badge-red", Medium: "badge-amber", Low: "badge-green" }[p] || "badge-gray");

export default function RestockPanel({ active }) {
  const { items, remove, restock, error } = useRestock(active);
  const [restockId, setRestockId]   = useState(null);
  const [restockQty, setRestockQty] = useState(10);

  if (!active) return null;

  return (
    <>
      <div className="section-header">
        <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <RefreshCw size={20} /> Restock Queue
        </h1>
        <span style={{ fontSize: 12, color: "var(--gray-400)" }}>Products below minimum threshold — sorted by lowest stock first</span>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ margin: 0, border: "none", borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Min Threshold</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 500 }}>{i.product_name}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: "var(--danger)" }}>{i.stock_quantity}</span>
                  </td>
                  <td>{i.min_stock_threshold}</td>
                  <td>
                    <span className={`badge ${priorityClass(i.priority)}`}>{i.priority}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {restockId === i.id ? (
                        <>
                          <input type="number" min="1" style={{ width: 70, height: 28 }} value={restockQty} onChange={(e) => setRestockQty(Number(e.target.value))} />
                          <button
                            className="btn btn-success btn-sm"
                            style={{ display: "flex", alignItems: "center", gap: 4 }}
                            onClick={async () => { await restock(i.product_id, restockQty); setRestockId(null); }}
                          >
                            <Check size={12} /> Restock
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setRestockId(null)}>
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ display: "flex", alignItems: "center", gap: 4 }}
                            onClick={() => { setRestockId(i.id); setRestockQty(10); }}
                          >
                            <RefreshCw size={12} /> Restock
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => remove(i.id)}>Remove</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <PackageCheck size={32} strokeWidth={1.2} color="var(--gray-300)" />
                      <p>All products are well-stocked!</p>
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

import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useOrders } from "../hook/useOrders";
import rootStore from "../../../stores/rootStore";

const ORDER_STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

// Valid next status for managers (strict sequential flow)
const MANAGER_NEXT = {
  Pending:   "Confirmed",
  Confirmed: "Shipped",
  Shipped:   "Delivered",
};

const statusBadge = (s) => {
  const map = { Pending: "badge-gray", Confirmed: "badge-blue", Shipped: "badge-amber", Delivered: "badge-green", Cancelled: "badge-red" };
  return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
};

function OrdersPanel({ active }) {
  const { orders, products, total, page, totalPages, changePage, error, filters, applyFilters, createOrder, updateStatus } = useOrders(active);
  const isAdmin = rootStore.isAdmin;
  const [showForm, setShowForm]     = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems]           = useState([{ productId: 0, quantity: 1 }]);
  const [localError, setLocalError] = useState("");

  if (!active) return null;

  const updateItem = (i, key, val) => setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  const addLine    = () => setItems((prev) => [...prev, { productId: 0, quantity: 1 }]);
  const removeLine = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const submitOrder = async () => {
    setLocalError("");
    if (!customerName.trim()) { setLocalError("Customer name is required"); return; }
    const selected = items.filter((i) => i.productId > 0);
    if (!selected.length) { setLocalError("Please select at least one product"); return; }
    const ids = selected.map((i) => i.productId);
    if (new Set(ids).size !== ids.length) { setLocalError("This product is already added to the order."); return; }
    await createOrder({ customerName, items: selected });
    setCustomerName("");
    setItems([{ productId: 0, quantity: 1 }]);
    setShowForm(false);
  };

  /** Build the action buttons for a row according to the user's role */
  const renderActions = (o) => {
    if (["Delivered", "Cancelled"].includes(o.status)) return null;

    if (isAdmin) {
      return (
        <>
          {o.status === "Pending"   && <button className="btn btn-primary btn-sm"  onClick={() => updateStatus(o.id, "Confirmed")}>Confirm</button>}
          {o.status === "Confirmed" && <button className="btn btn-warning btn-sm"  onClick={() => updateStatus(o.id, "Shipped")}>Ship</button>}
          {o.status === "Shipped"   && <button className="btn btn-success btn-sm"  onClick={() => updateStatus(o.id, "Delivered")}>Deliver</button>}
          <button className="btn btn-danger btn-sm" onClick={() => updateStatus(o.id, "Cancelled")}>Cancel</button>
        </>
      );
    }

    // Manager: strict sequential flow, cancel only before Shipped
    const nextStatus = MANAGER_NEXT[o.status];
    return (
      <>
        {nextStatus && (
          <button
            className={`btn btn-sm ${nextStatus === "Confirmed" ? "btn-primary" : nextStatus === "Shipped" ? "btn-warning" : "btn-success"}`}
            onClick={() => updateStatus(o.id, nextStatus)}
          >
            → {nextStatus}
          </button>
        )}
        {!["Shipped", "Delivered"].includes(o.status) && (
          <button className="btn btn-danger btn-sm" onClick={() => updateStatus(o.id, "Cancelled")}>
            Cancel
          </button>
        )}
      </>
    );
  };

  return (
    <>
      <div className="section-header">
        <h1 className="section-title">🛒 Orders</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "✕ Cancel" : "+ Create Order"}
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "12px 20px" }}>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select style={{ width: 160 }} value={filters.status} onChange={(e) => applyFilters({ ...filters, status: e.target.value })}>
              <option value="">All Status</option>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" value={filters.date} onChange={(e) => applyFilters({ ...filters, date: e.target.value })} />
          </div>
          {(filters.status || filters.date) && (
            <div className="form-group" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => applyFilters({ status: "", date: "" })}>✕ Clear Filters</button>
            </div>
          )}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--gray-400)", alignSelf: "flex-end", paddingBottom: 4 }}>
            {total} order{total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Create Order Form */}
      {showForm && (
        <div className="card">
          <div className="card-title">🛒 New Order</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input style={{ width: 220 }} placeholder="e.g. John Smith" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ display: "block", marginBottom: 8 }}>Products *</label>
            {items.map((item, index) => (
              <div key={index} className="form-row" style={{ marginBottom: 8 }}>
                <select style={{ width: 280 }} value={item.productId} onChange={(e) => updateItem(index, "productId", Number(e.target.value))}>
                  <option value={0}>Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.status !== "Active"}>
                      {p.name} ({p.status}) — {p.stock_quantity} left @ ${Number(p.price).toFixed(2)}
                    </option>
                  ))}
                </select>
                <div className="form-group">
                  <input type="number" min="1" style={{ width: 80 }} value={item.quantity} onChange={(e) => updateItem(index, "quantity", Number(e.target.value))} />
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => removeLine(index)} disabled={items.length === 1}>✕</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addLine}>+ Add another product</button>
          </div>

          {(localError || error) && <div className="alert alert-error">⚠️ {localError || error}</div>}
          <div className="form-row" style={{ marginBottom: 0 }}>
            <button className="btn btn-primary" onClick={submitOrder}>Place Order</button>
          </div>
        </div>
      )}

      {/* Role permission info for managers */}
      {!isAdmin && (
        <div style={{ fontSize: 11, color: "var(--gray-400)", padding: "4px 0 8px" }}>
          ℹ Managers follow the order flow: Pending → Confirmed → Shipped → Delivered. Cancellation is only allowed before shipping.
        </div>
      )}

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ margin: 0, border: "none", borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>#{o.id}</td>
                  <td>{o.customer_name}</td>
                  <td style={{ fontWeight: 500 }}>${Number(o.total_price).toFixed(2)}</td>
                  <td>{statusBadge(o.status)}</td>
                  <td style={{ fontSize: 12, color: "var(--gray-500)" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {renderActions(o)}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-icon">🛒</div><p>No orders found</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination" style={{ padding: "12px 16px" }}>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => changePage(page - 1)}>← Prev</button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </>
  );
}

export default observer(OrdersPanel);

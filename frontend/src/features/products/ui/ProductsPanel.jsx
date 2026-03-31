import { useState } from "react";
import { observer } from "mobx-react-lite";
import {
  Package, FolderOpen, Plus, Search, RefreshCw,
  Trash2, ChevronLeft, ChevronRight, X, AlertTriangle,
} from "lucide-react";
import { useProducts } from "../hook/useProducts";
import rootStore from "../../../stores/rootStore";

const statusBadge = (status) =>
  status === "Active"
    ? <span className="badge badge-green">Active</span>
    : <span className="badge badge-red">Out of Stock</span>;

function ProductsPanel({ active }) {
  const { products, categories, total, page, totalPages, applySearch, changePage, create, createCategory, restock, remove, error } = useProducts(active);
  const isAdmin = rootStore.isAdmin;

  const [search, setSearch]         = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [restockId, setRestockId]   = useState(null);
  const [restockQty, setRestockQty] = useState(10);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm] = useState({ name: "", categoryId: 0, price: "", stockQuantity: "", minStockThreshold: 5 });

  if (!active) return null;

  const handleSearch = (e) => { e.preventDefault(); applySearch(search); };

  const handleCreate = async () => {
    if (!form.name || form.categoryId === 0 || !form.price) return;
    await create({ ...form, price: Number(form.price), stockQuantity: Number(form.stockQuantity), minStockThreshold: Number(form.minStockThreshold) });
    setForm({ name: "", categoryId: 0, price: "", stockQuantity: "", minStockThreshold: 5 });
    setShowForm(false);
  };

  return (
    <>
      <div className="section-header">
        <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Package size={20} /> Products
        </h1>
        {isAdmin && (
          <button className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowForm((v) => !v)}>
            {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Product</>}
          </button>
        )}
      </div>

      {/* Categories — admin only */}
      {isAdmin && (
        <div className="card" style={{ padding: "14px 20px" }}>
          <div className="card-title" style={{ marginBottom: 10, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <FolderOpen size={14} /> Categories
          </div>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <input style={{ maxWidth: 220 }} placeholder="New category name (e.g. Electronics)" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            <button className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 5 }}
              onClick={async () => { if (!categoryName.trim()) return; await createCategory(categoryName.trim()); setCategoryName(""); }}>
              <Plus size={13} /> Add Category
            </button>
            {categories.map((c) => (
              <span key={c.id} className="badge badge-blue" style={{ fontSize: 12, padding: "4px 10px" }}>{c.name}</span>
            ))}
          </div>
          {categories.length === 0 && (
            <p style={{ marginTop: 8, color: "var(--warning)", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
              <AlertTriangle size={12} /> No categories yet. Add one before creating products.
            </p>
          )}
        </div>
      )}

      {/* Add Product Form — admin only */}
      {isAdmin && showForm && (
        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> New Product
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input style={{ width: 200 }} placeholder="e.g. iPhone 13" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select style={{ width: 160 }} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}>
                <option value={0}>Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Price ($) *</label>
              <input style={{ width: 100 }} type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Stock Qty</label>
              <input style={{ width: 90 }} type="number" min="0" placeholder="0" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Min Threshold</label>
              <input style={{ width: 90 }} type="number" min="0" placeholder="5" value={form.minStockThreshold} onChange={(e) => setForm({ ...form, minStockThreshold: e.target.value })} />
            </div>
            <div className="form-group" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-primary" onClick={handleCreate} disabled={categories.length === 0 || form.categoryId === 0}>
                Save Product
              </button>
            </div>
          </div>
          {error && (
            <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="card" style={{ padding: "12px 20px" }}>
        <form className="search-bar" onSubmit={handleSearch} style={{ marginBottom: 0 }}>
          <Search size={14} style={{ color: "var(--gray-400)", flexShrink: 0 }} />
          <input placeholder="Search products by name…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: "none", outline: "none", flex: 1, fontSize: 13 }} />
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
          {search && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={() => { setSearch(""); applySearch(""); }}>
              <X size={12} /> Clear
            </button>
          )}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--gray-400)" }}>{total} product{total !== 1 ? "s" : ""} found</span>
        </form>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ margin: 0, border: "none", borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Min Threshold</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>{p.category_name || "—"}</td>
                  <td>${Number(p.price).toFixed(2)}</td>
                  <td>
                    <span style={{ fontWeight: p.stock_quantity <= p.min_stock_threshold ? 600 : 400, color: p.stock_quantity <= p.min_stock_threshold ? "var(--danger)" : "inherit" }}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td>{p.min_stock_threshold}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {restockId === p.id ? (
                        <>
                          <input type="number" min="1" style={{ width: 60, height: 28 }} value={restockQty} onChange={(e) => setRestockQty(Number(e.target.value))} />
                          <button className="btn btn-success btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }}
                            onClick={async () => { await restock(p.id, restockQty); setRestockId(null); }}>
                            <RefreshCw size={12} /> Apply
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setRestockId(null)}>
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }}
                          onClick={() => { setRestockId(p.id); setRestockQty(10); }}>
                          <RefreshCw size={12} /> Restock
                        </button>
                      )}
                      {isAdmin && (
                        <button className="btn btn-danger btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={() => remove(p.id)}>
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <Package size={32} strokeWidth={1.2} color="var(--gray-300)" />
                      <p>No products found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination" style={{ padding: "12px 16px" }}>
            <button className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }} disabled={page <= 1} onClick={() => changePage(page - 1)}>
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }} disabled={page >= totalPages} onClick={() => changePage(page + 1)}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default observer(ProductsPanel);

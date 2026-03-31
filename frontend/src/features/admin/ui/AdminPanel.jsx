import {
  Shield, Clock, CheckCircle, XCircle, Trash2,
  ArrowUp, ArrowDown, RotateCcw, ChevronLeft, ChevronRight, Users,
} from "lucide-react";
import { useAdmin } from "../hook/useAdmin";
import rootStore from "../../../stores/rootStore";

const STATUS_FILTERS = [
  { value: "pending",  label: "Pending Approval" },
  { value: "active",   label: "Active"           },
  { value: "rejected", label: "Rejected"          },
  { value: "",         label: "All Users"         },
];

const statusBadge = (s) => {
  const map = { pending: "badge-amber", active: "badge-green", rejected: "badge-red" };
  return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
};

const roleBadge = (r) => (
  <span className={`badge ${r === "admin" ? "badge-blue" : "badge-gray"}`}>{r}</span>
);

export default function AdminPanel({ active }) {
  const {
    users, total, page, totalPages, loading, error,
    statusFilter, setStatusFilter,
    changePage, approve, reject, remove, updateRole,
  } = useAdmin(active);

  const myId = rootStore.user?.id;

  if (!active) return null;

  return (
    <>
      <div className="section-header">
        <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={20} /> User Management
        </h1>
        <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{total} user{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Status filter tabs */}
      <div className="card" style={{ padding: "12px 20px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              className={`btn btn-sm ${statusFilter === value ? "btn-primary" : "btn-secondary"}`}
              onClick={() => { setStatusFilter(value); changePage(1); }}
            >
              {value === "pending"  && <Clock        size={12} style={{ marginRight: 4 }} />}
              {value === "active"   && <CheckCircle  size={12} style={{ marginRight: 4 }} />}
              {value === "rejected" && <XCircle      size={12} style={{ marginRight: 4 }} />}
              {value === ""         && <Users         size={12} style={{ marginRight: 4 }} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <XCircle size={14} /> {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ margin: 0, border: "none", borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--gray-400)", padding: 24 }}>Loading…</td>
                </tr>
              )}
              {!loading && users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{u.name || "—"}</div>
                    <div style={{ fontSize: 12, color: "var(--gray-400)" }}>{u.email}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{u.phone || "—"}</td>
                  <td style={{ fontSize: 12, maxWidth: 160, whiteSpace: "pre-wrap" }}>{u.address || "—"}</td>
                  <td>{roleBadge(u.role)}</td>
                  <td>{statusBadge(u.status)}</td>
                  <td style={{ fontSize: 12, color: "var(--gray-500)" }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {u.status === "pending" && (
                        <>
                          <button className="btn btn-success btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={() => approve(u.id)}>
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={() => reject(u.id)}>
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      )}
                      {u.status === "rejected" && (
                        <button className="btn btn-success btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={() => approve(u.id)}>
                          <RotateCcw size={12} /> Re-approve
                        </button>
                      )}
                      {u.role === "manager" && u.status === "active" && (
                        <button className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={() => updateRole(u.id, "admin")} title="Promote to Admin">
                          <ArrowUp size={12} /> Make Admin
                        </button>
                      )}
                      {u.role === "admin" && u.id !== myId && (
                        <button className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={() => updateRole(u.id, "manager")} title="Demote to Manager">
                          <ArrowDown size={12} /> Make Manager
                        </button>
                      )}
                      {u.role !== "admin" && (
                        <button className="btn btn-danger btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={() => remove(u.id)}>
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <Users size={32} strokeWidth={1.2} color="var(--gray-300)" />
                      <p>No users found</p>
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

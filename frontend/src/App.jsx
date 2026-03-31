import { observer } from "mobx-react-lite";
import rootStore from "./stores/rootStore";
import AuthPanel from "./features/auth/ui/AuthPanel";
import DashboardPanel from "./features/dashboard/ui/DashboardPanel";
import ProductsPanel from "./features/products/ui/ProductsPanel";
import OrdersPanel from "./features/orders/ui/OrdersPanel";
import RestockPanel from "./features/restock/ui/RestockPanel";
import ActivityPanel from "./features/activity/ui/ActivityPanel";
import AdminPanel from "./features/admin/ui/AdminPanel";
import "./index.css";

const BASE_NAV = [
  { key: "dashboard", icon: "📊", label: "Dashboard" },
  { key: "products",  icon: "📦", label: "Products"  },
  { key: "orders",    icon: "🛒", label: "Orders"    },
  { key: "restock",   icon: "🔄", label: "Restock Queue" },
  { key: "activity",  icon: "🕐", label: "Activity Log"  },
];

const ADMIN_NAV = { key: "admin", icon: "🔑", label: "User Management" };

function App() {
  if (!rootStore.token) return <AuthPanel />;

  const user    = rootStore.user;
  const email   = user?.email || "";
  const name    = user?.name  || email;
  const initials = name.slice(0, 2).toUpperCase();
  const role    = user?.role || "manager";
  const isAdmin = rootStore.isAdmin;

  const nav = isAdmin ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          🏪 <span>Inventory OS</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map(({ key, icon, label }) => (
            <button
              key={key}
              className={`nav-item${rootStore.activeTab === key ? " active" : ""}`}
              onClick={() => rootStore.setTab(key)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <div className="user-email" style={{ fontWeight: 500 }}>{user?.name || email}</div>
              <div style={{ fontSize: 11, color: "var(--gray-400)" }}>{email}</div>
              <span className={`role-badge ${role}`}>{role}</span>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => rootStore.logout()}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <DashboardPanel active={rootStore.activeTab === "dashboard"} />
        <ProductsPanel  active={rootStore.activeTab === "products"} />
        <OrdersPanel    active={rootStore.activeTab === "orders"} />
        <RestockPanel   active={rootStore.activeTab === "restock"} />
        <ActivityPanel  active={rootStore.activeTab === "activity"} />
        {isAdmin && <AdminPanel active={rootStore.activeTab === "admin"} />}
      </main>
    </div>
  );
}

export default observer(App);

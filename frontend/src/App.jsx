import { observer } from "mobx-react-lite";
import rootStore from "./stores/rootStore";
import AuthPanel from "./features/auth/ui/AuthPanel";
import DashboardPanel from "./features/dashboard/ui/DashboardPanel";
import ProductsPanel from "./features/products/ui/ProductsPanel";
import OrdersPanel from "./features/orders/ui/OrdersPanel";
import RestockPanel from "./features/restock/ui/RestockPanel";
import ActivityPanel from "./features/activity/ui/ActivityPanel";
import "./index.css";

const NAV = [
  { key: "dashboard", icon: "📊", label: "Dashboard" },
  { key: "products",  icon: "📦", label: "Products" },
  { key: "orders",    icon: "🛒", label: "Orders" },
  { key: "restock",   icon: "🔄", label: "Restock Queue" },
  { key: "activity",  icon: "🕐", label: "Activity Log" },
];

function App() {
  if (!rootStore.token) return <AuthPanel />;

  const email = rootStore.user?.email || "";
  const initials = email.slice(0, 2).toUpperCase();
  const role = rootStore.user?.role || "manager";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          🏪 <span>Inventory OS</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ key, icon, label }) => (
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
              <div className="user-email">{email}</div>
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
      </main>
    </div>
  );
}

export default observer(App);

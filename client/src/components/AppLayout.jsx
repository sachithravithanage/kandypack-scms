import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  IconLayoutDashboard,
  IconUsers,
  IconBox,
  IconLogout,
  IconMenu2,
  IconSearch,
  IconBell,
  IconChartBar,
  IconCalendarEvent,
  IconTruck,
  IconTrain,
  IconBoxSeam,
  IconBuildingWarehouse,
  IconClipboardCheck,
  IconPackage,
  IconShoppingCart,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";
import logo from "../assets/logo.png";

export const roleNames = {
  1: "Administrator",
  2: "Dispatcher",
  3: "Regional Store Manager",
  4: "Driver",
  5: "Assistant",
  6: "Customer",
};

// Defined navigation links with strict role permissions
const navItems = [
  { to: "/dashboard", label: "Dashboard", Icon: IconLayoutDashboard, allowedRoles: [1, 2, 3] },
  { to: "/orders", label: "My Orders", Icon: IconPackage, allowedRoles: [1, 2, 6] },
  { to: "/orders/new", label: "Place Order", Icon: IconShoppingCart, allowedRoles: [1, 6] },
  { to: "/rail/schedules", label: "Train Schedules", Icon: IconTrain, allowedRoles: [1, 2, 3] },
  { to: "/rail/loading", label: "Train Loading", Icon: IconBoxSeam, allowedRoles: [1, 2] },
  { to: "/store/receipt", label: "Store Receipt", Icon: IconBuildingWarehouse, allowedRoles: [1, 3] },
  { to: "/store/dispatch", label: "Daily Dispatch", Icon: IconClipboardCheck, allowedRoles: [1, 3] },
  { to: "/roster", label: "Roster Schedule", Icon: IconCalendarEvent, allowedRoles: [1, 2] },
  { to: "/delivery", label: "Delivery Runs", Icon: IconTruck, allowedRoles: [1, 2, 3, 4, 5] },
  { to: "/admin/users", label: "Users", Icon: IconUsers, allowedRoles: [1] },
  { to: "/admin/inventory", label: "Inventory", Icon: IconBox, allowedRoles: [1, 3] },
  { to: "/reports", label: "Reports", Icon: IconChartBar, allowedRoles: [1, 2, 3] },
  { to: "/notifications", label: "Notifications", Icon: IconBell, allowedRoles: [1, 2, 3, 4, 5, 6] },
  { to: "/profile", label: "Profile", Icon: IconUser, allowedRoles: [1, 2, 3, 4, 5, 6] },
];

function AppLayout({ pageTitle, children }) {
  const [menuOpen, setMenuOpen]       = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const storedRoleId = Number(localStorage.getItem("roleId")) || 1;
  const storedRoleName = localStorage.getItem("roleName") || roleNames[storedRoleId] || "Staff";
  const storedName = localStorage.getItem("name") || "User";

  // Filter navigation items strictly by role permissions
  const visibleNavItems = navItems.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(storedRoleId)
  );
  // Poll unread notification count every 60 s
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    const fetchUnread = () => {
      axios
        .get(`http://localhost:5000/api/notifications/${userId}`)
        .then((res) => {
          const count = res.data.filter((n) => !n.is_read).length;
          setUnreadCount(count);
        })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    localStorage.removeItem("roleId");
    localStorage.removeItem("roleName");
    navigate("/");
  };

  const initials = storedName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="kp-shell">
      <aside className={`kp-sidebar ${menuOpen ? "kp-sidebar-open" : ""}`}>
        <div className="kp-sidebar-brand">
          <img src={logo} alt="Logo" style={{ width: "36px", height: "36px", borderRadius: "10px", objectFit: "cover" }} />
          <span>Kandypack</span>
        </div>
        <nav className="kp-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `kp-nav-item ${isActive ? "kp-nav-item-active" : ""}`
              }
              onClick={() => setMenuOpen(false)}
            >
              <item.Icon size={18} stroke={1.75} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="kp-nav-item kp-logout" onClick={handleLogout}>
          <IconLogout size={18} stroke={1.75} />
          <span>Log out</span>
        </button>
      </aside>

      {menuOpen && (
        <div
          className="kp-sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}

      <div className="kp-main">
        <header className="kp-topbar">
          <button
            className="kp-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu2 size={22} />
          </button>
          <h1>{pageTitle}</h1>
          <div className="kp-topbar-actions">
            <div className="kp-search">
              <IconSearch size={16} stroke={1.75} />
              <input type="text" placeholder="Search anything" />
            </div>
            <button
              onClick={() => navigate("/notifications")}
              style={{
                position: "relative",
                background: "none",
                border: "none",
                padding: "2px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Notifications"
            >
              <IconBell size={19} stroke={1.75} color="var(--color-text-muted)" />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "var(--color-danger-text)",
                    color: "#fff",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    borderRadius: "999px",
                    minWidth: "15px",
                    height: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <div className="d-flex align-items-center gap-2 ms-2">
              <div className="text-end d-none d-md-block">
                <div style={{ fontWeight: 600, fontSize: "0.85rem", lineHeight: 1.2 }}>
                  {storedName}
                </div>
                <div
                  className="badge bg-secondary-subtle text-secondary"
                  style={{ fontSize: "0.7rem", padding: "2px 6px" }}
                >
                  {storedRoleName}
                </div>
              </div>
              <div className="kp-avatar">{initials}</div>
            </div>
          </div>
        </header>
        <main className="kp-content">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;

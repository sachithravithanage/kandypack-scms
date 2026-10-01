import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  IconLayoutDashboard,
  IconUsers,
  IconBox,
  IconLogout,
  IconMenu2,
} from "@tabler/icons-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", Icon: IconLayoutDashboard },
  { to: "/admin/users", label: "Users", Icon: IconUsers },
  { to: "/admin/inventory", label: "Inventory", Icon: IconBox },
];

function AppLayout({ pageTitle, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    navigate("/");
  };

  const storedName = localStorage.getItem("name") || "User";
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
          <div className="kp-logo-mark">K</div>
          <span>Kandypack</span>
        </div>
        <nav className="kp-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
          <div className="kp-avatar">{initials}</div>
        </header>
        <main className="kp-content">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;

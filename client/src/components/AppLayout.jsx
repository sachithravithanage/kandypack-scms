import { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  IconUser,
  IconHistory,
  IconX,
} from "@tabler/icons-react";
import logo from "../assets/logo.png";
import { apiUrl } from "../api";

const roleNames = {
  1: "Administrator",
  2: "Dispatcher",
  3: "Regional Store Manager",
  4: "Driver",
  5: "Assistant",
  6: "Customer",
};

// Defined navigation links with strict role permissions
const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    Icon: IconLayoutDashboard,
    allowedRoles: [1, 2, 3, 4, 5, 6],
  },
  { to: "/admin/users", label: "Users", Icon: IconUsers, allowedRoles: [1] },
  {
    to: "/admin/inventory",
    label: "Inventory",
    Icon: IconBox,
    allowedRoles: [1],
  },
  {
    to: "/rail/schedules",
    label: "Train Schedules",
    Icon: IconTrain,
    allowedRoles: [1, 2, 3],
  },
  {
    to: "/admin/audit-logs",
    label: "Audit Logs",
    Icon: IconHistory,
    allowedRoles: [1],
  },
  {
    to: "/reports",
    label: "Reports",
    Icon: IconChartBar,
    allowedRoles: [1, 2, 3],
  },
  {
    to: "/rail/loading",
    label: "Train Loading",
    Icon: IconBoxSeam,
    allowedRoles: [2],
  },
  {
    to: "/roster",
    label: "Roster Schedule",
    Icon: IconCalendarEvent,
    allowedRoles: [2],
  },
  {
    to: "/store/receipt",
    label: "Store Receipt",
    Icon: IconBuildingWarehouse,
    allowedRoles: [3],
  },
  {
    to: "/store/dispatch",
    label: "Daily Dispatch",
    Icon: IconClipboardCheck,
    allowedRoles: [3],
  },
  {
    to: "/delivery",
    label: "Delivery Runs",
    Icon: IconTruck,
    allowedRoles: [4, 5],
  },
  {
    to: "/orders/new",
    label: "Place Order",
    Icon: IconShoppingCart,
    allowedRoles: [6],
  },
  {
    to: "/orders",
    label: "My Orders",
    Icon: IconPackage,
    allowedRoles: [6],
  },
  {
    to: "/notifications",
    label: "Notifications",
    Icon: IconBell,
    allowedRoles: [1, 2, 3, 4, 5, 6],
  },
  {
    to: "/profile",
    label: "Profile",
    Icon: IconUser,
    allowedRoles: [1, 2, 3, 4, 5, 6],
  },
];

function AppLayout({ pageTitle, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const urlSearchTerm = new URLSearchParams(location.search).get("search") || "";
  const [globalSearch, setGlobalSearch] = useState(urlSearchTerm);

  // Keep search box synchronized with URL changes (e.g., in-page filter changes or back/forward)
  useEffect(() => {
    setGlobalSearch(urlSearchTerm);
  }, [urlSearchTerm]);

  const storedRoleId = Number(localStorage.getItem("roleId")) || 1;
  const storedRoleName =
    localStorage.getItem("roleName") || roleNames[storedRoleId] || "Staff";
  const [currentUserName, setCurrentUserName] = useState(
    localStorage.getItem("name") || "User"
  );
  const [networkLive, setNetworkLive] = useState(true);
  const [latency, setLatency] = useState(null);
  const [checkingNetwork, setCheckingNetwork] = useState(false);

  const checkNetworkHealth = useCallback(async () => {
    setCheckingNetwork(true);
    const start = performance.now();
    try {
      const res = await axios.get(apiUrl("/api/health"), {
        timeout: 4000,
        headers: { "Cache-Control": "no-cache" },
      });
      const ms = Math.round(performance.now() - start);
      if (res.status === 200 && res.data?.status === "ok") {
        setNetworkLive(true);
        setLatency(ms);
      } else {
        setNetworkLive(false);
        setLatency(null);
      }
    } catch {
      setNetworkLive(false);
      setLatency(null);
    } finally {
      setCheckingNetwork(false);
    }
  }, []);

  useEffect(() => {
    checkNetworkHealth();
    const interval = setInterval(checkNetworkHealth, 30000);
    const handleOnline = () => checkNetworkHealth();
    const handleOffline = () => setNetworkLive(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkNetworkHealth]);

  // Synchronize user profile in real-time from backend & custom events
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios
      .get(apiUrl("/api/users/profile"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data?.name) {
          setCurrentUserName(res.data.name);
          localStorage.setItem("name", res.data.name);
        }
      })
      .catch(() => {});

    const syncUser = () => {
      const n = localStorage.getItem("name");
      if (n) setCurrentUserName(n);
    };
    window.addEventListener("user-updated", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const handleGlobalSearch = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const term = globalSearch.trim();
      const currentPath = location.pathname;

      const searchableRoutes = [
        "/orders",
        "/my-orders",
        "/admin/inventory",
        "/delivery",
        "/roster",
        "/store/receipt",
        "/store/dispatch",
        "/rail/schedules",
        "/admin/trains",
        "/rail/loading",
        "/admin/users",
        "/admin/audit-logs",
        "/reports",
      ];
      const isCurrentSearchable = searchableRoutes.some((r) =>
        currentPath.startsWith(r)
      );

      const targetPath = isCurrentSearchable
        ? currentPath
        : storedRoleId === 1
        ? "/admin/inventory"
        : storedRoleId === 2
        ? "/roster"
        : storedRoleId === 3
        ? "/store/receipt"
        : storedRoleId === 4 || storedRoleId === 5
        ? "/delivery"
        : "/orders";

      if (term) {
        navigate(`${targetPath}?search=${encodeURIComponent(term)}`);
      } else {
        navigate(targetPath);
      }
    }
  };

  // Filter navigation items strictly by role permissions
  const visibleNavItems = navItems.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(storedRoleId),
  );
  // Poll unread notification count every 60 s
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    const fetchUnread = () => {
      axios
        .get(apiUrl(`/api/notifications/${userId}`), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        })
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
    setMenuOpen(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      const token = localStorage.getItem("token");
      if (token) {
        axios
          .post(
            apiUrl("/api/auth/logout"),
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .catch(() => {});
      }
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("name");
      localStorage.removeItem("roleId");
      localStorage.removeItem("roleName");
      navigate("/", { replace: true });
    }
  };

  const initials = currentUserName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="kp-shell">
      <aside className={`kp-sidebar ${menuOpen ? "kp-sidebar-open" : ""}`}>
        <div className="kp-sidebar-brand">
          <img
            src={logo}
            alt="Logo"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              objectFit: "cover",
            }}
          />
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
          <div className="kp-topbar-left">
            <button
              className="kp-menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <IconMenu2 size={22} />
            </button>
            <div className="kp-breadcrumb">
              <span className="kp-breadcrumb-portal">Kandypack SCMS / {storedRoleName}</span>
              <h1 className="kp-page-title">{pageTitle}</h1>
            </div>
          </div>

          <div className="kp-topbar-actions">
            {/* Live Operational Status Pill - Dynamically functional */}
            <div
              className="d-none d-xl-flex align-items-center rounded-pill"
              style={{
                gap: "8px",
                padding: "4px 12px",
                background: networkLive ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                border: `1px solid ${networkLive ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.25)"}`,
                fontSize: "0.75rem",
                color: networkLive ? "#047857" : "#b91c1c",
                fontWeight: 600,
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.2s ease",
              }}
              onClick={checkNetworkHealth}
              title={
                checkingNetwork
                  ? "Checking central network status..."
                  : networkLive
                  ? `Rail & Fleet Network is online and operational${latency ? ` (${latency}ms latency)` : ""}. Click to re-ping.`
                  : "Central logistics server unreachable. Click to retry connection."
              }
            >
              <span
                className={networkLive && !checkingNetwork ? "kp-pulse-live" : ""}
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: networkLive ? "#10b981" : "#ef4444",
                  boxShadow: networkLive
                    ? "0 0 0 2px rgba(16, 185, 129, 0.25)"
                    : "0 0 0 2px rgba(239, 68, 68, 0.25)",
                  flexShrink: 0,
                  transition: "background 0.2s ease",
                }}
              />
              <span>
                {checkingNetwork
                  ? "Pinging Network..."
                  : networkLive
                  ? "Rail & Fleet Network Live"
                  : "Network Offline (Click to Retry)"}
              </span>
            </div>

            <div className="kp-search" style={{ position: "relative" }}>
              <IconSearch size={15} stroke={1.75} />
              <input
                type="text"
                placeholder="Search..."
                aria-label="Search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={handleGlobalSearch}
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearch("");
                    const nextParams = new URLSearchParams(location.search);
                    if (nextParams.has("search")) {
                      nextParams.delete("search");
                      const remaining = nextParams.toString();
                      navigate(remaining ? `${location.pathname}?${remaining}` : location.pathname);
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "0 2px",
                    cursor: "pointer",
                    color: "var(--color-text-muted)",
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label="Clear search"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => navigate("/notifications")}
              style={{
                position: "relative",
                background: "rgba(0,0,0,0.03)",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: "10px",
                width: "36px",
                height: "36px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              aria-label="Notifications"
            >
              <IconBell
                size={18}
                stroke={1.75}
                color="var(--color-text-muted)"
              />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-3px",
                    right: "-3px",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    borderRadius: "999px",
                    minWidth: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                    boxShadow: "0 2px 4px rgba(239, 68, 68, 0.4)",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <div
              className="d-flex align-items-center rounded-pill"
              style={{
                gap: "10px",
                padding: "4px 14px 4px 6px",
                background: "rgba(0,0,0,0.02)",
                border: "1px solid rgba(0,0,0,0.06)",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onClick={() => navigate("/profile")}
              title="View account profile"
            >
              <div
                className="kp-avatar"
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div className="text-start d-none d-md-block">
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    lineHeight: 1.25,
                    color: "#0f172a",
                  }}
                >
                  {currentUserName}
                </div>
                <div
                  className="badge bg-secondary-subtle text-secondary"
                  style={{ fontSize: "0.68rem", padding: "1px 6px", fontWeight: 500 }}
                >
                  {storedRoleName}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="kp-content">{children}</main>
      </div>

      {/* ── Custom Enterprise Logout Modal ───────────────────────── */}
      {showLogoutModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 1060,
          }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: "420px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-content shadow-lg border-0"
              style={{ borderRadius: "18px", overflow: "hidden" }}
            >
              <div className="p-4 text-center">
                <div
                  className="d-inline-flex align-items-center justify-content-center mb-3"
                  style={{
                    width: "58px",
                    height: "58px",
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.12)",
                    color: "#dc2626",
                  }}
                >
                  <IconLogout size={26} stroke={1.75} />
                </div>
                <h5 className="fw-bold mb-2 text-dark" style={{ letterSpacing: "-0.01em" }}>
                  Confirm Sign Out
                </h5>
                <p className="text-muted small mb-4" style={{ lineHeight: 1.5 }}>
                  Are you sure you want to log out of Kandypack SCMS? You will need to enter your credentials again to resume work.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-light border px-4 py-2 fw-medium"
                    style={{ borderRadius: "10px", minWidth: "110px" }}
                    onClick={() => setShowLogoutModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4 py-2 fw-medium d-inline-flex align-items-center gap-1.5"
                    style={{ borderRadius: "10px", background: "#dc2626", minWidth: "130px" }}
                    onClick={confirmLogout}
                  >
                    <IconLogout size={16} />
                    <span>Yes, Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppLayout;

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconPackage,
  IconTruck,
  IconAlertTriangle,
  IconCoin,
  IconTrain,
  IconClock,
  IconCheck,
  IconUser,
  IconBuildingWarehouse,
  IconCalendarEvent,
  IconArrowRight,
  IconShoppingCart,
  IconHistory,
  IconUsers,
  IconBox,
  IconClipboardCheck,
} from "@tabler/icons-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [salesData, setSalesData] = useState(null);
  const [truckData, setTruckData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const storedRoleId = Number(localStorage.getItem("roleId")) || 1;
  const [currentName, setCurrentName] = useState(
    localStorage.getItem("name") || "User"
  );
  const storedUserId = localStorage.getItem("userId");

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token || ""}` } }),
    [token]
  );

  // Sync currentName when user updates their profile
  useEffect(() => {
    const syncUser = () => {
      const n = localStorage.getItem("name");
      if (n) setCurrentName(n);
    };
    window.addEventListener("user-updated", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        // Fetch role-tailored dashboard stats
        const res = await axios.get(apiUrl("/api/users/dashboard-stats"), authHeader);
        if (isMounted) {
          setStats(res.data);
          if (res.data?.userName) {
            setCurrentName(res.data.userName);
            localStorage.setItem("name", res.data.userName);
          }
        }

        // Fetch notifications for top alert badge (non-blocking)
        if (storedUserId) {
          try {
            const notifRes = await axios.get(
              apiUrl(`/api/notifications/${storedUserId}`),
              authHeader
            );
            if (isMounted) {
              setRecentNotifs(notifRes.data?.slice(0, 5) || []);
            }
          } catch {
            // Non-blocking notification badge failure
          }
        }

        // If Admin (role 1) or Dispatcher (role 2), load chart data
        if (storedRoleId === 1 || storedRoleId === 2) {
          const now = new Date();
          const startDate = `${now.getFullYear()}-01-01`;
          const endDate = `${now.getFullYear()}-12-31`;

          try {
            const [salesRes, truckRes] = await Promise.all([
              axios.get(apiUrl("/api/reports/sales"), {
                params: { startDate, endDate },
              }),
              axios.get(apiUrl("/api/reports/truck-utilization")),
            ]);

            if (isMounted && salesRes.data?.length > 0) {
              setSalesData({
                labels: salesRes.data.map((d) => d.period || "Period"),
                datasets: [
                  {
                    label: "Revenue (LKR)",
                    data: salesRes.data.map((d) => Number(d.total_revenue) || 0),
                    backgroundColor: "rgba(16, 185, 129, 0.82)",
                    borderRadius: 4,
                  },
                ],
              });
            }

            if (isMounted && truckRes.data?.length > 0) {
              setTruckData({
                labels: truckRes.data.map((d) => d.plate_number),
                datasets: [
                  {
                    label: "Trips Assigned",
                    data: truckRes.data.map((d) => d.total_trips_assigned || 0),
                    backgroundColor: [
                      "#3b82f6",
                      "#10b981",
                      "#f59e0b",
                      "#ef4444",
                      "#8b5cf6",
                      "#06b6d4",
                    ],
                    borderWidth: 1,
                  },
                ],
              });
            }
          } catch {
            // Non-blocking report chart failures
          }
        }
      } catch (err) {
        if (isMounted && err.response?.status !== 401) {
          console.warn("Dashboard stats notice:", err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(() => loadData(true), 20000);
    const onFocus = () => loadData(true);
    window.addEventListener("focus", onFocus);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [authHeader, storedRoleId, storedUserId]);

  const unreadAlertsCount = recentNotifs.filter((n) => !n.is_read).length;

  return (
    <AppLayout pageTitle={`${getRoleTitle(storedRoleId)} Dashboard`}>
      {/* ── Enterprise Executive Welcome Banner ─────────────────── */}
      <div
        className="kp-card mb-4 p-4"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          color: "#ffffff",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 10px 30px -10px rgba(15, 23, 42, 0.35)",
        }}
      >
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <span
                style={{
                  background: "rgba(37, 99, 235, 0.2)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  letterSpacing: "0.4px",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  textTransform: "uppercase",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#60a5fa" }}></span>
                {storedRoleId === 1 ? "Executive Administrator Portal" : getRoleBadge(storedRoleId)}
              </span>

              <span
                className="d-none d-sm-inline-flex align-items-center gap-1.5"
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  padding: "3px 10px",
                  borderRadius: "20px",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }}></span>
                Central Hub &bull; Kandy HQ
              </span>
            </div>

            <h1 className="h4 fw-bold mb-1 text-white" style={{ letterSpacing: "-0.02em" }}>
              Welcome back, {currentName}!
            </h1>
            <p className="small mb-0" style={{ color: "#94a3b8", fontSize: "0.85rem", maxWidth: "680px" }}>
              {getRoleSubtitle(storedRoleId)}
            </p>
          </div>

          <div className="d-flex flex-column align-items-end gap-2">
            <div
              className="d-flex align-items-center gap-2 px-3 py-1.5 rounded-pill"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "0.8rem",
                color: "#cbd5e1",
              }}
            >
              <IconCalendarEvent size={15} color="#94a3b8" />
              <span>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            {storedRoleId === 1 && (
              <div className="d-flex align-items-center gap-2 mt-1">
                <Link
                  to="/reports"
                  className="btn btn-sm btn-outline-light d-inline-flex align-items-center gap-1.5"
                  style={{ fontSize: "0.76rem", padding: "4px 10px", borderColor: "rgba(255,255,255,0.2)" }}
                >
                  <IconCoin size={14} />
                  <span>Financials</span>
                </Link>
                <Link
                  to="/admin/users"
                  className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1.5"
                  style={{ fontSize: "0.76rem", padding: "4px 10px" }}
                >
                  <IconUsers size={14} />
                  <span>Manage Users</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger p-2.5 small mb-3">{error}</div>}

      {/* ══════════════════════════════════════════════════════════
          ROLE 1: ADMINISTRATOR DASHBOARD
      ══════════════════════════════════════════════════════════ */}
      {storedRoleId === 1 && (
        <>
          {/* Top Macro Metric Cards */}
          <div className="kp-stat-grid mb-4">
            <div className="kp-stat-card">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="kp-stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)" }}>
                  <IconCoin size={20} stroke={1.75} color="#059669" />
                </div>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#059669",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  Live Gross
                </span>
              </div>
              <p className="kp-stat-label">Annual Revenue (LKR)</p>
              <p className="kp-stat-value" style={{ fontVariantNumeric: "tabular-nums" }}>
                {loading
                  ? "…"
                  : Number(stats?.sales?.total_revenue || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Avg Order: LKR {Number(stats?.sales?.avg_order_value || 0).toFixed(2)}
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="kp-stat-icon" style={{ background: "rgba(37, 99, 235, 0.12)" }}>
                  <IconPackage size={20} stroke={1.75} color="#2563eb" />
                </div>
                <span
                  style={{
                    background: "rgba(37, 99, 235, 0.1)",
                    color: "#2563eb",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  {stats?.sales?.total_orders > 0
                    ? `${Math.round(((stats?.sales?.fulfilled_orders || 0) / stats.sales.total_orders) * 100)}% Fulfilled`
                    : "100% Fulfilled"}
                </span>
              </div>
              <p className="kp-stat-label">Orders Processed</p>
              <p className="kp-stat-value" style={{ fontVariantNumeric: "tabular-nums" }}>
                {loading ? "…" : stats?.sales?.total_orders ?? 0}
              </p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Across all retail distribution networks
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="kp-stat-icon" style={{ background: "rgba(99, 102, 241, 0.12)" }}>
                  <IconBox size={20} stroke={1.75} color="#4f46e5" />
                </div>
                <span
                  style={{
                    background: "rgba(99, 102, 241, 0.1)",
                    color: "#4f46e5",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  Central Hub
                </span>
              </div>
              <p className="kp-stat-label">HQ Inventory Asset Value</p>
              <p className="kp-stat-value" style={{ fontSize: "1.35rem", fontVariantNumeric: "tabular-nums" }}>
                {loading
                  ? "…"
                  : `LKR ${Number(stats?.inventory?.total_valuation || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
              </p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                {stats?.inventory?.total_skus ?? 0} SKUs &bull; {stats?.inventory?.total_atp ?? 0} units ATP
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="kp-stat-icon" style={{ background: "rgba(245, 158, 11, 0.12)" }}>
                  <IconTrain size={20} stroke={1.75} color="#d97706" />
                </div>
                <span
                  style={{
                    background: (stats?.rail?.in_transit_trips > 0) ? "rgba(37, 99, 235, 0.1)" : "rgba(245, 158, 11, 0.1)",
                    color: (stats?.rail?.in_transit_trips > 0) ? "#2563eb" : "#d97706",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  {stats?.rail?.in_transit_trips > 0 ? "Active In-Transit" : "On Schedule"}
                </span>
              </div>
              <p className="kp-stat-label">Rail Freight Trips</p>
              <p className="kp-stat-value" style={{ fontVariantNumeric: "tabular-nums" }}>
                {loading ? "…" : stats?.rail?.total_trips ?? 0}
              </p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                {stats?.rail?.in_transit_trips ?? 0} in transit &bull; {stats?.rail?.scheduled_trips ?? 0} scheduled
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div
                  className="kp-stat-icon"
                  style={{
                    background:
                      (stats?.inventory?.low_stock_count > 0 || stats?.inventory?.out_of_stock_count > 0)
                        ? "rgba(239, 68, 68, 0.12)"
                        : "rgba(16, 185, 129, 0.12)",
                  }}
                >
                  <IconAlertTriangle
                    size={20}
                    stroke={1.75}
                    color={(stats?.inventory?.low_stock_count > 0 || stats?.inventory?.out_of_stock_count > 0) ? "#dc2626" : "#059669"}
                  />
                </div>
                <span
                  style={{
                    background:
                      (stats?.inventory?.low_stock_count > 0 || stats?.inventory?.out_of_stock_count > 0)
                        ? "rgba(239, 68, 68, 0.1)"
                        : "rgba(16, 185, 129, 0.1)",
                    color:
                      (stats?.inventory?.low_stock_count > 0 || stats?.inventory?.out_of_stock_count > 0)
                        ? "#dc2626"
                        : "#059669",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  {(stats?.inventory?.low_stock_count > 0 || stats?.inventory?.out_of_stock_count > 0) ? "Action Needed" : "Optimal"}
                </span>
              </div>
              <p className="kp-stat-label">Stock Alerts (&lt; 100)</p>
              <p
                className="kp-stat-value"
                style={{
                  color: (stats?.inventory?.low_stock_count > 0 || stats?.inventory?.out_of_stock_count > 0) ? "#dc2626" : "inherit",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {loading ? "…" : stats?.inventory?.low_stock_count ?? 0}
              </p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                {stats?.inventory?.out_of_stock_count ?? 0} SKUs Out of Stock
              </span>
            </div>
          </div>

          {/* Charts Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div className="kp-card p-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h6 fw-bold mb-0">Monthly Sales Revenue Trends</h3>
                <Link to="/reports" className="small text-primary text-decoration-none">
                  Full Analytics &rarr;
                </Link>
              </div>
              {salesData ? (
                <Bar
                  data={salesData}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: "top" } },
                  }}
                />
              ) : (
                <p className="text-muted small py-4 text-center">Loading sales trend data...</p>
              )}
            </div>

            <div className="kp-card p-3 d-flex flex-column align-items-center">
              <div className="w-100 d-flex justify-content-between align-items-center mb-3">
                <h3 className="h6 fw-bold mb-0">Delivery Fleet Utilization</h3>
                <Link to="/reports" className="small text-primary text-decoration-none">
                  Fleet Report &rarr;
                </Link>
              </div>
              <div style={{ width: "280px", height: "280px" }}>
                {truckData ? (
                  <Pie
                    data={truckData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                ) : (
                  <p className="text-muted small py-4 text-center">Loading fleet utilization data...</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Shortcuts & Recent Audit Log Stream */}
          <div className="row g-3 mb-4">
            <div className="col-lg-4">
              <div className="kp-card h-100 p-3">
                <h3 className="h6 fw-bold mb-3">Admin Quick Operations</h3>
                <div className="d-flex flex-column gap-2">
                  <Link
                    to="/admin/inventory"
                    className="btn btn-sm btn-light border d-flex align-items-center justify-content-between text-start p-2.5"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconBox size={16} className="text-primary" />
                      <span>HQ Central Inventory Control</span>
                    </span>
                    <IconArrowRight size={14} className="text-muted" />
                  </Link>

                  <Link
                    to="/admin/users"
                    className="btn btn-sm btn-light border d-flex align-items-center justify-content-between text-start p-2.5"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconUsers size={16} className="text-success" />
                      <span>Manage System Users & Staff</span>
                    </span>
                    <IconArrowRight size={14} className="text-muted" />
                  </Link>

                  <Link
                    to="/admin/audit-logs"
                    className="btn btn-sm btn-light border d-flex align-items-center justify-content-between text-start p-2.5"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconHistory size={16} className="text-warning" />
                      <span>Security & Audit Log Stream</span>
                    </span>
                    <IconArrowRight size={14} className="text-muted" />
                  </Link>

                  <Link
                    to="/reports"
                    className="btn btn-sm btn-light border d-flex align-items-center justify-content-between text-start p-2.5"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconCoin size={16} className="text-info" />
                      <span>Generate Financial Reports</span>
                    </span>
                    <IconArrowRight size={14} className="text-muted" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="kp-card h-100 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 fw-bold mb-0">Live Audit Activity Stream</h3>
                  <Link to="/admin/audit-logs" className="small text-primary text-decoration-none">
                    View All Logs &rarr;
                  </Link>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle small mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.recentAudit?.length > 0 ? (
                        stats.recentAudit.map((a) => (
                          <tr key={a.log_id}>
                            <td className="text-muted font-monospace" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                              {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="fw-medium">{a.user_name || "Admin"}</td>
                            <td>
                              <span className="kp-badge kp-badge-info">{a.action}</span>
                            </td>
                            <td className="text-secondary text-truncate" style={{ maxWidth: "260px" }}>
                              {a.details}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-3 text-muted">
                            No recent audit entries found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          ROLE 2: DISPATCHER DASHBOARD
      ══════════════════════════════════════════════════════════ */}
      {storedRoleId === 2 && (
        <>
          <div className="kp-stat-grid mb-4">
            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(245, 158, 11, 0.12)" }}>
                <IconTrain size={22} stroke={1.75} color="#d97706" />
              </div>
              <p className="kp-stat-label">Upcoming Train Departures</p>
              <p className="kp-stat-value">{stats?.todayTrips?.length ?? 0}</p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Scheduled rail trips from Kandy HQ
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(37, 99, 235, 0.12)" }}>
                <IconPackage size={22} stroke={1.75} color="#2563eb" />
              </div>
              <p className="kp-stat-label">Orders Awaiting Allocation</p>
              <p className="kp-stat-value">{stats?.orderQueue?.orders_in_queue ?? 0}</p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Total Volume: {Number(stats?.orderQueue?.volume_in_queue || 0).toFixed(2)} m³
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)" }}>
                <IconTruck size={22} stroke={1.75} color="#059669" />
              </div>
              <p className="kp-stat-label">Weekly Truck Rosters</p>
              <p className="kp-stat-value">{stats?.rosterSummary?.week_schedules ?? 0}</p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                {stats?.rosterSummary?.today_schedules ?? 0} scheduled today &bull; {stats?.rosterSummary?.in_progress_runs ?? 0} in progress
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(239, 68, 68, 0.12)" }}>
                <IconAlertTriangle size={22} stroke={1.75} color="#dc2626" />
              </div>
              <p className="kp-stat-label">Unread Operational Alerts</p>
              <p className="kp-stat-value" style={{ color: unreadAlertsCount > 0 ? "#dc2626" : "inherit" }}>
                {unreadAlertsCount}
              </p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Notifications requiring attention
              </span>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-lg-8">
              <div className="kp-card h-100 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 fw-bold mb-0">Train Departures & Cargo Loading Status</h3>
                  <Link to="/rail/loading" className="small text-primary text-decoration-none">
                    Loading Portal &rarr;
                  </Link>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle small mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Trip #</th>
                        <th>Train</th>
                        <th>Destination</th>
                        <th>Departure</th>
                        <th>Allocations</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.todayTrips?.length > 0 ? (
                        stats.todayTrips.map((t) => (
                          <tr key={t.trip_id}>
                            <td className="font-monospace fw-bold">#{t.trip_id}</td>
                            <td>{t.train_name}</td>
                            <td>{t.destination}</td>
                            <td>
                              {new Date(t.departure_datetime).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td>
                              <span className="badge bg-success-subtle text-success me-1">
                                {t.loaded_allocations} Loaded
                              </span>
                              <span className="badge bg-warning-subtle text-warning text-dark me-1">
                                {t.partial_allocations} Partial
                              </span>
                              <span className="badge bg-secondary-subtle text-secondary">
                                {t.pending_allocations} Pending
                              </span>
                            </td>
                            <td>
                              <span className="kp-badge kp-badge-info">{t.status}</span>
                            </td>
                            <td>
                              <Link to="/rail/loading" className="btn btn-sm btn-outline-primary py-0 px-2">
                                Manifest
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted">
                            No train departures scheduled today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="kp-card h-100 p-3">
                <h3 className="h6 fw-bold mb-3">Dispatcher Portals</h3>
                <div className="d-flex flex-column gap-2">
                  <Link
                    to="/rail/schedules"
                    className="btn btn-sm btn-light border d-flex align-items-center justify-content-between text-start p-2.5"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconTrain size={16} className="text-warning" />
                      <span>Rail Schedules & Allocation</span>
                    </span>
                    <IconArrowRight size={14} className="text-muted" />
                  </Link>

                  <Link
                    to="/rail/loading"
                    className="btn btn-sm btn-light border d-flex align-items-center justify-content-between text-start p-2.5"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconClipboardCheck size={16} className="text-primary" />
                      <span>Train Loading Manifest</span>
                    </span>
                    <IconArrowRight size={14} className="text-muted" />
                  </Link>

                  <Link
                    to="/roster"
                    className="btn btn-sm btn-light border d-flex align-items-center justify-content-between text-start p-2.5"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconCalendarEvent size={16} className="text-success" />
                      <span>Weekly Fleet Rostering</span>
                    </span>
                    <IconArrowRight size={14} className="text-muted" />
                  </Link>

                  <Link
                    to="/reports"
                    className="btn btn-sm btn-light border d-flex align-items-center justify-content-between text-start p-2.5"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconPackage size={16} className="text-info" />
                      <span>Operational Reports</span>
                    </span>
                    <IconArrowRight size={14} className="text-muted" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          ROLE 3: REGIONAL STORE MANAGER DASHBOARD
      ══════════════════════════════════════════════════════════ */}
      {storedRoleId === 3 && (
        <>
          <div className="kp-stat-grid mb-4">
            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(245, 158, 11, 0.12)" }}>
                <IconTrain size={22} stroke={1.75} color="#d97706" />
              </div>
              <p className="kp-stat-label">Incoming Rail Shipments</p>
              <p className="kp-stat-value">{stats?.incomingTrips?.length ?? 0}</p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Trains arriving with store cargo
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(239, 68, 68, 0.12)" }}>
                <IconAlertTriangle size={22} stroke={1.75} color="#dc2626" />
              </div>
              <p className="kp-stat-label">Discrepancy Flags</p>
              <p className="kp-stat-value" style={{ color: stats?.discrepancies > 0 ? "#dc2626" : "inherit" }}>
                {stats?.discrepancies ?? 0}
              </p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Damaged / missing cargo reconciliation
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)" }}>
                <IconTruck size={22} stroke={1.75} color="#059669" />
              </div>
              <p className="kp-stat-label">Today's Store Dispatches</p>
              <p className="kp-stat-value">{stats?.todayRuns?.length ?? 0}</p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Last-mile truck runs scheduled today
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(37, 99, 235, 0.12)" }}>
                <IconBuildingWarehouse size={22} stroke={1.75} color="#2563eb" />
              </div>
              <p className="kp-stat-label">Store Inventory Status</p>
              <p className="kp-stat-value">Active</p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Regional warehouse ledger reconciled
              </span>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-lg-7">
              <div className="kp-card h-100 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 fw-bold mb-0">Expected Train Shipments</h3>
                  <Link to="/store/receipt" className="small text-primary text-decoration-none">
                    Receive Shipments &rarr;
                  </Link>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle small mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Trip #</th>
                        <th>Train</th>
                        <th>Expected Arrival</th>
                        <th>Cargo Items</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.incomingTrips?.length > 0 ? (
                        stats.incomingTrips.map((t) => (
                          <tr key={t.trip_id}>
                            <td className="fw-bold font-monospace">#{t.trip_id}</td>
                            <td>{t.train_name}</td>
                            <td>
                              {new Date(t.arrival_datetime).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td>
                              <span className="badge bg-primary-subtle text-primary">
                                {t.cargo_items} items
                              </span>
                              {t.discrepancy_count > 0 && (
                                <span className="badge bg-danger-subtle text-danger ms-1">
                                  {t.discrepancy_count} Discrepancy
                                </span>
                              )}
                            </td>
                            <td>
                              <Link to="/store/receipt" className="btn btn-sm btn-outline-success py-0 px-2">
                                Inspect & Receive
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-muted">
                            No incoming shipments recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="kp-card h-100 p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 fw-bold mb-0">Today's Last-Mile Delivery Runs</h3>
                  <Link to="/store/dispatch" className="small text-primary text-decoration-none">
                    Daily Dispatch &rarr;
                  </Link>
                </div>

                {stats?.todayRuns?.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {stats.todayRuns.map((r) => (
                      <div key={r.truck_schedule_id} className="p-2.5 rounded border bg-light d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold small">{r.route_name}</div>
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            Truck: {r.plate_number} &bull; Driver: {r.driver_name}
                          </div>
                        </div>
                        <div className="text-end">
                          <span className="badge bg-info-subtle text-info d-block mb-1">
                            {r.assigned_orders} Orders
                          </span>
                          <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                            {r.start_time?.slice(0, 5)} - {r.end_time?.slice(0, 5)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small py-4 text-center">
                    No truck runs dispatched from this regional hub today.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          ROLE 4 & 5: DRIVER & ASSISTANT DASHBOARD
      ══════════════════════════════════════════════════════════ */}
      {(storedRoleId === 4 || storedRoleId === 5) && (
        <>
          <div className="kp-stat-grid mb-4">
            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(37, 99, 235, 0.12)" }}>
                <IconClock size={22} stroke={1.75} color="#2563eb" />
              </div>
              <p className="kp-stat-label">Statutory Weekly Hours</p>
              <p className="kp-stat-value">
                {stats?.weeklyHours ?? 0} / {stats?.maxWeeklyHours ?? (storedRoleId === 4 ? 40 : 60)} hrs
              </p>
              {/* Statutory Progress bar */}
              <div className="progress mt-2" style={{ height: "6px" }}>
                <div
                  className={`progress-bar ${
                    (stats?.weeklyHours ?? 0) > (stats?.maxWeeklyHours ?? 40) * 0.9
                      ? "bg-danger"
                      : (stats?.weeklyHours ?? 0) > (stats?.maxWeeklyHours ?? 40) * 0.75
                      ? "bg-warning"
                      : "bg-success"
                  }`}
                  role="progressbar"
                  style={{
                    width: `${Math.min(
                      100,
                      ((stats?.weeklyHours ?? 0) / (stats?.maxWeeklyHours ?? (storedRoleId === 4 ? 40 : 60))) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-muted small mt-1 d-block" style={{ fontSize: "0.74rem" }}>
                Statutory cap: {stats?.maxWeeklyHours} hours/week
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)" }}>
                <IconTruck size={22} stroke={1.75} color="#059669" />
              </div>
              <p className="kp-stat-label">Upcoming Scheduled Runs</p>
              <p className="kp-stat-value">{stats?.assignedRuns?.length ?? 0}</p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Assigned delivery itineraries
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(99, 102, 241, 0.12)" }}>
                <IconCheck size={22} stroke={1.75} color="#4f46e5" />
              </div>
              <p className="kp-stat-label">Completed Runs This Month</p>
              <p className="kp-stat-value">{stats?.completedMonth ?? 0}</p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Successfully finalized deliveries
              </span>
            </div>
          </div>

          <div className="kp-card p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="h6 fw-bold mb-0">Your Assigned Delivery Runs</h3>
              <Link to="/delivery" className="btn btn-sm btn-primary">
                Open Field Delivery Portal &rarr;
              </Link>
            </div>

            {stats?.assignedRuns?.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {stats.assignedRuns.map((run) => (
                  <div
                    key={run.truck_schedule_id}
                    className="p-3 rounded border bg-light d-flex flex-wrap justify-content-between align-items-center gap-3"
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="badge bg-primary px-2">{run.plate_number}</span>
                        <span className="fw-bold">{run.route_name}</span>
                        <span className="kp-badge kp-badge-info">{run.status}</span>
                      </div>
                      <div className="text-muted small">
                        {storedRoleId === 4 ? (
                          <>Assistant: <strong>{run.assistant_name}</strong></>
                        ) : (
                          <>Driver: <strong>{run.driver_name}</strong></>
                        )}
                        <span> &bull; Scheduled: {run.scheduled_date} ({run.start_time?.slice(0, 5)} - {run.end_time?.slice(0, 5)})</span>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                      <div className="text-end">
                        <div className="small fw-semibold">
                          {run.delivered_stops} / {run.total_stops} Stops Completed
                        </div>
                        <div className="progress mt-1" style={{ width: "120px", height: "5px" }}>
                          <div
                            className="progress-bar bg-success"
                            style={{
                              width: `${run.total_stops > 0 ? (run.delivered_stops / run.total_stops) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>

                      <Link
                        to="/delivery"
                        className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                      >
                        <span>Start Run</span>
                        <IconArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <IconTruck size={36} className="mb-2 text-secondary" />
                <p className="mb-1 fw-medium">No active runs assigned for today.</p>
                <p className="small text-muted">Check back when the Dispatcher finalizes the weekly roster schedule.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          ROLE 6: CUSTOMER DASHBOARD
      ══════════════════════════════════════════════════════════ */}
      {storedRoleId === 6 && (
        <>
          <div className="kp-stat-grid mb-4">
            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)" }}>
                <IconCoin size={22} stroke={1.75} color="#059669" />
              </div>
              <p className="kp-stat-label">Total Spend (LKR)</p>
              <p className="kp-stat-value">
                {Number(stats?.totals?.total_spend || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Lifetime purchases with Kandypack
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(37, 99, 235, 0.12)" }}>
                <IconPackage size={22} stroke={1.75} color="#2563eb" />
              </div>
              <p className="kp-stat-label">Total Orders Placed</p>
              <p className="kp-stat-value">{stats?.totals?.total_orders ?? 0}</p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Processed wholesale orders
              </span>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "rgba(245, 158, 11, 0.12)" }}>
                <IconClock size={22} stroke={1.75} color="#d97706" />
              </div>
              <p className="kp-stat-label">Active In-Flight Deliveries</p>
              <p className="kp-stat-value">{stats?.totals?.active_orders ?? 0}</p>
              <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
                Orders currently in transit
              </span>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-lg-8">
              <div className="kp-card h-100 p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 fw-bold mb-0">Active Orders & Delivery Tracking</h3>
                  <Link to="/orders" className="small text-primary text-decoration-none">
                    View All Orders &rarr;
                  </Link>
                </div>

                {stats?.activeOrders?.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {stats.activeOrders.map((ord) => (
                      <div key={ord.order_id} className="p-3 rounded border bg-light">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold">Order #{ord.order_id}</span>
                          <span className="badge bg-primary px-2 py-1">{ord.status}</span>
                        </div>

                        {/* Visual 5-Stage Stepper */}
                        <div className="d-flex align-items-center justify-content-between position-relative my-3 px-2">
                          {["Placed", "Scheduled", "In Transit", "Delivered", "Closed"].map((stage, idx) => {
                            const stages = ["Placed", "Scheduled", "In Transit", "Delivered", "Closed"];
                            const currentIdx = stages.indexOf(ord.status);
                            const isDone = currentIdx >= idx;
                            return (
                              <div key={stage} className="text-center" style={{ zIndex: 2 }}>
                                <div
                                  className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${
                                    isDone ? "bg-success text-white" : "bg-white border text-muted"
                                  }`}
                                  style={{ width: "24px", height: "24px", fontSize: "0.7rem" }}
                                >
                                  {isDone ? "✓" : idx + 1}
                                </div>
                                <div style={{ fontSize: "0.68rem", color: isDone ? "#059669" : "#64748b" }}>
                                  {stage}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="d-flex justify-content-between align-items-center small text-muted border-top pt-2">
                          <span>
                            Delivery to: <strong>{ord.stop_name || ord.route_name || ord.delivery_address}</strong>
                          </span>
                          <span className="font-monospace fw-semibold text-dark">
                            LKR {Number(ord.total_value).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <IconPackage size={36} className="mb-2 text-secondary" />
                    <p className="mb-2 fw-medium">No active orders in progress right now.</p>
                    <Link to="/orders/new" className="btn btn-sm btn-primary">
                      Place a New Order
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="col-lg-4">
              <div className="kp-card h-100 p-4">
                <h3 className="h6 fw-bold mb-3">Quick Shortcuts</h3>
                <div className="d-flex flex-column gap-2 mb-4">
                  <Link
                    to="/orders/new"
                    className="btn btn-primary d-flex align-items-center justify-content-between p-2.5 shadow-sm"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconShoppingCart size={18} />
                      <span>Place New Order</span>
                    </span>
                    <IconArrowRight size={16} />
                  </Link>

                  <Link
                    to="/orders"
                    className="btn btn-light border d-flex align-items-center justify-content-between p-2.5"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconPackage size={18} className="text-primary" />
                      <span>My Order History</span>
                    </span>
                    <IconArrowRight size={14} className="text-muted" />
                  </Link>

                  <Link
                    to="/profile"
                    className="btn btn-light border d-flex align-items-center justify-content-between p-2.5"
                  >
                    <span className="d-flex align-items-center gap-2">
                      <IconUser size={18} className="text-secondary" />
                      <span>Delivery Address & Settings</span>
                    </span>
                    <IconArrowRight size={14} className="text-muted" />
                  </Link>
                </div>

                <div className="p-3 rounded border bg-light small">
                  <div className="fw-semibold mb-1 text-dark">7-Day Advance Order Rule</div>
                  <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                    Remember to schedule delivery requests at least 7 days in advance to allow rail freight batching and truck assignment.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Recent Notifications for all roles ───────────────── */}
      <div className="kp-card p-3 mb-2">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="h6 fw-bold mb-0">Recent Alerts & Notifications</h3>
          <Link to="/notifications" className="small text-primary text-decoration-none">
            Notification Center &rarr;
          </Link>
        </div>

        {recentNotifs.length === 0 ? (
          <p className="text-muted small mb-0 py-2">No notifications yet.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {recentNotifs.map((n) => (
              <div
                key={n.notification_id}
                className="d-flex justify-content-between align-items-center p-2.5 rounded border small"
                style={{
                  background: n.is_read ? "transparent" : "rgba(37, 99, 235, 0.04)",
                  borderColor: n.is_read ? "#e2e8f0" : "rgba(37, 99, 235, 0.2)",
                }}
              >
                <span>{n.message}</span>
                <span className={`kp-badge ${n.is_read ? "kp-badge-success" : "kp-badge-info"}`}>
                  {n.is_read ? "Read" : "New"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ── Helpers ──────────────────────────────────────────────────
function getRoleTitle(roleId) {
  switch (roleId) {
    case 1:
      return "Administrator";
    case 2:
      return "Dispatcher";
    case 3:
      return "Store Manager";
    case 4:
      return "Driver";
    case 5:
      return "Assistant";
    case 6:
      return "Customer";
    default:
      return "Staff";
  }
}

function getRoleBadge(roleId) {
  switch (roleId) {
    case 1:
      return "👑 System Administrator";
    case 2:
      return "📋 Rail & Road Dispatcher";
    case 3:
      return "🏬 Regional Store Manager";
    case 4:
      return "🚚 Commercial Driver";
    case 5:
      return "🤝 Delivery Assistant";
    case 6:
      return "🛒 Retail Customer";
    default:
      return "Operations Staff";
  }
}

function getRoleSubtitle(roleId) {
  switch (roleId) {
    case 1:
      return "Macro logistics financials, inventory valuation, fleet distribution, and live audit telemetry.";
    case 2:
      return "Monitor daily rail cargo loading manifests, unallocated order volume, and weekly fleet rosters.";
    case 3:
      return "Receive incoming rail cargo, reconcile discrepancy claims, and dispatch daily retail delivery runs.";
    case 4:
      return "Execute your assigned delivery runs, track route stops, and review statutory driving hour compliance.";
    case 5:
      return "Track cargo unloading manifests per delivery stop, driver partner assignments, and weekly duty hours.";
    case 6:
      return "Track your active orders through the 5-stage pipeline, place replenishment requests, and manage deliveries.";
    default:
      return "Kandypack Central Distribution Operations Hub.";
  }
}

export default Dashboard;

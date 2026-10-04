import { useState, useEffect } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { IconPackage, IconTruck, IconAlertTriangle } from "@tabler/icons-react";

function Dashboard() {
  const [totalOrders, setTotalOrders]   = useState("—");
  const [inTransit, setInTransit]       = useState("—");
  const [openAlerts, setOpenAlerts]     = useState("—");
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [loading, setLoading]           = useState(true);

  const token  = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const authH  = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const now      = new Date();
    const startDate = `${now.getFullYear()}-01-01`;
    const endDate   = `${now.getFullYear()}-12-31`;

    // 1. Total orders from sales report
    axios
      .get("http://localhost:5000/api/reports/sales", {
        ...authH,
        params: { startDate, endDate },
      })
      .then((res) => {
        const total = res.data.reduce((sum, r) => sum + (r.total_orders || 0), 0);
        setTotalOrders(total);
      })
      .catch(() => {});

    // 2. In-transit: count truck schedules from utilization report
    axios
      .get("http://localhost:5000/api/reports/truck-utilization", authH)
      .then((res) => {
        const trips = res.data.reduce(
          (sum, t) => sum + (t.total_trips_assigned || 0), 0
        );
        setInTransit(trips);
      })
      .catch(() => {});

    // 3. Unread notifications as open alerts
    if (userId) {
      axios
        .get(`http://localhost:5000/api/notifications/${userId}`)
        .then((res) => {
          const unread = res.data.filter((n) => !n.is_read);
          setOpenAlerts(unread.length);
          setRecentNotifs(res.data.slice(0, 4));   // show latest 4
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AppLayout pageTitle="Dashboard">
      {/* ── Stat cards ───────────────────────────────────── */}
      <div className="kp-stat-grid">
        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-info-bg)" }}>
            <IconPackage size={20} stroke={1.75} color="var(--color-info-text)" />
          </div>
          <p className="kp-stat-label">Total orders this year</p>
          <p className="kp-stat-value">{loading ? "…" : totalOrders}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-warning-bg)" }}>
            <IconTruck size={20} stroke={1.75} color="var(--color-warning-text)" />
          </div>
          <p className="kp-stat-label">Truck trips assigned</p>
          <p className="kp-stat-value">{loading ? "…" : inTransit}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-danger-bg)" }}>
            <IconAlertTriangle size={20} stroke={1.75} color="var(--color-danger-text)" />
          </div>
          <p className="kp-stat-label">Unread alerts</p>
          <p className="kp-stat-value">{loading ? "…" : openAlerts}</p>
        </div>
      </div>

      {/* ── Recent notifications preview ─────────────────── */}
      <div className="kp-card">
        <p style={{ fontWeight: 600, marginBottom: "0.9rem", marginTop: 0 }}>
          Recent Notifications
        </p>
        {loading ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", margin: 0 }}>
            Loading…
          </p>
        ) : recentNotifs.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", margin: 0 }}>
            No notifications yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentNotifs.map((n) => (
              <div
                key={n.notification_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  background: n.is_read ? "transparent" : "var(--color-info-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <span style={{ fontSize: "0.875rem" }}>{n.message}</span>
                <span
                  className={`kp-badge ${n.is_read ? "kp-badge-success" : "kp-badge-info"}`}
                >
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

export default Dashboard;


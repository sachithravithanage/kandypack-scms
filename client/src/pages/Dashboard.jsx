import { useState, useEffect } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { IconPackage, IconTruck, IconAlertTriangle, IconCoin } from "@tabler/icons-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function Dashboard() {
  const [totalOrders, setTotalOrders]   = useState("—");
  const [totalRevenue, setTotalRevenue] = useState("—");
  const [inTransit, setInTransit]       = useState("—");
  const [openAlerts, setOpenAlerts]     = useState("—");
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [loading, setLoading]           = useState(true);
  
  // Chart Data State
  const [salesData, setSalesData]       = useState(null);
  const [truckData, setTruckData]       = useState(null);

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
        const totalOrd = res.data.reduce((sum, r) => sum + (r.total_orders || 0), 0);
        const totalRev = res.data.reduce((sum, r) => sum + (Number(r.total_revenue) || 0), 0);
        setTotalOrders(totalOrd);
        setTotalRevenue(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(totalRev));
        
        // Setup Sales Bar Chart
        if (res.data.length > 0) {
           setSalesData({
             labels: res.data.map(d => d.period || "Period"),
             datasets: [{
               label: "Total Revenue",
               data: res.data.map(d => d.total_revenue),
               backgroundColor: "rgba(16, 185, 129, 0.8)", // Emerald 500 for money
               borderRadius: 4
             }]
           });
        }
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
        
        // Setup Truck Utilization Pie Chart
        if (res.data.length > 0) {
           setTruckData({
             labels: res.data.map(d => d.plate_number),
             datasets: [{
               label: "Trips Assigned",
               data: res.data.map(d => d.total_trips_assigned),
               backgroundColor: [
                 "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"
               ],
               borderWidth: 1
             }]
           });
        }
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
          <div className="kp-stat-icon" style={{ background: "var(--color-success-bg)" }}>
            <IconCoin size={20} stroke={1.75} color="var(--color-success-text)" />
          </div>
          <p className="kp-stat-label">Total Revenue this year</p>
          <p className="kp-stat-value">{loading ? "…" : totalRevenue}</p>
        </div>

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

      {/* ── Charts Section ───────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="kp-card" style={{ padding: "1.5rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "1rem", marginTop: 0 }}>Sales Trends</p>
          {salesData ? (
             <Bar data={salesData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          ) : (
             <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>No sales data available.</p>
          )}
        </div>
        <div className="kp-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <p style={{ fontWeight: 600, marginBottom: "1rem", marginTop: 0, alignSelf: "flex-start" }}>Truck Utilization</p>
          <div style={{ width: "300px", height: "300px" }}>
            {truckData ? (
               <Pie data={truckData} options={{ responsive: true, maintainAspectRatio: false }} />
            ) : (
               <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>No utilization data available.</p>
            )}
          </div>
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


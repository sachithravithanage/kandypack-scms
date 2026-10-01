import AppLayout from "../components/AppLayout";

function Dashboard() {
  return (
    <AppLayout pageTitle="Dashboard">
      <div className="kp-stat-grid">
        <div className="kp-stat-card">
          <p className="kp-stat-label">Active orders</p>
          <p className="kp-stat-value">—</p>
        </div>
        <div className="kp-stat-card">
          <p className="kp-stat-label">In transit</p>
          <p className="kp-stat-value">—</p>
        </div>
        <div className="kp-stat-card">
          <p className="kp-stat-label">Open alerts</p>
          <p className="kp-stat-value">—</p>
        </div>
      </div>
      <div className="kp-card">
        <p className="text-muted" style={{ fontSize: "0.9rem", margin: 0 }}>
          Real numbers will appear here once the Orders and Reporting APIs are
          connected.
        </p>
      </div>
    </AppLayout>
  );
}

export default Dashboard;

import AppLayout from "../components/AppLayout";
import { IconPackage, IconTruck, IconAlertTriangle } from "@tabler/icons-react";

function Dashboard() {
  return (
    <AppLayout pageTitle="Dashboard">
      <div className="kp-stat-grid">
        <div className="kp-stat-card">
          <div
            className="kp-stat-icon"
            style={{ background: "var(--color-info-bg)" }}
          >
            <IconPackage
              size={20}
              stroke={1.75}
              color="var(--color-info-text)"
            />
          </div>
          <p className="kp-stat-label">Active orders</p>
          <p className="kp-stat-value">—</p>
        </div>
        <div className="kp-stat-card">
          <div
            className="kp-stat-icon"
            style={{ background: "var(--color-warning-bg)" }}
          >
            <IconTruck
              size={20}
              stroke={1.75}
              color="var(--color-warning-text)"
            />
          </div>
          <p className="kp-stat-label">In transit</p>
          <p className="kp-stat-value">—</p>
        </div>
        <div className="kp-stat-card">
          <div
            className="kp-stat-icon"
            style={{ background: "var(--color-danger-bg)" }}
          >
            <IconAlertTriangle
              size={20}
              stroke={1.75}
              color="var(--color-danger-text)"
            />
          </div>
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

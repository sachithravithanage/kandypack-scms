import { Navigate, useNavigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import { IconShieldLock, IconArrowLeft } from "@tabler/icons-react";

export default function ProtectedRoute({ allowedRoles, children }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const roleId = Number(localStorage.getItem("roleId")) || 0;

  // Not logged in -> Redirect to login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // If role is restricted
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(roleId)) {
    const roleName = localStorage.getItem("roleName") || "Your Role";
    return (
      <AppLayout pageTitle="Access Restricted">
        <div className="kp-card text-center py-5 my-4" style={{ maxWidth: 580, margin: "0 auto" }}>
          <div
            className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
            style={{ width: 64, height: 64, background: "var(--color-danger-bg)", color: "var(--color-danger-text)" }}
          >
            <IconShieldLock size={32} />
          </div>
          <h2 className="h4 mb-2">Access Restricted</h2>
          <p className="text-muted mb-4 small">
            Your current account (<strong>{roleName}</strong>) is not permitted to access this module.
            Please navigate to your permitted dashboard or contact your system administrator for permissions.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button
              className="btn btn-primary btn-sm px-4 fw-bold"
              onClick={() => {
                if (roleId === 4 || roleId === 5) {
                  navigate("/delivery", { replace: true });
                } else if (roleId === 2) {
                  navigate("/roster", { replace: true });
                } else if (roleId === 3) {
                  navigate("/store/receipt", { replace: true });
                } else if (roleId === 6) {
                  navigate("/orders", { replace: true });
                } else {
                  navigate("/dashboard", { replace: true });
                }
              }}
            >
              <IconArrowLeft size={16} className="me-1" />
              Go to Your Permitted Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return children;
}

import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconBell,
  IconCheck,
  IconChecks,
  IconTruck,
  IconAlertTriangle,
  IconPackage,
  IconBox,
  IconSearch,
  IconFilter,
  IconRefresh,
} from "@tabler/icons-react";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters & Search
  const [filterType, setFilterType] = useState("ALL"); // ALL, UNREAD, READ, Delivery, Incident
  const [searchQuery, setSearchQuery] = useState("");

  const userId = localStorage.getItem("userId");
  const authHeader = useMemo(() => {
    return {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    };
  }, []);

  const loadNotifications = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    setError("");
    axios
      .get(apiUrl(`/api/notifications/${userId}`), authHeader)
      .then((res) => {
        setNotifications(res.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Could not load notifications");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId, authHeader]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const acknowledge = async (id) => {
    try {
      setActionLoading(true);
      await axios.put(apiUrl(`/api/notifications/${id}/acknowledge`), {}, authHeader);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Could not mark notification as read");
    } finally {
      setActionLoading(false);
    }
  };

  const acknowledgeAll = async () => {
    try {
      setActionLoading(true);
      setError("");
      await axios.put(apiUrl("/api/notifications/mark-all-read"), {}, authHeader);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setSuccessMsg("All notifications marked as read.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to mark all as read.");
    } finally {
      setActionLoading(false);
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Status/type filter
      if (filterType === "UNREAD" && n.is_read) return false;
      if (filterType === "READ" && !n.is_read) return false;
      if (filterType === "Delivery" && !String(n.type).toLowerCase().includes("deliver")) return false;
      if (filterType === "Incident" && !String(n.type).toLowerCase().includes("incident")) return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (n.message && n.message.toLowerCase().includes(q)) ||
        (n.type && n.type.toLowerCase().includes(q))
      );
    });
  }, [notifications, filterType, searchQuery]);

  // Icon helper per notification type
  const getIcon = (type) => {
    const t = String(type || "").toLowerCase();
    if (t.includes("deliver")) return <IconTruck size={18} className="text-primary" />;
    if (t.includes("incident") || t.includes("alert"))
      return <IconAlertTriangle size={18} className="text-warning" />;
    if (t.includes("order")) return <IconPackage size={18} className="text-success" />;
    if (t.includes("stock") || t.includes("inventory"))
      return <IconBox size={18} className="text-info" />;
    return <IconBell size={18} className="text-secondary" />;
  };

  return (
    <AppLayout pageTitle="Notifications & Alerts">
      {/* Alerts */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
          <IconAlertTriangle className="me-2 flex-shrink-0" size={20} />
          <div className="flex-grow-1">{error}</div>
          <button type="button" className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
          <IconCheck className="me-2 flex-shrink-0" size={20} />
          <div className="flex-grow-1">{successMsg}</div>
          <button type="button" className="btn-close" onClick={() => setSuccessMsg("")}></button>
        </div>
      )}

      {/* Header and Controls Card */}
      <div className="kp-card mb-4 shadow-sm">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 pb-3 border-bottom mb-3">
          <div>
            <h3 className="h6 mb-1 fw-bold d-flex align-items-center">
              <IconBell className="me-2 text-primary" size={20} />
              Notification Inbox
            </h3>
            <p className="text-muted small mb-0">
              {unreadCount > 0 ? (
                <span>
                  You have <strong className="text-primary">{unreadCount} unread</strong> notification{unreadCount > 1 ? "s" : ""}
                </span>
              ) : (
                "You are all caught up! No unread notifications."
              )}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-secondary btn-sm d-flex align-items-center"
              onClick={loadNotifications}
              disabled={loading}
              title="Refresh inbox"
            >
              <IconRefresh size={16} className={`me-1 ${loading ? "fa-spin" : ""}`} />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                className="btn btn-outline-primary btn-sm fw-bold d-flex align-items-center"
                onClick={acknowledgeAll}
                disabled={actionLoading}
              >
                <IconChecks size={16} className="me-1" />
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="row g-2 align-items-center">
          <div className="col-md-6">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0">
                <IconSearch size={16} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search notification messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="btn btn-outline-secondary border"
                  type="button"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="col-md-6 text-md-end">
            <div className="btn-group btn-group-sm" role="group">
              <button
                className={`btn ${filterType === "ALL" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setFilterType("ALL")}
              >
                All ({notifications.length})
              </button>
              <button
                className={`btn ${filterType === "UNREAD" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setFilterType("UNREAD")}
              >
                Unread ({unreadCount})
              </button>
              <button
                className={`btn ${filterType === "Delivery" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setFilterType("Delivery")}
              >
                Deliveries
              </button>
              <button
                className={`btn ${filterType === "Incident" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setFilterType("Incident")}
              >
                Incidents
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Items List */}
      <div className="kp-card shadow-sm">
        {loading ? (
          <p className="text-muted text-center py-5">Loading notifications...</p>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <IconBell size={36} className="mb-2 opacity-50" />
            <p className="mb-0">
              {searchQuery || filterType !== "ALL"
                ? "No notifications match your search or filter."
                : "No notifications found."}
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {filteredNotifications.map((n) => {
              const formattedDate = new Date(n.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });

              return (
                <div
                  key={n.notification_id}
                  className={`p-3 border rounded transition-all d-flex align-items-start justify-content-between gap-3 ${
                    n.is_read ? "bg-white" : "bg-primary-subtle border-primary-subtle"
                  }`}
                  style={{
                    borderLeft: n.is_read
                      ? "3px solid #cbd5e1"
                      : "4px solid var(--color-primary, #0284c7)",
                  }}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="p-2 rounded-circle bg-white border shadow-sm flex-shrink-0 mt-1"
                      title={n.type || "Notification"}
                    >
                      {getIcon(n.type)}
                    </div>

                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`badge ${
                            n.is_read ? "bg-secondary-subtle text-secondary" : "bg-primary text-white"
                          }`}
                        >
                          {n.type || "System Alert"}
                        </span>
                        <span className="small text-muted">{formattedDate}</span>
                        {!n.is_read && (
                          <span className="badge bg-warning text-dark small">New</span>
                        )}
                      </div>

                      <p className="mb-0 text-dark" style={{ fontSize: "0.95rem" }}>
                        {n.message}
                      </p>
                    </div>
                  </div>

                  {!n.is_read && (
                    <button
                      className="btn btn-sm btn-outline-primary text-nowrap flex-shrink-0"
                      onClick={() => acknowledge(n.notification_id)}
                      disabled={actionLoading}
                      title="Mark as read"
                    >
                      <IconCheck size={14} className="me-1" />
                      Mark Read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default Notifications;

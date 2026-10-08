import { useState, useEffect } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId = localStorage.getItem("userId");
  const authHeader = {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  };

  const loadNotifications = () => {
    if (!userId) return;
    setLoading(true);
    axios
      .get(`http://localhost:5000/api/notifications/${userId}`)
      .then((res) => {
        setNotifications(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Could not load notifications");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const acknowledge = async (id) => {
    try {
      await axios.put(
        `http://localhost:5000/api/notifications/${id}/acknowledge`,
        {},
        authHeader
      );
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      setError("Could not mark as read");
    }
  };

  const acknowledgeAll = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => acknowledge(n.notification_id)));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AppLayout pageTitle="Notifications">
      {error && (
        <div className="kp-card" style={{ marginBottom: "1rem", color: "var(--color-danger-text)" }}>
          {error}
        </div>
      )}

      <div className="kp-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
          {unreadCount > 0 && (
            <button className="btn btn-sm btn-secondary" onClick={acknowledgeAll}>
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Loading…</p>
        ) : notifications.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>No notifications yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {notifications.map((n) => (
              <div
                key={n.notification_id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "1rem",
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-md)",
                  background: n.is_read ? "var(--color-bg)" : "var(--color-info-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <span
                    className={`kp-badge ${n.is_read ? "kp-badge-success" : "kp-badge-info"}`}
                    style={{ marginBottom: "0.4rem" }}
                  >
                    {n.type || "Info"}
                  </span>
                  <p style={{ margin: "0.3rem 0 0.2rem", fontSize: "0.9rem" }}>{n.message}</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => acknowledge(n.notification_id)}
                    style={{ flexShrink: 0 }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default Notifications;


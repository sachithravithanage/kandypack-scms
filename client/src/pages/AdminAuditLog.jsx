import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconHistory,
  IconSearch,
  IconRefresh,
  IconShieldLock,
  IconUsers,
  IconClock,
  IconFileText,
} from "@tabler/icons-react";

function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(apiUrl("/api/users/audit-logs"), {
        ...authHeader,
        params: { search: search.trim() || undefined, limit: 100 },
      });
      setLogs(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load audit log records.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getActionBadge = (action = "") => {
    const act = action.toLowerCase();
    if (act.includes("created") || act.includes("register")) {
      return <span className="kp-badge kp-badge-success">{action}</span>;
    }
    if (act.includes("deactivated") || act.includes("deleted") || act.includes("failed")) {
      return <span className="kp-badge kp-badge-danger">{action}</span>;
    }
    if (act.includes("password") || act.includes("reset") || act.includes("security")) {
      return <span className="kp-badge kp-badge-warning">{action}</span>;
    }
    if (act.includes("restock")) {
      return <span className="kp-badge kp-badge-info">{action}</span>;
    }
    return <span className="kp-badge kp-badge-info">{action}</span>;
  };

  return (
    <AppLayout pageTitle="Security & System Audit Log">
      <div className="kp-card mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div className="d-flex align-items-center gap-3">
            <div className="kp-stat-icon bg-primary-subtle text-primary mb-0">
              <IconHistory size={24} />
            </div>
            <div>
              <h2 className="h5 mb-1">System Audit Trail (REQ-USR-05)</h2>
              <p className="text-muted small mb-0">
                Immutable chronological log of administrative operations, staff updates, logins, and inventory adjustments.
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link to="/admin/users" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
              <IconUsers size={16} />
              <span>User Directory</span>
            </Link>
            <button
              onClick={loadLogs}
              className="btn btn-sm btn-light border d-flex align-items-center gap-1"
              disabled={loading}
            >
              <IconRefresh size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Search Bar ───────────────────────────────────────── */}
        <div className="row g-2 mb-3">
          <div className="col-12 col-md-6">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white">
                <IconSearch size={15} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by action, table, user, or details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger p-2 small mb-3">{error}</div>}

        {/* ── Table ────────────────────────────────────────────── */}
        <div className="table-responsive">
          <table className="table table-hover align-middle small mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: "170px" }}>Timestamp</th>
                <th>Operator</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id}>
                    <td className="text-muted font-monospace" style={{ fontSize: "0.8rem" }}>
                      {new Date(log.timestamp).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td>
                      <div className="fw-medium">{log.user_name || "System"}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                        {log.user_email || `User #${log.user_id}`}
                      </div>
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td className="font-monospace text-secondary" style={{ fontSize: "0.82rem" }}>
                      {log.table_affected || "—"}
                    </td>
                    <td className="text-secondary">{log.record_id ?? "—"}</td>
                    <td className="text-muted" style={{ maxWidth: "340px", wordBreak: "break-word" }}>
                      {log.details || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

export default AdminAuditLog;

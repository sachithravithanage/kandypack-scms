import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconHistory,
  IconSearch,
  IconRefresh,
  IconUsers,
  IconFilter,
  IconEye,
  IconCheck,
  IconUser,
  IconPackage,
  IconTruck,
  IconTrain,
  IconFileInvoice,
  IconShieldLock,
  IconX,
} from "@tabler/icons-react";

const ROLE_OPTIONS = [
  { id: "ALL", label: "All Roles" },
  { id: "1", label: "Administrator" },
  { id: "2", label: "Dispatcher" },
  { id: "3", label: "Regional Store Manager" },
  { id: "4", label: "Driver" },
  { id: "5", label: "Assistant" },
  { id: "6", label: "Customer" },
];

const RESOURCE_ENTITIES = {
  user: { label: "User Account", icon: IconUser, color: "bg-primary-subtle text-primary border-primary-subtle" },
  order: { label: "Customer Order", icon: IconFileInvoice, color: "bg-success-subtle text-success border-success-subtle" },
  main_inventory: { label: "Warehouse Stock", icon: IconPackage, color: "bg-warning-subtle text-warning-emphasis border-warning-subtle" },
  product: { label: "Product SKU", icon: IconPackage, color: "bg-info-subtle text-info-emphasis border-info-subtle" },
  truck_schedule: { label: "Dispatch Roster", icon: IconTruck, color: "bg-purple-subtle text-purple border-purple-subtle" },
  cargo_allocation: { label: "Train Cargo", icon: IconTrain, color: "bg-indigo-subtle text-indigo border-indigo-subtle" },
};

function AdminAuditLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(urlSearch);

  // Filter states
  const [actionCategory, setActionCategory] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [resourceFilter, setResourceFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Inspect detail modal state
  const [selectedLog, setSelectedLog] = useState(null);

  const token = localStorage.getItem("token");
  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const handleSearchChange = (val) => {
    setSearch(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("search", val);
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(apiUrl("/api/users/audit-logs"), {
        ...authHeader,
        params: {
          search: search.trim() || undefined,
          roleId: roleFilter !== "ALL" ? roleFilter : undefined,
          table: resourceFilter !== "ALL" ? resourceFilter : undefined,
          sort: sortOrder,
          limit: 250,
        },
      });
      setLogs(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load audit log records.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, resourceFilter, sortOrder, authHeader]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Client-side action category filtering
  const filteredLogs = useMemo(() => {
    if (actionCategory === "ALL") return logs;
    return logs.filter((log) => {
      const act = (log.action || "").toLowerCase();
      if (actionCategory === "AUTH") {
        return act.includes("login") || act.includes("logout") || act.includes("session");
      }
      if (actionCategory === "ORDERS") {
        return act.includes("order");
      }
      if (actionCategory === "INVENTORY") {
        return act.includes("stock") || act.includes("sku") || act.includes("adjust") || act.includes("restock");
      }
      if (actionCategory === "SECURITY") {
        return act.includes("password") || act.includes("reset") || act.includes("verify") || act.includes("deactivated");
      }
      if (actionCategory === "LOGISTICS") {
        return act.includes("roster") || act.includes("shortfall") || act.includes("dispatch") || act.includes("trip");
      }
      return true;
    });
  }, [logs, actionCategory]);

  const resetAllFilters = () => {
    setActionCategory("ALL");
    setRoleFilter("ALL");
    setResourceFilter("ALL");
    setSortOrder("newest");
    handleSearchChange("");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    actionCategory !== "ALL" ||
    roleFilter !== "ALL" ||
    resourceFilter !== "ALL" ||
    sortOrder !== "newest";

  const getActionBadge = (action = "") => {
    const act = action.toLowerCase();
    if (act.includes("created") || act.includes("register") || act.includes("verified")) {
      return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">{action}</span>;
    }
    if (act.includes("deactivated") || act.includes("deleted") || act.includes("failed") || act.includes("cancel")) {
      return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">{action}</span>;
    }
    if (act.includes("password") || act.includes("reset") || act.includes("security") || act.includes("override")) {
      return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1">{action}</span>;
    }
    if (act.includes("restock") || act.includes("adjust") || act.includes("order")) {
      return <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">{action}</span>;
    }
    return <span className="badge bg-light text-secondary border px-2 py-1">{action}</span>;
  };

  const getResourceBadge = (table = "") => {
    const entity = RESOURCE_ENTITIES[table] || {
      label: table ? table.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "System Resource",
      icon: IconShieldLock,
      color: "bg-light text-secondary border",
    };
    const IconComponent = entity.icon;
    return (
      <span className={`badge ${entity.color} d-inline-flex align-items-center gap-1 px-2 py-1 fw-medium`} style={{ fontSize: "0.76rem" }}>
        <IconComponent size={13} />
        <span>{entity.label}</span>
      </span>
    );
  };

  const getRoleBadge = (roleName) => {
    if (!roleName || roleName === "System") {
      return <span className="badge bg-light text-muted border" style={{ fontSize: "0.7rem" }}>System</span>;
    }
    const colorMap = {
      Administrator: "bg-danger-subtle text-danger",
      Dispatcher: "bg-warning-subtle text-warning-emphasis",
      "Regional Store Manager": "bg-primary-subtle text-primary",
      Driver: "bg-info-subtle text-info-emphasis",
      Assistant: "bg-secondary-subtle text-secondary",
      Customer: "bg-success-subtle text-success",
    };
    return (
      <span className={`badge ${colorMap[roleName] || "bg-light text-dark"} px-2 py-0.5`} style={{ fontSize: "0.7rem" }}>
        {roleName}
      </span>
    );
  };

  return (
    <AppLayout pageTitle="Enterprise Audit Trail & Security Logs">
      <div className="kp-card mb-4">
        {/* ── Top Header ─────────────────────────────────────── */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div className="d-flex align-items-center gap-3">
            <div className="kp-stat-icon bg-primary-subtle text-primary mb-0">
              <IconHistory size={24} />
            </div>
            <div>
              <h2 className="h5 mb-0 fw-bold">Enterprise System Audit Trail</h2>
              <span className="text-muted small">
                Chronological security ledger tracking user operations, state changes, and business events.
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link to="/admin/users" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5">
              <IconUsers size={16} />
              <span>User Directory</span>
            </Link>
            <button
              onClick={loadLogs}
              className="btn btn-sm btn-light border d-flex align-items-center gap-1.5"
              disabled={loading}
              title="Reload audit records from server"
            >
              <IconRefresh size={16} className={loading ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Filter Controls Toolbar (Best Practice Multi-Dimensional Filtering) ── */}
        <div className="p-3 mb-3 bg-light rounded-3 border">
          <div className="d-flex align-items-center gap-2 mb-2">
            <IconFilter size={16} className="text-primary" />
            <span className="fw-semibold small text-uppercase text-secondary" style={{ letterSpacing: "0.5px" }}>
              Filter & Search Audit Events
            </span>
          </div>

          <div className="row g-2 align-items-center">
            {/* Search Box */}
            <div className="col-12 col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white">
                  <IconSearch size={14} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search operator, record, details..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => handleSearchChange("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Action Type Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm"
                value={actionCategory}
                onChange={(e) => setActionCategory(e.target.value)}
                title="Filter by action category"
              >
                <option value="ALL">All Action Types</option>
                <option value="AUTH">Authentication / Logins</option>
                <option value="ORDERS">Orders & Sales</option>
                <option value="INVENTORY">Inventory & SKUs</option>
                <option value="SECURITY">Security & Passwords</option>
                <option value="LOGISTICS">Logistics & Roster</option>
              </select>
            </div>

            {/* Role Type Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                title="Filter by operator role"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Resource Filter */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm"
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                title="Filter by target entity resource"
              >
                <option value="ALL">All Target Resources</option>
                <option value="user">User Accounts</option>
                <option value="order">Customer Orders</option>
                <option value="main_inventory">Warehouse Stock</option>
                <option value="product">Product Catalog</option>
                <option value="truck_schedule">Dispatch Roster</option>
                <option value="cargo_allocation">Train Cargo</option>
              </select>
            </div>

            {/* Sort Order (Newest / Oldest) */}
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                title="Sort chronology"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>
          </div>

          {/* Active filter summary bar */}
          {hasActiveFilters && (
            <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top">
              <span className="small text-muted">
                Showing <strong>{filteredLogs.length}</strong> matching events
              </span>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none p-0 small text-danger d-flex align-items-center gap-1"
                onClick={resetAllFilters}
              >
                <IconX size={14} />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>

        {error && <div className="alert alert-danger p-2 small mb-3">{error}</div>}

        {/* ── Best Practice Audit Log Table ───────────────────── */}
        <div className="table-responsive">
          <table className="table table-hover align-middle small mb-0">
            <thead className="table-light text-uppercase" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
              <tr>
                <th style={{ width: "170px" }}>Timestamp</th>
                <th>Operator & Role</th>
                <th>Action Event</th>
                {/* Best Practice: "Target Resource" instead of raw DB "Table" */}
                <th>Target Resource</th>
                <th>Record ID</th>
                <th>Audited Details</th>
                <th className="text-end" style={{ width: "90px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading audit trail records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <IconHistory size={36} className="text-muted mb-2 opacity-50" />
                    <div className="fw-semibold">No matching audit events found.</div>
                    <div className="small">Try adjusting search filters or clear your selection.</div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.log_id}>
                    <td className="text-muted font-monospace" style={{ fontSize: "0.78rem" }}>
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
                      <div className="d-flex align-items-center gap-1.5 mb-0.5">
                        <span className="fw-semibold text-dark">{log.user_name || "System"}</span>
                        {getRoleBadge(log.user_role)}
                      </div>
                      <div className="text-muted" style={{ fontSize: "0.74rem" }}>
                        {log.user_email || (log.user_id ? `User #${log.user_id}` : "Automated System")}
                      </div>
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    {/* Human readable Target Resource Badge */}
                    <td>{getResourceBadge(log.table_affected)}</td>
                    <td>
                      {log.record_id ? (
                        <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: "0.74rem" }}>
                          #{log.record_id}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td style={{ maxWidth: "320px" }}>
                      <div className="text-truncate text-secondary" style={{ fontSize: "0.8rem" }}>
                        {log.details || "—"}
                      </div>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border py-1 px-2 d-inline-flex align-items-center gap-1"
                        style={{ fontSize: "0.75rem" }}
                        title="View complete event payload"
                        onClick={() => setSelectedLog(log)}
                      >
                        <IconEye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Event Details Modal (Best Practice Inspector) ─────── */}
      {selectedLog && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "560px" }}>
            <div className="modal-content shadow border-0">
              <div className="modal-header">
                <h5 className="modal-title h6 fw-bold d-flex align-items-center gap-2 mb-0">
                  <IconHistory size={18} className="text-primary" />
                  Audit Event #{selectedLog.log_id} Inspection
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedLog(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="p-3 mb-3 bg-light rounded-3 border small">
                  <div className="row g-2">
                    <div className="col-6">
                      <span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Timestamp</span>
                      <strong className="font-monospace text-dark">
                        {new Date(selectedLog.timestamp).toLocaleString("en-US")}
                      </strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Action Event</span>
                      <div>{getActionBadge(selectedLog.action)}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Operator</span>
                      <strong className="text-dark">{selectedLog.user_name || "System"}</strong>
                      <div className="text-muted" style={{ fontSize: "0.74rem" }}>{selectedLog.user_email || `ID: ${selectedLog.user_id}`}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Operator Role</span>
                      <div>{getRoleBadge(selectedLog.user_role)}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Target Resource</span>
                      <div>{getResourceBadge(selectedLog.table_affected)}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block" style={{ fontSize: "0.75rem" }}>Record ID</span>
                      <strong className="font-monospace text-primary">
                        {selectedLog.record_id ? `#${selectedLog.record_id}` : "Global"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-semibold text-secondary">
                    Audited Event Payload / Description
                  </label>
                  <div
                    className="p-3 rounded border font-monospace text-dark"
                    style={{ backgroundColor: "#f8fafc", fontSize: "0.82rem", wordBreak: "break-word", whiteSpace: "pre-wrap" }}
                  >
                    {selectedLog.details || "No supplementary details recorded."}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => setSelectedLog(null)}
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default AdminAuditLog;

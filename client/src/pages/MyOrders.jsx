import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconPackage,
  IconPlus,
  IconCheck,
  IconTruck,
  IconAlertCircle,
  IconEdit,
  IconTrash,
  IconSearch,
  IconMapPin,
  IconCalendar,
  IconCircleCheck,
} from "@tabler/icons-react";

const API_BASE = apiUrl("/api");

// Dates are handled in the user's LOCAL time zone. (toISOString() converts to UTC,
// which in Sri Lanka (UTC+5:30) can show the previous day.)
const toLocalDateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseLocalDate = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const STATUS_CONFIG = {
  Placed: {
    badgeClass: "kp-badge-info",
    step: 1,
    label: "Placed",
  },
  Scheduled: {
    badgeClass: "kp-badge-warning",
    step: 2,
    label: "Scheduled for Rail",
  },
  "In Transit": {
    badgeClass: "kp-badge-warning",
    step: 3,
    label: "In Transit",
  },
  Delivered: {
    badgeClass: "kp-badge-success",
    step: 4,
    label: "Delivered",
  },
  Closed: {
    badgeClass: "kp-badge-success",
    step: 5,
    label: "Closed (Received)",
  },
  Cancelled: {
    badgeClass: "kp-badge-danger",
    step: 0,
    label: "Cancelled",
  },
};

const LIFECYCLE_STEPS = ["Placed", "Scheduled", "In Transit", "Delivered", "Closed"];

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Modal State
  const [editingOrder, setEditingOrder] = useState(null);
  const [editAddress, setEditAddress] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editError, setEditError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const customerId = (() => {
    const stored = localStorage.getItem("userId") || localStorage.getItem("customerId");
    if (stored) return Number(stored);
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload && payload.userId) return Number(payload.userId);
      } catch (err) {
        console.warn("Unable to read the stored customer token.", err);
      }
    }
    return 9;
  })();
  const token = localStorage.getItem("token");
  const authHeader = token ? {
    headers: { Authorization: `Bearer ${token}` },
  } : {};

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE}/orders/customer/${customerId}`, authHeader);
      // Sort orders newest first
      const sorted = (res.data || []).sort(
        (a, b) => new Date(b.order_date || 0) - new Date(a.order_date || 0) || b.order_id - a.order_id
      );
      setOrders(sorted);
    } catch (err) {
      console.error("Error loading customer orders:", err);
      setError(err.response?.data?.error || "Could not load order history.");
    } finally {
      setLoading(false);
    }
  }, [customerId, authHeader]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // REQ-ORD-07: Customer confirms receipt (Delivered -> Closed)
  const handleConfirmReceipt = async (orderId) => {
    if (!window.confirm("Confirm receipt of order #" + orderId + "? This will close the order.")) return;
    try {
      setActionLoading(true);
      setError("");
      const res = await axios.put(`${API_BASE}/orders/${orderId}/confirm-receipt`, {}, authHeader);
      setSuccessMsg(res.data.message || `Order #${orderId} marked as received and closed.`);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.error || "Could not confirm order receipt.");
    } finally {
      setActionLoading(false);
    }
  };

  // REQ-ORD-06: Customer cancels order (only while status is 'Placed')
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Are you sure you want to cancel order #${orderId}? Stock will be restored to inventory.`)) return;
    try {
      setActionLoading(true);
      setError("");
      const res = await axios.delete(`${API_BASE}/orders/${orderId}`, authHeader);
      setSuccessMsg(res.data.message || `Order #${orderId} cancelled successfully.`);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.error || "Could not cancel order.");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Order Modal
  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditAddress(order.delivery_address || "");
    // Format date YYYY-MM-DD
    const raw = order.requested_delivery_date;
    const d = !raw
      ? ""
      : /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? raw
      : toLocalDateString(new Date(raw));
    setEditDate(d);
    setEditError("");
  };

  // REQ-ORD-06 & REQ-ORD-02: Save Edit (Address / Delivery Date >= 7 days)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    // Check 7-day rule on client before submit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = parseLocalDate(editDate);
    const diffDays = Math.round((chosen - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      setEditError("Requested delivery date must be at least 7 days from today.");
      return;
    }

    try {
      setActionLoading(true);
      setEditError("");
      await axios.put(
        `${API_BASE}/orders/${editingOrder.order_id}`,
        {
          deliveryAddress: editAddress,
          deliveryDate: editDate,
        },
        authHeader
      );
      setSuccessMsg(`Order #${editingOrder.order_id} updated successfully.`);
      setEditingOrder(null);
      loadOrders();
    } catch (err) {
      setEditError(err.response?.data?.error || "Could not update order.");
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate stats
  const totalCount = orders.length;
  const activeCount = orders.filter((o) => ["Placed", "Scheduled", "In Transit"].includes(o.status)).length;
  const deliveredCount = orders.filter((o) => ["Delivered", "Closed"].includes(o.status)).length;
  const totalSpent = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + parseFloat(o.total_value || 0), 0);

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      activeFilter === "ALL" ||
      (activeFilter === "ACTIVE" && ["Placed", "Scheduled", "In Transit"].includes(o.status)) ||
      (activeFilter === "DELIVERED" && ["Delivered", "Closed"].includes(o.status)) ||
      (activeFilter === "CANCELLED" && o.status === "Cancelled");

    const matchesSearch =
      !searchQuery ||
      String(o.order_id).includes(searchQuery) ||
      (o.delivery_address && o.delivery_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.status && o.status.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <AppLayout pageTitle="My Orders">
      {/* Notifications / Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-3" role="alert">
          <IconAlertCircle className="me-2 flex-shrink-0" size={18} />
          <div>{error}</div>
          <button type="button" className="btn-close" onClick={() => setError("")} aria-label="Close"></button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center mb-3" role="alert">
          <IconCircleCheck className="me-2 flex-shrink-0" size={18} />
          <div>{successMsg}</div>
          <button type="button" className="btn-close" onClick={() => setSuccessMsg("")} aria-label="Close"></button>
        </div>
      )}

      {/* Top Banner / Actions */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h2 className="h4 mb-0">Customer Order Portal</h2>
          <p className="text-muted small mb-0">Track and manage your supply chain distribution orders</p>
        </div>
        <Link to="/orders/new" className="btn btn-primary d-inline-flex align-items-center gap-2">
          <IconPlus size={18} stroke={2} />
          <span>Place New Order</span>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="kp-stat-grid">
        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-info-bg)" }}>
            <IconPackage size={20} stroke={1.75} color="var(--color-info-text)" />
          </div>
          <p className="kp-stat-label">Total Orders Placed</p>
          <p className="kp-stat-value">{loading ? "…" : totalCount}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-warning-bg)" }}>
            <IconTruck size={20} stroke={1.75} color="var(--color-warning-text)" />
          </div>
          <p className="kp-stat-label">Active / In-Transit</p>
          <p className="kp-stat-value">{loading ? "…" : activeCount}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-success-bg)" }}>
            <IconCheck size={20} stroke={1.75} color="var(--color-success-text)" />
          </div>
          <p className="kp-stat-label">Delivered & Closed</p>
          <p className="kp-stat-value">{loading ? "…" : deliveredCount}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-amber-50)" }}>
            <IconCircleCheck size={20} stroke={1.75} color="var(--color-amber-600)" />
          </div>
          <p className="kp-stat-label">Total Order Value</p>
          <p className="kp-stat-value" style={{ fontSize: "1.35rem" }}>
            {loading ? "…" : `LKR ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="kp-card mb-3 p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex flex-wrap gap-2">
            {[
              { id: "ALL", label: "All Orders" },
              { id: "ACTIVE", label: "Active" },
              { id: "DELIVERED", label: "Delivered & Closed" },
              { id: "CANCELLED", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`btn btn-sm ${activeFilter === tab.id ? "btn-primary" : "btn-secondary"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="kp-search" style={{ width: 260 }}>
            <IconSearch size={16} stroke={1.75} />
            <input
              type="text"
              placeholder="Search by order ID or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Orders List / Cards (Matching Figure 13) */}
      {loading ? (
        <div className="kp-card text-center py-5">
          <div className="spinner-border text-primary mb-2" role="status"></div>
          <p className="text-muted mb-0">Loading your orders…</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="kp-card text-center py-5">
          <IconPackage size={48} className="text-muted mb-3" stroke={1.25} />
          <h3 className="h5 mb-1">No orders found</h3>
          <p className="text-muted small mb-3">
            {searchQuery || activeFilter !== "ALL"
              ? "Try adjusting your filter or search criteria."
              : "You have not placed any orders yet."}
          </p>
          <Link to="/orders/new" className="btn btn-primary btn-sm px-3">
            Place Your First Order
          </Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filteredOrders.map((order) => {
            const statusMeta = STATUS_CONFIG[order.status] || {
              badgeClass: "kp-badge-info",
              step: 1,
              label: order.status,
            };
            const isCancelled = order.status === "Cancelled";
            const isDelivered = order.status === "Delivered";
            const isPlaced = order.status === "Placed";

            return (
              <div key={order.order_id} className="kp-card">
                {/* Header row */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-3 border-bottom">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: 42,
                        height: 42,
                        background: isCancelled ? "var(--color-danger-bg)" : "var(--color-amber-50)",
                        color: isCancelled ? "var(--color-danger-text)" : "var(--color-amber-600)",
                        fontWeight: 700,
                      }}
                    >
                      #{order.order_id}
                    </div>
                    <div>
                      <h3 className="h6 mb-0">Order #{order.order_id}</h3>
                      <span className="text-muted small">
                        Placed on {order.order_date ? new Date(order.order_date).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className={`kp-badge ${statusMeta.badgeClass}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                </div>

                {/* Stepper Progress Bar (REQ-ORD-05 lifecycle) */}
                {!isCancelled ? (
                  <div className="py-3 border-bottom">
                    <div className="d-flex justify-content-between align-items-center position-relative px-2">
                      {/* Connecting Line */}
                      <div
                        style={{
                          position: "absolute",
                          top: "14px",
                          left: "40px",
                          right: "40px",
                          height: "3px",
                          background: "var(--color-border)",
                          zIndex: 0,
                        }}
                      ></div>
                      <div
                        style={{
                          position: "absolute",
                          top: "14px",
                          left: "40px",
                          width: `${Math.min(100, Math.max(0, ((statusMeta.step - 1) / (LIFECYCLE_STEPS.length - 1)) * 100))}%`,
                          height: "3px",
                          background: "var(--color-navy-800)",
                          transition: "width 0.3s ease",
                          zIndex: 0,
                        }}
                      ></div>

                      {LIFECYCLE_STEPS.map((stepName, idx) => {
                        const stepNum = idx + 1;
                        const isDone = statusMeta.step >= stepNum;
                        const isCurrent = statusMeta.step === stepNum;

                        return (
                          <div
                            key={stepName}
                            className="text-center position-relative"
                            style={{ zIndex: 1, minWidth: 60 }}
                          >
                            <div
                              className="rounded-circle mx-auto d-flex align-items-center justify-content-center"
                              style={{
                                width: 28,
                                height: 28,
                                background: isDone ? "var(--color-navy-800)" : "var(--color-surface)",
                                border: `2px solid ${isDone ? "var(--color-navy-800)" : "var(--color-border-strong)"}`,
                                color: isDone ? "#ffffff" : "var(--color-text-muted)",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              {isDone ? <IconCheck size={14} stroke={3} /> : stepNum}
                            </div>
                            <span
                              className="d-block small mt-1"
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: isCurrent ? 700 : 500,
                                color: isCurrent ? "var(--color-text)" : "var(--color-text-muted)",
                              }}
                            >
                              {stepName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-2 px-3 my-2 rounded bg-danger-subtle text-danger small d-flex align-items-center">
                    <IconAlertCircle size={16} className="me-2 flex-shrink-0" />
                    <span>This order was cancelled. Reserved inventory was restored to the central warehouse.</span>
                  </div>
                )}

                {/* Details Grid */}
                <div className="row g-3 pt-3">
                  <div className="col-md-4 col-sm-6">
                    <div className="small text-muted mb-1 d-flex align-items-center gap-1">
                      <IconCalendar size={14} /> Requested Delivery Date
                    </div>
                    <div className="fw-semibold">
                      {order.requested_delivery_date
                        ? new Date(order.requested_delivery_date).toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>

                  <div className="col-md-5 col-sm-6">
                    <div className="small text-muted mb-1 d-flex align-items-center gap-1">
                      <IconMapPin size={14} /> Delivery Destination
                    </div>
                    <div className="fw-semibold text-truncate" title={order.delivery_address}>
                      {order.delivery_address || "Standard Customer Address"}
                    </div>
                    {order.route_stop_id && (
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                        Stop ID: #{order.route_stop_id} {order.route_id ? `(Route #${order.route_id})` : ""}
                      </div>
                    )}
                  </div>

                  <div className="col-md-3 col-sm-12 text-md-end">
                    <div className="small text-muted mb-1">Total Valuation & Volume</div>
                    <div className="fw-bold fs-6 text-dark">
                      LKR {parseFloat(order.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                      Volume: {parseFloat(order.total_volume || 0).toFixed(2)} m³
                    </div>
                  </div>
                </div>

                {/* Delivery Time Stamp if present */}
                {order.delivered_at && (
                  <div className="mt-2 pt-2 border-top small text-success d-flex align-items-center gap-1">
                    <IconCheck size={14} />
                    <span>Delivered at: {new Date(order.delivered_at).toLocaleString()}</span>
                  </div>
                )}

                {/* Action Footer */}
                <div className="d-flex justify-content-end align-items-center gap-2 pt-3 border-top mt-3">
                  {/* REQ-ORD-07 Confirm receipt button */}
                  {isDelivered && (
                    <button
                      className="btn btn-sm btn-success d-inline-flex align-items-center gap-1 fw-bold px-3"
                      onClick={() => handleConfirmReceipt(order.order_id)}
                      disabled={actionLoading}
                    >
                      <IconCircleCheck size={16} />
                      <span>Confirm Receipt</span>
                    </button>
                  )}

                  {/* REQ-ORD-06 Placed-only actions: Edit & Cancel */}
                  {isPlaced && (
                    <>
                      <button
                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                        onClick={() => openEditModal(order)}
                        disabled={actionLoading}
                      >
                        <IconEdit size={14} />
                        <span>Edit Order</span>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                        onClick={() => handleCancelOrder(order.order_id)}
                        disabled={actionLoading}
                      >
                        <IconTrash size={14} />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div
          className="modal show d-block"
          style={{ background: "rgba(11, 19, 38, 0.45)", zIndex: 1050 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content kp-card border-0">
              <div className="modal-header border-bottom pb-2">
                <h5 className="modal-title h6 fw-bold">
                  Edit Order #{editingOrder.order_id} (Status: Placed)
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingOrder(null)}
                  disabled={actionLoading}
                ></button>
              </div>

              <form onSubmit={handleSaveEdit}>
                <div className="modal-body py-3">
                  {editError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      {editError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Delivery Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Requested Delivery Date (Min. 7 Days Lead Time)
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      required
                    />
                    <div className="form-text small text-muted">
                      Per supply chain policy (REQ-ORD-02), modifications must maintain at least a 7-day advance notice.
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top pt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setEditingOrder(null)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default MyOrders;

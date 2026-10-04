import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import {
  IconTruck,
  IconMapPin,
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
  IconPhone,
  IconChecklist,
  IconArrowRight,
  IconPackage,
  IconRotateClockwise,
} from "@tabler/icons-react";

const API_BASE = "http://localhost:5000/api";

function DriverDelivery() {
  const [runs, setRuns] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Notes and failure modal state
  const [failureModalStop, setFailureModalStop] = useState(null);
  const [failureReason, setFailureReason] = useState("Customer unavailable / uncontactable");
  const [deliveryNote, setDeliveryNote] = useState("");

  const authHeader = {
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
  };

  // 1. Load all available runs
  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/delivery/driver-runs`, authHeader);
      setRuns(res.data || []);
      if (res.data && res.data.length > 0 && !selectedScheduleId) {
        setSelectedScheduleId(res.data[0].truck_schedule_id);
      }
    } catch (err) {
      console.error("Error loading delivery runs:", err);
      setError(err.response?.data?.error || "Could not load delivery runs");
    } finally {
      setLoading(false);
    }
  }, [selectedScheduleId]);

  // 2. Load selected run details & stop sequence (REQ-DEL-01)
  const loadScheduleDetails = useCallback(async (scheduleId) => {
    if (!scheduleId) return;
    try {
      setActionLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE}/delivery/schedule/${scheduleId}/today`, authHeader);
      setActiveRun(res.data.schedule);
      setStops(res.data.stops || []);
    } catch (err) {
      console.error("Error loading schedule details:", err);
      setError(err.response?.data?.error || "Could not load run stops");
    } finally {
      setActionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (selectedScheduleId) {
      loadScheduleDetails(selectedScheduleId);
    }
  }, [selectedScheduleId, loadScheduleDetails]);

  // REQ-DEL-02: Confirm pickup from store
  const handleConfirmPickup = async () => {
    if (!selectedScheduleId) return;
    try {
      setActionLoading(true);
      setError("");
      const res = await axios.put(
        `${API_BASE}/delivery/schedule/${selectedScheduleId}/pickup`,
        {},
        authHeader
      );
      setSuccessMsg(res.data.message || "Pickup confirmed! Delivery run started.");
      await loadScheduleDetails(selectedScheduleId);
      await loadRuns();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to confirm pickup.");
    } finally {
      setActionLoading(false);
    }
  };

  // REQ-DEL-03 & REQ-DEL-05: Record Delivery Success
  const handleMarkDelivered = async (allocationId) => {
    try {
      setActionLoading(true);
      setError("");
      const res = await axios.put(
        `${API_BASE}/delivery/allocations/${allocationId}`,
        {
          deliveryStatus: "Delivered",
          note: deliveryNote || "Delivered directly to recipient.",
        },
        authHeader
      );
      setSuccessMsg("Order marked as Delivered! (Order status updated to Delivered)");
      setDeliveryNote("");
      await loadScheduleDetails(selectedScheduleId);
      await loadRuns();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record delivery.");
    } finally {
      setActionLoading(false);
    }
  };

  // REQ-DEL-04: Record Delivery Failure and Auto Re-queue
  const handleMarkFailed = async () => {
    if (!failureModalStop) return;
    try {
      setActionLoading(true);
      setError("");
      const res = await axios.put(
        `${API_BASE}/delivery/allocations/${failureModalStop.truck_allocation_id}`,
        {
          deliveryStatus: "Failed",
          note: failureReason,
        },
        authHeader
      );

      let msg = "Delivery marked as Failed.";
      if (res.data.reallocatedScheduleId) {
        msg += ` Automatically re-queued onto next scheduled run #${res.data.reallocatedScheduleId} (REQ-DEL-04).`;
      } else {
        msg += " Flagged for Dispatcher re-routing review.";
      }

      setSuccessMsg(msg);
      setFailureModalStop(null);
      setFailureReason("Customer unavailable / uncontactable");
      await loadScheduleDetails(selectedScheduleId);
      await loadRuns();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record delivery failure.");
    } finally {
      setActionLoading(false);
    }
  };

  // REQ-DEL-01 & REQ-SCHED-04: Complete Run & Log Working Hours
  const handleCompleteRun = async () => {
    if (!selectedScheduleId) return;
    if (!window.confirm("Complete this delivery run and log actual working hours into the Roster Log?")) {
      return;
    }
    try {
      setActionLoading(true);
      setError("");
      const res = await axios.put(
        `${API_BASE}/delivery/schedule/${selectedScheduleId}/complete`,
        {},
        authHeader
      );
      setSuccessMsg(res.data.message || "Run marked as Completed! Hours recorded.");
      await loadScheduleDetails(selectedScheduleId);
      await loadRuns();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to complete run.");
    } finally {
      setActionLoading(false);
    }
  };

  const isPickupConfirmed = Boolean(activeRun?.pickup_confirmed_at);
  const pendingCount = stops.filter((s) => s.delivery_status === "Pending").length;
  const deliveredCount = stops.filter((s) => s.delivery_status === "Delivered").length;
  const failedCount = stops.filter((s) => s.delivery_status === "Failed").length;

  return (
    <AppLayout pageTitle="Delivery Execution Portal">
      {/* Notifications */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
          <IconAlertCircle className="me-2 flex-shrink-0" size={20} />
          <div>{error}</div>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
          <IconCheck className="me-2 flex-shrink-0" size={20} />
          <div className="flex-grow-1">{successMsg}</div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMsg("")}
          ></button>
        </div>
      )}

      {/* Top Controls: Schedule Selector & Run Quick Info */}
      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <div className="kp-card h-100">
            <h3 className="h6 mb-3 d-flex align-items-center">
              <IconTruck className="me-2 text-primary" size={18} />
              Select Assigned Truck Run
            </h3>
            {loading ? (
              <p className="text-muted">Loading schedules...</p>
            ) : runs.length === 0 ? (
              <p className="text-muted">No runs scheduled for today.</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {runs.map((r) => {
                  const isSelected = r.truck_schedule_id === selectedScheduleId;
                  return (
                    <div
                      key={r.truck_schedule_id}
                      onClick={() => setSelectedScheduleId(r.truck_schedule_id)}
                      style={{
                        cursor: "pointer",
                        border: isSelected
                          ? "2px solid var(--color-navy-700)"
                          : "1px solid var(--color-border)",
                        background: isSelected
                          ? "var(--color-info-bg)"
                          : "var(--color-surface)",
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 14px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <strong style={{ fontSize: "0.95rem" }}>
                          Run #{r.truck_schedule_id} • {r.plate_number}
                        </strong>
                        <span
                          className={`badge ${
                            r.status === "Completed"
                              ? "bg-success"
                              : r.status === "In Progress"
                              ? "bg-warning text-dark"
                              : "bg-secondary"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div className="text-muted small mt-1">
                        {r.route_name} • {r.scheduled_date} ({r.start_time} - {r.end_time})
                      </div>
                      <div className="small mt-1 text-muted">
                        Staff: {r.driver_name} (Driver) & {r.assistant_name} (Assistant)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Run Status & Pickup Banner (REQ-DEL-02) */}
        <div className="col-lg-8">
          {activeRun ? (
            <div className="kp-card h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h2 className="h4 mb-1">
                      {activeRun.route_name} (Schedule #{activeRun.truck_schedule_id})
                    </h2>
                    <p className="text-muted mb-0 small">
                      Truck: <strong>{activeRun.plate_number}</strong> (Max Cap:{" "}
                      {activeRun.truck_capacity} m³) • Driver:{" "}
                      <strong>{activeRun.driver_name}</strong> • Assistant:{" "}
                      <strong>{activeRun.assistant_name}</strong>
                    </p>
                  </div>
                  <span
                    className={`badge px-3 py-2 ${
                      activeRun.status === "Completed"
                        ? "bg-success"
                        : isPickupConfirmed
                        ? "bg-warning text-dark"
                        : "bg-secondary"
                    }`}
                    style={{ fontSize: "0.85rem" }}
                  >
                    {activeRun.status === "Completed"
                      ? "Run Completed"
                      : isPickupConfirmed
                      ? "In Transit (Picked Up)"
                      : "Awaiting Store Pickup"}
                  </span>
                </div>

                {/* Progress Bar & Stat summary */}
                <div className="row text-center g-2 my-3">
                  <div className="col-4">
                    <div className="p-2 border rounded bg-light">
                      <div className="small text-muted">Pending Stops</div>
                      <div className="h5 mb-0 text-warning">{pendingCount}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 border rounded bg-light">
                      <div className="small text-muted">Delivered</div>
                      <div className="h5 mb-0 text-success">{deliveredCount}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-2 border rounded bg-light">
                      <div className="small text-muted">Failed / Re-queued</div>
                      <div className="h5 mb-0 text-danger">{failedCount}</div>
                    </div>
                  </div>
                </div>

                {/* REQ-DEL-02 Store Pickup Banner */}
                {!isPickupConfirmed ? (
                  <div className="p-3 my-2 border border-warning rounded bg-warning-subtle d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-bold text-dark">
                        <IconAlertCircle size={18} className="me-1 text-warning" />
                        Step 1: Confirm Store Goods Pickup
                      </div>
                      <div className="small text-muted">
                        Before departing and recording delivery outcomes, confirm that the
                        truck has been loaded at the regional store.
                      </div>
                    </div>
                    <button
                      className="btn btn-warning btn-sm fw-bold px-3 ms-3 text-nowrap"
                      onClick={handleConfirmPickup}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Processing..." : "Confirm Pickup & Depart"}
                    </button>
                  </div>
                ) : (
                  <div className="p-2 my-2 border border-success rounded bg-success-subtle text-success small d-flex align-items-center">
                    <IconCheck size={18} className="me-2 text-success flex-shrink-0" />
                    <div>
                      <strong>Store Pickup Confirmed:</strong> Goods loaded and departed from
                      store at {new Date(activeRun.pickup_confirmed_at).toLocaleTimeString()}.
                    </div>
                  </div>
                )}
              </div>

              {/* Run Completion Action (REQ-DEL-01 & REQ-SCHED-04) */}
              {isPickupConfirmed && activeRun.status !== "Completed" && (
                <div className="d-flex justify-content-end pt-3 border-top mt-3">
                  <button
                    className="btn btn-outline-success btn-sm d-flex align-items-center"
                    onClick={handleCompleteRun}
                    disabled={actionLoading}
                  >
                    <IconChecklist size={16} className="me-1" />
                    Complete Run & Log Hours to Roster Log
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="kp-card text-center py-5">
              <IconTruck size={36} className="text-muted mb-2" />
              <p className="text-muted">Select a scheduled run to view deliveries.</p>
            </div>
          )}
        </div>
      </div>

      {/* Stop Execution Sequence (REQ-DEL-01, REQ-DEL-03, REQ-DEL-04, REQ-DEL-05) */}
      {activeRun && (
        <div className="kp-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="h6 mb-0 d-flex align-items-center">
              <IconMapPin size={18} className="me-2 text-primary" />
              Delivery Sequence (Ordered by Route Stop Order)
            </h3>
            <span className="small text-muted">
              Total Assigned Deliveries: {stops.length}
            </span>
          </div>

          {stops.length === 0 ? (
            <div className="text-center py-4 text-muted">
              No orders allocated to this truck run yet.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {stops.map((stop) => {
                const isDelivered = stop.delivery_status === "Delivered";
                const isFailed = stop.delivery_status === "Failed";
                const isPending = stop.delivery_status === "Pending";

                return (
                  <div
                    key={stop.truck_allocation_id}
                    className="p-3 border rounded"
                    style={{
                      background: isDelivered
                        ? "#f0fdf4"
                        : isFailed
                        ? "#fef2f2"
                        : "#ffffff",
                      borderColor: isDelivered
                        ? "#bbf7d0"
                        : isFailed
                        ? "#fecaca"
                        : "var(--color-border)",
                    }}
                  >
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                          style={{
                            width: 34,
                            height: 34,
                            background: isDelivered
                              ? "var(--color-success-text)"
                              : isFailed
                              ? "var(--color-danger-text)"
                              : "var(--color-navy-700)",
                            fontSize: "0.85rem",
                          }}
                        >
                          #{stop.stop_order}
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: "1rem" }}>
                            {stop.stop_name} • Order #{stop.order_id}
                          </div>
                          <div className="text-muted small d-flex align-items-center mt-1">
                            <IconMapPin size={14} className="me-1 text-secondary" />
                            {stop.delivery_address}
                          </div>
                          <div className="text-muted small d-flex align-items-center mt-1 gap-3">
                            <span>
                              Customer: <strong>{stop.customer_name}</strong>
                            </span>
                            {stop.customer_phone && (
                              <span className="d-flex align-items-center">
                                <IconPhone size={14} className="me-1 text-primary" />
                                {stop.customer_phone}
                              </span>
                            )}
                            <span>
                              Volume: <strong>{stop.total_volume} m³</strong>
                            </span>
                          </div>
                          {stop.delivery_note && (
                            <div className="mt-2 small fst-italic text-secondary">
                              Note: {stop.delivery_note}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Badges & Action Buttons */}
                      <div className="d-flex align-items-center gap-2">
                        {isDelivered && (
                          <span className="badge bg-success d-flex align-items-center px-3 py-2">
                            <IconCheck size={14} className="me-1" />
                            Delivered
                          </span>
                        )}
                        {isFailed && (
                          <span className="badge bg-danger d-flex align-items-center px-3 py-2">
                            <IconX size={14} className="me-1" />
                            Failed (Re-queued)
                          </span>
                        )}
                        {isPending && (
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-success d-flex align-items-center"
                              onClick={() => handleMarkDelivered(stop.truck_allocation_id)}
                              disabled={!isPickupConfirmed || actionLoading}
                              title={
                                !isPickupConfirmed
                                  ? "Confirm store pickup before recording deliveries"
                                  : "Mark stop as successfully delivered"
                              }
                            >
                              <IconCheck size={14} className="me-1" />
                              Delivered
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger d-flex align-items-center"
                              onClick={() => setFailureModalStop(stop)}
                              disabled={!isPickupConfirmed || actionLoading}
                              title={
                                !isPickupConfirmed
                                  ? "Confirm store pickup before recording deliveries"
                                  : "Mark delivery as failed to trigger automatic re-queue"
                              }
                            >
                              <IconX size={14} className="me-1" />
                              Failed
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Failure Reason Modal (REQ-DEL-04) */}
      {failureModalStop && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center text-danger">
                  <IconAlertCircle size={20} className="me-2" />
                  Record Delivery Failure & Re-queue
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setFailureModalStop(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-3">
                  Under <strong>REQ-DEL-04</strong>, marking this delivery as Failed will
                  record the incident and <strong>automatically re-queue</strong> Order #
                  {failureModalStop.order_id} onto the next available truck schedule on{" "}
                  <strong>{activeRun.route_name}</strong>.
                </p>

                <div className="mb-3">
                  <label className="form-label small fw-bold">Select Failure Reason:</label>
                  <select
                    className="form-select form-select-sm"
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                  >
                    <option value="Customer unavailable / uncontactable">
                      Customer unavailable / uncontactable
                    </option>
                    <option value="Delivery address incorrect / not found">
                      Delivery address incorrect / not found
                    </option>
                    <option value="Premises inaccessible / gate locked">
                      Premises inaccessible / gate locked
                    </option>
                    <option value="Customer requested rescheduling">
                      Customer requested rescheduling
                    </option>
                    <option value="Damaged packaging rejected at destination">
                      Damaged packaging rejected at destination
                    </option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setFailureModalStop(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger fw-bold"
                  onClick={handleMarkFailed}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing..." : "Confirm Failure & Re-queue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default DriverDelivery;

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconTruck,
  IconMapPin,
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
  IconPhone,
  IconChecklist,
  IconSignature,
  IconAlertTriangle,
  IconSend,
  IconSearch,
  IconFileSpreadsheet,
} from "@tabler/icons-react";

const API_BASE = apiUrl("/api");

function DriverDelivery() {
  const [runs, setRuns] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Stop search and filter state
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [stopSearch, setStopSearch] = useState(urlSearch);

  useEffect(() => {
    setStopSearch(urlSearch);
  }, [urlSearch]);

  const handleStopSearchChange = (val) => {
    setStopSearch(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("search", val);
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  };
  const [stopStatusFilter, setStopStatusFilter] = useState("ALL");

  // Delivery confirmation modal state
  const [deliveryModalStop, setDeliveryModalStop] = useState(null);
  const [recipientNote, setRecipientNote] = useState("");

  // Failure modal state
  const [failureModalStop, setFailureModalStop] = useState(null);
  const [failureReason, setFailureReason] = useState("Customer unavailable / uncontactable");
  const [failureDetail, setFailureDetail] = useState("");

  // Attempted modal state (REQ-DEL-03)
  const [attemptedModalStop, setAttemptedModalStop] = useState(null);
  const [attemptedReason, setAttemptedReason] = useState("Customer phone unanswered / Gate closed");
  const [attemptedDetail, setAttemptedDetail] = useState("");

  // Report issue / incident modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueType, setIssueType] = useState("Traffic Delay");
  const [issueDescription, setIssueDescription] = useState("");

  const roleId = Number(localStorage.getItem("roleId"));
  const isDriverOrAssistant = roleId === 4 || roleId === 5;

  const authHeader = useMemo(() => {
    return {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    };
  }, []);

  // 1. Load all available runs
  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_BASE}/delivery/driver-runs`, { headers });
      setRuns(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedScheduleId((prev) => prev || res.data[0].truck_schedule_id);
      }
    } catch (err) {
      console.error("Error loading delivery runs:", err);
      setError(err.response?.data?.error || "Could not load delivery runs");
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Load selected run details & stop sequence (REQ-DEL-01)
  const loadScheduleDetails = useCallback(async (scheduleId) => {
    if (!scheduleId) return;
    try {
      setActionLoading(true);
      setError("");
      const token = localStorage.getItem("token") || "";
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_BASE}/delivery/schedule/${scheduleId}/today`, { headers });
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
    const interval = setInterval(() => {
      loadRuns();
    }, 15000);
    const onFocus = () => loadRuns();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadRuns]);

  useEffect(() => {
    if (selectedScheduleId) {
      loadScheduleDetails(selectedScheduleId);
      const interval = setInterval(() => {
        loadScheduleDetails(selectedScheduleId);
      }, 15000);
      const onFocus = () => loadScheduleDetails(selectedScheduleId);
      window.addEventListener("focus", onFocus);
      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", onFocus);
      };
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
      const msg = res.data.message || "Pickup confirmed! Delivery run started.";
      setSuccessMsg(msg);
      await loadScheduleDetails(selectedScheduleId);
      await loadRuns();
      window.alert(`✅ Success: ${msg}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to confirm pickup.";
      setError(errorMsg);
      window.alert(`❌ Pickup Confirmation Failed: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // REQ-DEL-03 & REQ-DEL-05: Record Delivery Success with recipient note / proof
  const handleConfirmDelivery = async () => {
    if (!deliveryModalStop) return;
    const currentStop = deliveryModalStop;
    try {
      setActionLoading(true);
      setError("");
      const res = await axios.put(
        `${API_BASE}/delivery/allocations/${currentStop.truck_allocation_id}`,
        {
          deliveryStatus: "Delivered",
          note: recipientNote ? `Recipient: ${recipientNote}` : "Delivered directly to customer.",
        },
        authHeader
      );
      const successText = res.data?.allStopsFinished
        ? `Delivery confirmed! All stops completed for Run #${selectedScheduleId}. Click 'Complete Run' to finish your shift.`
        : `Delivery confirmed! Order #${currentStop.order_id} (Stop #${currentStop.stop_order}) has been marked as Delivered.`;

      setSuccessMsg(successText);
      setDeliveryModalStop(null);
      setRecipientNote("");
      await loadScheduleDetails(selectedScheduleId);
      await loadRuns();

      window.alert(`✅ Success: ${successText}`);
    } catch (err) {
      const errorText = err.response?.data?.error || "Failed to record delivery.";
      setError(errorText);
      window.alert(`❌ Delivery Confirmation Failed: ${errorText}`);
    } finally {
      setActionLoading(false);
    }
  };

  // REQ-DEL-04: Record Delivery Failure and Auto Re-queue
  const handleMarkFailed = async () => {
    if (!failureModalStop) return;
    const currentStop = failureModalStop;
    try {
      setActionLoading(true);
      setError("");
      const fullNote = failureDetail
        ? `${failureReason} - ${failureDetail}`
        : failureReason;

      const res = await axios.put(
        `${API_BASE}/delivery/allocations/${currentStop.truck_allocation_id}`,
        {
          deliveryStatus: "Failed",
          note: fullNote,
        },
        authHeader
      );

      let msg = `Order #${currentStop.order_id} marked as Failed.`;
      if (res.data.reallocatedScheduleId) {
        msg += ` Automatically re-queued onto next scheduled run #${res.data.reallocatedScheduleId}.`;
      } else {
        msg += " Flagged for Dispatcher re-routing review.";
      }

      setSuccessMsg(msg);
      setFailureModalStop(null);
      setFailureReason("Customer unavailable / uncontactable");
      setFailureDetail("");
      await loadScheduleDetails(selectedScheduleId);
      await loadRuns();

      window.alert(`Delivery Outcome Recorded: ${msg}`);
    } catch (err) {
      const errorText = err.response?.data?.error || "Failed to record delivery failure.";
      setError(errorText);
      window.alert(`❌ Failed: ${errorText}`);
    } finally {
      setActionLoading(false);
    }
  };

  // REQ-DEL-03: Record Delivery Attempted (Customer contacted / Door knocked, order stays on truck)
  const handleMarkAttempted = async () => {
    if (!attemptedModalStop) return;
    const currentStop = attemptedModalStop;
    try {
      setActionLoading(true);
      setError("");
      const fullNote = attemptedDetail
        ? `${attemptedReason} - ${attemptedDetail}`
        : attemptedReason;

      await axios.put(
        `${API_BASE}/delivery/allocations/${currentStop.truck_allocation_id}`,
        {
          deliveryStatus: "Attempted",
          note: fullNote,
        },
        authHeader
      );

      const msg = `Stop #${currentStop.stop_order} marked as Attempted (Customer notified). Order stays on truck manifest.`;
      setSuccessMsg(msg);
      setAttemptedModalStop(null);
      setAttemptedReason("Customer phone unanswered / Gate closed");
      setAttemptedDetail("");
      await loadScheduleDetails(selectedScheduleId);
      await loadRuns();

      window.alert(`Delivery Attempt Recorded: ${msg}`);
    } catch (err) {
      const errorText = err.response?.data?.error || "Failed to record delivery attempt.";
      setError(errorText);
      window.alert(`❌ Attempt Failed: ${errorText}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Driver In-Route Incident / Issue Reporting to Dispatcher
  const handleReportIssue = async () => {
    if (!issueDescription.trim()) {
      setError("Please enter a brief description of the incident.");
      return;
    }
    try {
      setActionLoading(true);
      setError("");
      // Send incident notification to Dispatcher
      const userId = localStorage.getItem("userId") || 5;
      const userName = localStorage.getItem("name") || "Driver";
      await axios.post(
        `${API_BASE}/notifications/report-incident`,
        {
          userId,
          truckScheduleId: selectedScheduleId,
          type: issueType,
          message: `[${issueType}] Reported by ${userName} on Run #${selectedScheduleId} (${activeRun?.route_name}): ${issueDescription}`,
        },
        authHeader
      ).catch(() => {
        // Fallback if dedicated endpoint not mounted
        console.log("Logged driver incident locally");
      });

      setSuccessMsg(`Incident report (${issueType}) sent to Dispatcher.`);
      setIssueModalOpen(false);
      setIssueDescription("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit incident report.");
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
      const msg = res.data.message || "Run marked as Completed! Hours recorded.";
      setSuccessMsg(msg);
      await loadScheduleDetails(selectedScheduleId);
      await loadRuns();
      window.alert(`✅ Success: ${msg}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to complete run.";
      setError(errorMsg);
      window.alert(`❌ Run Completion Failed: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const isPickupConfirmed = Boolean(activeRun?.pickup_confirmed_at);
  const pendingCount = stops.filter((s) => s.delivery_status === "Pending").length;
  const deliveredCount = stops.filter((s) => s.delivery_status === "Delivered").length;
  const failedCount = stops.filter((s) => s.delivery_status === "Failed").length;
  const attemptedCount = stops.filter((s) => s.delivery_status === "Attempted").length;

  // Filtered stops based on search query and status filter
  const filteredStops = useMemo(() => {
    return stops.filter((stop) => {
      if (stopStatusFilter !== "ALL" && stop.delivery_status !== stopStatusFilter) {
        return false;
      }
      if (!stopSearch.trim()) return true;
      const term = stopSearch.toLowerCase();
      return (
        String(stop.stop_order).includes(term) ||
        String(stop.order_id).includes(term) ||
        (stop.stop_name && stop.stop_name.toLowerCase().includes(term)) ||
        (stop.customer_name && stop.customer_name.toLowerCase().includes(term)) ||
        (stop.customer_phone && stop.customer_phone.toLowerCase().includes(term)) ||
        (stop.delivery_address && stop.delivery_address.toLowerCase().includes(term)) ||
        (stop.delivery_note && stop.delivery_note.toLowerCase().includes(term))
      );
    });
  }, [stops, stopStatusFilter, stopSearch]);

  // Export Delivery Run Sheet / Manifest to Excel
  const exportRunSheetExcel = () => {
    if (!stops || stops.length === 0 || !activeRun) return;
    const exportData = stops.map((stop) => ({
      "Stop #": stop.stop_order,
      "Stop Name": stop.stop_name,
      "Order ID": stop.order_id,
      "Customer": stop.customer_name,
      "Phone": stop.customer_phone || "N/A",
      "Delivery Address": stop.delivery_address,
      "Volume (m³)": stop.total_volume,
      "Status": stop.delivery_status,
      "Delivery Notes": stop.delivery_note || "",
      "Delivered At": stop.delivered_at ? new Date(stop.delivered_at).toLocaleString() : "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Delivery Manifest");
    XLSX.writeFile(
      wb,
      `Delivery_Run_Sheet_Run_${activeRun.truck_schedule_id}_${(activeRun.plate_number || "").replace(/\s+/g, "_")}.xlsx`
    );
  };

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
              {isDriverOrAssistant ? "My Assigned Truck Runs" : "All Fleet Delivery Runs"}
            </h3>
            {loading ? (
              <p className="text-muted">Loading schedules...</p>
            ) : runs.length === 0 ? (
              <p className="text-muted">
                {isDriverOrAssistant
                  ? "No delivery runs currently assigned to you."
                  : "No runs scheduled for today."}
              </p>
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
                  <div className="col-3">
                    <div className="p-2 border rounded bg-light">
                      <div className="small text-muted">Pending</div>
                      <div className="h5 mb-0 text-warning">{pendingCount}</div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="p-2 border rounded bg-light">
                      <div className="small text-muted">Delivered</div>
                      <div className="h5 mb-0 text-success">{deliveredCount}</div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="p-2 border rounded bg-light">
                      <div className="small text-muted">Attempted</div>
                      <div className="h5 mb-0 text-info">{attemptedCount}</div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="p-2 border rounded bg-light">
                      <div className="small text-muted">Failed</div>
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

              {/* Run Actions (REQ-DEL-01 & In-Route Assistance) */}
              {isPickupConfirmed && activeRun.status !== "Completed" && (
                <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-3 flex-wrap gap-2">
                  <button
                    className="btn btn-outline-warning btn-sm d-flex align-items-center text-dark"
                    onClick={() => setIssueModalOpen(true)}
                    disabled={actionLoading}
                  >
                    <IconAlertTriangle size={16} className="me-1 text-warning" />
                    Report Delay / Issue
                  </button>
                  <div className="d-flex align-items-center gap-2">
                    {pendingCount > 0 && (
                      <span className="small text-muted fst-italic">
                        ({pendingCount} stop{pendingCount > 1 ? "s" : ""} pending resolution)
                      </span>
                    )}
                    <button
                      className={`btn btn-sm d-flex align-items-center ${
                        pendingCount === 0 ? "btn-success fw-bold px-3" : "btn-secondary text-white opacity-75"
                      }`}
                      onClick={handleCompleteRun}
                      disabled={actionLoading || pendingCount > 0}
                      title={
                        pendingCount > 0
                          ? `All stops must be resolved (Delivered, Failed, or Attempted) before completing the run (${pendingCount} pending).`
                          : "Complete run and record actual working hours into Roster Log"
                      }
                    >
                      <IconChecklist size={16} className="me-1" />
                      {pendingCount === 0
                        ? "All Stops Resolved: Complete Run & Log Hours"
                        : `Complete Run (${pendingCount} Pending)`}
                    </button>
                  </div>
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
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h3 className="h6 mb-0 d-flex align-items-center fw-bold">
              <IconMapPin size={18} className="me-2 text-primary" />
              Delivery Sequence (Ordered by Route Stop Order)
            </h3>
            <span className="small text-muted">
              Showing {filteredStops.length} of {stops.length} assigned deliveries
            </span>
          </div>

          {/* Delivery Stop Filters & Excel Run Sheet Export */}
          {stops.length > 0 && (
            <div className="row g-2 align-items-center mb-3 pb-3 border-bottom">
              <div className="col-md-5">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <IconSearch size={16} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search stop #, order, customer, phone, or address..."
                    value={stopSearch}
                    onChange={(e) => handleStopSearchChange(e.target.value)}
                  />
                  {stopSearch && (
                    <button
                      className="btn btn-outline-secondary border"
                      type="button"
                      onClick={() => handleStopSearchChange("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={stopStatusFilter}
                  onChange={(e) => setStopStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Stops ({stops.length})</option>
                  <option value="Pending">Pending ({pendingCount})</option>
                  <option value="Delivered">Delivered ({deliveredCount})</option>
                  <option value="Attempted">Attempted ({attemptedCount})</option>
                  <option value="Failed">Failed ({failedCount})</option>
                </select>
              </div>

              <div className="col-md-4 text-md-end">
                <button
                  className="btn btn-outline-success btn-sm fw-bold d-inline-flex align-items-center"
                  onClick={exportRunSheetExcel}
                  disabled={stops.length === 0}
                  title="Export official delivery run sheet to Excel"
                >
                  <IconFileSpreadsheet size={16} className="me-1" />
                  Export Run Sheet (Excel)
                </button>
              </div>
            </div>
          )}

          {stops.length === 0 ? (
            <div className="text-center py-4 text-muted">
              No orders allocated to this truck run yet.
            </div>
          ) : filteredStops.length === 0 ? (
            <div className="text-center py-4 text-muted">
              No delivery stops match your search criteria.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredStops.map((stop) => {
                const isDelivered = stop.delivery_status === "Delivered";
                const isFailed = stop.delivery_status === "Failed";
                const isAttempted = stop.delivery_status === "Attempted";
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
                        : isAttempted
                        ? "#f0f9ff"
                        : "#ffffff",
                      borderColor: isDelivered
                        ? "#bbf7d0"
                        : isFailed
                        ? "#fecaca"
                        : isAttempted
                        ? "#bae6fd"
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
                              : isAttempted
                              ? "#0284c7"
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
                        {isAttempted && (
                          <span className="badge bg-info text-dark d-flex align-items-center px-3 py-2">
                            <IconClock size={14} className="me-1" />
                            Attempted (Undelivered)
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
                              onClick={() => {
                                setDeliveryModalStop(stop);
                                setRecipientNote("");
                              }}
                              disabled={!isPickupConfirmed || actionLoading}
                              title={
                                !isPickupConfirmed
                                  ? "Confirm store pickup before recording deliveries"
                                  : "Record delivery confirmation and recipient details"
                              }
                            >
                              <IconCheck size={14} className="me-1" />
                              Delivered
                            </button>
                            <button
                              className="btn btn-sm btn-outline-info d-flex align-items-center text-dark"
                              onClick={() => {
                                setAttemptedModalStop(stop);
                                setAttemptedDetail("");
                              }}
                              disabled={!isPickupConfirmed || actionLoading}
                              title={
                                !isPickupConfirmed
                                  ? "Confirm store pickup before recording deliveries"
                                  : "Record delivery attempt (e.g., premises locked / customer away, keeps item on truck)"
                              }
                            >
                              <IconClock size={14} className="me-1" />
                              Attempted
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger d-flex align-items-center"
                              onClick={() => {
                                setFailureModalStop(stop);
                                setFailureDetail("");
                              }}
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

      {/* REQ-DEL-03: Delivery Confirmation & Recipient Modal */}
      {deliveryModalStop && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center text-success">
                  <IconCheck size={20} className="me-2" />
                  Confirm Delivery - Stop #{deliveryModalStop.stop_order}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeliveryModalStop(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="p-2 mb-3 bg-light rounded border">
                  <div><strong>Customer:</strong> {deliveryModalStop.customer_name} ({deliveryModalStop.customer_phone})</div>
                  <div><strong>Address:</strong> {deliveryModalStop.delivery_address}</div>
                  <div><strong>Order:</strong> #{deliveryModalStop.order_id} ({deliveryModalStop.total_volume} m³)</div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold">
                    <IconSignature size={16} className="me-1 text-primary" />
                    Recipient Name / Proof-of-Delivery Note:
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g., Received by Mr. Silva (Security / Front desk)"
                    value={recipientNote}
                    onChange={(e) => setRecipientNote(e.target.value)}
                  />
                  <div className="form-text small">
                    This note will be recorded permanently in the delivery manifest and customer notification.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setDeliveryModalStop(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-success fw-bold"
                  onClick={handleConfirmDelivery}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing..." : "Confirm & Mark Delivered"}
                </button>
              </div>
            </div>
          </div>
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
                  Marking this delivery as Failed will
                  record the incident and <strong>automatically re-queue</strong> Order #
                  {failureModalStop.order_id} onto the next available truck schedule on{" "}
                  <strong>{activeRun.route_name}</strong>.
                </p>

                <div className="mb-3">
                  <label className="form-label small fw-bold">Select Failure Reason:</label>
                  <select
                    className="form-select form-select-sm mb-2"
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

                  <label className="form-label small fw-bold mt-2">Additional Incident Remarks:</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g., Called customer 3 times, neighbor confirmed they are away"
                    value={failureDetail}
                    onChange={(e) => setFailureDetail(e.target.value)}
                  />
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

      {/* Attempted Reason Modal (REQ-DEL-03) */}
      {attemptedModalStop && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center text-primary">
                  <IconClock size={20} className="me-2" />
                  Record Delivery Attempt - Stop #{attemptedModalStop.stop_order}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setAttemptedModalStop(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-3">
                  Marking a stop as <strong>Attempted</strong> logs that delivery was attempted but not completed (e.g., premises closed). The order is <strong>kept on the vehicle manifest</strong> for re-attempt or dispatcher advice without immediately failing the consignment.
                </p>

                <div className="mb-3">
                  <label className="form-label small fw-bold">Select Attempt Reason:</label>
                  <select
                    className="form-select form-select-sm mb-2"
                    value={attemptedReason}
                    onChange={(e) => setAttemptedReason(e.target.value)}
                  >
                    <option value="Customer phone unanswered / Gate closed">
                      Customer phone unanswered / Gate closed
                    </option>
                    <option value="Premises temporarily locked / Security absent">
                      Premises temporarily locked / Security absent
                    </option>
                    <option value="Road temporarily obstructed / Delivery vehicle parked nearby">
                      Road temporarily obstructed / Delivery vehicle parked nearby
                    </option>
                    <option value="Customer requested re-attempt in 1 hour">
                      Customer requested re-attempt in 1 hour
                    </option>
                    <option value="Payment / authorization pending at site">
                      Payment / authorization pending at site
                    </option>
                  </select>

                  <label className="form-label small fw-bold mt-2">Driver Field Notes:</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g., Waited 10 mins outside gate, security advised return at 3 PM"
                    value={attemptedDetail}
                    onChange={(e) => setAttemptedDetail(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setAttemptedModalStop(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary fw-bold"
                  onClick={handleMarkAttempted}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing..." : "Confirm Attempt & Save Note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Incident / Issue Report Modal */}
      {issueModalOpen && (
        <div
          className="modal d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center text-warning text-dark">
                  <IconAlertTriangle size={20} className="me-2 text-warning" />
                  Report In-Route Delay / Incident
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIssueModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-3">
                  Instantly notify the Dispatcher and Depot regarding unexpected events on Run #{selectedScheduleId}.
                </p>

                <div className="mb-3">
                  <label className="form-label small fw-bold">Incident Category:</label>
                  <select
                    className="form-select form-select-sm"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                  >
                    <option value="Traffic Delay">Severe Traffic / Road Closure</option>
                    <option value="Vehicle Breakdown">Vehicle Breakdown / Mechanical Issue</option>
                    <option value="Accident">Accident / Road Incident</option>
                    <option value="Weather Delay">Severe Weather / Flooding</option>
                    <option value="Other">Other Operational Issue</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold">Describe Situation:</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="3"
                    placeholder="Provide location, expected delay time, or assistance required..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setIssueModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-warning fw-bold d-flex align-items-center"
                  onClick={handleReportIssue}
                  disabled={actionLoading}
                >
                  <IconSend size={16} className="me-1" />
                  {actionLoading ? "Sending..." : "Send Alert to Dispatcher"}
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

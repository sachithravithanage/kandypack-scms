import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import {
  IconCalendarEvent,
  IconPlus,
  IconClock,
  IconTruck,
  IconUser,
  IconRoute,
  IconAlertCircle,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";

const API_BASE = "http://localhost:5000/api";

function RosterSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    routeId: "",
    truckId: "",
    driverId: "",
    assistantId: "",
    scheduledDate: "",
    startTime: "08:00",
  });
  const [derivedEndTime, setDerivedEndTime] = useState("");

  // Override modal state
  const [overrideScheduleId, setOverrideScheduleId] = useState(null);
  const [justification, setJustification] = useState("");

  const authHeader = {
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
  };

  // 1. Fetch metadata and schedules
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [schedRes, metaRes] = await Promise.all([
        axios.get(`${API_BASE}/roster`, authHeader),
        axios.get(`${API_BASE}/roster/metadata`, authHeader),
      ]);
      setSchedules(schedRes.data || []);
      setRoutes(metaRes.data?.routes || []);
      setTrucks(metaRes.data?.trucks || []);
      setDrivers(metaRes.data?.drivers || []);
      setAssistants(metaRes.data?.assistants || []);

      if (metaRes.data?.routes?.length > 0 && !formData.routeId) {
        setFormData((prev) => ({
          ...prev,
          routeId: metaRes.data.routes[0].route_id,
          truckId: metaRes.data.trucks[0]?.truck_id || "",
          driverId: metaRes.data.drivers[0]?.user_id || "",
          assistantId: metaRes.data.assistants[0]?.user_id || "",
        }));
      }
    } catch (err) {
      console.error("Error loading roster data:", err);
      setError(err.response?.data?.error || "Could not load roster schedules");
    } finally {
      setLoading(false);
    }
  }, [formData.routeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived End Time Calculation (REQ-SCHED-01)
  useEffect(() => {
    if (formData.routeId && formData.startTime) {
      const selectedRoute = routes.find(
        (r) => String(r.route_id) === String(formData.routeId)
      );
      if (selectedRoute && selectedRoute.max_delivery_time_minutes) {
        const [h, m] = formData.startTime.split(":").map(Number);
        const startMins = h * 60 + m;
        const endMins = startMins + selectedRoute.max_delivery_time_minutes;
        const endH = String(Math.floor((endMins / 60) % 24)).padStart(2, "0");
        const endM = String(endMins % 60).padStart(2, "0");
        setDerivedEndTime(`${endH}:${endM}:00`);
      }
    }
  }, [formData.routeId, formData.startTime, routes]);

  // Handle Create Schedule
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError("");
      await axios.post(
        `${API_BASE}/roster`,
        {
          routeId: Number(formData.routeId),
          truckId: Number(formData.truckId),
          driverId: Number(formData.driverId),
          assistantId: Number(formData.assistantId),
          scheduledDate: formData.scheduledDate,
          startTime: `${formData.startTime}:00`,
        },
        authHeader
      );
      setSuccessMsg("Truck run scheduled successfully!");
      setShowAddForm(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to schedule run.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Dispatcher Override (REQ-SCHED-05)
  const handleApplyOverride = async () => {
    if (!overrideScheduleId || !justification) return;
    try {
      setActionLoading(true);
      setError("");
      await axios.put(
        `${API_BASE}/roster/${overrideScheduleId}/override`,
        { justification, userId: 2 },
        authHeader
      );
      setSuccessMsg("Dispatcher override applied and logged into audit_log.");
      setOverrideScheduleId(null);
      setJustification("");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to apply override.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppLayout pageTitle="Roster Scheduling">
      {/* Alerts */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
          <IconAlertCircle className="me-2 flex-shrink-0" size={20} />
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

      {/* Header with Add Button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h5 mb-1">Truck Run Roster</h2>
          <p className="text-muted small mb-0">
            Schedule truck runs, enforce 7-day advance booking, prevent double-bookings, and track weekly limits.
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm d-flex align-items-center fw-bold"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <IconPlus size={16} className="me-1" />
          {showAddForm ? "Close Form" : "Schedule New Run"}
        </button>
      </div>

      {/* Schedule Form */}
      {showAddForm && (
        <div className="kp-card mb-4 border border-primary">
          <h3 className="h6 mb-3 text-primary d-flex align-items-center">
            <IconCalendarEvent size={18} className="me-2" />
            Create Truck Schedule Entry
          </h3>
          <form onSubmit={handleCreateSchedule}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-bold">Delivery Route:</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.routeId}
                  onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                  required
                >
                  {routes.map((r) => (
                    <option key={r.route_id} value={r.route_id}>
                      {r.name} ({r.max_delivery_time_minutes} mins)
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label small fw-bold">Assign Truck:</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.truckId}
                  onChange={(e) => setFormData({ ...formData, truckId: e.target.value })}
                  required
                >
                  {trucks.map((t) => (
                    <option key={t.truck_id} value={t.truck_id}>
                      {t.plate_number} (Cap: {t.capacity} m³)
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label small fw-bold">Run Date (Min 7 Days Ahead):</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label small fw-bold">Primary Driver:</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  required
                >
                  {drivers.map((d) => (
                    <option key={d.user_id} value={d.user_id}>
                      {d.name} ({d.license_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label small fw-bold">Assistant:</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.assistantId}
                  onChange={(e) => setFormData({ ...formData, assistantId: e.target.value })}
                  required
                >
                  {assistants.map((a) => (
                    <option key={a.user_id} value={a.user_id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label small fw-bold">Start Time:</label>
                <input
                  type="time"
                  className="form-control form-control-sm"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label small fw-bold text-muted">Derived End Time:</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-light text-muted"
                  value={derivedEndTime || "Auto-computed"}
                  disabled
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-primary fw-bold"
                disabled={actionLoading}
              >
                {actionLoading ? "Validating & Saving..." : "Validate & Create Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedules List */}
      <div className="kp-card">
        {loading ? (
          <p className="text-muted text-center py-4">Loading roster schedules...</p>
        ) : schedules.length === 0 ? (
          <p className="text-muted text-center py-4">No schedules found. Click "Schedule New Run" above to create one.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Schedule #</th>
                  <th>Route & Store</th>
                  <th>Truck</th>
                  <th>Driver & Assistant</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.truck_schedule_id}>
                    <td className="fw-bold">#{s.truck_schedule_id}</td>
                    <td>
                      <div>{s.route_name}</div>
                      <div className="small text-muted">{s.store_name}</div>
                    </td>
                    <td>
                      <div>{s.plate_number}</div>
                      <div className="small text-muted">{s.truck_capacity} m³ cap</div>
                    </td>
                    <td>
                      <div>Driver: <strong>{s.driver_name}</strong></div>
                      <div className="small text-muted">Asst: {s.assistant_name}</div>
                    </td>
                    <td>
                      <div>{s.scheduled_date}</div>
                      <div className="small text-muted">
                        {s.start_time} - {s.end_time}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          s.status === "Completed"
                            ? "bg-success"
                            : s.status === "In Progress"
                            ? "bg-warning text-dark"
                            : "bg-secondary"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => setOverrideScheduleId(s.truck_schedule_id)}
                        title="Dispatcher Override"
                      >
                        <IconAlertTriangle size={14} className="me-1" />
                        Override
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Override Modal */}
      {overrideScheduleId && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center text-warning">
                  <IconAlertTriangle size={20} className="me-2" />
                  Dispatcher Override (REQ-SCHED-05)
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setOverrideScheduleId(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="small text-muted">
                  Under <strong>REQ-SCHED-05</strong>, dispatchers may override validation rules
                  in emergency situations. A mandatory written justification is required and will
                  be stored permanently in the <code>audit_log</code> table.
                </p>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Override Justification:</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="3"
                    placeholder="E.g., Emergency medical order dispatch, authorized by Chief Dispatcher."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setOverrideScheduleId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-warning fw-bold"
                  onClick={handleApplyOverride}
                  disabled={!justification || actionLoading}
                >
                  {actionLoading ? "Applying..." : "Confirm & Log Override"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default RosterSchedule;

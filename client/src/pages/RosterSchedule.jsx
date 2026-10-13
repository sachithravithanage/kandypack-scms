import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconCalendarEvent,
  IconPlus,
  IconAlertCircle,
  IconCheck,
  IconAlertTriangle,
  IconSearch,
  IconFileSpreadsheet,
  IconTrash,
  IconClock,
  IconTruck,
  IconUser,
  IconRefresh,
  IconBulb,
  IconBolt,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

const API_BASE = apiUrl("/api");

function RosterSchedule() {
  const roleId = Number(localStorage.getItem("roleId")) || 0;
  const canEditRoster = roleId === 1 || roleId === 2;
  const [schedules, setSchedules] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [driverHours, setDriverHours] = useState([]);
  const [demandList, setDemandList] = useState([]);
  const [showDemandWidget, setShowDemandWidget] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Filters & search
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [searchFilter, setSearchFilter] = useState(urlSearch);

  useEffect(() => {
    setSearchFilter(urlSearch);
  }, [urlSearch]);

  const handleSearchFilterChange = (val) => {
    setSearchFilter(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("search", val);
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  };
  const [statusFilter, setStatusFilter] = useState("ALL");

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

  const authHeader = useMemo(() => {
    return {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    };
  }, []);

  // 1. Fetch metadata, schedules, driver weekly hours, and demand heads-up
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";
      const headers = { Authorization: `Bearer ${token}` };
      const [schedRes, metaRes, hoursRes, demandRes] = await Promise.all([
        axios.get(`${API_BASE}/roster`, { headers }),
        axios.get(`${API_BASE}/roster/metadata`, { headers }),
        axios.get(`${API_BASE}/roster/driver-hours`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/roster/demand-heads-up`, { headers }).catch(() => ({ data: [] })),
      ]);
      setSchedules(schedRes.data || []);
      setRoutes(metaRes.data?.routes || []);
      setTrucks(metaRes.data?.trucks || []);
      setDrivers(metaRes.data?.drivers || []);
      setAssistants(metaRes.data?.assistants || []);
      setDriverHours(hoursRes.data || []);
      setDemandList(demandRes.data || []);

      if (metaRes.data?.routes?.length > 0) {
        setFormData((prev) => {
          if (prev.routeId) return prev;
          return {
            ...prev,
            routeId: metaRes.data.routes[0].route_id,
            truckId: metaRes.data.trucks[0]?.truck_id || "",
            driverId: metaRes.data.drivers[0]?.user_id || "",
            assistantId: metaRes.data.assistants[0]?.user_id || "",
          };
        });
      }
    } catch (err) {
      console.error("Error loading roster data:", err);
      setError(err.response?.data?.error || "Could not load roster schedules");
    } finally {
      setLoading(false);
    }
  }, []);

  // Quick auto-fill schedule form from upcoming demand alert
  const handleApplyDemand = (item) => {
    setFormData((prev) => ({
      ...prev,
      routeId: item.route_id,
      scheduledDate: item.requested_delivery_date,
      startTime: "08:00",
    }));
    setShowAddForm(true);
    setSuccessMsg(`Applied demand suggestion for ${item.route_name} on ${item.requested_delivery_date}. Select a driver and truck to schedule.`);
  };

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

  const getDriverWeeklyHours = (driverId) => {
    const found = driverHours.find((h) => String(h.driver_id) === String(driverId));
    return found ? Number(found.hours_worked_this_week || 0).toFixed(1) : null;
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
      if (!matchesStatus) return false;
      if (!searchFilter.trim()) return true;
      const term = searchFilter.toLowerCase();
      const schedDate = s.scheduled_date ? new Date(s.scheduled_date).toISOString().slice(0, 10) : "";
      return (
        String(s.truck_schedule_id).toLowerCase().includes(term) ||
        (s.route_name && s.route_name.toLowerCase().includes(term)) ||
        (s.store_name && s.store_name.toLowerCase().includes(term)) ||
        (s.plate_number && s.plate_number.toLowerCase().includes(term)) ||
        (s.driver_name && s.driver_name.toLowerCase().includes(term)) ||
        (s.assistant_name && s.assistant_name.toLowerCase().includes(term)) ||
        schedDate.includes(term)
      );
    });
  }, [schedules, statusFilter, searchFilter]);

  // Export to Excel
  const exportRosterExcel = () => {
    if (!filteredSchedules || filteredSchedules.length === 0) return;
    const exportData = filteredSchedules.map((s) => ({
      "Schedule #": s.truck_schedule_id,
      "Route": s.route_name,
      "Store": s.store_name,
      "Truck Plate": s.plate_number,
      "Capacity (m³)": s.truck_capacity,
      "Driver": s.driver_name,
      "Assistant": s.assistant_name,
      "Scheduled Date": s.scheduled_date ? new Date(s.scheduled_date).toISOString().slice(0, 10) : "",
      "Start Time": s.start_time,
      "End Time": s.end_time,
      "Status": s.status,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Truck Roster");
    XLSX.writeFile(wb, `Truck_Roster_Schedules_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

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
      const data = err.response?.data;
      if (data?.violations && Array.isArray(data.violations) && data.violations.length > 0) {
        setError(data.violations.map((v) => v.message).join(" • "));
      } else {
        setError(data?.error || "Failed to schedule run.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete / Cancel Schedule
  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm(`Are you sure you want to cancel and remove Schedule #${scheduleId}? This will free up the truck and crew.`)) {
      return;
    }
    try {
      setActionLoading(true);
      setError("");
      await axios.delete(`${API_BASE}/roster/${scheduleId}`, authHeader);
      setSuccessMsg(`Truck schedule #${scheduleId} cancelled and deleted successfully.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete schedule.");
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

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-0">Weekly duty assignment and statutory hours monitoring for drivers and assistants.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary btn-sm d-flex align-items-center"
            onClick={loadData}
            title="Refresh Roster"
            disabled={loading}
          >
            <IconRefresh size={16} className={`me-1 ${loading ? "fa-spin" : ""}`} />
            Refresh
          </button>
          <button
            className="btn btn-primary btn-sm d-flex align-items-center fw-bold"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <IconPlus size={16} className="me-1" />
            {showAddForm ? "Close Form" : "Schedule New Run"}
          </button>
        </div>
      </div>

      {/* ── Upcoming Demand Heads-Up Widget ─────────────────────────── */}
      <div
        className="kp-card mb-4 border-0 shadow-sm"
        style={{
          background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)",
          borderLeft: "4px solid #206bc4",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="p-2 rounded-circle bg-primary-subtle text-primary d-inline-flex">
              <IconBulb size={20} />
            </span>
            <div>
              <h3 className="h6 mb-0 text-primary fw-bold">
                Upcoming Demand Heads-Up (Lead-Time Intelligence)
              </h3>
              <p className="text-muted small mb-0">
                Aggregated from customer orders placed with required lead-time. Identifies routes needing truck rosters.
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary text-white rounded-pill px-2 py-1 small">
              {demandList.length} Route Demands
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              onClick={() => setShowDemandWidget(!showDemandWidget)}
              title="Toggle Demand View"
            >
              {showDemandWidget ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </button>
          </div>
        </div>

        {showDemandWidget && (
          <div className="mt-3">
            {demandList.length === 0 ? (
              <div className="alert alert-light border text-muted small py-2 mb-0 d-flex align-items-center">
                <IconCheck size={16} className="text-success me-2" />
                All current pending orders are assigned or no unallocated customer orders waiting for future dates.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0 bg-white rounded shadow-sm border">
                  <thead className="table-light small">
                    <tr>
                      <th>Target Delivery Date</th>
                      <th>Route / Depot</th>
                      <th>Service Days</th>
                      <th className="text-center">Orders</th>
                      <th className="text-center">Volume</th>
                      <th className="text-center">Roster Coverage</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody className="small">
                    {demandList.map((item, idx) => {
                      const isCovered = item.scheduled_trucks >= item.suggested_trucks;
                      const is7DaysPlus = item.days_ahead >= 7;
                      return (
                        <tr key={`${item.route_id}-${item.requested_delivery_date}-${idx}`}>
                          <td>
                            <div className="fw-bold text-dark">{item.requested_delivery_date}</div>
                            <span
                              className={`badge ${
                                is7DaysPlus
                                  ? "bg-success-subtle text-success"
                                  : "bg-warning-subtle text-warning"
                              } border small`}
                              style={{ fontSize: "0.72rem" }}
                            >
                              {item.days_ahead >= 0 ? `+${item.days_ahead}d lead` : `${item.days_ahead}d`} {is7DaysPlus ? "✓ Normal" : "⚠️ <7d Override"}
                            </span>
                          </td>
                          <td>
                            <div className="fw-bold">{item.route_name}</div>
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                              {item.store_name}
                            </div>
                          </td>
                          <td className="text-muted" style={{ fontSize: "0.8rem" }}>
                            {item.service_days || "Daily"}
                          </td>
                          <td className="text-center">
                            <span className="badge bg-secondary-subtle text-secondary fw-bold">
                              {item.total_orders} {item.total_orders === 1 ? "order" : "orders"}
                            </span>
                          </td>
                          <td className="text-center fw-semibold text-secondary">
                            {item.total_volume_m3} m³
                          </td>
                          <td className="text-center">
                            {isCovered ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle">
                                ✓ Covered ({item.scheduled_trucks}/{item.suggested_trucks} trucks)
                              </span>
                            ) : (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                ⚠️ Needs Truck ({item.scheduled_trucks}/{item.suggested_trucks} rostered)
                              </span>
                            )}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-xs btn-primary d-inline-flex align-items-center gap-1 py-1 px-2"
                              style={{ fontSize: "0.78rem" }}
                              onClick={() => handleApplyDemand(item)}
                              title="Auto-fill schedule form with this route and date"
                            >
                              <IconBolt size={14} />
                              Auto-Fill Run
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Form */}
      {showAddForm && (
        <div className="kp-card mb-4 border border-primary shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="h6 mb-0 text-primary fw-bold d-flex align-items-center">
              <IconCalendarEvent size={18} className="me-2" />
              Create Truck Schedule Entry
            </h3>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle small">
              Advance Booking (7 Days Rule)
            </span>
          </div>

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
                      {r.name} ({r.max_delivery_time_minutes} mins) - {r.store_name}
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
                      {t.plate_number} (Capacity: {t.capacity} m³)
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
                <label className="form-label small fw-bold d-flex justify-content-between">
                  <span>Primary Driver:</span>
                  {formData.driverId && getDriverWeeklyHours(formData.driverId) !== null && (
                    <span className="text-primary fw-normal">
                      Logged: {getDriverWeeklyHours(formData.driverId)} / 40.0h
                    </span>
                  )}
                </label>
                <select
                  className="form-select form-select-sm"
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  required
                >
                  {drivers.map((d) => {
                    const hrs = getDriverWeeklyHours(d.user_id);
                    return (
                      <option key={d.user_id} value={d.user_id}>
                        {d.name} ({d.license_number}) {hrs !== null ? `— ${hrs} / 40h this week` : ""}
                      </option>
                    );
                  })}
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
                      {a.name} (Max 60h/week)
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

      {/* Roster Controls: Search, Filter, Excel Export */}
      <div className="kp-card mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0">
                <IconSearch size={16} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search schedule #, route, store, truck, or driver..."
                value={searchFilter}
                onChange={(e) => handleSearchFilterChange(e.target.value)}
              />
              {searchFilter && (
                <button
                  className="btn btn-outline-secondary border"
                  type="button"
                  onClick={() => handleSearchFilterChange("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses ({schedules.length})</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="col-md-4 text-md-end">
            <button
              className="btn btn-outline-success btn-sm fw-bold d-inline-flex align-items-center"
              onClick={exportRosterExcel}
              disabled={filteredSchedules.length === 0}
              title="Export visible schedule roster to Excel"
            >
              <IconFileSpreadsheet size={16} className="me-1" />
              Export Roster (Excel)
            </button>
          </div>
        </div>
      </div>

      {/* Schedules List */}
      <div className="kp-card">
        {loading ? (
          <p className="text-muted text-center py-4">Loading roster schedules...</p>
        ) : filteredSchedules.length === 0 ? (
          <p className="text-muted text-center py-4">
            {searchFilter || statusFilter !== "ALL"
              ? "No schedules match your search filters."
              : 'No schedules found. Click "Schedule New Run" above to create one.'}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle table-hover">
              <thead>
                <tr>
                  <th>Schedule #</th>
                  <th>Route & Store</th>
                  <th>Truck</th>
                  <th>Crew (Driver / Assistant)</th>
                  <th>Date & Window</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((s) => {
                  const schedDate = s.scheduled_date
                    ? new Date(s.scheduled_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—";

                  return (
                    <tr key={s.truck_schedule_id}>
                      <td className="fw-bold text-primary">#{s.truck_schedule_id}</td>
                      <td>
                        <div className="fw-semibold">{s.route_name}</div>
                        <div className="small text-muted">{s.store_name}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <IconTruck size={15} className="me-1 text-muted" />
                          <span className="fw-semibold">{s.plate_number}</span>
                        </div>
                        <div className="small text-muted">{s.truck_capacity} m³ capacity</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <IconUser size={15} className="me-1 text-primary" />
                          <span>Driver: <strong>{s.driver_name}</strong></span>
                        </div>
                        <div className="small text-muted ps-4">
                          Asst: {s.assistant_name}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold">{schedDate}</div>
                        <div className="small text-muted d-flex align-items-center">
                          <IconClock size={13} className="me-1" />
                          {s.start_time} &ndash; {s.end_time}
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
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {s.status !== "Completed" && (
                            <button
                              className="btn btn-outline-warning btn-sm"
                              onClick={() => setOverrideScheduleId(s.truck_schedule_id)}
                              title="Dispatcher Override"
                            >
                              <IconAlertTriangle size={14} className="me-1" />
                              Override
                            </button>
                          )}
                          {s.status === "Scheduled" && (
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDeleteSchedule(s.truck_schedule_id)}
                              title="Cancel & Delete Schedule"
                              disabled={actionLoading}
                            >
                              <IconTrash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <h5 className="modal-title d-flex align-items-center text-warning fw-bold">
                  <IconAlertTriangle size={20} className="me-2" />
                  Dispatcher Override
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setOverrideScheduleId(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="small text-muted">
                  Dispatchers may override validation rules
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

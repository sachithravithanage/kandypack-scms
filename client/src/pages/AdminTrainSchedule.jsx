import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconTrain,
  IconPlus,
  IconClock,
  IconMapPin,
  IconCheck,
  IconAlertCircle,
  IconFilter,
  IconBox,
} from "@tabler/icons-react";

const API_BASE = apiUrl("/api");

function AdminTrainSchedule() {
  const [trips, setTrips] = useState([]);
  const roleId = Number(localStorage.getItem("roleId")) || 0;
  const [trains, setTrains] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCity, setFilterCity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [form, setForm] = useState({
    trainId: "",
    destinationCityId: "",
    departureDatetime: "",
    arrivalDatetime: "",
    totalCapacity: "1000",
  });
  const [submitting, setSubmitting] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tripsRes, trainsRes, citiesRes] = await Promise.all([
        axios.get(`${API_BASE}/rail/train-trips`, getAuthHeader()),
        axios.get(`${API_BASE}/rail/trains`, getAuthHeader()),
        axios.get(`${API_BASE}/cities`),
      ]);
      setTrips(tripsRes.data || []);
      setTrains(trainsRes.data || []);
      setCities(citiesRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load train schedules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.trainId || !form.destinationCityId || !form.departureDatetime || !form.arrivalDatetime || !form.totalCapacity) {
      setError("Please fill in all required fields.");
      return;
    }

    if (new Date(form.arrivalDatetime) <= new Date(form.departureDatetime)) {
      setError("Arrival time must be strictly after departure time.");
      return;
    }

    if (Number(form.totalCapacity) <= 0) {
      setError("Cargo capacity must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE}/rail/train-trips`,
        {
          trainId: Number(form.trainId),
          destinationCityId: Number(form.destinationCityId),
          departureDatetime: form.departureDatetime,
          arrivalDatetime: form.arrivalDatetime,
          totalCapacity: Number(form.totalCapacity),
        },
        getAuthHeader()
      );

      setSuccess("New train trip schedule created successfully!");
      setShowAddModal(false);
      setForm({
        trainId: "",
        destinationCityId: "",
        departureDatetime: "",
        arrivalDatetime: "",
        totalCapacity: "1000",
      });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create train trip schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTripId = (id) => `TRP-${String(id).padStart(3, "0")}`;

  const formatDateTime = (dtStr) => {
    if (!dtStr) return "—";
    const d = new Date(dtStr);
    return isNaN(d.getTime()) ? dtStr : d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Scheduled":
        return "kp-badge-info";
      case "Loading":
        return "kp-badge-warning";
      case "Loaded":
      case "In Transit":
        return "kp-badge-success";
      case "Arrived":
      case "Completed":
        return "kp-badge-success";
      case "Cancelled":
        return "kp-badge-danger";
      default:
        return "kp-badge-info";
    }
  };

  const getCapacityBarColor = (percent) => {
    if (percent >= 90) return "var(--color-danger, #e53e3e)";
    if (percent >= 70) return "var(--color-warning, #d69e2e)";
    return "var(--color-primary, #3182ce)";
  };

  const filteredTrips = trips.filter((t) => {
    if (filterCity && String(t.destination_city_id) !== String(filterCity)) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <AppLayout pageTitle="Train Schedule Management">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1" style={{ fontWeight: 600, fontSize: "1.5rem" }}>
            Train Schedule Management
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
            Manage Kandy hub outbound rail schedules, destinations, and capacities (REQ-RAIL-01)
          </p>
        </div>
        {(roleId === 1 || roleId === 2) && (
          <button
            className="btn btn-primary d-inline-flex align-items-center gap-2"
            onClick={() => {
              setShowAddModal(true);
              setError("");
              setSuccess("");
            }}
          >
            <IconPlus size={18} />
            <span>Add Schedule</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2" role="alert">
          <IconAlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2" role="alert">
          <IconCheck size={20} />
          <div>{success}</div>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="kp-stat-grid mb-4">
        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-info-bg)" }}>
            <IconTrain size={20} color="var(--color-info-text)" />
          </div>
          <p className="kp-stat-label">Total Outbound Trips</p>
          <p className="kp-stat-value mb-0">{trips.length}</p>
        </div>
        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-warning-bg)" }}>
            <IconClock size={20} color="var(--color-warning-text)" />
          </div>
          <p className="kp-stat-label">Scheduled / Loading</p>
          <p className="kp-stat-value mb-0">
            {trips.filter((t) => ["Scheduled", "Loading"].includes(t.status)).length}
          </p>
        </div>
        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-success-bg)" }}>
            <IconBox size={20} color="var(--color-success-text)" />
          </div>
          <p className="kp-stat-label">Loaded / In Transit</p>
          <p className="kp-stat-value mb-0">
            {trips.filter((t) => ["Loaded", "In Transit"].includes(t.status)).length}
          </p>
        </div>
      </div>

      {/* Modal / Add Form */}
      {showAddModal && (
        <div className="kp-card mb-4" style={{ borderLeft: "4px solid var(--color-primary, #3182ce)" }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0" style={{ fontWeight: 600 }}>
              <IconTrain size={20} className="me-2 text-primary" />
              Define New Train Trip
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setShowAddModal(false)}
            ></button>
          </div>
          <form onSubmit={handleCreateTrip}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label" style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                  Train <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.trainId}
                  onChange={(e) => setForm({ ...form, trainId: e.target.value })}
                  required
                >
                  <option value="">Select a train...</option>
                  {trains.map((tr) => (
                    <option key={tr.train_id} value={tr.train_id}>
                      {tr.name} (ID: #{tr.train_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label" style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                  Destination City <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.destinationCityId}
                  onChange={(e) => setForm({ ...form, destinationCityId: e.target.value })}
                  required
                >
                  <option value="">Select destination...</option>
                  {cities.map((c) => (
                    <option key={c.city_id} value={c.city_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label" style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                  Total Cargo Capacity (units) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="form-control"
                  placeholder="e.g. 1000"
                  value={form.totalCapacity}
                  onChange={(e) => setForm({ ...form, totalCapacity: e.target.value })}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label" style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                  Departure Datetime (from Kandy) <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={form.departureDatetime}
                  onChange={(e) => setForm({ ...form, departureDatetime: e.target.value })}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label" style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                  Arrival Datetime (at Destination) <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={form.arrivalDatetime}
                  onChange={(e) => setForm({ ...form, arrivalDatetime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Trip Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Trips Card */}
      <div className="kp-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          className="d-flex justify-content-between align-items-center p-3 border-bottom flex-wrap gap-2"
          style={{ background: "var(--color-surface-subtle, #fafafa)" }}
        >
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontWeight: 600, fontSize: "1rem" }}>
              All Trips ({filteredTrips.length})
            </span>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-1">
              <IconFilter size={16} className="text-muted" />
              <select
                className="form-select form-select-sm"
                style={{ width: "auto", minWidth: "140px" }}
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
              >
                <option value="">All Destinations</option>
                {cities.map((c) => (
                  <option key={c.city_id} value={c.city_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <select
              className="form-select form-select-sm"
              style={{ width: "auto", minWidth: "130px" }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Loading">Loading</option>
              <option value="Loaded">Loaded</option>
              <option value="In Transit">In Transit</option>
              <option value="Arrived">Arrived</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border spinner-border-sm me-2" role="status" />
            Loading schedules...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <IconTrain size={40} className="mb-2 text-muted" stroke={1.5} />
            <p className="mb-0">No train trip schedules found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light text-uppercase" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                <tr>
                  <th className="ps-3">Trip ID</th>
                  <th>Train</th>
                  <th>Destination</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th style={{ minWidth: "160px" }}>Capacity Usage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((t) => {
                  const used = Number(t.used_capacity || 0);
                  const total = Number(t.total_capacity || 0);
                  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                  const barColor = getCapacityBarColor(pct);

                  return (
                    <tr key={t.trip_id}>
                      <td className="ps-3">
                        <span className="badge bg-light text-dark border font-monospace">
                          {formatTripId(t.trip_id)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{t.train_name || `Train #${t.train_id}`}</span>
                      </td>
                      <td>
                        <span className="d-inline-flex align-items-center gap-1">
                          <IconMapPin size={15} className="text-muted" />
                          {t.destination_city}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        {formatDateTime(t.departure_datetime)}
                      </td>
                      <td style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                        {formatDateTime(t.arrival_datetime)}
                      </td>
                      <td>
                        <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: "0.8rem" }}>
                          <span>{used} / {total} units</span>
                          <span style={{ fontWeight: 600, color: barColor }}>{pct}%</span>
                        </div>
                        <div
                          className="progress"
                          style={{ height: "6px", backgroundColor: "#e2e8f0" }}
                        >
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: barColor,
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <span className={`kp-badge ${getStatusBadgeClass(t.status)}`}>
                          {t.status || "Scheduled"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default AdminTrainSchedule;

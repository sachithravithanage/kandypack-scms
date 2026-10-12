import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import {
        IconTrain,
        IconPackage,
        IconAlertTriangle,
        IconCheck,
        IconAlertCircle,
        IconArrowRight,
        IconRefresh,
        IconClock,
        IconMapPin,
        IconBoxSeam,
        IconTransferIn,
} from "@tabler/icons-react";

const API_BASE = "http://localhost:5000/api";

function DispatcherTrainLoading() {
        const [trips, setTrips] = useState([]);
        const [cities, setCities] = useState([]);
        const [selectedCityId, setSelectedCityId] = useState("");
        const [selectedTripId, setSelectedTripId] = useState(null);

        const [tripDetail, setTripDetail] = useState(null);
        const [allocations, setAllocations] = useState([]);
        const [loadingTrips, setLoadingTrips] = useState(true);
        const [loadingDetail, setLoadingDetail] = useState(false);

        const [error, setError] = useState("");
        const [success, setSuccess] = useState("");

        // Allocation form state
        const [allocForm, setAllocForm] = useState({ orderItemId: "", quantity: "" });
        const [allocating, setAllocating] = useState(false);

        // Shortfall modal / state
        const [shortfallModal, setShortfallModal] = useState({
                show: false,
                allocationId: null,
                maxQty: 0,
                unloadedQuantity: "",
        });
        const [submittingShortfall, setSubmittingShortfall] = useState(false);

        const getAuthHeader = () => {
                const token = localStorage.getItem("token");
                return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        };

        const loadTripsAndCities = useCallback(async () => {
                setLoadingTrips(true);
                try {
                        const [tripsRes, citiesRes] = await Promise.all([
                                axios.get(`${API_BASE}/rail/train-trips`, getAuthHeader()),
                                axios.get(`${API_BASE}/cities`),
                        ]);
                        const tripList = tripsRes.data || [];
                        setTrips(tripList);
                        setCities(citiesRes.data || []);

                        if (tripList.length > 0 && !selectedTripId) {
                                setSelectedTripId(tripList[0].trip_id);
                        }
                } catch (err) {
                        setError(err.response?.data?.error || "Failed to load train trips");
                } finally {
                        setLoadingTrips(false);
                }
        }, [selectedTripId]);

        useEffect(() => {
                loadTripsAndCities();
        }, [loadTripsAndCities]);

        const loadTripDetail = useCallback(async (tripId) => {
                if (!tripId) return;
                setLoadingDetail(true);
                setError("");
                try {
                        const res = await axios.get(
                                `${API_BASE}/rail/train-trips/${tripId}`,
                                getAuthHeader()
                        );
                        setTripDetail(res.data.trip);
                        setAllocations(res.data.allocations || []);
                } catch (err) {
                        setError(err.response?.data?.error || "Failed to load trip manifest");
                } finally {
                        setLoadingDetail(false);
                }
        }, []);

        useEffect(() => {
                if (selectedTripId) {
                        loadTripDetail(selectedTripId);
                }
        }, [selectedTripId, loadTripDetail]);

        const handleStatusChange = async (allocationId, newStatus) => {
                setError("");
                setSuccess("");
                try {
                        const res = await axios.put(
                                `${API_BASE}/rail/allocations/${allocationId}/loading-status`,
                                { status: newStatus },
                                getAuthHeader()
                        );
                        if (res.data.tripLocked) {
                                setSuccess("All items marked Loaded! Trip manifest is now locked and orders advanced to 'In Transit'.");
                        } else {
                                setSuccess(`Allocation updated to ${newStatus}`);
                        }
                        loadTripDetail(selectedTripId);
                        loadTripsAndCities();
                } catch (err) {
                        setError(err.response?.data?.error || "Failed to update loading status");
                }
        };

        const handleMarkAllLoaded = async () => {
                if (!allocations.length) return;
                setError("");
                setSuccess("");
                try {
                        for (const a of allocations) {
                                if (a.status !== "Loaded") {
                                        await axios.put(
                                                `${API_BASE}/rail/allocations/${a.cargo_allocation_id}/loading-status`,
                                                { status: "Loaded" },
                                                getAuthHeader()
                                        );
                                }
                        }
                        setSuccess("Manifest locked! All orders on this trip are now 'In Transit'.");
                        loadTripDetail(selectedTripId);
                        loadTripsAndCities();
                } catch (err) {
                        setError(err.response?.data?.error || "Failed to lock all allocations");
                }
        };

        const handleManualAllocate = async (useOverflow = false) => {
                if (!allocForm.orderItemId || !allocForm.quantity || Number(allocForm.quantity) <= 0) {
                        setError("Please specify a valid Order Item ID and positive quantity.");
                        return;
                }
                setError("");
                setSuccess("");
                setAllocating(true);
                try {
                        const endpoint = useOverflow
                                ? `${API_BASE}/rail/train-trips/${selectedTripId}/allocate-overflow`
                                : `${API_BASE}/rail/train-trips/${selectedTripId}/allocate`;

                        const res = await axios.post(
                                endpoint,
                                {
                                        orderItemId: Number(allocForm.orderItemId),
                                        quantity: Number(allocForm.quantity),
                                },
                                getAuthHeader()
                        );

                        setSuccess(res.data.message || "Cargo successfully allocated to trip!");
                        setAllocForm({ orderItemId: "", quantity: "" });
                        loadTripDetail(selectedTripId);
                        loadTripsAndCities();
                } catch (err) {
                        setError(err.response?.data?.error || "Allocation failed");
                } finally {
                        setAllocating(false);
                }
        };

        const handleShortfallSubmit = async (e) => {
                e.preventDefault();
                const unloaded = Number(shortfallModal.unloadedQuantity);
                if (!unloaded || unloaded <= 0 || unloaded >= shortfallModal.maxQty) {
                        setError(`Shortfall quantity must be between 1 and ${shortfallModal.maxQty - 1}`);
                        return;
                }

                setSubmittingShortfall(true);
                setError("");
                try {
                        const res = await axios.post(
                                `${API_BASE}/rail/allocations/${shortfallModal.allocationId}/shortfall`,
                                { unloadedQuantity: unloaded },
                                getAuthHeader()
                        );

                        setSuccess(
                                `Shortfall recorded! ${unloaded} units requeued to next scheduled trip (Trip #${res.data.nextTripId}).`
                        );
                        setShortfallModal({ show: false, allocationId: null, maxQty: 0, unloadedQuantity: "" });
                        loadTripDetail(selectedTripId);
                        loadTripsAndCities();
                } catch (err) {
                        setError(err.response?.data?.error || "Failed to requeue loading shortfall");
                } finally {
                        setSubmittingShortfall(false);
                }
        };

        const formatTripId = (id) => `TRP-${String(id).padStart(3, "0")}`;

        const formatDateTime = (dtStr) => {
                if (!dtStr) return "—";
                const d = new Date(dtStr);
                return isNaN(d.getTime()) ? dtStr : d.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                });
        };

        const filteredTrips = trips.filter((t) => {
                if (selectedCityId && String(t.destination_city_id) !== String(selectedCityId)) {
                        return false;
                }
                return true;
        });

        const usedCap = tripDetail ? Number(allocations.reduce((acc, a) => acc + Number(a.allocated_quantity || 0), 0)) : 0;
        const totalCap = tripDetail ? Number(tripDetail.total_capacity || 0) : 0;
        const capPct = totalCap > 0 ? Math.min(100, Math.round((usedCap / totalCap) * 100)) : 0;
        const remainingCap = Math.max(0, totalCap - usedCap);
        const isNearCapacity = capPct >= 90;

        return (
                <AppLayout pageTitle="Train Loading">
                        <div className="mb-4">
                                <h2 className="mb-1" style={{ fontWeight: 600, fontSize: "1.5rem" }}>
                                        Train Loading
                                </h2>
                                <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                                        Allocate orders to train trips and track physical loading
                                </p>
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

                        <div className="row g-4">
                                {/* Left Column: Select Trip */}
                                <div className="col-lg-4">
                                        <div className="kp-card mb-4">
                                                <h5 className="mb-3" style={{ fontWeight: 600 }}>
                                                        Select Trip
                                                </h5>
                                                <div className="mb-3">
                                                        <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                                                                Destination City
                                                        </label>
                                                        <select
                                                                className="form-select"
                                                                value={selectedCityId}
                                                                onChange={(e) => setSelectedCityId(e.target.value)}
                                                        >
                                                                <option value="">All Destinations</option>
                                                                {cities.map((c) => (
                                                                        <option key={c.city_id} value={c.city_id}>
                                                                                {c.name}
                                                                        </option>
                                                                ))}
                                                        </select>
                                                </div>

                                                <div
                                                        className="list-group"
                                                        style={{ maxHeight: "550px", overflowY: "auto", gap: "0.5rem" }}
                                                >
                                                        {loadingTrips ? (
                                                                <div className="text-center py-4 text-muted">
                                                                        <div className="spinner-border spinner-border-sm me-2" role="status" />
                                                                        Loading trips...
                                                                </div>
                                                        ) : filteredTrips.length === 0 ? (
                                                                <p className="text-muted text-center py-4 mb-0" style={{ fontSize: "0.9rem" }}>
                                                                        No trips found for selected city.
                                                                </p>
                                                        ) : (
                                                                filteredTrips.map((t) => {
                                                                        const isSelected = t.trip_id === selectedTripId;
                                                                        return (
                                                                                <button
                                                                                        key={t.trip_id}
                                                                                        type="button"
                                                                                        className={`list-group-item list-group-item-action p-3 rounded border text-start ${isSelected ? "active" : ""
                                                                                                }`}
                                                                                        style={{
                                                                                                backgroundColor: isSelected ? "var(--color-primary-bg, #ebf8ff)" : undefined,
                                                                                                borderColor: isSelected ? "var(--color-primary, #3182ce)" : undefined,
                                                                                        }}
                                                                                        onClick={() => setSelectedTripId(t.trip_id)}
                                                                                >
                                                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                                                                <span
                                                                                                        className="font-monospace"
                                                                                                        style={{
                                                                                                                fontWeight: 700,
                                                                                                                color: isSelected ? "var(--color-primary, #2b6cb0)" : undefined,
                                                                                                        }}
                                                                                                >
                                                                                                        {formatTripId(t.trip_id)}
                                                                                                </span>
                                                                                                <span
                                                                                                        className={`badge ${t.status === "Loaded"
                                                                                                                ? "bg-success"
                                                                                                                : t.status === "Loading"
                                                                                                                        ? "bg-warning text-dark"
                                                                                                                        : "bg-info text-dark"
                                                                                                                }`}
                                                                                                        style={{ fontSize: "0.75rem" }}
                                                                                                >
                                                                                                        {t.status || "Scheduled"}
                                                                                                </span>
                                                                                        </div>
                                                                                        <div className="d-flex align-items-center gap-1 mb-1" style={{ fontSize: "0.85rem" }}>
                                                                                                <IconMapPin size={14} className="text-muted" />
                                                                                                <span style={{ fontWeight: 500 }}>{t.destination_city}</span>
                                                                                                <span className="text-muted ms-1">({t.train_name})</span>
                                                                                        </div>
                                                                                        <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: "0.8rem" }}>
                                                                                                <IconClock size={13} />
                                                                                                <span>Dep: {formatDateTime(t.departure_datetime)}</span>
                                                                                        </div>
                                                                                </button>
                                                                        );
                                                                })
                                                        )}
                                                </div>
                                        </div>

                                        {/* Quick Manual Allocation Card */}
                                        <div className="kp-card">
                                                <h6 className="mb-2" style={{ fontWeight: 600 }}>
                                                        <IconTransferIn size={18} className="me-1 text-primary" />
                                                        Manual Item Allocation
                                                </h6>
                                                <p className="text-muted mb-3" style={{ fontSize: "0.8rem" }}>
                                                        Queue an order item onto currently selected trip (enforces atomic capacity lock).
                                                </p>
                                                <div className="mb-2">
                                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                                                Order Item ID
                                                        </label>
                                                        <input
                                                                type="number"
                                                                className="form-control form-control-sm"
                                                                placeholder="e.g. 1"
                                                                value={allocForm.orderItemId}
                                                                onChange={(e) => setAllocForm({ ...allocForm, orderItemId: e.target.value })}
                                                        />
                                                </div>
                                                <div className="mb-3">
                                                        <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                                                Quantity to Allocate
                                                        </label>
                                                        <input
                                                                type="number"
                                                                min="1"
                                                                className="form-control form-control-sm"
                                                                placeholder="e.g. 10"
                                                                value={allocForm.quantity}
                                                                onChange={(e) => setAllocForm({ ...allocForm, quantity: e.target.value })}
                                                        />
                                                </div>
                                                <div className="d-grid gap-2">
                                                        <button
                                                                type="button"
                                                                className="btn btn-sm btn-primary"
                                                                disabled={allocating || !selectedTripId}
                                                                onClick={() => handleManualAllocate(false)}
                                                        >
                                                                {allocating ? "Allocating..." : "Allocate to Trip"}
                                                        </button>
                                                        <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-secondary"
                                                                disabled={allocating || !selectedTripId}
                                                                onClick={() => handleManualAllocate(true)}
                                                                title="If this trip is full, automatically schedules excess quantity to the next available trip"
                                                        >
                                                                Allocate with Auto-Overflow
                                                        </button>
                                                </div>
                                        </div>
                                </div>

                                {/* Right Column: Trip Loading Details & Orders */}
                                <div className="col-lg-8">
                                        {loadingDetail ? (
                                                <div className="kp-card text-center py-5 text-muted">
                                                        <div className="spinner-border spinner-border-sm me-2" role="status" />
                                                        Loading trip details...
                                                </div>
                                        ) : !tripDetail ? (
                                                <div className="kp-card text-center py-5 text-muted">
                                                        <IconTrain size={48} className="mb-2 text-muted" stroke={1.5} />
                                                        <p>Select a trip from the left sidebar to view its loading status.</p>
                                                </div>
                                        ) : (
                                                <>
                                                        {/* Trip Capacity Card (matching Figure 7) */}
                                                        <div className="kp-card mb-4">
                                                                <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                                                                        <div>
                                                                                <h4 className="mb-1" style={{ fontWeight: 600 }}>
                                                                                        {formatTripId(tripDetail.trip_id)} — {tripDetail.destination_city}
                                                                                </h4>
                                                                                <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                                                                                        Train: <strong>{tripDetail.train_name}</strong> | Departure: {formatDateTime(tripDetail.departure_datetime)}
                                                                                </p>
                                                                        </div>
                                                                        <span
                                                                                className={`badge ${tripDetail.status === "Loaded"
                                                                                        ? "bg-success"
                                                                                        : tripDetail.status === "Loading"
                                                                                                ? "bg-warning text-dark"
                                                                                                : "bg-info text-dark"
                                                                                        }`}
                                                                                style={{ fontSize: "0.85rem", padding: "0.5rem 0.8rem" }}
                                                                        >
                                                                                {tripDetail.status || "Scheduled"}
                                                                        </span>
                                                                </div>

                                                                {/* Capacity Progress Bar */}
                                                                <div className="mt-3">
                                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                                                <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                                                                                        Allocated Cargo Space
                                                                                </span>
                                                                                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                                                                                        {usedCap} / {totalCap} units ({capPct}%)
                                                                                </span>
                                                                        </div>
                                                                        <div
                                                                                className="progress"
                                                                                style={{ height: "10px", backgroundColor: "#e2e8f0" }}
                                                                        >
                                                                                <div
                                                                                        className="progress-bar"
                                                                                        role="progressbar"
                                                                                        style={{
                                                                                                width: `${capPct}%`,
                                                                                                backgroundColor: isNearCapacity ? "var(--color-danger, #e53e3e)" : "var(--color-warning, #d69e2e)",
                                                                                                transition: "width 0.4s ease",
                                                                                        }}
                                                                                />
                                                                        </div>

                                                                        {isNearCapacity && (
                                                                                <div className="d-flex align-items-center gap-1 mt-2 text-danger" style={{ fontSize: "0.8rem" }}>
                                                                                        <IconAlertTriangle size={15} />
                                                                                        <span>
                                                                                                Trip is near capacity ({remainingCap} units remaining)!
                                                                                        </span>
                                                                                </div>
                                                                        )}

                                                                        <p className="text-muted mt-2 mb-0" style={{ fontSize: "0.75rem", fontStyle: "italic" }}>
                                                                                Note: allocated units are system-calculated, not a physical sensor reading.
                                                                        </p>
                                                                </div>
                                                        </div>

                                                        {/* Orders on this Trip Card (matching Figure 7) */}
                                                        <div className="kp-card mb-4" style={{ padding: 0, overflow: "hidden" }}>
                                                                <div
                                                                        className="d-flex justify-content-between align-items-center p-3 border-bottom flex-wrap gap-2"
                                                                        style={{ background: "var(--color-surface-subtle, #fafafa)" }}
                                                                >
                                                                        <h5 className="mb-0" style={{ fontWeight: 600, fontSize: "1rem" }}>
                                                                                Orders on this Trip ({allocations.length})
                                                                        </h5>
                                                                        <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                                                                                onClick={() => loadTripDetail(selectedTripId)}
                                                                        >
                                                                                <IconRefresh size={14} />
                                                                                <span>Refresh</span>
                                                                        </button>
                                                                </div>

                                                                {allocations.length === 0 ? (
                                                                        <div className="text-center py-5 text-muted">
                                                                                <IconBoxSeam size={40} className="mb-2 text-muted" stroke={1.5} />
                                                                                <p className="mb-0">No orders allocated to this trip yet.</p>
                                                                        </div>
                                                                ) : (
                                                                        <div className="table-responsive">
                                                                                <table className="table align-middle mb-0">
                                                                                        <thead className="table-light text-uppercase" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                                                                                                <tr>
                                                                                                        <th className="ps-3">Allocation</th>
                                                                                                        <th>Order Item</th>
                                                                                                        <th>Product</th>
                                                                                                        <th>Allocated Qty</th>
                                                                                                        <th>Loading Status</th>
                                                                                                        <th className="text-end pe-3">Actions</th>
                                                                                                </tr>
                                                                                        </thead>
                                                                                        <tbody>
                                                                                                {allocations.map((a) => (
                                                                                                        <tr key={a.cargo_allocation_id}>
                                                                                                                <td className="ps-3">
                                                                                                                        <span className="badge bg-light text-dark border font-monospace">
                                                                                                                                #{a.cargo_allocation_id}
                                                                                                                        </span>
                                                                                                                </td>
                                                                                                                <td>
                                                                                                                        <span className="font-monospace" style={{ fontWeight: 600 }}>
                                                                                                                                {a.order_id ? `ORD-${a.order_id}` : `Item #${a.order_item_id}`}
                                                                                                                        </span>
                                                                                                                </td>
                                                                                                                <td>
                                                                                                                        <span style={{ fontWeight: 500 }}>{a.product_name || `Product #${a.product_id}`}</span>
                                                                                                                        {a.space_consumption_rate && (
                                                                                                                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                                                                                                                        Rate: {a.space_consumption_rate}
                                                                                                                                </div>
                                                                                                                        )}
                                                                                                                </td>
                                                                                                                <td>
                                                                                                                        <span style={{ fontWeight: 600 }}>{a.allocated_quantity}</span> units
                                                                                                                </td>
                                                                                                                <td>
                                                                                                                        <select
                                                                                                                                className={`form-select form-select-sm ${a.status === "Loaded"
                                                                                                                                        ? "text-success border-success"
                                                                                                                                        : a.status === "Partially Loaded"
                                                                                                                                                ? "text-warning border-warning"
                                                                                                                                                : "text-muted"
                                                                                                                                        }`}
                                                                                                                                style={{ width: "auto", minWidth: "130px", fontWeight: 500 }}
                                                                                                                                value={a.status || "Not Loaded"}
                                                                                                                                onChange={(e) => handleStatusChange(a.cargo_allocation_id, e.target.value)}
                                                                                                                        >
                                                                                                                                <option value="Not Loaded">Not Loaded</option>
                                                                                                                                <option value="Partially Loaded">Partially Loaded</option>
                                                                                                                                <option value="Loaded">Loaded</option>
                                                                                                                        </select>
                                                                                                                </td>
                                                                                                                <td className="text-end pe-3">
                                                                                                                        {a.status !== "Loaded" && a.allocated_quantity > 1 && (
                                                                                                                                <button
                                                                                                                                        type="button"
                                                                                                                                        className="btn btn-sm btn-outline-danger py-0 px-2"
                                                                                                                                        style={{ fontSize: "0.75rem" }}
                                                                                                                                        title="Requeue unloaded platform shortfall to next trip"
                                                                                                                                        onClick={() =>
                                                                                                                                                setShortfallModal({
                                                                                                                                                        show: true,
                                                                                                                                                        allocationId: a.cargo_allocation_id,
                                                                                                                                                        maxQty: a.allocated_quantity,
                                                                                                                                                        unloadedQuantity: "1",
                                                                                                                                                })
                                                                                                                                        }
                                                                                                                                >
                                                                                                                                        Shortfall
                                                                                                                                </button>
                                                                                                                        )}
                                                                                                                </td>
                                                                                                        </tr>
                                                                                                ))}
                                                                                        </tbody>
                                                                                </table>
                                                                        </div>
                                                                )}

                                                                {allocations.length > 0 && (
                                                                        <div className="p-3 bg-light border-top d-flex justify-content-end">
                                                                                <button
                                                                                        type="button"
                                                                                        className="btn btn-primary d-inline-flex align-items-center gap-2"
                                                                                        onClick={handleMarkAllLoaded}
                                                                                        disabled={tripDetail.status === "Loaded"}
                                                                                >
                                                                                        <IconCheck size={18} />
                                                                                        <span>{tripDetail.status === "Loaded" ? "Trip Manifest Locked (Loaded)" : "Mark Trip Fully Loaded"}</span>
                                                                                </button>
                                                                        </div>
                                                                )}
                                                        </div>
                                                </>
                                        )}
                                </div>
                        </div>

                        {/* Shortfall Requeue Modal */}
                        {shortfallModal.show && (
                                <div
                                        className="modal show d-block"
                                        tabIndex="-1"
                                        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                                >
                                        <div className="modal-dialog modal-dialog-centered">
                                                <div className="modal-content">
                                                        <div className="modal-header">
                                                                <h5 className="modal-title">
                                                                        <IconAlertTriangle className="text-danger me-2" size={20} />
                                                                        Record Platform Shortfall
                                                                </h5>
                                                                <button
                                                                        type="button"
                                                                        className="btn-close"
                                                                        onClick={() =>
                                                                                setShortfallModal({ show: false, allocationId: null, maxQty: 0, unloadedQuantity: "" })
                                                                        }
                                                                ></button>
                                                        </div>
                                                        <form onSubmit={handleShortfallSubmit}>
                                                                <div className="modal-body">
                                                                        <p style={{ fontSize: "0.9rem" }}>
                                                                                If an allocated item cannot be fully loaded by departure time (physical platform shortfall),
                                                                                the unloaded quantity will be automatically requeued onto the next scheduled trip for this destination.
                                                                        </p>
                                                                        <div className="mb-3">
                                                                                <label className="form-label" style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                                                                                        Unloaded Shortfall Quantity (max {shortfallModal.maxQty - 1})
                                                                                </label>
                                                                                <input
                                                                                        type="number"
                                                                                        min="1"
                                                                                        max={shortfallModal.maxQty - 1}
                                                                                        className="form-control"
                                                                                        value={shortfallModal.unloadedQuantity}
                                                                                        onChange={(e) =>
                                                                                                setShortfallModal({ ...shortfallModal, unloadedQuantity: e.target.value })
                                                                                        }
                                                                                        required
                                                                                />
                                                                        </div>
                                                                </div>
                                                                <div className="modal-footer">
                                                                        <button
                                                                                type="button"
                                                                                className="btn btn-outline-secondary"
                                                                                onClick={() =>
                                                                                        setShortfallModal({ show: false, allocationId: null, maxQty: 0, unloadedQuantity: "" })
                                                                                }
                                                                        >
                                                                                Cancel
                                                                        </button>
                                                                        <button
                                                                                type="submit"
                                                                                className="btn btn-danger"
                                                                                disabled={submittingShortfall}
                                                                        >
                                                                                {submittingShortfall ? "Requeuing..." : "Requeue to Next Trip"}
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

export default DispatcherTrainLoading;

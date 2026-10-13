import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
        IconTruck,
        IconBuildingWarehouse,
        IconPlus,
        IconCheck,
        IconAlertCircle,
        IconClock,
        IconRoute,
        IconMapPin,
        IconRefresh,
        IconSparkles,
        IconPackage,
} from "@tabler/icons-react";

const API_BASE = apiUrl("/api");

function StoreDailyDispatch() {
        const roleId = Number(localStorage.getItem("roleId")) || 0;
        const canDispatch = roleId === 1 || roleId === 3;
        const [stores, setStores] = useState([]);
        const [selectedStoreId, setSelectedStoreId] = useState("");

        const [runs, setRuns] = useState([]);
        const [suggestions, setSuggestions] = useState([]);
        const [availableOrders, setAvailableOrders] = useState([]);

        const [loading, setLoading] = useState(true);
        const [refreshing, setRefreshing] = useState(false);
        const [assignModal, setAssignModal] = useState({
                show: false,
                truckScheduleId: null,
                routeName: "",
        });
        const [selectedOrderId, setSelectedOrderId] = useState("");
        const [submittingDispatch, setSubmittingDispatch] = useState(false);

        const [error, setError] = useState("");
        const [success, setSuccess] = useState("");

        const getAuthHeader = () => {
                const token = localStorage.getItem("token");
                return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        };

        // 1. Load Stores on mount
        const loadStores = useCallback(async () => {
                setLoading(true);
                setError("");
                try {
                        const res = await axios.get(`${API_BASE}/stores`, getAuthHeader());
                        const storeList = res.data || [];
                        setStores(storeList);
                        if (storeList.length > 0) {
                                setSelectedStoreId(String(storeList[0].store_id));
                        }
                } catch (err) {
                        setError(err.response?.data?.error || "Failed to load regional stores");
                } finally {
                        setLoading(false);
                }
        }, []);

        useEffect(() => {
                loadStores();
        }, [loadStores]);

        // 2. Load Dispatch Data & Suggestions for selected store
        const loadDispatchData = useCallback(async (storeId) => {
                if (!storeId) return;
                setRefreshing(true);
                setError("");
                try {
                        const [runsRes, suggRes, ordersRes] = await Promise.all([
                                axios.get(`${API_BASE}/stores/${storeId}/dispatch/today`, getAuthHeader()),
                                axios.get(`${API_BASE}/stores/${storeId}/truck-suggestion`, getAuthHeader()),
                                axios.get(`${API_BASE}/stores/${storeId}/dispatch/available-orders`, getAuthHeader()),
                        ]);

                        setRuns(runsRes.data || []);
                        setSuggestions(suggRes.data || []);
                        setAvailableOrders(ordersRes.data || []);
                } catch (err) {
                        setError(err.response?.data?.error || "Failed to load store dispatch schedules");
                } finally {
                        setRefreshing(false);
                }
        }, []);

        useEffect(() => {
                if (selectedStoreId) {
                        loadDispatchData(selectedStoreId);
                }
        }, [selectedStoreId, loadDispatchData]);

        // Group raw truck allocations by truck schedule
        const groupedRuns = runs.reduce((acc, row) => {
                const sId = row.truck_schedule_id;
                if (!acc[sId]) {
                        acc[sId] = {
                                truck_schedule_id: sId,
                                route_id: row.route_id,
                                route_name: row.route_name,
                                truck_id: row.truck_id,
                                start_time: row.start_time,
                                end_time: row.end_time,
                                schedule_status: row.schedule_status,
                                deliveries: [],
                        };
                }
                if (row.truck_allocation_id) {
                        acc[sId].deliveries.push({
                                truck_allocation_id: row.truck_allocation_id,
                                order_id: row.order_id,
                                route_stop_id: row.route_stop_id,
                                stop_name: row.stop_name,
                                delivery_status: row.delivery_status,
                        });
                }
                return acc;
        }, {});

        const scheduleList = Object.values(groupedRuns);

        // Open modal to assign order
        const handleOpenAssignModal = (scheduleId, routeName) => {
                setSelectedOrderId("");
                setAssignModal({
                        show: true,
                        truckScheduleId: scheduleId,
                        routeName,
                });
        };

        // Submit order assignment
        const handleAssignOrder = async (e) => {
                e.preventDefault();
                if (!assignModal.truckScheduleId || !selectedOrderId) {
                        setError("Please select an order to assign");
                        return;
                }

                setSubmittingDispatch(true);
                setError("");
                setSuccess("");
                try {
                        await axios.post(
                                `${API_BASE}/stores/${selectedStoreId}/dispatch`,
                                {
                                        truckScheduleId: assignModal.truckScheduleId,
                                        orderId: Number(selectedOrderId),
                                },
                                getAuthHeader()
                        );

                        setSuccess(`Order #${selectedOrderId} successfully assigned to truck run #${assignModal.truckScheduleId}!`);
                        setAssignModal({ show: false, truckScheduleId: null, routeName: "" });
                        setSelectedOrderId("");
                        await loadDispatchData(selectedStoreId);
                } catch (err) {
                        setError(err.response?.data?.error || "Failed to dispatch order to truck schedule");
                } finally {
                        setSubmittingDispatch(false);
                }
        };

        const totalAssignedDeliveries = scheduleList.reduce((acc, s) => acc + s.deliveries.length, 0);

        return (
                <AppLayout pageTitle="Store Daily Dispatch">
                        {/* Top Banner / Feedback Alerts */}
                        {error && (
                                <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                                        <IconAlertCircle size={20} className="me-2 flex-shrink-0" />
                                        <div className="flex-grow-1">{error}</div>
                                        <button type="button" className="btn-close ms-2" onClick={() => setError("")}></button>
                                </div>
                        )}

                        {success && (
                                <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                                        <IconCheck size={20} className="me-2 flex-shrink-0" />
                                        <div className="flex-grow-1">{success}</div>
                                        <button type="button" className="btn-close ms-2" onClick={() => setSuccess("")}></button>
                                </div>
                        )}

                        {/* Facility Selection Card */}
                        <div className="kp-card mb-4">
                                <div className="row g-3 align-items-center">
                                        <div className="col-md-6">
                                                <label className="form-label text-muted" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                                                        <IconBuildingWarehouse size={16} className="me-1 align-text-bottom" />
                                                        REGIONAL STORE FACILITY
                                                </label>
                                                <select
                                                        className="form-select"
                                                        value={selectedStoreId}
                                                        onChange={(e) => setSelectedStoreId(e.target.value)}
                                                        disabled={loading || refreshing}
                                                >
                                                        {stores.map((s) => (
                                                                <option key={s.store_id} value={s.store_id}>
                                                                        {s.name} ({s.city_name || "City #" + s.city_id})
                                                                </option>
                                                        ))}
                                                </select>
                                        </div>

                                        <div className="col-md-6 d-flex justify-content-md-end align-items-end">
                                                <button
                                                        type="button"
                                                        className="btn btn-outline-secondary d-inline-flex align-items-center"
                                                        onClick={() => selectedStoreId && loadDispatchData(selectedStoreId)}
                                                        disabled={refreshing}
                                                        style={{ marginTop: "24px", padding: "8px 18px" }}
                                                >
                                                        <IconRefresh size={16} className={`me-1.5 ${refreshing ? "spin" : ""}`} />
                                                        {refreshing ? "Refreshing..." : "Refresh Schedules"}
                                                </button>
                                        </div>
                                </div>
                        </div>

                        {/* Summary Stat Cards */}
                        <div className="kp-stat-grid mb-4">
                                <div className="kp-stat-card">
                                        <div className="kp-stat-icon" style={{ background: "var(--color-info-bg)" }}>
                                                <IconTruck size={20} color="var(--color-info-text)" />
                                        </div>
                                        <p className="kp-stat-label">Today&apos;s Truck Runs</p>
                                        <p className="kp-stat-value mb-0">{scheduleList.length}</p>
                                </div>

                                <div className="kp-stat-card">
                                        <div className="kp-stat-icon" style={{ background: "var(--color-success-bg)" }}>
                                                <IconCheck size={20} color="var(--color-success-text)" />
                                        </div>
                                        <p className="kp-stat-label">Assigned Delivery Stops</p>
                                        <p className="kp-stat-value mb-0">{totalAssignedDeliveries}</p>
                                </div>

                                <div className="kp-stat-card">
                                        <div className="kp-stat-icon" style={{ background: "var(--color-warning-bg)" }}>
                                                <IconPackage size={20} color="var(--color-warning-text)" />
                                        </div>
                                        <p className="kp-stat-label">Available Orders For Dispatch</p>
                                        <p className="kp-stat-value mb-0">{availableOrders.length}</p>
                                </div>

                                <div className="kp-stat-card">
                                        <div className="kp-stat-icon" style={{ background: "var(--color-bg)" }}>
                                                <IconRoute size={20} color="var(--color-text-muted)" />
                                        </div>
                                        <p className="kp-stat-label">Active Delivery Routes</p>
                                        <p className="kp-stat-value mb-0">{suggestions.length}</p>
                                </div>
                        </div>

                        {/* Suggested Truck Fleet Requirements (REQ-STORE-04, REQ-STORE-05) */}
                        {suggestions.length > 0 && (
                                <div className="kp-card mb-4" style={{ borderLeft: "4px solid var(--color-warning-text, #f0a202)" }}>
                                        <div className="d-flex align-items-center mb-2">
                                                <IconSparkles size={18} className="me-2 text-warning" />
                                                <h6 className="mb-0 fw-bold">System Recommended Truck Requirements </h6>
                                        </div>
                                        <p className="text-muted mb-3" style={{ fontSize: "0.83rem" }}>
                                                Based on trailing historical orders and capacity consumption rates, here is the suggested truck fleet requirement per route:
                                        </p>
                                        <div className="row g-2">
                                                {suggestions.map((sug) => (
                                                        <div key={sug.routeId} className="col-md-6 col-lg-4">
                                                                <div className="p-3 bg-light rounded border">
                                                                        <div className="fw-semibold text-dark">{sug.routeName}</div>
                                                                        <div className="d-flex justify-content-between align-items-center mt-2" style={{ fontSize: "0.85rem" }}>
                                                                                <span className="text-muted">Avg Orders / Day:</span>
                                                                                <span className="fw-bold">{sug.avgOrdersPerDay}</span>
                                                                        </div>
                                                                        <div className="d-flex justify-content-between align-items-center mt-1" style={{ fontSize: "0.85rem" }}>
                                                                                <span className="text-muted">Suggested Trucks:</span>
                                                                                <span className="kp-badge kp-badge-info">{sug.suggestedTrucks} Truck(s)</span>
                                                                        </div>
                                                                </div>
                                                        </div>
                                                ))}
                                        </div>
                                </div>
                        )}

                        {/* Today's Truck Runs List */}
                        <div className="kp-card mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                                <h5 className="mb-1" style={{ fontWeight: 600 }}>
                                                        Today&apos;s Scheduled Truck Runs & Loading
                                                </h5>
                                                <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                                                        Store Managers assign received customer orders to daily truck delivery runs (SRS 3.1.4).
                                                </p>
                                        </div>
                                </div>

                                {refreshing ? (
                                        <div className="text-center py-5">
                                                <div className="spinner-border text-primary" role="status"></div>
                                                <p className="mt-2 text-muted">Loading dispatch runs...</p>
                                        </div>
                                ) : scheduleList.length === 0 ? (
                                        <div className="text-center py-5 text-muted">
                                                <IconTruck size={40} className="mb-2 opacity-50" />
                                                <p>No truck delivery runs scheduled for this store facility today.</p>
                                        </div>
                                ) : (
                                        <div className="d-flex flex-column gap-3">
                                                {scheduleList.map((schedule) => (
                                                        <div key={schedule.truck_schedule_id} className="p-3 rounded border bg-white">
                                                                <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-3 mb-3 gap-2">
                                                                        <div>
                                                                                <div className="d-flex align-items-center gap-2">
                                                                                        <span className="fw-bold fs-6">Run #{schedule.truck_schedule_id}</span>
                                                                                        <span className="kp-badge kp-badge-info">{schedule.route_name}</span>
                                                                                        <span className="badge bg-light text-secondary border">
                                                                                                Truck #{schedule.truck_id}
                                                                                        </span>
                                                                                        <span className="kp-badge kp-badge-success">{schedule.schedule_status}</span>
                                                                                </div>
                                                                                <small className="text-muted mt-1 d-block">
                                                                                        <IconClock size={14} className="me-1 align-text-bottom" />
                                                                                        Window: {schedule.start_time || "08:00"} — {schedule.end_time || "17:00"}
                                                                                </small>
                                                                        </div>

                                                                        {canDispatch && (
                                                                                <button
                                                                                        type="button"
                                                                                        className="btn btn-sm btn-primary d-inline-flex align-items-center"
                                                                                        onClick={() => handleOpenAssignModal(schedule.truck_schedule_id, schedule.route_name)}
                                                                                        style={{ padding: "7px 16px" }}
                                                                                >
                                                                                        <IconPlus size={15} className="me-1.5" />
                                                                                        Assign Order to Run
                                                                                </button>
                                                                        )}
                                                                </div>

                                                                {/* Assigned Stops for this run */}
                                                                <div>
                                                                        <h6 className="text-muted mb-2" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                                                                                ASSIGNED DELIVERIES ({schedule.deliveries.length})
                                                                        </h6>
                                                                        {schedule.deliveries.length === 0 ? (
                                                                                <p className="text-muted fst-italic mb-0" style={{ fontSize: "0.85rem" }}>
                                                                                        No customer orders dispatched to this run yet. Click &quot;Assign Order to Run&quot; above.
                                                                                </p>
                                                                        ) : (
                                                                                <div className="table-responsive">
                                                                                        <table className="table table-sm align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                                                                                                <thead className="table-light">
                                                                                                        <tr>
                                                                                                                <th>Stop #</th>
                                                                                                                <th>Order ID</th>
                                                                                                                <th>Delivery Stop Destination</th>
                                                                                                                <th className="text-center">Delivery Status</th>
                                                                                                        </tr>
                                                                                                </thead>
                                                                                                <tbody>
                                                                                                        {schedule.deliveries.map((del, idx) => (
                                                                                                                <tr key={del.truck_allocation_id}>
                                                                                                                        <td className="text-muted">{idx + 1}</td>
                                                                                                                        <td className="fw-semibold">Order #{del.order_id}</td>
                                                                                                                        <td>
                                                                                                                                <IconMapPin size={13} className="me-1 text-primary" />
                                                                                                                                {del.stop_name || "Destination Stop #" + del.route_stop_id}
                                                                                                                        </td>
                                                                                                                        <td className="text-center">
                                                                                                                                <span className="kp-badge kp-badge-warning">{del.delivery_status}</span>
                                                                                                                        </td>
                                                                                                                </tr>
                                                                                                        ))}
                                                                                                </tbody>
                                                                                        </table>
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>
                                                ))}
                                        </div>
                                )}
                        </div>

                        {/* Modal / Dialog to Assign Order */}
                        {assignModal.show && (
                                <div
                                        className="modal show d-block"
                                        tabIndex="-1"
                                        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                                >
                                        <div className="modal-dialog modal-dialog-centered">
                                                <div className="modal-content">
                                                        <div className="modal-header">
                                                                <h5 className="modal-title fw-bold">
                                                                        <IconTruck size={20} className="me-2 text-primary align-text-bottom" />
                                                                        Assign Order to Run #{assignModal.truckScheduleId}
                                                                </h5>
                                                                <button
                                                                        type="button"
                                                                        className="btn-close"
                                                                        onClick={() => setAssignModal({ show: false, truckScheduleId: null, routeName: "" })}
                                                                ></button>
                                                        </div>
                                                        <form onSubmit={handleAssignOrder}>
                                                                <div className="modal-body">
                                                                        <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                                                                                Select a ready order for <strong>{assignModal.routeName}</strong> to load onto this truck run.
                                                                        </p>

                                                                        <div className="mb-3">
                                                                                <label className="form-label fw-semibold" style={{ fontSize: "0.85rem" }}>
                                                                                        Select Order Waiting for Dispatch
                                                                                </label>
                                                                                <select
                                                                                        className="form-select"
                                                                                        value={selectedOrderId}
                                                                                        onChange={(e) => setSelectedOrderId(e.target.value)}
                                                                                        required
                                                                                >
                                                                                        <option value="">Choose an order...</option>
                                                                                        {availableOrders.map((ord) => (
                                                                                                <option key={ord.order_id} value={ord.order_id}>
                                                                                                        Order #{ord.order_id} — {ord.stop_name || ord.route_name} (LKR {Number(ord.total_amount).toLocaleString()})
                                                                                                </option>
                                                                                        ))}
                                                                                </select>
                                                                        </div>

                                                                        {availableOrders.length === 0 && (
                                                                                <div className="alert alert-info py-2" style={{ fontSize: "0.85rem" }}>
                                                                                        No undispatched orders found for this store. You can test by placing orders or reconciling arriving manifests.
                                                                                </div>
                                                                        )}
                                                                </div>
                                                                <div className="modal-footer">
                                                                        <button
                                                                                type="button"
                                                                                className="btn btn-outline-secondary"
                                                                                onClick={() => setAssignModal({ show: false, truckScheduleId: null, routeName: "" })}
                                                                        >
                                                                                Cancel
                                                                        </button>
                                                                        <button
                                                                                type="submit"
                                                                                className="btn btn-primary"
                                                                                disabled={submittingDispatch || !selectedOrderId}
                                                                        >
                                                                                {submittingDispatch ? "Assigning..." : "Confirm Dispatch"}
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

export default StoreDailyDispatch;

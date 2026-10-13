import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
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
	IconGripVertical,
	IconBolt,
	IconTrash,
	IconInfoCircle,
	IconArrowsSplit,
	IconSearch,
	IconEye,
} from "@tabler/icons-react";

const API_BASE = apiUrl("/api");

function DispatcherTrainLoading() {
	const [trips, setTrips] = useState([]);
	const [cities, setCities] = useState([]);
	const [selectedCityId, setSelectedCityId] = useState("");
	const [selectedTripId, setSelectedTripId] = useState(null);

	const [tripDetail, setTripDetail] = useState(null);
	const [allocations, setAllocations] = useState([]);
	const [allotableOrders, setAllotableOrders] = useState([]);
	const [loadingTrips, setLoadingTrips] = useState(true);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [loadingAllotable, setLoadingAllotable] = useState(false);

	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	// Search filter for allotable orders
	const [searchAllotable, setSearchAllotable] = useState("");

	// Drag-and-drop state
	const [draggingItem, setDraggingItem] = useState(null);
	const [isDragOver, setIsDragOver] = useState(false);

	// Action in progress flag
	const [allocating, setAllocating] = useState(false);

	// Linked Parts Modal (View State of Other Part of the Order)
	const [linkedModal, setLinkedModal] = useState({
		show: false,
		allocation: null,
	});

	// Shortfall modal / state (REQ-RAIL-07)
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

	const loadAllotableOrders = useCallback(async (tripId) => {
		if (!tripId) return;
		setLoadingAllotable(true);
		try {
			const res = await axios.get(
				`${API_BASE}/rail/train-trips/${tripId}/allotable-orders`,
				getAuthHeader()
			);
			setAllotableOrders(res.data.orders || []);
		} catch (err) {
			console.error("Failed to load allotable orders:", err);
		} finally {
			setLoadingAllotable(false);
		}
	}, []);

	useEffect(() => {
		if (selectedTripId) {
			setError("");
			loadTripDetail(selectedTripId);
			loadAllotableOrders(selectedTripId);

			const interval = setInterval(() => {
				loadTripDetail(selectedTripId);
				loadAllotableOrders(selectedTripId);
			}, 15000);
			const onFocus = () => {
				loadTripDetail(selectedTripId);
				loadAllotableOrders(selectedTripId);
			};
			window.addEventListener("focus", onFocus);
			return () => {
				clearInterval(interval);
				window.removeEventListener("focus", onFocus);
			};
		}
	}, [selectedTripId, loadTripDetail, loadAllotableOrders]);

	const refreshCurrentTrip = async () => {
		if (!selectedTripId) return;
		await Promise.all([
			loadTripDetail(selectedTripId),
			loadAllotableOrders(selectedTripId),
			loadTripsAndCities(),
		]);
	};

	// Execute allocation (Manual or Auto-Overflow)
	const executeAllocation = async (item, forceOverflow = false) => {
		if (!selectedTripId) return;
		setError("");
		setSuccess("");
		setAllocating(true);

		try {
			const qty = Number(item.unallocated_quantity);
			const totalCapacity = Number(tripDetail?.total_capacity || 0);
			const usedCapacity = Number(
				allocations.reduce((acc, a) => acc + Number(a.allocated_quantity || 0), 0)
			);
			const remainingCapacity = Math.max(0, totalCapacity - usedCapacity);

			let useOverflow = forceOverflow;

			// If manual allocation requested but quantity exceeds remaining capacity
			if (!useOverflow && qty > remainingCapacity) {
				if (remainingCapacity <= 0) {
					const confirmOverflow = window.confirm(
						`Trip #${formatTripId(selectedTripId)} has no remaining capacity (${remainingCapacity} units).\n\nWould you like to use Auto-Overflow to automatically schedule this order to subsequent trip(s)?`
					);
					if (!confirmOverflow) {
						setAllocating(false);
						return;
					}
					useOverflow = true;
				} else {
					const confirmSplit = window.confirm(
						`Trip #${formatTripId(selectedTripId)} only has ${remainingCapacity} units remaining, but order item needs ${qty} units.\n\nClick OK to load ${remainingCapacity} units here and automatically overflow the remaining ${qty - remainingCapacity} units to the next trip.\n\nClick Cancel to abort.`
					);
					if (!confirmSplit) {
						setAllocating(false);
						return;
					}
					useOverflow = true;
				}
			}

			const endpoint = useOverflow
				? `${API_BASE}/rail/train-trips/${selectedTripId}/allocate-overflow`
				: `${API_BASE}/rail/train-trips/${selectedTripId}/allocate`;

			const res = await axios.post(
				endpoint,
				{
					orderItemId: item.order_item_id,
					quantity: qty,
				},
				getAuthHeader()
			);

			setSuccess(res.data.message || "Cargo successfully allocated!");
			await refreshCurrentTrip();
		} catch (err) {
			setError(err.response?.data?.error || "Allocation failed");
		} finally {
			setAllocating(false);
		}
	};

	// Auto-allocate all matching allotable orders with overflow
	const handleAutoAllocateAll = async () => {
		if (!allotableOrders.length || !selectedTripId) return;
		const confirmAll = window.confirm(
			`Auto-allocate all ${allotableOrders.length} allotable orders with automatic overflow across trips?`
		);
		if (!confirmAll) return;

		setError("");
		setSuccess("");
		setAllocating(true);
		try {
			let count = 0;
			for (const item of allotableOrders) {
				try {
					await axios.post(
						`${API_BASE}/rail/train-trips/${selectedTripId}/allocate-overflow`,
						{
							orderItemId: item.order_item_id,
							quantity: Number(item.unallocated_quantity),
						},
						getAuthHeader()
					);
					count++;
				} catch (e) {
					console.warn("Item overflow warning:", e);
				}
			}
			setSuccess(`Successfully auto-allocated ${count} orders with overflow protection!`);
			await refreshCurrentTrip();
		} catch (err) {
			setError("Auto-allocation completed with some items requiring attention.");
		} finally {
			setAllocating(false);
		}
	};

	// Remove / de-allocate allocation
	const handleRemoveAllocation = async (allocationId) => {
		if (!window.confirm("Remove this cargo allocation and return it to allotable orders?")) return;
		setError("");
		setSuccess("");
		try {
			const res = await axios.delete(
				`${API_BASE}/rail/allocations/${allocationId}`,
				getAuthHeader()
			);
			setSuccess(res.data.message || "Allocation removed.");
			await refreshCurrentTrip();
		} catch (err) {
			setError(err.response?.data?.error || "Failed to remove allocation");
		}
	};

	// Drag & Drop handlers
	const handleDragStart = (e, item) => {
		setDraggingItem(item);
		e.dataTransfer.setData("application/json", JSON.stringify(item));
		e.dataTransfer.effectAllowed = "copyMove";
	};

	const handleDragEnd = () => {
		setDraggingItem(null);
		setIsDragOver(false);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
		if (!isDragOver) setIsDragOver(true);
	};

	const handleDragLeave = (e) => {
		if (e.currentTarget.contains(e.relatedTarget)) return;
		setIsDragOver(false);
	};

	const handleDrop = async (e) => {
		e.preventDefault();
		setIsDragOver(false);
		if (!draggingItem) return;
		const targetItem = draggingItem;
		setDraggingItem(null);
		await executeAllocation(targetItem, false);
	};

	// Loading status changes (REQ-RAIL-06)
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
			await refreshCurrentTrip();
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
			await refreshCurrentTrip();
		} catch (err) {
			setError(err.response?.data?.error || "Failed to lock all allocations");
		}
	};

	// Shortfall submit (REQ-RAIL-07)
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
			await refreshCurrentTrip();
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
		return isNaN(d.getTime())
			? dtStr
			: d.toLocaleString("en-US", {
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

	const usedCap = tripDetail
		? Number(allocations.reduce((acc, a) => acc + Number(a.allocated_quantity || 0), 0))
		: 0;
	const totalCap = tripDetail ? Number(tripDetail.total_capacity || 0) : 0;
	const capPct = totalCap > 0 ? Math.min(100, Math.round((usedCap / totalCap) * 100)) : 0;
	const remainingCap = Math.max(0, totalCap - usedCap);
	const isNearCapacity = capPct >= 90;

	// Filter allotable orders based on search input
	const filteredAllotable = allotableOrders.filter((item) => {
		if (!searchAllotable.trim()) return true;
		const q = searchAllotable.toLowerCase();
		return (
			String(item.order_id).includes(q) ||
			String(item.order_item_id).includes(q) ||
			item.product_name?.toLowerCase().includes(q) ||
			item.customer_name?.toLowerCase().includes(q) ||
			item.route_name?.toLowerCase().includes(q) ||
			item.store_name?.toLowerCase().includes(q) ||
			item.delivery_address?.toLowerCase().includes(q)
		);
	});

	return (
		<AppLayout pageTitle="Train Loading & Cargo Dispatch">
			{/* Scoped CSS for Drag-and-Drop and Overflow Badges */}
			<style>{`
				.drop-zone-bay {
					transition: all 0.25s ease;
					border: 2px dashed transparent;
					border-radius: 12px;
				}
				.drop-zone-active {
					border-color: #3b82f6 !important;
					background: rgba(59, 130, 246, 0.06) !important;
					box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
				}
				.draggable-order-card {
					cursor: grab;
					transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
					border: 1px solid #e2e8f0;
					border-radius: 10px;
					background: #ffffff;
				}
				.draggable-order-card:hover {
					transform: translateY(-2px);
					box-shadow: 0 6px 14px rgba(0, 0, 0, 0.07);
					border-color: #93c5fd;
				}
				.draggable-order-card:active {
					cursor: grabbing;
					opacity: 0.7;
				}
				.badge-overflown {
					background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
					color: #ffffff;
					font-weight: 700;
					letter-spacing: 0.4px;
					text-transform: uppercase;
					padding: 0.35rem 0.65rem;
					border-radius: 6px;
					box-shadow: 0 2px 6px rgba(245, 158, 11, 0.35);
					display: inline-flex;
					align-items: center;
					gap: 4px;
				}
				.badge-primary-leg {
					background: #2563eb;
					color: #ffffff;
					font-weight: 600;
					padding: 0.35rem 0.6rem;
					border-radius: 6px;
				}
			`}</style>

			<div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
				<div>
					<p className="text-muted mb-0" style={{ fontSize: "0.92rem" }}>
						Drag and drop route-matched orders into scheduled train trips with automatic cargo overflow management.
					</p>
				</div>
				<div className="d-flex align-items-center gap-2">
					<button
						type="button"
						className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
						onClick={refreshCurrentTrip}
						disabled={loadingDetail || loadingAllotable}
					>
						<IconRefresh size={16} />
						<span>Refresh Manifest</span>
					</button>
				</div>
			</div>

			{error && (
				<div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3" role="alert">
					<IconAlertCircle size={20} />
					<div className="flex-grow-1">{error}</div>
					<button type="button" className="btn-close btn-sm" onClick={() => setError("")}></button>
				</div>
			)}

			{success && (
				<div className="alert alert-success d-flex align-items-center gap-2 py-2 mb-3" role="alert">
					<IconCheck size={20} />
					<div className="flex-grow-1">{success}</div>
					<button type="button" className="btn-close btn-sm" onClick={() => setSuccess("")}></button>
				</div>
			)}

			<div className="row g-4">
				{/* COLUMN 1: SELECT TRIP & TRIP CAPACITY OVERVIEW (col-xl-3 col-lg-4) */}
				<div className="col-12 col-xl-3 col-lg-4">
					<div className="kp-card mb-4">
						<div className="d-flex justify-content-between align-items-center mb-3">
							<h5 className="mb-0" style={{ fontWeight: 600, fontSize: "1.05rem" }}>
								<IconTrain size={20} className="me-2 text-primary" />
								Train Trips
							</h5>
							<span className="badge bg-light text-muted border">{filteredTrips.length} scheduled</span>
						</div>

						<div className="mb-3">
							<label className="form-label text-muted" style={{ fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase" }}>
								Filter Destination City
							</label>
							<select
								className="form-select form-select-sm"
								value={selectedCityId}
								onChange={(e) => setSelectedCityId(e.target.value)}
							>
								<option value="">All Destinations ({cities.length})</option>
								{cities.map((c) => (
									<option key={c.city_id} value={c.city_id}>
										{c.name}
									</option>
								))}
							</select>
						</div>

						<div
							className="list-group"
							style={{ maxHeight: "560px", overflowY: "auto", gap: "0.5rem" }}
						>
							{loadingTrips ? (
								<div className="text-center py-4 text-muted">
									<div className="spinner-border spinner-border-sm me-2" role="status" />
									Loading train trips...
								</div>
							) : filteredTrips.length === 0 ? (
								<p className="text-muted text-center py-4 mb-0" style={{ fontSize: "0.9rem" }}>
									No scheduled train trips for this filter.
								</p>
							) : (
								filteredTrips.map((t) => {
									const isSelected = t.trip_id === selectedTripId;
									const tripUsed = Number(t.used_capacity || 0);
									const tripTotal = Number(t.total_capacity || 1);
									const tripPct = Math.min(100, Math.round((tripUsed / tripTotal) * 100));

									return (
										<button
											key={t.trip_id}
											type="button"
											className={`list-group-item list-group-item-action p-3 rounded border text-start ${
												isSelected ? "active" : ""
											}`}
											style={{
												backgroundColor: isSelected ? "var(--color-primary-bg, #eff6ff)" : undefined,
												borderColor: isSelected ? "var(--color-primary, #3b82f6)" : "#e2e8f0",
											}}
											onClick={() => setSelectedTripId(t.trip_id)}
										>
											<div className="d-flex justify-content-between align-items-center mb-1">
												<span
													className="font-monospace"
													style={{
														fontWeight: 700,
														fontSize: "0.9rem",
														color: isSelected ? "#1d4ed8" : undefined,
													}}
												>
													{formatTripId(t.trip_id)}
												</span>
												<span
													className={`badge ${
														t.status === "Loaded"
															? "bg-success"
															: t.status === "Loading"
															? "bg-warning text-dark"
															: "bg-info text-dark"
													}`}
													style={{ fontSize: "0.72rem" }}
												>
													{t.status || "Scheduled"}
												</span>
											</div>

											<div className="d-flex align-items-center gap-1 mb-1" style={{ fontSize: "0.85rem" }}>
												<IconMapPin size={15} className="text-muted" />
												<strong style={{ color: isSelected ? "#1e3a8a" : "#1e293b" }}>
													{t.destination_city}
												</strong>
												<span className="text-muted ms-1" style={{ fontSize: "0.78rem" }}>
													({t.train_name})
												</span>
											</div>

											<div className="d-flex align-items-center gap-1 text-muted mb-2" style={{ fontSize: "0.78rem" }}>
												<IconClock size={13} />
												<span>Dep: {formatDateTime(t.departure_datetime)}</span>
											</div>

											{/* Capacity mini bar */}
											<div style={{ fontSize: "0.72rem" }} className="d-flex justify-content-between text-muted mb-1">
												<span>Capacity: {tripUsed}/{tripTotal}</span>
												<span>{tripPct}%</span>
											</div>
											<div className="progress" style={{ height: "4px" }}>
												<div
													className="progress-bar"
													style={{
														width: `${tripPct}%`,
														backgroundColor: tripPct >= 90 ? "#ef4444" : "#3b82f6",
													}}
												/>
											</div>
										</button>
									);
								})
							)}
						</div>
					</div>
				</div>

				{/* COLUMN 2: ALLOTABLE ORDERS MATCHING THIS DELIVERY PATH (col-xl-4 col-lg-4) */}
				<div className="col-12 col-xl-4 col-lg-4">
					<div className="kp-card h-100 d-flex flex-column" style={{ minHeight: "680px" }}>
						<div className="d-flex justify-content-between align-items-start mb-2">
							<div>
								<h5 className="mb-1" style={{ fontWeight: 600, fontSize: "1.05rem" }}>
									<IconBoxSeam size={20} className="me-2 text-indigo text-primary" />
									Allotable Orders
								</h5>
								<p className="text-muted mb-0" style={{ fontSize: "0.8rem" }}>
									Orders destined for <strong>{tripDetail?.destination_city || "Selected Route"}</strong>
								</p>
							</div>
							<span className="badge bg-primary rounded-pill px-2 py-1">
								{filteredAllotable.length} Available
							</span>
						</div>

						{/* Search & Auto-Allocate All */}
						<div className="mt-2 mb-3">
							<div className="input-group input-group-sm mb-2">
								<span className="input-group-text bg-white border-end-0">
									<IconSearch size={14} className="text-muted" />
								</span>
								<input
									type="text"
									className="form-control border-start-0"
									placeholder="Search by Order ID, customer, product..."
									value={searchAllotable}
									onChange={(e) => setSearchAllotable(e.target.value)}
								/>
								{searchAllotable && (
									<button
										className="btn btn-outline-secondary"
										type="button"
										onClick={() => setSearchAllotable("")}
									>
										✕
									</button>
								)}
							</div>

							<button
								type="button"
								className="btn btn-sm btn-outline-primary w-100 d-inline-flex align-items-center justify-content-center gap-2"
								onClick={handleAutoAllocateAll}
								disabled={allocating || !filteredAllotable.length}
								title="Sequentially allocate all orders, automatically scheduling excess to subsequent trips"
							>
								<IconBolt size={16} />
								<span>Auto-Allocate All with Overflow</span>
							</button>
						</div>

						{/* Scrollable list of allotable orders */}
						<div
							className="flex-grow-1 overflow-auto pe-1"
							style={{ maxHeight: "600px", display: "flex", flexDirection: "column", gap: "0.75rem" }}
						>
							{loadingAllotable ? (
								<div className="text-center py-5 text-muted">
									<div className="spinner-border spinner-border-sm me-2" role="status" />
									Searching delivery path orders...
								</div>
							) : filteredAllotable.length === 0 ? (
								<div className="text-center py-5 text-muted bg-light rounded p-4">
									<IconPackage size={36} className="text-muted mb-2" stroke={1.5} />
									<p className="mb-1" style={{ fontWeight: 600 }}>
										No Unallocated Orders
									</p>
									<p className="mb-0" style={{ fontSize: "0.8rem" }}>
										All orders destined for {tripDetail?.destination_city || "this city"} are currently allocated!
									</p>
								</div>
							) : (
								filteredAllotable.map((item) => {
									const isBeingDragged = draggingItem?.order_item_id === item.order_item_id;
									const hasPartialSplit = (item.existing_allocations || []).length > 0;

									return (
										<div
											key={item.order_item_id}
											draggable={true}
											onDragStart={(e) => handleDragStart(e, item)}
											onDragEnd={handleDragEnd}
											className="draggable-order-card p-3"
											style={{
												opacity: isBeingDragged ? 0.5 : 1,
												borderLeft: hasPartialSplit ? "4px solid #f59e0b" : "4px solid #3b82f6",
											}}
										>
											<div className="d-flex justify-content-between align-items-center mb-1">
												<div className="d-flex align-items-center gap-1">
													<span title="Drag to load into trip loading bay" className="text-muted">
														<IconGripVertical size={16} />
													</span>
													<span className="font-monospace fw-bold text-dark" style={{ fontSize: "0.88rem" }}>
														#ORD-{item.order_id}
													</span>
												</div>
												<span className="badge bg-light text-dark border font-monospace" style={{ fontSize: "0.72rem" }}>
													Item #{item.order_item_id}
												</span>
											</div>

											<div className="mb-1">
												<span className="fw-semibold text-primary" style={{ fontSize: "0.9rem" }}>
													{item.product_name}
												</span>
											</div>

											<div className="text-muted mb-2" style={{ fontSize: "0.78rem" }}>
												<div>
													👤 <strong>{item.customer_name}</strong> | 🏬 {item.store_name} ({item.route_name})
												</div>
												<div>📍 {item.delivery_address}</div>
											</div>

											{/* Existing split alert badge */}
											{hasPartialSplit && (
												<div
													className="alert alert-warning py-1 px-2 mb-2 d-flex align-items-center gap-1"
													style={{ fontSize: "0.74rem" }}
												>
													<IconArrowsSplit size={14} />
													<span>
														<strong>Split Order:</strong> {item.allocated_quantity} units already on TRP-
														{item.existing_allocations.map((a) => a.trip_id).join(", ")}
													</span>
												</div>
											)}

											<div className="d-flex justify-content-between align-items-center pt-2 border-top">
												<div>
													<span className="fw-bold fs-6 text-dark">{item.unallocated_quantity}</span>
													<span className="text-muted" style={{ fontSize: "0.8rem" }}>
														{" "}
														units ({item.unallocated_volume} m³)
													</span>
												</div>
												<div className="d-flex gap-1">
													<button
														type="button"
														className="btn btn-sm btn-primary py-1 px-2"
														style={{ fontSize: "0.78rem" }}
														onClick={() => executeAllocation(item, false)}
														disabled={allocating}
														title="Load directly into currently selected trip"
													>
														➕ Load
													</button>
													<button
														type="button"
														className="btn btn-sm btn-outline-warning py-1 px-2"
														style={{ fontSize: "0.78rem" }}
														onClick={() => executeAllocation(item, true)}
														disabled={allocating}
														title="Load available space and automatically overflow the remainder to subsequent trips"
													>
														⚡ Overflow
													</button>
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>
				</div>

				{/* COLUMN 3: TRIP MANIFEST & DROP LOADING BAY (col-xl-5 col-lg-4) */}
				<div className="col-12 col-xl-5 col-lg-4">
					{loadingDetail ? (
						<div className="kp-card text-center py-5 text-muted">
							<div className="spinner-border spinner-border-sm me-2" role="status" />
							Loading trip loading bay...
						</div>
					) : !tripDetail ? (
						<div className="kp-card text-center py-5 text-muted">
							<IconTrain size={48} className="mb-2 text-muted" stroke={1.5} />
							<p>Select a trip from the left sidebar to view its loading status.</p>
						</div>
					) : (
						<>
							{/* TRIP CAPACITY SUMMARY */}
							<div className="kp-card mb-4">
								<div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
									<div>
										<h4 className="mb-1" style={{ fontWeight: 700 }}>
											{formatTripId(tripDetail.trip_id)} — {tripDetail.destination_city}
										</h4>
										<p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
											Train: <strong>{tripDetail.train_name}</strong> | Departure: {formatDateTime(tripDetail.departure_datetime)}
										</p>
									</div>
									<span
										className={`badge ${
											tripDetail.status === "Loaded"
												? "bg-success"
												: tripDetail.status === "Loading"
												? "bg-warning text-dark"
												: "bg-info text-dark"
										}`}
										style={{ fontSize: "0.85rem", padding: "0.45rem 0.8rem" }}
									>
										{tripDetail.status || "Scheduled"}
									</span>
								</div>

								{/* Capacity Bar */}
								<div className="mt-3">
									<div className="d-flex justify-content-between align-items-center mb-1">
										<span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Allocated Cargo Capacity</span>
										<span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
											{usedCap} / {totalCap} units ({capPct}%)
										</span>
									</div>
									<div className="progress" style={{ height: "12px", borderRadius: "6px" }}>
										<div
											className="progress-bar"
											role="progressbar"
											style={{
												width: `${capPct}%`,
												backgroundColor: isNearCapacity ? "#ef4444" : capPct > 60 ? "#3b82f6" : "#10b981",
												transition: "width 0.3s ease",
											}}
										/>
									</div>

									<div className="d-flex justify-content-between align-items-center mt-2" style={{ fontSize: "0.8rem" }}>
										<span className={isNearCapacity ? "text-danger fw-bold" : "text-muted"}>
											Remaining Space: <strong>{remainingCap}</strong> units
										</span>
										{isNearCapacity && (
											<span className="badge bg-danger d-inline-flex align-items-center gap-1">
												<IconAlertTriangle size={13} /> Near Capacity
											</span>
										)}
									</div>
								</div>
							</div>

							{/* TRIP MANIFEST / DROP BAY ZONE */}
							<div
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
								className={`kp-card drop-zone-bay mb-4 ${isDragOver ? "drop-zone-active" : ""}`}
								style={{ padding: 0, overflow: "hidden" }}
							>
								{/* Drop Banner when hovering */}
								{isDragOver && (
									<div
										className="p-3 text-center bg-primary text-white d-flex align-items-center justify-content-center gap-2"
										style={{ fontWeight: 600, fontSize: "0.95rem" }}
									>
										<IconTransferIn size={22} />
										<span>Drop order item here to allocate to Trip #{formatTripId(tripDetail.trip_id)}</span>
									</div>
								)}

								<div
									className="d-flex justify-content-between align-items-center p-3 border-bottom flex-wrap gap-2"
									style={{ background: "#f8fafc" }}
								>
									<div>
										<h5 className="mb-0" style={{ fontWeight: 700, fontSize: "1rem" }}>
											Loaded Cargo Manifest ({allocations.length} allocations)
										</h5>
										<span className="text-muted" style={{ fontSize: "0.75rem" }}>
											Drag and drop orders into this container
										</span>
									</div>
									<span className="badge bg-light text-dark border">
										Destination: {tripDetail.destination_city}
									</span>
								</div>

								{allocations.length === 0 ? (
									<div className="text-center py-5 text-muted p-4">
										<IconBoxSeam size={44} className="mb-2 text-muted" stroke={1.5} />
										<h6 className="fw-bold mb-1">Loading Bay is Empty</h6>
										<p className="mb-0 text-muted" style={{ fontSize: "0.85rem" }}>
											Drag orders from the left panel or click <strong>➕ Load</strong> to allocate cargo onto this train.
										</p>
									</div>
								) : (
									<div className="table-responsive">
										<table className="table align-middle mb-0">
											<thead className="table-light text-uppercase" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
												<tr>
													<th className="ps-3">Allocation</th>
													<th>Order Item</th>
													<th>Product</th>
													<th>Qty</th>
													<th>Flags & Parts</th>
													<th>Status</th>
													<th className="text-end pe-3">Actions</th>
												</tr>
											</thead>
											<tbody>
												{allocations.map((a) => (
													<tr
														key={a.cargo_allocation_id}
														style={{
															backgroundColor: a.is_overflow ? "rgba(245, 158, 11, 0.05)" : undefined,
														}}
													>
														<td className="ps-3">
															<span className="badge bg-light text-dark border font-monospace">
																#{a.cargo_allocation_id}
															</span>
														</td>

														<td>
															<span className="font-monospace fw-bold" style={{ fontSize: "0.88rem" }}>
																{a.order_id ? `#ORD-${a.order_id}` : `Item #${a.order_item_id}`}
															</span>
															{a.customer_name && (
																<div className="text-muted" style={{ fontSize: "0.74rem" }}>
																	{a.customer_name}
																</div>
															)}
														</td>

														<td>
															<span className="fw-semibold text-dark" style={{ fontSize: "0.85rem" }}>
																{a.product_name || `Product #${a.product_id}`}
															</span>
														</td>

														<td>
															<span className="fw-bold">{a.allocated_quantity}</span>
															<span className="text-muted" style={{ fontSize: "0.75rem" }}>
																{" "}
																units
															</span>
														</td>

														{/* OVERFLOWN FLAG & LINKED PARTS STATE */}
														<td>
															<div className="d-flex flex-column gap-1 align-items-start">
																{/* Overflown Badge */}
																{a.is_overflow && (
																	<span className="badge-overflown" title="This cargo was automatically overflown from an earlier full trip">
																		<IconBolt size={12} />
																		<span>OVERFLOWN</span>
																	</span>
																)}

																{/* Multi-Trip Linked Parts Button */}
																{a.has_linked_parts ? (
																	<button
																		type="button"
																		className="btn btn-sm btn-outline-info py-0 px-2 d-inline-flex align-items-center gap-1"
																		style={{ fontSize: "0.72rem" }}
																		onClick={() =>
																			setLinkedModal({
																				show: true,
																				allocation: a,
																			})
																		}
																		title="View other parts of this split order across all train trips"
																	>
																		<IconEye size={12} />
																		<span>Other Parts ({a.linked_parts.length})</span>
																	</button>
																) : (
																	!a.is_overflow && (
																		<span className="badge bg-light text-muted border" style={{ fontSize: "0.7rem" }}>
																			Single Trip
																		</span>
																	)
																)}
															</div>
														</td>

														{/* Loading Status dropdown */}
														<td>
															<select
																className={`form-select form-select-sm ${
																	a.status === "Loaded"
																		? "text-success border-success"
																		: a.status === "Partially Loaded"
																		? "text-warning border-warning"
																		: "text-muted"
																}`}
																style={{ width: "auto", minWidth: "125px", fontWeight: 600, fontSize: "0.78rem" }}
																value={a.status || "Not Loaded"}
																onChange={(e) => handleStatusChange(a.cargo_allocation_id, e.target.value)}
																disabled={tripDetail.status === "Loaded"}
															>
																<option value="Not Loaded">Not Loaded</option>
																<option value="Partially Loaded">Partially Loaded</option>
																<option value="Loaded">Loaded</option>
															</select>
														</td>

														{/* Actions: Shortfall or Remove */}
														<td className="text-end pe-3">
															<div className="d-inline-flex gap-1">
																{a.status !== "Loaded" && a.allocated_quantity > 1 && (
																	<button
																		type="button"
																		className="btn btn-sm btn-outline-danger py-0 px-2"
																		style={{ fontSize: "0.72rem" }}
																		title="Requeue platform shortfall to next trip"
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

																{a.status !== "Loaded" && (
																	<button
																		type="button"
																		className="btn btn-sm btn-outline-secondary py-0 px-1 text-danger border-0"
																		style={{ fontSize: "0.75rem" }}
																		title="Remove allocation"
																		onClick={() => handleRemoveAllocation(a.cargo_allocation_id)}
																	>
																		<IconTrash size={15} />
																	</button>
																)}
															</div>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}

								{allocations.length > 0 && (
									<div className="p-3 bg-light border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
										<div className="text-muted" style={{ fontSize: "0.8rem" }}>
											Total Allocated: <strong>{usedCap}</strong> / {totalCap} units
										</div>
										<button
											type="button"
											className="btn btn-success d-inline-flex align-items-center gap-2"
											onClick={handleMarkAllLoaded}
											disabled={tripDetail.status === "Loaded"}
										>
											<IconCheck size={18} />
											<span>
												{tripDetail.status === "Loaded"
													? "Manifest Locked (All Loaded)"
													: "Mark All Loaded & Lock Manifest"}
											</span>
										</button>
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</div>

			{/* MODAL 1: VIEW OTHER PART STATE OF SPLIT / OVERFLOWN ORDER */}
			{linkedModal.show && linkedModal.allocation && (
				<div
					className="modal show d-block"
					tabIndex="-1"
					style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
				>
					<div className="modal-dialog modal-dialog-centered modal-lg">
						<div className="modal-content shadow-lg border-0">
							<div className="modal-header bg-dark text-white">
								<h5 className="modal-title d-flex align-items-center gap-2">
									<IconArrowsSplit size={22} className="text-warning" />
									<span>Multi-Trip Order Breakdown & Linked Parts</span>
								</h5>
								<button
									type="button"
									className="btn-close btn-close-white"
									onClick={() => setLinkedModal({ show: false, allocation: null })}
								></button>
							</div>

							<div className="modal-body p-4">
								<div className="alert alert-info py-2 px-3 mb-4 d-flex justify-content-between align-items-center">
									<div>
										<strong>Order #{linkedModal.allocation.order_id || linkedModal.allocation.order_item_id}</strong> — Product:{" "}
										<strong>{linkedModal.allocation.product_name}</strong>
									</div>
									<span className="badge bg-primary">
										1 Current Part + {linkedModal.allocation.linked_parts.length} Linked Part(s)
									</span>
								</div>

								<h6 className="fw-bold mb-3 text-muted text-uppercase" style={{ fontSize: "0.78rem", letterSpacing: "0.5px" }}>
									Current Trip Part (This Train)
								</h6>

								<div className="card mb-4 border-primary">
									<div className="card-body p-3">
										<div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
											<div>
												<div className="d-flex align-items-center gap-2 mb-1">
													<span className="fw-bold font-monospace fs-6">
														{formatTripId(linkedModal.allocation.trip_id)}
													</span>
													<span className="text-muted">({tripDetail?.train_name})</span>
													{linkedModal.allocation.is_overflow ? (
														<span className="badge-overflown" style={{ fontSize: "0.7rem" }}>
															🌊 OVERFLOWN PART
														</span>
													) : (
														<span className="badge bg-primary" style={{ fontSize: "0.7rem" }}>
															⭐ PRIMARY PART
														</span>
													)}
												</div>
												<div className="text-muted" style={{ fontSize: "0.82rem" }}>
													Destination: <strong>{tripDetail?.destination_city}</strong> | Departs:{" "}
													{formatDateTime(tripDetail?.departure_datetime)}
												</div>
											</div>

											<div className="text-end">
												<div className="fw-bold fs-5 text-dark">
													{linkedModal.allocation.allocated_quantity} units
												</div>
												<span
													className={`badge ${
														linkedModal.allocation.status === "Loaded"
															? "bg-success"
															: linkedModal.allocation.status === "Partially Loaded"
															? "bg-warning text-dark"
															: "bg-secondary"
													}`}
												>
													Loading: {linkedModal.allocation.status || "Not Loaded"}
												</span>
											</div>
										</div>
									</div>
								</div>

								<h6 className="fw-bold mb-3 text-muted text-uppercase" style={{ fontSize: "0.78rem", letterSpacing: "0.5px" }}>
									Linked Part(s) Across Other Scheduled Trips
								</h6>

								<div className="table-responsive border rounded">
									<table className="table align-middle mb-0">
										<thead className="table-light" style={{ fontSize: "0.75rem" }}>
											<tr>
												<th>Trip ID</th>
												<th>Train</th>
												<th>Destination</th>
												<th>Departure</th>
												<th>Quantity</th>
												<th>Overflown Flag</th>
												<th>Loading State</th>
												<th>Trip Status</th>
											</tr>
										</thead>
										<tbody>
											{linkedModal.allocation.linked_parts.map((part) => (
												<tr key={part.cargo_allocation_id}>
													<td>
														<span className="font-monospace fw-bold text-primary">
															{formatTripId(part.trip_id)}
														</span>
													</td>
													<td>{part.train_name}</td>
													<td>{part.destination_city}</td>
													<td style={{ fontSize: "0.82rem" }}>{formatDateTime(part.departure_datetime)}</td>
													<td className="fw-bold">{part.allocated_quantity} units</td>
													<td>
														{part.is_overflow ? (
															<span className="badge-overflown" style={{ fontSize: "0.68rem" }}>
																🌊 OVERFLOWN
															</span>
														) : (
															<span className="badge bg-secondary" style={{ fontSize: "0.68rem" }}>
																Primary
															</span>
														)}
													</td>
													<td>
														<span
															className={`badge ${
																part.status === "Loaded"
																	? "bg-success"
																	: part.status === "Partially Loaded"
																	? "bg-warning text-dark"
																	: "bg-secondary"
															}`}
														>
															{part.status || "Not Loaded"}
														</span>
													</td>
													<td>
														<span className="badge bg-light text-dark border">
															{part.trip_status || "Scheduled"}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							<div className="modal-footer bg-light">
								<button
									type="button"
									className="btn btn-secondary btn-sm"
									onClick={() => setLinkedModal({ show: false, allocation: null })}
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* MODAL 2: SHORTFALL REQUEUE (REQ-RAIL-07) */}
			{shortfallModal.show && (
				<div
					className="modal show d-block"
					tabIndex="-1"
					style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
				>
					<div className="modal-dialog modal-dialog-centered">
						<div className="modal-content shadow border-0">
							<div className="modal-header">
								<h5 className="modal-title d-flex align-items-center gap-2">
									<IconAlertTriangle className="text-danger" size={20} />
									<span>Record Platform Shortfall</span>
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
									<p style={{ fontSize: "0.88rem" }}>
										If an allocated item cannot be fully loaded by departure time (physical platform shortfall),
										the unloaded quantity will be automatically requeued onto the next scheduled trip for this destination.
									</p>
									<div className="mb-3">
										<label className="form-label" style={{ fontWeight: 600, fontSize: "0.85rem" }}>
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

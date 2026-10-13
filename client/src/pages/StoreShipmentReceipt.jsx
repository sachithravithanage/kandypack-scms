import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import * as XLSX from "xlsx";
import {
  IconBuildingWarehouse,
  IconTrain,
  IconCheck,
  IconAlertTriangle,
  IconAlertCircle,
  IconBoxSeam,
  IconRefresh,
  IconShieldCheck,
  IconFileSpreadsheet,
  IconSearch
} from "@tabler/icons-react";

const API_BASE = apiUrl("/api");

function StoreShipmentReceipt() {
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const [incomingTrips, setIncomingTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState("");

  const [tripInfo, setTripInfo] = useState(null);
  const [manifest, setManifest] = useState([]);
  const [receivedInputs, setReceivedInputs] = useState({});
  const [notesInputs, setNotesInputs] = useState({});

  const [storeStock, setStoreStock] = useState([]);
  const [activeTab, setActiveTab] = useState("manifest"); // "manifest" | "inventory"

  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [manifestSearch, setManifestSearch] = useState(urlSearch);
  const [inventorySearch, setInventorySearch] = useState(urlSearch);

  useEffect(() => {
    setManifestSearch(urlSearch);
    setInventorySearch(urlSearch);
  }, [urlSearch]);

  const handleManifestSearchChange = (val) => {
    setManifestSearch(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("search", val);
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleInventorySearchChange = (val) => {
    setInventorySearch(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("search", val);
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  // 2. Load Incoming Trips & Stock when store changes
  const loadStoreData = useCallback(async (storeId) => {
    if (!storeId) return;
    setError("");
    setSuccess("");
    try {
      const [tripsRes, stockRes] = await Promise.all([
        axios.get(`${API_BASE}/stores/${storeId}/incoming-trips`, getAuthHeader()),
        axios.get(`${API_BASE}/stores/${storeId}/stock`, getAuthHeader()),
      ]);

      const trips = tripsRes.data || [];
      setIncomingTrips(trips);
      setStoreStock(stockRes.data || []);

      if (trips.length > 0) {
        setSelectedTripId(String(trips[0].trip_id));
      } else {
        setSelectedTripId("");
        setTripInfo(null);
        setManifest([]);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load store shipment data");
    }
  }, []);

  useEffect(() => {
    if (selectedStoreId) {
      loadStoreData(selectedStoreId);
    }
  }, [selectedStoreId, loadStoreData]);

  // 3. Load Trip Manifest when trip changes
  const loadManifest = useCallback(async (storeId, tripId) => {
    if (!storeId || !tripId) return;
    setLoadingManifest(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.get(
        `${API_BASE}/stores/${storeId}/incoming/${tripId}/manifest`,
        getAuthHeader()
      );
      const data = res.data || {};
      setTripInfo(data.trip || null);
      const items = data.manifest || [];
      setManifest(items);

      // Pre-populate input fields
      const initialReceived = {};
      const initialNotes = {};
      items.forEach((item) => {
        initialReceived[item.cargo_allocation_id] =
          item.received_quantity !== null && item.received_quantity !== undefined
            ? item.received_quantity
            : item.expected_quantity;
        initialNotes[item.cargo_allocation_id] = item.discrepancy_note || "";
      });
      setReceivedInputs(initialReceived);
      setNotesInputs(initialNotes);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load trip manifest details");
    } finally {
      setLoadingManifest(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStoreId && selectedTripId) {
      loadManifest(selectedStoreId, selectedTripId);
    }
  }, [selectedStoreId, selectedTripId, loadManifest]);

  const handleReceivedQtyChange = (allocationId, value) => {
    setReceivedInputs((prev) => ({
      ...prev,
      [allocationId]: value === "" ? "" : Number(value),
    }));
  };

  const handleNotesChange = (allocationId, value) => {
    setNotesInputs((prev) => ({
      ...prev,
      [allocationId]: value,
    }));
  };

  // Set all received quantities to match expected quantities
  const handleAutoFillExpected = () => {
    const filled = {};
    manifest.forEach((item) => {
      filled[item.cargo_allocation_id] = item.expected_quantity;
    });
    setReceivedInputs(filled);
  };

  // Submit manifest reconciliation
  const handleConfirmReceipt = async (e) => {
    e.preventDefault();
    if (!selectedStoreId || !selectedTripId) return;
    setError("");
    setSuccess("");

    // Validate inputs
    for (const item of manifest) {
      const val = receivedInputs[item.cargo_allocation_id];
      if (val === "" || val === undefined || isNaN(val) || Number(val) < 0) {
        setError(`Please provide a valid non-negative received quantity for Item #${item.cargo_allocation_id}`);
        return;
      }
    }

    const receiptsPayload = manifest.map((item) => ({
      cargoAllocationId: item.cargo_allocation_id,
      productId: item.product_id,
      receivedQuantity: Number(receivedInputs[item.cargo_allocation_id]),
      note: notesInputs[item.cargo_allocation_id]?.trim() || null,
    }));

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_BASE}/stores/${selectedStoreId}/receive`,
        {
          tripId: Number(selectedTripId),
          receipts: receiptsPayload,
        },
        getAuthHeader()
      );

      if (res.data.hasDiscrepancy || res.data.discrepancy) {
        setSuccess("Shipment reconciliation recorded with Discrepancy warnings logged to audit & notifications!");
      } else {
        setSuccess("Shipment received and reconciled successfully. Store inventory updated!");
      }

      // Refresh manifest and store inventory ledger
      await loadManifest(selectedStoreId, selectedTripId);
      const stockRes = await axios.get(`${API_BASE}/stores/${selectedStoreId}/stock`, getAuthHeader());
      setStoreStock(stockRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to confirm shipment receipt");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations for current manifest
  const totalExpected = manifest.reduce((acc, m) => acc + Number(m.expected_quantity || 0), 0);
  const totalReceived = manifest.reduce((acc, m) => {
    const val = receivedInputs[m.cargo_allocation_id];
    return acc + (val !== "" && val !== undefined ? Number(val) : 0);
  }, 0);
  const discrepancyCount = manifest.filter((m) => {
    const rec = receivedInputs[m.cargo_allocation_id];
    return rec !== "" && rec !== undefined && Number(rec) < Number(m.expected_quantity);
  }).length;

  const filteredManifest = useMemo(() => {
    if (!manifestSearch.trim()) return manifest;
    const q = manifestSearch.toLowerCase().trim();
    return manifest.filter((item) =>
      String(item.cargo_allocation_id).includes(q) ||
      String(item.order_id).includes(q) ||
      (item.product_name && item.product_name.toLowerCase().includes(q))
    );
  }, [manifest, manifestSearch]);

  const filteredStoreStock = useMemo(() => {
    if (!inventorySearch.trim()) return storeStock;
    const q = inventorySearch.toLowerCase().trim();
    return storeStock.filter((prod) =>
      String(prod.product_id).includes(q) ||
      (prod.product_name && prod.product_name.toLowerCase().includes(q))
    );
  }, [storeStock, inventorySearch]);

  const exportManifestExcel = () => {
    const exportData = manifest.map((item) => {
      const rec = receivedInputs[item.cargo_allocation_id];
      const exp = Number(item.expected_quantity);
      const recNum = rec !== "" && rec !== undefined ? Number(rec) : exp;
      const diff = recNum - exp;
      let status = "Reconciled";
      if (diff < 0) status = `Discrepant (${diff})`;
      else if (diff > 0) status = `Over (+${diff})`;

      return {
        "Allocation ID": item.cargo_allocation_id,
        "Order ID": item.order_id,
        "Product ID": item.product_id,
        "Product Name": item.product_name,
        "Space Rate (m³)": item.space_consumption_rate,
        "Expected Quantity": exp,
        "Received Quantity": recNum,
        "Difference": diff,
        "Verification Status": status,
        "Notes / Discrepancy Reason": notesInputs[item.cargo_allocation_id] || item.discrepancy_note || ""
      };
    });

    const storeName = stores.find((s) => String(s.store_id) === String(selectedStoreId))?.name || `Store_${selectedStoreId}`;
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Manifest Reconciliation");
    XLSX.writeFile(wb, `Shipment_Manifest_Trip_${selectedTripId || "NA"}_${storeName.replace(/\s+/g, "_")}.xlsx`);
  };

  const exportInventoryExcel = () => {
    const storeName = stores.find((s) => String(s.store_id) === String(selectedStoreId))?.name || `Store_${selectedStoreId}`;
    const exportData = storeStock.map((prod) => ({
      "Product ID": prod.product_id,
      "Product Name": prod.product_name,
      "Current On-Hand Stock": Number(prod.current_stock || 0),
      "Stock Status": Number(prod.current_stock) > 50 ? "Optimal" : Number(prod.current_stock) > 0 ? "Low Stock" : "Out of Stock"
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Store Inventory Ledger");
    XLSX.writeFile(wb, `Store_Inventory_Ledger_${storeName.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <AppLayout pageTitle="Store Shipment Receipt">
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

      {/* Header Controls: Store and Trip Selectors */}
      <div className="kp-card mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-md-5">
            <label className="form-label text-muted" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              <IconBuildingWarehouse size={16} className="me-1 align-text-bottom" />
              REGIONAL STORE FACILITY
            </label>
            <select
              className="form-select"
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              disabled={loading || submitting}
            >
              {stores.map((s) => (
                <option key={s.store_id} value={s.store_id}>
                  {s.name} ({s.city_name || "City #" + s.city_id})
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-5">
            <label className="form-label text-muted" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              <IconTrain size={16} className="me-1 align-text-bottom" />
              INCOMING TRAIN TRIP (LOADED)
            </label>
            <select
              className="form-select"
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              disabled={loading || incomingTrips.length === 0 || submitting}
            >
              {incomingTrips.length === 0 ? (
                <option value="">No incoming loaded trips found for this store</option>
              ) : (
                incomingTrips.map((t) => (
                  <option key={t.trip_id} value={t.trip_id}>
                    Trip #{t.trip_id} — {t.train_name} | Arr: {new Date(t.arrival_datetime).toLocaleString()} ({t.status})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="col-md-2 d-flex align-items-end">
            <button
              type="button"
              className="btn btn-outline-secondary w-100 d-inline-flex align-items-center justify-content-center"
              onClick={() => {
                if (selectedStoreId) loadStoreData(selectedStoreId);
                if (selectedStoreId && selectedTripId) loadManifest(selectedStoreId, selectedTripId);
              }}
              disabled={loading || loadingManifest}
              style={{ padding: "8px 16px", marginTop: "24px" }}
            >
              <IconRefresh size={16} className={`me-1.5 ${loading || loadingManifest ? "spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {tripInfo && (
          <div
            className="mt-3 pt-3 border-top d-flex flex-wrap gap-4 text-muted"
            style={{ fontSize: "0.85rem" }}
          >
            <div>
              <span className="fw-semibold text-dark">Train:</span> {tripInfo.train_name}
            </div>
            <div>
              <span className="fw-semibold text-dark">Departure:</span>{" "}
              {new Date(tripInfo.departure_datetime).toLocaleString()}
            </div>
            <div>
              <span className="fw-semibold text-dark">Arrival:</span>{" "}
              {new Date(tripInfo.arrival_datetime).toLocaleString()}
            </div>
            <div>
              <span className="fw-semibold text-dark">Trip Status:</span>{" "}
              <span className="kp-badge kp-badge-info">{tripInfo.status}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="d-flex gap-2 mb-3">
        <button
          type="button"
          className={`btn d-inline-flex align-items-center gap-1.5 ${activeTab === "manifest" ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => setActiveTab("manifest")}
        >
          <IconFileSpreadsheet size={16} />
          Manifest Reconciliation
        </button>
        <button
          type="button"
          className={`btn d-inline-flex align-items-center gap-1.5 ${activeTab === "inventory" ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => setActiveTab("inventory")}
        >
          <IconBoxSeam size={16} />
          Current Store Inventory Ledger ({storeStock.length} Products)
        </button>
      </div>

      {activeTab === "manifest" ? (
        <>
          {/* Summary Stat Cards */}
          <div className="kp-stat-grid mb-4">
            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "var(--color-info-bg)" }}>
                <IconTrain size={20} color="var(--color-info-text)" />
              </div>
              <p className="kp-stat-label">Manifest Line Items</p>
              <p className="kp-stat-value mb-0">{manifest.length}</p>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "var(--color-warning-bg)" }}>
                <IconBoxSeam size={20} color="var(--color-warning-text)" />
              </div>
              <p className="kp-stat-label">Total Expected Units</p>
              <p className="kp-stat-value mb-0">{totalExpected}</p>
            </div>

            <div className="kp-stat-card">
              <div className="kp-stat-icon" style={{ background: "var(--color-success-bg)" }}>
                <IconShieldCheck size={20} color="var(--color-success-text)" />
              </div>
              <p className="kp-stat-label">Total Received Units</p>
              <p className="kp-stat-value mb-0">{totalReceived}</p>
            </div>

            <div className="kp-stat-card">
              <div
                className="kp-stat-icon"
                style={{
                  background: discrepancyCount > 0 ? "var(--color-danger-bg)" : "var(--color-bg)",
                }}
              >
                <IconAlertTriangle
                  size={20}
                  color={discrepancyCount > 0 ? "var(--color-danger-text)" : "var(--color-text-muted)"}
                />
              </div>
              <p className="kp-stat-label">Discrepant Allocations</p>
              <p className="kp-stat-value mb-0" style={{ color: discrepancyCount > 0 ? "var(--color-danger-text)" : "inherit" }}>
                {discrepancyCount}
              </p>
            </div>
          </div>

          {/* Manifest Table Card */}
          <div className="kp-card">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
              <div>
                <h5 className="mb-0 fw-bold">
                  Incoming Manifest Verification
                </h5>
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="input-group input-group-sm" style={{ width: "240px" }}>
                  <span className="input-group-text bg-white">
                    <IconSearch size={14} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search manifest..."
                    value={manifestSearch}
                    onChange={(e) => handleManifestSearchChange(e.target.value)}
                    disabled={manifest.length === 0}
                  />
                  {manifestSearch && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => handleManifestSearchChange("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {manifest.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
                      onClick={handleAutoFillExpected}
                      disabled={submitting}
                    >
                      <IconCheck size={16} className="me-1.5 text-success" />
                      Auto-fill Expected
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success d-inline-flex align-items-center"
                      onClick={exportManifestExcel}
                      disabled={submitting}
                    >
                      <IconFileSpreadsheet size={16} className="me-1.5" />
                      Export Excel
                    </button>
                  </>
                )}
              </div>
            </div>

            {loadingManifest ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2 text-muted">Loading manifest items...</p>
              </div>
            ) : manifest.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <IconBuildingWarehouse size={40} className="mb-2 opacity-50" />
                <p>No manifest items found for the selected incoming trip.</p>
              </div>
            ) : filteredManifest.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <IconSearch size={36} className="mb-2 opacity-50" />
                <p>No manifest items matched &ldquo;{manifestSearch}&rdquo;</p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleManifestSearchChange("")}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmReceipt}>
                <div className="table-responsive">
                  <table className="table align-middle" style={{ fontSize: "0.9rem" }}>
                    <thead className="table-light">
                      <tr>
                        <th>Allocation #</th>
                        <th>Order #</th>
                        <th>Product</th>
                        <th className="text-center">Expected Qty</th>
                        <th style={{ width: "160px" }}>Received Qty</th>
                        <th className="text-center">Verification Status</th>
                        <th>Notes / Discrepancy Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredManifest.map((item) => {
                        const recVal = receivedInputs[item.cargo_allocation_id];
                        const isDiscrepant =
                          recVal !== "" &&
                          recVal !== undefined &&
                          Number(recVal) < Number(item.expected_quantity);
                        const isOver =
                          recVal !== "" &&
                          recVal !== undefined &&
                          Number(recVal) > Number(item.expected_quantity);

                        return (
                          <tr
                            key={item.cargo_allocation_id}
                            style={{
                              backgroundColor: isDiscrepant
                                ? "rgba(254, 226, 226, 0.25)"
                                : undefined,
                            }}
                          >
                            <td className="fw-medium">#{item.cargo_allocation_id}</td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                Order #{item.order_id}
                              </span>
                            </td>
                            <td>
                              <div className="fw-semibold">{item.product_name}</div>
                              <small className="text-muted">Space: {item.space_consumption_rate} m³</small>
                            </td>
                            <td className="text-center fw-bold">{item.expected_quantity}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                min="0"
                                max="99999"
                                value={recVal ?? ""}
                                onChange={(e) =>
                                  handleReceivedQtyChange(item.cargo_allocation_id, e.target.value)
                                }
                                required
                                style={{
                                  borderColor: isDiscrepant
                                    ? "var(--color-danger-text)"
                                    : undefined,
                                  fontWeight: 600,
                                }}
                              />
                            </td>
                            <td className="text-center">
                              {isDiscrepant ? (
                                <span className="kp-badge kp-badge-danger">
                                  <IconAlertTriangle size={13} className="me-1" />
                                  Discrepant (-{Number(item.expected_quantity) - Number(recVal)})
                                </span>
                              ) : isOver ? (
                                <span className="kp-badge kp-badge-warning">
                                  Over (+{Number(recVal) - Number(item.expected_quantity)})
                                </span>
                              ) : (
                                <span className="kp-badge kp-badge-success">
                                  <IconCheck size={13} className="me-1" />
                                  Reconciled
                                </span>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder={isDiscrepant ? "State reason for shortfall..." : "Optional notes"}
                                value={notesInputs[item.cargo_allocation_id] ?? ""}
                                onChange={(e) =>
                                  handleNotesChange(item.cargo_allocation_id, e.target.value)
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                  <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                    <IconAlertCircle size={15} className="me-1" />
                    Recording receipt appends to the store ledger and auto-updates customer orders.
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary d-inline-flex align-items-center"
                    disabled={submitting || manifest.length === 0}
                    style={{ padding: "9px 24px" }}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Recording Ledger...
                      </>
                    ) : (
                      <>
                        <IconShieldCheck size={18} className="me-2" />
                        Confirm & Save Receipt
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      ) : (
        /* Store Inventory Tab */
        <div className="kp-card">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
            <div>
              <h5 className="mb-0 fw-bold">
                Store Inventory On-Hand Ledger
              </h5>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="input-group input-group-sm" style={{ width: "240px" }}>
                <span className="input-group-text bg-white">
                  <IconSearch size={14} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search ledger..."
                  value={inventorySearch}
                  onChange={(e) => handleInventorySearchChange(e.target.value)}
                  disabled={storeStock.length === 0}
                />
                {inventorySearch && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => handleInventorySearchChange("")}
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
                onClick={() => loadStoreData(selectedStoreId)}
              >
                <IconRefresh size={16} className="me-1" />
                Refresh Stock
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-success d-inline-flex align-items-center"
                onClick={exportInventoryExcel}
                disabled={storeStock.length === 0}
              >
                <IconFileSpreadsheet size={16} className="me-1.5" />
                Export Ledger (Excel)
              </button>
            </div>
          </div>

          {storeStock.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <IconBoxSeam size={40} className="mb-2 opacity-50" />
              <p>No inventory records found for this store facility yet.</p>
            </div>
          ) : filteredStoreStock.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <IconSearch size={36} className="mb-2 opacity-50" />
              <p>No inventory products matched &ldquo;{inventorySearch}&rdquo;</p>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => handleInventorySearchChange("")}
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle" style={{ fontSize: "0.9rem" }}>
                <thead className="table-light">
                  <tr>
                    <th>Product ID</th>
                    <th>Product Name</th>
                    <th className="text-end">Current On-Hand Stock</th>
                    <th className="text-center">Stock Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStoreStock.map((prod) => (
                    <tr key={prod.product_id}>
                      <td className="text-muted">#{prod.product_id}</td>
                      <td className="fw-semibold">{prod.product_name}</td>
                      <td className="text-end fw-bold fs-6">
                        {Number(prod.current_stock || 0).toLocaleString()} units
                      </td>
                      <td className="text-center">
                        {Number(prod.current_stock) > 50 ? (
                          <span className="kp-badge kp-badge-success">Optimal</span>
                        ) : Number(prod.current_stock) > 0 ? (
                          <span className="kp-badge kp-badge-warning">Low Stock</span>
                        ) : (
                          <span className="kp-badge kp-badge-danger">Out of Stock</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default StoreShipmentReceipt;

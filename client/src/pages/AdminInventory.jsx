import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconPackage,
  IconPlus,
  IconSearch,
  IconHistory,
  IconFileSpreadsheet,
  IconAlertTriangle,
  IconCheck,
  IconBox,
  IconInfoCircle,
  IconLayersSubtract,
  IconArchive,
} from "@tabler/icons-react";
import * as XLSX from "xlsx";

function AdminInventory() {
  const [stock, setStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState(
    () => new URLSearchParams(window.location.search).get("search") || ""
  );
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | IN_STOCK | LOW_STOCK | OUT_OF_STOCK
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Restock Modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [restockQty, setRestockQty] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [restocking, setRestocking] = useState(false);

  // History Drawer / Modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const token = localStorage.getItem("token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadStock = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(apiUrl("/api/inventory"), authHeader);
      setStock(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load inventory records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const loadHistory = async () => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await axios.get(apiUrl("/api/inventory/history"), authHeader);
      setHistory(res.data || []);
    } catch (err) {
      console.warn("Could not load restock history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenRestock = (item) => {
    setSelectedProduct(item);
    setRestockQty("");
    setBatchNumber(`LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setNotes("");
    setError("");
    setSuccess("");
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = Number(restockQty);
    if (!qty || qty <= 0) {
      setError("Please enter a valid positive quantity to restock.");
      return;
    }

    setRestocking(true);
    setError("");
    setSuccess("");

    try {
      await axios.put(
        apiUrl(`/api/inventory/${selectedProduct.product_id}/restock`),
        {
          quantityAdded: qty,
          batchNumber: batchNumber.trim(),
          notes: notes.trim(),
        },
        authHeader
      );
      setSuccess(`Successfully added ${qty} units to ${selectedProduct.name}.`);
      setSelectedProduct(null);
      loadStock();
    } catch (err) {
      setError(err.response?.data?.error || "Could not complete restock operation.");
    } finally {
      setRestocking(false);
    }
  };

  const handleExportExcel = () => {
    if (stock.length === 0) return;
    const exportRows = stock.map((s) => ({
      "Product ID": s.product_id,
      "Product Name": s.name,
      "Unit Price (LKR)": s.unit_price,
      "Space Consumption (m3)": s.space_consumption_rate,
      "Physical Stock On Hand": s.physical_stock ?? s.quantity_in_stock,
      "Reserved (Open Orders)": s.reserved_stock ?? 0,
      "Available to Promise (ATP)": s.available_stock ?? s.quantity_in_stock,
      Status:
        (s.physical_stock ?? s.quantity_in_stock) <= 0
          ? "Out of Stock"
          : (s.physical_stock ?? s.quantity_in_stock) < 100
          ? "Low Stock"
          : "In Stock",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HQ Inventory");
    XLSX.writeFile(
      workbook,
      `Kandypack_HQ_Inventory_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Filtered Inventory items
  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const physical = item.physical_stock ?? item.quantity_in_stock ?? 0;

      let matchesStatus = true;
      if (statusFilter === "IN_STOCK") matchesStatus = physical >= 100;
      else if (statusFilter === "LOW_STOCK") matchesStatus = physical > 0 && physical < 100;
      else if (statusFilter === "OUT_OF_STOCK") matchesStatus = physical <= 0;

      return matchesSearch && matchesStatus;
    });
  }, [stock, search, statusFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalPhysical = stock.reduce(
      (sum, i) => sum + (i.physical_stock ?? i.quantity_in_stock ?? 0),
      0
    );
    const totalReserved = stock.reduce((sum, i) => sum + (i.reserved_stock ?? 0), 0);
    const totalAvailable = totalPhysical - totalReserved;
    const lowStockCount = stock.filter(
      (i) => (i.physical_stock ?? i.quantity_in_stock ?? 0) < 100 && (i.physical_stock ?? i.quantity_in_stock ?? 0) > 0
    ).length;
    const outOfStockCount = stock.filter(
      (i) => (i.physical_stock ?? i.quantity_in_stock ?? 0) <= 0
    ).length;

    return {
      totalPhysical,
      totalReserved,
      totalAvailable,
      lowStockCount,
      outOfStockCount,
    };
  }, [stock]);

  const getStockBadge = (quantity) => {
    if (quantity <= 0) {
      return <span className="kp-badge kp-badge-danger">Out of Stock</span>;
    }
    if (quantity < 100) {
      return <span className="kp-badge kp-badge-warning">Low Stock (&lt; 100)</span>;
    }
    return <span className="kp-badge kp-badge-success">Optimal Stock</span>;
  };

  return (
    <AppLayout pageTitle="HQ Main Inventory">
      {/* ── Top Summary Metric Cards ─────────────────────────── */}
      <div className="kp-stat-grid mb-4">
        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-info-bg)" }}>
            <IconPackage size={20} stroke={1.75} color="var(--color-info-text)" />
          </div>
          <p className="kp-stat-label">Physical Stock On Hand</p>
          <p className="kp-stat-value">{loading ? "…" : stats.totalPhysical.toLocaleString()}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-warning-bg)" }}>
            <IconLayersSubtract size={20} stroke={1.75} color="var(--color-warning-text)" />
          </div>
          <p className="kp-stat-label">Committed / Reserved (Orders)</p>
          <p className="kp-stat-value">{loading ? "…" : stats.totalReserved.toLocaleString()}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-success-bg)" }}>
            <IconCheck size={20} stroke={1.75} color="var(--color-success-text)" />
          </div>
          <p className="kp-stat-label">Available-to-Promise (ATP)</p>
          <p className="kp-stat-value">{loading ? "…" : stats.totalAvailable.toLocaleString()}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-danger-bg)" }}>
            <IconAlertTriangle size={20} stroke={1.75} color="var(--color-danger-text)" />
          </div>
          <p className="kp-stat-label">Stock Alerts (&lt; 100)</p>
          <p className="kp-stat-value">
            {loading ? "…" : `${stats.lowStockCount + stats.outOfStockCount} SKUs`}
          </p>
        </div>
      </div>

      <div className="kp-card">
        {/* ── Action Header ─────────────────────────────────────── */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h2 className="h5 mb-1">Central Warehouse Stock Control</h2>
            <p className="text-muted small mb-0">
              Real-time stock balance, order reservation tracking, and factory batch restock management.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              onClick={loadHistory}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            >
              <IconHistory size={16} />
              <span>Restock History</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
              disabled={stock.length === 0}
            >
              <IconFileSpreadsheet size={16} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger p-2 small mb-3">{error}</div>}
        {success && <div className="alert alert-success p-2 small mb-3">{success}</div>}

        {/* ── Search & Filter Controls ─────────────────────────── */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div style={{ minWidth: "260px", maxWidth: "400px", flex: 1 }}>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white">
                <IconSearch size={15} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search products by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setSearch("")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="d-flex flex-wrap gap-1">
            <button
              className={`btn btn-sm ${
                statusFilter === "ALL" ? "btn-primary" : "btn-light border"
              }`}
              onClick={() => setStatusFilter("ALL")}
            >
              All Items ({stock.length})
            </button>
            <button
              className={`btn btn-sm ${
                statusFilter === "IN_STOCK" ? "btn-primary" : "btn-light border"
              }`}
              onClick={() => setStatusFilter("IN_STOCK")}
            >
              In Stock ({stock.length - stats.lowStockCount - stats.outOfStockCount})
            </button>
            <button
              className={`btn btn-sm ${
                statusFilter === "LOW_STOCK" ? "btn-warning text-dark" : "btn-light border"
              }`}
              onClick={() => setStatusFilter("LOW_STOCK")}
            >
              Low Stock ({stats.lowStockCount})
            </button>
            <button
              className={`btn btn-sm ${
                statusFilter === "OUT_OF_STOCK" ? "btn-danger" : "btn-light border"
              }`}
              onClick={() => setStatusFilter("OUT_OF_STOCK")}
            >
              Out of Stock ({stats.outOfStockCount})
            </button>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────── */}
        <div className="table-responsive">
          <table className="table table-hover align-middle small mb-0">
            <thead className="table-light">
              <tr>
                <th>Product Description</th>
                <th>Unit Price</th>
                <th>Cubic Vol</th>
                <th className="text-end">On-Hand Stock</th>
                <th className="text-end">Reserved (Orders)</th>
                <th className="text-end fw-bold">Remaining ATP</th>
                <th>Status</th>
                <th style={{ width: "120px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading inventory records...
                  </td>
                </tr>
              ) : filteredStock.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    No products match your search/filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => {
                  const physical = item.physical_stock ?? item.quantity_in_stock ?? 0;
                  const reserved = item.reserved_stock ?? 0;
                  const available = item.available_stock ?? physical - reserved;

                  return (
                    <tr key={item.product_id}>
                      <td>
                        <div className="fw-semibold text-dark">{item.name}</div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          SKU ID #{item.product_id}
                        </div>
                      </td>
                      <td className="font-monospace">
                        LKR {Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="text-muted">{item.space_consumption_rate} m³</td>
                      <td className="text-end fw-medium">{physical.toLocaleString()}</td>
                      <td className="text-end text-muted">{reserved.toLocaleString()}</td>
                      <td
                        className="text-end fw-bold"
                        style={{
                          fontSize: "0.95rem",
                          color: available <= 0 ? "#dc2626" : available < 100 ? "#d97706" : "#059669",
                        }}
                      >
                        {available.toLocaleString()}
                      </td>
                      <td>{getStockBadge(physical)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 py-1 px-2"
                          onClick={() => handleOpenRestock(item)}
                        >
                          <IconPlus size={14} />
                          <span>Restock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Restock Modal ────────────────────────────────────── */}
      {selectedProduct && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "480px" }}>
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title h6 fw-bold d-flex align-items-center gap-2">
                  <IconPlus size={18} className="text-primary" />
                  Restock: {selectedProduct.name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedProduct(null)}
                ></button>
              </div>
              <form onSubmit={handleRestockSubmit}>
                <div className="modal-body">
                  <div className="p-3 mb-3 bg-light rounded border small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Current Physical Stock:</span>
                      <strong>{selectedProduct.physical_stock ?? selectedProduct.quantity_in_stock} units</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Currently Reserved for Orders:</span>
                      <span>{selectedProduct.reserved_stock ?? 0} units</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-medium">
                      Quantity to Add (Units) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 500"
                      min="1"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-medium">Factory Manufacturing Batch / Lot #</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. LOT-2026-OCT-09"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-medium">Restock Notes / Reason</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows="2"
                      placeholder="e.g. Scheduled production run replenishment from Kandy plant"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setSelectedProduct(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={restocking}
                  >
                    {restocking ? "Updating Stock..." : "Confirm Restock"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Restock History Modal ────────────────────────────── */}
      {showHistoryModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title h6 fw-bold d-flex align-items-center gap-2">
                  <IconHistory size={18} className="text-primary" />
                  HQ Warehouse Restock History
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowHistoryModal(false)}
                ></button>
              </div>
              <div className="modal-body p-0" style={{ maxHeight: "450px", overflowY: "auto" }}>
                {loadingHistory ? (
                  <div className="text-center py-4 text-muted">
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading restock logs...
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    No recorded restock actions found in audit log.
                  </div>
                ) : (
                  <table className="table table-hover align-middle small mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Date & Time</th>
                        <th>Product</th>
                        <th>Admin Operator</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.log_id}>
                          <td className="text-muted font-monospace" style={{ fontSize: "0.78rem" }}>
                            {new Date(h.timestamp).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="fw-medium">{h.product_name || `Product #${h.product_id}`}</td>
                          <td>{h.user_name || "Admin"}</td>
                          <td className="text-secondary">{h.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-light border"
                  onClick={() => setShowHistoryModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default AdminInventory;

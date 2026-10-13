import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  IconAdjustments,
  IconEdit,
  IconLayersSubtract,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import * as XLSX from "xlsx";

function AdminInventory() {
  const [stock, setStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const handleSearchChange = (val) => {
    setSearch(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("search", val);
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  };
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | OPTIMAL | LOW_STOCK | OUT_OF_STOCK
  const [sortBy, setSortBy] = useState("id"); // id | name | price | physical | atp | valuation
  const [sortOrder, setSortOrder] = useState("asc"); // asc | desc
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Restock Modal state ──────────────────────────────────
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockBatch, setRestockBatch] = useState("");
  const [restockNotes, setRestockNotes] = useState("");
  const [submittingRestock, setSubmittingRestock] = useState(false);

  // ── Adjustment / Write-Off Modal state ───────────────────
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustType, setAdjustType] = useState("DAMAGE"); // DAMAGE | EXPIRED | AUDIT_CORRECTION | RETURN | OTHER
  const [adjustDirection, setAdjustDirection] = useState("REDUCE"); // REDUCE | ADD
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustBatch, setAdjustBatch] = useState("");
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // ── Create Product SKU Modal state ───────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdSpace, setNewProdSpace] = useState("");
  const [newProdStock, setNewProdStock] = useState("0");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // ── Edit Product SKU Modal state ─────────────────────────
  const [editProduct, setEditProduct] = useState(null);
  const [editProdName, setEditProdName] = useState("");
  const [editProdPrice, setEditProdPrice] = useState("");
  const [editProdSpace, setEditProdSpace] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // ── History Drawer / Modal state ─────────────────────────
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadStock = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get(apiUrl("/api/inventory"), authHeader);
      setStock(res.data || []);
    } catch (err) {
      if (!silent) setError(err.response?.data?.error || "Could not load inventory records.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStock();
    const interval = setInterval(() => loadStock(true), 15000);
    const onFocus = () => loadStock(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
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

  // ── Handlers: Restock ────────────────────────────────────
  const handleOpenRestock = (item) => {
    setRestockProduct(item);
    setRestockQty("");
    setRestockBatch(`LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setRestockNotes("");
    setError("");
    setSuccess("");
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockProduct) return;
    const qty = Number(restockQty);
    if (!qty || qty <= 0) {
      setError("Please enter a valid positive quantity to restock.");
      return;
    }

    setSubmittingRestock(true);
    setError("");
    setSuccess("");

    try {
      await axios.put(
        apiUrl(`/api/inventory/${restockProduct.product_id}/restock`),
        {
          quantityAdded: qty,
          batchNumber: restockBatch.trim(),
          notes: restockNotes.trim(),
        },
        authHeader
      );
      setSuccess(`Successfully added ${qty} units to ${restockProduct.name}.`);
      setRestockProduct(null);
      loadStock();
    } catch (err) {
      setError(err.response?.data?.error || "Could not complete restock operation.");
    } finally {
      setSubmittingRestock(false);
    }
  };

  // ── Handlers: Adjustment / Write-Off ─────────────────────
  const handleOpenAdjust = (item) => {
    setAdjustProduct(item);
    setAdjustType("DAMAGE");
    setAdjustDirection("REDUCE");
    setAdjustQty("");
    setAdjustReason("");
    setAdjustBatch("");
    setError("");
    setSuccess("");
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustProduct) return;
    const qty = Number(adjustQty);
    if (!qty || qty <= 0) {
      setError("Please enter a valid positive quantity for adjustment.");
      return;
    }
    if (!adjustReason.trim()) {
      setError("Please provide a reason or explanation for this adjustment.");
      return;
    }

    const available = adjustProduct.available_stock ?? adjustProduct.quantity_in_stock ?? 0;
    if (adjustDirection === "REDUCE" && qty > available) {
      setError(`Cannot deduct ${qty} units. Maximum available stock is ${available}.`);
      return;
    }

    setSubmittingAdjust(true);
    setError("");
    setSuccess("");

    const typeNames = {
      DAMAGE: "Damaged Stock Write-Off",
      EXPIRED: "Expired / Quality Rejection",
      AUDIT_CORRECTION: "Stock Take Discrepancy",
      RETURN: "Factory Return / Restock",
      OTHER: "Manual Inventory Adjustment",
    };

    try {
      const res = await axios.post(
        apiUrl(`/api/inventory/${adjustProduct.product_id}/adjust`),
        {
          adjustmentType: typeNames[adjustType] || adjustType,
          quantity: qty,
          direction: adjustDirection,
          reason: adjustReason.trim(),
          batchNumber: adjustBatch.trim(),
        },
        authHeader
      );
      setSuccess(res.data?.message || `Successfully adjusted stock for ${adjustProduct.name}.`);
      setAdjustProduct(null);
      loadStock();
    } catch (err) {
      setError(err.response?.data?.error || "Could not execute stock adjustment.");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // ── Handlers: Create Product SKU ─────────────────────────
  const handleOpenCreateProduct = () => {
    setNewProdName("");
    setNewProdPrice("");
    setNewProdSpace("0.02");
    setNewProdStock("100");
    setError("");
    setSuccess("");
    setShowCreateModal(true);
  };

  const handleCreateProductSubmit = async (e) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      setError("Product SKU name is required.");
      return;
    }
    const price = Number(newProdPrice);
    if (!price || price <= 0) {
      setError("Unit price must be a positive number.");
      return;
    }
    const space = Number(newProdSpace);
    if (!space || space <= 0) {
      setError("Space consumption rate must be a positive number.");
      return;
    }

    setSubmittingCreate(true);
    setError("");
    setSuccess("");

    try {
      const res = await axios.post(
        apiUrl("/api/inventory/products"),
        {
          name: newProdName.trim(),
          unitPrice: price,
          spaceConsumptionRate: space,
          initialStock: Number(newProdStock) || 0,
        },
        authHeader
      );
      setSuccess(res.data?.message || "New product SKU created successfully.");
      setShowCreateModal(false);
      loadStock();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create product SKU.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // ── Handlers: Edit Product SKU ───────────────────────────
  const handleOpenEditProduct = (item) => {
    setEditProduct(item);
    setEditProdName(item.name);
    setEditProdPrice(item.unit_price);
    setEditProdSpace(item.space_consumption_rate);
    setError("");
    setSuccess("");
  };

  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    if (!editProduct) return;
    if (!editProdName.trim()) {
      setError("Product name is required.");
      return;
    }
    const price = Number(editProdPrice);
    if (!price || price <= 0) {
      setError("Unit price must be a positive number.");
      return;
    }
    const space = Number(editProdSpace);
    if (!space || space <= 0) {
      setError("Space consumption rate must be a positive number.");
      return;
    }

    setSubmittingEdit(true);
    setError("");
    setSuccess("");

    try {
      const res = await axios.put(
        apiUrl(`/api/inventory/products/${editProduct.product_id}`),
        {
          name: editProdName.trim(),
          unitPrice: price,
          spaceConsumptionRate: space,
        },
        authHeader
      );
      setSuccess(res.data?.message || "Product SKU details updated.");
      setEditProduct(null);
      loadStock();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update product SKU.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // ── Handlers: Export Excel ───────────────────────────────
  const handleExportExcel = () => {
    if (stock.length === 0) return;
    const exportRows = stock.map((s) => {
      const physical = Number(s.physical_stock ?? s.quantity_in_stock ?? 0);
      const reserved = Number(s.reserved_stock ?? 0);
      const atp = Number(s.available_stock ?? s.quantity_in_stock ?? 0);
      const price = Number(s.unit_price || 0);
      const valuation = physical * price;

      return {
        "Product ID": s.product_id,
        "Product Name": s.name,
        "Unit Price (LKR)": price,
        "Space Vol (m3)": s.space_consumption_rate,
        "Physical Stock (On-Hand)": physical,
        "Reserved (Open Orders)": reserved,
        "Available to Promise (ATP)": atp,
        "Total Valuation (LKR)": valuation,
        Status:
          atp <= 0
            ? "Out of Stock"
            : atp < 100
            ? "Low Stock Warning"
            : "Optimal Stock",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HQ Main Inventory");
    XLSX.writeFile(
      workbook,
      `Kandypack_HQ_Inventory_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // ── Filtered & Sorted Inventory ──────────────────────────
  const processedStock = useMemo(() => {
    let result = stock.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        String(item.product_id).includes(search);
      const atp = Number(item.available_stock ?? item.quantity_in_stock ?? 0);

      let matchesStatus = true;
      if (statusFilter === "OPTIMAL") matchesStatus = atp >= 100;
      else if (statusFilter === "LOW_STOCK") matchesStatus = atp > 0 && atp < 100;
      else if (statusFilter === "OUT_OF_STOCK") matchesStatus = atp <= 0;

      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "price":
          valA = Number(a.unit_price);
          valB = Number(b.unit_price);
          break;
        case "physical":
          valA = Number(a.physical_stock ?? a.quantity_in_stock ?? 0);
          valB = Number(b.physical_stock ?? b.quantity_in_stock ?? 0);
          break;
        case "atp":
          valA = Number(a.available_stock ?? a.quantity_in_stock ?? 0);
          valB = Number(b.available_stock ?? b.quantity_in_stock ?? 0);
          break;
        case "valuation":
          valA = Number(a.valuation ?? (a.physical_stock || a.quantity_in_stock || 0) * a.unit_price);
          valB = Number(b.valuation ?? (b.physical_stock || b.quantity_in_stock || 0) * b.unit_price);
          break;
        default:
          valA = Number(a.product_id);
          valB = Number(b.product_id);
          break;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [stock, search, statusFilter, sortBy, sortOrder]);

  // ── Aggregate Statistics ─────────────────────────────────
  const stats = useMemo(() => {
    let totalPhysical = 0;
    let totalReserved = 0;
    let totalAvailable = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of stock) {
      const physical = Number(item.physical_stock ?? item.quantity_in_stock ?? 0);
      const reserved = Number(item.reserved_stock ?? 0);
      const atp = Number(item.available_stock ?? item.quantity_in_stock ?? 0);
      const price = Number(item.unit_price || 0);

      totalPhysical += physical;
      totalReserved += reserved;
      totalAvailable += atp;
      totalValuation += physical * price;

      if (atp <= 0) outOfStockCount++;
      else if (atp < 100) lowStockCount++;
    }

    return {
      totalPhysical,
      totalReserved,
      totalAvailable,
      totalValuation,
      lowStockCount,
      outOfStockCount,
    };
  }, [stock]);

  const toggleSort = (colKey) => {
    if (sortBy === colKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(colKey);
      setSortOrder("asc");
    }
  };

  const getStockBadge = (atp) => {
    if (atp <= 0) {
      return <span className="kp-badge kp-badge-danger">Out of Stock (0)</span>;
    }
    if (atp < 100) {
      return <span className="kp-badge kp-badge-warning">Low Stock ({atp})</span>;
    }
    return <span className="kp-badge kp-badge-success">Optimal ({atp})</span>;
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const term = historySearch.toLowerCase();
    return history.filter(
      (h) =>
        (h.product_name && h.product_name.toLowerCase().includes(term)) ||
        (h.action && h.action.toLowerCase().includes(term)) ||
        (h.user_name && h.user_name.toLowerCase().includes(term)) ||
        (h.details && h.details.toLowerCase().includes(term))
    );
  }, [history, historySearch]);

  return (
    <AppLayout pageTitle="HQ Main Inventory">
      {/* ── Top Summary Metric Cards ─────────────────────────── */}
      <div className="kp-stat-grid mb-4">
        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "rgba(37, 99, 235, 0.12)" }}>
            <IconPackage size={22} stroke={1.75} color="#2563eb" />
          </div>
          <p className="kp-stat-label">Physical Stock On Hand</p>
          <p className="kp-stat-value">{loading ? "…" : stats.totalPhysical.toLocaleString()}</p>
          <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
            Total cartons stored in HQ warehouse
          </span>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "rgba(245, 158, 11, 0.12)" }}>
            <IconLayersSubtract size={22} stroke={1.75} color="#d97706" />
          </div>
          <p className="kp-stat-label">Committed / Reserved</p>
          <p className="kp-stat-value">{loading ? "…" : stats.totalReserved.toLocaleString()}</p>
          <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
            Allocated to active customer orders
          </span>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "rgba(16, 185, 129, 0.12)" }}>
            <IconCheck size={22} stroke={1.75} color="#059669" />
          </div>
          <p className="kp-stat-label">Available-to-Promise (ATP)</p>
          <p className="kp-stat-value" style={{ color: "#059669" }}>
            {loading ? "…" : stats.totalAvailable.toLocaleString()}
          </p>
          <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
            Uncommitted stock ready for sale
          </span>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "rgba(99, 102, 241, 0.12)" }}>
            <IconTrendingUp size={22} stroke={1.75} color="#4f46e5" />
          </div>
          <p className="kp-stat-label">Total Inventory Valuation</p>
          <p className="kp-stat-value" style={{ fontSize: "1.35rem" }}>
            {loading ? "…" : `LKR ${stats.totalValuation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
            Combined on-hand stock asset value
          </span>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "rgba(239, 68, 68, 0.12)" }}>
            <IconAlertTriangle size={22} stroke={1.75} color="#dc2626" />
          </div>
          <p className="kp-stat-label">Reorder Stock Alerts</p>
          <p className="kp-stat-value" style={{ color: stats.outOfStockCount > 0 ? "#dc2626" : "#d97706" }}>
            {loading ? "…" : `${stats.lowStockCount + stats.outOfStockCount} SKUs`}
          </p>
          <span className="text-muted small" style={{ fontSize: "0.74rem" }}>
            {stats.outOfStockCount} Out of Stock &bull; {stats.lowStockCount} Low (&lt;100)
          </span>
        </div>
      </div>

      <div className="kp-card">
        {/* ── Action Header ─────────────────────────────────────── */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h2 className="h5 mb-0 fw-bold">Central Warehouse Inventory Control</h2>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              onClick={handleOpenCreateProduct}
              className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
            >
              <IconPlus size={16} />
              <span>Add New SKU</span>
            </button>
            <button
              onClick={loadHistory}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            >
              <IconHistory size={16} />
              <span>Audit Trail</span>
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
          <div style={{ minWidth: "260px", maxWidth: "420px", flex: 1 }}>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white">
                <IconSearch size={15} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search SKU name or ID..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {search && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => handleSearchChange("")}
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
              All SKUs ({stock.length})
            </button>
            <button
              className={`btn btn-sm ${
                statusFilter === "OPTIMAL" ? "btn-primary" : "btn-light border"
              }`}
              onClick={() => setStatusFilter("OPTIMAL")}
            >
              Optimal ({stock.length - stats.lowStockCount - stats.outOfStockCount})
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

        {/* ── Inventory Table ───────────────────────────────────── */}
        <div className="table-responsive">
          <table className="table table-hover align-middle small mb-0">
            <thead className="table-light">
              <tr>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => toggleSort("name")}
                >
                  Product Details {sortBy === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => toggleSort("price")}
                >
                  Unit Price {sortBy === "price" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th>Cubic Vol</th>
                <th
                  className="text-end"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => toggleSort("physical")}
                >
                  On-Hand Stock {sortBy === "physical" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="text-end">Committed (Orders)</th>
                <th
                  className="text-end fw-bold"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => toggleSort("atp")}
                >
                  Available (ATP) {sortBy === "atp" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="text-end"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => toggleSort("valuation")}
                >
                  Valuation {sortBy === "valuation" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th>Status</th>
                <th style={{ width: "220px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading inventory records...
                  </td>
                </tr>
              ) : processedStock.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">
                    No products match your search/filter criteria.
                  </td>
                </tr>
              ) : (
                processedStock.map((item) => {
                  const physical = Number(item.physical_stock ?? item.quantity_in_stock ?? 0);
                  const reserved = Number(item.reserved_stock ?? 0);
                  const atp = Number(item.available_stock ?? item.quantity_in_stock ?? 0);
                  const price = Number(item.unit_price || 0);
                  const valuation = physical * price;

                  return (
                    <tr key={item.product_id}>
                      <td>
                        <div className="fw-semibold text-dark">{item.name}</div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          SKU #{item.product_id}
                        </div>
                      </td>
                      <td className="font-monospace">
                        LKR {price.toFixed(2)}
                      </td>
                      <td className="text-muted">{item.space_consumption_rate} m³</td>
                      <td className="text-end fw-medium">{physical.toLocaleString()}</td>
                      <td className="text-end text-muted">{reserved.toLocaleString()}</td>
                      <td
                        className="text-end fw-bold"
                        style={{
                          fontSize: "0.95rem",
                          color: atp <= 0 ? "#dc2626" : atp < 100 ? "#d97706" : "#059669",
                        }}
                      >
                        {atp.toLocaleString()}
                      </td>
                      <td className="text-end font-monospace text-secondary">
                        LKR {valuation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>{getStockBadge(atp)}</td>
                      <td>
                        <div className="d-flex justify-content-center align-items-center gap-1">
                          <button
                            className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 py-1 px-2"
                            title="Restock Product"
                            onClick={() => handleOpenRestock(item)}
                          >
                            <IconPlus size={13} />
                            <span>Restock</span>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-warning text-dark d-inline-flex align-items-center gap-1 py-1 px-2"
                            title="Damage or Audit Adjustment"
                            onClick={() => handleOpenAdjust(item)}
                          >
                            <IconAdjustments size={13} />
                            <span>Adjust</span>
                          </button>
                          <button
                            className="btn btn-sm btn-light border d-inline-flex align-items-center py-1 px-2"
                            title="Edit SKU Details"
                            onClick={() => handleOpenEditProduct(item)}
                          >
                            <IconEdit size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal 1: Restock Product ─────────────────────────── */}
      {restockProduct && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "480px" }}>
            <div className="modal-content shadow border-0">
              <div className="modal-header">
                <h5 className="modal-title h6 fw-bold d-flex align-items-center gap-2">
                  <IconPlus size={18} className="text-primary" />
                  Restock: {restockProduct.name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setRestockProduct(null)}
                ></button>
              </div>
              <form onSubmit={handleRestockSubmit}>
                <div className="modal-body">
                  <div className="p-3 mb-3 bg-light rounded border small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Current Physical On-Hand:</span>
                      <strong>{restockProduct.physical_stock ?? restockProduct.quantity_in_stock} units</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Currently Reserved for Orders:</span>
                      <span>{restockProduct.reserved_stock ?? 0} units</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Available to Promise (ATP):</span>
                      <strong className="text-success">{restockProduct.available_stock ?? restockProduct.quantity_in_stock} units</strong>
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
                      value={restockBatch}
                      onChange={(e) => setRestockBatch(e.target.value)}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-medium">Restock Notes / Production Source</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows="2"
                      placeholder="e.g. Scheduled production replenishment from Kandy plant"
                      value={restockNotes}
                      onChange={(e) => setRestockNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setRestockProduct(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={submittingRestock}
                  >
                    {submittingRestock ? "Updating Stock..." : "Confirm Restock"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Stock Adjustment / Write-Off ─────────────── */}
      {adjustProduct && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "520px" }}>
            <div className="modal-content shadow border-0">
              <div className="modal-header">
                <h5 className="modal-title h6 fw-bold d-flex align-items-center gap-2">
                  <IconAdjustments size={18} className="text-warning text-dark" />
                  Stock Adjustment: {adjustProduct.name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setAdjustProduct(null)}
                ></button>
              </div>
              <form onSubmit={handleAdjustSubmit}>
                <div className="modal-body">
                  <div className="p-3 mb-3 bg-light rounded border small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Current Available Stock (ATP):</span>
                      <strong>{adjustProduct.available_stock ?? adjustProduct.quantity_in_stock} units</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Physical On-Hand:</span>
                      <span>{adjustProduct.physical_stock ?? adjustProduct.quantity_in_stock} units</span>
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-medium">Action Direction</label>
                      <select
                        className="form-select form-select-sm"
                        value={adjustDirection}
                        onChange={(e) => setAdjustDirection(e.target.value)}
                      >
                        <option value="REDUCE">Deduct Stock (Write-Off / Loss)</option>
                        <option value="ADD">Add Stock (Found / Audit Gain)</option>
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-medium">Reason Category</label>
                      <select
                        className="form-select form-select-sm"
                        value={adjustType}
                        onChange={(e) => setAdjustType(e.target.value)}
                      >
                        <option value="DAMAGE">Damaged in Warehouse</option>
                        <option value="EXPIRED">Expired / Quality Failure</option>
                        <option value="AUDIT_CORRECTION">Stocktake Discrepancy</option>
                        <option value="RETURN">Factory Return</option>
                        <option value="OTHER">Other Adjustment</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-medium">
                      Quantity to {adjustDirection === "REDUCE" ? "Deduct" : "Add"} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 25"
                      min="1"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-medium">Batch / Lot Reference (Optional)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. LOT-2026-OCT-09"
                      value={adjustBatch}
                      onChange={(e) => setAdjustBatch(e.target.value)}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-medium">
                      Auditable Justification / Notes <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      rows="2"
                      placeholder="e.g. Water damage sustained in Sector B during rainy spell"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setAdjustProduct(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-sm ${adjustDirection === "REDUCE" ? "btn-danger" : "btn-primary"}`}
                    disabled={submittingAdjust}
                  >
                    {submittingAdjust
                      ? "Processing..."
                      : adjustDirection === "REDUCE"
                      ? "Confirm Deduction"
                      : "Confirm Addition"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 3: Add New Product SKU ─────────────────────── */}
      {showCreateModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "480px" }}>
            <div className="modal-content shadow border-0">
              <div className="modal-header">
                <h5 className="modal-title h6 fw-bold d-flex align-items-center gap-2">
                  <IconPlus size={18} className="text-primary" />
                  Add New Product SKU
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateProductSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-medium">
                      Product Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Coconut Milk 400ml"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-medium">
                        Unit Price (LKR) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="form-control"
                        placeholder="e.g. 450.00"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">
                        Space Vol (m³) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        className="form-control"
                        placeholder="e.g. 0.025"
                        value={newProdSpace}
                        onChange={(e) => setNewProdSpace(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-medium">
                      Initial Physical Stock (Units)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control form-control-sm"
                      placeholder="e.g. 200"
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(e.target.value)}
                    />
                    <div className="form-text small" style={{ fontSize: "0.74rem" }}>
                      Initial available stock automatically provisioned in HQ warehouse.
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={submittingCreate}
                  >
                    {submittingCreate ? "Creating SKU..." : "Create Product SKU"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 4: Edit Product SKU ─────────────────────────── */}
      {editProduct && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "480px" }}>
            <div className="modal-content shadow border-0">
              <div className="modal-header">
                <h5 className="modal-title h6 fw-bold d-flex align-items-center gap-2">
                  <IconEdit size={18} className="text-primary" />
                  Edit Product SKU #{editProduct.product_id}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditProduct(null)}
                ></button>
              </div>
              <form onSubmit={handleEditProductSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-medium">
                      Product Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editProdName}
                      onChange={(e) => setEditProdName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small fw-medium">
                        Unit Price (LKR) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="form-control"
                        value={editProdPrice}
                        onChange={(e) => setNewProdPrice ? setEditProdPrice(e.target.value) : null}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">
                        Space Vol (m³) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        className="form-control"
                        value={editProdSpace}
                        onChange={(e) => setEditProdSpace(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => setEditProduct(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={submittingEdit}
                  >
                    {submittingEdit ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 5: Restock & Adjustment History Modal ──────── */}
      {showHistoryModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow border-0">
              <div className="modal-header">
                <h5 className="modal-title h6 fw-bold d-flex align-items-center gap-2">
                  <IconHistory size={18} className="text-primary" />
                  HQ Warehouse Inventory Audit Trail
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowHistoryModal(false)}
                ></button>
              </div>
              <div className="px-3 pt-3">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Filter logs by product, action, admin, or detail keywords..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
              <div className="modal-body p-0 mt-2" style={{ maxHeight: "450px", overflowY: "auto" }}>
                {loadingHistory ? (
                  <div className="text-center py-4 text-muted">
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading audit trail logs...
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    No matching inventory actions found in audit log.
                  </div>
                ) : (
                  <table className="table table-hover align-middle small mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Date & Time</th>
                        <th>Product</th>
                        <th>Action</th>
                        <th>Admin Operator</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((h) => (
                        <tr key={h.log_id}>
                          <td className="text-muted font-monospace" style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                            {new Date(h.timestamp).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="fw-medium">{h.product_name || `SKU #${h.product_id}`}</td>
                          <td>
                            <span
                              className={`kp-badge ${
                                h.action.toLowerCase().includes("damage") || h.action.toLowerCase().includes("decrease")
                                  ? "kp-badge-danger"
                                  : h.action.toLowerCase().includes("create")
                                  ? "kp-badge-info"
                                  : "kp-badge-success"
                              }`}
                            >
                              {h.action}
                            </span>
                          </td>
                          <td>{h.user_name || "Admin"}</td>
                          <td className="text-secondary" style={{ maxWidth: "280px" }}>
                            {h.details}
                          </td>
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

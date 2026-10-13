import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconPackage,
  IconPlus,
  IconCheck,
  IconTruck,
  IconAlertCircle,
  IconEdit,
  IconTrash,
  IconSearch,
  IconMapPin,
  IconCalendar,
  IconCircleCheck,
  IconChevronDown,
  IconChevronUp,
  IconFileText,
  IconRefresh,
  IconX,
  IconDownload,
  IconFileSpreadsheet,
} from "@tabler/icons-react";

const API_BASE = apiUrl("/api");

// Dates are handled in the user's LOCAL time zone. (toISOString() converts to UTC,
// which in Sri Lanka (UTC+5:30) can show the previous day.)
const toLocalDateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseLocalDate = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const STATUS_CONFIG = {
  Placed: {
    badgeClass: "kp-badge-info",
    step: 1,
    label: "Placed",
  },
  Scheduled: {
    badgeClass: "kp-badge-warning",
    step: 2,
    label: "Scheduled for Rail",
  },
  "In Transit": {
    badgeClass: "kp-badge-warning",
    step: 3,
    label: "In Transit",
  },
  Delivered: {
    badgeClass: "kp-badge-success",
    step: 4,
    label: "Delivered",
  },
  Closed: {
    badgeClass: "kp-badge-success",
    step: 5,
    label: "Closed (Received)",
  },
  Cancelled: {
    badgeClass: "kp-badge-danger",
    step: 0,
    label: "Cancelled",
  },
};

const LIFECYCLE_STEPS = ["Placed", "Scheduled", "In Transit", "Delivered", "Closed"];

function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(urlSearch);

  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("search", val);
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  };
  const [expandedOrders, setExpandedOrders] = useState({});

  // Edit Modal State
  const [editingOrder, setEditingOrder] = useState(null);
  const [editAddress, setEditAddress] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editError, setEditError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const toggleExpandOrder = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Re-order past order items
  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) {
      navigate("/orders/new");
      return;
    }
    navigate("/orders/new", {
      state: {
        reorderItems: order.items,
        deliveryAddress: order.delivery_address,
      },
    });
  };

  // Download professional PDF invoice / receipt
  const downloadPdfInvoice = (order) => {
    try {
      const doc = new jsPDF();

      // Brand header banner
      doc.setFillColor(15, 23, 42); // Navy 900
      doc.rect(0, 0, 210, 36, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("KANDYPACK SCMS", 14, 18);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Central Railway & Road Supply Chain Logistics", 14, 25);
      doc.text("Official Delivery Invoice & Cargo Manifest", 14, 30);

      // Invoice info right-aligned
      doc.setFontSize(9);
      doc.text(`INVOICE: #INV-${String(order.order_id).padStart(6, "0")}`, 196, 18, { align: "right" });
      doc.text(`Order Date: ${order.order_date ? new Date(order.order_date).toLocaleDateString() : "—"}`, 196, 24, { align: "right" });
      doc.text(`Status: ${order.status.toUpperCase()}`, 196, 30, { align: "right" });

      // Delivery & Customer Information
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Delivery & Recipient Information", 14, 46);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Customer Account ID: #${order.customer_id}`, 14, 53);
      doc.text(`Delivery Address: ${order.delivery_address || "Standard Address"}`, 14, 59);
      doc.text(`Route / Stop: ${order.route_name || "Route #" + (order.route_id || "—")} (Stop: ${order.stop_name || "#" + (order.route_stop_id || "—")})`, 14, 65);
      doc.text(`Requested Delivery Date: ${order.requested_delivery_date ? new Date(order.requested_delivery_date).toLocaleDateString() : "—"}`, 14, 71);

      // Items table
      const tableData = (order.items && order.items.length > 0)
        ? order.items.map((item, index) => [
            index + 1,
            item.product_name || `Product #${item.product_id}`,
            `LKR ${parseFloat(item.unit_price || 0).toFixed(2)}`,
            item.quantity,
            `${parseFloat(item.line_volume || 0).toFixed(2)} m3`,
            `LKR ${parseFloat(item.line_total || (item.quantity * item.unit_price) || 0).toFixed(2)}`,
          ])
        : [
            [1, "Order Consignment Package", "—", "1", `${parseFloat(order.total_volume || 0).toFixed(2)} m3`, `LKR ${parseFloat(order.total_value || 0).toFixed(2)}`],
          ];

      autoTable(doc, {
        startY: 77,
        head: [["#", "Product Description", "Unit Price", "Qty", "Volume", "Line Total (LKR)"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 70 },
          2: { cellWidth: 28, halign: "right" },
          3: { cellWidth: 18, halign: "center" },
          4: { cellWidth: 24, halign: "right" },
          5: { cellWidth: 35, halign: "right" },
        },
      });

      const finalY = doc.lastAutoTable.finalY + 8;

      // Summary block
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(120, finalY, 76, 32, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(120, finalY, 76, 32, 2, 2, "D");

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Total Volume:", 125, finalY + 8);
      doc.text(`${parseFloat(order.total_volume || 0).toFixed(2)} m3`, 190, finalY + 8, { align: "right" });

      doc.text("Handling & Rail Freight:", 125, finalY + 16);
      doc.text("INCLUDED", 190, finalY + 16, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Grand Total:", 125, finalY + 25);
      doc.text(`LKR ${parseFloat(order.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, finalY + 25, { align: "right" });

      // Footer
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("This is an official computer-generated receipt from Kandypack SCMS.", 14, 280);
      doc.text(`Generated on ${new Date().toLocaleString()} for Order #${order.order_id}`, 14, 285);

      doc.save(`Kandypack_Invoice_Order_${order.order_id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("Failed to generate PDF invoice.");
    }
  };

  // ---- All-orders report (uses the currently filtered list) ----
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
  const buildReportRows = (list) =>
    list.map((o) => ({
      "Order ID": o.order_id,
      "Order Date": fmtDate(o.order_date),
      "Requested Delivery": fmtDate(o.requested_delivery_date),
      Status: o.status,
      "Delivery Address": o.delivery_address || "—",
      Items: o.items?.length || 0,
      "Volume (m3)": Number(parseFloat(o.total_volume || 0).toFixed(2)),
      "Total (LKR)": Number(parseFloat(o.total_value || 0).toFixed(2)),
    }));

  const downloadOrdersReportPdf = (list) => {
    try {
      if (!list.length) return;
      const rows = buildReportRows(list);
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("KANDYPACK SCMS - My Orders Report", 14, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Customer #${customerId}  |  Generated ${new Date().toLocaleString()}  |  ${rows.length} orders`, 14, 22);

      const cols = Object.keys(rows[0]);
      autoTable(doc, {
        startY: 34,
        head: [cols],
        body: rows.map((r) => cols.map((c) => String(r[c]))),
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
      });

      const active = list.filter((o) => o.status !== "Cancelled");
      const sum = active.reduce((s, o) => s + parseFloat(o.total_value || 0), 0);
      const y = doc.lastAutoTable.finalY + 8;
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(
        `Total value (excluding cancelled): LKR ${sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        14,
        y
      );
      doc.save(`Kandypack_My_Orders_Report_${toLocalDateString(new Date())}.pdf`);
    } catch (err) {
      console.error("Orders report failed:", err);
      setError("Failed to generate orders report.");
    }
  };

  const downloadOrdersReportExcel = (list) => {
    if (!list.length) return;
    const ws = XLSX.utils.json_to_sheet(buildReportRows(list));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "My Orders");
    XLSX.writeFile(wb, `Kandypack_My_Orders_Report_${toLocalDateString(new Date())}.xlsx`);
  };

  const customerId = (() => {
    const stored = localStorage.getItem("userId") || localStorage.getItem("customerId");
    if (stored) return Number(stored);
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload && payload.userId) return Number(payload.userId);
      } catch (err) {
        console.warn("Unable to read the stored customer token.", err);
      }
    }
    return 9;
  })();
  const token = localStorage.getItem("token");
  const authHeader = useMemo(() => {
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, [token]);

  const loadOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const currentToken = localStorage.getItem("token");
      const headers = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
      const res = await axios.get(`${API_BASE}/orders/customer/${customerId}`, { headers });
      // Sort orders newest first
      const sorted = (res.data || []).sort(
        (a, b) => new Date(b.order_date || 0) - new Date(a.order_date || 0) || b.order_id - a.order_id
      );
      setOrders(sorted);
    } catch (err) {
      console.error("Error loading customer orders:", err);
      if (!silent) setError(err.response?.data?.error || "Could not load order history.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders(true), 15000);
    const onFocus = () => loadOrders(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadOrders]);

  // REQ-ORD-07: Customer confirms receipt (Delivered -> Closed)
  const handleConfirmReceipt = async (orderId) => {
    if (!window.confirm("Confirm receipt of order #" + orderId + "? This will close the order.")) return;
    try {
      setActionLoading(true);
      setError("");
      const res = await axios.put(`${API_BASE}/orders/${orderId}/confirm-receipt`, {}, authHeader);
      const msg = res.data.message || `Order #${orderId} marked as received and closed.`;
      setSuccessMsg(msg);
      loadOrders();
      window.alert(`✅ Success: ${msg}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Could not confirm order receipt.";
      setError(errorMsg);
      window.alert(`❌ Confirmation Failed: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // REQ-ORD-06: Customer cancels order (only while status is 'Placed')
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Are you sure you want to cancel order #${orderId}? Stock will be restored to inventory.`)) return;
    try {
      setActionLoading(true);
      setError("");
      const res = await axios.delete(`${API_BASE}/orders/${orderId}`, authHeader);
      setSuccessMsg(res.data.message || `Order #${orderId} cancelled successfully.`);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.error || "Could not cancel order.");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Order Modal
  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditAddress(order.delivery_address || "");
    // Format date YYYY-MM-DD
    const raw = order.requested_delivery_date;
    const d = !raw
      ? ""
      : /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? raw
      : toLocalDateString(new Date(raw));
    setEditDate(d);
    setEditError("");
  };

  // REQ-ORD-06 & REQ-ORD-02: Save Edit (Address / Delivery Date >= 7 days)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    // Check 7-day rule on client before submit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = parseLocalDate(editDate);
    const diffDays = Math.round((chosen - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      setEditError("Requested delivery date must be at least 7 days from today.");
      return;
    }

    try {
      setActionLoading(true);
      setEditError("");
      await axios.put(
        `${API_BASE}/orders/${editingOrder.order_id}`,
        {
          deliveryAddress: editAddress,
          deliveryDate: editDate,
        },
        authHeader
      );
      setSuccessMsg(`Order #${editingOrder.order_id} updated successfully.`);
      setEditingOrder(null);
      loadOrders();
    } catch (err) {
      setEditError(err.response?.data?.error || "Could not update order.");
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate stats
  const totalCount = orders.length;
  const activeCount = orders.filter((o) => ["Placed", "Scheduled", "In Transit"].includes(o.status)).length;
  const deliveredCount = orders.filter((o) => ["Delivered", "Closed"].includes(o.status)).length;
  const totalSpent = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + parseFloat(o.total_value || 0), 0);

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      activeFilter === "ALL" ||
      (activeFilter === "ACTIVE" && ["Placed", "Scheduled", "In Transit"].includes(o.status)) ||
      (activeFilter === "DELIVERED" && ["Delivered", "Closed"].includes(o.status)) ||
      (activeFilter === "CANCELLED" && o.status === "Cancelled");

    const matchesSearch =
      !searchQuery ||
      String(o.order_id).includes(searchQuery) ||
      (o.delivery_address && o.delivery_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.status && o.status.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <AppLayout pageTitle="My Orders">
      {/* Notifications / Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-3" role="alert">
          <IconAlertCircle className="me-2 flex-shrink-0" size={18} />
          <div>{error}</div>
          <button type="button" className="btn-close" onClick={() => setError("")} aria-label="Close"></button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center mb-3" role="alert">
          <IconCircleCheck className="me-2 flex-shrink-0" size={18} />
          <div>{successMsg}</div>
          <button type="button" className="btn-close" onClick={() => setSuccessMsg("")} aria-label="Close"></button>
        </div>
      )}

      {/* Top Banner / Actions */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-0">Track and manage your order deliveries and fulfillment status in real-time.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-danger d-inline-flex align-items-center gap-2"
            onClick={() => downloadOrdersReportPdf(filteredOrders)}
            disabled={loading || filteredOrders.length === 0}
            title="Download a PDF report of the orders currently shown"
          >
            <IconDownload size={18} />
            <span>Orders Report (PDF)</span>
          </button>
          <button
            type="button"
            className="btn btn-outline-success d-inline-flex align-items-center gap-2"
            onClick={() => downloadOrdersReportExcel(filteredOrders)}
            disabled={loading || filteredOrders.length === 0}
            title="Download an Excel report of the orders currently shown"
          >
            <IconFileSpreadsheet size={18} />
            <span>Excel</span>
          </button>
          <Link to="/orders/new" className="btn btn-primary d-inline-flex align-items-center gap-2">
            <IconPlus size={18} stroke={2} />
            <span>Place New Order</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="kp-stat-grid">
        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-info-bg)" }}>
            <IconPackage size={20} stroke={1.75} color="var(--color-info-text)" />
          </div>
          <p className="kp-stat-label">Total Orders Placed</p>
          <p className="kp-stat-value">{loading ? "…" : totalCount}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-warning-bg)" }}>
            <IconTruck size={20} stroke={1.75} color="var(--color-warning-text)" />
          </div>
          <p className="kp-stat-label">Active / In-Transit</p>
          <p className="kp-stat-value">{loading ? "…" : activeCount}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-success-bg)" }}>
            <IconCheck size={20} stroke={1.75} color="var(--color-success-text)" />
          </div>
          <p className="kp-stat-label">Delivered & Closed</p>
          <p className="kp-stat-value">{loading ? "…" : deliveredCount}</p>
        </div>

        <div className="kp-stat-card">
          <div className="kp-stat-icon" style={{ background: "var(--color-amber-50)" }}>
            <IconCircleCheck size={20} stroke={1.75} color="var(--color-amber-600)" />
          </div>
          <p className="kp-stat-label">Total Order Value</p>
          <p className="kp-stat-value" style={{ fontSize: "1.35rem" }}>
            {loading ? "…" : `LKR ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="kp-card mb-3 p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex flex-wrap gap-2">
            {[
              { id: "ALL", label: "All Orders" },
              { id: "ACTIVE", label: "Active" },
              { id: "DELIVERED", label: "Delivered & Closed" },
              { id: "CANCELLED", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`btn btn-sm ${activeFilter === tab.id ? "btn-primary" : "btn-secondary"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="kp-search" style={{ width: 260, position: "relative" }}>
            <IconSearch size={16} stroke={1.75} />
            <input
              type="text"
              placeholder="Search by order ID or address..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0 2px",
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label="Clear search"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List / Cards (Matching Figure 13) */}
      {loading ? (
        <div className="kp-card text-center py-5">
          <div className="spinner-border text-primary mb-2" role="status"></div>
          <p className="text-muted mb-0">Loading your orders…</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="kp-card text-center py-5">
          <IconPackage size={48} className="text-muted mb-3" stroke={1.25} />
          <h3 className="h5 mb-1">No orders found</h3>
          <p className="text-muted small mb-3">
            {searchQuery || activeFilter !== "ALL"
              ? "Try adjusting your filter or search criteria."
              : "You have not placed any orders yet."}
          </p>
          <Link to="/orders/new" className="btn btn-primary btn-sm px-3">
            Place Your First Order
          </Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filteredOrders.map((order) => {
            const statusMeta = STATUS_CONFIG[order.status] || {
              badgeClass: "kp-badge-info",
              step: 1,
              label: order.status,
            };
            const isCancelled = order.status === "Cancelled";
            const isDelivered = order.status === "Delivered";
            const isPlaced = order.status === "Placed";

            return (
              <div key={order.order_id} className="kp-card">
                {/* Header row */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-3 border-bottom">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: 42,
                        height: 42,
                        background: isCancelled ? "var(--color-danger-bg)" : "var(--color-amber-50)",
                        color: isCancelled ? "var(--color-danger-text)" : "var(--color-amber-600)",
                        fontWeight: 700,
                      }}
                    >
                      #{order.order_id}
                    </div>
                    <div>
                      <h3 className="h6 mb-0">Order #{order.order_id}</h3>
                      <span className="text-muted small">
                        Placed on {order.order_date ? new Date(order.order_date).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className={`kp-badge ${statusMeta.badgeClass}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                </div>

                {/* Stepper Progress Bar (REQ-ORD-05 lifecycle) */}
                {!isCancelled ? (
                  <div className="py-3 border-bottom">
                    <div className="d-flex justify-content-between align-items-center position-relative px-2">
                      {/* Connecting Line */}
                      <div
                        style={{
                          position: "absolute",
                          top: "14px",
                          left: "40px",
                          right: "40px",
                          height: "3px",
                          background: "var(--color-border)",
                          zIndex: 0,
                        }}
                      ></div>
                      <div
                        style={{
                          position: "absolute",
                          top: "14px",
                          left: "40px",
                          width: `${Math.min(100, Math.max(0, ((statusMeta.step - 1) / (LIFECYCLE_STEPS.length - 1)) * 100))}%`,
                          height: "3px",
                          background: "var(--color-navy-800)",
                          transition: "width 0.3s ease",
                          zIndex: 0,
                        }}
                      ></div>

                      {LIFECYCLE_STEPS.map((stepName, idx) => {
                        const stepNum = idx + 1;
                        const isDone = statusMeta.step >= stepNum;
                        const isCurrent = statusMeta.step === stepNum;

                        return (
                          <div
                            key={stepName}
                            className="text-center position-relative"
                            style={{ zIndex: 1, minWidth: 60 }}
                          >
                            <div
                              className="rounded-circle mx-auto d-flex align-items-center justify-content-center"
                              style={{
                                width: 28,
                                height: 28,
                                background: isDone ? "var(--color-navy-800)" : "var(--color-surface)",
                                border: `2px solid ${isDone ? "var(--color-navy-800)" : "var(--color-border-strong)"}`,
                                color: isDone ? "#ffffff" : "var(--color-text-muted)",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              {isDone ? <IconCheck size={14} stroke={3} /> : stepNum}
                            </div>
                            <span
                              className="d-block small mt-1"
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: isCurrent ? 700 : 500,
                                color: isCurrent ? "var(--color-text)" : "var(--color-text-muted)",
                              }}
                            >
                              {stepName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-2 px-3 my-2 rounded bg-danger-subtle text-danger small d-flex align-items-center">
                    <IconAlertCircle size={16} className="me-2 flex-shrink-0" />
                    <span>This order was cancelled. Reserved inventory was restored to the central warehouse.</span>
                  </div>
                )}

                {/* Details Grid */}
                <div className="row g-3 pt-3">
                  <div className="col-md-4 col-sm-6">
                    <div className="small text-muted mb-1 d-flex align-items-center gap-1">
                      <IconCalendar size={14} /> Requested Delivery Date
                    </div>
                    <div className="fw-semibold">
                      {order.requested_delivery_date
                        ? new Date(order.requested_delivery_date).toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>

                  <div className="col-md-5 col-sm-6">
                    <div className="small text-muted mb-1 d-flex align-items-center gap-1">
                      <IconMapPin size={14} /> Delivery Destination
                    </div>
                    <div className="fw-semibold text-truncate" title={order.delivery_address}>
                      {order.delivery_address || "Standard Customer Address"}
                    </div>
                    {order.route_stop_id && (
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                        Stop ID: #{order.route_stop_id} {order.route_id ? `(Route #${order.route_id})` : ""}
                      </div>
                    )}
                  </div>

                  <div className="col-md-3 col-sm-12 text-md-end">
                    <div className="small text-muted mb-1">Total Valuation & Volume</div>
                    <div className="fw-bold fs-6 text-dark">
                      LKR {parseFloat(order.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                      Volume: {parseFloat(order.total_volume || 0).toFixed(2)} m³
                    </div>
                  </div>
                </div>

                {/* Delivery Time Stamp if present */}
                {order.delivered_at && (
                  <div className="mt-2 pt-2 border-top small text-success d-flex align-items-center gap-1">
                    <IconCheck size={14} />
                    <span>Delivered at: {new Date(order.delivered_at).toLocaleString()}</span>
                  </div>
                )}

                {/* Expandable Order Items Section */}
                {expandedOrders[order.order_id] && (
                  <div className="mt-3 pt-3 border-top bg-light p-3 rounded">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-semibold small text-dark">
                        Itemized Cargo Breakdown ({order.items?.length || 0} items)
                      </span>
                      <span className="text-muted small">
                        Total Volume: {parseFloat(order.total_volume || 0).toFixed(2)} m³
                      </span>
                    </div>

                    {!order.items || order.items.length === 0 ? (
                      <p className="text-muted small mb-0">No item details recorded for this order.</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered bg-white mb-0 align-middle small">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: 40 }} className="text-center">#</th>
                              <th>Product Name</th>
                              <th className="text-end" style={{ width: 120 }}>Unit Price</th>
                              <th className="text-center" style={{ width: 70 }}>Qty</th>
                              <th className="text-end" style={{ width: 90 }}>Volume</th>
                              <th className="text-end" style={{ width: 120 }}>Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((it, idx) => (
                              <tr key={it.order_item_id || idx}>
                                <td className="text-center text-muted">{idx + 1}</td>
                                <td className="fw-medium text-dark">{it.product_name || `Product #${it.product_id}`}</td>
                                <td className="text-end">LKR {parseFloat(it.unit_price || 0).toFixed(2)}</td>
                                <td className="text-center fw-bold">{it.quantity}</td>
                                <td className="text-end text-muted">{parseFloat(it.line_volume || (it.quantity * it.space_consumption_rate) || 0).toFixed(2)} m³</td>
                                <td className="text-end fw-semibold text-dark">
                                  LKR {parseFloat(it.line_total || (it.quantity * it.unit_price) || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Footer */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-3 border-top mt-3">
                  <div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                      onClick={() => toggleExpandOrder(order.order_id)}
                    >
                      {expandedOrders[order.order_id] ? (
                        <>
                          <IconChevronUp size={15} />
                          <span>Hide Items</span>
                        </>
                      ) : (
                        <>
                          <IconChevronDown size={15} />
                          <span>View Items ({order.items?.length || 0})</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="d-flex align-items-center flex-wrap gap-2">
                    {/* Re-Order Button */}
                    {order.items && order.items.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                        onClick={() => handleReorder(order)}
                        title="Copy items into new order form"
                      >
                        <IconRefresh size={14} />
                        <span>Re-Order</span>
                      </button>
                    )}

                    {/* PDF Invoice Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                      onClick={() => downloadPdfInvoice(order)}
                      title="Download official PDF invoice and delivery manifest"
                    >
                      <IconFileText size={14} />
                      <span>Invoice (PDF)</span>
                    </button>

                    {/* REQ-ORD-07 Confirm receipt button */}
                    {isDelivered && (
                      <button
                        className="btn btn-sm btn-success d-inline-flex align-items-center gap-1 fw-bold px-3"
                        onClick={() => handleConfirmReceipt(order.order_id)}
                        disabled={actionLoading}
                      >
                        <IconCircleCheck size={16} />
                        <span>Confirm Receipt</span>
                      </button>
                    )}

                    {/* REQ-ORD-06 Placed-only actions: Edit & Cancel */}
                    {isPlaced && (
                      <>
                        <button
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                          onClick={() => openEditModal(order)}
                          disabled={actionLoading}
                        >
                          <IconEdit size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                          onClick={() => handleCancelOrder(order.order_id)}
                          disabled={actionLoading}
                        >
                          <IconTrash size={14} />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div
          className="modal show d-block"
          style={{ background: "rgba(11, 19, 38, 0.45)", zIndex: 1050 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content kp-card border-0">
              <div className="modal-header border-bottom pb-2">
                <h5 className="modal-title h6 fw-bold">
                  Edit Order #{editingOrder.order_id} (Status: Placed)
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingOrder(null)}
                  disabled={actionLoading}
                ></button>
              </div>

              <form onSubmit={handleSaveEdit}>
                <div className="modal-body py-3">
                  {editError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      {editError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Delivery Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Requested Delivery Date (Min. 7 Days Lead Time)
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      required
                    />
                    <div className="form-text small text-muted">
                      Per supply chain policy, modifications must maintain at least a 7-day advance notice.
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top pt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setEditingOrder(null)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Saving..." : "Save Changes"}
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

export default MyOrders;

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  IconChartBar,
  IconFileSpreadsheet,
  IconFileText,
  IconSearch,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconTrendingUp,
  IconCoins,
  IconBox,
  IconTruck,
  IconBuildingStore,
  IconUsers,
} from "@tabler/icons-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ALL_REPORT_TYPES = [
  { value: "sales",            label: "Quarterly Sales & Revenue",  roles: [1, 2] },
  { value: "top-products",     label: "Top Selling Products",       roles: [1, 2, 3] },
  { value: "city-breakdown",   label: "City & Regional Breakdown", roles: [1, 2, 3] },
  { value: "staff-hours",      label: "Staff Working Hours & Caps", roles: [1, 2] },
  { value: "truck-utilization",label: "Truck Fleet Utilization",     roles: [1, 2] },
  { value: "recent-deliveries",label: "Recent Deliveries Summary",  roles: [1, 2, 3] },
  { value: "system-summary",   label: "Complete System Summary",    roles: [1] },
];

function Reports() {
  const [reportType, setReportType] = useState("sales");
  const [startDate, setStartDate]   = useState("2026-01-01");
  const [endDate, setEndDate]       = useState("2026-12-31");
  const [limit, setLimit]           = useState(10);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [tableSearch, setTableSearch] = useState(urlSearch);

  useEffect(() => {
    setTableSearch(urlSearch);
  }, [urlSearch]);

  const handleTableSearchChange = (val) => {
    setTableSearch(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set("search", val);
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  };
  const [viewMode, setViewMode]     = useState("both"); // "table", "chart", "both"
  const [rows, setRows]             = useState([]);
  const [columns, setColumns]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [fetched, setFetched]       = useState(false);

  const token = localStorage.getItem("token");
  const userRole = parseInt(localStorage.getItem("roleId") || "0", 10);

  // Filter report types available to user's role
  const REPORT_TYPES = useMemo(() => {
    return ALL_REPORT_TYPES.filter((r) => r.roles.includes(userRole));
  }, [userRole]);

  useEffect(() => {
    if (REPORT_TYPES.length > 0 && !REPORT_TYPES.find((r) => r.value === reportType)) {
      setReportType(REPORT_TYPES[0].value);
    }
  }, [userRole, reportType, REPORT_TYPES]);

  const runReport = async () => {
    setLoading(true);
    setError("");
    setRows([]);
    setFetched(false);
    try {
      const params = { startDate, endDate, limit };
      const res = await axios.get(apiUrl(`/api/reports/${reportType}`), {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      const data = res.data || [];
      if (data.length > 0) setColumns(Object.keys(data[0]));
      setRows(data);
      setFetched(true);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load report data.");
    } finally {
      setLoading(false);
    }
  };

  // Run automatically on first mount
  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  // Filtered rows for table search
  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return rows;
    const term = tableSearch.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => String(row[col] ?? "").toLowerCase().includes(term))
    );
  }, [rows, columns, tableSearch]);

  // KPI Calculations
  const kpis = useMemo(() => {
    if (!rows || rows.length === 0) return null;

    if (reportType === "sales") {
      const totalRev = rows.reduce((acc, r) => acc + Number(r.total_revenue || 0), 0);
      const totalVol = rows.reduce((acc, r) => acc + Number(r.total_volume || 0), 0);
      const totalOrders = rows.reduce((acc, r) => acc + Number(r.total_orders || 0), 0);
      return [
        { label: "Total Revenue", value: `LKR ${totalRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: IconCoins, color: "text-success" },
        { label: "Total Orders", value: totalOrders.toLocaleString(), icon: IconTrendingUp, color: "text-primary" },
        { label: "Total Volume", value: `${totalVol.toFixed(2)} m³`, icon: IconBox, color: "text-info" },
      ];
    }

    if (reportType === "top-products") {
      const totalQty = rows.reduce((acc, r) => acc + Number(r.total_quantity_sold || 0), 0);
      const totalRev = rows.reduce((acc, r) => acc + Number(r.total_revenue || 0), 0);
      const topProduct = rows[0]?.product_name || "N/A";
      return [
        { label: "Top Product", value: topProduct, icon: IconTrendingUp, color: "text-primary" },
        { label: "Total Units Sold", value: totalQty.toLocaleString(), icon: IconBox, color: "text-success" },
        { label: "Products Revenue", value: `LKR ${totalRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: IconCoins, color: "text-info" },
      ];
    }

    if (reportType === "staff-hours") {
      const totalHours = rows.reduce((acc, r) => acc + Number(r.total_hours || 0), 0);
      const violations = rows.filter((r) => Number(r.limit_exceeded) === 1).length;
      return [
        { label: "Staff Recorded", value: rows.length, icon: IconUsers, color: "text-primary" },
        { label: "Total Logged Hours", value: `${totalHours.toFixed(1)} hrs`, icon: IconTrendingUp, color: "text-success" },
        { label: "Cap Violations", value: violations, icon: IconAlertTriangle, color: violations > 0 ? "text-danger" : "text-success" },
      ];
    }

    if (reportType === "truck-utilization") {
      const totalTrips = rows.reduce((acc, r) => acc + Number(r.total_trips_assigned || 0), 0);
      const completedTrips = rows.reduce((acc, r) => acc + Number(r.completed_trips || 0), 0);
      const totalHours = rows.reduce((acc, r) => acc + Number(r.total_hours_operated || 0), 0);
      return [
        { label: "Active Trucks", value: rows.length, icon: IconTruck, color: "text-primary" },
        { label: "Completed Runs", value: `${completedTrips} / ${totalTrips}`, icon: IconCheck, color: "text-success" },
        { label: "Operating Hours", value: `${totalHours.toFixed(1)} hrs`, icon: IconTrendingUp, color: "text-info" },
      ];
    }

    return null;
  }, [rows, reportType]);

  // Chart configuration
  const chartConfig = useMemo(() => {
    if (!rows || rows.length === 0) return null;

    if (reportType === "sales") {
      return {
        type: "bar",
        data: {
          labels: rows.map((r) => r.period || "Period"),
          datasets: [
            {
              label: "Revenue (LKR)",
              data: rows.map((r) => Number(r.total_revenue || 0)),
              backgroundColor: "rgba(14, 165, 233, 0.75)",
              borderColor: "rgb(14, 165, 233)",
              borderWidth: 1.5,
              borderRadius: 6,
            },
          ],
        },
      };
    }

    if (reportType === "top-products") {
      return {
        type: "bar",
        data: {
          labels: rows.slice(0, 8).map((r) => r.product_name || "Product"),
          datasets: [
            {
              label: "Quantity Sold",
              data: rows.slice(0, 8).map((r) => Number(r.total_quantity_sold || 0)),
              backgroundColor: "rgba(34, 197, 94, 0.75)",
              borderColor: "rgb(34, 197, 94)",
              borderWidth: 1.5,
              borderRadius: 6,
            },
          ],
        },
      };
    }

    if (reportType === "city-breakdown") {
      const palette = [
        "rgba(59, 130, 246, 0.8)",
        "rgba(16, 185, 129, 0.8)",
        "rgba(245, 158, 11, 0.8)",
        "rgba(239, 68, 68, 0.8)",
        "rgba(139, 92, 246, 0.8)",
        "rgba(236, 72, 153, 0.8)",
      ];
      return {
        type: "doughnut",
        data: {
          labels: rows.map((r) => r.city_name || "City"),
          datasets: [
            {
              data: rows.map((r) => Number(r.total_sales_value || 0)),
              backgroundColor: palette.slice(0, rows.length),
              borderWidth: 2,
            },
          ],
        },
      };
    }

    if (reportType === "truck-utilization") {
      return {
        type: "bar",
        data: {
          labels: rows.map((r) => r.plate_number || "Truck"),
          datasets: [
            {
              label: "Completed Trips",
              data: rows.map((r) => Number(r.completed_trips || 0)),
              backgroundColor: "rgba(16, 185, 129, 0.75)",
              borderRadius: 4,
            },
            {
              label: "Total Trips Assigned",
              data: rows.map((r) => Number(r.total_trips_assigned || 0)),
              backgroundColor: "rgba(148, 163, 184, 0.5)",
              borderRadius: 4,
            },
          ],
        },
      };
    }

    return null;
  }, [rows, reportType]);

  // Export handlers
  const exportCsv = async () => {
    try {
      const params = { startDate, endDate, limit, format: "csv" };
      const res = await axios.get(apiUrl(`/api/reports/${reportType}`), {
        headers: { Authorization: `Bearer ${token}` },
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export CSV: " + (err.response?.data?.error || err.message));
    }
  };

  const exportExcel = () => {
    if (!rows || rows.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report Data");
    XLSX.writeFile(workbook, `${reportType}_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = () => {
    if (!rows || rows.length === 0) return;
    const doc = new jsPDF();
    const title = REPORT_TYPES.find((r) => r.value === reportType)?.label || "Report";
    doc.setFontSize(14);
    doc.text(`Kandypack SCMS - ${title}`, 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${startDate} to ${endDate}`, 14, 22);

    const tableData = rows.map((row) => columns.map((col) => String(row[col] ?? "—")));

    autoTable(doc, {
      head: [columns.map((col) => col.replace(/_/g, " ").toUpperCase())],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`${reportType}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <AppLayout pageTitle="Reports & Analytics">
      {/* Alert banner */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
          <IconAlertTriangle className="me-2 flex-shrink-0" size={20} />
          <div className="flex-grow-1">{error}</div>
          <button type="button" className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}

      {/* Control Card: Select Report, Date range, Limit */}
      <div className="kp-card mb-4 shadow-sm">
        <div className="row g-3 align-items-end">
          <div className="col-lg-3 col-md-6">
            <label className="form-label small fw-bold">Select Report Type:</label>
            <select
              className="form-select form-select-sm"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {!(
            reportType === "system-summary" ||
            reportType === "truck-utilization" ||
            reportType === "city-breakdown" ||
            reportType === "recent-deliveries" ||
            reportType === "top-products"
          ) && (
            <>
              <div className="col-lg-2 col-md-3 col-6">
                <label className="form-label small fw-bold">From Date:</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="col-lg-2 col-md-3 col-6">
                <label className="form-label small fw-bold">To Date:</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          {(reportType === "recent-deliveries" ||
            reportType === "top-products" ||
            reportType === "system-summary") && (
            <div className="col-lg-2 col-md-3 col-6">
              <label className="form-label small fw-bold">Row Limit:</label>
              <input
                type="number"
                className="form-control form-control-sm"
                min="1"
                max="500"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
          )}

          <div className="col-lg-2 col-md-3">
            <button
              className="btn btn-primary btn-sm w-100 fw-bold d-flex align-items-center justify-content-center"
              onClick={runReport}
              disabled={loading}
            >
              <IconRefresh size={16} className={`me-1 ${loading ? "fa-spin" : ""}`} />
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>

          <div className="col-lg-3 col-md-6 text-lg-end">
            <div className="btn-group btn-group-sm">
              <button
                className="btn btn-outline-success"
                onClick={exportExcel}
                disabled={!fetched || rows.length === 0}
                title="Export to Excel"
              >
                <IconFileSpreadsheet size={15} className="me-1" /> Excel
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={exportPDF}
                disabled={!fetched || rows.length === 0}
                title="Export to PDF"
              >
                <IconFileText size={15} className="me-1" /> PDF
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={exportCsv}
                disabled={!fetched || rows.length === 0}
                title="Export to CSV"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="row g-3 mb-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className="col-md-4">
                <div className="kp-card h-100 d-flex align-items-center justify-content-between py-3">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">{kpi.label}</span>
                    <h3 className="h5 mb-0 fw-bold mt-1">{kpi.value}</h3>
                  </div>
                  <div className={`p-2 rounded-circle bg-light ${kpi.color}`}>
                    <Icon size={24} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart Section */}
      {chartConfig && (
        <div className="kp-card mb-4 shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="h6 mb-0 fw-bold d-flex align-items-center">
              <IconChartBar size={18} className="me-2 text-primary" />
              Visual Trend & Distribution
            </h4>
            <div className="btn-group btn-group-sm">
              <button
                className={`btn ${viewMode === "both" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setViewMode("both")}
              >
                Overview
              </button>
              <button
                className={`btn ${viewMode === "chart" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setViewMode("chart")}
              >
                Chart Only
              </button>
              <button
                className={`btn ${viewMode === "table" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setViewMode("table")}
              >
                Table Only
              </button>
            </div>
          </div>

          {(viewMode === "both" || viewMode === "chart") && (
            <div style={{ maxHeight: "320px", display: "flex", justifyContent: "center" }}>
              {chartConfig.type === "doughnut" ? (
                <div style={{ maxWidth: "320px", width: "100%" }}>
                  <Doughnut data={chartConfig.data} options={{ maintainAspectRatio: true, responsive: true }} />
                </div>
              ) : (
                <div style={{ width: "100%", height: "300px" }}>
                  <Bar
                    data={chartConfig.data}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      plugins: { legend: { display: true } },
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabular Data Section */}
      {(viewMode === "both" || viewMode === "table") && fetched && (
        <div className="kp-card shadow-sm">
          <div className="row g-2 align-items-center mb-3">
            <div className="col-md-6">
              <h4 className="h6 mb-0 fw-bold">Report Data Records</h4>
              <span className="small text-muted">
                Showing {filteredRows.length} of {rows.length} rows
              </span>
            </div>
            <div className="col-md-6">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <IconSearch size={16} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Filter table rows..."
                  value={tableSearch}
                  onChange={(e) => handleTableSearchChange(e.target.value)}
                />
                {tableSearch && (
                  <button
                    className="btn btn-outline-secondary border"
                    type="button"
                    onClick={() => handleTableSearchChange("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-muted text-center py-4">No records match the current criteria.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle table-hover table-striped">
                <thead className="table-dark">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="text-nowrap small text-uppercase">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => {
                    const isLimitExceeded = Boolean(row.limit_exceeded === 1 || row.limit_exceeded === "1");
                    return (
                      <tr key={i} className={isLimitExceeded ? "table-danger" : ""}>
                        {columns.map((col) => {
                          const val = row[col];
                          if (col === "limit_exceeded") {
                            return (
                              <td key={col}>
                                <span className={`badge ${val ? "bg-danger" : "bg-success"}`}>
                                  {val ? "Exceeded Limit" : "Compliant"}
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td key={col} className="small">
                              {val ?? "—"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default Reports;

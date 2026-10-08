import { useState } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const REPORT_TYPES = [
  { value: "sales",            label: "Quarterly Sales" },
  { value: "top-products",     label: "Top Selling Products" },
  { value: "city-breakdown",   label: "City / Store Breakdown" },
  { value: "staff-hours",      label: "Staff Working Hours" },
  { value: "truck-utilization",label: "Truck Utilization" },
];

function Reports() {
  const [reportType, setReportType] = useState("sales");
  const [startDate, setStartDate]   = useState("2026-01-01");
  const [endDate, setEndDate]       = useState("2026-12-31");
  const [rows, setRows]             = useState([]);
  const [columns, setColumns]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [fetched, setFetched]       = useState(false);

  const token = localStorage.getItem("token");

  const runReport = async () => {
    setLoading(true);
    setError("");
    setRows([]);
    setFetched(false);
    try {
      const params = { startDate, endDate };
      const res = await axios.get(
        `http://localhost:5000/api/reports/${reportType}`,
        { headers: { Authorization: `Bearer ${token}` }, params }
      );
      const data = res.data;
      if (data.length > 0) setColumns(Object.keys(data[0]));
      setRows(data);
      setFetched(true);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load report");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    const params = { startDate, endDate, format: "csv" };
    const res = await axios.get(
      `http://localhost:5000/api/reports/${reportType}`,
      { headers: { Authorization: `Bearer ${token}` }, params, responseType: "blob" }
    );
    const url  = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", `${reportType}-report.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const title = REPORT_TYPES.find((r) => r.value === reportType)?.label || "Report";
    doc.text(`Kandypack SCMS - ${title}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 22);
    
    const tableData = rows.map((row) => columns.map((col) => row[col] ?? "—"));
    
    doc.autoTable({
      head: [columns.map((col) => col.replace(/_/g, " ").toUpperCase())],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] } // Navy 900
    });
    
    doc.save(`${reportType}-report.pdf`);
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report Data");
    XLSX.writeFile(workbook, `${reportType}-report.xlsx`);
  };

  return (
    <AppLayout pageTitle="Reports">
      <div className="kp-card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label>Report Type</label>
            <select className="form-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {REPORT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>From</label>
            <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label>To</label>
            <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={runReport} disabled={loading}>
            {loading ? "Loading…" : "Run Report"}
          </button>
          {fetched && rows.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-secondary" onClick={exportCsv}>CSV</button>
              <button className="btn btn-secondary" onClick={exportExcel}>Excel</button>
              <button className="btn btn-secondary" onClick={exportPDF}>PDF</button>
            </div>
          )}
        </div>
        {error && <p style={{ color: "var(--color-danger-text)", marginTop: "0.75rem", marginBottom: 0 }}>{error}</p>}
      </div>

      {fetched && (
        <div className="kp-card">
          {rows.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", margin: 0 }}>No data found for this range.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col}>{col.replace(/_/g, " ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      {columns.map((col) => (
                        <td key={col}>{row[col] ?? "—"}</td>
                      ))}
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

export default Reports;


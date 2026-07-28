import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import {
  ShieldCheck,
  Search,
  Download,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

const AuditLog = () => {
  const { user } = useAuth();

  // State Management
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [resourceFilter, setResourceFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch Audit Logs with Query Parameters
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: pageSize,
        resource: resourceFilter || undefined,
        search: searchTerm || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      const response = await api.get("/audit-logs", { params });

      // Support both direct array responses or paginated objects ({ items: [], total: N })
      if (Array.isArray(response.data)) {
        setLogs(response.data);
        setTotalCount(response.data.length);
        setTotalPages(1);
      } else {
        setLogs(response.data.items || response.data.logs || []);
        const total = response.data.total || response.data.count || 0;
        setTotalCount(total);
        setTotalPages(Math.ceil(total / pageSize) || 1);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      if (err.response?.status === 403) {
        setError("Access denied: You do not have Super Admin permissions.");
      } else {
        setError(err.response?.data?.detail || "Failed to load system audit logs.");
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, resourceFilter, searchTerm, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle Search Submission / Filter Reset
  const handleResetFilters = () => {
    setResourceFilter("");
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Export Logs to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = ["Timestamp", "User ID", "Action", "Resource", "Resource ID", "Details", "IP Address"];
    const rows = logs.map((log) => [
      log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A",
      log.user_id || "N/A",
      log.action || "N/A",
      log.resource || "N/A",
      log.resource_id || "N/A",
      `"${(log.details || "").replace(/"/g, '""')}"`,
      log.ip_address || "N/A",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper Badge Color for Action Types
  const getActionBadgeClass = (action = "") => {
    const act = action.toUpperCase();
    if (act.includes("CREATE") || act.includes("ADD") || act.includes("LOGIN")) return "badge-success";
    if (act.includes("UPDATE") || act.includes("EDIT")) return "badge-warning";
    if (act.includes("DELETE") || act.includes("REMOVE") || act.includes("LOGOUT")) return "badge-danger";
    return "badge-secondary";
  };

  // Access Control Guard
  if (user?.role !== "super_admin") {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center", margin: "24px" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "8px" }}>403 - Access Denied</h2>
        <p style={{ color: "#6b7280" }}>
          This section is restricted strictly to Super Admin accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="audit-logs-page" style={{ padding: "24px" }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.5rem", fontWeight: "700" }}>
            <ShieldCheck size={26} color="#CC0000" /> System Audit Logs
          </h1>
          <p className="page-subtitle" style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Security compliance, access tracking, and system operational trail
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-outline" onClick={fetchLogs} title="Refresh logs" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleExportCSV} disabled={logs.length === 0} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="card" style={{ padding: "16px", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        {/* Text Search */}
        <div style={{ flex: "1 1 200px", position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search action, details or IP..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            style={{ paddingLeft: "36px", width: "100%" }}
          />
        </div>

        {/* Resource Filter */}
        <div style={{ flex: "0 1 180px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Filter size={16} color="#6b7280" />
          <select
            className="form-control"
            value={resourceFilter}
            onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Resources</option>
            <option value="users">Users</option>
            <option value="incidents">Incidents</option>
            <option value="scorecard">Scorecards</option>
            <option value="audits">Audits</option>
            <option value="corrective_actions">Corrective Actions</option>
            <option value="sites">Sites</option>
          </select>
        </div>

        {/* Date Range Start */}
        <div style={{ flex: "0 1 150px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Calendar size={16} color="#6b7280" />
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          />
        </div>

        {/* Date Range End */}
        <div style={{ flex: "0 1 150px" }}>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          />
        </div>

        {/* Reset Filters */}
        <button className="btn btn-outline" onClick={handleResetFilters} style={{ padding: "8px 12px", fontSize: "0.85rem" }}>
          Reset
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ padding: "12px 16px", backgroundColor: "#ffebe9", color: "#cf222e", borderRadius: "6px", marginBottom: "16px", border: "1px solid #f87171" }}>
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="card table-wrap" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "12px 16px" }}>Timestamp</th>
              <th style={{ padding: "12px 16px" }}>User ID</th>
              <th style={{ padding: "12px 16px" }}>Action</th>
              <th style={{ padding: "12px 16px" }}>Resource</th>
              <th style={{ padding: "12px 16px" }}>Details</th>
              <th style={{ padding: "12px 16px" }}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                  <p style={{ color: "#6b7280" }}>Loading audit records...</p>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                  <p style={{ color: "#6b7280" }}>No audit log entries match your criteria.</p>
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => (
                <tr key={log.id || idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.875rem", fontWeight: "600" }}>
                    {log.user_id || "System"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className={`badge ${getActionBadgeClass(log.action)}`} style={{ textTransform: "uppercase", fontSize: "0.75rem", fontWeight: "700" }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.875rem" }}>
                    {log.resource ? `${log.resource} ${log.resource_id ? `#${log.resource_id}` : ""}` : "N/A"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "#374151" }}>
                    {log.details || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#6b7280", fontFamily: "monospace" }}>
                    {log.ip_address || "N/A"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            Showing {logs.length} of {totalCount} log records
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
              <span>Rows per page:</span>
              <select
                className="form-control"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                style={{ padding: "4px 8px" }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                style={{ padding: "6px 10px" }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-outline"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                style={{ padding: "6px 10px" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
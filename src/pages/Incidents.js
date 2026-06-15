import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { incidentsApi, sitesApi } from "../api/endpoints";
import { X, CalendarDays, Building2, RefreshCw } from "lucide-react";
import LogIncidentModal from "../components/LogIncidentModal";
import { useAuth } from "../context/AuthContext";

export default function Incidents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSiteManager = user?.role === "site_manager";

  // --- State Management ---
  const [incidents, setIncidents] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState("all");
  const [reportRange, setReportRange] = useState("all");

  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [reportSummary, setReportSummary] = useState({
    total: 0,
    highOrCritical: 0,
    lowOrMedium: 0,
    resolved: 0,
    open: 0,
  });

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [followUpPrefill, setFollowUpPrefill] = useState(null);
  const [loading, setLoading] = useState(true);

  const reportRangeOptions = [
    { value: "day", label: "Today" },
    { value: "7", label: "7 Days" },
    { value: "30", label: "30 Days" },
    { value: "90", label: "90 Days" },
    { value: "all", label: "All Time" },
  ];

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes, sitesRes] = await Promise.all([
        incidentsApi.getAll(),
        sitesApi.getAll(),
      ]);
      setIncidents(incRes.data || []);
      setSites(sitesRes.data || []);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lock the site filter to the site manager's own site
  useEffect(() => {
    if (isSiteManager && user?.site_id) {
      setSelectedSite(String(user.site_id));
    }
  }, [isSiteManager, user?.site_id]);

  // --- Helper: Date Parsing ---
  const getIncidentDate = (incident) => {
    const rawDate =
      incident.date_time ||
      incident.date ||
      incident.created_at ||
      incident.incident_date;
    if (!rawDate) return null;
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  // --- Automatic Live Filtering ---
  useEffect(() => {
    let result = [...incidents];
    const now = new Date();

    // 1. Filter by Time Range
    if (reportRange !== "all") {
      const start = new Date(now);
      if (reportRange === "day") {
        start.setHours(0, 0, 0, 0);
      } else {
        start.setDate(now.getDate() - parseInt(reportRange, 10));
        start.setHours(0, 0, 0, 0);
      }
      result = result.filter((inc) => {
        const d = getIncidentDate(inc);
        return d && d >= start;
      });
    }

    // 2. Filter by Site (String conversion handles ID type mismatches)
    if (selectedSite !== "all") {
      result = result.filter(
        (inc) => String(inc.site_id) === String(selectedSite),
      );
    }

    // 3. Calculate Summary Stats
    const summary = {
      total: result.length,
      highOrCritical: result.filter((inc) => {
        const sev = (inc.severity || "").trim().toLowerCase();
        return ["high", "critical"].includes(sev);
      }).length,
      lowOrMedium: result.filter((inc) => {
        const sev = (inc.severity || "").trim().toLowerCase();
        return ["low", "medium", "modrate"].includes(sev);
      }).length,
      resolved: result.filter(
        (inc) => (inc.status || "").trim().toLowerCase() === "resolved",
      ).length,
      open: result.filter(
        (inc) => (inc.status || "").trim().toLowerCase() !== "resolved",
      ).length,
    };

    setFilteredIncidents(result);
    setReportSummary(summary);
  }, [incidents, reportRange, selectedSite]);

  // --- Navigate to Corrective Actions page, prefilled from this incident ---
  const handleTakeAction = (incident) => {
    setIsModalOpen(false);
    navigate("/corrective-actions", {
      state: {
        fromIncident: true,
        site_id: incident.site_id,
        type: incident.type,
        description: incident.description,
      },
    });
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <h1 className="page-title">Incidents Register</h1>
      </div>

      {/* --- Filter & Report Panel --- */}
      <div
        className="card incident-report-panel"
        style={{ marginBottom: "32px" }}
      >
        <div
          className="incident-report-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div style={{ flex: "1 1 300px" }}>
            <h3 style={{ margin: "0 0 8px 0" }}>SHE Oversight Summary</h3>
            <p
              className="incident-report-subtitle"
              style={{ color: "#64748b", fontSize: "0.9rem" }}
            >
              Real-time monitoring across all fuel stations and depots.
            </p>

            {/* Station Selector */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              <Building2 size={18} color="#6366f1" />
              {isSiteManager ? (
                <input
                  type="text"
                  value={
                    sites.find((s) => String(s.id) === String(selectedSite))
                      ?.name || "Your Site"
                  }
                  disabled
                  readOnly
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    minWidth: "220px",
                    background: "#f1f5f9",
                    color: "#64748b",
                    cursor: "not-allowed",
                  }}
                />
              ) : (
                <select
                  className="form-select"
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    minWidth: "220px",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">National (All Stations)</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <button
            className="btn btn-outline"
            onClick={fetchData}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              height: "fit-content",
            }}
          >
            <RefreshCw size={16} /> Sync Data
          </button>
        </div>

        {/* Time Range Selector */}
        <div
          className="incident-range-toolbar"
          style={{
            marginTop: "24px",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "20px",
          }}
        >
          <div
            className="incident-range-label"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
              fontWeight: "700",
              fontSize: "0.85rem",
            }}
          >
            <CalendarDays size={16} /> TIME RANGE
          </div>
          <div
            className="incident-range-chips"
            style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
          >
            {reportRangeOptions.map((option) => (
              <button
                key={option.value}
                className={`incident-range-chip ${reportRange === option.value ? "active" : ""}`}
                onClick={() => setReportRange(option.value)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                  background:
                    reportRange === option.value ? "#6366f1" : "white",
                  color: reportRange === option.value ? "white" : "#64748b",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.2s",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="incident-report-results" style={{ marginTop: "24px" }}>
          <div
            className="incident-report-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "16px",
            }}
          >
            <div
              className="incident-report-stat"
              style={{
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <div
                className="incident-report-stat-label"
                style={{
                  color: "#64748b",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: "800",
                }}
              >
                Total
              </div>
              <div
                className="incident-report-stat-value"
                style={{ fontSize: "1.5rem", fontWeight: "900" }}
              >
                {reportSummary.total}
              </div>
            </div>
            <div
              className="incident-report-stat high-risk"
              style={{
                padding: "16px",
                background: "#fef2f2",
                borderRadius: "12px",
                textAlign: "center",
                color: "#dc2626",
              }}
            >
              <div
                className="incident-report-stat-label"
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: "800",
                }}
              >
                High/Critical
              </div>
              <div
                className="incident-report-stat-value"
                style={{ fontSize: "1.5rem", fontWeight: "900" }}
              >
                {reportSummary.highOrCritical}
              </div>
            </div>
            <div
              className="incident-report-stat low-medium"
              style={{
                padding: "16px",
                background: "#fffbeb",
                borderRadius: "12px",
                textAlign: "center",
                color: "#d97706",
              }}
            >
              <div
                className="incident-report-stat-label"
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: "800",
                }}
              >
                Low/Medium
              </div>
              <div
                className="incident-report-stat-value"
                style={{ fontSize: "1.5rem", fontWeight: "900" }}
              >
                {reportSummary.lowOrMedium}
              </div>
            </div>
            <div
              className="incident-report-stat resolved"
              style={{
                padding: "16px",
                background: "#f0fdf4",
                borderRadius: "12px",
                textAlign: "center",
                color: "#16a34a",
              }}
            >
              <div
                className="incident-report-stat-label"
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: "800",
                }}
              >
                Resolved
              </div>
              <div
                className="incident-report-stat-value"
                style={{ fontSize: "1.5rem", fontWeight: "900" }}
              >
                {reportSummary.resolved}
              </div>
            </div>
            <div
              className="incident-report-stat open"
              style={{
                padding: "16px",
                background: "#f1f5f9",
                borderRadius: "12px",
                textAlign: "center",
                color: "#475569",
              }}
            >
              <div
                className="incident-report-stat-label"
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: "800",
                }}
              >
                Open
              </div>
              <div
                className="incident-report-stat-value"
                style={{ fontSize: "1.5rem", fontWeight: "900" }}
              >
                {reportSummary.open}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Data Table --- */}
      <div className="card" style={{ padding: "0", overflow: "hidden" }}>
        <div className="table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <th style={{ textAlign: "left", padding: "16px" }}>ID</th>
                <th style={{ textAlign: "left", padding: "16px" }}>Type</th>
                <th style={{ textAlign: "left", padding: "16px" }}>Severity</th>
                <th style={{ textAlign: "left", padding: "16px" }}>Date</th>
                <th style={{ textAlign: "center", padding: "16px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((inc) => (
                <tr key={inc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "16px", fontWeight: "600" }}>
                    INC-{inc.id}
                  </td>
                  <td style={{ padding: "16px" }}>{inc.type}</td>
                  <td style={{ padding: "16px" }}>
                    <span
                      className={`badge badge-${inc.severity?.toLowerCase()}`}
                    >
                      {inc.severity}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    {getIncidentDate(inc)?.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }) || "N/A"}
                  </td>
                  <td style={{ padding: "16px", textAlign: "center" }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setSelectedIncident(inc);
                        setIsModalOpen(true);
                      }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredIncidents.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#94a3b8",
                    }}
                  >
                    No incident records match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Details Modal --- */}
      {isModalOpen && selectedIncident && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal"
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "16px",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <div
              className="modal-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ margin: 0 }}>Incident Details</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "16px" }}>
                <strong>Type:</strong> {selectedIncident.type}
              </div>
              <div style={{ marginBottom: "16px" }}>
                <strong>Description:</strong>
                <p style={{ marginTop: "4px", color: "#475569" }}>
                  {selectedIncident.description || "No description provided."}
                </p>
              </div>
            </div>
            <div
              className="modal-footer"
              style={{ display: "flex", gap: "12px", marginTop: "24px" }}
            >
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => handleTakeAction(selectedIncident)}
              >
                Take Action
              </button>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- Follow-Up Incident Modal --- */}
      <LogIncidentModal
        isOpen={isFollowUpOpen}
        onClose={() => {
          setIsFollowUpOpen(false);
          setFollowUpPrefill(null);
        }}
        onIncidentLogged={() => {
          setIsFollowUpOpen(false);
          setFollowUpPrefill(null);
          fetchData();
        }}
        prefill={followUpPrefill}
      />
    </div>
  );
}

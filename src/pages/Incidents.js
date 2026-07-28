import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { incidentsApi, sitesApi } from "../api/endpoints";
import { X, CalendarDays, Building2, RefreshCw, ClipboardCheck } from "lucide-react";
import LogIncidentModal from "../components/LogIncidentModal";
import { useAuth } from "../context/AuthContext";

// --- Helper Functions ---
const parseIncidentDate = (incident) => {
  const rawDate =
    incident.occurred_at || // Prioritizes user-entered incident date
    incident.date_time ||
    incident.date ||
    incident.created_at ||
    incident.incident_date;
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const REPORT_RANGE_OPTIONS = [
  { value: "day", label: "Today" },
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
  { value: "all", label: "All Time" },
];

// ==========================================
// Sub-Component: Oversight Summary & Filters
// ==========================================
function IncidentSummaryCard({
  sites,
  selectedSite,
  setSelectedSite,
  isSiteManager,
  reportRange,
  setReportRange,
  reportSummary,
  onSync,
}) {
  return (
    <div className="card incident-report-panel" style={{ marginBottom: "32px" }}>
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
          <p className="incident-report-subtitle" style={{ color: "#64748b", fontSize: "0.9rem" }}>
            Real-time monitoring across all fuel stations and depots.
          </p>

          {/* Station Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
            <Building2 size={18} color="#6366f1" />
            {isSiteManager ? (
              <input
                type="text"
                value={sites.find((s) => String(s.id) === String(selectedSite))?.name || "Your Site"}
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
          onClick={onSync}
          style={{ display: "flex", alignItems: "center", gap: "8px", height: "fit-content" }}
        >
          <RefreshCw size={16} /> Sync Data
        </button>
      </div>

      {/* Time Range Selector */}
      <div
        className="incident-range-toolbar"
        style={{ marginTop: "24px", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}
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
        <div className="incident-range-chips" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {REPORT_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`incident-range-chip ${reportRange === option.value ? "active" : ""}`}
              onClick={() => setReportRange(option.value)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: "1px solid #e2e8f0",
                background: reportRange === option.value ? "#6366f1" : "white",
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
          <StatBox label="Total" value={reportSummary.total} bg="#f8fafc" color="#0f172a" />
          <StatBox label="High / Critical" value={reportSummary.highOrCritical} bg="#fef2f2" color="#dc2626" />
          <StatBox label="Low / Medium" value={reportSummary.lowOrMedium} bg="#fffbeb" color="#066916" />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, bg, color }) {
  return (
    <div style={{ padding: "16px", background: bg, borderRadius: "12px", textAlign: "center", color }}>
      <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "800", opacity: 0.8 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: "900", marginTop: "4px" }}>{value}</div>
    </div>
  );
}

// ==========================================
// Sub-Component: Incidents Data Table
// ==========================================
function IncidentTable({ incidents, sites, onViewDetails }) {
  const getSiteName = (siteId, inc) => {
    // Uses nested site object if populated, otherwise finds by ID
    if (inc.site?.name) return inc.site.name;
    const matchedSite = sites.find((s) => String(s.id) === String(siteId));
    return matchedSite ? matchedSite.name : "N/A";
  };

  return (
    <div className="card" style={{ padding: "0", overflow: "hidden" }}>
      <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ textAlign: "left", padding: "16px" }}>ID</th>
              <th style={{ textAlign: "left", padding: "16px" }}>Site</th>
              <th style={{ textAlign: "left", padding: "16px" }}>Type</th>
              <th style={{ textAlign: "left", padding: "16px" }}>Severity</th>
              <th style={{ textAlign: "left", padding: "16px" }}>Occurred At</th>
              <th style={{ textAlign: "center", padding: "16px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "16px", fontWeight: "600" }}>INC-{inc.id}</td>
                <td style={{ padding: "16px", fontWeight: "500", color: "#334155" }}>
                  {getSiteName(inc.site_id, inc)}
                </td>
                <td style={{ padding: "16px" }}>{inc.type}</td>
                <td style={{ padding: "16px" }}>
                  <span className={`badge badge-${inc.severity?.toLowerCase()}`}>
                    {inc.severity}
                  </span>
                </td>
                <td style={{ padding: "16px" }}>
                  {parseIncidentDate(inc)?.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }) || "N/A"}
                </td>
                <td style={{ padding: "16px", textAlign: "center" }}>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => onViewDetails(inc)}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  No incident records match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// Sub-Component: Details Modal
// ==========================================
function IncidentDetailsModal({ incident, siteName, onClose, onTakeAction }) {
  if (!incident) return null;

  return (
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
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: "12px" }}>
            <strong>Site:</strong> {siteName}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <strong>Type:</strong> {incident.type}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <strong>Occurred At:</strong>{" "}
            {parseIncidentDate(incident)?.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            }) || "N/A"}
          </div>
          <div style={{ marginBottom: "16px" }}>
            <strong>Description:</strong>
            <p style={{ marginTop: "4px", color: "#475569" }}>
              {incident.description || "No description provided."}
            </p>
          </div>
        </div>
        <div className="modal-footer" style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onTakeAction(incident)}>
            Take Action
          </button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Main Parent Component
// ==========================================
export default function Incidents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSiteManager = user?.role === "site_manager";

  // Data State
  const [incidents, setIncidents] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedSite, setSelectedSite] = useState("all");
  const [reportRange, setReportRange] = useState("all");

  // UI Modal States
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [followUpPrefill, setFollowUpPrefill] = useState(null);

  // Data Fetching
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

  // Lock site selection for Site Managers
  useEffect(() => {
    if (isSiteManager && user?.site_id) {
      setSelectedSite(String(user.site_id));
    }
  }, [isSiteManager, user?.site_id]);

  // Memoized Filters
  const filteredIncidents = useMemo(() => {
    let result = [...incidents];
    const now = new Date();

    if (reportRange !== "all") {
      const start = new Date(now);
      if (reportRange === "day") {
        start.setHours(0, 0, 0, 0);
      } else {
        start.setDate(now.getDate() - parseInt(reportRange, 10));
        start.setHours(0, 0, 0, 0);
      }
      result = result.filter((inc) => {
        const d = parseIncidentDate(inc);
        return d && d >= start;
      });
    }

    if (selectedSite !== "all") {
      result = result.filter((inc) => String(inc.site_id) === String(selectedSite));
    }

    return result;
  }, [incidents, reportRange, selectedSite]);

  const reportSummary = useMemo(() => {
    return {
      total: filteredIncidents.length,
      highOrCritical: filteredIncidents.filter((inc) =>
        ["high", "critical"].includes((inc.severity || "").trim().toLowerCase())
      ).length,
      lowOrMedium: filteredIncidents.filter((inc) =>
        ["low", "medium", "moderate"].includes((inc.severity || "").trim().toLowerCase())
      ).length,
      resolved: filteredIncidents.filter(
        (inc) => (inc.status || "").trim().toLowerCase() === "resolved"
      ).length,
      open: filteredIncidents.filter(
        (inc) => (inc.status || "").trim().toLowerCase() !== "resolved"
      ).length,
    };
  }, [filteredIncidents]);

  const handleTakeAction = (incident) => {
    setIsDetailsOpen(false);
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
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6366f1", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>
            <ClipboardCheck size={14} /> Glow Petroleum SHE
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>Incidents Register</h1>
          <p className="page-subtitle" style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>Track and manage all reported incidents across sites.</p>
        </div>
      </div>

      {/* Oversight Summary & Filters */}
      <IncidentSummaryCard
        sites={sites}
        selectedSite={selectedSite}
        setSelectedSite={setSelectedSite}
        isSiteManager={isSiteManager}
        reportRange={reportRange}
        setReportRange={setReportRange}
        reportSummary={reportSummary}
        onSync={fetchData}
      />

      {/* Incidents Table */}
      <IncidentTable
        incidents={filteredIncidents}
        sites={sites}
        onViewDetails={(inc) => {
          setSelectedIncident(inc);
          setIsDetailsOpen(true);
        }}
      />

      {/* Incident Details Modal */}
      {isDetailsOpen && (
        <IncidentDetailsModal
          incident={selectedIncident}
          siteName={
            selectedIncident?.site?.name ||
            sites.find((s) => String(s.id) === String(selectedIncident?.site_id))?.name ||
            "N/A"
          }
          onClose={() => setIsDetailsOpen(false)}
          onTakeAction={handleTakeAction}
        />
      )}

      {/* Follow-Up Incident Modal */}
      <LogIncidentModal
        isOpen={isFollowUpOpen}
        sites={sites}
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
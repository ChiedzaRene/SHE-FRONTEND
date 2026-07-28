import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  AlertTriangle,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Info,
  PieChart as PieIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip as LeafletTooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { incidentsApi, sitesApi } from "../api/endpoints";

// --- Category & Color Mapping Helper ---
export const getIncidentCategory = (count) => {
  const num = Number(count) || 0;

  if (num === 0) {
    return {
      level: "Zero",
      label: "Clean Record",
      badgeClass: "badge-zero",
      bg: "#f0fdf4",
      color: "#16a34a",
      bubbleColor: "#10b981", // Green
    };
  }

  if (num >= 1 && num <= 2) {
    return {
      level: "Low",
      label: "Low Risk",
      badgeClass: "badge-low",
      bg: "#eff6ff",
      color: "#2563eb",
      bubbleColor: "#2563eb", // Blue
    };
  }

  if (num >= 3 && num <= 4) {
    return {
      level: "Medium",
      label: "Medium Risk",
      badgeClass: "badge-medium",
      bg: "#fffbeb",
      color: "#d97706",
      bubbleColor: "#f59e0b", // Amber
    };
  }

  // 5 or more
  return {
    level: "High",
    label: "High Risk",
    badgeClass: "badge-high",
    bg: "#fef2f2",
    color: "#dc2626",
    bubbleColor: "#ef4444", // Red
  };
};

// Helper to identify LTI incidents flexibly across variations
const isLtiIncident = (incident) => {
  const type = (incident.type || incident.incident_type || "").toUpperCase();
  const severity = (
    incident.severity ||
    incident.severity_level ||
    ""
  ).toLowerCase();

  return (
    type === "LTI" ||
    type.includes("LOST TIME") ||
    severity === "critical" ||
    severity === "high"
  );
};

// Helper to check compliance (Flagged if Medium/High risk OR TRIR > 1.5 OR LTIFR > 0.5)
const isNonCompliant = (incidentCount, trir, ltifr) => {
  return incidentCount >= 3 || trir > 1.5 || ltifr > 0.5;
};

const getBubbleRadius = (incidentCount, maxCount) => {
  if (maxCount === 0 || incidentCount === 0) return 8;
  return 8 + (incidentCount / maxCount) * 32;
};

const getBubbleColor = (incidentCount) => {
  return getIncidentCategory(incidentCount).bubbleColor;
};

// Compliance thresholds status logic
const getStatusColor = (val, target) => {
  const numericVal = Number(val) || 0;
  const ratio = numericVal / target;

  if (ratio > 1.0) {
    return {
      color: "#dc2626",
      bg: "#fef2f2",
      barColor: "#ef4444",
      label: "EXCEEDED",
    };
  }
  if (ratio >= 0.7) {
    return {
      color: "#d97706",
      bg: "#fffbeb",
      barColor: "#f59e0b",
      label: "WARNING",
    };
  }
  return {
    color: "#16a34a",
    bg: "#f0fdf4",
    barColor: "#10b981",
    label: "OPTIMAL",
  };
};

const PIE_COLORS = ["#6366f1", "#f43f5e", "#fbbf24", "#2dd4bf", "#a855f7"];

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    total_incidents: 0,
    trir: 0,
    ltifr: 0,
  });
  const [sites, setSites] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [siteMetrics, setSiteMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [mapSearch, setMapSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [sRes, iRes] = await Promise.all([
        sitesApi.getAll().catch(() => ({ data: [] })),
        incidentsApi.getAll().catch(() => ({ data: [] })),
      ]);

      const fetchedSites = sRes.data || [];
      const fetchedIncidents = iRes.data || [];

      // Per-site calculations with flexible LTI matching
      const perSiteData = fetchedSites.map((site) => {
        const siteIncidents = fetchedIncidents.filter(
          (i) => String(i.site_id) === String(site.id)
        );
        const hours = Number(site.man_hours) || 200000;
        const trir = hours > 0 ? (siteIncidents.length * 200000) / hours : 0;
        const ltiCount = siteIncidents.filter(isLtiIncident).length;
        const ltifr = hours > 0 ? (ltiCount * 1000000) / hours : 0;
        return { ...site, trir, ltifr, incidentCount: siteIncidents.length };
      });

      // Global Metrics Calculation
      const totalIncidents = fetchedIncidents.length;
      const totalHours = fetchedSites.reduce(
        (sum, s) => sum + (Number(s.man_hours) || 200000),
        0
      );
      const totalLtiCount = fetchedIncidents.filter(isLtiIncident).length;

      const globalTrir =
        totalHours > 0 ? (totalIncidents * 200000) / totalHours : 0;
      const globalLtifr =
        totalHours > 0 ? (totalLtiCount * 1000000) / totalHours : 0;

      setMetrics({
        total_incidents: totalIncidents,
        trir: globalTrir,
        ltifr: globalLtifr,
      });

      setSites(fetchedSites);
      setIncidents(fetchedIncidents);
      setSiteMetrics(perSiteData);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-polling interval to keep dashboard fresh every 30s
    const interval = setInterval(fetchData, 30000);

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, [fetchData]);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth < 1024;

  const chartData = Object.values(
    incidents.reduce((acc, curr) => {
      const type = curr.type || curr.incident_type || "Other";
      if (!acc[type]) acc[type] = { name: type, value: 0 };
      acc[type].value += 1;
      return acc;
    }, {})
  );

  const filteredSiteMetrics = siteMetrics.filter((s) => {
    const search = mapSearch.toLowerCase();
    return (
      s.name?.toLowerCase().includes(search) ||
      s.city?.toLowerCase().includes(search) ||
      s.location?.toLowerCase().includes(search) ||
      s.address?.toLowerCase().includes(search)
    );
  });

  // --- SORT LEADERBOARD (Highest Incident Count / Highest Risk First) ---
  const sortedLeaderboard = useMemo(() => {
    return [...siteMetrics].sort((a, b) => {
      if (b.incidentCount !== a.incidentCount) {
        return b.incidentCount - a.incidentCount; // Primary: Incident volume
      }
      return b.trir - a.trir; // Secondary tiebreaker: Higher TRIR
    });
  }, [siteMetrics]);

  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );

  return (
    <div style={{ padding: isMobile ? "16px" : "32px", backgroundColor: "#f1f5f9", minHeight: "100vh" }}>

      {/* HEADER */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "900", color: "#0f172a", margin: 0 }}>
          SHE Dashboard
        </h1>
        <p style={{ color: "#64748b", fontWeight: "500" }}>Glow Petroleum Safety Compliance Oversight</p>
      </div>

      {/* KPI GRID */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(4, 1fr)", gap: "20px", marginBottom: "20px" }}>
        <KPICard label="Total Sites" value={sites.length} Icon={Building2} color="#f97316" />
        <KPICard label="Active Incidents" value={incidents.filter((i) => i.status !== "Resolved").length} Icon={AlertTriangle} color="#f97316" />
        <KPICard label="TRIR (Avg)" value={(Number(metrics?.trir) || 0).toFixed(2)} Icon={BarChart2} color="#f97316" />
        <KPICard label="LTIFR (Avg)" value={(Number(metrics?.ltifr) || 0).toFixed(2)} Icon={Activity} color="#f97316" />
      </div>

      {/* GLOSSARY */}
      <div style={{ backgroundColor: "#eff6ff", border: "1px solid #dbeafe", borderRadius: "16px", padding: "20px", marginBottom: "32px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "24px" }}>
        <div>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "#1e40af", display: "flex", alignItems: "center", gap: "8px" }}>
            <Info size={16} /> Understanding TRIR (Target &lt; 1.5)
          </h4>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#1e40af", lineHeight: "1.5" }}>
            <strong>Total Recordable Incident Rate:</strong> Represents the number of injuries per 100 employees per year.
          </p>
        </div>
        <div style={{ borderLeft: isMobile ? "none" : "1px solid #dbeafe", paddingLeft: isMobile ? 0 : "24px" }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "#1e40af", display: "flex", alignItems: "center", gap: "8px" }}>
            <Info size={16} /> Understanding LTIFR (Target &lt; 0.5)
          </h4>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#1e40af", lineHeight: "1.5" }}>
            <strong>Lost Time Injury Frequency Rate:</strong> Measures injuries resulting in lost work days per 1 million hours.
          </p>
        </div>
      </div>

      {/* CHARTS */}
      <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "1fr 1.5fr", gap: "24px", marginBottom: "32px" }}>
        <Section title="Compliance Status">
          <hr style={{ borderColor: "#e2e8f0", margin: "12px 0 20px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "10px" }}>
            <ProgressBar label="Average TRIR" val={metrics?.trir} target={1.5} max={3} />
            <ProgressBar label="Average LTIFR" val={metrics?.ltifr} target={0.5} max={1} />
          </div>
        </Section>

        <Section title="Incident Distribution">
          <hr style={{ borderColor: "#e2e8f0", margin: "12px 0 20px 0" }} />
          {chartData.length === 0 ? (
            <div style={{ height: "220px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
              <PieIcon size={48} strokeWidth={1} style={{ marginBottom: "12px", opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: "600", fontSize: "0.9rem" }}>No incidents recorded</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem" }}>Incident data will appear here once logged</p>
            </div>
          ) : (
            <div style={{ width: "100%", minWidth: 0, height: "220px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="middle" align="right" layout="vertical" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>

      {/* INCIDENT BUBBLE HEATMAP */}
      <div style={{ backgroundColor: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "32px" }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span style={{ fontWeight: "800" }}>Incident Heatmap</span>
            <span style={{ marginLeft: "10px", fontSize: "0.75rem", color: "#94a3b8" }}>Bubble size = incident volume</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.72rem", color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} /> Clean (0)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", display: "inline-block" }} /> Low (1-2)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} /> Medium (3-4)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} /> High (5+)
              </span>
            </div>
            <input
              placeholder="Filter by site or city..."
              value={mapSearch}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem", minWidth: "180px" }}
              onChange={(e) => setMapSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ height: "420px" }}>
          {(() => {
            const maxCount = Math.max(...filteredSiteMetrics.map((s) => s.incidentCount), 1);
            return (
              <MapContainer center={[-19.0154, 29.1549]} zoom={6} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                {filteredSiteMetrics.map((site) => {
                  const radius = getBubbleRadius(site.incidentCount, maxCount);
                  const color = getBubbleColor(site.incidentCount);
                  const category = getIncidentCategory(site.incidentCount);
                  const flagged = isNonCompliant(site.incidentCount, site.trir, site.ltifr);

                  return (
                    <CircleMarker
                      key={site.id}
                      center={[site.latitude || -19, site.longitude || 29]}
                      radius={radius}
                      pathOptions={{ fillColor: color, fillOpacity: 0.55, color: color, weight: 2, opacity: 0.9 }}
                    >
                      <LeafletTooltip direction="top" offset={[0, -radius]} permanent={false}>
                        <div style={{ textAlign: "center", lineHeight: "1.4" }}>
                          <strong>{site.name}</strong><br />
                          Category: <strong>{category.label}</strong><br />
                          {site.incidentCount} incident{site.incidentCount !== 1 ? "s" : ""}<br />
                          TRIR: {(Number(site.trir) || 0).toFixed(2)} &nbsp;|&nbsp; LTIFR: {(Number(site.ltifr) || 0).toFixed(2)}
                        </div>
                      </LeafletTooltip>
                      <Popup>
                        <strong>{site.name}</strong><br />
                        Risk Level: <strong style={{ color: category.color }}>{category.level} ({category.label})</strong><br />
                        Incidents: <strong>{site.incidentCount}</strong><br />
                        TRIR: {(Number(site.trir) || 0).toFixed(2)}<br />
                        LTIFR: {(Number(site.ltifr) || 0).toFixed(2)}<br />
                        Status:{" "}
                        <span style={{ color: flagged ? "#dc2626" : "#16a34a", fontWeight: 700 }}>
                          {flagged ? "ACTION REQUIRED" : "COMPLIANT"}
                        </span>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            );
          })()}
        </div>
        {mapSearch && filteredSiteMetrics.length === 0 && (
          <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem", borderTop: "1px solid #f1f5f9" }}>
            No sites match "<strong>{mapSearch}</strong>"
          </div>
        )}
      </div>

      {/* SITE LEADERBOARD (SORTED BY HIGHEST RISK/INCIDENTS FIRST) */}
      <Section title="Site Performance Leaderboard (Highest Incident Volume)">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                <th style={thStyle}>Rank</th>
                <th style={thStyle}>Station</th>
                <th style={thStyle}>Incidents</th>
                <th style={thStyle}>Risk Level</th>
                <th style={thStyle}>TRIR (1.5)</th>
                <th style={thStyle}>LTIFR (0.5)</th>
                <th style={thStyle}>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeaderboard.map((site, index) => {
                const category = getIncidentCategory(site.incidentCount);
                const flagged = isNonCompliant(site.incidentCount, site.trir, site.ltifr);

                return (
                  <tr key={site.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "16px", fontWeight: "800", color: "#94a3b8", fontSize: "0.85rem" }}>
                      #{index + 1}
                    </td>
                    <td style={{ padding: "16px", fontWeight: "700", color: "#0f172a" }}>{site.name}</td>
                    <td style={{ padding: "16px", fontWeight: "800", color: "#1e293b" }}>{site.incidentCount}</td>
                    <td style={{ padding: "16px" }}>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "0.7rem",
                        fontWeight: "800",
                        backgroundColor: category.bg,
                        color: category.color,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: category.color }} />
                        {category.level}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {(Number(site.trir) || 0).toFixed(2)}{" "}
                        {site.trir > 1.5 ? <ArrowUpRight size={14} color="#ef4444" /> : <ArrowDownRight size={14} color="#10b981" />}
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {(Number(site.ltifr) || 0).toFixed(2)}{" "}
                        {site.ltifr > 0.5 ? <ArrowUpRight size={14} color="#ef4444" /> : <ArrowDownRight size={14} color="#10b981" />}
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{
                        padding: "4px 10px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: "800",
                        backgroundColor: flagged ? "#fef2f2" : "#f0fdf4",
                        color: flagged ? "#dc2626" : "#16a34a",
                      }}>
                        {flagged ? "ACTION REQUIRED" : "COMPLIANT"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// --- SUB-COMPONENTS ---
const KPICard = ({ label, value, Icon, color = "#f97316" }) => (
  <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div>
      <div style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: "800", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#1e293b", marginTop: "4px" }}>{value}</div>
    </div>
    <div style={{
      backgroundColor: `${color}15`,
      padding: "12px",
      borderRadius: "12px",
    }}>
      <Icon color={color} size={24} />
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", minWidth: 0, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
    <h3 style={{ fontSize: "1rem", fontWeight: "800", marginBottom: "20px", color: "#1e293b" }}>{title}</h3>
    {children}
  </div>
);

const ProgressBar = ({ label, val, target, max = 1 }) => {
  const numericVal = Number(val) || 0;
  const scaleMax = Math.max(max, numericVal, target);
  const percentage = Math.min((numericVal / scaleMax) * 100, 100);

  const status = getStatusColor(numericVal, target);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", marginBottom: "8px", fontWeight: "600" }}>
        <span style={{ color: "#64748b" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "0.7rem",
            fontWeight: "800",
            backgroundColor: status.bg,
            color: status.color,
          }}>
            {status.label}
          </span>
          <span style={{ color: status.color, fontWeight: "800" }}>
            {numericVal.toFixed(2)} / {target}
          </span>
        </div>
      </div>
      <div style={{ height: "10px", backgroundColor: "#f1f5f9", borderRadius: "5px", overflow: "hidden" }}>
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: status.barColor,
            transition: "width 0.4s ease-in-out, background-color 0.3s ease",
          }}
        />
      </div>
    </div>
  );
};

const thStyle = { padding: "16px", fontSize: "0.75rem", fontWeight: "800", color: "#64748b", textTransform: "uppercase" };
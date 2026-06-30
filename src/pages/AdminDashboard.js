import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  AlertTriangle,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Info,
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

// Bubble radius: min 8px, max 40px, scaled by incident count
const getBubbleRadius = (incidentCount, maxCount) => {
  if (maxCount === 0) return 8;
  return 8 + (incidentCount / maxCount) * 32;
};

// Color: green (0 incidents) → amber → red (high incidents)
const getBubbleColor = (incidentCount, maxCount) => {
  if (maxCount === 0 || incidentCount === 0) return "#10b981";
  const ratio = incidentCount / maxCount;
  if (ratio < 0.4) return "#10b981"; // green
  if (ratio < 0.7) return "#f59e0b"; // amber
  return "#ef4444"; // red
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
      const [mRes, sRes, iRes] = await Promise.all([
        incidentsApi
          .getGlobalMetrics()
          .catch(() => ({ data: { trir: 0, ltifr: 0 } })),
        sitesApi.getAll().catch(() => ({ data: [] })),
        incidentsApi.getAll().catch(() => ({ data: [] })),
      ]);

      const fetchedSites = sRes.data || [];
      const fetchedIncidents = iRes.data || [];

      setMetrics(mRes.data);
      setSites(fetchedSites);
      setIncidents(fetchedIncidents);

      // --- Calculate Site Leaderboard Data ---
      const perSiteData = fetchedSites.map((site) => {
        const siteIncidents = fetchedIncidents.filter(
          (i) => i.site_id === site.id,
        );
        const hours = site.man_hours || 200000;

        const trir = (siteIncidents.length * 200000) / hours;
        const ltiCount = siteIncidents.filter(
          (i) =>
            i.type?.toUpperCase() === "LTI" ||
            i.severity?.toLowerCase() === "critical",
        ).length;
        const ltifr = (ltiCount * 200000) / hours;

        return { ...site, trir, ltifr, incidentCount: siteIncidents.length };
      });
      setSiteMetrics(perSiteData);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fetchData]);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth < 1024;

  const chartData = Object.values(
    incidents.reduce((acc, curr) => {
      const type = curr.type || "Other";
      if (!acc[type]) acc[type] = { name: type, value: 0 };
      acc[type].value += 1;
      return acc;
    }, {}),
  );

  if (loading)
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );

  return (
    <div
      style={{
        padding: isMobile ? "16px" : "32px",
        backgroundColor: "#f1f5f9",
        minHeight: "100vh",
      }}
    >
      {/* --- HEADER --- */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: isMobile ? "1.5rem" : "2rem",
            fontWeight: "900",
            color: "#0f172a",
            margin: 0,
          }}
        >
          Overall SHE Dashboard
        </h1>
        <p style={{ color: "#64748b", fontWeight: "500" }}>
          Glow Petroleum Safety Compliance Oversight
        </p>
      </div>

      {/* --- KPI GRID --- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : isTablet
              ? "1fr 1fr"
              : "repeat(4, 1fr)",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <KPICard
          label="Total Sites"
          value={sites.length}
          Icon={Building2}
          color="#6366f1"
        />
        <KPICard
          label="Active Incidents"
          value={incidents.filter((i) => i.status !== "Resolved").length}
          Icon={AlertTriangle}
          color="#f43f5e"
        />
        <KPICard
          label="TRIR (Avg)"
          value={metrics.trir.toFixed(2)}
          Icon={BarChart2}
          color="#10b981"
          showInfo
        />
        <KPICard
          label="LTIFR (Avg)"
          value={metrics.ltifr.toFixed(2)}
          Icon={Activity}
          color="#a855f7"
          showInfo
        />
      </div>

      {/* --- GLOSSARY / EXPLANATION BOX --- */}
      <div
        style={{
          backgroundColor: "#eff6ff",
          border: "1px solid #dbeafe",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "32px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "24px",
        }}
      >
        <div>
          <h4
            style={{
              margin: "0 0 8px 0",
              fontSize: "0.9rem",
              color: "#1e40af",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Info size={16} /> Understanding TRIR (Target &lt; 1.5)
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "#1e40af",
              lineHeight: "1.5",
            }}
          >
            <strong>Total Recordable Incident Rate:</strong> Represents the
            number of injuries per 100 employees per year. It tracks the
            frequency of safety events.
          </p>
        </div>
        <div
          style={{
            borderLeft: isMobile ? "none" : "1px solid #dbeafe",
            paddingLeft: isMobile ? 0 : "24px",
          }}
        >
          <h4
            style={{
              margin: "0 0 8px 0",
              fontSize: "0.9rem",
              color: "#1e40af",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Info size={16} /> Understanding LTIFR (Target &lt; 0.5)
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "#1e40af",
              lineHeight: "1.5",
            }}
          >
            <strong>Lost Time Injury Frequency Rate:</strong> Measures injuries
            resulting in lost work days per 1 million hours. It tracks the
            severity of safety events.
          </p>
        </div>
      </div>

      {/* --- CHARTS --- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTablet ? "1fr" : "1fr 1.5fr",
          gap: "24px",
          marginBottom: "32px",
        }}
      >
        <Section title="Compliance Status">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              marginTop: "10px",
            }}
          >
            <ProgressBar
              label="Average TRIR"
              val={metrics.trir}
              target={1.5}
              max={3}
            />
            <ProgressBar
              label="Average LTIFR"
              val={metrics.ltifr}
              target={0.5}
              max={1}
            />
          </div>
        </Section>

        <Section title="Incident Distribution">
          <div style={{ width: "100%", minWidth: 0, height: "220px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % 5]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* --- INCIDENT BUBBLE HEATMAP --- */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <span style={{ fontWeight: "800" }}>Incident Heatmap</span>
            <span
              style={{
                marginLeft: "10px",
                fontSize: "0.75rem",
                color: "#94a3b8",
              }}
            >
              Bubble size = incident volume
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            {/* Legend */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "0.72rem",
                color: "#64748b",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#10b981",
                    display: "inline-block",
                  }}
                />{" "}
                Low
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#f59e0b",
                    display: "inline-block",
                  }}
                />{" "}
                Medium
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#ef4444",
                    display: "inline-block",
                  }}
                />{" "}
                High
              </span>
            </div>
            <input
              placeholder="Filter by city..."
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "0.8rem",
              }}
              onChange={(e) => setMapSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ height: "420px" }}>
          {(() => {
            const filteredSiteMetrics = siteMetrics.filter((s) =>
              s.name.toLowerCase().includes(mapSearch.toLowerCase()),
            );
            const maxCount = Math.max(
              ...filteredSiteMetrics.map((s) => s.incidentCount),
              1,
            );
            return (
              <MapContainer
                center={[-19.0154, 29.1549]}
                zoom={6}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                {filteredSiteMetrics.map((site) => {
                  const radius = getBubbleRadius(site.incidentCount, maxCount);
                  const color = getBubbleColor(site.incidentCount, maxCount);
                  return (
                    <CircleMarker
                      key={site.id}
                      center={[site.latitude || -19, site.longitude || 29]}
                      radius={radius}
                      pathOptions={{
                        fillColor: color,
                        fillOpacity: 0.55,
                        color: color,
                        weight: 2,
                        opacity: 0.9,
                      }}
                    >
                      <LeafletTooltip
                        direction="top"
                        offset={[0, -radius]}
                        permanent={false}
                      >
                        <div style={{ textAlign: "center", lineHeight: "1.4" }}>
                          <strong>{site.name}</strong>
                          <br />
                          {site.incidentCount} incident
                          {site.incidentCount !== 1 ? "s" : ""}
                          <br />
                          TRIR: {site.trir.toFixed(2)} &nbsp;|&nbsp; LTIFR:{" "}
                          {site.ltifr.toFixed(2)}
                        </div>
                      </LeafletTooltip>
                      <Popup>
                        <strong>{site.name}</strong>
                        <br />
                        Incidents: <strong>{site.incidentCount}</strong>
                        <br />
                        TRIR: {site.trir.toFixed(2)}
                        <br />
                        LTIFR: {site.ltifr.toFixed(2)}
                        <br />
                        Status:{" "}
                        <span
                          style={{
                            color:
                              site.trir > 1.5 || site.ltifr > 0.5
                                ? "#dc2626"
                                : "#16a34a",
                            fontWeight: 700,
                          }}
                        >
                          {site.trir > 1.5 || site.ltifr > 0.5
                            ? "ACTION REQUIRED"
                            : "COMPLIANT"}
                        </span>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            );
          })()}
        </div>
      </div>

      {/* --- SITE LEADERBOARD --- */}
      <Section title="Site Performance Leaderboard">
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                <th style={thStyle}>Station</th>
                <th style={thStyle}>Incidents</th>
                <th style={thStyle}>TRIR (1.5)</th>
                <th style={thStyle}>LTIFR (0.5)</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {siteMetrics.map((site) => (
                <tr key={site.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td style={{ padding: "16px", fontWeight: "700" }}>
                    {site.name}
                  </td>
                  <td style={{ padding: "16px" }}>{site.incidentCount}</td>
                  <td style={{ padding: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {site.trir.toFixed(2)}{" "}
                      {site.trir > 1.5 ? (
                        <ArrowUpRight size={14} color="#ef4444" />
                      ) : (
                        <ArrowDownRight size={14} color="#10b981" />
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {site.ltifr.toFixed(2)}{" "}
                      {site.ltifr > 0.5 ? (
                        <ArrowUpRight size={14} color="#ef4444" />
                      ) : (
                        <ArrowDownRight size={14} color="#10b981" />
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "0.7rem",
                        fontWeight: "800",
                        backgroundColor:
                          site.trir > 1.5 || site.ltifr > 0.5
                            ? "#fef2f2"
                            : "#f0fdf4",
                        color:
                          site.trir > 1.5 || site.ltifr > 0.5
                            ? "#dc2626"
                            : "#16a34a",
                      }}
                    >
                      {site.trir > 1.5 || site.ltifr > 0.5
                        ? "ACTION REQUIRED"
                        : "COMPLIANT"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

// --- SUB-COMPONENTS ---
const KPICard = ({ label, value, Icon, color }) => (
  <div
    style={{
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "16px",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <div>
      <div
        style={{
          color: "#64748b",
          fontSize: "0.7rem",
          fontWeight: "800",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.5rem",
          fontWeight: "900",
          color: "#1e293b",
          marginTop: "4px",
        }}
      >
        {value}
      </div>
    </div>
    <div
      style={{
        backgroundColor: `${color}15`,
        padding: "12px",
        borderRadius: "12px",
      }}
    >
      <Icon color={color} size={24} />
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div
    style={{
      backgroundColor: "white",
      padding: "24px",
      borderRadius: "16px",
      minWidth: 0,
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    }}
  >
    <h3
      style={{
        fontSize: "1rem",
        fontWeight: "800",
        marginBottom: "20px",
        color: "#1e293b",
      }}
    >
      {title}
    </h3>
    {children}
  </div>
);

const ProgressBar = ({ label, val, target, max }) => (
  <div>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "0.85rem",
        marginBottom: "8px",
        fontWeight: "600",
      }}
    >
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color: val > target ? "#ef4444" : "#10b981" }}>
        {val.toFixed(2)}
      </span>
    </div>
    <div
      style={{
        height: "10px",
        backgroundColor: "#f1f5f9",
        borderRadius: "5px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min((val / max) * 100, 100)}%`,
          height: "100%",
          backgroundColor: val > target ? "#ef4444" : "#10b981",
        }}
      />
    </div>
  </div>
);

const thStyle = {
  padding: "16px",
  fontSize: "0.75rem",
  fontWeight: "800",
  color: "#64748b",
  textTransform: "uppercase",
};

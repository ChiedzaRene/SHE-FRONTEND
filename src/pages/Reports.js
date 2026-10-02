import React, { useState, useEffect, useMemo } from "react";
import { FileText, FileSpreadsheet, TrendingUp, ShieldCheck, ListChecks, Trophy } from "lucide-react";
import { reportsApi, sitesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const REPORT_TYPES = [
  { id: "performance", label: "Monthly SHE performance", icon: TrendingUp, hint: "TRIR, LTIFR, incidents and actions for a month" },
  { id: "compliance", label: "Compliance status", icon: ShieldCheck, hint: "Audits, legal records and training" },
  { id: "incidents", label: "Incident register", icon: ListChecks, hint: "Every incident in a date range" },
  { id: "leaderboard", label: "Site comparison", icon: Trophy, hint: "Ranks all sites on TRIR and LTIFR", teamOnly: true },
];

const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const thisMonth = () => new Date().toISOString().slice(0, 7);
const isoDay = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const daysAgo = (n) => isoDay(new Date(Date.now() - n * 864e5));

const STATUS_BADGE = {
  "Action required": "badge-red",
  "Within limits": "badge-green",
  "No hours data": "badge-amber",
};

// Server errors on blob downloads arrive as a Blob; pull the message out of either shape
const errorMessage = async (err) => {
  let detail = err.response?.data?.detail;
  if (!detail && err.response?.data instanceof Blob) {
    try {
      detail = JSON.parse(await err.response.data.text()).detail;
    } catch {
      /* not JSON */
    }
  }
  return typeof detail === "string" ? detail : "Could not load the report.";
};

export default function Reports() {
  const { user } = useAuth();
  const isManager = user?.role === "site_manager";
  const types = REPORT_TYPES.filter((t) => !(t.teamOnly && isManager));

  const [kind, setKind] = useState("performance");
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState("");
  const [month, setMonth] = useState(lastMonth);
  const [start, setStart] = useState(() => daysAgo(90));
  const [end, setEnd] = useState(() => isoDay(new Date()));
  const [incType, setIncType] = useState("");
  const [severity, setSeverity] = useState("");
  const [period, setPeriod] = useState("12m");

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    if (isManager) return;
    sitesApi.getAll().then((res) => setSites(res.data || [])).catch(() => setSites([]));
  }, [isManager]);

  // Only the filters that apply to the chosen report are sent
  const params = useMemo(() => {
    const p = {};
    if (!isManager && siteId && kind !== "leaderboard") p.site_id = siteId;
    if (kind === "performance" && month) p.month = month;
    if (kind === "incidents") {
      if (start) p.start = start;
      if (end) p.end = end;
      if (incType) p.type = incType;
      if (severity) p.severity = severity;
    }
    if (kind === "leaderboard") p.period = period;
    return p;
  }, [kind, siteId, month, start, end, incType, severity, period, isManager]);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError("");
    reportsApi
      .get(kind, params)
      .then((res) => !stale && setDoc(res.data))
      .catch(async (err) => {
        if (stale) return;
        setDoc(null);
        setError(await errorMessage(err));
      })
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true; // a newer filter change supersedes this request
    };
  }, [kind, params]);

  const download = async (format) => {
    setDownloading(format);
    setError("");
    try {
      await reportsApi.download(kind, params, format);
    } catch (err) {
      setError(await errorMessage(err));
    } finally {
      setDownloading("");
    }
  };

  const renderCell = (value, column) => {
    if (column === "Status" && STATUS_BADGE[value]) {
      return <span className={`badge ${STATUS_BADGE[value]}`}>{value}</span>;
    }
    if (value === "N/A") return <span style={{ color: "#94a3b8" }}>N/A</span>;
    return value;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">View a report here, or download it as a PDF or CSV (opens in Excel)</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-primary" disabled={!doc || !!downloading} onClick={() => download("pdf")}>
            <FileText size={18} /> {downloading === "pdf" ? "Preparing..." : "Download PDF"}
          </button>
          <button className="btn btn-outline" disabled={!doc || !!downloading} onClick={() => download("csv")}>
            <FileSpreadsheet size={18} /> {downloading === "csv" ? "Preparing..." : "Download CSV"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 20 }}>
        {types.map(({ id, label, icon: Icon, hint }) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            aria-pressed={kind === id}
            className="card"
            style={{
              textAlign: "left", padding: 16, cursor: "pointer",
              border: kind === id ? "2px solid #003B8E" : "1px solid #e2e8f0",
              background: kind === id ? "#eff6ff" : "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#0f172a" }}>
              <Icon size={18} color="#003B8E" /> {label}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>{hint}</div>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          {!isManager && kind !== "leaderboard" && (
            <div className="form-group" style={{ margin: 0, minWidth: 200 }}>
              <label className="form-label">Site</label>
              <select className="form-control" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                <option value="">All sites</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {kind === "performance" && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Month</label>
              <input type="month" className="form-control" value={month} max={thisMonth()}
                onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </div>
          )}
          {kind === "incidents" && (
            <>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">From</label>
                <input type="date" className="form-control" value={start} max={end}
                  onChange={(e) => e.target.value && setStart(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">To</label>
                <input type="date" className="form-control" value={end} min={start}
                  onChange={(e) => e.target.value && setEnd(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Type</label>
                <select className="form-control" value={incType} onChange={(e) => setIncType(e.target.value)}>
                  <option value="">All types</option>
                  <option value="injury">Injury</option>
                  <option value="spill">Spill</option>
                  <option value="fire">Fire</option>
                  <option value="environmental">Environmental</option>
                  <option value="near-miss">Near-miss</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Severity</label>
                <select className="form-control" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="">All severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </>
          )}
          {kind === "leaderboard" && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Period</label>
              <select className="form-control" value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="12m">Rolling 12 months</option>
                <option value="ytd">Year to date</option>
              </select>
            </div>
          )}
          {kind === "compliance" && (
            <div style={{ color: "#64748b", fontSize: "0.85rem" }}>Shows the current position as of today.</div>
          )}
        </div>
      </div>

      {error && (
        <div className="card" role="alert" style={{ padding: 16, marginBottom: 16, color: "#991B1B", background: "#FEF2F2" }}>
          {error}
        </div>
      )}

      {loading && !doc && <div className="card" style={{ padding: 24 }}>Loading report...</div>}

      {doc && (
        <div style={{ opacity: loading ? 0.5 : 1, transition: "opacity .15s" }}>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h2 style={{ margin: 0, color: "#003B8E" }}>{doc.title}</h2>
            <div style={{ color: "#475569", marginTop: 4 }}>{doc.subtitle}</div>
            <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: 2 }}>Generated {doc.generated_at}</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 16 }}>
              {doc.kpis.map((k) => (
                <div key={k.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: k.value === "N/A" ? "#94a3b8" : "#003B8E" }}>{k.value}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>

          {doc.tables.map((t) => (
            <div className="card" key={t.title} style={{ marginBottom: 20 }}>
              <div className="card-header"><div className="card-title">{t.title}</div></div>
              {t.rows.length === 0 ? (
                <div style={{ padding: 20, color: "#64748b" }}>No records.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr>{t.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                    <tbody>
                      {t.rows.map((row, i) => (
                        <tr key={i}>{row.map((cell, j) => <td key={j}>{renderCell(cell, t.columns[j])}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {doc.notes.map((n) => (
            <p key={n} style={{ color: "#64748b", fontSize: "0.8rem" }}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

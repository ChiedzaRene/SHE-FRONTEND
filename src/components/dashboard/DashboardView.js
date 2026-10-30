import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Timer,
  Clock,
  Users,
  Building2,
  ArrowUp,
  ArrowDown,
  Minus,
  MapPin,
  Phone,
  UserCircle2,
  Info,
  MessageSquare,
} from "lucide-react";
import { dashboardApi, sitesApi } from "../../api/endpoints";
import { fmtRate, siteStatus, STATUS_STYLE } from "../../utils/rates";
import useSafetyTargets from "../../hooks/useSafetyTargets";
import LoadingScreen from "../LoadingScreen";
import RateCoverageNotice from "../RateCoverageNotice";
import SitesMap from "../SitesMap";
import IncidentsByMonthChart, { typeKey } from "./IncidentsByMonthChart";

export const PERIOD_OPTIONS = [
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "quarter", label: "This quarter" },
  { value: "last_quarter", label: "Last quarter" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "ytd", label: "Year to date" },
  { value: "12m", label: "Last 12 months" },
];
const PERIODS = new Set(PERIOD_OPTIONS.map((p) => p.value));

const fmtNum = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString());
const fmtPct = (n) => (n === null || n === undefined ? "—" : `${Number(n).toFixed(0)}%`);
const fmtDays = (n) => (n === null || n === undefined ? "—" : `${Number(n).toFixed(1)} days`);

// Each measure says which direction is an improvement (null: neither, e.g. hours worked)
const MEASURES = {
  incidents: { label: "Incidents", fmt: fmtNum, better: "down" },
  injuries: { label: "Injuries", fmt: fmtNum, better: "down" },
  lost_time_injuries: { label: "Lost-time injuries", fmt: fmtNum, better: "down" },
  ltifr: { label: "LTIFR", fmt: fmtRate, better: "down", digits: 2 },
  hours_worked: { label: "Hours worked", fmt: fmtNum, better: null },
  workers: { label: "Workers", fmt: fmtNum, better: null },
  actions_total: { label: "Corrective actions raised", fmt: fmtNum, better: null },
  actions_completion_pct: { label: "Corrective actions completed", fmt: fmtPct, better: "up", unit: " pts", digits: 0 },
  avg_days_to_close: { label: "Average days to close an action", fmt: fmtDays, better: "down", unit: " days", digits: 1 },
  talks_rate: { label: "Weekly toolbox talks submitted", fmt: fmtPct, better: "up", unit: " pts", digits: 0 },
};

// "▲ 2 vs Apr – Jun 2026", coloured only when the direction is good or bad, always with an arrow and words
function Change({ field, now, before, previousLabel, compact }) {
  const m = MEASURES[field];
  if (now === null || now === undefined || before === null || before === undefined) {
    return <span className="dash-change neutral">{compact ? "—" : `No figure for ${previousLabel}`}</span>;
  }
  const diff = Number(now) - Number(before);
  const digits = m.digits ?? 0;
  const size = Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  if (Math.abs(diff) < 10 ** -(digits + 1)) {
    return (
      <span className="dash-change neutral">
        <Minus size={13} aria-hidden="true" /> {compact ? "No change" : `Same as ${previousLabel}`}
      </span>
    );
  }
  const up = diff > 0;
  const tone = m.better === null ? "neutral" : (up ? m.better === "up" : m.better === "down") ? "good" : "bad";
  const Arrow = up ? ArrowUp : ArrowDown;
  const word = tone === "good" ? "better" : tone === "bad" ? "worse" : null;
  return (
    <span className={`dash-change ${tone}`}>
      <Arrow size={13} aria-hidden="true" />
      <span>
        {up ? "+" : "−"}{size}{m.unit || ""}
        {compact ? "" : ` vs ${previousLabel}`}
        {word ? <span className="sr-only"> ({word})</span> : null}
      </span>
    </span>
  );
}

function Kpi({ label, value, Icon, color, sub, change }) {
  return (
    <div className="dash-kpi">
      <div className="dash-kpi-top">
        <div className="dash-kpi-label">{label}</div>
        <span className="dash-kpi-icon" style={{ backgroundColor: `${color}15`, color }} aria-hidden="true">
          <Icon size={20} />
        </span>
      </div>
      <div className="dash-kpi-value">{value}</div>
      {sub ? <div className="dash-kpi-sub">{sub}</div> : null}
      {change}
    </div>
  );
}

const Section = ({ title, aside, children }) => (
  <section className="dash-section">
    <div className="dash-section-head">
      <h2>{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

// Shared by the admin and SHE dashboards: filter by site and period, compare with the previous period
export default function DashboardView({ title, subtitle }) {
  const limits = useSafetyTargets();
  const [params, setParams] = useSearchParams();
  const period = PERIODS.has(params.get("period")) ? params.get("period") : "quarter";
  const siteId = params.get("site") || "";
  const region = params.get("region") || "";

  const [sites, setSites] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true); // first load only
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [mapSearch, setMapSearch] = useState("");

  useEffect(() => {
    sitesApi.getAll().then((res) => setSites(res.data || [])).catch(() => setSites([]));
  }, []);

  useEffect(() => {
    let live = true;
    setUpdating(true);
    setError("");
    dashboardApi
      .summary({ period, ...(siteId ? { site_id: siteId } : region ? { region } : {}) })
      .then((res) => live && setData(res.data))
      .catch((err) => {
        if (!live) return;
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Could not load the dashboard figures.");
      })
      .finally(() => {
        if (!live) return;
        setUpdating(false);
        setLoading(false);
      });
    return () => { live = false; };
  }, [period, siteId, region]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "region") next.delete("site"); // a new region starts from all its sites
    setParams(next, { replace: true });
  };
  const siteChoices = sites.filter((s) => !region || s.region === region);

  const cur = data?.current;
  const prev = data?.previous;

  // Map bubbles: the sites' own coordinates with this period's figures
  const mapSites = useMemo(() => {
    const rows = new Map((cur?.sites || []).map((r) => [r.site_id, r]));
    return sites
      .filter((s) => (siteId ? String(s.id) === String(siteId) : !region || s.region === region))
      .map((s) => {
        const r = rows.get(s.id);
        return { ...s, ltifr: r?.ltifr ?? null, incidentCount: r?.incidents ?? 0 };
      });
  }, [sites, cur, siteId, region]);

  // Chart: the previous period's months next to this one's when they follow on, so the bars compare
  const chartMonths = useMemo(() => {
    if (!cur) return [];
    const follows = prev && period !== "ytd";
    return [...(follows ? prev.by_month : []), ...cur.by_month];
  }, [cur, prev, period]);
  const typeCounts = useMemo(() => {
    const out = {};
    chartMonths.forEach((row) =>
      Object.entries(row).forEach(([k, v]) => {
        if (k !== "month") out[typeKey(k)] = (out[typeKey(k)] || 0) + v;
      }),
    );
    return out;
  }, [chartMonths]);

  if (loading) return <LoadingScreen message="Loading dashboard..." />;

  const t = cur?.totals || {};
  const p = prev?.totals || {};
  const prevLabel = prev?.label || "the previous period";
  const selected = siteId ? (cur?.sites || [])[0] : null;
  const change = (field, compact) => (
    <Change field={field} now={t[field]} before={p[field]} previousLabel={prevLabel} compact={compact} />
  );
  const scope = siteId ? "" : " (average of sites)";

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">{title}</h1>
          <p className="dash-subtitle">{subtitle}</p>
        </div>
        <div className="dash-filters" role="group" aria-label="Dashboard filters">
          {(data?.regions || []).length > 0 && (
            <div className="form-group">
              <label className="form-label" htmlFor="dash-region">Region</label>
              <select id="dash-region" className="form-control" value={region} onChange={(e) => setFilter("region", e.target.value)}>
                <option value="">All regions</option>
                {data.regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="dash-site">Site</label>
            <select id="dash-site" className="form-control" value={siteId} onChange={(e) => setFilter("site", e.target.value)}>
              <option value="">{region ? `All sites in ${region}` : "All sites"}</option>
              {siteChoices.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dash-period">Period</label>
            <select id="dash-period" className="form-control" value={period}
              onChange={(e) => setFilter("period", e.target.value === "quarter" ? "" : e.target.value)}>
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" role="alert" style={{ padding: 16, marginBottom: 16, color: "#991B1B" }}>{error}</div>
      )}

      {cur && (
        <>
          <p className="dash-showing" aria-live="polite">
            {updating ? "Updating…" : (
              <>
                Showing <strong>{selected ? selected.name : region ? `sites in ${region}` : "all sites"}</strong> for{" "}
                <strong>{cur.label}</strong>, compared with <strong>{prevLabel}</strong>.
              </>
            )}
          </p>

          <RateCoverageNotice metrics={t} />

          {selected && (
            <section className="dash-site-info" aria-label="Site information">
              <div>
                <div className="dash-kpi-label">Site</div>
                <div className="dash-site-name">{selected.name}</div>
              </div>
              <div className="dash-site-facts">
                <span><MapPin size={15} aria-hidden="true" /> {selected.address || "No address"}</span>
                <span><Phone size={15} aria-hidden="true" /> {selected.contact_number || "No contact number"}</span>
                <span>
                  <UserCircle2 size={15} aria-hidden="true" />{" "}
                  {selected.managers.length ? `Manager: ${selected.managers.join(", ")}` : "No site manager assigned"}
                </span>
                <span><Users size={15} aria-hidden="true" /> {fmtNum(selected.workers)} workers</span>
                <span><Clock size={15} aria-hidden="true" /> {fmtNum(selected.hours_worked)} hours worked</span>
              </div>
            </section>
          )}

          <div className="dash-kpis">
            <Kpi label="Total incidents" value={fmtNum(t.incidents)} Icon={AlertTriangle} color="#dc2626"
              sub={`${fmtNum(t.injuries)} injur${t.injuries === 1 ? "y" : "ies"}`} change={change("incidents")} />
            <Kpi label={`LTIFR${scope}`} value={fmtRate(t.ltifr)} Icon={Activity} color="#7c3aed"
              sub={limits.ltifr_limit != null ? `Target < ${limits.ltifr_limit}` : null} change={change("ltifr")} />
            <Kpi label="Corrective actions completed" value={fmtPct(t.actions_completion_pct)} Icon={CheckCircle2}
              color="#16a34a" sub={`${fmtNum(t.actions_completed)} of ${fmtNum(t.actions_total)} raised in the period`}
              change={change("actions_completion_pct")} />
            <Kpi label="Average days to close" value={fmtDays(t.avg_days_to_close)} Icon={Timer} color="#ea580c"
              sub="From raising an action to resolving it" change={change("avg_days_to_close")} />
            <Kpi label="Hours worked" value={fmtNum(t.hours_worked)} Icon={Clock} color="#0891b2"
              sub={siteId ? "Entered by the site manager" : `${t.sites_with_hours} of ${t.sites} sites reported`}
              change={change("hours_worked")} />
            <Kpi label="Workers" value={fmtNum(t.workers)} Icon={Users} color="#0f766e"
              sub="Latest headcount entered" change={change("workers")} />
            <Kpi label="Weekly toolbox talks" value={fmtPct(t.talks_rate)} Icon={MessageSquare} color="#1d4ed8"
              sub={`${fmtNum(t.talks_done ?? 0)} of ${fmtNum(t.talks_due ?? 0)} weeks submitted`} change={change("talks_rate")} />
            {!siteId && (
              <Kpi label="Sites" value={fmtNum(t.sites)} Icon={Building2} color="#475569"
                sub={`${fmtNum(t.lost_time_injuries)} lost-time injur${t.lost_time_injuries === 1 ? "y" : "ies"}`} />
            )}
          </div>

          <div className="dash-grid">
            <Section title="Incidents by month and type"
              aside={<span className="dash-muted">{period === "ytd" ? cur.label : `${prevLabel} and ${cur.label}`}</span>}>
              <IncidentsByMonthChart months={chartMonths} counts={typeCounts} />
            </Section>

            <Section title={`${cur.label} vs ${prevLabel}`}>
              <div className="table-wrap">
                <table className="dash-compare">
                  <thead>
                    <tr>
                      <th scope="col">Measure</th>
                      <th scope="col">{prevLabel}</th>
                      <th scope="col">{cur.label}</th>
                      <th scope="col">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(MEASURES).map(([field, m]) => (
                      <tr key={field}>
                        <th scope="row">{m.label}</th>
                        <td>{m.fmt(p[field])}</td>
                        <td><strong>{m.fmt(t[field])}</strong></td>
                        <td>{change(field, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>

          <div className="dash-explain">
            <Info size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <p>
              <strong>LTIFR</strong> is injuries with lost work days per 1,000,000 hours worked. Each site's rate uses its own hours, entered by its manager at the end of the month;
              the all-sites figure is the average of the sites' rates. <strong>Days to close</strong> runs from when a
              corrective action is raised to when it is resolved.
            </p>
          </div>

          <section className="dash-section dash-map">
            <div className="dash-section-head">
              <h2>Incident Heatmap <span className="dash-muted">Bubble size = incidents at the site in {cur.label}</span></h2>
              <input className="form-control" style={{ maxWidth: 220 }} placeholder="Find a site..."
                aria-label="Find a site on the map" onChange={(e) => setMapSearch(e.target.value)} />
            </div>
            <div style={{ height: 400 }}>
              <SitesMap sites={mapSites} search={mapSearch} limits={limits} />
            </div>
          </section>

          <Section title="Site performance" aside={<span className="dash-muted">Select a site to see it on its own</span>}>
            <div className="table-wrap">
              <table className="dash-sites">
                <thead>
                  <tr>
                    <th scope="col">Site</th>
                    <th scope="col">Incidents</th>
                    <th scope="col">LTIFR ({limits.ltifr_limit})</th>
                    <th scope="col">Workers</th>
                    <th scope="col">Hours</th>
                    <th scope="col">Actions completed</th>
                    <th scope="col">Avg days to close</th>
                    <th scope="col">Weekly talks</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cur.sites.map((row) => {
                    const st = STATUS_STYLE[siteStatus(row, limits)];
                    return (
                      <tr key={row.site_id}>
                        <td>
                          <button type="button" className="link-button" onClick={() => setFilter("site", siteId ? "" : String(row.site_id))}>
                            {row.name}
                          </button>
                        </td>
                        <td>{row.incidents}</td>
                        <td>{fmtRate(row.ltifr)}</td>
                        <td>{fmtNum(row.workers)}</td>
                        <td>{fmtNum(row.hours_worked)}</td>
                        <td>{row.actions_total ? `${fmtPct(row.actions_completion_pct)} (${row.actions_completed}/${row.actions_total})` : "—"}</td>
                        <td>{fmtDays(row.avg_days_to_close)}</td>
                        <td>{row.talks_due ? `${fmtPct(row.talks_rate)} (${row.talks_done}/${row.talks_due})` : "—"}</td>
                        <td>
                          <span className="dash-status" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

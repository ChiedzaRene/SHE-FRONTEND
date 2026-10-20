import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Save, CheckCircle, Lock } from "lucide-react";
import { incidentsApi, sitesApi, siteHoursApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const toMonthValue = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Default to last month: hours are entered at the end of the month they cover
const defaultMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return toMonthValue(d);
};

const monthLong = (m) =>
  new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

const fmtNumber = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString());

const isWholeNumber = (raw) => /^\d+$/.test(String(raw).trim());

export default function SiteHours() {
  const { user } = useAuth();
  // Site managers enter their own site's figures; admins can correct any site; the SHE team only reads them
  const canEdit = ["site_manager", "admin", "super_admin"].includes(user?.role);
  const isManager = user?.role === "site_manager";

  const [month, setMonth] = useState(defaultMonth);
  const [sites, setSites] = useState([]);
  const [saved, setSaved] = useState({}); // site_id -> { hours_worked, workers, updated_at } stored for the month
  const [draft, setDraft] = useState({}); // site_id -> { hours, workers } being typed
  const [status, setStatus] = useState({}); // site_id -> "saving" | "saved" | error text
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Months that have injuries but no hours yet: those injuries are left out of TRIR/LTIFR until hours are entered
  const [needHours, setNeedHours] = useState([]);
  const refreshNeeds = useCallback(() => {
    incidentsApi
      .getGlobalMetrics()
      .then((res) => setNeedHours(res.data?.months_missing_hours || []))
      .catch(() => setNeedHours([]));
  }, []);
  useEffect(() => { refreshNeeds(); }, [refreshNeeds]);

  // the month whose figures are on screen; until it matches the chosen month the boxes stay locked
  const [shownMonth, setShownMonth] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const year = Number(month.slice(0, 4));
      const [sitesRes, hoursRes] = await Promise.all([
        sitesApi.getAll(),
        siteHoursApi.list({ year }),
      ]);
      const stored = {};
      (hoursRes.data || []).forEach((row) => {
        if (row.period.startsWith(month)) stored[row.site_id] = row;
      });
      setSites(sitesRes.data || []);
      setSaved(stored);
      setDraft({});
      setStatus({});
      setShownMonth(month);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load site hours.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const locked = loading || shownMonth !== month;
  const missing = useMemo(() => sites.filter((s) => saved[s.id] === undefined).length, [sites, saved]);

  const valueOf = (siteId, field) => {
    const typed = draft[siteId]?.[field];
    if (typed !== undefined) return typed;
    const stored = saved[siteId]?.[field === "hours" ? "hours_worked" : "workers"];
    return stored === null || stored === undefined ? "" : String(stored);
  };

  const type = (siteId, field, value) =>
    setDraft((d) => ({ ...d, [siteId]: { ...d[siteId], [field]: value } }));

  const save = async (siteId) => {
    const rawHours = valueOf(siteId, "hours");
    const rawWorkers = valueOf(siteId, "workers");
    const hours = Number(rawHours);
    if (rawHours === "" || !Number.isFinite(hours) || hours < 0) {
      setStatus((s) => ({ ...s, [siteId]: "Enter the hours worked (0 or more)" }));
      return;
    }
    if (rawWorkers !== "" && !isWholeNumber(rawWorkers)) {
      setStatus((s) => ({ ...s, [siteId]: "Enter the number of workers as a whole number" }));
      return;
    }
    setStatus((s) => ({ ...s, [siteId]: "saving" }));
    try {
      const body = { site_id: siteId, month, hours_worked: hours };
      if (rawWorkers !== "") body.workers = Number(rawWorkers);
      const res = await siteHoursApi.save(body);
      setSaved((s) => ({ ...s, [siteId]: res.data }));
      setDraft((d) => {
        const { [siteId]: _drop, ...rest } = d;
        return rest;
      });
      setStatus((s) => ({ ...s, [siteId]: "saved" }));
      refreshNeeds();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setStatus((s) => ({
        ...s,
        [siteId]: typeof detail === "string" ? detail : "Could not save",
      }));
    }
  };

  const statusCell = (siteId) => {
    const st = status[siteId];
    if (st === "saved")
      return (
        <span style={{ color: "#166534", display: "inline-flex", gap: 4, alignItems: "center" }}>
          <CheckCircle size={16} /> Saved
        </span>
      );
    if (st && st !== "saving") return <span style={{ color: "#991B1B" }}>{st}</span>;
    return saved[siteId] !== undefined ? (
      <span className="badge badge-green">Reported</span>
    ) : (
      <span className="badge badge-amber">Missing</span>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hours Worked</h1>
          <p className="page-subtitle">
            {isManager
              ? "At the end of each month, enter the hours worked at your site and how many people work there. "
              : "Monthly hours worked and headcount per site, entered by each site's manager at the end of the month. "}
            The hours are the denominator for TRIR and LTIFR (per 200,000 hours); a site without hours shows N/A on the dashboards.
          </p>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="hours-month">Month</label>
          <input id="hours-month"
            type="month"
            className="form-control"
            value={month}
            max={toMonthValue(new Date())}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </div>
      </div>

      {!canEdit && (
        <div className="card" role="note" style={{ padding: 14, marginBottom: 16, display: "flex", gap: 10, alignItems: "center", color: "#475569" }}>
          <Lock size={16} style={{ flexShrink: 0 }} />
          <span>These figures are entered by the site managers and can't be changed here.</span>
        </div>
      )}

      {needHours.length > 0 && (
        <div className="rate-notice">
          <div>
            <strong>Injuries in these months aren't in TRIR/LTIFR yet</strong> because no hours have been entered for
            them. {canEdit ? "Choose a month to enter its hours:" : "Choose a month to see which sites still need to report:"}{" "}
            {needHours.map((m) => (
              <button key={m} type="button" className="btn btn-sm btn-outline" style={{ margin: "4px 6px 0 0" }}
                onClick={() => setMonth(m)} aria-pressed={month === m}>
                {monthLong(m)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: 16, marginBottom: 16, color: "#991B1B" }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            {loading
              ? "Loading..."
              : missing === 0
                ? isManager ? `Reported for ${monthLong(month)}` : "All sites reported for this month"
                : isManager
                  ? `Hours for ${monthLong(month)} still need to be entered`
                  : `${missing} of ${sites.length} sites still need hours for this month`}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Hours worked</th>
                <th>Workers</th>
                {canEdit && <th></th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => {
                const st = status[site.id];
                return (
                  <tr key={site.id}>
                    <td>{site.name}</td>
                    {canEdit ? (
                      <>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="form-control"
                            style={{ maxWidth: 160 }}
                            value={valueOf(site.id, "hours")}
                            placeholder="e.g. 5200"
                            aria-label={`Hours worked at ${site.name}`}
                            disabled={locked /* the month's figures are still loading: typing now would be wiped */}
                            onChange={(e) => type(site.id, "hours", e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && save(site.id)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="form-control"
                            style={{ maxWidth: 120 }}
                            value={valueOf(site.id, "workers")}
                            placeholder="e.g. 25"
                            aria-label={`Number of workers at ${site.name}`}
                            disabled={locked}
                            onChange={(e) => type(site.id, "workers", e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && save(site.id)}
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-primary"
                            disabled={locked || st === "saving" || draft[site.id] === undefined}
                            onClick={() => save(site.id)}
                            aria-label={`Save hours for ${site.name}`}
                          >
                            <Save size={16} /> Save
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{fmtNumber(saved[site.id]?.hours_worked)}</td>
                        <td>{fmtNumber(saved[site.id]?.workers)}</td>
                      </>
                    )}
                    <td>{statusCell(site.id)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Save, CheckCircle } from "lucide-react";
import { incidentsApi, sitesApi, siteHoursApi } from "../api/endpoints";

const toMonthValue = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Default to last month: that is the month the SHE team is normally reporting on
const defaultMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return toMonthValue(d);
};

export default function SiteHours() {
  const [month, setMonth] = useState(defaultMonth);
  const [sites, setSites] = useState([]);
  const [saved, setSaved] = useState({}); // site_id -> hours already stored for the month
  const [draft, setDraft] = useState({}); // site_id -> text being typed
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
        if (row.period.startsWith(month)) stored[row.site_id] = row.hours_worked;
      });
      setSites(sitesRes.data || []);
      setSaved(stored);
      setDraft({});
      setStatus({});
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load site hours.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const missing = useMemo(() => sites.filter((s) => saved[s.id] === undefined).length, [sites, saved]);

  const save = async (siteId) => {
    const raw = draft[siteId];
    const hours = Number(raw);
    if (raw === undefined || raw === "" || !Number.isFinite(hours) || hours < 0) {
      setStatus((s) => ({ ...s, [siteId]: "Enter a number of hours (0 or more)" }));
      return;
    }
    setStatus((s) => ({ ...s, [siteId]: "saving" }));
    try {
      const res = await siteHoursApi.save({ site_id: siteId, month, hours_worked: hours });
      setSaved((s) => ({ ...s, [siteId]: res.data.hours_worked }));
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hours Worked</h1>
          <p className="page-subtitle">
            Monthly hours worked per site. These are the denominator for TRIR and LTIFR
            (per 200,000 hours); a site without hours shows N/A on the dashboards.
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

      {needHours.length > 0 && (
        <div className="rate-notice">
          <div>
            <strong>Injuries in these months aren't in TRIR/LTIFR yet</strong> because no hours have been entered for
            them. Choose a month to enter its hours:{" "}
            {needHours.map((m) => (
              <button key={m} type="button" className="btn btn-sm btn-outline" style={{ margin: "4px 6px 0 0" }}
                onClick={() => setMonth(m)} aria-pressed={month === m}>
                {new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
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
                ? "All sites reported for this month"
                : `${missing} of ${sites.length} sites still need hours for this month`}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Hours worked</th>
                <th></th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => {
                const stored = saved[site.id];
                const value = draft[site.id] ?? (stored !== undefined ? String(stored) : "");
                const st = status[site.id];
                return (
                  <tr key={site.id}>
                    <td>{site.name}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-control"
                        style={{ maxWidth: 180 }}
                        value={value}
                        placeholder="e.g. 5200"
                        aria-label={`Hours worked at ${site.name}`}
                        onChange={(e) => setDraft((d) => ({ ...d, [site.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && save(site.id)}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        disabled={st === "saving" || draft[site.id] === undefined}
                        onClick={() => save(site.id)}
                        aria-label={`Save hours for ${site.name}`}
                      >
                        <Save size={16} /> Save
                      </button>
                    </td>
                    <td>
                      {st === "saved" ? (
                        <span style={{ color: "#166534", display: "inline-flex", gap: 4, alignItems: "center" }}>
                          <CheckCircle size={16} /> Saved
                        </span>
                      ) : st && st !== "saving" ? (
                        <span style={{ color: "#991B1B" }}>{st}</span>
                      ) : stored !== undefined ? (
                        <span className="badge badge-green">Reported</span>
                      ) : (
                        <span className="badge badge-amber">Missing</span>
                      )}
                    </td>
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

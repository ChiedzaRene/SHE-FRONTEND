import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, ClipboardList, AlertTriangle, X } from "lucide-react";
import { inspectionsApi, sitesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../components/Feedback";
import LoadingScreen from "../components/LoadingScreen";
import { apiError } from "../utils/apiError";

export const STATUS_LABEL = { draft: "Draft", submitted: "Open NCs", closed: "Closed" };
export const NC_STATUS = {
  draft: { label: "Draft", cls: "badge-gray" },
  raised: { label: "With regional office", cls: "badge-amber" },
  assigned: { label: "Corrective action open", cls: "badge-blue" },
  completed: { label: "Awaiting SHE review", cls: "badge-purple" },
  closed: { label: "Closed", cls: "badge-green" },
};
export const fmtDay = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function NewInspection({ sites, onCancel }) {
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [siteId, setSiteId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [inspectors, setInspectors] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async (e) => {
    e.preventDefault();
    if (!siteId) return notify("Choose the site that was inspected.", "error");
    setBusy(true);
    try {
      const res = await inspectionsApi.create({ site_id: Number(siteId), inspection_date: date, inspectors: inspectors.trim() || null });
      navigate(`/inspections/${res.data.id}`);
    } catch (err) {
      notify(apiError(err, "The inspection couldn't be started."), "error");
      setBusy(false);
    }
  };

  return (
    <form className="card tt-pad" onSubmit={start} aria-label="New inspection" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ padding: 0, border: 0, marginBottom: 12 }}>
        <div className="card-title">New inspection report</div>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} aria-label="Close"><X size={16} /></button>
      </div>
      <div className="tt-form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="ni-site">Site inspected</label>
          <select id="ni-site" className="form-control" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">Choose a site</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="ni-date">Date of inspection</label>
          <input id="ni-date" type="date" className="form-control" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group tt-wide">
          <label className="form-label" htmlFor="ni-inspectors">Inspected by</label>
          <input id="ni-inspectors" className="form-control" maxLength={300} value={inspectors}
            onChange={(e) => setInspectors(e.target.value)} placeholder="Names of the SHE officers" />
        </div>
      </div>
      <div className="tt-form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}><Plus size={16} /> {busy ? "Starting…" : "Start report"}</button>
      </div>
    </form>
  );
}

export default function Inspections() {
  const { user } = useAuth();
  const isShe = ["she_team", "admin", "super_admin"].includes(user?.role);
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const region = params.get("region") || "";
  const siteId = params.get("site") || "";
  const [data, setData] = useState(null);
  const [mine, setMine] = useState([]);
  const [sites, setSites] = useState([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    sitesApi.getAll().then((r) => setSites(r.data || [])).catch(() => setSites([]));
    inspectionsApi.myNcs().then((r) => setMine(r.data || [])).catch(() => setMine([]));
  }, []);
  useEffect(() => {
    let live = true;
    inspectionsApi
      .list({ ...(status ? { status } : {}), ...(region ? { region } : {}), ...(siteId ? { site_id: siteId } : {}) })
      .then((r) => live && setData(r.data))
      .catch((err) => live && setError(apiError(err, "Could not load the inspections.")));
    return () => { live = false; };
  }, [status, region, siteId]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "region") next.delete("site");
    setParams(next, { replace: true });
  };
  const siteChoices = useMemo(() => sites.filter((s) => !region || s.region === region), [sites, region]);

  if (!data && !error) return <LoadingScreen message="Loading inspections..." />;

  const waitingLabel = {
    raised: "Acknowledge and assign",
    assigned: "Complete the corrective action",
    completed: "Review and close",
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inspections</h1>
          <p className="page-subtitle">
            Site inspection reports from the SHE department, their non-conformities (NCs) and the corrective actions that close them.
          </p>
        </div>
        {isShe && !starting && (
          <button type="button" className="btn btn-primary" onClick={() => setStarting(true)}><Plus size={16} /> New inspection</button>
        )}
      </div>

      {starting && <NewInspection sites={sites} onCancel={() => setStarting(false)} />}

      {mine.length > 0 && (
        <section className="card tt-pad tt-thisweek open" aria-label="Waiting on you" style={{ marginBottom: 20 }}>
          <h3 className="tt-h3"><AlertTriangle size={16} aria-hidden="true" /> Waiting on you ({mine.length})</h3>
          <ul className="insp-waiting">
            {mine.map((n) => (
              <li key={n.id}>
                <Link to={`/inspections/${n.inspection_id}#nc-${n.id}`}><strong>{n.serial}</strong> {n.title}</Link>
                <span className="tt-muted"> · {n.site_name} · {waitingLabel[n.status]}{n.due_date ? ` · due ${fmtDay(n.due_date)}` : ""}</span>
                {n.overdue && <span className="badge badge-red" style={{ marginLeft: 6 }}>Overdue</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="tt-filters" role="group" aria-label="Inspection filters" style={{ marginBottom: 16 }}>
        {(data?.regions || []).length > 0 && (
          <div className="form-group">
            <label className="form-label" htmlFor="in-region">Region</label>
            <select id="in-region" className="form-control" value={region} onChange={(e) => setFilter("region", e.target.value)}>
              <option value="">All regions</option>
              {data.regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
        {sites.length > 1 && (
          <div className="form-group">
            <label className="form-label" htmlFor="in-site">Site</label>
            <select id="in-site" className="form-control" value={siteId} onChange={(e) => setFilter("site", e.target.value)}>
              <option value="">All sites</option>
              {siteChoices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="in-status">Status</label>
          <select id="in-status" className="form-control" value={status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">All reports</option>
            {isShe && <option value="draft">Drafts</option>}
            <option value="submitted">With open NCs</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {error && <div className="card" role="alert" style={{ padding: 16, color: "#991B1B" }}>{error}</div>}
      {data && (
        <section className="card" aria-label="Inspection reports">
          <div className="card-header"><div className="card-title"><ClipboardList size={16} aria-hidden="true" style={{ verticalAlign: -2 }} /> Inspection reports ({data.inspections.length})</div></div>
          {data.inspections.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Report</th><th>Site</th><th>Date</th><th>NCs</th><th>Status</th></tr></thead>
                <tbody>
                  {data.inspections.map((i) => {
                    const c = i.nc_counts;
                    const open = c.total - c.closed - c.draft;
                    return (
                      <tr key={i.id}>
                        <td><Link to={`/inspections/${i.id}`} className="insp-link">Report No. {i.number}</Link><div className="tt-muted">{i.inspectors}</div></td>
                        <td>{i.site_name}{i.region && <div className="tt-muted">{i.region}</div>}</td>
                        <td>{fmtDay(i.inspection_date)}</td>
                        <td>
                          {c.total === 0 ? <span className="tt-muted">None</span> : (
                            <>
                              {c.total} raised · {c.closed} closed
                              {open > 0 && <div className="tt-muted">{open} open{c.overdue ? `, ${c.overdue} overdue` : ""}</div>}
                            </>
                          )}
                        </td>
                        <td><span className={`badge ${i.status === "closed" ? "badge-green" : i.status === "draft" ? "badge-gray" : "badge-amber"}`}>{STATUS_LABEL[i.status]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="files-empty">No inspection reports yet.</div>}
        </section>
      )}
      {user?.role !== "regional_manager" && (
        <p className="tt-muted" style={{ marginTop: 16 }}>
          Looking for audits recorded before inspection reports? <Link to="/audits">See the earlier audit records</Link>.
        </p>
      )}
    </div>
  );
}

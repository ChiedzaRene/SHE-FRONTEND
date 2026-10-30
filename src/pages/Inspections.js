import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, ClipboardList, AlertTriangle, X } from "lucide-react";
import { inspectionsApi, sitesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../components/Feedback";
import LoadingScreen from "../components/LoadingScreen";
import { apiError } from "../utils/apiError";
import FireInspections from "../components/FireInspections";

export const STATUS_LABEL = { draft: "Draft", submitted: "Open NCs", closed: "Closed" };
export const NC_STATUS = {
  draft: { label: "Draft", cls: "badge-gray" },
  // anything not yet fixed is red; done but not yet checked is amber
  raised: { label: "With regional office (unresolved)", cls: "badge-red" },
  assigned: { label: "Corrective action open (unresolved)", cls: "badge-red" },
  completed: { label: "Awaiting SHE review", cls: "badge-amber" },
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

function NewInspection({ sites, onCancel, initialKind = "she" }) {
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [siteId, setSiteId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [inspectors, setInspectors] = useState("");
  const [kind, setKind] = useState(initialKind);
  const [auditBody, setAuditBody] = useState("");
  const [busy, setBusy] = useState(false);
  const isAudit = kind === "audit";

  const start = async (e) => {
    e.preventDefault();
    if (!siteId) return notify("Choose the site that was inspected.", "error");
    setBusy(true);
    try {
      const res = await inspectionsApi.create({
        site_id: Number(siteId), inspection_date: date, inspectors: inspectors.trim() || null, kind,
        ...(isAudit ? { audit_body: auditBody.trim() || null } : {}),
      });
      navigate(`/inspections/${res.data.id}`);
    } catch (err) {
      notify(apiError(err, "The inspection couldn't be started."), "error");
      setBusy(false);
    }
  };

  return (
    <form className="card tt-pad" onSubmit={start} aria-label="New inspection" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ padding: 0, border: 0, marginBottom: 12 }}>
        <div className="card-title">{isAudit ? "New audit findings report" : "New inspection report"}</div>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} aria-label="Close"><X size={16} /></button>
      </div>
      <div className="tt-form-grid">
        <div className="form-group tt-wide">
          <span className="form-label" id="ni-kind">Report type</span>
          <div className="ca-tabs" role="radiogroup" aria-labelledby="ni-kind">
            {[["she", "SHE inspection"], ["audit", "Audit findings"]].map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className={`ca-tab${kind === k ? " active" : ""}`}
                onClick={() => setKind(k)}>{label}</button>
            ))}
          </div>
          {isAudit && <div className="tt-muted">Record the findings of an audit: the SHE team's own audit, or the findings of an audit team.</div>}
        </div>
        {isAudit && (
          <div className="form-group tt-wide">
            <label className="form-label" htmlFor="ni-body">Audited by</label>
            <input id="ni-body" className="form-control" maxLength={200} value={auditBody}
              onChange={(e) => setAuditBody(e.target.value)} placeholder="SHE team, or the audit team / company" />
          </div>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="ni-site">{isAudit ? "Site audited" : "Site inspected"}</label>
          <select id="ni-site" className="form-control" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">Choose a site</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="ni-date">{isAudit ? "Date of audit" : "Date of inspection"}</label>
          <input id="ni-date" type="date" className="form-control" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group tt-wide">
          <label className="form-label" htmlFor="ni-inspectors">{isAudit ? "Auditors" : "Inspected by"}</label>
          <input id="ni-inspectors" className="form-control" maxLength={300} value={inspectors}
            onChange={(e) => setInspectors(e.target.value)} placeholder={isAudit ? "Names of the auditors" : "Names of the SHE officers"} />
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
  const isShe = ["she_team", "she_officer", "admin", "super_admin"].includes(user?.role);
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const region = params.get("region") || "";
  const siteId = params.get("site") || "";
  // SHE inspection reports, audit findings, or the fire equipment checks the sites send themselves
  const tab = ["she", "audit", "fire"].includes(params.get("tab")) ? params.get("tab") : (user?.role === "site_manager" ? "fire" : "she");
  const openFire = Number(params.get("open")) || null;
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
    if (tab === "fire") return undefined;
    let live = true;
    setData(null);
    inspectionsApi
      .list({ kind: tab, ...(status ? { status } : {}), ...(region ? { region } : {}), ...(siteId ? { site_id: siteId } : {}) })
      .then((r) => live && setData(r.data))
      .catch((err) => live && setError(apiError(err, "Could not load the inspections.")));
    return () => { live = false; };
  }, [status, region, siteId, tab]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "region") next.delete("site");
    if (key === "tab") { next.delete("open"); next.delete("status"); setStarting(false); }
    setParams(next, { replace: true });
  };
  const regions = useMemo(() => [...new Set(sites.map((s) => s.region).filter(Boolean))].sort(), [sites]);
  const siteChoices = useMemo(() => sites.filter((s) => !region || s.region === region), [sites, region]);

  if (tab !== "fire" && !data && !error) return <LoadingScreen message="Loading inspections..." />;

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
            SHE inspection and audit reports, their non-conformities (NCs) and the corrective actions that close them,
            and the fire equipment checks each site sends.
          </p>
        </div>
        {isShe && !starting && tab !== "fire" && (
          <button type="button" className="btn btn-primary" onClick={() => setStarting(true)}>
            <Plus size={16} /> {tab === "audit" ? "New audit report" : "New inspection"}
          </button>
        )}
      </div>

      <div className="ca-tabs" role="tablist" aria-label="Inspection types">
        {[["she", "SHE inspections"], ["audit", "Audit inspections"], ["fire", "Site fire equipment"]].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`ca-tab${tab === k ? " active" : ""}`}
            onClick={() => setFilter("tab", k)}>{label}</button>
        ))}
      </div>

      {starting && tab !== "fire" && <NewInspection key={tab} sites={sites} initialKind={tab} onCancel={() => setStarting(false)} />}

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
        {(data?.regions || regions).length > 1 && (
          <div className="form-group">
            <label className="form-label" htmlFor="in-region">Region</label>
            <select id="in-region" className="form-control" value={region} onChange={(e) => setFilter("region", e.target.value)}>
              <option value="">All regions</option>
              {(data?.regions || regions).map((r) => <option key={r} value={r}>{r}</option>)}
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
        {tab !== "fire" && <div className="form-group">
          <label className="form-label" htmlFor="in-status">Status</label>
          <select id="in-status" className="form-control" value={status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">All reports</option>
            {isShe && <option value="draft">Drafts</option>}
            <option value="submitted">With open NCs</option>
            <option value="closed">Closed</option>
          </select>
        </div>}
      </div>

      {tab === "fire" && (
        <FireInspections user={user} sites={sites} region={region} siteId={siteId} openId={openFire}
          onOpen={(id) => setFilter("open", id ? String(id) : "")} />
      )}

      {tab !== "fire" && error && <div className="card" role="alert" style={{ padding: 16, color: "#991B1B" }}>{error}</div>}
      {tab !== "fire" && data && (
        <section className="card" aria-label={tab === "audit" ? "Audit reports" : "Inspection reports"}>
          <div className="card-header"><div className="card-title"><ClipboardList size={16} aria-hidden="true" style={{ verticalAlign: -2 }} /> {tab === "audit" ? "Audit reports" : "Inspection reports"} ({data.inspections.length})</div></div>
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
                        <td><Link to={`/inspections/${i.id}`} className="insp-link">Report No. {i.number}</Link><div className="tt-muted">{i.kind === "audit" && i.audit_body ? `${i.audit_body}${i.inspectors ? ` · ${i.inspectors}` : ""}` : i.inspectors}</div></td>
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
                        <td><span className={`badge ${i.status === "closed" ? "badge-green" : i.status === "draft" ? "badge-gray" : "badge-red"}`}>{STATUS_LABEL[i.status]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="files-empty">{tab === "audit" ? "No audit reports yet." : "No inspection reports yet."}</div>}
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

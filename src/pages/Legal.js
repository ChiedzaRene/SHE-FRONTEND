import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BadgeCheck, Upload, X, Eye, Download, AlertTriangle } from "lucide-react";
import { licencesApi } from "../api/endpoints";
import { useFeedback } from "../components/Feedback";
import LoadingScreen from "../components/LoadingScreen";
import FileViewer from "../components/FileViewer";
import { apiError } from "../utils/apiError";

export const LICENCE_STATUS = {
  valid: { label: "Valid", cls: "badge-green" },
  due_3_months: { label: "Due within 3 months", cls: "badge-amber" },
  due_1_month: { label: "Due within a month", cls: "badge-orange" },
  expired: { label: "Expired", cls: "badge-red" },
  missing: { label: "Not recorded", cls: "badge-gray" },
};
const fmtDay = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx";
const dueText = (lic) => {
  if (!lic) return "";
  if (lic.days_left < 0) return `Expired ${fmtDay(lic.expiry_date)}`;
  if (lic.days_left === 0) return "Due today";
  return `Due ${fmtDay(lic.expiry_date)} (${lic.days_left} day${lic.days_left === 1 ? "" : "s"})`;
};

function LicenceDialog({ site, cell, canEdit, onClose, onSaved }) {
  const { notify } = useFeedback();
  const current = cell.current;
  const [form, setForm] = useState({ licence_number: "", issue_date: "", expiry_date: "", amount: "", notes: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.expiry_date) return notify("Enter the date the licence expires (when it must be renewed and paid).", "error");
    const data = new FormData();
    data.append("site_id", site.site_id);
    data.append("licence_type", cell.licence_type);
    Object.entries(form).forEach(([k, v]) => { if (String(v).trim()) data.append(k, String(v).trim()); });
    if (file) data.append("file", file);
    setBusy(true);
    try {
      await licencesApi.record(data);
      notify(current ? `${cell.name} renewed` : `${cell.name} recorded`, "success");
      onSaved();
    } catch (err) {
      notify(apiError(err, "The licence couldn't be saved."), "error");
      setBusy(false);
    }
  };
  const download = (lic) => licencesApi.downloadDocument(lic.id, lic.document_name)
    .catch((err) => notify(apiError(err, "The certificate couldn't be downloaded."), "error"));
  const Certificate = ({ lic }) => lic.document_name ? (
    <span className="tt-doc">
      {lic.document_viewable && (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setViewing(lic)} aria-label={`Open ${lic.document_name}`}><Eye size={14} /> Certificate</button>
      )}
      <button type="button" className="btn btn-outline btn-sm" onClick={() => download(lic)} aria-label={`Download ${lic.document_name}`}><Download size={14} /></button>
    </span>
  ) : <span className="tt-muted">No certificate</span>;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal lic-modal" role="dialog" aria-modal="true" aria-label={`${cell.name} at ${site.name}`} onClick={(e) => e.stopPropagation()}>
        {/* which site and licence this is, plainly: easy to mix up when working through many sites */}
        <div className={`lic-banner ${cell.status}`}>
          <div className="lic-banner-text">
            <span className="lic-banner-mode">{canEdit ? "Editing" : "Viewing"}</span>
            <div className="lic-banner-site">{site.name}{site.region && <span> · {site.region}</span>}</div>
            <div className="lic-banner-licence">
              {cell.name} <span className={`badge ${LICENCE_STATUS[cell.status].cls}`}>{LICENCE_STATUS[cell.status].label}</span>
            </div>
            <div className="lic-banner-issuer">Issued by {cell.issuer}</div>
          </div>
          <button type="button" className="btn btn-outline btn-sm lic-banner-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">
          {current ? (
            <dl className="lic-current">
              <div><dt>Status</dt><dd><span className={`badge ${LICENCE_STATUS[cell.status].cls}`}>{LICENCE_STATUS[cell.status].label}</span></dd></div>
              <div><dt>Expires / due</dt><dd>{dueText(current)}</dd></div>
              <div><dt>Licence number</dt><dd>{current.licence_number || "—"}</dd></div>
              <div><dt>Issued</dt><dd>{current.issue_date ? fmtDay(current.issue_date) : "—"}</dd></div>
              <div><dt>Fee</dt><dd>{current.amount != null ? Number(current.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</dd></div>
              <div><dt>Certificate</dt><dd><Certificate lic={current} /></dd></div>
              {current.notes && <div className="lic-wide"><dt>Notes</dt><dd>{current.notes}</dd></div>}
            </dl>
          ) : <p className="tt-muted">This licence hasn't been recorded for {site.name} yet.</p>}

          {canEdit && (
            <form onSubmit={save} aria-label={current ? "Record the renewal" : "Record the licence"} className="lic-form">
              <h4>{current ? "Record the renewal" : "Record the licence"} <span className="lic-form-for">for {site.name}</span></h4>
              <div className="tt-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="lic-expiry">Expiry / payment due date</label>
                  <input id="lic-expiry" type="date" className="form-control" value={form.expiry_date} onChange={set("expiry_date")} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="lic-issue">Issue date</label>
                  <input id="lic-issue" type="date" className="form-control" value={form.issue_date} onChange={set("issue_date")} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="lic-number">Licence number</label>
                  <input id="lic-number" className="form-control" maxLength={100} value={form.licence_number} onChange={set("licence_number")} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="lic-amount">Fee paid</label>
                  <input id="lic-amount" type="number" min="0" step="0.01" className="form-control" value={form.amount} onChange={set("amount")} />
                </div>
                <div className="form-group tt-wide">
                  <label className="form-label" htmlFor="lic-file">Licence certificate (PDF, photo or document)</label>
                  <input id="lic-file" type="file" accept={ACCEPT} className="form-control" onChange={(e) => setFile(e.target.files[0] || null)} />
                </div>
                <div className="form-group tt-wide">
                  <label className="form-label" htmlFor="lic-notes">Notes</label>
                  <textarea id="lic-notes" className="form-control" rows={2} maxLength={2000} value={form.notes} onChange={set("notes")} />
                </div>
              </div>
              <div className="tt-form-actions">
                <button type="submit" className="btn btn-primary" disabled={busy}><Upload size={16} /> {busy ? "Saving…" : current ? "Save renewal" : "Save licence"}</button>
              </div>
            </form>
          )}

          {cell.history.length > 0 && (
            <div className="lic-history">
              <h4>Earlier licences</h4>
              <ul>
                {cell.history.map((h) => (
                  <li key={h.id}>
                    <span>{h.licence_number || "No number"} · expired {fmtDay(h.expiry_date)}{h.recorded_by_name ? ` · recorded by ${h.recorded_by_name}` : ""}</span>
                    <Certificate lic={h} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {viewing && (
        <FileViewer file={{ id: viewing.id, title: `${cell.name} certificate`, filename: viewing.document_name,
          content_type: viewing.document_name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/*", can_download: true }}
          onClose={() => setViewing(null)} onDownload={() => download(viewing)} load={() => licencesApi.document(viewing.id)} />
      )}
    </div>
  );
}

// Worst first: what needs doing now comes before what is fine
const ORDER = ["expired", "due_1_month", "due_3_months", "missing", "valid"];
const SHORT = { expired: "expired", due_1_month: "due this month", due_3_months: "due within 3 months", missing: "not recorded", valid: "valid" };

function SiteLicences({ site, cells, expanded, onToggle, onOpen, openType }) {
  const counts = ORDER.reduce((acc, k) => ({ ...acc, [k]: site.licences.filter((c) => c.status === k).length }), {});
  const total = site.licences.length;
  const problems = ORDER.filter((k) => k !== "valid" && counts[k]);
  const worst = problems[0] || "valid";
  return (
    <li className={`lic-site lic-site-${worst}${openType ? " is-open" : ""}`}>
      <button type="button" className="lic-site-head" aria-expanded={expanded} onClick={onToggle}>
        <span className="lic-site-name">
          <strong>{site.name}</strong>
          {site.region && <span className="tt-muted">{site.region}</span>}
        </span>
        <span className="lic-meter" aria-hidden="true">
          <span style={{ width: `${(100 * counts.valid) / (total || 1)}%` }} />
        </span>
        <span className="lic-site-summary">
          {counts.valid} of {total} valid
          {problems.map((k) => (
            <span key={k} className={`badge ${LICENCE_STATUS[k].cls}`}>{counts[k]} {SHORT[k]}</span>
          ))}
        </span>
        <span className="lic-chevron" aria-hidden="true">{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded && (
        <ul className="lic-items">
          {cells.map((cell) => {
            const st = LICENCE_STATUS[cell.status];
            return (
              <li key={cell.licence_type}>
                <button type="button" className={`lic-item ${cell.status}${openType === cell.licence_type ? " is-open" : ""}`}
                  aria-current={openType === cell.licence_type ? "true" : undefined} onClick={() => onOpen(cell)}
                  aria-label={`${cell.name} at ${site.name}: ${st.label}${cell.current ? `, ${dueText(cell.current)}` : ""}`}>
                  <span className="lic-item-name">{cell.name}<span className="tt-muted">{cell.issuer}</span></span>
                  <span className="lic-item-due">{cell.current ? dueText(cell.current) : "No licence recorded"}</span>
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function LicenceRegister() {
  const [params, setParams] = useSearchParams();
  const region = params.get("region") || "";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null); // { site, cell }
  const [status, setStatus] = useState(""); // show only licences in this state
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({}); // site_id -> true

  const load = useCallback(() => {
    licencesApi.register(region ? { region } : {})
      .then((r) => setData(r.data))
      .catch((err) => setError(apiError(err, "Could not load the licences.")));
  }, [region]);
  useEffect(() => { load(); }, [load]);

  if (!data && !error) return <LoadingScreen message="Loading licences..." />;
  if (error) return <div className="card" role="alert" style={{ padding: 16, color: "#991B1B" }}>{error}</div>;
  const c = data.counts;
  const q = search.trim().toLowerCase();
  const rank = (site) => Math.min(...site.licences.map((x) => ORDER.indexOf(x.status)));
  const shown = data.sites
    .filter((s) => !q || `${s.name} ${s.region || ""}`.toLowerCase().includes(q))
    .map((s) => ({ site: s, cells: status ? s.licences.filter((x) => x.status === status) : s.licences }))
    .filter((r) => r.cells.length)
    .sort((a, b) => rank(a.site) - rank(b.site) || a.site.name.localeCompare(b.site.name));
  // a single site, or a filter that narrows things down, is shown opened
  const isOpen = (id) => expanded[id] ?? (data.sites.length === 1 || Boolean(status));

  return (
    <div className="tt-stack">
      <div className="lic-chips" role="group" aria-label="Show licences that are">
        {ORDER.map((k) => (
          <button key={k} type="button" className={`lic-chip lic-chip-${k}`} aria-pressed={status === k}
            onClick={() => setStatus(status === k ? "" : k)}>
            <span className="lic-chip-count">{c[k]}</span> {LICENCE_STATUS[k].label}
          </button>
        ))}
        {status && <button type="button" className="btn btn-sm btn-outline" onClick={() => setStatus("")}>Show all</button>}
      </div>

      {data.due.length > 0 && !status && (
        <section className="card tt-pad tt-thisweek open" aria-label="Licences due">
          <h3 className="tt-h3"><AlertTriangle size={16} aria-hidden="true" /> Renew and pay soon ({data.due.length})</h3>
          <ul className="lic-due-list">
            {data.due.map((d) => (
              <li key={d.id}>
                <span className={`badge ${LICENCE_STATUS[d.status].cls}`}>{LICENCE_STATUS[d.status].label}</span>
                <span><strong>{d.name}</strong> · {d.site_name}</span>
                <span className="tt-muted">{dueText(d)}</span>
              </li>
            ))}
          </ul>
          <p className="tt-muted" style={{ margin: "8px 0 0" }}>The site and the SHE team are reminded 3 months and 1 month before each licence is due.</p>
        </section>
      )}

      <section className="card lic-card" aria-label="Licence register">
        <div className="card-header lic-head">
          <div className="card-title"><BadgeCheck size={16} aria-hidden="true" style={{ verticalAlign: -2 }} /> Sites
            {status && <span className="tt-muted"> · {LICENCE_STATUS[status].label.toLowerCase()} only</span>}
          </div>
          <div className="tt-filters">
            {data.sites.length > 1 && (
              <input type="search" className="form-control" placeholder="Search sites..." aria-label="Search sites"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            )}
            {data.regions.length > 0 && data.sites.length > 1 && (
              <select className="form-control" aria-label="Region" value={region}
                onChange={(e) => { const n = new URLSearchParams(params); if (e.target.value) n.set("region", e.target.value); else n.delete("region"); setParams(n, { replace: true }); }}>
                <option value="">All regions</option>
                {data.regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>
        </div>
        {shown.length ? (
          <ul className="lic-sites">
            {shown.map(({ site, cells }) => (
              <SiteLicences key={site.site_id} site={site} cells={cells} expanded={isOpen(site.site_id)}
                onToggle={() => setExpanded((e) => ({ ...e, [site.site_id]: !isOpen(site.site_id) }))}
                onOpen={(cell) => setOpen({ site, cell })}
                openType={open?.site.site_id === site.site_id ? open.cell.licence_type : null} />
            ))}
          </ul>
        ) : (
          <div className="files-empty">{status ? `No licences are ${SHORT[status]}.` : "No site matches your search."}</div>
        )}
      </section>

      {open && (
        <LicenceDialog site={open.site} cell={open.cell} canEdit={data.can_edit} onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); load(); }} />
      )}
    </div>
  );
}

export default function Legal() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Licences</h1>
          <p className="page-subtitle">Each site's licences and when they must be renewed and paid. Open a site to see its licences; select one to view, record or renew it.</p>
        </div>
      </div>
      <LicenceRegister />
    </div>
  );
}

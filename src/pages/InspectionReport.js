import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Send, Plus, Trash2, Paperclip, CheckCircle2, RotateCcw, Printer, Pencil, X, Clock, FileText, Eye, Download,
} from "lucide-react";
import { inspectionsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../components/Feedback";
import { useNotifications } from "../context/NotificationsContext";
import LoadingScreen from "../components/LoadingScreen";
import RichTextEditor, { RichText } from "../components/RichTextEditor";
import FileViewer from "../components/FileViewer";
import { apiError } from "../utils/apiError";
import { NC_STATUS, STATUS_LABEL, fmtDay } from "./Inspections";

const SECTIONS = [
  { key: "introduction", title: "Introduction", placeholder: "Why and how the inspection was done" },
  { key: "criteria", title: "Inspection criteria", placeholder: "Standards and procedures inspected against, e.g. ZWS 970:2020" },
  { key: "objectives", title: "Inspection objectives", placeholder: "What the inspection set out to do" },
  { key: "findings_summary", title: "Inspection overall observations", placeholder: "Summary of the findings" },
  { key: "conformities", title: "Positive observations (conformities)", placeholder: "What the site is doing well" },
];
// photos, PDFs and office documents (the server checks the type)
const PROOF_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";
const MAX_EVIDENCE = 5;
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// A proof file: photos show as pictures; PDFs open in the viewer; other documents download
function Proof({ photo, onDelete }) {
  const { notify } = useFeedback();
  const [url, setUrl] = useState(null);
  const [big, setBig] = useState(false);
  const [viewing, setViewing] = useState(false);
  useEffect(() => {
    if (!photo.is_image) return undefined;
    let made = null;
    inspectionsApi.photo(photo.id).then((r) => { made = URL.createObjectURL(r.data); setUrl(made); }).catch(() => {});
    return () => made && URL.revokeObjectURL(made);
  }, [photo.id, photo.is_image]);
  const download = () => inspectionsApi.downloadFile(photo.id, photo.filename)
    .catch((err) => notify(apiError(err, "The file couldn't be downloaded."), "error"));
  const remove = onDelete && (
    <button type="button" className="insp-photo-del" onClick={onDelete} aria-label={`Remove ${photo.filename}`}><X size={14} /></button>
  );
  const caption = photo.kind === "evidence" ? "Proof of the action" : null;

  if (!photo.is_image) {
    return (
      <figure className={`insp-doc ${photo.kind}`}>
        <FileText size={20} aria-hidden="true" />
        <span className="insp-doc-name" title={photo.filename}>{photo.filename}</span>
        {caption && <figcaption>{caption}</figcaption>}
        <span className="insp-doc-actions">
          {photo.viewable && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setViewing(true)} aria-label={`Open ${photo.filename}`}>
              <Eye size={14} /> Open
            </button>
          )}
          <button type="button" className="btn btn-outline btn-sm" onClick={download} aria-label={`Download ${photo.filename}`}>
            <Download size={14} />
          </button>
        </span>
        {remove}
        {viewing && (
          <FileViewer file={{ id: photo.id, title: photo.filename, filename: photo.filename, content_type: photo.content_type, can_download: true }}
            onClose={() => setViewing(false)} onDownload={download} load={() => inspectionsApi.photo(photo.id)} />
        )}
      </figure>
    );
  }
  return (
    <figure className={`insp-photo ${photo.kind}`}>
      {url ? (
        <button type="button" className="insp-photo-btn" onClick={() => setBig(true)} aria-label={`Enlarge ${photo.filename}`}>
          <img src={url} alt={caption ? `${caption}: ${photo.filename}` : photo.filename} />
        </button>
      ) : <div className="insp-photo-wait">Loading…</div>}
      {caption && <figcaption>{caption}</figcaption>}
      {remove}
      {big && url && (
        <div className="modal-overlay viewer-overlay" onClick={() => setBig(false)} role="dialog" aria-label={photo.filename}>
          <img src={url} alt={photo.filename} className="insp-photo-big" />
        </div>
      )}
    </figure>
  );
}

// Lists proof files, with an "add" button while they can still be added
function ProofList({ files, canAdd, label, onAdd, onDelete }) {
  const input = useRef(null);
  return (
    <>
      {files.length > 0 && (
        <div className="insp-photos">
          {files.map((p) => <Proof key={p.id} photo={p} onDelete={onDelete ? () => onDelete(p) : null} />)}
        </div>
      )}
      {canAdd && (
        <>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => input.current?.click()}>
            <Paperclip size={14} /> Add photo or document
          </button>
          <input ref={input} type="file" accept={PROOF_ACCEPT} hidden aria-label={label}
            onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; if (f) onAdd(f); }} />
        </>
      )}
    </>
  );
}

function NcForm({ initial, onSave, onCancel, busyLabel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [details, setDetails] = useState(initial?.details || "");
  const [reference, setReference] = useState(initial?.reference || "");
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSave({ title: title.trim(), details, reference: reference.trim() || null });
    if (!ok) setBusy(false);
  };
  const idp = initial ? `nc-${initial.id}` : "nc-new";
  return (
    <form className="insp-ncform" onSubmit={save} aria-label={initial ? `Edit ${initial.serial}` : "Add a non-conformity"}>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idp}-title`}>Heading</label>
        <input id={`${idp}-title`} className="form-control" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Oil separator" required minLength={2} />
      </div>
      <div className="form-group">
        <span className="form-label" id={`${idp}-details-label`}>Details of the NC or negative observation</span>
        <RichTextEditor id={`${idp}-details`} label="Details of the NC" value={details} onChange={setDetails}
          placeholder="What was found, and why it is a non-conformity" />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idp}-ref`}>Requirement breached</label>
        <input id={`${idp}-ref`} className="form-control" maxLength={500} value={reference} onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. ZWS 970:2020 Clause 17(F)" />
      </div>
      <div className="tt-form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}><Save size={16} /> {busy ? "Saving…" : busyLabel}</button>
      </div>
    </form>
  );
}

function AcknowledgeForm({ nc, inspectionId, onDone }) {
  const { notify } = useFeedback();
  const [people, setPeople] = useState([]);
  const [recommendation, setRecommendation] = useState(nc.recommendation || "");
  const [assignee, setAssignee] = useState(nc.assigned_to ? String(nc.assigned_to) : "");
  const [due, setDue] = useState(nc.due_date || addDays(14));
  const [busy, setBusy] = useState(false);
  useEffect(() => { inspectionsApi.assignees(inspectionId).then((r) => setPeople(r.data || [])).catch(() => setPeople([])); }, [inspectionId]);
  const submit = async (e) => {
    e.preventDefault();
    if (!recommendation.replace(/<[^>]*>/g, "").trim()) return notify("Write the recommended corrective action.", "error");
    if (!assignee) return notify("Choose who will do it.", "error");
    setBusy(true);
    try {
      const res = await inspectionsApi.acknowledge(nc.id, { recommendation, assigned_to: Number(assignee), due_date: due });
      notify(`${nc.serial} acknowledged and assigned`, "success");
      onDone(res.data);
    } catch (err) {
      notify(apiError(err, "The NC couldn't be acknowledged."), "error");
      setBusy(false);
    }
  };
  const groups = ["Site manager", "Regional office", "SHE office"];
  return (
    <form className="insp-step" onSubmit={submit} aria-label={`Acknowledge ${nc.serial}`}>
      <h4>{nc.status === "assigned" ? "Change the corrective action" : "Acknowledge and assign"}</h4>
      <div className="form-group">
        <span className="form-label">Corrective action(s) and recommendations</span>
        <RichTextEditor id={`ack-${nc.id}`} label={`Recommended corrective action for ${nc.serial}`} value={recommendation}
          onChange={setRecommendation} minHeight={80} placeholder="What must be done to close this NC" />
      </div>
      <div className="tt-form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor={`ack-who-${nc.id}`}>By who</label>
          <select id={`ack-who-${nc.id}`} className="form-control" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Choose a person</option>
            {groups.map((g) => {
              const list = people.filter((p) => p.label === g);
              return list.length ? (
                <optgroup key={g} label={g}>{list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
              ) : null;
            })}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`ack-when-${nc.id}`}>By when</label>
          <input id={`ack-when-${nc.id}`} type="date" className="form-control" min={addDays(0)} value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <div className="tt-form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}><Send size={16} /> {busy ? "Saving…" : "Acknowledge and assign"}</button>
      </div>
    </form>
  );
}

function CompleteForm({ nc, onDone }) {
  const { notify } = useFeedback();
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (notes.trim().length < 3) return notify("Say how the corrective action was closed.", "error");
    if (files.length > MAX_EVIDENCE) return notify(`Attach up to ${MAX_EVIDENCE} photos or documents.`, "error");
    setBusy(true);
    try {
      const res = await inspectionsApi.complete(nc.id, notes.trim(), files);
      notify(`${nc.serial} sent to the SHE team for review`, "success");
      onDone(res.data);
    } catch (err) {
      notify(apiError(err, "The corrective action couldn't be submitted."), "error");
      setBusy(false);
    }
  };
  return (
    <form className="insp-step" onSubmit={submit} aria-label={`Complete ${nc.serial}`}>
      <h4>Mark the corrective action completed</h4>
      <div className="form-group">
        <label className="form-label" htmlFor={`done-${nc.id}`}>How was it closed?</label>
        <textarea id={`done-${nc.id}`} className="form-control" rows={3} maxLength={20000} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="What was done, by whom and when" />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor={`done-photo-${nc.id}`}>Proof: photos or documents (optional, up to {MAX_EVIDENCE})</label>
        <input id={`done-photo-${nc.id}`} type="file" multiple className="form-control" accept={PROOF_ACCEPT}
          onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        {files.length > 0 && <small className="share-hint">{files.map((f) => f.name).join(", ")}</small>}
      </div>
      <div className="tt-form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}><CheckCircle2 size={16} /> {busy ? "Sending…" : "Mark as completed"}</button>
      </div>
    </form>
  );
}

function ReviewForm({ nc, onDone }) {
  const { notify } = useFeedback();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (outcome) => {
    if (outcome === "open" && !comment.trim()) return notify("Say what still needs to be done.", "error");
    setBusy(true);
    try {
      const res = await inspectionsApi.review(nc.id, { outcome, comment: comment.trim() || null });
      notify(outcome === "closed" ? `${nc.serial} closed` : `${nc.serial} sent back`, "success");
      onDone(res.data);
    } catch (err) {
      notify(apiError(err, "The review couldn't be saved."), "error");
      setBusy(false);
    }
  };
  return (
    <div className="insp-step" role="group" aria-label={`Review ${nc.serial}`}>
      <h4>Corrective action verification</h4>
      <div className="form-group">
        <label className="form-label" htmlFor={`rev-${nc.id}`}>Comment (needed if it stays open)</label>
        <textarea id={`rev-${nc.id}`} className="form-control" rows={2} maxLength={5000} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <div className="tt-form-actions">
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => send("open")}><RotateCcw size={16} /> Keep open</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => send("closed")}><CheckCircle2 size={16} /> Close NC</button>
      </div>
    </div>
  );
}

function NcCard({ nc, inspectionId, previous, onChange, reload }) {
  const { notify, confirm } = useFeedback();
  const [editing, setEditing] = useState(false);
  const st = NC_STATUS[nc.status] || NC_STATUS.draft;
  const findings = nc.photos.filter((p) => p.kind === "finding");
  const evidence = nc.photos.filter((p) => p.kind === "evidence");

  const call = async (fn, fallback) => {
    try {
      const res = await fn();
      onChange(res.data);
      return true;
    } catch (err) {
      notify(apiError(err, fallback), "error");
      return false;
    }
  };
  const remove = async () => {
    if (await confirm({ title: `Remove ${nc.serial}?`, message: `"${nc.title}" will be removed from the draft.`, confirmLabel: "Remove NC", danger: true })) {
      call(() => inspectionsApi.deleteNc(nc.id), "The NC couldn't be removed.");
    }
  };

  return (
    <article className={`insp-nc ${nc.overdue ? "overdue" : ""}`} id={`nc-${nc.id}`} aria-label={`NC ${nc.serial}`}>
      <div className="insp-nc-serial">
        {previous && <span className="insp-prev">Previous NC</span>}
        <strong>{nc.serial}</strong>
        <span className={`badge ${st.cls}`}>{st.label}</span>
        {nc.overdue && <span className="badge badge-red">Overdue</span>}
      </div>
      <div className="insp-nc-body">
        {editing ? (
          <NcForm initial={nc} busyLabel="Save NC" onCancel={() => setEditing(false)}
            onSave={async (data) => { const ok = await call(() => inspectionsApi.updateNc(nc.id, data), "The NC couldn't be saved."); if (ok) setEditing(false); return ok; }} />
        ) : (
          <>
            <h3 className="insp-nc-title">{nc.title}</h3>
            <RichText html={nc.details} empty="" />
            {nc.reference && <p className="insp-ref">Requirement breached: <strong>{nc.reference}</strong></p>}
            <ProofList files={findings} canAdd={false} label={`Proof for ${nc.serial}`}
              onDelete={nc.can.edit ? (p) => call(() => inspectionsApi.deletePhoto(p.id), "The file couldn't be removed.") : null} />
            {nc.can.edit && (
              <div className="insp-nc-tools">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>
                <ProofList files={[]} canAdd label={`Proof for ${nc.serial}`}
                  onAdd={(f) => call(() => inspectionsApi.addPhoto(nc.id, f), "The file couldn't be added.")} />
                <button type="button" className="btn btn-outline btn-sm files-delete" onClick={remove}><Trash2 size={14} /> Remove</button>
              </div>
            )}
          </>
        )}

        {nc.status !== "draft" && (
          <dl className="insp-ca">
            <div className="insp-ca-wide">
              <dt>Corrective action(s) and recommendations</dt>
              <dd>{nc.recommendation ? <RichText html={nc.recommendation} /> : <span className="tt-muted">Waiting for the regional office</span>}</dd>
            </div>
            <div><dt>By who</dt><dd>{nc.assigned_to_name || "—"}</dd></div>
            <div><dt>By when</dt><dd>{nc.due_date ? fmtDay(nc.due_date) : "—"}</dd></div>
            {nc.acknowledged_by_name && (
              <div className="insp-ca-wide"><dt>Acknowledged</dt><dd>{nc.acknowledged_by_name} on {fmtDay(nc.acknowledged_at)}</dd></div>
            )}
            {nc.completion_notes && (
              <div className="insp-ca-wide">
                <dt>How it was closed</dt>
                <dd>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{nc.completion_notes}</p>
                  <span className="tt-muted">{nc.completed_by_name} on {fmtDay(nc.completed_at)}</span>
                  <ProofList files={evidence} canAdd={false} />
                </dd>
              </div>
            )}
            <div className="insp-ca-wide insp-verify">
              <dt>Corrective action verification</dt>
              <dd>
                <div>Reviewed by: <strong>{nc.reviewed_by_name || "—"}</strong></div>
                <div>Date of review: <strong>{nc.reviewed_at ? fmtDay(nc.reviewed_at) : "—"}</strong></div>
                <div>NC status after review: <strong>{nc.review_outcome === "closed" ? "Closed" : nc.review_outcome === "open" ? "Open" : "—"}</strong></div>
                {nc.review_comment && <div className="tt-muted">“{nc.review_comment}”</div>}
              </dd>
            </div>
          </dl>
        )}

        {nc.can.acknowledge && <AcknowledgeForm nc={nc} inspectionId={inspectionId} onDone={onChange} />}
        {nc.can.complete && <CompleteForm nc={nc} onDone={previous ? reload : onChange} />}
        {nc.can.review && <ReviewForm nc={nc} onDone={previous ? reload : onChange} />}
      </div>
    </article>
  );
}

export default function InspectionReport() {
  const { id } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify, confirm } = useFeedback();
  const [report, setReport] = useState(null);
  const [sections, setSections] = useState({});
  const [dirty, setDirty] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const { items: notes, markRead } = useNotifications();

  const take = useCallback((data) => {
    setReport(data);
    setSections(Object.fromEntries(SECTIONS.map((s) => [s.key, data[s.key] || ""])));
    setDirty(false);
  }, []);
  const load = useCallback(() => {
    inspectionsApi.get(id).then((r) => take(r.data)).catch((err) => setError(apiError(err, "This inspection report couldn't be opened.")));
  }, [id, take]);
  useEffect(() => { load(); }, [load]);
  // opening the report counts as reading its notifications
  useEffect(() => {
    if (!report) return;
    const ids = notes.filter((n) => n.resource === "site_inspections" && n.resource_id === report.id && !n.read_at).map((n) => n.id);
    if (ids.length) markRead({ ids });
  }, [report, notes, markRead]);
  // opening a link to one NC scrolls to it
  useEffect(() => {
    if (report && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [report, hash]);

  if (error) return <div className="card" role="alert" style={{ padding: 20, color: "#991B1B" }}>{error} <Link to="/inspections">Back to inspections</Link></div>;
  if (!report) return <LoadingScreen message="Loading report..." />;

  const editable = report.can.edit;
  // section edits are kept when an NC is changed (the NC calls return the saved sections)
  const takeKeeping = (data) => {
    setReport(data);
    if (!dirty) setSections(Object.fromEntries(SECTIONS.map((s) => [s.key, data[s.key] || ""])));
  };
  const saveSections = async () => {
    try {
      const res = await inspectionsApi.update(report.id, sections);
      take(res.data);
      notify("Report saved", "success");
      return true;
    } catch (err) {
      notify(apiError(err, "The report couldn't be saved."), "error");
      return false;
    }
  };
  const submit = async () => {
    if (dirty && !(await saveSections())) return;
    const n = report.ncs.length;
    const ok = await confirm({
      title: `Submit report No. ${report.number}?`,
      message: n
        ? `The ${n} NC${n === 1 ? "" : "s"} will go to the regional office for ${report.region || "this site's region"} to acknowledge and assign, and the site will see the report. It can't be edited afterwards.`
        : "There are no NCs, so the report will be closed straight away. It can't be edited afterwards.",
      confirmLabel: "Submit report",
    });
    if (!ok) return;
    try {
      const res = await inspectionsApi.submit(report.id);
      take(res.data);
      notify(`Report No. ${report.number} submitted`, "success");
    } catch (err) {
      notify(apiError(err, "The report couldn't be submitted."), "error");
    }
  };
  const removeDraft = async () => {
    if (!(await confirm({ title: "Delete this draft?", message: `Report No. ${report.number} and its NCs will be deleted.`, confirmLabel: "Delete draft", danger: true }))) return;
    try {
      await inspectionsApi.remove(report.id);
      navigate("/inspections");
    } catch (err) {
      notify(apiError(err, "The draft couldn't be deleted."), "error");
    }
  };

  const c = report.nc_counts;
  return (
    <div className="insp-report">
      <div className="insp-topbar no-print">
        <Link to="/inspections" className="btn btn-outline btn-sm"><ArrowLeft size={14} /> All inspections</Link>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}><Printer size={14} /> Print</button>
          {report.can.delete && <button type="button" className="btn btn-outline btn-sm files-delete" onClick={removeDraft}><Trash2 size={14} /> Delete draft</button>}
          {report.can.submit && <button type="button" className="btn btn-primary btn-sm" onClick={submit}><Send size={14} /> Submit to regional office</button>}
        </div>
      </div>

      <header className="insp-cover">
        <div className="insp-cover-dept">SHE Department</div>
        <h1>{report.site_name} site inspection report No. {report.number}</h1>
        <div className="insp-cover-meta">
          <span>Date: <strong>{fmtDay(report.inspection_date)}</strong></span>
          {report.inspectors && <span>Inspected by: <strong>{report.inspectors}</strong></span>}
          {report.region && <span>Region: <strong>{report.region}</strong></span>}
          <span className={`badge ${report.status === "closed" ? "badge-green" : report.status === "draft" ? "badge-gray" : "badge-amber"}`}>{STATUS_LABEL[report.status]}</span>
        </div>
        {report.status !== "draft" && (
          <div className="insp-cover-meta tt-muted">
            <span>{c.total} NC{c.total === 1 ? "" : "s"} raised · {c.closed} closed{c.overdue ? ` · ${c.overdue} overdue` : ""}</span>
            {report.submitted_at && <span>Submitted by {report.submitted_by_name} on {fmtDay(report.submitted_at)}</span>}
          </div>
        )}
      </header>

      {editable && (
        <div className="insp-hint no-print"><Clock size={15} aria-hidden="true" /> Draft: only the SHE team can see it. Use the toolbar for <b>bold</b>, <i>italic</i>, <u>underline</u> and lists.</div>
      )}
      {SECTIONS.map((s) => (
        <section key={s.key} className="insp-section" aria-label={s.title}>
          <h2>{s.title}</h2>
          {editable ? (
            <RichTextEditor id={`sec-${s.key}`} label={s.title} value={sections[s.key]} placeholder={s.placeholder}
              onChange={(v) => { setSections((x) => ({ ...x, [s.key]: v })); setDirty(true); }} />
          ) : <RichText html={report[s.key]} />}
        </section>
      ))}
      {editable && (
        <div className="tt-form-actions no-print" style={{ marginBottom: 24 }}>
          <button type="button" className="btn btn-primary" onClick={saveSections} disabled={!dirty}><Save size={16} /> {dirty ? "Save report" : "Saved"}</button>
        </div>
      )}

      {(editable || report.attachments.length > 0) && (
        <section className="insp-section" aria-label="Supporting documents">
          <h2>Supporting documents</h2>
          <p className="tt-muted">Proof of the inspection: photos of the visit, the signed checklist and other documents.</p>
          <ProofList files={report.attachments} canAdd={editable} label="Supporting document for the report"
            onAdd={async (f) => {
              try { takeKeeping((await inspectionsApi.addReportFile(report.id, f)).data); }
              catch (err) { notify(apiError(err, "The file couldn't be added."), "error"); }
            }}
            onDelete={editable ? async (p) => {
              try { takeKeeping((await inspectionsApi.deletePhoto(p.id)).data); }
              catch (err) { notify(apiError(err, "The file couldn't be removed."), "error"); }
            } : null} />
        </section>
      )}

      {report.previous_ncs.length > 0 && (
        <section className="insp-section" aria-label="Previous NCs">
          <h2>Previous uncleared NCs</h2>
          <p className="tt-muted">Raised in earlier reports at this site and not yet closed.</p>
          {report.previous_ncs.map((nc) => <NcCard key={nc.id} nc={nc} inspectionId={nc.inspection_id} previous onChange={load} reload={load} />)}
        </section>
      )}

      <section className="insp-section" aria-label="Non-conformities">
        <h2>Non-conformities and negative observations ({report.ncs.length})</h2>
        {report.ncs.length === 0 && !adding && <p className="tt-muted">{editable ? "No NCs yet. Add each non-conformity found." : "No non-conformities were raised."}</p>}
        {report.ncs.map((nc) => <NcCard key={nc.id} nc={nc} inspectionId={report.id} onChange={takeKeeping} reload={load} />)}
        {editable && (adding ? (
          <div className="insp-nc"><div className="insp-nc-body" style={{ gridColumn: "1 / -1" }}>
            <NcForm busyLabel="Add NC" onCancel={() => setAdding(false)} onSave={async (data) => {
              try {
                const res = await inspectionsApi.addNc(report.id, data);
                takeKeeping(res.data);
                setAdding(false);
                return true;
              } catch (err) {
                notify(apiError(err, "The NC couldn't be added."), "error");
                return false;
              }
            }} />
          </div></div>
        ) : (
          <button type="button" className="btn btn-outline no-print" onClick={() => setAdding(true)}><Plus size={16} /> Add a non-conformity</button>
        ))}
      </section>
      {user?.role === "site_manager" && report.status !== "draft" && (
        <p className="tt-muted no-print">Mark each corrective action assigned to you as completed once it is done. The SHE team then verifies it.</p>
      )}
    </div>
  );
}

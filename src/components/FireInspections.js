import React, { useEffect, useMemo, useState } from "react";
import { Plus, X, Flame, Paperclip, Download, Eye } from "lucide-react";
import { fireInspectionsApi } from "../api/endpoints";
import { useFeedback } from "./Feedback";
import FileViewer from "./FileViewer";
import RichTextEditor, { RichText } from "./RichTextEditor";
import FilePicker from "./FilePicker";
import { apiError } from "../utils/apiError";

const KIND_LABEL = {
  fortnightly: "Fortnightly fire equipment inspection",
  service_refill: "Fire extinguisher service and refill",
};
const RESULT_LABEL = { C: "C", NC: "NC", NA: "N/A" };
const RESULT_TITLE = { C: "Conforming", NC: "Not conforming", NA: "Not applicable" };

const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayIso = () => isoOf(new Date());
const parse = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtDay = (iso) => (iso ? parse(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
// the same rule as the server: two weeks for the checklist, six months (same day, or the month's last) for a service
export const nextDueOf = (kind, iso) => {
  if (!iso) return "";
  const d = parse(iso);
  if (kind === "fortnightly") return isoOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 14));
  const target = new Date(d.getFullYear(), d.getMonth() + 6, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return isoOf(new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last)));
};

function DueBadge({ due }) {
  if (!due) return <span className="badge badge-gray">None yet</span>;
  if (due.overdue) return <span className="badge badge-red">Overdue · {fmtDay(due.next_due)}</span>;
  if (due.days_left <= 14) return <span className="badge badge-amber">Due {fmtDay(due.next_due)}</span>;
  return <span className="badge badge-green">Next {fmtDay(due.next_due)}</span>;
}

function Checklist({ sections, answers, onAnswer }) {
  return sections.map((s) => (
    <fieldset key={s.section} className="fire-section">
      <legend>{s.section}</legend>
      {s.groups.map((g) => (
        <div key={g.group} className="fire-group">
          {g.group !== s.section && <h4>{g.group}</h4>}
          {g.items.map((item) => {
            const a = answers[item.key] || {};
            return (
              <div key={item.key} className="fire-item" role="group" aria-label={item.text}>
                <span className="fire-item-text">{item.text}</span>
                <span className="fire-results">
                  {["C", "NC", "NA"].map((r) => (
                    <label key={r} className={`fire-result fire-result-${r.toLowerCase()}${a.result === r ? " on" : ""}`} title={RESULT_TITLE[r]}>
                      <input type="radio" name={`fire-${item.key}`} value={r} checked={a.result === r}
                        aria-label={`${RESULT_TITLE[r]}: ${item.text}`}
                        onChange={() => onAnswer(item.key, { ...a, result: r })}
                        // clicking the chosen answer again clears it
                        onClick={() => { if (a.result === r) onAnswer(item.key, {}); }} />
                      {RESULT_LABEL[r]}
                    </label>
                  ))}
                </span>
                {a.result === "NC" && (
                  <input className="form-control fire-comment" maxLength={500} value={a.comment || ""}
                    aria-label={`What is wrong: ${item.text}`} placeholder="What is wrong?"
                    onChange={(e) => onAnswer(item.key, { ...a, comment: e.target.value })} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </fieldset>
  ));
}

function NewFireInspection({ sections, sites, user, onCancel, onSent }) {
  const { notify } = useFeedback();
  const ownSite = user?.role === "site_manager";
  const [kind, setKind] = useState("fortnightly");
  const [siteId, setSiteId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [inspector, setInspector] = useState(user?.full_name || "");
  const [answers, setAnswers] = useState({});
  const [comments, setComments] = useState("");
  const [contractor, setContractor] = useState("");
  const [count, setCount] = useState("");
  const [nextDue, setNextDue] = useState(nextDueOf("fortnightly", todayIso()));
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(() => sections.flatMap((s) => s.groups.flatMap((g) => g.items)), [sections]);
  const answered = items.filter((i) => answers[i.key]?.result).length;
  const ncs = items.filter((i) => answers[i.key]?.result === "NC").length;

  // the next date fills itself in from the inspection date; it can still be changed
  const changeDate = (value) => { setDate(value); setNextDue(nextDueOf(kind, value)); };
  const changeKind = (value) => { setKind(value); setNextDue(nextDueOf(value, date)); setError(""); };
  const allConforming = () => setAnswers(Object.fromEntries(items.map((i) => [i.key, answers[i.key]?.result ? answers[i.key] : { result: "C" }])));

  const send = async (e) => {
    e.preventDefault();
    setError("");
    if (!ownSite && !siteId) return setError("Choose the site that was inspected.");
    if (inspector.trim().length < 2) return setError("Write the name of the person who did the inspection.");
    if (kind === "fortnightly" && answered < items.length) return setError(`Answer every item on the checklist (${items.length - answered} still to answer).`);
    if (kind === "service_refill" && !files.length) return setError("Attach proof of the service and refill (the service certificate, job card or photos of the tags).");
    setBusy(true);
    try {
      const res = await fireInspectionsApi.submit({
        kind, inspection_date: date, inspector_name: inspector.trim(), comments: comments.replace(/<[^>]*>|&nbsp;/g, "").trim() ? comments : "", next_due: nextDue,
        ...(ownSite ? {} : { site_id: siteId }),
        ...(kind === "fortnightly" ? { answers } : { contractor: contractor.trim(), extinguishers: count }),
      }, files);
      notify(`${KIND_LABEL[kind]} sent to the SHE team`, "success");
      onSent(res.data);
    } catch (err) {
      setError(apiError(err, "The inspection couldn't be sent."));
      setBusy(false);
    }
  };

  return (
    <form className="card tt-pad" onSubmit={send} aria-label="New fire equipment inspection" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ padding: 0, border: 0, marginBottom: 12 }}>
        <div className="card-title">New fire equipment inspection</div>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} aria-label="Close"><X size={16} /></button>
      </div>
      <div className="ca-tabs" role="radiogroup" aria-label="Inspection type">
        {Object.entries(KIND_LABEL).map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={`ca-tab${kind === k ? " active" : ""}`}
            onClick={() => changeKind(k)}>{k === "fortnightly" ? "Fortnightly checklist" : "Six-monthly service and refill"}</button>
        ))}
      </div>
      <p className="tt-muted" style={{ marginTop: 0 }}>
        {kind === "fortnightly"
          ? "Fortnightly Fire Equipment Inspection Checklist (GP-SHE/OPR/10/02). Mark each item C (conforming), NC (not conforming) or N/A."
          : "Record the service and refill of the fire extinguishers and attach the contractor's proof. The next one is due six months later; the SHE team is reminded two weeks before."}
      </p>
      <div className="tt-form-grid">
        {!ownSite && (
          <div className="form-group">
            <label className="form-label" htmlFor="fi-site">Site</label>
            <select id="fi-site" className="form-control" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Choose a site</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="fi-date">{kind === "fortnightly" ? "Inspection date" : "Service date"}</label>
          <input id="fi-date" type="date" className="form-control" max={todayIso()} value={date} onChange={(e) => changeDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="fi-next">Next due</label>
          <input id="fi-next" type="date" className="form-control" min={date} value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="fi-inspector">Inspector's name</label>
          <input id="fi-inspector" className="form-control" maxLength={150} value={inspector} onChange={(e) => setInspector(e.target.value)} />
        </div>
        {kind === "service_refill" && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="fi-contractor">Service company</label>
              <input id="fi-contractor" className="form-control" maxLength={200} value={contractor} onChange={(e) => setContractor(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="fi-count">Extinguishers serviced</label>
              <input id="fi-count" type="number" min={0} className="form-control" value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {kind === "fortnightly" && (
        <div className="fire-checklist">
          <div className="fire-progress">
            <span>{answered} of {items.length} answered{ncs ? ` · ${ncs} not conforming` : ""}</span>
            <span className="fire-progress-tools">
              <button type="button" className="btn btn-sm btn-outline" onClick={allConforming}>Mark the rest conforming</button>
              {answered > 0 && (
                <button type="button" className="btn btn-sm inc-clear" onClick={() => setAnswers({})}>Clear answers</button>
              )}
            </span>
          </div>
          <Checklist sections={sections} answers={answers} onAnswer={(key, a) => setAnswers((prev) => ({ ...prev, [key]: a }))} />
        </div>
      )}

      <div className="form-group">
        <span className="form-label" id="fi-comments-label">Comments</span>
        <RichTextEditor id="fi-comments" label="Comments" value={comments} onChange={setComments} minHeight={90}
          placeholder="Anything else about the inspection or the service" />
      </div>
      <div className="form-group">
        <span className="form-label">
          {kind === "service_refill" ? "Evidence (required): certificate, job card or photos" : "Photos or the signed form (optional)"}
        </span>
        <FilePicker id="fi-files" label={kind === "service_refill" ? "Evidence (required)" : "Photos or the signed form"}
          files={files} onChange={setFiles} />
      </div>
      {error && <div role="alert" className="inc-error">{error}</div>}
      <div className="tt-form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : "Send to the SHE team"}</button>
      </div>
    </form>
  );
}

function FireRecord({ id, sections, canAdd, onClose, onChanged }) {
  const { notify } = useFeedback();
  const [rec, setRec] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");
  const [more, setMore] = useState([]);
  const [adding, setAdding] = useState(false);
  const addFiles = async () => {
    setAdding(true);
    let latest = rec;
    try {
      for (const f of more) latest = (await fireInspectionsApi.addFile(id, f)).data;   // eslint-disable-line no-await-in-loop
      setMore([]);
      notify("Files added", "success");
    } catch (err) {
      notify(apiError(err, "A file couldn't be added."), "error");
    } finally {
      setRec(latest);
      setAdding(false);
      onChanged?.();
    }
  };
  useEffect(() => {
    fireInspectionsApi.get(id).then((r) => setRec(r.data)).catch((err) => setError(apiError(err, "Could not load the inspection.")));
  }, [id]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !viewing && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, viewing]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-label="Fire equipment inspection" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{rec ? `${rec.kind_label} · ${rec.site_name}` : "Fire equipment inspection"}</div>
          <button type="button" onClick={onClose} className="btn-icon btn-outline" aria-label="Dismiss"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div role="alert" className="inc-error">{error}</div>}
          {!rec && !error && <p className="tt-muted">Loading…</p>}
          {rec && (
            <>
              <div className="inc-summary">
                <div><strong>Date:</strong> {fmtDay(rec.inspection_date)}</div>
                <div><strong>Inspector:</strong> {rec.inspector_name}</div>
                <div><strong>Next due:</strong> {fmtDay(rec.next_due)}</div>
                {rec.contractor && <div><strong>Service company:</strong> {rec.contractor}</div>}
                {rec.extinguishers != null && <div><strong>Extinguishers serviced:</strong> {rec.extinguishers}</div>}
                <div><strong>Sent by:</strong> {rec.submitted_by_name}</div>
              </div>
              {rec.kind === "fortnightly" && sections.map((s) => (
                <div key={s.section} className="inc-block">
                  <h3>{s.section}</h3>
                  <table className="fire-view">
                    <tbody>
                      {s.groups.flatMap((g) => g.items).map((item) => {
                        const a = rec.answers[item.key] || {};
                        return (
                          <tr key={item.key} className={a.result === "NC" ? "fire-nc" : ""}>
                            <td>{item.text}{a.comment && <div className="tt-muted">{a.comment}</div>}</td>
                            <td><span className={`badge ${a.result === "NC" ? "badge-red" : a.result === "C" ? "badge-green" : "badge-gray"}`}>{RESULT_LABEL[a.result] || "—"}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
              {rec.comments && <div className="inc-block"><h3>Comments</h3><RichText html={rec.comments} /></div>}
              <div className="inc-block">
                <h3>Evidence</h3>
                {rec.files.length ? (
                  <ul className="files-list">
                    {rec.files.map((f) => (
                      <li key={f.id}>
                        <Paperclip size={14} aria-hidden="true" /> {f.filename}{" "}
                        {f.viewable && <button type="button" className="btn btn-sm btn-outline" onClick={() => setViewing(f)} aria-label={`View ${f.filename}`}><Eye size={14} /></button>}{" "}
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => fireInspectionsApi.downloadFile(f.id, f.filename)} aria-label={`Download ${f.filename}`}><Download size={14} /></button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="tt-muted">No files.</p>}
                {canAdd && rec.files.length < 10 && (
                  <div className="fire-add-files">
                    <FilePicker id={`fire-more-${id}`} label="More files for this inspection" files={more} onChange={setMore}
                      max={10 - rec.files.length} />
                    {more.length > 0 && (
                      <button type="button" className="btn btn-primary btn-sm" disabled={adding} onClick={addFiles}>
                        {adding ? "Adding…" : `Add ${more.length} file${more.length > 1 ? "s" : ""}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {viewing && (
        <FileViewer file={{ id: viewing.id, title: viewing.filename, filename: viewing.filename, content_type: viewing.content_type, can_download: true }}
          load={() => fireInspectionsApi.viewFile(viewing.id)} onDownload={() => fireInspectionsApi.downloadFile(viewing.id, viewing.filename)}
          onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

// The fire equipment checks the sites send themselves, and when each site's next one is due.
export default function FireInspections({ user, sites, region, siteId, openId, onOpen }) {
  const canSend = ["site_manager", "she_team", "she_officer", "admin", "super_admin"].includes(user?.role);
  const [sections, setSections] = useState([]);
  const [data, setData] = useState(null);
  const [kind, setKind] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    fireInspectionsApi.checklist().then((r) => setSections(r.data.sections || [])).catch(() => setSections([]));
  }, []);
  useEffect(() => {
    let live = true;
    fireInspectionsApi.list({ ...(region ? { region } : {}), ...(siteId ? { site_id: siteId } : {}), ...(kind ? { kind } : {}) })
      .then((r) => live && setData(r.data))
      .catch((err) => live && setError(apiError(err, "Could not load the fire equipment inspections.")));
    return () => { live = false; };
  }, [region, siteId, kind, reload]);

  return (
    <div>
      {canSend && !starting && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button type="button" className="btn btn-primary" onClick={() => setStarting(true)}><Plus size={16} /> New fire equipment inspection</button>
        </div>
      )}
      {starting && (
        <NewFireInspection sections={sections} sites={sites} user={user} onCancel={() => setStarting(false)}
          onSent={() => { setStarting(false); setReload((n) => n + 1); }} />
      )}
      {error && <div className="card" role="alert" style={{ padding: 16, color: "#991B1B" }}>{error}</div>}
      {data && (
        <>
          <section className="card" aria-label="Fire equipment due dates" style={{ marginBottom: 20 }}>
            <div className="card-header"><div className="card-title"><Flame size={16} aria-hidden="true" style={{ verticalAlign: -2 }} /> When each site's next check is due</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Site</th><th>Fortnightly checklist</th><th>Service and refill</th></tr></thead>
                <tbody>
                  {data.schedule.map((s) => (
                    <tr key={s.site_id}>
                      <td>{s.site_name}{s.region && <div className="tt-muted">{s.region}</div>}</td>
                      <td><DueBadge due={s.fortnightly} />{s.fortnightly && <div className="tt-muted">Last {fmtDay(s.fortnightly.last)}</div>}</td>
                      <td><DueBadge due={s.service_refill} />{s.service_refill && <div className="tt-muted">Last {fmtDay(s.service_refill.last)}</div>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card" aria-label="Fire equipment inspections">
            <div className="card-header">
              <div className="card-title">Inspections sent ({data.inspections.length})</div>
              <select className="form-control" style={{ width: "auto" }} aria-label="Inspection type" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">All types</option>
                <option value="fortnightly">Fortnightly checklist</option>
                <option value="service_refill">Service and refill</option>
              </select>
            </div>
            {data.inspections.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Inspection</th><th>Site</th><th>Date</th><th>Result</th><th>Next due</th></tr></thead>
                  <tbody>
                    {data.inspections.map((i) => (
                      <tr key={i.id}>
                        <td><button type="button" className="link-button insp-link" onClick={() => onOpen(i.id)}>{i.kind_label}</button><div className="tt-muted">{i.inspector_name}</div></td>
                        <td>{i.site_name}</td>
                        <td>{fmtDay(i.inspection_date)}</td>
                        <td>
                          {i.kind === "fortnightly"
                            ? (i.not_conforming ? <span className="badge badge-red">{i.not_conforming} not conforming</span> : <span className="badge badge-green">All conforming</span>)
                            : <span className="tt-muted">{i.file_count} file{i.file_count !== 1 ? "s" : ""}{i.contractor ? ` · ${i.contractor}` : ""}</span>}
                        </td>
                        <td>{fmtDay(i.next_due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="files-empty">No fire equipment inspections sent yet.</div>}
          </section>
        </>
      )}
      {openId && <FireRecord id={openId} sections={sections} canAdd={canSend} onClose={() => onOpen(null)}
        onChanged={() => setReload((n) => n + 1)} />}
    </div>
  );
}

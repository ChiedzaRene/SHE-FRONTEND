import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Upload, CalendarCheck, CalendarX, Clock, Eye, Download, Plus, X, Users, CheckCircle2, AlertTriangle, Lock,
} from "lucide-react";
import { safetyTalksApi, sitesApi, trainingsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { isReadOnly } from "../utils/roles";
import { useFeedback } from "../components/Feedback";
import FileViewer from "../components/FileViewer";
import LoadingScreen from "../components/LoadingScreen";
import useNewItems from "../hooks/useNewItems";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";
const MAX_BYTES = 10 * 1024 * 1024;
const PERIODS = [
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "quarter", label: "This quarter" },
  { value: "6m", label: "Last 6 months" },
  { value: "ytd", label: "Year to date" },
  { value: "12m", label: "Last 12 months" },
];
const TRAINING_SUGGESTIONS = ["Fire fighting", "First aid", "Spill response", "Emergency evacuation", "PPE", "Manual handling"];

// "2026-10-19" -> "Mon 19 Oct 2026" (dates are calendar days, so build them locally, not from UTC)
const day = (iso, opts = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
};
const fmtPct = (n) => (n === null || n === undefined ? "—" : `${Math.round(n)}%`);

const rateTone = (rate) => (rate == null ? "" : rate >= 90 ? "good" : rate >= 70 ? "warn" : "bad");
const nextMonday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
};

// Deadline passed without a talk: one card per site, most missed weeks first
function MissedPanel({ missed }) {
  const bySite = Object.values(
    missed.reduce((acc, m) => {
      if (!acc[m.site_id]) acc[m.site_id] = { ...m, weeks: [] };
      acc[m.site_id].weeks.push(m.week_of);
      return acc;
    }, {}),
  ).sort((a, b) => b.weeks.length - a.weeks.length || a.name.localeCompare(b.name));
  return (
    <section className="tt-panel tt-panel-missed" aria-label="Missed talks">
      <h3 className="tt-panel-head">
        <AlertTriangle size={18} aria-hidden="true" /> Missed
        <span className="tt-panel-count">{bySite.length} site{bySite.length === 1 ? "" : "s"}</span>
      </h3>
      <p className="tt-panel-note">The deadline passed without a talk ({missed.length} week{missed.length === 1 ? "" : "s"} in this period).</p>
      {bySite.length ? (
        <ul className="tt-wanting-list">
          {bySite.map((s) => (
            <li key={s.site_id}>
              <div className="tt-wanting-site">
                <strong>{s.name}</strong>
                <span className="tt-wanting-tag">{s.weeks.length} missed</span>
              </div>
              <div className="tt-muted">{s.managers.join(", ") || "No manager assigned"}{s.region ? ` · ${s.region}` : ""}</div>
              <div className="tt-weeks">{s.weeks.map((w) => <span key={w}>Week of {day(w, { day: "numeric", month: "short" })}</span>)}</div>
            </li>
          ))}
        </ul>
      ) : <div className="tt-panel-empty"><CheckCircle2 size={16} aria-hidden="true" /> No missed talks in this period.</div>}
    </section>
  );
}

// Before the deadline: this week's talk is not in yet
function PendingPanel({ week }) {
  const pending = week?.open ? week.pending : [];
  return (
    <section className="tt-panel tt-panel-pending" aria-label="Still to submit">
      <h3 className="tt-panel-head">
        <Clock size={18} aria-hidden="true" /> Still to submit
        <span className="tt-panel-count">{pending.length} site{pending.length === 1 ? "" : "s"}</span>
      </h3>
      <p className="tt-panel-note">
        {week?.open
          ? <>Week of {day(week.week_of, { day: "numeric", month: "short" })} · closes at the end of <strong>{day(week.deadline, { weekday: "long", day: "numeric", month: "short" })}</strong></>
          : <>No week is open. The next one opens on {nextMonday()}.</>}
      </p>
      {pending.length ? (
        <ul className="tt-wanting-list">
          {pending.map((p) => (
            <li key={p.site_id}>
              <div className="tt-wanting-site"><strong>{p.name}</strong><span className="tt-wanting-tag">Not in yet</span></div>
              <div className="tt-muted">{p.managers.join(", ") || "No manager assigned"}{p.region ? ` · ${p.region}` : ""}</div>
            </li>
          ))}
        </ul>
      ) : week?.open
        ? <div className="tt-panel-empty"><CheckCircle2 size={16} aria-hidden="true" /> Every site has submitted this week's talk.</div>
        : <div className="tt-panel-empty">Nothing waiting until the next week opens.</div>}
    </section>
  );
}
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const errorText = async (err, fallback) => {
  let detail = err?.response?.data?.detail;
  const data = err?.response?.data;
  if (!detail && data instanceof Blob) {
    try {
      detail = JSON.parse(await data.text()).detail;
    } catch (e) {
      // not JSON
    }
  }
  if (Array.isArray(detail)) detail = detail.map((d) => d.msg).join(", ");
  return typeof detail === "string" ? detail : fallback;
};

const timeLeft = (deadline) => {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "closing now";
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `${Math.floor(h / 24)} day${h >= 48 ? "s" : ""} ${h % 24} h left`;
  return h ? `${h} h ${Math.floor((ms % 3600000) / 60000)} min left` : `${Math.ceil(ms / 60000)} min left`;
};

function RateMeter({ rate, done, due, label = "Completion rate" }) {
  return (
    <div className="tt-meter">
      <div className="tt-meter-top">
        <span className="tt-meter-label">{label}</span>
        <span className="tt-meter-value">{fmtPct(rate)}</span>
      </div>
      <div className="tt-meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={rate ?? 0}>
        <div className="tt-meter-fill" style={{ width: `${rate ?? 0}%` }} />
      </div>
      <div className="tt-meter-sub">{due ? `${done} of ${due} weekly talks submitted` : "No talks due yet"}</div>
    </div>
  );
}

function DocButtons({ name, viewable, onOpen, onDownload, title }) {
  return (
    <span className="tt-doc">
      {viewable && (
        <button type="button" className="btn btn-outline btn-sm" onClick={onOpen} aria-label={`Open ${title}`}>
          <Eye size={14} /> Open
        </button>
      )}
      <button type="button" className="btn btn-outline btn-sm" onClick={onDownload} aria-label={`Download ${title}`}
        title={name}>
        <Download size={14} />{viewable ? "" : " Download"}
      </button>
    </span>
  );
}

// ---------------- Site manager: this week's talk ----------------

function TalkForm({ existing, onSaved, onCancel }) {
  const { notify } = useFeedback();
  const [title, setTitle] = useState(existing?.title || "");
  const [attendees, setAttendees] = useState(existing ? String(existing.attendees) : "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Enter the title of the talk.");
    if (!/^\d+$/.test(attendees) || Number(attendees) < 1) return setError("Enter how many people were present.");
    if (!file) return setError("Attach the document for the talk (e.g. the signed attendance register).");
    if (file.size > MAX_BYTES) return setError("The file is too large (the limit is 10 MB).");
    const form = new FormData();
    form.append("title", title.trim());
    form.append("attendees", attendees);
    if (notes.trim()) form.append("notes", notes.trim());
    form.append("file", file);
    setBusy(true);
    try {
      const res = await safetyTalksApi.submit(form);
      notify(existing ? "Talk updated" : "Talk submitted", "success");
      onSaved(res.data);
    } catch (err) {
      setError(await errorText(err, "The talk couldn't be submitted."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="tt-form" onSubmit={submit} aria-label="Submit this week's talk">
      <div className="tt-form-grid">
        <div className="form-group tt-wide">
          <label className="form-label" htmlFor="talk-title">Title of the talk</label>
          <input id="talk-title" className="form-control" maxLength={200} value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Safe refuelling procedures" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="talk-attendees">People present</label>
          <input id="talk-attendees" className="form-control" type="number" min="1" step="1" value={attendees}
            onChange={(e) => setAttendees(e.target.value)} placeholder="e.g. 14" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="talk-file">Document</label>
          <input id="talk-file" className="form-control" type="file" accept={ACCEPT}
            onChange={(e) => setFile(e.target.files[0] || null)} />
          <small className="share-hint">The attendance register or talk notes · up to 10 MB</small>
        </div>
        <div className="form-group tt-wide">
          <label className="form-label" htmlFor="talk-notes">Notes (optional)</label>
          <textarea id="talk-notes" className="form-control" rows={2} maxLength={2000} value={notes}
            onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error && <div className="share-error" role="alert" style={{ margin: "0 0 12px" }}>{error}</div>}
      <div className="tt-form-actions">
        {onCancel && <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Upload size={16} /> {busy ? "Submitting…" : existing ? "Replace talk" : "Submit talk"}
        </button>
      </div>
    </form>
  );
}

function ManagerTalks() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState(null);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(null);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    const [cur, hist] = await Promise.all([
      safetyTalksApi.current().catch(() => ({ data: null })),
      safetyTalksApi.overview({ period: "12m" }).catch(() => ({ data: null })),
    ]);
    setCurrent(cur.data);
    setHistory(hist.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!current) return <LoadingScreen message="Loading talks..." />;
  const talk = current.talk;
  const cum = current.cumulative || {};
  const download = (t) => safetyTalksApi.download(t.id, t.filename).catch(async (err) => notify(await errorText(err, "The file couldn't be downloaded."), "error"));

  return (
    <div className="tt-stack">
      <section className={`card tt-week ${current.open ? (talk ? "done" : "due") : "closed"}`} aria-label="This week's talk">
        <div className="tt-week-head">
          {current.open ? (talk ? <CheckCircle2 size={22} aria-hidden="true" /> : <Clock size={22} aria-hidden="true" />)
            : <Lock size={22} aria-hidden="true" />}
          <div>
            {current.open ? (
              <>
                <h2>{talk ? "This week's talk is in" : "This week's talk is due"}</h2>
                <p>
                  Week of {day(current.week_of)} · submissions close at the end of {day(current.deadline, { weekday: "long", day: "numeric", month: "long" })}
                  {" "}({timeLeft(current.deadline)})
                </p>
              </>
            ) : (
              <>
                <h2>Submissions are closed</h2>
                <p>Talks are given on Monday and can be submitted until the end of Tuesday. The next window opens on {day(current.next_open, { weekday: "long", day: "numeric", month: "long" })}.</p>
              </>
            )}
          </div>
        </div>
        {current.open && talk && !editing && (
          <div className="tt-week-talk">
            <div>
              <strong>{talk.title}</strong>
              <div className="tt-muted">{talk.attendees} present · {talk.filename}{talk.updated_at ? " · updated" : ""}</div>
            </div>
            <div className="tt-week-actions">
              <DocButtons name={talk.filename} viewable={talk.can_view} title={talk.title} onOpen={() => setOpen(talk)}
                onDownload={() => download(talk)} />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Replace</button>
            </div>
          </div>
        )}
        {current.open && (!talk || editing) && (
          <TalkForm existing={editing ? talk : null} onCancel={editing ? () => setEditing(false) : null}
            onSaved={() => { setEditing(false); load(); }} />
        )}
      </section>

      <div className="tt-two">
        <section className="card tt-pad" aria-label="Completion rate">
          <RateMeter rate={cum.rate} done={cum.done || 0} due={cum.due || 0} label="Your completion rate" />
          <p className="tt-muted" style={{ marginTop: 8 }}>Since {day(current.tracking_since)}. The more weeks with a talk, the higher it goes.</p>
        </section>
        <section className="card tt-pad" aria-label="Missed weeks">
          <h3 className="tt-h3">Missed weeks</h3>
          {cum.missed_weeks?.length ? (
            <ul className="tt-chips">{cum.missed_weeks.map((w) => <li key={w}><CalendarX size={13} aria-hidden="true" /> {day(w)}</li>)}</ul>
          ) : <p className="tt-muted">None. Keep it up.</p>}
        </section>
      </div>

      <section className="card" aria-label="Your talks">
        <div className="card-header"><div className="card-title">Your talks (last 12 months)</div></div>
        {history?.talks?.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Week of</th><th>Talk</th><th>People present</th><th>Document</th></tr></thead>
              <tbody>
                {history.talks.map((t) => (
                  <tr key={t.id}>
                    <td>{day(t.week_of)}</td>
                    <td><strong>{t.title}</strong>{t.notes && <div className="tt-muted">{t.notes}</div>}</td>
                    <td>{t.attendees}</td>
                    <td><DocButtons name={t.filename} viewable={t.can_view} title={t.title} onOpen={() => setOpen(t)} onDownload={() => download(t)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="files-empty">No talks submitted yet.</div>}
      </section>

      {open && (
        <FileViewer file={{ ...open, can_download: true }} onClose={() => setOpen(null)} onDownload={download}
          load={() => safetyTalksApi.view(open.id)} />
      )}
    </div>
  );
}

// ---------------- SHE team / admins: every site's submissions ----------------

function TalksTracker() {
  const { notify } = useFeedback();
  const [params, setParams] = useSearchParams();
  const period = PERIODS.some((p) => p.value === params.get("period")) ? params.get("period") : "month";
  const siteId = params.get("site") || "";
  const region = params.get("region") || "";
  const [sites, setSites] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => { sitesApi.getAll().then((r) => setSites(r.data || [])).catch(() => setSites([])); }, []);
  useEffect(() => {
    let live = true;
    setError("");
    safetyTalksApi
      .overview({ period, ...(siteId ? { site_id: siteId } : {}), ...(region ? { region } : {}) })
      .then((r) => live && setData(r.data))
      .catch(async (err) => live && setError(await errorText(err, "Could not load the talks.")));
    return () => { live = false; };
  }, [period, siteId, region]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "region") next.delete("site");
    setParams(next, { replace: true });
  };
  const siteChoices = useMemo(() => sites.filter((s) => !region || s.region === region), [sites, region]);
  const download = (t) => safetyTalksApi.download(t.id, t.filename).catch(async (err) => notify(await errorText(err, "The file couldn't be downloaded."), "error"));

  if (!data && !error) return <LoadingScreen message="Loading talks..." />;
  const t = data?.totals || {};
  const week = data?.this_week;

  return (
    <div className="tt-stack">
      <div className="tt-filters" role="group" aria-label="Talk filters">
        <div className="form-group">
          <label className="form-label" htmlFor="tt-region">Region</label>
          <select id="tt-region" className="form-control" value={region} onChange={(e) => setFilter("region", e.target.value)}>
            <option value="">All regions</option>
            {(data?.regions || []).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tt-site">Site</label>
          <select id="tt-site" className="form-control" value={siteId} onChange={(e) => setFilter("site", e.target.value)}>
            <option value="">All sites</option>
            {siteChoices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tt-period">Period</label>
          <select id="tt-period" className="form-control" value={period}
            onChange={(e) => setFilter("period", e.target.value === "month" ? "" : e.target.value)}>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="card" role="alert" style={{ padding: 16, color: "#991B1B" }}>{error}</div>}
      {data && (
        <>
          <div className="dash-kpis">
            <div className="dash-kpi"><RateMeter rate={t.rate} done={t.done} due={t.due} /></div>
            <div className="dash-kpi">
              <div className="dash-kpi-label">Talks submitted</div>
              <div className="dash-kpi-value">{t.done}</div>
              <div className="dash-kpi-sub">of {t.due} due across {t.sites} site{t.sites === 1 ? "" : "s"}</div>
            </div>
            <div className="dash-kpi">
              <div className="dash-kpi-label">Missed weeks</div>
              <div className="dash-kpi-value">{t.missed}</div>
              <div className="dash-kpi-sub">Windows that closed without a talk</div>
            </div>
            <div className="dash-kpi">
              <div className="dash-kpi-label">People reached</div>
              <div className="dash-kpi-value">{(t.attendees || 0).toLocaleString()}</div>
              <div className="dash-kpi-sub">Attendance across the talks</div>
            </div>
          </div>

          <div className="tt-wanting">
            <MissedPanel missed={data.missed} />
            <PendingPanel week={week} />
          </div>

          <section className="card" aria-label="Completion by site">
            <div className="card-header">
              <div className="card-title">Completion by site</div>
              <span className="tt-muted">Weeks with a talk submitted, of the weeks due · worst first</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Site</th><th>Region</th><th>Site manager</th><th>Talks submitted</th></tr></thead>
                <tbody>
                  {[...data.sites]
                    .sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101) || a.name.localeCompare(b.name))
                    .map((s) => {
                      const missed = s.missed_weeks?.length || 0;
                      return (
                        <tr key={s.site_id} className={missed ? "tt-row-missed" : undefined}>
                          <td><strong>{s.name}</strong></td>
                          <td>{s.region || "—"}</td>
                          <td>{s.managers.join(", ") || "—"}</td>
                          <td>
                            <div className="tt-cellbar">
                              <div className="tt-meter-track"><div className={`tt-meter-fill ${rateTone(s.rate)}`} style={{ width: `${s.rate ?? 0}%` }} /></div>
                              <span>{s.due ? `${s.done} of ${s.due} · ${fmtPct(s.rate)}` : "None due yet"}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" aria-label="Submitted talks">
            <div className="card-header"><div className="card-title">Submitted talks ({data.talks.length})</div></div>
            {data.talks.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Week of</th><th>Site</th><th>Talk</th><th>People present</th><th>Submitted by</th><th>Document</th></tr></thead>
                  <tbody>
                    {data.talks.map((tk) => (
                      <tr key={tk.id}>
                        <td>{day(tk.week_of)}</td>
                        <td>{tk.site_name}{tk.region && <div className="tt-muted">{tk.region}</div>}</td>
                        <td><strong>{tk.title}</strong>{tk.notes && <div className="tt-muted">{tk.notes}</div>}</td>
                        <td>{tk.attendees}</td>
                        <td>{tk.submitted_by_name}</td>
                        <td><DocButtons name={tk.filename} viewable={tk.can_view} title={tk.title} onOpen={() => setOpen(tk)} onDownload={() => download(tk)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="files-empty">No talks submitted in this period.</div>}
          </section>
        </>
      )}
      {open && (
        <FileViewer file={{ ...open, can_download: true }} onClose={() => setOpen(null)} onDownload={download}
          load={() => safetyTalksApi.view(open.id)} />
      )}
    </div>
  );
}

// ---------------- SHE trainings (fire fighting, first aid...) ----------------

function TrainingForm({ sites, onSaved, onCancel }) {
  const { notify } = useFeedback();
  const [f, setF] = useState({ site_id: "", date: todayIso(), training_module: "", trainer_name: "", personnel: "", trained_employees: "", type: "", comments: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!f.site_id) return setError("Choose the site.");
    if (!f.training_module.trim() || !f.trainer_name.trim() || !f.personnel.trim()) return setError("Fill in the training, the trainer and the people trained.");
    if (!/^\d+$/.test(f.trained_employees) || Number(f.trained_employees) < 1) return setError("Enter how many people were trained.");
    if (!file) return setError("Attach the supporting document (e.g. the attendance register or certificates).");
    if (file.size > MAX_BYTES) return setError("The file is too large (the limit is 10 MB).");
    const form = new FormData();
    Object.entries(f).forEach(([k, v]) => { if (String(v).trim()) form.append(k, String(v).trim()); });
    form.append("file", file);
    setBusy(true);
    try {
      const res = await trainingsApi.record(form);
      notify("Training recorded", "success");
      onSaved(res.data);
    } catch (err) {
      setError(await errorText(err, "The training couldn't be recorded."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card tt-pad" onSubmit={submit} aria-label="Record a training">
      <div className="card-header" style={{ padding: 0, border: 0, marginBottom: 12 }}>
        <div className="card-title">Record a training</div>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} aria-label="Close the training form"><X size={16} /></button>
      </div>
      <div className="tt-form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="tr-date">Date</label>
          <input id="tr-date" type="date" className="form-control" max={todayIso()} value={f.date} onChange={set("date")} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tr-site">Site</label>
          <select id="tr-site" className="form-control" value={f.site_id} onChange={set("site_id")}>
            <option value="">Choose a site</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tr-name">Name of training</label>
          <input id="tr-name" className="form-control" list="tr-suggestions" maxLength={200} value={f.training_module}
            onChange={set("training_module")} placeholder="e.g. Fire fighting" />
          <datalist id="tr-suggestions">{TRAINING_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tr-trainer">Trainer</label>
          <input id="tr-trainer" className="form-control" maxLength={150} value={f.trainer_name} onChange={set("trainer_name")} />
        </div>
        <div className="form-group tt-wide">
          <label className="form-label" htmlFor="tr-people">Personnel trained</label>
          <textarea id="tr-people" className="form-control" rows={2} maxLength={2000} value={f.personnel}
            onChange={set("personnel")} placeholder="Names of the people trained, separated by commas" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tr-count">Number trained</label>
          <input id="tr-count" type="number" min="1" step="1" className="form-control" value={f.trained_employees} onChange={set("trained_employees")} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tr-file">Supporting document</label>
          <input id="tr-file" type="file" className="form-control" accept={ACCEPT} onChange={(e) => setFile(e.target.files[0] || null)} />
        </div>
        <div className="form-group tt-wide">
          <label className="form-label" htmlFor="tr-notes">Notes (optional)</label>
          <textarea id="tr-notes" className="form-control" rows={2} maxLength={2000} value={f.comments} onChange={set("comments")} />
        </div>
      </div>
      {error && <div className="share-error" role="alert" style={{ margin: "0 0 12px" }}>{error}</div>}
      <div className="tt-form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}><Upload size={16} /> {busy ? "Saving…" : "Record training"}</button>
      </div>
    </form>
  );
}

function SheTrainings({ canRecord }) {
  const { notify } = useFeedback();
  const newIds = useNewItems("trainings");
  const [trainings, setTrainings] = useState(null);
  const [sites, setSites] = useState([]);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    trainingsApi.getAll().then((r) => setTrainings(r.data || [])).catch(() => setTrainings([]));
  }, []);
  useEffect(() => {
    load();
    sitesApi.getAll().then((r) => setSites(r.data || [])).catch(() => setSites([]));
  }, [load]);
  const siteName = (id) => sites.find((s) => s.id === id)?.name || "";
  const download = (t) => trainingsApi.downloadDocument(t.id, t.document_name).catch(async (err) => notify(await errorText(err, "The file couldn't be downloaded."), "error"));

  if (!trainings) return <LoadingScreen message="Loading trainings..." />;
  return (
    <div className="tt-stack">
      {canRecord && !adding && (
        <div><button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Record a training</button></div>
      )}
      {adding && <TrainingForm sites={sites} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
      <section className="card" aria-label="Trainings">
        <div className="card-header"><div className="card-title">Trainings ({trainings.length})</div></div>
        {trainings.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Training</th><th>Trainer</th><th>Personnel trained</th><th>Site</th><th>Document</th></tr></thead>
              <tbody>
                {trainings.map((t) => (
                  <tr key={t.id}>
                    <td>{day(t.date)}</td>
                    <td>
                      <strong>{t.training_module}</strong>
                      {newIds.has(t.id) && <span className="badge-new" style={{ marginLeft: 8 }}>NEW</span>}
                      {t.type && <div className="tt-muted">{t.type}</div>}
                    </td>
                    <td>{t.trainer_name || "—"}</td>
                    <td><div><Users size={13} aria-hidden="true" /> {t.trained_employees}</div><div className="tt-muted">{t.personnel}</div></td>
                    <td>{siteName(t.site_id)}</td>
                    <td>
                      {t.has_document ? (
                        <DocButtons name={t.document_name} viewable={t.document_viewable} title={t.training_module}
                          onOpen={() => setOpen(t)} onDownload={() => download(t)} />
                      ) : <span className="tt-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="files-empty">No trainings recorded yet.</div>}
      </section>
      {open && (
        <FileViewer
          file={{ id: open.id, title: open.training_module, filename: open.document_name, content_type: open.document_type, can_download: true }}
          onClose={() => setOpen(null)} onDownload={() => download(open)} load={() => trainingsApi.viewDocument(open.id)} />
      )}
    </div>
  );
}

export default function Trainings() {
  const { user } = useAuth();
  const isManager = user?.role === "site_manager";
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "trainings" ? "trainings" : "talks";
  const choose = (value) => {
    const next = new URLSearchParams(params);
    if (value === "talks") next.delete("tab");
    else next.set("tab", value);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Talks &amp; Training</h1>
          <p className="page-subtitle">
            {isManager
              ? "Give a toolbox talk every Monday and submit it by the end of Tuesday. Trainings given at your site by the SHE team are listed too."
              : "Weekly toolbox talks from every site, and trainings given by the SHE team."}
          </p>
        </div>
      </div>
      <div className="tt-tabs" role="tablist" aria-label="Talks and training">
        <button type="button" role="tab" aria-selected={tab === "talks"} className={tab === "talks" ? "active" : ""} onClick={() => choose("talks")}>
          <CalendarCheck size={16} aria-hidden="true" /> Weekly talks
        </button>
        <button type="button" role="tab" aria-selected={tab === "trainings"} className={tab === "trainings" ? "active" : ""} onClick={() => choose("trainings")}>
          <Users size={16} aria-hidden="true" /> SHE trainings
        </button>
      </div>
      {tab === "talks" ? (isManager ? <ManagerTalks /> : <TalksTracker />) : <SheTrainings canRecord={!isManager && !isReadOnly(user?.role)} />}
    </div>
  );
}

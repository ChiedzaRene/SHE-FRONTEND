import React, { useCallback, useEffect, useState } from "react";
import { apiError } from "../../utils/apiError";
import { Plus, Trash2, Check, Lock } from "lucide-react";
import { actionsApi, incidentsApi } from "../../api/endpoints";
import { Link } from "react-router-dom";
import AddActionForm from "../AddAction";
import RichTextEditor, { RichText } from "../RichTextEditor";
import {
  CONTROLS, REPORT_TYPES, ROOT_CAUSES, STAGES, isFatal, labelOf, stageIndex,
} from "./formOptions";

export const WORKFLOW_ROLES = ["super_admin", "admin", "she_team", "she_officer"];

const day = (value) => (value ? String(value).slice(0, 10) : "");
const at = (status) => stageIndex(status);
const STAGE = Object.fromEntries(STAGES.map(([key], i) => [key, i]));

const detailOf = (err, fallback) => apiError(err, fallback);

export const teamIds = (incident) =>
  (incident.incident_workflow?.team_members || []).map((m) => m.user_id).filter(Boolean);

function Notice({ notice, section }) {
  if (!notice || notice.section !== section) return null;
  return notice.ok
    ? <div role="status" className="inc-saved"><Check size={14} /> {notice.text}</div>
    : <div role="alert" className="inc-error">{notice.text}</div>;
}

function Section({ n, title, who, open, waiting, children }) {
  return (
    <section className={`inc-step${open ? "" : " waiting"}`} aria-label={title}>
      <h4 className="inc-step-title"><span className="inc-step-n">{n}</span> {title} <small>{who}</small></h4>
      {open ? children : <p className="inc-muted"><Lock size={13} /> {waiting}</p>}
    </section>
  );
}

// 1. The SHE team picks the investigation team from the people with accounts
function TeamSection({ incident, canEdit, save, busy }) {
  const status = incident.incident_workflow?.status || "reported";
  const fromRecord = () => {
    const rows = (incident.incident_workflow?.team_members || [])
      .filter((m) => m.user_id).map((m) => ({ user_id: String(m.user_id), job_title: m.job_title || "", date: day(m.date) }));
    return rows.length ? rows : [{ user_id: "", job_title: "", date: new Date().toISOString().slice(0, 10) }];
  };
  const [rows, setRows] = useState(fromRecord);
  const [people, setPeople] = useState([]);
  useEffect(() => { setRows(fromRecord()); }, [incident]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!canEdit) return;
    incidentsApi.investigators().then((res) => setPeople(res.data || [])).catch(() => setPeople([]));
  }, [canEdit]);

  if (!canEdit) {
    const members = incident.incident_workflow?.team_members || [];
    if (!members.length) return <p className="inc-muted">Waiting for the SHE team to assign the investigation team.</p>;
    return (
      <div className="table-wrap">
        <table className="inc-table">
          <thead><tr><th>Name</th><th>Job title</th><th>Date</th></tr></thead>
          <tbody>{members.map((m, i) => <tr key={i}><td>{m.name}</td><td>{m.job_title}</td><td>{day(m.date)}</td></tr>)}</tbody>
        </table>
      </div>
    );
  }

  const setRow = (i, patch) => setRows(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const pick = (i, id) => {
    const person = people.find((p) => String(p.id) === id);
    setRow(i, { user_id: id, job_title: rows[i].job_title || person?.job_title || "" });
  };
  const payload = () => ({
    team_members: rows.filter((r) => r.user_id)
      .map((r) => ({ user_id: Number(r.user_id), job_title: r.job_title.trim() || null, date: r.date || null })),
  });
  const chosen = rows.some((r) => r.user_id);

  return (
    <>
      <div className="table-wrap">
        <table className="inc-table">
          <thead><tr><th>Name</th><th>Job title</th><th>Date</th><th aria-label="Remove" /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <select className="form-control" aria-label={`Team member ${i + 1}`} value={r.user_id} onChange={(e) => pick(i, e.target.value)}>
                    <option value="">Choose a person…</option>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.job_title})</option>)}
                  </select>
                </td>
                <td><input className="form-control" aria-label={`Team member ${i + 1} job title`} maxLength={150} value={r.job_title}
                  onChange={(e) => setRow(i, { job_title: e.target.value })} /></td>
                <td><input className="form-control" type="date" aria-label={`Team member ${i + 1} date`} value={r.date}
                  onChange={(e) => setRow(i, { date: e.target.value })} /></td>
                <td><button type="button" className="btn btn-sm btn-outline" aria-label={`Remove team member ${i + 1}`}
                  onClick={() => setRows(rows.filter((_, n) => n !== i))}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="inc-actions">
        <button type="button" className="btn btn-sm btn-outline" disabled={rows.length >= 20}
          onClick={() => setRows([...rows, { user_id: "", job_title: "", date: new Date().toISOString().slice(0, 10) }])}>
          <Plus size={14} /> Add team member
        </button>
        {status === "reported" ? (
          <button type="button" className="btn btn-primary" disabled={busy || !chosen}
            onClick={() => save("team", { ...payload(), status: "assigned" }, "Investigation team assigned; they have been told")}>
            Assign investigation team
          </button>
        ) : (
          <button type="button" className="btn btn-outline" disabled={busy || !chosen}
            onClick={() => save("team", payload(), "Investigation team saved")}>Save team</button>
        )}
      </div>
    </>
  );
}

// 2. The investigation team logs what it found. The box opens for writing once the investigation is started,
// only for the people on the team, and is fixed once the findings are sent to the SHE team.
function FindingsSection({ incident, canStart, canWrite, save, busy }) {
  const wf = incident.incident_workflow || {};
  const status = wf.status || "reported";
  const [findings, setFindings] = useState(wf.evidence || "");
  useEffect(() => { setFindings(incident.incident_workflow?.evidence || ""); }, [incident]);
  const words = new DOMParser().parseFromString(findings || "", "text/html").body.textContent.trim();
  const payload = () => ({ evidence: findings });

  return (
    <div>
      <span className="form-label" id="inc-findings-label">Investigation findings</span>
      {canWrite ? (
        <RichTextEditor id="inc-findings" label="Investigation findings" value={findings} onChange={setFindings}
          placeholder="What the investigation found: statements taken, what was seen, photos and sketch diagrams (attach files on the Site report tab)." />
      ) : (
        <div className="inc-locked" aria-labelledby="inc-findings-label">
          {wf.evidence ? <RichText html={wf.evidence} /> : (
            <p className="inc-muted">
              <Lock size={13} />{" "}
              {status === "assigned"
                ? "Opens for the investigation team once the investigation is started."
                : "Only the investigation team writes the findings."}
            </p>
          )}
        </div>
      )}
      <div className="inc-actions">
        {status === "assigned" && canStart && (
          <button type="button" className="btn btn-primary" disabled={busy}
            onClick={() => save("findings", { status: "investigating" }, "Investigation started: the findings box is open")}>
            Start investigation
          </button>
        )}
        {canWrite && (
          <>
            <button type="button" className="btn btn-outline" disabled={busy || !words} onClick={() => save("findings", payload(), "Findings saved")}>
              Save findings
            </button>
            <button type="button" className="btn btn-primary" disabled={busy || !words}
              onClick={() => save("findings", { ...payload(), status: "findings_recorded" }, "Findings sent to the SHE team")}>
              Send findings to the SHE team
            </button>
            <small className="inc-muted">Once sent, the findings are fixed.</small>
          </>
        )}
      </div>
    </div>
  );
}

// 3. The SHE team records the root cause, after the findings are in. The causes are the site's, from its report.
function RootCauseSection({ incident, canEdit, save, busy }) {
  const wf = incident.incident_workflow || {};
  const status = wf.status || "reported";
  const causes = (wf.causes?.length ? wf.causes : incident.incident_intake?.site_causes) || [];
  const [rootCause, setRootCause] = useState(wf.root_cause || "");
  useEffect(() => { setRootCause(incident.incident_workflow?.root_cause || ""); }, [incident]);

  return (
    <fieldset disabled={!canEdit || busy} className="inc-plain">
      <div className="form-group">
        <span className="form-label">Incident causes <small className="inc-muted">(from the site's report)</small></span>
        {causes.length ? (
          <ol className="inc-causes">{causes.map((c, i) => <li key={i}>{c}</li>)}</ol>
        ) : <p className="inc-muted">The site gave no causes.</p>}
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="inc-root-cause">Root cause</label>
        <textarea id="inc-root-cause" className="form-control" rows={3} maxLength={10000} value={rootCause}
          onChange={(e) => setRootCause(e.target.value)} />
        {canEdit && (
          <select className="form-control inc-picker" aria-label="Root cause suggestions" value=""
            onChange={(e) => e.target.value && setRootCause(rootCause.trim() ? `${rootCause.trim()}; ${e.target.value}` : e.target.value)}>
            <option value="">Add a possible root cause from the form's list…</option>
            {ROOT_CAUSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      {canEdit && (
        <div className="inc-actions">
          {status === "findings_recorded" ? (
            <button type="button" className="btn btn-primary" disabled={!rootCause.trim()}
              onClick={() => save("root", { root_cause: rootCause.trim(), status: "root_cause_recorded" }, "Root cause recorded")}>
              Record the root cause
            </button>
          ) : (
            <button type="button" className="btn btn-outline" onClick={() => save("root", { root_cause: rootCause.trim() || null }, "Saved")}>Save</button>
          )}
        </div>
      )}
    </fieldset>
  );
}

export const actionClosed = (a) => a.is_successful === "yes" || ["resolved", "closed"].includes((a.status || "").toLowerCase());

// 4. The SHE team assigns the corrective actions, each with its hierarchy of control
function ActionsSection({ incident, canEdit, save, busy, actions, reload }) {
  const status = incident.incident_workflow?.status || "reported";
  const [adding, setAdding] = useState(false);
  const open = (actions || []).filter((a) => !actionClosed(a)).length;

  return (
    <>
      <p className="inc-muted">Hierarchy of control, most effective first: {CONTROLS.map(([, t]) => t.split(" (")[0]).join(" → ")}.</p>
      {actions === null ? <p className="inc-muted">Loading…</p> : actions.length === 0 ? (
        <p className="inc-muted">No corrective actions assigned yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="inc-table" aria-label="Corrective actions">
            <thead><tr><th>Corrective action</th><th>Control</th><th>By whom</th><th>By when</th><th>Status</th></tr></thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: "pre-wrap" }}>{a.action_taken}</td>
                  <td>{a.control ? labelOf(CONTROLS, a.control).split(" (")[0] : "—"}</td>
                  <td>{a.assigned_to}</td>
                  <td>{day(a.due_date)}</td>
                  <td>{actionClosed(a) ? "Closed" : "Open"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status === "actions_assigned" && open > 0 && (
        <p className="inc-muted">
          {open} corrective action{open === 1 ? " is" : "s are"} still open. The investigation is closed once they are closed
          (on the <Link to="/corrective-actions">Corrective Actions</Link> page).
        </p>
      )}
      {canEdit && (adding ? (
        <AddActionForm incident={{ id: incident.id, site_id: incident.site_id, description: incident.description }}
          onCancel={() => setAdding(false)} onSuccess={() => { setAdding(false); reload(); }} />
      ) : (
        <div className="inc-actions">
          <button type="button" className="btn btn-outline" onClick={() => setAdding(true)}><Plus size={14} /> Assign a corrective action</button>
          {status === "root_cause_recorded" && (
            <button type="button" className="btn btn-primary" disabled={busy || !actions?.length}
              onClick={() => save("actions", { status: "actions_assigned" }, "Moved to Actions assigned")}>
              Corrective actions all assigned
            </button>
          )}
        </div>
      ))}
    </>
  );
}

// 5. When the corrective actions are closed, the SHE team logs the lessons learnt, the report type and the comments
function CloseSection({ incident, canEdit, save, busy, user }) {
  const wf = incident.incident_workflow || {};
  const status = wf.status || "reported";
  // only a SHE Officer writes the SHE Officer's comment
  const isOfficer = user?.role === "she_officer";
  const fromRecord = () => ({
    lessons_learned: wf.lessons_learned || "",
    report_dates: wf.report_dates || (wf.report_type ? { [wf.report_type]: "" } : {}),
    report_revised: !!wf.report_revised,
    she_comment: wf.she_comment || "",
  });
  const [draft, setDraft] = useState(fromRecord);
  useEffect(() => { setDraft(fromRecord()); }, [incident]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const toggleReport = (key) => {
    const dates = { ...draft.report_dates };
    if (key in dates) delete dates[key];
    else dates[key] = new Date().toISOString().slice(0, 10);
    set({ report_dates: dates });
  };
  const payload = () => {
    const ticked = REPORT_TYPES.map(([key]) => key).filter((key) => key in draft.report_dates);
    return {
      lessons_learned: draft.lessons_learned.trim() || null,
      report_dates: draft.report_dates,
      report_revised: draft.report_revised,
      // the furthest report ticked is the report this record now is
      report_type: ticked.length ? ticked[ticked.length - 1] : null,
      ...(isOfficer ? { she_comment: draft.she_comment.trim() || null } : {}),
    };
  };

  return (
    <fieldset disabled={!canEdit || busy} className="inc-plain">
      <div className="form-group">
        <label className="form-label" htmlFor="inc-lessons">Lessons learnt</label>
        <textarea id="inc-lessons" className="form-control" rows={3} maxLength={10000} value={draft.lessons_learned}
          onChange={(e) => set({ lessons_learned: e.target.value })} />
      </div>
      <fieldset className="inc-choice">
        <legend className="form-label">Report type (select all that apply)</legend>
        <label className="inc-check">
          <input type="checkbox" checked={draft.report_revised} onChange={(e) => set({ report_revised: e.target.checked })} />
          This is a revised version of a previous report
        </label>
        <div className="inc-report-grid">
          {REPORT_TYPES.map(([key, text]) => (
            <div key={key} className={`inc-report${key in draft.report_dates ? " on" : ""}`}>
              <label className="inc-check">
                <input type="checkbox" checked={key in draft.report_dates} onChange={() => toggleReport(key)} />
                {text}
              </label>
              {key in draft.report_dates && (
                <input type="date" className="form-control" aria-label={`${text} date`} value={draft.report_dates[key] || ""}
                  onChange={(e) => set({ report_dates: { ...draft.report_dates, [key]: e.target.value } })} />
              )}
            </div>
          ))}
        </div>
      </fieldset>
      <div className="form-group">
        <label className="form-label" htmlFor="inc-she-comment">SHE Officer's comment</label>
        <textarea id="inc-she-comment" className="form-control" rows={3} maxLength={10000} value={draft.she_comment}
          readOnly={!isOfficer} aria-describedby={isOfficer ? undefined : "inc-she-comment-who"}
          onChange={(e) => set({ she_comment: e.target.value })} />
        {!isOfficer && <small id="inc-she-comment-who" className="inc-muted">Written by a SHE Officer.</small>}
      </div>
      {canEdit && (
        <div className="inc-actions">
          <button type="button" className="btn btn-outline" onClick={() => save("close", payload(), "Saved")}>Save</button>
          {status === "actions_assigned" && (
            <button type="button" className="btn btn-primary"
              onClick={() => save("close", { ...payload(), status: "closed" }, "Investigation closed")}>
              Close the investigation
            </button>
          )}
          {status === "actions_assigned" && (
            <small className="inc-muted">
              Closing needs the lessons learnt, a report type and the SHE Officer's comment
              {isFatal(incident) ? ", and the Operations Manager's comment (fatal incident)" : ""}.
            </small>
          )}
        </div>
      )}
    </fieldset>
  );
}

function OpsComment({ incident, user, save, busy }) {
  const saved = incident.incident_workflow?.operations_manager_comment || "";
  const [text, setText] = useState(saved);
  useEffect(() => { setText(saved); }, [saved]);
  const canComment = user?.role === "operations";
  return (
    <div className="form-group inc-ops">
      <label className="form-label" htmlFor="inc-ops-comment">Operations Manager's comments (when necessary, e.g. fatal incidents)</label>
      {canComment ? (
        <>
          <textarea id="inc-ops-comment" className="form-control" rows={3} maxLength={10000} value={text}
            onChange={(e) => setText(e.target.value)} />
          <button type="button" className="btn btn-sm btn-primary" style={{ marginTop: 8 }}
            disabled={busy || !text.trim() || text.trim() === saved}
            onClick={() => save("ops", { operations_manager_comment: text.trim() }, "Comment saved")}>Save comment</button>
        </>
      ) : (
        <p className="inc-quote">{saved || "Waiting for the Operations Manager's comment."}</p>
      )}
    </div>
  );
}

export default function InvestigationPanel({ incident, user, onSaved }) {
  const isShe = WORKFLOW_ROLES.includes(user?.role);
  const onTeam = teamIds(incident).includes(user?.user_id);
  const fatal = isFatal(incident);
  const status = incident.incident_workflow?.status || "reported";
  const reached = at(status);
  const closed = status === "closed";
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const save = async (section, workflow, message) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await incidentsApi.update(incident.id, { incident_workflow: workflow });
      onSaved(res.data);
      setNotice({ section, ok: true, text: message });
    } catch (err) {
      setNotice({ section, ok: false, text: detailOf(err, "That couldn't be saved.") });
    } finally {
      setBusy(false);
    }
  };
  const props = { incident, save, busy, user };
  const [actions, setActions] = useState(null);
  const loadActions = useCallback(() => {
    actionsApi.byIncident(incident.id).then((res) => setActions(res.data || [])).catch(() => setActions([]));
  }, [incident.id]);
  useEffect(() => { loadActions(); }, [loadActions]);
  const actionsDone = !!actions?.length && actions.every(actionClosed);

  return (
    <div className="inc-investigation">
      {onTeam && !isShe && !closed && (
        <p className="inc-banner">You are on the investigation team: record what you find in step 2 and send it to the SHE team.</p>
      )}
      <Section n={1} title="Investigation team" who="assembled by the SHE team" open>
        <TeamSection {...props} canEdit={isShe && !closed} />
        <Notice notice={notice} section="team" />
      </Section>
      <Section n={2} title="Investigation findings" who="by the investigation team" open={reached >= STAGE.assigned}
        waiting="Opens once the SHE team assigns the investigation team.">
        <FindingsSection {...props} canStart={isShe || onTeam} canWrite={onTeam && status === "investigating"} />
        <Notice notice={notice} section="findings" />
      </Section>
      <Section n={3} title="Root cause" who="by the SHE team" open={reached >= STAGE.findings_recorded}
        waiting="Opens once the investigation team sends its findings.">
        <RootCauseSection {...props} canEdit={isShe && !closed} />
        <Notice notice={notice} section="root" />
      </Section>
      <Section n={4} title="Corrective actions" who="assigned by the SHE team" open={reached >= STAGE.root_cause_recorded}
        waiting="Opens once the SHE team records the root cause.">
        <ActionsSection {...props} canEdit={isShe && !closed} actions={actions} reload={loadActions} />
        <Notice notice={notice} section="actions" />
      </Section>
      <Section n={5} title="Closing the investigation" who="by the SHE team, after the corrective actions are closed"
        open={closed || (reached >= STAGE.actions_assigned && actionsDone)}
        waiting={reached >= STAGE.actions_assigned ? "Opens once every corrective action is closed." : "Opens once the corrective actions are assigned and closed."}>
        <CloseSection {...props} canEdit={isShe} />
        <Notice notice={notice} section="close" />
      </Section>
      {(fatal || user?.role === "operations" || incident.incident_workflow?.operations_manager_comment) && (
        <>
          <OpsComment {...props} user={user} />
          <Notice notice={notice} section="ops" />
        </>
      )}
    </div>
  );
}

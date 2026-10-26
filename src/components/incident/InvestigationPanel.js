import React, { useEffect, useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { incidentsApi } from "../../api/endpoints";
import {
  CONTROLS, REPORT_TYPES, ROOT_CAUSES, STAGES, UNSAFE_ACTS, UNSAFE_CONDITIONS, isFatal, labelOf, stageIndex,
} from "./formOptions";

export const WORKFLOW_ROLES = ["super_admin", "admin", "she_team"];

// What the server asks for before each stage
const NEEDS = {
  assigned: "at least one investigation team member",
  causes_recorded: "evidence (notes or a file), at least one cause, the root cause, a corrective action and lessons learnt",
  closed: "the same as for recording causes",
  report_finalised: "a report type ticked",
};
const needsFor = (stage, fatal) =>
  stage === "report_finalised" && fatal ? `${NEEDS[stage]} and the Operations Manager's comment` : NEEDS[stage];

const day = (value) => (value ? String(value).slice(0, 10) : "");
const blankMember = () => ({ name: "", job_title: "", date: "" });
const blankAction = () => ({ action: "", control: "", by_whom: "", by_when: "" });

const draftFrom = (incident) => {
  const wf = incident.incident_workflow || {};
  const intake = incident.incident_intake || {};
  const members = (wf.team_members || []).map((m) => ({ ...blankMember(), ...m, job_title: m.job_title || "", date: day(m.date) }));
  const actions = (wf.action_items || []).map((a) => ({ ...blankAction(), ...a, control: a.control || "", by_whom: a.by_whom || "", by_when: day(a.by_when) }));
  // the site's own view of the causes is the starting point until SHE records theirs
  const causes = wf.causes?.length ? wf.causes : intake.site_causes || [];
  const report = intake.report || {};
  return {
    team_members: members.length ? members : [blankMember(), blankMember(), blankMember()],
    causes: [0, 1, 2].map((i) => causes[i] || ""),
    root_cause: wf.root_cause || "",
    action_items: actions.length ? actions : [blankAction(), blankAction()],
    lessons_learned: wf.lessons_learned || "",
    report_dates: report.types || (wf.report_type ? { [wf.report_type]: "" } : {}),
    revised: !!report.revised,
    she_comment: wf.she_comment || "",
  };
};

// What the paper form's "SHE" parts become when saved
const payloadFrom = (draft) => {
  const ticked = REPORT_TYPES.map(([key]) => key).filter((key) => key in draft.report_dates);
  return {
    workflow: {
      team_members: draft.team_members.filter((m) => m.name.trim())
        .map((m) => ({ name: m.name.trim(), job_title: m.job_title.trim() || null, date: m.date || null })),
      causes: draft.causes.map((c) => c.trim()).filter(Boolean),
      root_cause: draft.root_cause.trim() || null,
      action_items: draft.action_items.filter((a) => a.action.trim())
        .map((a) => ({ action: a.action.trim(), control: a.control || null, by_whom: a.by_whom.trim() || null, by_when: a.by_when || null })),
      lessons_learned: draft.lessons_learned.trim() || null,
      // the furthest report ticked is the report this record now is
      ...(ticked.length ? { report_type: ticked[ticked.length - 1] } : {}),
      she_comment: draft.she_comment.trim() || null,
    },
    // which reports were ticked, their dates and the revised flag ride along with the report form
    report: { types: draft.report_dates, revised: draft.revised },
  };
};

function CausePicker({ onPick, label }) {
  return (
    <select className="form-control inc-picker" aria-label={label} value=""
      onChange={(e) => e.target.value && onPick(e.target.value)}>
      <option value="">Pick from the form's list…</option>
      <optgroup label="Unsafe acts">{UNSAFE_ACTS.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
      <optgroup label="Unsafe conditions">{UNSAFE_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
    </select>
  );
}

export default function InvestigationPanel({ incident, user, onSaved }) {
  const canEdit = WORKFLOW_ROLES.includes(user?.role);
  const fatal = isFatal(incident);
  const canOpsComment = user?.role === "operations" && fatal;
  const status = incident.incident_workflow?.status || "reported";
  const at = stageIndex(status);
  const next = STAGES[at + 1];

  const [draft, setDraft] = useState(() => draftFrom(incident));
  const [opsComment, setOpsComment] = useState(incident.incident_workflow?.operations_manager_comment || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setDraft(draftFrom(incident));
    setOpsComment(incident.incident_workflow?.operations_manager_comment || "");
  }, [incident]);

  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setSaved(""); };
  const setRow = (key, i, patch) => set({ [key]: draft[key].map((r, n) => (n === i ? { ...r, ...patch } : r)) });

  const save = async (nextStatus) => {
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const { workflow, report } = payloadFrom(draft);
      const res = await incidentsApi.update(incident.id, {
        incident_workflow: nextStatus ? { ...workflow, status: nextStatus } : workflow,
        incident_intake: { report },
      });
      onSaved(res.data);
      setSaved(nextStatus ? `Moved to ${labelOf(STAGES, nextStatus)}` : "Investigation saved");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "The investigation couldn't be saved.");
    } finally {
      setSaving(false);
    }
  };

  const saveOpsComment = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await incidentsApi.update(incident.id, { incident_workflow: { operations_manager_comment: opsComment.trim() } });
      onSaved(res.data);
      setSaved("Comment saved");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "The comment couldn't be saved.");
    } finally {
      setSaving(false);
    }
  };

  const toggleReport = (key) => {
    const dates = { ...draft.report_dates };
    if (key in dates) delete dates[key];
    else dates[key] = new Date().toISOString().slice(0, 10);
    set({ report_dates: dates });
  };

  return (
    <div className="inc-investigation">
      <fieldset disabled={!canEdit || saving} className="inc-plain">
        <h4 className="inc-section-title">Investigation team</h4>
        <div className="table-wrap">
          <table className="inc-table">
            <thead><tr><th>Name</th><th>Job title</th><th>Date</th>{canEdit && <th aria-label="Remove" />}</tr></thead>
            <tbody>
              {draft.team_members.map((m, i) => (
                <tr key={i}>
                  <td><input className="form-control" aria-label={`Team member ${i + 1} name`} maxLength={150} value={m.name}
                    onChange={(e) => setRow("team_members", i, { name: e.target.value })} /></td>
                  <td><input className="form-control" aria-label={`Team member ${i + 1} job title`} maxLength={150} value={m.job_title}
                    onChange={(e) => setRow("team_members", i, { job_title: e.target.value })} /></td>
                  <td><input className="form-control" type="date" aria-label={`Team member ${i + 1} date`} value={m.date}
                    onChange={(e) => setRow("team_members", i, { date: e.target.value })} /></td>
                  {canEdit && (
                    <td><button type="button" className="btn btn-sm btn-outline" aria-label={`Remove team member ${i + 1}`}
                      onClick={() => set({ team_members: draft.team_members.filter((_, n) => n !== i) })}><Trash2 size={14} /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <button type="button" className="btn btn-sm btn-outline" disabled={draft.team_members.length >= 20}
            onClick={() => set({ team_members: [...draft.team_members, blankMember()] })}><Plus size={14} /> Add team member</button>
        )}

        <h4 className="inc-section-title">Incident causes</h4>
        {draft.causes.map((cause, i) => (
          <div className="form-group inc-cause" key={i}>
            <label className="form-label" htmlFor={`inc-cause-${i + 1}`}>Cause {i + 1}</label>
            <div className="inc-cause-row">
              <input id={`inc-cause-${i + 1}`} className="form-control" maxLength={1000} value={cause}
                onChange={(e) => set({ causes: draft.causes.map((c, n) => (n === i ? e.target.value : c)) })} />
              {canEdit && <CausePicker label={`Suggestions for cause ${i + 1}`}
                onPick={(v) => set({ causes: draft.causes.map((c, n) => (n === i ? v : c)) })} />}
            </div>
          </div>
        ))}
        <div className="form-group">
          <label className="form-label" htmlFor="inc-root-cause">Root cause</label>
          <textarea id="inc-root-cause" className="form-control" rows={2} maxLength={10000} value={draft.root_cause}
            onChange={(e) => set({ root_cause: e.target.value })} />
          {canEdit && (
            <select className="form-control inc-picker" aria-label="Root cause suggestions" value=""
              onChange={(e) => e.target.value && set({ root_cause: draft.root_cause.trim() ? `${draft.root_cause.trim()}; ${e.target.value}` : e.target.value })}>
              <option value="">Add a possible root cause from the form's list…</option>
              {ROOT_CAUSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        <h4 className="inc-section-title">Corrective action</h4>
        <p className="inc-muted">Hierarchy of control, most effective first: {CONTROLS.map(([, t]) => t.split(" (")[0]).join(" → ")}.</p>
        <div className="table-wrap">
          <table className="inc-table">
            <thead><tr><th>Corrective action</th><th>Control</th><th>By whom</th><th>By when</th>{canEdit && <th aria-label="Remove" />}</tr></thead>
            <tbody>
              {draft.action_items.map((a, i) => (
                <tr key={i}>
                  <td><textarea className="form-control" rows={1} aria-label={`Corrective action ${i + 1}`} maxLength={2000} value={a.action}
                    onChange={(e) => setRow("action_items", i, { action: e.target.value })} /></td>
                  <td>
                    <select className="form-control" aria-label={`Control for action ${i + 1}`} value={a.control}
                      onChange={(e) => setRow("action_items", i, { control: e.target.value })}>
                      <option value="">Choose…</option>
                      {CONTROLS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                    </select>
                  </td>
                  <td><input className="form-control" aria-label={`Action ${i + 1} by whom`} maxLength={150} value={a.by_whom}
                    onChange={(e) => setRow("action_items", i, { by_whom: e.target.value })} /></td>
                  <td><input className="form-control" type="date" aria-label={`Action ${i + 1} by when`} value={a.by_when}
                    onChange={(e) => setRow("action_items", i, { by_when: e.target.value })} /></td>
                  {canEdit && (
                    <td><button type="button" className="btn btn-sm btn-outline" aria-label={`Remove action ${i + 1}`}
                      onClick={() => set({ action_items: draft.action_items.filter((_, n) => n !== i) })}><Trash2 size={14} /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <button type="button" className="btn btn-sm btn-outline" disabled={draft.action_items.length >= 20}
            onClick={() => set({ action_items: [...draft.action_items, blankAction()] })}><Plus size={14} /> Add action</button>
        )}

        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label" htmlFor="inc-lessons">Lessons learnt</label>
          <textarea id="inc-lessons" className="form-control" rows={3} maxLength={10000} value={draft.lessons_learned}
            onChange={(e) => set({ lessons_learned: e.target.value })} />
        </div>

        <fieldset className="inc-choice">
          <legend className="form-label">Report type (select all that apply)</legend>
          <label className="inc-check">
            <input type="checkbox" checked={draft.revised} onChange={(e) => set({ revised: e.target.checked })} />
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
            onChange={(e) => set({ she_comment: e.target.value })} />
        </div>
      </fieldset>

      {(fatal || incident.incident_workflow?.operations_manager_comment) && (
        <div className="form-group inc-ops">
          <label className="form-label" htmlFor="inc-ops-comment">Operations Manager's comments (fatal incidents)</label>
          {canOpsComment ? (
            <>
              <textarea id="inc-ops-comment" className="form-control" rows={3} maxLength={10000} value={opsComment}
                onChange={(e) => { setOpsComment(e.target.value); setSaved(""); }} />
              <button type="button" className="btn btn-sm btn-primary" style={{ marginTop: 8 }} onClick={saveOpsComment}
                disabled={saving || !opsComment.trim() || opsComment.trim() === (incident.incident_workflow?.operations_manager_comment || "")}>
                Save comment
              </button>
            </>
          ) : (
            <p className="inc-quote">{incident.incident_workflow?.operations_manager_comment || "Waiting for the Operations Manager's comment."}</p>
          )}
        </div>
      )}

      {error && <div role="alert" className="inc-error">{error}</div>}
      {saved && <div role="status" className="inc-saved"><Check size={14} /> {saved}</div>}

      {canEdit && (
        <div className="inc-actions">
          <button type="button" className="btn btn-outline" disabled={saving} onClick={() => save(null)}>
            {saving ? "Saving…" : "Save investigation"}
          </button>
          {next && (
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => save(next[0])}
              title={needsFor(next[0], fatal) ? `Needs ${needsFor(next[0], fatal)}` : undefined}>
              Save and move to {next[1]}
            </button>
          )}
          {next && needsFor(next[0], fatal) && <small className="inc-muted">{next[1]} needs {needsFor(next[0], fatal)}.</small>}
        </div>
      )}
    </div>
  );
}

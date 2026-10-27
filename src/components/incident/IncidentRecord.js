import React, { useEffect, useState } from "react";
import { X, Pencil } from "lucide-react";
import { incidentsApi } from "../../api/endpoints";
import { useFeedback } from "../Feedback";
import { apiError } from "../../utils/apiError";
import SiteReportFields, { SiteReportView, cleanIntake, emptyIntake, intakeForEditing } from "./SiteReportFields";
import EvidenceFiles from "./EvidenceFiles";
import { RichText } from "../RichTextEditor";
import InvestigationPanel, { WORKFLOW_ROLES, teamIds } from "./InvestigationPanel";
import { STAGES, labelOf, stageIndex } from "./formOptions";

const EVIDENCE_ROLES = [...WORKFLOW_ROLES, "site_manager"];

const detailOf = (err, fallback) => apiError(err, fallback);

export function StageStepper({ status }) {
  const at = stageIndex(status);
  return (
    <ol className="inc-stepper" aria-label="Investigation stage">
      {STAGES.map(([key, text], i) => (
        <li key={key} className={i < at ? "done" : i === at ? "current" : ""} aria-current={i === at ? "step" : undefined}>
          <span className="inc-step-dot">{i + 1}</span>
          <span className="inc-step-text">{text}</span>
        </li>
      ))}
    </ol>
  );
}

function History({ incidentId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let live = true;
    incidentsApi.workflowHistory(incidentId)
      .then((res) => live && setRows(res.data || []))
      .catch(() => live && setRows([]));
    return () => { live = false; };
  }, [incidentId]);

  if (rows === null) return <p className="inc-muted">Loading…</p>;
  if (!rows.length) return <p className="inc-muted">No investigation changes recorded yet.</p>;
  return (
    <ol className="inc-history">
      {rows.map((row) => {
        let d = {};
        try { d = JSON.parse(row.details || "{}"); } catch (e) { /* older entries are plain text */ }
        const moved = d.previous_stage && d.new_stage && d.previous_stage !== d.new_stage;
        return (
          <li key={row.id}>
            <time>{new Date(row.timestamp).toLocaleString()}</time>
            <span>
              <strong>{row.user_email}</strong>{" "}
              {moved ? `moved it from ${labelOf(STAGES, d.previous_stage)} to ${labelOf(STAGES, d.new_stage)}` : "updated the investigation"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// The full incident record: what the site reported, the evidence, SHE's investigation and its history.
export default function IncidentRecord({ incident, siteName, user, onClose, onUpdated }) {
  const { notify } = useFeedback();
  const [tab, setTab] = useState("report");
  const [editing, setEditing] = useState(null);
  const [savingReport, setSavingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const status = incident.incident_workflow?.status || "reported";
  const role = user?.role;
  const isShe = WORKFLOW_ROLES.includes(role);
  // the site keeps its report up to date until SHE take it on; SHE can correct it at any stage
  const canEditReport = isShe || (role === "site_manager" && status === "reported");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const saveReport = async () => {
    setSavingReport(true);
    setReportError("");
    try {
      const intake = cleanIntake(editing);
      // the server merges what is sent, so a cleared answer is sent as empty
      Object.keys(emptyIntake()).forEach((k) => { if (!(k in intake)) intake[k] = null; });
      intake.other_category = intake.other_category ?? null;
      const res = await incidentsApi.update(incident.id, { incident_intake: intake });
      onUpdated(res.data);
      setEditing(null);
      notify("Report saved");
    } catch (err) {
      setReportError(detailOf(err, "The report couldn't be saved."));
    } finally {
      setSavingReport(false);
    }
  };

  const tabs = [["report", "Site report"], ["investigation", "Investigation"], ["history", "History"]];
  const when = incident.occurred_at || incident.date_time;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide inc-record" role="dialog" aria-modal="true" aria-label={`Incident INC-${incident.id}`}
        onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Incident Details · INC-{incident.id}</div>
            <div className="inc-muted">Incident Investigation Report Form GP-SHE/SPR/02/01</div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon btn-outline" aria-label="Dismiss"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <StageStepper status={status} />

          <div className="inc-summary">
            <div><strong>Site:</strong> {siteName}</div>
            <div><strong>Type:</strong> {incident.type}</div>
            <div><strong>Severity:</strong> <span className={`badge badge-${incident.severity?.toLowerCase()}`}>{incident.severity}</span></div>
            {when && <div><strong>When:</strong> {new Date(when).toLocaleString()}</div>}
            {incident.injured_person && <div><strong>Injured person:</strong> {incident.injured_person}</div>}
          </div>

          <div className="inc-tabs" role="tablist" aria-label="Incident record">
            {tabs.map(([key, text]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key}
                className={`inc-tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>{text}</button>
            ))}
          </div>

          {tab === "report" && (
            <div role="tabpanel" aria-label="Site report">
              <div className="inc-block">
                <strong>Description</strong>{" "}
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>(fixed once logged)</span>
                <div className="inc-description">
                  {incident.description_html
                    ? <RichText html={incident.description_html} />
                    : <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{incident.description || "No description provided."}</p>}
                </div>
              </div>

              <div className="inc-block">
                <div className="inc-block-head">
                  <h3>Report form</h3>
                  {canEditReport && !editing && (
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => setEditing(intakeForEditing(incident.incident_intake))}>
                      <Pencil size={14} /> Fill in / edit report
                    </button>
                  )}
                </div>
                {editing ? (
                  <>
                    <SiteReportFields intake={editing} onChange={setEditing} idPrefix={`edit-${incident.id}`} />
                    {reportError && <div role="alert" className="inc-error">{reportError}</div>}
                    <div className="inc-actions">
                      <button type="button" className="btn btn-primary" disabled={savingReport} onClick={saveReport}>
                        {savingReport ? "Saving…" : "Save report"}
                      </button>
                      <button type="button" className="btn btn-outline" disabled={savingReport} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <SiteReportView incident={incident} />
                )}
              </div>

              <div className="inc-block">
                <h3>Evidence files</h3>
                <EvidenceFiles incident={incident} onChange={onUpdated}
                  canAdd={EVIDENCE_ROLES.includes(role) || teamIds(incident).includes(user?.user_id)}
                  canRemove={(f) => isShe || (f.uploaded_by != null && f.uploaded_by === user?.user_id)} />
              </div>

            </div>
          )}

          {tab === "investigation" && (
            <div role="tabpanel" aria-label="Investigation">
              <InvestigationPanel incident={incident} user={user} onSaved={onUpdated} />
            </div>
          )}

          {tab === "history" && (
            <div role="tabpanel" aria-label="History">
              <History incidentId={incident.id} key={status} />
            </div>
          )}
        </div>
        <div className="modal-footer">
          {/* the SHE team takes action through the investigation: team, causes, corrective actions, closing */}
          {isShe && tab !== "investigation" && (
            <button type="button" className="btn btn-primary" onClick={() => setTab("investigation")}>Take Action</button>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

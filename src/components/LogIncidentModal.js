import React, { useState, useEffect } from "react";
import { X, Paperclip } from "lucide-react";
import { incidentsApi, sitesApi } from "../api/endpoints";
import SiteReportFields, { emptyIntake, cleanIntake } from "./incident/SiteReportFields";
import { EVIDENCE_ACCEPT } from "./incident/EvidenceFiles";
import { useFeedback } from "./Feedback";
import { apiError } from "../utils/apiError";
import RichTextEditor from "./RichTextEditor";

// "YYYY-MM-DDTHH:mm" in the user's local time, the format <input type="datetime-local"> uses
const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function LogIncidentModal({
  isOpen,
  onClose,
  onIncidentLogged,
  prefill = null,
}) {
  const [site, setSite] = useState(null);
  const [formData, setFormData] = useState({
    type: "injury",
    description: "",
    severity: "low",
    lost_time_days: "",
    injured_person: "",
    occurred_at: nowLocal(),
  });
  const { notify } = useFeedback();
  const [intake, setIntake] = useState(emptyIntake);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    // Pre-fill if follow-up, otherwise reset
    setFormData({
      type: prefill?.type || "injury",
      description: prefill?.description || "",
      severity: prefill?.severity || "low",
      lost_time_days: "",
      injured_person: "",
        occurred_at: nowLocal(),
    });
    setIntake(emptyIntake());
    setFiles([]);
    setError("");
  }, [isOpen, prefill?.type, prefill?.description, prefill?.severity]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchSite = async () => {
      try {
        // Get site_id from token
        const token = localStorage.getItem("token");
        const payload = JSON.parse(atob(token.split(".")[1]));
        const siteId = payload.site_id;

        if (siteId) {
          const res = await sitesApi.getOne(siteId);
          setSite(res.data);
        }
      } catch (err) {
        console.error("Could not fetch site", err);
      }
    };
    fetchSite();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // the description is formatted text: count its words, not the formatting
    const words = new DOMParser().parseFromString(formData.description || "", "text/html").body.textContent.trim();
    if (words.length < 5) {
      const message = "Describe what happened in at least 5 characters.";
      setError(message);
      notify(message, "error");
      return;
    }
    setLoading(true);

    try {
      const payload = {
        site_id: site?.id,
        type: formData.type,
        description: formData.description,
        severity: formData.severity,
        resolved: false,
        lost_time_days: parseInt(formData.lost_time_days || 0, 10),
        occurred_at: formData.occurred_at || undefined,
        injured_person: formData.injured_person.trim() || undefined,
        // the rest of Glow's incident report form (GP-SHE/SPR/02/01)
        incident_intake: cleanIntake(intake),
      };

      const created = (await incidentsApi.create(payload)).data;
      // the evidence goes up once the incident exists; a file that fails doesn't lose the report
      const failed = [];
      for (const file of files) {
        try {
          await incidentsApi.addFile(created.id, file);
        } catch (err) {
          failed.push(file.name);
        }
      }
      notify("Incident logged and sent to the SHE team");
      if (failed.length) {
        notify(`The incident was logged, but these files couldn't be attached: ${failed.join(", ")}. Add them from the Incidents page.`, "error");
      }
      onIncidentLogged();
      onClose();
    } catch (err) {
      console.error("Error:", err.response?.data?.detail);
      const message = `The incident wasn't logged. ${apiError(err, "Please try again.")}`;
      setError(message);
      notify(message, "error"); // the form is long: the message at its top may be out of sight
    } finally {
      setLoading(false);
    }
  };

  const isInjury = formData.type === "injury";

  return (
    <div className="modal-overlay">
      <div className="modal modal-wide">
        <div className="modal-header">
          <div className="modal-title">
            {prefill ? "Log Follow-Up Incident" : "Log New Incident"}
          </div>
          <button onClick={onClose} className="btn-icon btn-outline">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
          )}
          <form id="incident-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="incident-site">Site</label>
              <input id="incident-site"
                type="text"
                className="form-control"
                value={site ? site.name : "Loading site..."}
                disabled
                style={{ background: "#f1f5f9", cursor: "not-allowed" }}
              />
            </div>

            <SiteReportFields intake={intake} onChange={setIntake} idPrefix="new-incident"
              personFields={(
                <>
                  <div className="form-group">
                      <label className="form-label" htmlFor="incident-injured-person">{isInjury ? "Name of injured person" : "Name of person involved"}</label>
                      <input
                        id="incident-injured-person"
                        type="text"
                        className="form-control"
                        value={formData.injured_person}
                        maxLength={150}
                        autoComplete="off"
                        onChange={(e) => setFormData({ ...formData, injured_person: e.target.value })}
                        placeholder="e.g. Farai Moyo (leave blank if not known yet)"
                      />
                    </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="incident-when-did-it-happen">When did it happen?</label>
                    <input id="incident-when-did-it-happen"
                      type="datetime-local"
                      className="form-control"
                      value={formData.occurred_at}
                      max={nowLocal()}
                      onChange={(e) =>
                        setFormData({ ...formData, occurred_at: e.target.value })
                      }
                      required
                    />
                  </div>
                  {isInjury && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="incident-lost-time-days">Lost Time Days <small>(days off duty)</small></label>
                      <input id="incident-lost-time-days"
                        type="number"
                        className="form-control"
                        value={formData.lost_time_days}
                        onChange={(e) =>
                          setFormData({ ...formData, lost_time_days: e.target.value })
                        }
                        min="0"
                        placeholder="e.g. 3"
                      />
                    </div>
                  )}
                </>
              )}
              description={(
                <div className="form-group">
                  <label className="form-label" htmlFor="incident-description">Description</label>
                  <RichTextEditor id="incident-description" label="Description" value={formData.description}
                    onChange={(html) => setFormData((f) => ({ ...f, description: html }))}
                    placeholder="What happened: include specific time frames and names, and police details if any." />
                  <small style={{ color: "#64748b" }}>At least 5 characters. The description can't be changed once the incident is logged.</small>
                </div>
              )}
              classification={(
                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label" htmlFor="incident-incident-type">Incident Type</label>
                    <select id="incident-incident-type"
                      className="form-control"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      required
                    >
                      <option value="injury">Injury</option>
                      <option value="spill">Spill</option>
                      <option value="fire">Fire</option>
                      <option value="environmental">Environmental</option>
                      <option value="near-miss">Near-Miss</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="incident-severity">Severity</label>
                    <select id="incident-severity"
                      className="form-control"
                      value={formData.severity}
                      onChange={(e) =>
                        setFormData({ ...formData, severity: e.target.value })
                      }
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>              )}
              evidenceFiles={(
              <div className="form-group">
                <label className="form-label" htmlFor="incident-evidence-files">
                  <Paperclip size={14} /> Evidence files (up to 20, 10 MB each)
                </label>
                <input id="incident-evidence-files" type="file" multiple className="form-control" accept={EVIDENCE_ACCEPT}
                  onChange={(e) => setFiles([...e.target.files].slice(0, 20))} />
                {files.length > 0 && <small style={{ color: "#64748b" }}>{files.length} file{files.length === 1 ? "" : "s"} will be attached</small>}
              </div>
            )} />
          </form>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="incident-form"
            className="btn btn-primary"
            disabled={loading || !site}
          >
            {loading ? "Logging..." : "Log Incident"}
          </button>
        </div>
      </div>
    </div>
  );
}

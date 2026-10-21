import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { incidentsApi, sitesApi } from "../api/endpoints";

const nowLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const emptyForm = () => ({
  type: "injury", reporter_name: "", reporter_occupation: "", reporter_department: "",
  reporter_employment: "employee", involved_person: "", involved_occupation: "",
  years_of_service: "", witnesses: "", occurred_at: nowLocal(), incident_time: "",
  location: "", days_off_duty: "0", categories: [], description: "", severity: "low", lost_time_days: "0",
});

const categories = [
  "Company vehicle", "Contractor vehicle", "Heavy equipment", "Oil/Fuel spillages", "Bodily injury", "Fire/Explosion",
  "Environmental contamination", "Property damage", "Security/Robbery/Fraud/Theft", "Biological/Chemical hazard", "Fatality", "Other",
];

export default function LogIncidentModal({ isOpen, onClose, onIncidentLogged, prefill = null }) {
  const [site, setSite] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setFormData({ ...emptyForm(), ...prefill, occurred_at: prefill?.occurred_at || nowLocal() });
    setError("");
  }, [isOpen, prefill]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const token = localStorage.getItem("token");
      const siteId = token ? JSON.parse(atob(token.split(".")[1])).site_id : null;
      if (siteId) sitesApi.getOne(siteId).then((response) => setSite(response.data));
    } catch (err) {
      setError("Could not load your site. Please sign in again.");
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const update = (name, value) => setFormData((current) => ({ ...current, [name]: value }));
  const toggleCategory = (category) => update("categories", formData.categories.includes(category)
    ? formData.categories.filter((item) => item !== category) : [...formData.categories, category]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!site?.id) return setError("Site information is missing. Please re-login.");
    if (formData.description.trim().length < 5) return setError("Describe what happened in at least 5 characters.");
    setLoading(true);
    try {
      await incidentsApi.create({
        site_id: site.id, type: formData.type, description: formData.description.trim(), severity: formData.severity,
        resolved: false, lost_time_days: Number(formData.lost_time_days || 0), occurred_at: formData.occurred_at || undefined,
        incident_intake: { ...formData, days_off_duty: Number(formData.days_off_duty || 0), lost_time_days: Number(formData.lost_time_days || 0), status: "reported" },
      });
      onIncidentLogged();
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to log incident. Please check the form.");
    } finally { setLoading(false); }
  };

  const field = (label, name, props = {}) => (
    <div className="form-group"><label className="form-label" htmlFor={`incident-${name}`}>{label}</label>
      <input id={`incident-${name}`} className="form-control" value={name === "site" ? (site?.name || "Loading site...") : formData[name]} onChange={(event) => update(name, event.target.value)} {...props} /></div>
  );

  return <div className="modal-overlay"><div className="modal" style={{ maxWidth: "760px", width: "95%" }}>
    <div className="modal-header"><div><div className="modal-title">Report an incident</div><small style={{ color: "#64748b" }}>Site manager intake: incident investigation report, page 1</small></div><button onClick={onClose} className="btn-icon btn-outline" aria-label="Close"><X size={18} /></button></div>
    <div className="modal-body">{error && <div style={{ color: "#b91c1c", marginBottom: "14px" }}>{error}</div>}<form id="incident-form" onSubmit={handleSubmit}>
      {field("Site", "site", { disabled: true })}<div className="two-col">{field("Name of reporter", "reporter_name", { required: true })}{field("Reporter occupation", "reporter_occupation")}{field("Department", "reporter_department")}
        <div className="form-group"><label className="form-label" htmlFor="incident-reporter-employment">Employee / contractor</label><select id="incident-reporter-employment" className="form-control" value={formData.reporter_employment} onChange={(event) => update("reporter_employment", event.target.value)}><option value="employee">Employee</option><option value="contractor">Contractor</option></select></div></div>
      <h4>Incident details</h4><div className="two-col">{field("Name of person involved", "involved_person")}{field("Occupation", "involved_occupation")}{field("Years of service", "years_of_service", { type: "number", min: "0" })}{field("Names of witnesses", "witnesses")}{field("Date and time", "occurred_at", { type: "datetime-local", required: true, max: nowLocal() })}{field("Time noted", "incident_time", { type: "time" })}{field("Location of incident", "location", { required: true })}{field("Number of days off duty", "days_off_duty", { type: "number", min: "0" })}</div>
      <div className="form-group"><label className="form-label">Incident category</label><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "8px" }}>{categories.map((category) => <label key={category} style={{ display: "flex", gap: "8px", alignItems: "center" }}><input type="checkbox" checked={formData.categories.includes(category)} onChange={() => toggleCategory(category)} />{category}</label>)}</div></div>
      <div className="two-col"><div className="form-group"><label className="form-label" htmlFor="incident-type">Incident type</label><select id="incident-type" className="form-control" value={formData.type} onChange={(event) => update("type", event.target.value)}><option value="injury">Injury</option><option value="near-miss">Near miss</option><option value="spill">Spill</option><option value="fire">Fire / explosion</option><option value="environmental">Environmental</option><option value="property-damage">Property damage</option></select></div><div className="form-group"><label className="form-label" htmlFor="incident-severity">Initial severity</label><select id="incident-severity" className="form-control" value={formData.severity} onChange={(event) => update("severity", event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div></div>
      <div className="form-group"><label className="form-label" htmlFor="incident-description">Incident description</label><textarea id="incident-description" className="form-control" rows={5} required value={formData.description} onChange={(event) => update("description", event.target.value)} placeholder="Include what happened, specific times, names and police details where applicable." /></div>{formData.type === "injury" && field("Lost time days", "lost_time_days", { type: "number", min: "0" })}
    </form></div><div className="modal-footer"><button type="button" onClick={onClose} className="btn btn-outline" disabled={loading}>Cancel</button><button type="submit" form="incident-form" className="btn btn-primary" disabled={loading || !site}>{loading ? "Submitting..." : "Submit to SHE"}</button></div>
  </div></div>;
}

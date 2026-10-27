import React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CATEGORIES, INJURY_OUTCOMES, ENVIRONMENTAL_IMPACTS, UNSAFE_ACTS, UNSAFE_CONDITIONS, costTotal, formatUsd, labelOf,
} from "./formOptions";

// The parts of the form the site fills in ("S" on the paper form), kept in the incident's
// incident_intake. The person involved, date/time and days off duty are the incident's own fields.
export const emptyIntake = () => ({
  reporter_name: "", reporter_occupation: "", department: "", employee_or_contractor: "",
  person_occupation: "", years_of_service: "", witnesses: "", location: "",
  categories: [], other_category: "", injury_outcome: "", environmental_impact: "",
  site_causes: ["", "", ""], evidence: "", cost_items: [],
});

// Drops what was left blank, so the saved record holds only what was filled in.
export const cleanIntake = (intake) => {
  const out = {};
  Object.entries(intake).forEach(([key, value]) => {
    if (key === "cost_items") {
      const rows = value.filter((r) => (r.description || "").trim() || (r.damage_payer || "").trim() || r.cost_usd !== "")
        .map((r) => ({ ...r, cost_usd: r.cost_usd === "" ? null : Number.parseFloat(r.cost_usd) }));
      if (rows.length) out.cost_items = rows;
    } else if (key === "site_causes") {
      const causes = value.map((c) => c.trim()).filter(Boolean);
      if (causes.length) out.site_causes = causes;
    } else if (Array.isArray(value) ? value.length : String(value ?? "").trim()) {
      out[key] = typeof value === "string" ? value.trim() : value;
    }
  });
  if (!out.categories?.includes("other")) delete out.other_category;
  return out;
};

export const intakeForEditing = (saved = {}) => {
  const base = emptyIntake();
  const merged = { ...base, ...saved };
  merged.site_causes = [0, 1, 2].map((i) => (saved.site_causes || [])[i] || "");
  merged.cost_items = (saved.cost_items || []).map((r) => ({ ...r, cost_usd: r.cost_usd ?? "" }));
  merged.years_of_service = saved.years_of_service ?? "";
  return merged;
};

function Text({ id, label, value, onChange, ...rest }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} type="text" className="form-control" value={value} onChange={(e) => onChange(e.target.value)}
        maxLength={150} autoComplete="off" {...rest} />
    </div>
  );
}

function Choice({ name, legend, options, value, onChange }) {
  return (
    <fieldset className="inc-choice">
      <legend className="form-label">{legend}</legend>
      <div className="inc-choice-row">
        {options.map(([key, text]) => (
          <label key={key} className={`inc-choice-item${value === key ? " on" : ""}`}>
            <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} />
            {text}
          </label>
        ))}
        {value && (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => onChange("")}>Clear</button>
        )}
      </div>
    </fieldset>
  );
}

// evidenceFiles: where the evidence files are attached, shown under the evidence notes
// The incident's own fields sit where the paper form has them: personFields (name, when, days off duty) with
// the person involved, then the description, then classification (type and severity) above the categories.
export default function SiteReportFields({ intake, onChange, idPrefix = "intake", evidenceFiles = null,
  personFields = null, description = null, classification = null }) {
  const set = (patch) => onChange({ ...intake, ...patch });
  const id = (name) => `${idPrefix}-${name}`;

  const toggleCategory = (key) => {
    const on = intake.categories.includes(key);
    set({ categories: on ? intake.categories.filter((c) => c !== key) : [...intake.categories, key] });
  };

  const setOutcome = (key) => {
    // a fatality is also the form's Fatality category, which asks the Operations Manager to comment
    const categories = key === "fatality" && !intake.categories.includes("fatality")
      ? [...intake.categories, "fatality"] : intake.categories;
    set({ injury_outcome: key, categories });
  };

  const setCost = (i, patch) => set({ cost_items: intake.cost_items.map((r, n) => (n === i ? { ...r, ...patch } : r)) });
  const total = costTotal(intake.cost_items);

  return (
    <div className="inc-site-fields">
      <h4 className="inc-section-title">Reported by</h4>
      <div className="two-col inc-tight">
        <Text id={id("reporter-name")} label="Name of reporter" value={intake.reporter_name}
          onChange={(v) => set({ reporter_name: v })} />
        <Text id={id("reporter-occupation")} label="Reporter's occupation" value={intake.reporter_occupation}
          onChange={(v) => set({ reporter_occupation: v })} />
        <Text id={id("department")} label="Department" value={intake.department} onChange={(v) => set({ department: v })} />
        <div className="form-group">
          <label className="form-label" htmlFor={id("employee-or-contractor")}>Employee or contractor</label>
          <select id={id("employee-or-contractor")} className="form-control" value={intake.employee_or_contractor}
            onChange={(e) => set({ employee_or_contractor: e.target.value })}>
            <option value="">Choose…</option>
            <option value="employee">Employee</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>
      </div>

      <h4 className="inc-section-title">Person involved, when and where</h4>
      {personFields}
      <div className="two-col inc-tight">
        <Text id={id("person-occupation")} label="Occupation of person involved" value={intake.person_occupation}
          onChange={(v) => set({ person_occupation: v })} />
        <div className="form-group">
          <label className="form-label" htmlFor={id("years-of-service")}>Years of service</label>
          <input id={id("years-of-service")} type="number" min="0" max="60" step="0.5" className="form-control"
            value={intake.years_of_service} onChange={(e) => set({ years_of_service: e.target.value })} />
        </div>
        <Text id={id("location")} label="Location of incident" value={intake.location} onChange={(v) => set({ location: v })}
          placeholder="e.g. Pump 3 forecourt" />
        <Text id={id("witnesses")} label="Names of witnesses" value={intake.witnesses} maxLength={500}
          onChange={(v) => set({ witnesses: v })} placeholder="Separate names with commas" />
      </div>

      {description}
      {classification}

      <fieldset className="inc-choice">
        <legend className="form-label">Incident category (tick all that apply)</legend>
        <div className="inc-check-grid">
          {CATEGORIES.map(([key, text]) => (
            <label key={key} className="inc-check">
              <input type="checkbox" checked={intake.categories.includes(key)} onChange={() => toggleCategory(key)} />
              {text}
            </label>
          ))}
        </div>
        {intake.categories.includes("other") && (
          <Text id={id("other-category")} label="Other category" value={intake.other_category}
            onChange={(v) => set({ other_category: v })} />
        )}
      </fieldset>

      <Choice name={id("outcome")} legend="Injury outcome" options={INJURY_OUTCOMES} value={intake.injury_outcome}
        onChange={setOutcome} />
      <Choice name={id("impact")} legend="Environmental impact" options={ENVIRONMENTAL_IMPACTS}
        value={intake.environmental_impact} onChange={(v) => set({ environmental_impact: v })} />

      <h4 className="inc-section-title">Incident causes</h4>
      {/* the form's page-4 lists of possible symptoms, as suggestions */}
      <datalist id={id("cause-list")}>
        {[...UNSAFE_ACTS, ...UNSAFE_CONDITIONS].map((c) => <option key={c} value={c} />)}
      </datalist>
      {intake.site_causes.map((cause, i) => (
        <div className="form-group inc-numbered" key={i}>
          <label className="form-label" htmlFor={id(`site-cause-${i + 1}`)}>Cause {i + 1}</label>
          <input id={id(`site-cause-${i + 1}`)} type="text" className="form-control" maxLength={500} value={cause}
            list={id("cause-list")} autoComplete="off" placeholder="Type, or pick an unsafe act or condition"
            onChange={(e) => set({ site_causes: intake.site_causes.map((c, n) => (n === i ? e.target.value : c)) })} />
        </div>
      ))}

      <h4 className="inc-section-title">Evidence</h4>
      <div className="form-group">
        <label className="form-label" htmlFor={id("evidence")}>Evidence notes</label>
        <textarea id={id("evidence")} className="form-control" rows={3} maxLength={10000} value={intake.evidence}
          onChange={(e) => set({ evidence: e.target.value })}
          placeholder="Supporting documents, witness or victim reports, pictures, sketch diagrams." />
      </div>
      {evidenceFiles}

      <h4 className="inc-section-title">Incident costs</h4>
      <div className="table-wrap">
        <table className="inc-table">
          <thead>
            <tr><th>What it cost (description)</th><th>Damage payer</th><th>Cost (USD)</th><th aria-label="Remove" /></tr>
          </thead>
          <tbody>
            {intake.cost_items.map((row, i) => (
              <tr key={i}>
                <td><input className="form-control" aria-label={`Cost item ${i + 1}`} maxLength={500} value={row.description || ""}
                  onChange={(e) => setCost(i, { description: e.target.value })} /></td>
                <td><input className="form-control" aria-label={`Damage payer ${i + 1}`} maxLength={150} value={row.damage_payer || ""}
                  onChange={(e) => setCost(i, { damage_payer: e.target.value })} /></td>
                <td><input className="form-control" aria-label={`Cost in USD ${i + 1}`} type="number" min="0" step="0.01"
                  value={row.cost_usd} onChange={(e) => setCost(i, { cost_usd: e.target.value })} /></td>
                <td>
                  <button type="button" className="btn btn-sm btn-outline" aria-label={`Remove cost ${i + 1}`}
                    onClick={() => set({ cost_items: intake.cost_items.filter((_, n) => n !== i) })}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
                <button type="button" className="btn btn-sm btn-outline" disabled={intake.cost_items.length >= 20}
                  onClick={() => set({ cost_items: [...intake.cost_items, { description: "", damage_payer: "", cost_usd: "" }] })}>
                  <Plus size={14} /> Add cost
                </button>
              </td>
              <td colSpan={2}><strong>Total cost: {formatUsd(total)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// The same record, read only
export function SiteReportView({ incident }) {
  const intake = incident.incident_intake || {};
  const rows = [
    ["Reported by", [intake.reporter_name, intake.reporter_occupation].filter(Boolean).join(", ")],
    ["Department", intake.department],
    ["Employee or contractor", intake.employee_or_contractor && (intake.employee_or_contractor === "contractor" ? "Contractor" : "Employee")],
    ["Person involved", [incident.injured_person, intake.person_occupation].filter(Boolean).join(", ")],
    ["Years of service", intake.years_of_service],
    ["Witnesses", intake.witnesses],
    ["Location", intake.location],
    ["Days off duty", incident.lost_time_days || null],
    ["Category", (intake.categories || []).map((c) => (c === "other" && intake.other_category
      ? `Other: ${intake.other_category}` : labelOf(CATEGORIES, c))).join(", ")],
    ["Injury outcome", intake.injury_outcome && labelOf(INJURY_OUTCOMES, intake.injury_outcome)],
    ["Environmental impact", intake.environmental_impact && labelOf(ENVIRONMENTAL_IMPACTS, intake.environmental_impact)],
    ["Incident causes", (intake.site_causes || []).map((c, i) => `${i + 1}. ${c}`).join("\n")],
    ["Evidence notes", intake.evidence],
  ].filter(([, v]) => v !== undefined && v !== null && v !== "");
  const costs = intake.cost_items || [];

  if (!rows.length && !costs.length) {
    return <p className="inc-muted">The site hasn't filled in the rest of the report form yet.</p>;
  }
  return (
    <>
      <dl className="inc-facts">
        {rows.map(([k, v]) => (
          <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>
        ))}
      </dl>
      {costs.length > 0 && (
        <div className="table-wrap">
          <table className="inc-table" aria-label="Incident costs">
            <thead><tr><th>Description</th><th>Damage payer</th><th>Cost (USD)</th></tr></thead>
            <tbody>
              {costs.map((r, i) => (
                <tr key={i}><td>{r.description}</td><td>{r.damage_payer}</td>
                  <td>{r.cost_usd == null ? "" : formatUsd(Number(r.cost_usd))}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={2}><strong>Total cost</strong></td><td><strong>{formatUsd(costTotal(costs))}</strong></td></tr></tfoot>
          </table>
        </div>
      )}
    </>
  );
}

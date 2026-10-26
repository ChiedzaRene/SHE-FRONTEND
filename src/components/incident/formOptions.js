// Wording and choices from Glow's Incident Investigation Report Form (GP-SHE/SPR/02/01).

export const CATEGORIES = [
  ["company_vehicle", "Involves company vehicle"],
  ["contractor_vehicle", "Involves contractor vehicle"],
  ["heavy_equipment", "Involves other (heavy equipment)"],
  ["oil_fuel_spillage", "Oil/fuel spillages"],
  ["body_injury", "Body injury"],
  ["fire_explosion", "Fire/explosion"],
  ["environment_contamination", "Environment contamination"],
  ["property_damage", "Property damage"],
  ["security", "Security/armed robbery/fraud/theft"],
  ["biological_chemical", "Involves biological/chemical hazard"],
  ["fatality", "Fatality"],
  ["other", "Other"],
];

export const INJURY_OUTCOMES = [
  ["near_miss", "Near miss / no injury"],
  ["first_aid", "First aid case"],
  ["non_lost_time", "Non-lost time injury"],
  ["lost_time", "Lost time injury"],
  ["fatality", "Fatality"],
];

export const ENVIRONMENTAL_IMPACTS = [
  ["work_section", "Limited impact in a work section"],
  ["within_site", "Impact within site boundaries"],
  ["beyond_site", "Reversible short impacts extending beyond site boundaries"],
  ["local_long_term", "Irreversible long-term impact at a local level"],
  ["national", "Irreversible impact at a national level"],
];

// Page 4: possible symptoms and root causes (not all inclusive)
export const UNSAFE_ACTS = [
  "Operating without authority", "Operating at unsafe speed", "Failure to warn/signal", "Removing safety device",
  "Failure to use PPE", "Using equipment unsafely", "Improper lifting", "Improper loading", "Horseplay",
  "Failure to follow procedure", "Violence/threats", "Improper position of task", "Alcohol/drugs",
  "Failure to identify hazard/risk", "Failure to communicate", "Using defective equipment",
  "Servicing equipment in operation", "Failure to check and monitor",
];

export const UNSAFE_CONDITIONS = [
  "Inadequate or improper safety devices or PPE", "Defective tools, equipment or material", "Poor housekeeping",
  "Protruding object", "Fire & or explosive hazard", "Environmental condition", "Inadequate workstation design",
  "Inadequate guard or barriers", "Presence of harmful material (chem/bio)", "Inadequate communication",
  "Inadequate warning system", "Noise exposure", "Inadequate illumination",
  "Inadequate instructions/ information/ data", "Uneven/slippery surfaces", "Inadequate ventilation",
  "Inadequate procedure", "Inadequate assistance / support",
];

export const ROOT_CAUSES = [
  "Inadequate leadership/ supervision: poor instruction or orientation training",
  "Inadequate leadership/ supervision: poor matching of people",
  "Inadequate leadership/ supervision: unclear instructions",
  "Inadequate work standards: poor communication",
  "Inadequate work standards: inadequate or complex policies and procedures",
  "Inadequate engineering: inadequate consideration of ergonomics",
  "Inadequate engineering: inadequate design criteria",
  "Undue care and attention",
  "Inadequate training",
  "Mental stress: emotional overload",
  "Mental stress: conflicting demands",
  "Mental stress: monotony",
  "Mental stress: extreme concentration demands",
  "Physical stress: fatigue",
  "Physical stress: task duration or lack of adequate rest",
  "Inadequate maintenance",
  "Lack of skill / knowledge",
  "Personality conflict",
  "Lack of employee cooperation",
];

// Hierarchy of control, most effective first
export const CONTROLS = [
  ["elimination", "Elimination (remove the hazard)"],
  ["substitution", "Substitution (use alternative)"],
  ["isolation", "Isolate (separation from hazard)"],
  ["redesign", "Redesign (change equipment or process)"],
  ["administration", "Administration (change work practice)"],
  ["ppe", "PPE (gloves, glasses, respirator)"],
];

export const REPORT_TYPES = [
  ["preliminary_investigation", "Preliminary investigation report"],
  ["interim_corrective_action", "Interim corrective action report"],
  ["full_investigation", "Full investigation report"],
  ["full_corrective_action", "Full corrective action report"],
];

// The form's order: the site reports (description, causes, evidence) to SHE; SHE assemble the investigation
// team; the team logs its findings; SHE record the root cause; SHE assign the corrective actions; once those
// are closed, SHE close it with the lessons learnt, report type and comments
export const STAGES = [
  ["reported", "Reported"],
  ["assigned", "Team assigned"],
  ["investigating", "Investigating"],
  ["findings_recorded", "Findings recorded"],
  ["root_cause_recorded", "Root cause recorded"],
  ["actions_assigned", "Actions assigned"],
  ["closed", "Closed"],
];

export const labelOf = (list, value) => (list.find(([v]) => v === value) || [null, value])[1];

export const stageIndex = (status) => Math.max(0, STAGES.findIndex(([s]) => s === (status || "reported")));

// matches the server: fatal severity or the Fatality category
export const isFatal = (incident) =>
  (incident?.severity || "").toLowerCase() === "fatal" ||
  (incident?.incident_intake?.categories || []).includes("fatality");

export const costTotal = (items = []) =>
  items.reduce((sum, row) => sum + (Number.parseFloat(row.cost_usd) || 0), 0);

export const formatUsd = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

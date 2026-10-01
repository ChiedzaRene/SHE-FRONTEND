// TRIR / LTIFR come from the server. They are null when a site has no hours worked
// entered for the period, which must read as "N/A" rather than 0.00 (0 would claim a perfect record).
export const fmtRate = (value) =>
  value === null || value === undefined ? "N/A" : Number(value).toFixed(2);

// Warning thresholds (per 200,000 hours). Previously hard-coded in each dashboard.
export const TRIR_LIMIT = 1.5;
export const LTIFR_LIMIT = 0.5;

// "no-data" when hours haven't been entered, so a site is never shown COMPLIANT by default.
export const siteStatus = (site) => {
  if (site.trir == null && site.ltifr == null) return "no-data";
  return site.trir > TRIR_LIMIT || site.ltifr > LTIFR_LIMIT ? "action" : "ok";
};

export const STATUS_STYLE = {
  "no-data": { label: "NO HOURS DATA", color: "#64748b", bg: "#f1f5f9" },
  action: { label: "ACTION REQUIRED", color: "#dc2626", bg: "#fef2f2" },
  ok: { label: "COMPLIANT", color: "#16a34a", bg: "#f0fdf4" },
};

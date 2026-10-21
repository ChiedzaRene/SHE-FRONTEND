import React from "react";
import { MapPinned, UserCircle2 } from "lucide-react";

// The options for a region dropdown: the regions in use today, plus the value already set if it is an older one
export const regionChoices = (data, current) => {
  const list = (data?.regions || []).filter((r) => r.current).map((r) => ({ name: r.name, label: r.name }));
  if (current && !list.some((r) => r.name === current)) list.push({ name: current, label: `${current} (old region: choose a new one)` });
  return list;
};

// Each region with its regional manager(s) and number of sites
export default function RegionsPanel({ regions }) {
  if (!regions?.regions) return null;
  const current = regions.regions.filter((r) => r.current);
  const older = regions.regions.filter((r) => !r.current && r.sites > 0);
  return (
    <section className="card regions-panel" aria-label="Regions">
      <div className="card-header">
        <div className="card-title"><MapPinned size={16} aria-hidden="true" style={{ verticalAlign: -2 }} /> Regions</div>
        {regions.unallocated > 0 && (
          <span className="badge badge-amber">{regions.unallocated} site{regions.unallocated === 1 ? "" : "s"} not allocated</span>
        )}
      </div>
      <ul className="regions-grid">
        {current.map((r) => (
          <li key={r.name} className={r.managers.length ? "" : "no-manager"}>
            <strong>{r.name}</strong>
            <span className="regions-count">{r.sites} site{r.sites === 1 ? "" : "s"}</span>
            <span className="regions-manager">
              <UserCircle2 size={14} aria-hidden="true" />
              {r.managers.length ? r.managers.join(", ") : "No regional manager yet"}
            </span>
          </li>
        ))}
      </ul>
      {older.length > 0 && (
        <p className="tt-muted" style={{ margin: "12px 0 0" }}>
          Still in older regions: {older.map((r) => `${r.name} (${r.sites})`).join(", ")}. Choose one of the regions above for these sites.
        </p>
      )}
    </section>
  );
}

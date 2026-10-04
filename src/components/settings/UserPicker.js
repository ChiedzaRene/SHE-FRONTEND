import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const ROLE_LABEL = { super_admin: "Super admin", admin: "Admin", she_team: "SHE team", site_manager: "Site manager", unknown: "Unknown" };
const STATUS_NOTE = { inactive: "Deactivated", removed: "Account removed" };

// Pick one person from a searchable list. value is their email, or "" for everyone.
export default function UserPicker({ people, value, onChange, id }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const root = useRef(null);

  const selected = people.find((p) => p.email === value);
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => people.filter((p) => !q || p.email.toLowerCase().includes(q) || (p.name || "").toLowerCase().includes(q)),
    [people, q],
  );
  // Row 0 is always "All people"; the matches follow
  const rows = useMemo(() => [{ email: "", all: true }, ...matches], [matches]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => root.current && !root.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (email) => {
    onChange(email);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (rows[highlight]) choose(rows[highlight].email); }
  };

  return (
    <div ref={root} style={{ position: "relative", minWidth: 260 }} onKeyDown={onKeyDown}>
      <button id={id} type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-controls={`${id}-list`}
        className="form-control" onClick={() => { setOpen((o) => !o); setHighlight(0); }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textAlign: "left", cursor: "pointer" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.name || selected.email : value || "All people"}
        </span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 4px)", left: 0, width: 360, maxWidth: "90vw",
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 10px 25px rgba(15,23,42,.15)" }}>
          <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
            <input autoFocus className="form-control" placeholder="Search by name or email" aria-label="Search people"
              value={query} onChange={(e) => { setQuery(e.target.value); setHighlight(0); }} />
          </div>
          <div role="listbox" id={`${id}-list`} style={{ maxHeight: 320, overflowY: "auto" }}>
            {rows.map((p, i) => (
              <div key={p.email || "all"} role="option" aria-selected={p.email === value}
                onMouseEnter={() => setHighlight(i)} onClick={() => choose(p.email)}
                style={{ padding: "8px 12px", cursor: "pointer", background: i === highlight ? "#eff6ff" : "transparent",
                  borderBottom: "1px solid #f8fafc" }}>
                {p.all ? (
                  <strong>All people</strong>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.name || p.email}</div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {p.name ? `${p.email} · ` : ""}{ROLE_LABEL[p.role] || p.role}
                      {STATUS_NOTE[p.status] && <span style={{ color: "#b45309" }}> · {STATUS_NOTE[p.status]}</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
            {matches.length === 0 && <div style={{ padding: 12, color: "#64748b" }}>No one matches "{query}".</div>}
          </div>
        </div>
      )}
    </div>
  );
}

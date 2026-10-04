import React, { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { auditApi } from "../../api/endpoints";
import { apiError } from "../../utils/apiError";
import UserPicker from "./UserPicker";

const PAGE_SIZE = 50;
const ROLE_LABEL = { super_admin: "Super admin", admin: "Admin", she_team: "SHE team", site_manager: "Site manager" };

// The server stores UTC; show the viewer's own clock. A value with no zone marker is UTC.
const parseTs = (ts) => (ts ? new Date(/(Z|[+-]\d\d:?\d\d)$/.test(ts) ? ts : `${ts}Z`) : null);
const fmtDate = (ts) => parseTs(ts)?.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) || "";
const fmtTime = (ts) => parseTs(ts)?.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) || "";
const fmtDateTime = (ts) => (ts ? `${fmtDate(ts)}, ${fmtTime(ts).slice(0, 5)}` : "");

const Stat = ({ label, value, warn }) => (
  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", minWidth: 150 }}>
    <div style={{ fontSize: "1rem", fontWeight: 800, color: warn ? "#b91c1c" : "#003B8E" }}>{value}</div>
    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{label}</div>
  </div>
);

export default function AuditLogTab() {
  const [facets, setFacets] = useState({ actions: [], resources: [], users: [], action_labels: {}, resource_labels: {} });
  const [email, setEmail] = useState(""); // the person picked; "" means everyone
  const [action, setAction] = useState("");
  const [resource, setResource] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Plain-English names come from the server; anything unknown falls back to the raw code
  const actionName = (code) => facets.action_labels[code] || code;
  const areaName = (code) => facets.resource_labels[code] || code;

  useEffect(() => {
    auditApi.facets().then((res) => setFacets(res.data)).catch(() => {});
  }, [refresh]);

  // The summary for the chosen person (not affected by the other filters)
  useEffect(() => {
    if (!email) {
      setPerson(null);
      return undefined;
    }
    let stale = false;
    auditApi.person(email).then((res) => !stale && setPerson(res.data)).catch(() => !stale && setPerson(null));
    return () => {
      stale = true;
    };
  }, [email, refresh]);

  // The entries, newest first
  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError("");
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (email) params.email = email;
    if (action) params.action = action;
    if (resource) params.resource = resource;
    if (start) params.start = start;
    if (end) params.end = end;
    auditApi
      .list(params)
      .then((res) => {
        if (stale) return;
        setRows(res.data);
        setTotal(Number(res.headers["x-total-count"] || res.data.length));
      })
      .catch((err) => !stale && setError(apiError(err, "Could not load the audit log.")))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [email, action, resource, start, end, page, refresh]);

  const change = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };
  const pickPerson = (value) => {
    setEmail(value);
    setAction(""); // a new person starts from everything they did
    setPage(0);
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const anyFilter = email || action || resource || start || end;
  const clearAll = () => {
    setEmail(""); setAction(""); setResource(""); setStart(""); setEnd(""); setPage(0);
  };

  return (
    <div>
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="audit-person">Person</label>
            <UserPicker id="audit-person" people={facets.users} value={email} onChange={pickPerson} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="audit-action">Activity</label>
            <select id="audit-action" className="form-control" value={action} onChange={change(setAction)}>
              <option value="">All activity</option>
              {facets.actions.map((a) => <option key={a} value={a}>{actionName(a)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="audit-resource">Section</label>
            <select id="audit-resource" className="form-control" value={resource} onChange={change(setResource)}>
              <option value="">All sections</option>
              {facets.resources.map((r) => <option key={r} value={r}>{areaName(r)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="audit-from">From</label>
            <input id="audit-from" type="date" className="form-control" value={start} max={end || undefined} onChange={change(setStart)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="audit-to">To</label>
            <input id="audit-to" type="date" className="form-control" value={end} min={start || undefined} onChange={change(setEnd)} />
          </div>
          <button className="btn btn-outline" type="button" onClick={() => setRefresh((n) => n + 1)}>
            <RefreshCw size={16} /> Refresh
          </button>
          {anyFilter && (
            <button className="btn btn-outline" type="button" onClick={clearAll}><X size={16} /> Clear filters</button>
          )}
        </div>
        <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: "0.8rem" }}>
          Everything people do in the system is recorded here, newest first. Pick a <strong>Person</strong> to see
          everything they did and when. <strong>Activity</strong> is the kind of thing they did, and
          <strong> Section</strong> is the part of the system it happened in.
        </p>
      </div>

      {email && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#003B8E", color: "#fff", display: "flex",
              alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.2rem" }}>
              {((person?.name || email)[0] || "?").toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>{person?.name || email}</div>
              <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                {person?.name ? `${email} · ` : ""}{ROLE_LABEL[person?.role] || person?.role || ""}
                {person?.status === "inactive" && <span style={{ color: "#b45309" }}> · Account deactivated</span>}
                {person?.status === "removed" && <span style={{ color: "#b45309" }}> · Account removed (history kept)</span>}
                {person?.status === "unknown" && <span style={{ color: "#b45309" }}> · No account with this email</span>}
              </div>
            </div>
          </div>
          {person && (
            <>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                <Stat label="Actions recorded" value={person.total.toLocaleString()} />
                <Stat label="First recorded" value={person.first_at ? fmtDateTime(person.first_at) : "Nothing yet"} />
                <Stat label="Last activity" value={person.last_at ? fmtDateTime(person.last_at) : "Nothing yet"} />
                <Stat label="Last sign-in" value={person.last_sign_in_at ? fmtDateTime(person.last_sign_in_at) : "None recorded"} />
                {person.failed_sign_ins > 0 && <Stat label="Failed sign-in attempts" value={person.failed_sign_ins} warn />}
              </div>
              {person.by_activity.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 6 }}>What they did (click to show only that):</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {person.by_activity.map((a) => (
                      <button key={a.action} type="button" onClick={() => { setAction(action === a.action ? "" : a.action); setPage(0); }}
                        aria-pressed={action === a.action}
                        style={{ border: action === a.action ? "2px solid #003B8E" : "1px solid #e2e8f0", background: action === a.action ? "#eff6ff" : "#fff",
                          borderRadius: 999, padding: "4px 12px", cursor: "pointer", fontSize: "0.8rem", color: "#0f172a" }}>
                        {a.label} <strong>{a.count}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <div className="card" role="alert" style={{ padding: 16, marginBottom: 16, color: "#991B1B", background: "#FEF2F2" }}>{error}</div>
      )}

      <div className="card" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
        <div className="card-header">
          <div className="card-title">
            {total === 0 ? "No matching entries" : `Showing ${from}-${to} of ${total.toLocaleString()}`}
          </div>
        </div>
        {total === 0 && !loading && email && (
          <div style={{ padding: "4px 20px 20px", color: "#64748b" }}>
            Nothing has been recorded for {person?.name || email}{anyFilter && (action || resource || start || end) ? " with these filters" : " yet"}.
          </div>
        )}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  {!email && <th>User</th>}
                  {!email && <th>Role</th>}
                  <th>Activity</th><th>Section</th><th>Details</th><th>IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 600 }}>{fmtDate(r.timestamp)}</div>
                      <div style={{ color: "#64748b", fontSize: "0.8rem" }}>{fmtTime(r.timestamp)}</div>
                    </td>
                    {!email && <td>{r.user_email}</td>}
                    {!email && <td>{(r.user_role || "").replace(/_/g, " ")}</td>}
                    <td><span className="badge badge-pending" title={r.action} style={{ textTransform: "none", whiteSpace: "normal" }}>{actionName(r.action)}</span></td>
                    <td>{areaName(r.resource)}{r.resource_id ? ` #${r.resource_id}` : ""}</td>
                    <td style={{ maxWidth: 360 }}>{r.details}</td>
                    <td>{r.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
          <button className="btn btn-outline" type="button" disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
          <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Page {page + 1} of {pages}</span>
          <button className="btn btn-outline" type="button" disabled={page + 1 >= pages || loading}
            onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

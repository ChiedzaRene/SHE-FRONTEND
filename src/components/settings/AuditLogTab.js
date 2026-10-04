import React, { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { auditApi } from "../../api/endpoints";
import { apiError, apiErrorFromBlob } from "../../utils/apiError";

const PAGE_SIZE = 50;
const fmtTime = (ts) => (ts ? new Date(ts).toLocaleString() : "");

export default function AuditLogTab() {
  const [facets, setFacets] = useState({
    actions: [], resources: [], users: [], action_labels: {}, resource_labels: {},
  });
  // Plain-English names come from the server; anything unknown falls back to the raw code
  const actionName = (code) => facets.action_labels[code] || code;
  const areaName = (code) => facets.resource_labels[code] || code;
  const [userText, setUserText] = useState("");
  const [user, setUser] = useState(""); // debounced copy of userText
  const [action, setAction] = useState("");
  const [resource, setResource] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const filters = () => {
    const params = {};
    if (user) params.user = user;
    if (action) params.action = action;
    if (resource) params.resource = resource;
    if (start) params.start = start;
    if (end) params.end = end;
    return params;
  };

  const exportPdf = async () => {
    setExporting(true);
    setError("");
    try {
      await auditApi.exportPdf(filters());
      setRefresh((n) => n + 1); // the export is itself logged, so show it
    } catch (err) {
      setError(await apiErrorFromBlob(err, "Could not create the PDF."));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    auditApi.facets().then((res) => setFacets(res.data)).catch(() => {});
  }, [refresh]);

  // Wait for a pause in typing before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setUser(userText.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [userText]);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError("");
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (user) params.user = user;
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
  }, [user, action, resource, start, end, page, refresh]);

  const change = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group" style={{ margin: 0, minWidth: 200 }}>
            <label className="form-label" htmlFor="audit-user">User</label>
            <input id="audit-user" className="form-control" placeholder="Type or pick an email" value={userText}
              list="audit-user-options" autoComplete="off" onChange={(e) => setUserText(e.target.value)} />
            <datalist id="audit-user-options">
              {facets.users.map((email) => <option key={email} value={email} />)}
            </datalist>
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
            <input id="audit-from" type="date" className="form-control" value={start} max={end || undefined}
              onChange={change(setStart)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="audit-to">To</label>
            <input id="audit-to" type="date" className="form-control" value={end} min={start || undefined}
              onChange={change(setEnd)} />
          </div>
          <button className="btn btn-outline" type="button" onClick={() => setRefresh((n) => n + 1)}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary" type="button" onClick={exportPdf} disabled={exporting || total === 0}
            title="Download the entries matching these filters (newest 2000)">
            <FileText size={16} /> {exporting ? "Preparing..." : "Export PDF"}
          </button>
        </div>
        <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: "0.8rem" }}>
          Everything people do in the system is recorded here. <strong>Activity</strong> is what they did (for example
          "Password reset by an admin"), and <strong>Section</strong> is the part of the system it happened in. Leave a
          filter on "All" to see everything. Export PDF saves what the filters currently show.
        </p>
      </div>

      {error && (
        <div className="card" role="alert" style={{ padding: 16, marginBottom: 16, color: "#991B1B", background: "#FEF2F2" }}>
          {error}
        </div>
      )}

      <div className="card" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
        <div className="card-header">
          <div className="card-title">
            {total === 0 ? "No matching entries" : `Showing ${from}-${to} of ${total.toLocaleString()}`}
          </div>
        </div>
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>When</th><th>User</th><th>Role</th><th>Activity</th><th>Section</th><th>Details</th><th>IP</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtTime(r.timestamp)}</td>
                    <td>{r.user_email}</td>
                    <td>{(r.user_role || "").replace(/_/g, " ")}</td>
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

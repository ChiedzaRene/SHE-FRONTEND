import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Upload, Lock, Eye, Download, Trash2, Search, X } from "lucide-react";
import { sheFilesApi, sitesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../components/Feedback";
import FileViewer from "../components/FileViewer";
import GlowFileIcon from "../components/GlowFileIcon";
import LoadingScreen from "../components/LoadingScreen";
import useNewItems from "../hooks/useNewItems";

const AUDIENCES = [
  { value: "site_manager", label: "Site managers" },
  { value: "regional_manager", label: "Regional managers" },
  { value: "she_team", label: "SHE team" },
  { value: "admin", label: "Admins" },
];
const AUDIENCE_LABEL = Object.fromEntries(AUDIENCES.map((a) => [a.value, a.label]));
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";
const VIEWABLE = /\.(pdf|png|jpe?g|gif|webp)$/i;
const MAX_BYTES = 10 * 1024 * 1024;

const fmtSize = (n) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

// A failed blob request carries its JSON error as a Blob
const errorText = async (err, fallback) => {
  let detail = err?.response?.data?.detail;
  const data = err?.response?.data;
  if (!detail && data instanceof Blob) {
    try {
      detail = JSON.parse(await data.text()).detail;
    } catch (e) {
      // not JSON
    }
  }
  return typeof detail === "string" ? detail : fallback;
};

function ShareForm({ sites, onShared, onCancel }) {
  const { notify } = useFeedback();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [audience, setAudience] = useState(["site_manager"]);
  const [siteId, setSiteId] = useState("");
  const [viewOnly, setViewOnly] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const viewable = file ? VIEWABLE.test(file.name) : true;
  const toggle = (value) =>
    setAudience((a) => (a.includes(value) ? a.filter((x) => x !== value) : [...a, value]));

  const pick = (f) => {
    setError("");
    setFile(f || null);
    if (f && !title.trim()) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    if (f && !VIEWABLE.test(f.name)) setViewOnly(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!file) return setError("Choose a file to share.");
    if (file.size > MAX_BYTES) return setError("The file is too large (the limit is 10 MB).");
    if (!title.trim()) return setError("Give the file a title.");
    if (!audience.length) return setError("Choose who the file is for.");
    const form = new FormData();
    form.append("title", title.trim());
    if (description.trim()) form.append("description", description.trim());
    form.append("audience", audience.join(","));
    if (siteId && (audience.includes("site_manager") || audience.includes("regional_manager"))) form.append("site_id", siteId);
    form.append("view_only", viewOnly ? "true" : "false");
    form.append("file", file);
    setProgress(0);
    try {
      const res = await sheFilesApi.upload(form, (p) => p.total && setProgress(Math.round((p.loaded / p.total) * 100)));
      notify(`"${res.data.title}" shared`, "success");
      onShared(res.data);
    } catch (err) {
      setError(await errorText(err, "The file couldn't be shared."));
      setProgress(null);
    }
  };

  const busy = progress !== null;
  return (
    <form className="card share-form" onSubmit={submit} aria-label="Share a file">
      <div className="card-header">
        <div className="card-title">Share a file</div>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} aria-label="Close the share form"><X size={16} /></button>
      </div>
      <div className="share-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="sf-file">File</label>
          <input id="sf-file" type="file" className="form-control" accept={ACCEPT} onChange={(e) => pick(e.target.files[0])} />
          <small className="share-hint">PDF, images, Word, Excel, PowerPoint, CSV or text · up to 10 MB</small>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="sf-title">Title</label>
          <input id="sf-title" className="form-control" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fire drill procedure" />
        </div>
        <div className="form-group share-wide">
          <label className="form-label" htmlFor="sf-desc">Note (optional)</label>
          <textarea id="sf-desc" className="form-control" rows={2} maxLength={2000} value={description}
            onChange={(e) => setDescription(e.target.value)} placeholder="What it is and what people should do with it" />
        </div>
        <fieldset className="form-group share-fieldset">
          <legend className="form-label">Who is it for?</legend>
          {AUDIENCES.map((a) => (
            <label key={a.value} className="share-check">
              <input type="checkbox" checked={audience.includes(a.value)} onChange={() => toggle(a.value)} /> {a.label}
            </label>
          ))}
        </fieldset>
        {(audience.includes("site_manager") || audience.includes("regional_manager")) && (
          <div className="form-group">
            <label className="form-label" htmlFor="sf-site">Which site?</label>
            <select id="sf-site" className="form-control" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Every site</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name} only</option>)}
            </select>
            <small className="share-hint">One site: only its site managers and its region's regional managers get it.</small>
          </div>
        )}
        <div className="share-wide share-restrict">
          <label className="share-check">
            <input type="checkbox" checked={viewOnly} disabled={!viewable} onChange={(e) => setViewOnly(e.target.checked)} />
            <span><Lock size={14} aria-hidden="true" /> <strong>View only</strong>: people can open it in the app but can't download it</span>
          </label>
          {!viewable && (
            <small className="share-hint">Only PDFs and images can be view only, because they open inside the app. Save the document as a PDF to restrict it.</small>
          )}
        </div>
      </div>
      {error && <div className="share-error" role="alert">{error}</div>}
      <div className="share-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Upload size={16} /> {busy ? `Sharing… ${progress}%` : "Share file"}
        </button>
      </div>
    </form>
  );
}

export default function SheFiles() {
  const { user } = useAuth();
  const { notify, confirm } = useFeedback();
  const canShare = ["admin", "super_admin", "she_team"].includes(user?.role);
  const newIds = useNewItems("she_files");

  const [files, setFiles] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [open, setOpen] = useState(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await sheFilesApi.list();
      setFiles(res.data || []);
      setError("");
    } catch (err) {
      setError(await errorText(err, "Could not load the files."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (canShare) sitesApi.getAll().then((r) => setSites(r.data || [])).catch(() => setSites([]));
  }, [canShare]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => [f.title, f.description, f.filename, f.uploaded_by_name].some((t) => (t || "").toLowerCase().includes(q)));
  }, [files, query]);

  const download = async (f) => {
    try {
      await sheFilesApi.download(f.id, f.filename);
    } catch (err) {
      notify(await errorText(err, "The file couldn't be downloaded."), "error");
    }
  };

  const remove = async (f) => {
    const ok = await confirm({
      title: "Delete this file?", message: `"${f.title}" will be removed for everyone it was shared with.`,
      confirmLabel: "Delete file", danger: true,
    });
    if (!ok) return;
    try {
      await sheFilesApi.delete(f.id);
      setFiles((list) => list.filter((x) => x.id !== f.id));
      notify("File deleted", "success");
    } catch (err) {
      notify(await errorText(err, "The file couldn't be deleted."), "error");
    }
  };

  if (loading) return <LoadingScreen message="Loading files..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">SHE Files</h1>
          <p className="page-subtitle">
            {canShare
              ? "Share procedures, forms, reports and other documents with site managers, the SHE team and admins."
              : "Documents shared with you by the SHE team and admins."}
          </p>
        </div>
        {canShare && !sharing && (
          <button type="button" className="btn btn-primary" onClick={() => setSharing(true)}>
            <Upload size={16} /> Share a file
          </button>
        )}
      </div>

      {sharing && (
        <ShareForm sites={sites} onCancel={() => setSharing(false)}
          onShared={(f) => { setSharing(false); setFiles((list) => [f, ...list]); }} />
      )}

      {error && <div className="card" role="alert" style={{ padding: 16, marginBottom: 16, color: "#991B1B" }}>{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="card-title">{files.length} file{files.length === 1 ? "" : "s"}</div>
          <div className="files-search">
            <Search size={16} aria-hidden="true" />
            <input className="form-control" placeholder="Search files..." aria-label="Search files" value={query}
              onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        {shown.length === 0 ? (
          <div className="files-empty">
            {files.length === 0
              ? canShare ? "Nothing shared yet. Use “Share a file” to send a document." : "No files have been shared with you yet."
              : "No files match your search."}
          </div>
        ) : (
          <ul className="files-list">
            {shown.map((f) => {
              return (
                <li key={f.id} className="files-row">
                  <GlowFileIcon filename={f.filename} />
                  <div className="files-main">
                    <div className="files-title">
                      {f.title}
                      {newIds.has(f.id) && <span className="badge-new">NEW</span>}
                      {f.view_only && <span className="badge badge-amber files-lock"><Lock size={11} aria-hidden="true" /> View only</span>}
                    </div>
                    {f.description && <div className="files-desc">{f.description}</div>}
                    <div className="files-meta">
                      {f.filename} · {fmtSize(f.size)} · shared by {f.uploaded_by_name} on {fmtDate(f.created_at)}
                      {" · for "}
                      {f.audience.map((a) => AUDIENCE_LABEL[a] || a).join(", ")}
                      {f.site_name ? ` (${f.site_name})` : ""}
                    </div>
                  </div>
                  <div className="files-actions">
                    {f.can_view && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(f)} aria-label={`Open ${f.title}`}>
                        <Eye size={15} /> Open
                      </button>
                    )}
                    {f.can_download && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => download(f)} aria-label={`Download ${f.title}`}>
                        <Download size={15} /> Download
                      </button>
                    )}
                    {f.can_delete && (
                      <button type="button" className="btn btn-outline btn-sm files-delete" onClick={() => remove(f)} aria-label={`Delete ${f.title}`}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open && <FileViewer file={open} onClose={() => setOpen(null)} onDownload={download} />}
    </div>
  );
}

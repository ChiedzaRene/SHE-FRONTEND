import React, { useRef, useState } from "react";
import { Paperclip, Eye, Download, Trash2 } from "lucide-react";
import { incidentsApi } from "../../api/endpoints";
import FileViewer from "../FileViewer";
import GlowFileIcon from "../GlowFileIcon";

export const EVIDENCE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";

const sizeOf = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const detailOf = (err, fallback) => {
  const detail = err.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
};

// Evidence attached to an incident: supporting documents, witness or victim reports, pictures, sketch diagrams.
export default function EvidenceFiles({ incident, canAdd, canRemove, onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const files = incident.files || [];

  const add = async (picked) => {
    setBusy(true);
    setError("");
    let latest = null;
    try {
      for (const file of picked) {
        latest = (await incidentsApi.addFile(incident.id, file)).data;
      }
    } catch (err) {
      setError(detailOf(err, "A file couldn't be attached."));
    } finally {
      if (latest) onChange(latest);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (file) => {
    setError("");
    try {
      onChange((await incidentsApi.removeFile(incident.id, file.id)).data);
    } catch (err) {
      setError(detailOf(err, "The file couldn't be removed."));
    }
  };

  const download = (file) => incidentsApi.downloadFile(incident.id, file.id, file.filename)
    .catch(() => setError("The file couldn't be downloaded."));

  return (
    <div className="inc-evidence">
      {files.length === 0 ? (
        <p className="inc-muted">No evidence files attached yet.</p>
      ) : (
        <ul className="inc-file-list">
          {files.map((f) => (
            <li key={f.id}>
              <GlowFileIcon filename={f.filename} />
              <span className="inc-file-name">{f.filename} <small>{sizeOf(f.size)}</small></span>
              {f.viewable && (
                <button type="button" className="btn btn-sm btn-outline" aria-label={`Open ${f.filename}`} onClick={() => setOpen(f)}>
                  <Eye size={14} />
                </button>
              )}
              <button type="button" className="btn btn-sm btn-outline" aria-label={`Download ${f.filename}`} onClick={() => download(f)}>
                <Download size={14} />
              </button>
              {canRemove(f) && (
                <button type="button" className="btn btn-sm btn-outline" aria-label={`Remove ${f.filename}`} onClick={() => remove(f)}>
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <>
          <input ref={input} type="file" multiple hidden accept={EVIDENCE_ACCEPT} aria-label="Attach evidence files"
            onChange={(e) => e.target.files.length && add([...e.target.files])} />
          <button type="button" className="btn btn-sm btn-outline" disabled={busy || files.length >= 20}
            onClick={() => input.current?.click()}>
            <Paperclip size={14} /> {busy ? "Attaching…" : "Attach evidence"}
          </button>
        </>
      )}
      {error && <div role="alert" className="inc-error">{error}</div>}
      {open && (
        <FileViewer file={{ id: open.id, title: open.filename, filename: open.filename, content_type: open.content_type, can_download: true }}
          onClose={() => setOpen(null)} onDownload={download} load={() => incidentsApi.viewFile(incident.id, open.id)} />
      )}
    </div>
  );
}

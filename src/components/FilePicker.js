import React, { useRef } from "react";
import { Paperclip, X } from "lucide-react";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";
const sizeOf = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Several files chosen before a form is sent: add more (in one go or a few at a time) and remove any.
export default function FilePicker({ id, label, files, onChange, max = 10, accept = ACCEPT }) {
  const input = useRef(null);
  const add = (list) => {
    const known = new Set(files.map((f) => `${f.name}:${f.size}`));
    const fresh = Array.from(list || []).filter((f) => !known.has(`${f.name}:${f.size}`));
    onChange([...files, ...fresh].slice(0, max));
  };
  return (
    <div className="file-picker">
      <button type="button" className="btn btn-outline btn-sm" onClick={() => input.current?.click()} disabled={files.length >= max}>
        <Paperclip size={14} /> {files.length ? "Add more files" : "Choose files"}
      </button>
      <span className="tt-muted"> {files.length} of up to {max}</span>
      <input ref={input} id={id} type="file" multiple hidden accept={accept} aria-label={label}
        onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {files.length > 0 && (
        <ul className="file-picker-list" aria-label="Chosen files">
          {files.map((f, i) => (
            <li key={`${f.name}:${f.size}:${i}`}>
              <span>{f.name} <span className="tt-muted">({sizeOf(f.size)})</span></span>
              <button type="button" className="btn-icon btn-outline" aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

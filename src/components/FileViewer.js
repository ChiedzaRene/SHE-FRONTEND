import React, { useEffect, useRef, useState } from "react";
import { X, Download, Lock } from "lucide-react";
import { sheFilesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

// pdf.js draws each page onto a canvas, so a PDF opens without the browser's own viewer
// (and its download and print buttons). Loaded only when a PDF is opened.
const loadPdfJs = async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
};

function PdfPages({ blob, onError }) {
  const holder = useRef(null);
  useEffect(() => {
    const el = holder.current;
    let cancelled = false;
    let doc = null;
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const data = new Uint8Array(await blob.arrayBuffer());
        doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
        const width = Math.min(el?.clientWidth || 800, 1000);
        for (let n = 1; n <= doc.numPages && !cancelled; n += 1) {
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = (width / base.width) * (window.devicePixelRatio || 1);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${width}px`;
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `Page ${n} of ${doc.numPages}`);
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          if (cancelled) return;
          el?.appendChild(canvas);
        }
      } catch (e) {
        if (!cancelled) onError("This PDF couldn't be shown.");
      }
    })();
    return () => {
      cancelled = true;
      if (doc) doc.destroy();
      if (el) el.innerHTML = "";
    };
  }, [blob, onError]);
  return <div className="viewer-pages" ref={holder} />;
}

// Opens a shared file inside the app. View-only files get no download button and carry the
// viewer's name across the page, so a screenshot shows who it came from.
export default function FileViewer({ file, onClose, onDownload }) {
  const { user } = useAuth();
  const [blob, setBlob] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState("");
  const isPdf = file.content_type === "application/pdf";

  useEffect(() => {
    let live = true;
    sheFilesApi
      .view(file.id)
      .then((res) => {
        if (!live) return;
        setBlob(res.data);
        if (!isPdf) setImageUrl(URL.createObjectURL(res.data));
      })
      .catch(() => live && setError("The file couldn't be opened."));
    return () => { live = false; };
  }, [file.id, isPdf]);

  useEffect(() => () => imageUrl && URL.revokeObjectURL(imageUrl), [imageUrl]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mark = `${user?.full_name || user?.sub || ""} · ${new Date().toLocaleDateString()} · view only`;
  const block = (e) => e.preventDefault();

  return (
    <div className="modal-overlay viewer-overlay" onClick={onClose}>
      <div className="viewer" role="dialog" aria-modal="true" aria-label={file.title} onClick={(e) => e.stopPropagation()}>
        <div className="viewer-head">
          <div style={{ minWidth: 0 }}>
            <div className="viewer-title">{file.title}</div>
            <div className="viewer-sub">
              {file.filename}
              {file.view_only && (
                <span className="badge badge-amber" style={{ marginLeft: 8 }}>
                  <Lock size={11} aria-hidden="true" /> View only
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {file.can_download && (
              <button type="button" className="btn btn-outline" onClick={() => onDownload(file)}>
                <Download size={16} /> Download
              </button>
            )}
            <button type="button" className="btn btn-outline" onClick={onClose} aria-label="Close viewer">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className={`viewer-body${file.view_only ? " protected" : ""}`} onContextMenu={file.view_only ? block : undefined}
          onDragStart={block}>
          <div className="viewer-content">
          {error ? (
            <div className="viewer-message" role="alert">{error}</div>
          ) : !blob ? (
            <div className="viewer-message">Opening…</div>
          ) : isPdf ? (
            <PdfPages blob={blob} onError={setError} />
          ) : (
            <img src={imageUrl} alt={file.title} className="viewer-image" draggable={false} />
          )}
          {file.view_only && (
            <div className="viewer-watermark" aria-hidden="true">
              {Array.from({ length: 60 }, (_, i) => <span key={i}>{mark}</span>)}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

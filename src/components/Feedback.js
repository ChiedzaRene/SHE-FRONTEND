import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// In-app replacement for the browser's alert() and confirm() pop-ups.
//   const { notify, confirm } = useFeedback();
//   notify("Saved");                       notify("Could not save", "error");
//   if (await confirm({ title, message, confirmLabel, danger: true })) { ... }
const FeedbackContext = createContext(null);

export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return ctx;
};

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const nextId = useRef(1);
  const confirmBtn = useRef(null);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback((message, type = "info") => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, message: String(message), type }]);
    setTimeout(() => dismiss(id), type === "error" ? 8000 : 4500);
  }, [dismiss]);

  const confirm = useCallback(
    (options) => new Promise((resolve) => setDialog({ ...options, resolve })),
    []
  );

  const answer = useCallback((value) => {
    setDialog((d) => {
      if (d) d.resolve(value);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => e.key === "Escape" && answer(false);
    document.addEventListener("keydown", onKey);
    confirmBtn.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog, answer]);

  return (
    <FeedbackContext.Provider value={{ notify, confirm }}>
      {children}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role={t.type === "error" ? "alert" : "status"}>
            <span>{t.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="modal-overlay" onClick={() => answer(false)}>
          <div
            className="modal confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" id="confirm-title">{dialog.title || "Are you sure?"}</h3>
            </div>
            <div className="confirm-body">{dialog.message}</div>
            <div className="confirm-actions">
              <button type="button" className="btn btn-outline" onClick={() => answer(false)}>
                {dialog.cancelLabel || "Cancel"}
              </button>
              <button
                type="button"
                ref={confirmBtn}
                className={`btn ${dialog.danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => answer(true)}
              >
                {dialog.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

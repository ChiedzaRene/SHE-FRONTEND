import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { IDLE_MS, WARNING_MS, idleNotice, lastActive, markActive } from "../utils/idle";

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "wheel"];
const RECORD_EVERY_MS = 15 * 1000; // no need to write on every mouse movement

// Signs the person out after a period without activity, with a one-minute warning first.
export default function IdleGuard() {
  const { user, logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(null); // shown while the warning is up
  const lastWrite = useRef(0);
  const stayButton = useRef(null);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastWrite.current < RECORD_EVERY_MS) return;
    lastWrite.current = now;
    markActive(now);
  }, []);

  const stay = useCallback(() => {
    lastWrite.current = Date.now();
    markActive(lastWrite.current);
    setSecondsLeft(null);
  }, []);

  const check = useCallback(() => {
    const last = lastActive() ?? Date.now();
    const idle = Date.now() - last;
    if (idle >= IDLE_MS) {
      setSecondsLeft(null);
      logout(idleNotice());
    } else if (idle >= IDLE_MS - WARNING_MS) {
      setSecondsLeft(Math.ceil((IDLE_MS - idle) / 1000));
    } else {
      setSecondsLeft(null);
    }
  }, [logout]);

  useEffect(() => {
    if (!user) return undefined;
    // While the warning is up only an explicit "Stay signed in" counts, so a bumped mouse doesn't hide it
    const onActivity = () => { if (secondsLeft === null) recordActivity(); };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    // Timers are slowed down in background tabs and stop while a computer sleeps: re-check on return
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    // Signed out in another tab (by hand or for inactivity): follow suit here
    const onStorage = (e) => {
      if (e.key === "token" && !e.newValue) logout("You were signed out in another tab. Please sign in again.");
    };
    window.addEventListener("storage", onStorage);
    const timer = setInterval(check, 1000);
    check();
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", onStorage);
      clearInterval(timer);
    };
  }, [user, secondsLeft, recordActivity, check, logout]);

  const warning = secondsLeft !== null;
  useEffect(() => { if (warning) stayButton.current?.focus(); }, [warning]);

  if (!user || !warning) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 2600 }}>
      <div className="modal confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-text">
        <div className="modal-header">
          <h3 className="modal-title" id="idle-title">Are you still there?</h3>
        </div>
        <div className="confirm-body" id="idle-text">
          For security, you'll be signed out in <strong>{secondsLeft} second{secondsLeft === 1 ? "" : "s"}</strong> because
          there has been no activity.
        </div>
        <div className="confirm-actions">
          <button type="button" className="btn btn-outline" onClick={() => logout("You signed out.")}>
            Sign out now
          </button>
          <button type="button" ref={stayButton} className="btn btn-primary" onClick={stay}>
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}

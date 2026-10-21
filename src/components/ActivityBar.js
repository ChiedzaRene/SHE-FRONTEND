import React, { useEffect, useState } from "react";
import { subscribeToActivity } from "../api/axios";

const SHOW_AFTER_MS = 250;   // quick requests don't flash the bar
const SLOW_AFTER_MS = 6000;  // then explain why it is taking a while

// A thin bar across the top while anything is loading or saving, plus a note when it's slow
// (the hosted server goes to sleep when idle and can take up to a minute to wake).
export default function ActivityBar() {
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => subscribeToActivity((pending) => setBusy(pending > 0)), []);

  useEffect(() => {
    if (!busy) {
      setVisible(false);
      setSlow(false);
      return undefined;
    }
    const show = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(slowTimer);
    };
  }, [busy]);

  if (!visible) return null;
  return (
    <>
      <div className="activity-bar" role="progressbar" aria-label="Working" />
      {slow && (
        <div className="activity-slow" role="status">
          Still working... the server may be waking up after a quiet spell. This can take up to a minute.
        </div>
      )}
    </>
  );
}

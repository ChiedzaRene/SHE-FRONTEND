import React from "react";
import emblem from "../assets/glow-emblem.png";

// Branded "please wait" screen used while the app or a page is loading.
// fullPage covers the whole window (app start-up); otherwise it fills the content area.
export default function LoadingScreen({ message = "Loading...", fullPage = false }) {
  return (
    <div className={`splash${fullPage ? " splash-full" : ""}`} role="status" aria-live="polite">
      <div className="splash-mark">
        <span className="splash-ring" aria-hidden="true" />
        <img src={emblem} alt="" width={56} height={56} />
      </div>
      {fullPage && <div className="splash-title">Glow SHE</div>}
      <div className="splash-message">{message}</div>
    </div>
  );
}

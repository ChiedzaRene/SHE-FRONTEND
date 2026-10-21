import React from "react";
import { Bell, X } from "lucide-react";
import { useNotifications } from "../context/NotificationsContext";
import { useAuth } from "../context/AuthContext";
import { timeAgo } from "./NotificationBell";

// The newest notification pops up when it comes in and stays until it is clicked (which opens the
// notifications list) or closed. Older ones wait in the list.
export default function NotificationPopup() {
  const { popup, dismissPopup, panelOpen, setPanelOpen } = useNotifications();
  const { user } = useAuth();
  if (!user || user.mcp || !popup || panelOpen) return null;

  const open = () => {
    dismissPopup();
    setPanelOpen(true);
  };

  return (
    <div className="notif-popup" role="status" aria-live="polite">
      <button type="button" className="notif-popup-body" onClick={open}
        aria-label={`New notification: ${popup.title}. Open notifications`}>
        <span className="notif-popup-icon" aria-hidden="true"><Bell size={18} /></span>
        <span className="notif-popup-text">
          <span className="notif-popup-kicker">New notification · {timeAgo(popup.created_at)}</span>
          <span className="notif-popup-title">{popup.title}</span>
          {popup.message && <span className="notif-popup-message">{popup.message}</span>}
          <span className="notif-popup-hint">Click to see your notifications</span>
        </span>
      </button>
      <button type="button" className="notif-popup-close" aria-label="Dismiss notification" onClick={dismissPopup}>
        <X size={16} />
      </button>
    </div>
  );
}

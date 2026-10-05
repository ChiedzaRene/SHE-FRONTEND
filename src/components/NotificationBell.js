import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "../context/NotificationsContext";
import { useAuth } from "../context/AuthContext";

const timeAgo = (iso) => {
  if (!iso) return "";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

// placement: "sidebar" (computers) or "topbar" (phones and tablets)
export default function NotificationBell({ placement = "sidebar" }) {
  const { items, unread, markRead } = useNotifications();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => root.current && !root.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Pages that flag NEW records mark their notifications read themselves (after showing the flag),
  // so opening one of those from here must leave it unread until the page has loaded.
  const FLAGGING_PAGES = { incidents: "/incidents", corrective_actions: "/corrective-actions", audits: "/audits" };

  const openItem = (n) => {
    setOpen(false);
    const pageFlagsIt = FLAGGING_PAGES[n.resource] === n.link && n.link !== pathname;
    if (!n.read_at && !pageFlagsIt) markRead({ ids: [n.id] });
    if (n.link && n.link !== pathname) navigate(n.link);
  };

  if (!user || user.mcp) return null; // nothing to see until a temporary password is replaced
  const label = unread ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <div className={`notif notif-${placement}`} ref={root}>
      <button type="button" className="notif-button" aria-label={label} aria-expanded={open} aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}>
        <Bell size={20} />
        {unread > 0 && <span className="notif-count" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="notif-link" onClick={() => markRead({ all: true })}>
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">You're all caught up.</div>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`notif-item${n.read_at ? "" : " unread"}`} onClick={() => openItem(n)}>
                    {!n.read_at && <span className="notif-dot" aria-label="Unread" />}
                    <span className="notif-text">
                      <span className="notif-title">{n.title}</span>
                      {n.message && <span className="notif-message">{n.message}</span>}
                      <span className="notif-time">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

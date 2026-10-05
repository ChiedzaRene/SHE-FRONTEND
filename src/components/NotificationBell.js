import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Mail, MailOpen } from "lucide-react";
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
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

// When it happened, e.g. "Today, 14:32", "Yesterday, 09:05", "Mon 5 Oct, 14:32" (year added if not this year)
const whenHappened = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Yesterday, ${time}`;
  const date = d.toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
  return `${date}, ${time}`;
};

const KEEP_AFTER_READING_MS = 24 * 3600 * 1000; // the server removes opened notifications after this long

const removalNote = (readAt) => {
  const left = new Date(readAt).getTime() + KEEP_AFTER_READING_MS - Date.now();
  if (left <= 60 * 60 * 1000) return "removed within the hour";
  return `removed in ${Math.ceil(left / 3600000)} h`;
};

// placement: "sidebar" (computers) or "topbar" (phones and tablets)
export default function NotificationBell({ placement = "sidebar" }) {
  const { items, unread, markRead, markUnread } = useNotifications();
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
            <span className="notif-actions">
              {unread > 0 && (
                <button type="button" className="notif-link" onClick={() => markRead({ all: true })}>
                  Mark all as read
                </button>
              )}
              {items.some((n) => n.read_at) && (
                <button type="button" className="notif-link" onClick={() => markUnread({ all: true })}>
                  Mark all as unread
                </button>
              )}
            </span>
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">You're all caught up.</div>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id} className={`notif-row${n.read_at ? "" : " unread"}`}>
                  <button type="button" className="notif-item" onClick={() => openItem(n)}>
                    {!n.read_at && <span className="notif-dot" aria-hidden="true" />}
                    <span className="notif-text">
                      <span className="notif-title">{n.title}{!n.read_at && <span className="sr-only"> (unread)</span>}</span>
                      {n.message && <span className="notif-message">{n.message}</span>}
                      <span className="notif-time">
                        <time dateTime={n.created_at} title={n.created_at ? new Date(n.created_at).toLocaleString() : ""}>
                          {whenHappened(n.created_at)}
                        </time>
                        {" · "}{timeAgo(n.created_at)}
                        {n.read_at && <> · opened, {removalNote(n.read_at)}</>}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="notif-toggle"
                    aria-label={n.read_at ? `Mark "${n.title}" as unread` : `Mark "${n.title}" as read`}
                    title={n.read_at ? "Mark as unread" : "Mark as read"}
                    onClick={() => (n.read_at ? markUnread({ ids: [n.id] }) : markRead({ ids: [n.id] }))}
                  >
                    {n.read_at ? <Mail size={15} /> : <MailOpen size={15} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="notif-foot">Opened notifications are removed after 24 hours.</div>
        </div>
      )}
    </div>
  );
}

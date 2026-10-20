import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { notificationsApi } from "../api/endpoints";
import { useAuth } from "./AuthContext";

const POLL_MS = 60 * 1000; // check for new notifications every minute while the app is open

const NotificationsContext = createContext({
  items: [], unread: 0, refresh: () => {}, markRead: async () => {}, markUnread: async () => {},
  panelOpen: false, setPanelOpen: () => {}, popup: null, dismissPopup: () => {},
});

// The newest notification pops up on screen and stays until it is clicked or closed.
// Remember (per person, in this browser) the newest one already dealt with, so it doesn't pop up again.
const poppedKey = (user) => `notif-popped-${user?.user_id ?? user?.sub ?? "anon"}`;
const readPopped = (user) => {
  try {
    return Number(localStorage.getItem(poppedKey(user))) || 0;
  } catch (e) {
    return 0;
  }
};
const writePopped = (user, id) => {
  try {
    localStorage.setItem(poppedKey(user), String(id));
  } catch (e) {
    // private window or storage blocked: the pop-up just shows again next visit
  }
};

export const useNotifications = () => useContext(NotificationsContext);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [popped, setPopped] = useState(() => readPopped(user));
  const busy = useRef(false);

  useEffect(() => { setPopped(readPopped(user)); }, [user]);

  const refresh = useCallback(async () => {
    if (!user || user.mcp || busy.current) return;
    busy.current = true;
    try {
      const res = await notificationsApi.list({ limit: 30 });
      setItems(res.data?.items || []);
      setUnread(res.data?.unread || 0);
    } catch (e) {
      // a missed check is harmless; the next one will catch up
    } finally {
      busy.current = false;
    }
  }, [user]);

  const markRead = useCallback(async (body) => {
    try {
      await notificationsApi.markRead(body);
    } catch (e) {
      return;
    }
    refresh();
  }, [refresh]);

  const markUnread = useCallback(async (body) => {
    try {
      await notificationsApi.markUnread(body);
    } catch (e) {
      return;
    }
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      return undefined;
    }
    refresh();
    const timer = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, refresh]);

  // Only the most recent notification pops up, and only while it is unread and not yet dismissed
  const newest = items[0];
  const popup = newest && !newest.read_at && newest.id > popped ? newest : null;
  const dismissPopup = useCallback(() => {
    if (!newest) return;
    writePopped(user, newest.id);
    setPopped(newest.id);
  }, [newest, user]);

  return (
    <NotificationsContext.Provider
      value={{ items, unread, refresh, markRead, markUnread, panelOpen, setPanelOpen, popup, dismissPopup }}>
      {children}
    </NotificationsContext.Provider>
  );
}

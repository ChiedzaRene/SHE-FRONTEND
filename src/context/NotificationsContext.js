import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { notificationsApi } from "../api/endpoints";
import { useAuth } from "./AuthContext";

const POLL_MS = 60 * 1000; // check for new notifications every minute while the app is open

const NotificationsContext = createContext({
  items: [], unread: 0, refresh: () => {}, markRead: async () => {}, markUnread: async () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const busy = useRef(false);

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

  return (
    <NotificationsContext.Provider value={{ items, unread, refresh, markRead, markUnread }}>
      {children}
    </NotificationsContext.Provider>
  );
}

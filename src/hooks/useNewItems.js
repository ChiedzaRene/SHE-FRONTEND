import { useEffect, useState } from "react";
import { notificationsApi } from "../api/endpoints";
import { useNotifications } from "../context/NotificationsContext";

// Ids of records in `resource` ("incidents", "corrective_actions", "audits") the person was notified about
// and hasn't seen yet. They stay flagged NEW while the page is open; the notifications are marked read.
export default function useNewItems(resource) {
  const { markRead } = useNotifications();
  const [newIds, setNewIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await notificationsApi.list({ resource, unread_only: true, limit: 200 });
        const ids = new Set((res.data?.items || []).map((n) => n.resource_id).filter((id) => id != null));
        if (cancelled) return;
        setNewIds(ids);
        if (ids.size) markRead({ resource });
      } catch (e) {
        // no flags is fine
      }
    })();
    return () => { cancelled = true; };
  }, [resource, markRead]);

  return newIds;
}

// Newest first: records get increasing ids as they are created
export const newestFirst = (list) => [...(list || [])].sort((a, b) => (b.id || 0) - (a.id || 0));

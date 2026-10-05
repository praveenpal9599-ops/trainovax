import { useCallback, useEffect, useState } from 'react';
import { messageService, notificationService } from '../../services';

/** Polls unread message + notification counts (every 45s and on window focus). */
export default function useUnreadCounts() {
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });
  const refresh = useCallback(async () => {
    try {
      const [messages, n] = await Promise.all([messageService.unreadCount(), notificationService.list({ pageSize: 1 })]);
      setCounts({ messages, notifications: n.meta.unread });
    } catch { /* offline — ignore */ }
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 45000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('counts:refresh', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); window.removeEventListener('counts:refresh', onFocus); };
  }, [refresh]);
  return { ...counts, refresh };
}
export const refreshCounts = () => window.dispatchEvent(new Event('counts:refresh'));

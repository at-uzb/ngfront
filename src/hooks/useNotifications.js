import { useState, useCallback, useRef } from 'react';
import api from '../lib/api';

/**
 * useNotifications
 *
 * Manages fetching, marking-read, and marking-all-read for notifications.
 * The unread COUNT comes from user.unread_notifications (already in AuthContext).
 * The full list is loaded lazily — only when the drawer opens.
 */
export const useNotifications = ({ onCountChange } = {}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false); // avoid duplicate fetches on double-render

  // ── Fetch list ──────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (force = false) => {
    if (loading) return;
    if (fetchedRef.current && !force) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/notifications/');
      // Support both paginated { results: [] } and plain array responses
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setNotifications(list);
      fetchedRef.current = true;
    } catch (err) {
      setError('Failed to load notifications');
      console.error('fetchNotifications:', err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // ── Mark single as read ─────────────────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await api.post(`/notifications/${id}/read/`);
      onCountChange?.(); // tell AuthContext to re-fetch user so the dot count drops
    } catch (err) {
      // Roll back on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
      console.error('markRead:', err);
    }
  }, [onCountChange]);

  // ── Mark all as read ────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.post('/notifications/read-all/');
      onCountChange?.();
    } catch (err) {
      setNotifications(previous);
      console.error('markAllRead:', err);
    }
  }, [notifications, onCountChange]);

  // ── Reset on close so re-open always re-fetches fresh data ─────────────────
  const reset = useCallback(() => {
    fetchedRef.current = false;
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    loading,
    error,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
    reset,
  };
};
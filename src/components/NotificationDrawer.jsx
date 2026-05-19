import { useEffect, useRef, useCallback } from 'react'
import { X, Bell, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import '../assets/NotificationDrawer.css'
import { useNavigate } from 'react-router-dom'
// ── Icon per notification type ──────────────────────────────────────────────
const TYPE_ICON = {
  info:    <Info size={14} strokeWidth={1.8} />,
  warning: <AlertTriangle size={14} strokeWidth={1.8} />,
  error:   <AlertCircle size={14} strokeWidth={1.8} />,
  success: <CheckCircle size={14} strokeWidth={1.8} />,
}

const typeIcon = (type) => TYPE_ICON[type] ?? TYPE_ICON.info

// ── Relative time helper ────────────────────────────────────────────────────
const relativeTime = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  <  1) return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  <  7) return `${days}d ago`
  return new Date(isoString).toLocaleDateString()
}

// ── Component ───────────────────────────────────────────────────────────────
const NotificationDrawer = ({
  open,
  onClose,
  notifications = [],
  loading,
  error,
  onMarkRead,
  onMarkAllRead,
}) => {
  const drawerRef  = useRef(null)
  const touchStart = useRef(null)
  const navigate = useNavigate()
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // ── Touch swipe-right to close ───────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    touchStart.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (touchStart.current === null) return
    const delta = e.changedTouches[0].clientX - touchStart.current
    if (delta > 60) onClose()               // swiped right ≥ 60 px → close
    touchStart.current = null
  }, [onClose])

  const unread = notifications.filter((n) => !n.is_read).length

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`nd-backdrop ${open ? 'nd-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer ── */}
      <aside
        ref={drawerRef}
        className={`nd-drawer ${open ? 'nd-drawer--open' : ''}`}
        aria-label="Notifications"
        aria-hidden={!open}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="nd-header">
          <div className="nd-header-left">
            <Bell size={15} strokeWidth={1.8} className="nd-header-icon" />
            <span className="nd-title">Notifications</span>
            {unread > 0 && (
              <span className="nd-badge">{unread > 99 ? '99+' : unread}</span>
            )}
          </div>
          <div className="nd-header-right">
            {unread > 0 && (
              <button
                className="nd-mark-all"
                onClick={onMarkAllRead}
                title="Mark all as read"
              >
                <CheckCheck size={14} strokeWidth={1.8} />
                <span>Mark all read</span>
              </button>
            )}
            <button className="nd-close" onClick={onClose} aria-label="Close notifications">
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="nd-body">
          {loading && (
            <div className="nd-state">
              <div className="nd-spinner" />
              <span>Loading…</span>
            </div>
          )}

          {!loading && error && (
            <div className="nd-state nd-state--error">
              <AlertCircle size={20} strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="nd-state nd-state--empty">
              <Bell size={28} strokeWidth={1.2} className="nd-empty-icon" />
              <span className="nd-empty-title">All caught up</span>
              <span className="nd-empty-sub">No notifications yet</span>
            </div>
          )}

          {!loading && !error && notifications.length > 0 && (
            <ul className="nd-list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`nd-item ${!n.is_read ? 'nd-item--unread' : ''} nd-item--${n.type ?? 'info'}`}
                  onClick={() => {
                    if (!n.is_read) onMarkRead(n.id)
                    if ((n.type === 'info' || n.type === 'success') && n.data?.task_id) {
                      onClose()
                      navigate(`/tasks/${n.data.task_id}`)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (!n.is_read) onMarkRead(n.id)
                      if ((n.type === 'info' || n.type === 'success') && n.data?.task_id) {
                        onClose()
                        navigate(`/tasks/${n.data.task_id}`)
                      }
                    }
                  }}
                >
                  <span className="nd-item-icon">{typeIcon(n.type)}</span>
                  <div className="nd-item-body">
                    <span className="nd-item-title">{n.title}</span>
                    <span className="nd-item-msg">{n.message}</span>
                    <span className="nd-item-time">{relativeTime(n.created_at)}</span>
                  </div>
                  {!n.is_read && <span className="nd-unread-dot" aria-label="Unread" />}
                  {(n.type === 'info' || n.type === 'success') && n.data?.task_id && (
                    <span className="nd-item-chevron">›</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}

export default NotificationDrawer
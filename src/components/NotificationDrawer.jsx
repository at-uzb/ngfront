import { useEffect, useRef, useCallback } from 'react'
import { X, Bell, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import '../assets/NotificationDrawer.css'
import { useNavigate } from 'react-router-dom'

const TYPE_ICON = {
  info:    <Info size={14} strokeWidth={1.8} />,
  warning: <AlertTriangle size={14} strokeWidth={1.8} />,
  error:   <AlertCircle size={14} strokeWidth={1.8} />,
  success: <CheckCircle size={14} strokeWidth={1.8} />,
}

const typeIcon = (type) => TYPE_ICON[type] ?? TYPE_ICON.info

const relativeTime = (isoString) => {
  const diff  = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  <  1) return 'Hozirgina'
  if (mins  < 60) return `${mins} daqiqa oldin`
  if (hours < 24) return `${hours} soat oldin`
  if (days  <  7) return `${days} kun oldin`
  return new Date(isoString).toLocaleDateString()
}

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
  const navigate   = useNavigate()

  const isDark = document.querySelector('.app')?.classList.contains('dark')
  const themeClass = isDark ? 'dark' : 'light'

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleTouchStart = useCallback((e) => {
    touchStart.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (touchStart.current === null) return
    const delta = e.changedTouches[0].clientX - touchStart.current
    if (delta > 60) onClose()
    touchStart.current = null
  }, [onClose])

  const unread = notifications.filter((n) => !n.is_read).length

  return (
    <>
      <div
        className={`nd-backdrop ${themeClass} ${open ? 'nd-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={drawerRef}
        className={`nd-drawer ${themeClass} ${open ? 'nd-drawer--open' : ''}`}
        aria-label="Bildirishnomalar"
        aria-hidden={!open}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* ── Header ── */}
        <div className="nd-header">
          <div className="nd-header-left">
            <Bell size={15} strokeWidth={1.8} className="nd-header-icon" />
            <span className="nd-title">Bildirishnomalar</span>
            {unread > 0 && (
              <span className="nd-badge">{unread > 99 ? '99+' : unread}</span>
            )}
          </div>
          <div className="nd-header-right">
            {unread > 0 && (
              <button
                className="nd-mark-all"
                onClick={onMarkAllRead}
                title="Barchasini o'qilgan deb belgilash"
              >
                <CheckCheck size={14} strokeWidth={1.8} />
                <span>Barchasini o'qildi</span>
              </button>
            )}
            <button
              className="nd-close"
              onClick={onClose}
              aria-label="Bildirishnomalarni yopish"
            >
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="nd-body">

          {loading && (
            <div className="nd-state">
              <div className="nd-spinner" />
              <span>Yuklanmoqda…</span>
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
              <span className="nd-empty-title">Hammasi o'qildi</span>
              <span className="nd-empty-sub">Hozircha bildirishnomalar yo'q</span>
            </div>
          )}

          {!loading && !error && notifications.length > 0 && (
            <ul className="nd-list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={[
                    'nd-item',
                    !n.is_read ? 'nd-item--unread' : '',
                    `nd-item--${n.type ?? 'info'}`,
                  ].filter(Boolean).join(' ')}
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
                  {!n.is_read && <span className="nd-unread-dot" aria-label="O'qilmagan" />}
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
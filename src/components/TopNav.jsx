import { useState, useCallback, useEffect } from 'react'
import { ArrowLeft, Bell, Sun, Moon } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import NotificationDrawer from './NotificationDrawer'
import { useNotifications } from '../hooks/useNotifications'

const getInitials = (name) => {
  if (!name) return 'ME'
  return name.trim().split(' ')
    .filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('')
}

const TopNav = ({ currentSection, inline, darkMode, toggleDarkMode, user, onUserRefresh }) => {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { notifications, loading, error, fetchNotifications, markRead, markAllRead } =
    useNotifications({ onCountChange: onUserRefresh })

  const openDrawer  = useCallback(() => { setDrawerOpen(true);  fetchNotifications() }, [fetchNotifications])
  const closeDrawer = useCallback(() => { setDrawerOpen(false) }, [])

  // Inject CSS into <head> once — avoids fighting with App.css cascade
  useEffect(() => {
    const id = 'topnav-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = CSS
    document.head.appendChild(el)
  }, [])

  const notifCount = user?.unread_notifications ?? 0

  return (
    <>
      <header className="top-nav">

        {/* Left — back or breadcrumb */}
        {inline ? (
          <button className="tn-back" onClick={() => navigate('/tasks')}>
            <ArrowLeft size={14} strokeWidth={2} />
          </button>
        ) : (
          <div className="tn-breadcrumb">
            <span className="tn-section">{currentSection}</span>
          </div>
        )}

        {/* Right controls */}
        <div className="tn-controls">

          {/* Bell */}
          <button className="tn-btn" aria-label="Bildirishnomalar" onClick={openDrawer}>
            <Bell size={15} strokeWidth={1.8} />
            {notifCount > 0 && <span className="tn-dot" />}
          </button>

          <div className="tn-divider" />

          {/* Theme toggle */}
          <button
            className="tn-btn"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Yorug\' rejim' : 'Qorong\'u rejim'}
          >
            {darkMode ? <Sun size={15} strokeWidth={1.8} /> : <Moon size={15} strokeWidth={1.8} />}
          </button>

          <div className="tn-divider" />

          {/* Avatar */}
          <Link to="/profile/" className="tn-avatar" title={user?.full_name ?? 'Profile'}>
            {user?.photo
              ? <img src={user.photo} alt={getInitials(user?.full_name)} className="tn-avatar-img" />
              : getInitials(user?.full_name)
            }
          </Link>

        </div>
      </header>

      <NotificationDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        notifications={notifications}
        loading={loading}
        error={error}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </>
  )
}

export default TopNav

// ── Styles ─────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root { --topnav-height: 52px; }

/* ── Color tokens ── */
.top-nav {
  --tn-bg:           #4F6EF7;
  --tn-text:         #ffffff;
  --tn-muted:        rgba(255,255,255,0.70);
  --tn-hover-bg:     rgba(255,255,255,0.12);
  --tn-hover-border: rgba(255,255,255,0.22);
  --tn-divider:      rgba(255,255,255,0.20);
  --tn-avatar-bg:    rgba(255,255,255,0.16);
  --tn-avatar-bord:  rgba(255,255,255,0.28);
  --tn-avatar-text:  #ffffff;
  --tn-dot:          #FCA5A5;
  --tn-dot-border:   #4F6EF7;
  --tn-back-border:  rgba(255,255,255,0.25);
}

/* ── Dark theme — deep navy ── */
.app.dark .top-nav,
.dark .top-nav {
  --tn-bg:           #1A1F35;
  --tn-text:         rgba(255,255,255,0.88);
  --tn-muted:        rgba(255,255,255,0.42);
  --tn-hover-bg:     rgba(255,255,255,0.07);
  --tn-hover-border: rgba(255,255,255,0.12);
  --tn-divider:      rgba(255,255,255,0.10);
  --tn-avatar-bg:    rgba(255,255,255,0.08);
  --tn-avatar-bord:  rgba(255,255,255,0.15);
  --tn-avatar-text:  rgba(255,255,255,0.70);
  --tn-dot:          #F87171;
  --tn-dot-border:   #1A1F35;
  --tn-back-border:  rgba(255,255,255,0.14);
}

/* ── Shell ── */
.top-nav {
  position: fixed; top: 0;
  left: var(--nav-width, 225px); right: 0;
  height: var(--topnav-height);
  background: var(--tn-bg);
  border-bottom: none;
  box-shadow: 0 1px 0 rgba(0,0,0,0.10);
  display: flex; align-items: center;
  padding: 0 20px; gap: 12px;
  z-index: 90;
  font-family: 'Inter', system-ui, sans-serif;
  transition: left 0.2s, background 0.25s;
}

@media (max-width: 1024px) and (min-width: 769px) { .top-nav { left: 64px; } }
@media (max-width: 768px)                          { .top-nav { left: 0; padding: 0 16px; } }

/* ── Back button ── */
.tn-back {
  display: flex; align-items: center; justify-content: center;
  height: 28px; width: 28px; border-radius: 8px;
  border: 1px solid var(--tn-back-border);
  background: transparent;
  color: var(--tn-muted); cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0; padding: 0;
}
.tn-back:hover { background: var(--tn-hover-bg); color: var(--tn-text); }

/* ── Breadcrumb ── */
.tn-breadcrumb {
  flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0;
}
.tn-section {
  font-size: 14px; font-weight: 500;
  color: var(--tn-text); letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Controls ── */
.tn-controls {
  display: flex; align-items: center; gap: 2px;
  flex-shrink: 0; margin-left: auto;
}

/* ── Icon buttons ── */
.tn-btn {
  width: 34px; height: 34px; border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tn-muted);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  position: relative; flex-shrink: 0; padding: 0;
}
.tn-btn:hover {
  background: var(--tn-hover-bg);
  border-color: var(--tn-hover-border);
  color: var(--tn-text);
}
.tn-btn:active { transform: scale(0.93); }

/* Notification dot */
.tn-dot {
  position: absolute; top: 7px; right: 7px;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--tn-dot);
  border: 1.5px solid var(--tn-dot-border);
  pointer-events: none;
  animation: tn-pulse 2.5s ease-in-out infinite;
}
@keyframes tn-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}

/* Divider */
.tn-divider {
  width: 1px; height: 18px;
  background: var(--tn-divider);
  margin: 0 4px; flex-shrink: 0;
}

/* ── Avatar ── */
.tn-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--tn-avatar-bg);
  border: 1.5px solid var(--tn-avatar-bord);
  display: flex; align-items: center; justify-content: center;
  font-size: 10.5px; font-weight: 700;
  color: var(--tn-avatar-text);
  cursor: pointer; flex-shrink: 0;
  letter-spacing: 0.04em; user-select: none;
  text-decoration: none; margin-left: 4px;
  transition: box-shadow 0.15s, transform 0.15s;
  overflow: hidden;
}
.tn-avatar:hover {
  box-shadow: 0 0 0 3px rgba(255,255,255,0.22);
  transform: scale(1.06);
}
.tn-avatar-img {
  width: 100%; height: 100%;
  border-radius: 50%; object-fit: cover;
}

@media (prefers-reduced-motion: reduce) {
  .tn-dot { animation: none; }
  .tn-avatar { transition: none; }
}
`
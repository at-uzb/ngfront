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

:root { --topnav-height: 7vh; }

/* ── Light — default ── */
.top-nav {
  --tn-bg:           rgba(255,255,255,0.82);
  --tn-border:       rgba(103,104,238,0.15);
  --tn-text:         #0f1117;
  --tn-muted:        #7b8296;
  --tn-hover-bg:     rgba(103,104,238,0.07);
  --tn-hover-border: rgba(103,104,238,0.22);
  --tn-divider:      rgba(103,104,238,0.12);
  --tn-avatar-bg:    rgba(103,104,238,0.10);
  --tn-avatar-bord:  rgba(103,104,238,0.22);
  --tn-avatar-text:  #6768EE;
  --tn-dot:          #ef4444;
  --tn-dot-border:   rgba(255,255,255,0.9);
  --tn-accent-bar:   #6768EE;
}

/* ── Dark — when .dark ancestor present ── */
.app.dark .top-nav,
.dark .top-nav {
  --tn-bg:           rgba(19,22,42,0.85);
  --tn-border:       rgba(131,132,243,0.22);
  --tn-text:         #e4e7f5;
  --tn-muted:        #6672a0;
  --tn-hover-bg:     rgba(103,104,238,0.14);
  --tn-hover-border: rgba(131,132,243,0.30);
  --tn-divider:      rgba(131,132,243,0.18);
  --tn-avatar-bg:    rgba(103,104,238,0.22);
  --tn-avatar-bord:  rgba(131,132,243,0.40);
  --tn-avatar-text:  #a5b4fc;
  --tn-dot:          #f87171;
  --tn-dot-border:   rgba(13,15,26,0.9);
  --tn-accent-bar:   #6768EE;
}

/* ── Shell ── */
.top-nav {
  position: fixed; top: 0;
  left: var(--nav-width, 225px); right: 0;
  height: var(--topnav-height);
  background: var(--tn-bg);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border-bottom: 1px solid var(--tn-border);

  /* Blue accent line at the very bottom */
  box-shadow: 0 2px 0 0 var(--tn-accent-bar),
              0 1px 24px rgba(103,104,238,0.10),
              inset 0 1px 0 rgba(131,132,243,0.08);

  display: flex; align-items: center;
  padding: 0 20px; gap: 12px;
  z-index: 90;
  font-family: 'Inter', system-ui, sans-serif;
  transition: left 0.2s, background 0.3s, border-color 0.3s;
}

@media (max-width: 1024px) and (min-width: 769px) { .top-nav { left: 64px; } }
@media (max-width: 768px)                          { .top-nav { left: 0; padding: 0 16px; } }

/* ── Back button ── */
.tn-back {
  display: flex; align-items: center; justify-content: center;
  height: 28px; width: 28px;
  border-radius: 8px;
  border: 1px solid var(--tn-hover-border);
  background: transparent;
  color: var(--tn-muted);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  padding: 0;
}

.tn-back:hover { background: var(--tn-hover-bg); color: var(--tn-text); }

/* ── Breadcrumb ── */
.tn-breadcrumb {
  flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0;
}

.tn-section {
  font-size: 13.5px; font-weight: 600;
  color: var(--tn-text);
  letter-spacing: -0.015em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Controls ── */
.tn-controls {
  display: flex; align-items: center; gap: 3px;
  flex-shrink: 0; margin-left: auto;
}

/* ── Icon buttons ── */
.tn-btn {
  width: 32px; height: 32px;
  border-radius: 9px;
  background: transparent;
  border: 1px solid transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--tn-muted);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  position: relative; flex-shrink: 0; padding: 0;
}

.tn-btn:hover {
  background: var(--tn-hover-bg);
  border-color: var(--tn-hover-border);
  color: var(--tn-text);
}

.tn-btn:active { transform: scale(0.94); }

/* Notification dot */
.tn-dot {
  position: absolute; top: 6px; right: 6px;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--tn-dot);
  border: 1.5px solid var(--tn-dot-border);
  pointer-events: none;
  animation: tn-pulse 2s ease-in-out infinite;
}

@keyframes tn-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
  50%       { box-shadow: 0 0 0 4px rgba(239,68,68,0); }
}

/* Divider */
.tn-divider {
  width: 1px; height: 16px;
  background: var(--tn-divider);
  margin: 0 3px; flex-shrink: 0;
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
  letter-spacing: 0.03em; user-select: none;
  text-decoration: none;
  transition: box-shadow 0.18s, transform 0.15s;
  overflow: hidden;
  margin-left: 3px;
}

.tn-avatar:hover {
  box-shadow: 0 0 0 3px rgba(103,104,238,0.18);
  transform: scale(1.06);
}

.tn-avatar-img {
  width: 100%; height: 100%;
  border-radius: 50%; object-fit: cover;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .top-nav {
    background: #6768EE;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-bottom: none;
    box-shadow: 0 2px 16px rgba(103,104,238,0.45);
  }

  .dark .top-nav {
    background: #5556d4;
    box-shadow: 0 2px 20px rgba(85,86,212,0.55);
  }

  .top-nav .tn-section { color: #ffffff; font-weight: 600; }

  .top-nav .tn-btn {
    color: rgba(255,255,255,0.75);
    border-color: transparent;
  }

  .top-nav .tn-btn:hover {
    background: rgba(255,255,255,0.14);
    border-color: rgba(255,255,255,0.18);
    color: #ffffff;
  }

  .top-nav .tn-back {
    color: rgba(255,255,255,0.80);
    border-color: rgba(255,255,255,0.22);
  }

  .top-nav .tn-back:hover {
    background: rgba(255,255,255,0.14);
    color: #ffffff;
  }

  .top-nav .tn-divider { background: rgba(255,255,255,0.22); }

  .top-nav .tn-dot { background: #fca5a5; border-color: #6768EE; }

  .top-nav .tn-avatar {
    background: rgba(255,255,255,0.20);
    border-color: rgba(255,255,255,0.30);
    color: #ffffff;
  }

  .top-nav .tn-avatar:hover {
    box-shadow: 0 0 0 3px rgba(255,255,255,0.20);
  }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .tn-dot { animation: none; }
  .tn-avatar { transition: none; }
}
`
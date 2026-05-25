import { useState, useCallback } from 'react'
import { ArrowLeft, Bell, Sun, Moon } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'  // ✅ ADDED: Link
import NotificationDrawer from './NotificationDrawer'
import { useNotifications } from '../hooks/useNotifications'
import '../assets/TopNav.css'

// ✅ ADDED: derive initials from full_name since API doesn't return initials
const getInitials = (name) => {
  if (!name) return 'ME'
  return name.trim().split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

const TopNav = ({ currentSection, inline, darkMode, toggleDarkMode, user, onUserRefresh }) => {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotifications({ onCountChange: onUserRefresh })

  const openDrawer = useCallback(() => {
    setDrawerOpen(true)
    fetchNotifications()
  }, [fetchNotifications])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  const notifCount = user?.unread_notifications ?? 0

  return (
    <>
      <header className="top-nav">
        {inline
          ? <button className="td-back" onClick={() => navigate('/tasks')}>
              <ArrowLeft size={14} strokeWidth={1.8} />
            </button>
          : <div className="top-nav-breadcrumb">
              <span className="top-nav-section">{currentSection}</span>
            </div>
        }

        <div className="top-nav-controls">

          {/* Bell */}
          <button
            className="top-nav-btn notif-btn"
            aria-label="Notifications"
            title="Notifications"
            onClick={openDrawer}
          >
            <Bell size={15} strokeWidth={1.8} />
            {notifCount > 0 && <span className="notif-dot" />}
          </button>

          <div className="top-nav-divider" />

          <button
            className="top-nav-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode
              ? <Sun  size={15} strokeWidth={1.8} />
              : <Moon size={15} strokeWidth={1.8} />
            }
          </button>

          <div className="top-nav-divider" />

          {/* ✅ CHANGED: was a plain div, now a Link with photo + initials fallback */}
          <Link
            to="/profile/"
            className="top-nav-avatar"
            title={user?.full_name ?? 'Profile'}
          >
            {user?.photo
              ? <img
                  src={user.photo}
                  alt={getInitials(user?.full_name)}
                  className="top-nav-avatar-img"
                />
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
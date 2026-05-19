import { useState, useCallback } from 'react'
import { ArrowLeft, Bell, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import NotificationDrawer from './NotificationDrawer'
import { useNotifications } from '../hooks/useNotifications'
import '../assets/TopNav.css'

const TopNav = ({ currentSection, inline, darkMode, toggleDarkMode, user, onUserRefresh }) => {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // onUserRefresh is called after mark-read so AuthContext re-fetches
  // user.unread_notifications and the dot count stays in sync
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
    fetchNotifications()          // lazy-load the list when drawer opens
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

          {/* Bell — shows red dot when there are unread notifications */}
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

          <div className="top-nav-avatar" title="Profile">
            {user?.initials ?? 'ME'}
          </div>

        </div>
      </header>

      {/* Notification drawer — rendered outside the header so it overlays correctly */}
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
import { ArrowLeft, Bell, Sun, Moon } from 'lucide-react'
import '../assets/TopNav.css'
import { useNavigate } from 'react-router-dom'

const TopNav = ({ currentSection, inline,darkMode, toggleDarkMode, user, notifCount = 0 }) => {
  const navigate = useNavigate()

  return (
    <header className="top-nav">
      {inline 
        ?<button className="td-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} strokeWidth={1.8} />
        </button>
        :<div className="top-nav-breadcrumb">
          <span className="top-nav-section">{currentSection}</span>
        </div>
      }

      <div className="top-nav-controls">

        <button
          className="top-nav-btn notif-btn"
          aria-label="Notifications"
          title="Notifications"
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
  )
}

export default TopNav

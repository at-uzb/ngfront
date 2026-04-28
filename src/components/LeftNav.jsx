import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  CheckSquare,
  MessageSquare,
  User,
  Settings,
  MoreHorizontal,
} from 'lucide-react'
import { useRole } from '../hooks/useRole'
import '../assets/LeftNav.css'

const MAIN_ITEMS = [
  { path: '/dashboard', name: 'Dashboard',    icon: LayoutGrid,    permission: 'viewDashboard', badge: null },
  { path: '/tasks',     name: 'Topshiriqlar', icon: CheckSquare,   permission: 'viewTasks',      badge: 12   },
  { path: '/chat',      name: 'Chat',         icon: MessageSquare, permission: 'viewAnalytics',  badge: 3    },
]

const ACCOUNT_ITEMS = [
  { path: '/profile',  name: 'Profil',      icon: User,     permission: 'viewProfile'  }
]

export default function LeftNav({ updateSection, user }) {
  const { can } = useRole()

  const visibleMain    = MAIN_ITEMS.filter(item => can(item.permission))
  const visibleAccount = ACCOUNT_ITEMS.filter(item => can(item.permission))
  const allVisible     = [...visibleMain, ...visibleAccount]

  return (
    <>
      <nav className="left-nav desktop-nav">

        <div className="nav-logo">
          <div className="nav-logo-mark">
            <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="4"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <div>
            <div className="nav-logo-name">MetroTask</div>
            <div className="nav-logo-sub">Workspace</div>
          </div>
        </div>

        {visibleMain.length > 0 && (
          <>
            <p className="nav-section-label">Main</p>
            <ul className="nav-menu">
              {visibleMain.map(({ path, name, icon: Icon, badge }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    onClick={() => updateSection(name)}
                  >
                    <Icon size={15} strokeWidth={1.8} />
                    <span className="nav-text">{name}</span>
                    {badge != null && (
                      <span className="nav-badge">{badge}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}

        {visibleAccount.length > 0 && (
          <>
            <p className="nav-section-label">Account</p>
            <ul className="nav-menu">
              {visibleAccount.map(({ path, name, icon: Icon }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    onClick={() => updateSection(name)}
                  >
                    <Icon size={15} strokeWidth={1.8} />
                    <span className="nav-text">{name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="nav-spacer" />
        <div className="nav-divider" />

        <div className="nav-user">
          <div className="nav-avatar">
            {user?.initials ?? 'ME'}
          </div>
          <div className="nav-user-info">
            <div className="nav-user-name">{user?.name ?? 'My Account'}</div>
            <div className="nav-user-role">{user?.role ?? 'Member'}</div>
          </div>
          <MoreHorizontal size={14} color="#bbb" />
        </div>
      </nav>

      {/* ── Mobile Bottom Bar ── */}
      <nav className="mobile-bottom-nav">
        <ul className="bottom-nav-menu">
          {allVisible.map(({ path, name, icon: Icon }) => (
            <li key={path} className="bottom-nav-item">
              <NavLink
                to={path}
                className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
                onClick={() => updateSection(name)}
              >
                <Icon size={18} strokeWidth={1.7} />
                <span className="bottom-nav-label">{name}</span>
                <span className="bottom-nav-line" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

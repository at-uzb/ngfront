import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  CheckSquare,
  MessageSquare,
  User,
  MoreHorizontal,
  Newspaper
} from 'lucide-react'
import { useRole } from '../hooks/useRole'
import '../assets/LeftNav.css'
import logo from '../assets/mlogo.png'

const MAIN_ITEMS = [
  { path: '/dashboard', name: 'Dashboard',    icon: LayoutGrid,    permission: 'viewTasks', badge: null },
  { path: '/tasks',     name: 'Topshiriqlar', icon: CheckSquare,   permission: 'viewTasks',      badge: null   },
  { path: '/news',      name: 'Yangiliklar',  icon: Newspaper, permission: 'viewAnalytics',  badge: null    },
]

const ACCOUNT_ITEMS = [
  { path: '/profile', name: 'Profil', icon: User, permission: 'viewProfile' },
]

export default function LeftNav({ user }) {
  const { can } = useRole()

  const visibleMain    = MAIN_ITEMS.filter((item) => can(item.permission))
  const visibleAccount = ACCOUNT_ITEMS.filter((item) => can(item.permission))
  const allVisible     = [...visibleMain, ...visibleAccount]

  return (
    <>
      <nav className="left-nav desktop-nav">

        <div className="nav-logo">
          <div className="nav-logo-mark">
            {/* <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="4"/>
              <path d="M3 9h18M9 21V9"/>
            </svg> */}
            <img 
              alt='Site logo' 
              src={logo} 
              style={{ width: '30px', height: '30px', objectFit: 'contain' }}
            />

          </div>
          <div>
            <div className="nav-logo-name">MTopshiriq</div>
            <div className="nav-logo-sub">Boshqaruv tizimi</div>
          </div>
        </div>

        {visibleMain.length > 0 && (
          <>
            <p className="nav-section-label">Asosiy</p>
            <ul className="nav-menu">
              {visibleMain.map(({ path, name, icon: Icon, badge }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
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
            <p className="nav-section-label">Akkount</p>
            <ul className="nav-menu">
              {visibleAccount.map(({ path, name, icon: Icon }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
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

      <a href="https://t.me/fulminar"
        target="_blank"
        rel="noopener noreferrer"
        className="nav-support"
      >
        <div className="nav-support-icon">
          <MessageSquare size={14} strokeWidth={1.8} />
        </div>
        <div className="nav-user-info">
          <div className="nav-user-name">Yordam kerakmi?</div>
          <div className="nav-user-role">Telegram orqali bog'laning</div>
        </div>
      </a>

      </nav>

      {/* ── Mobile Bottom Bar ── */}
      <nav className="mobile-bottom-nav">
        <ul className="bottom-nav-menu">
          {allVisible.map(({ path, name, icon: Icon }) => (
            <li key={path} className="bottom-nav-item">
              <NavLink
                to={path}
                className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
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
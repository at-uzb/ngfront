import { NavLink } from 'react-router-dom'
import { LayoutGrid, CheckSquare, MessageSquare, User, Newspaper, Bot } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import '../assets/LeftNav.css'
import logo from '../assets/mlogo.png'

const MAIN_ITEMS = [
  { path: '/dashboard', name: 'Dashboard',    icon: LayoutGrid,   adminOnly: false, badge: null },
  { path: '/tasks',     name: 'Topshiriqlar', icon: CheckSquare,  adminOnly: false, badge: null },
  { path: '/chat',      name: "Sun'iy Ong",   icon: Bot, adminOnly: true,  badge: null },
  { path: '/news',      name: 'Yangiliklar',  icon: Newspaper,    adminOnly: false, badge: null },
]

const ACCOUNT_ITEMS = [
  { path: '/profile', name: 'Profil', icon: User, adminOnly: false },
]

export default function LeftNav({ user }) {
  const { isAdmin } = useAuth()

  const filterItems = (items) =>
    items.filter((item) => !item.adminOnly || isAdmin)

  const visibleMain    = filterItems(MAIN_ITEMS)
  const visibleAccount = filterItems(ACCOUNT_ITEMS)
  const allVisible     = [...visibleMain, ...visibleAccount]

  return (
    <>
      <nav className="left-nav desktop-nav">

        <div className="nav-logo">
          <div className="nav-logo-mark">
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
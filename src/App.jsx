import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import LeftNav from './components/LeftNav'
import TopNav from './components/TopNav'
import Dashboard from './components/Dashboard'
import Profile from './components/Profile'
import Tasks from './components/Tasks'
import TaskDetail from './components/TaskDetail'
import Chat from './components/Chat'
import News from './components/News'
import KtFinishMedia from './components/KTFinishMedia'
import TaskCreate from './components/TaskCreate'
import NewsCreate from './components/NewsCreate'
import NewsDetail from './components/NewsDetail'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import './App.css'

const INLINE_PREFIXES = ['/tasks/', '/task/create']

const useInline = () => {
  const { pathname } = useLocation()
  return INLINE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// ─── Section label ─────────────────────────────────────────────────────────────
const SECTION_MAP = {
  '/dashboard':   'Dashboard',
  '/tasks':       'Topshiriqlar',
  '/profile':     'Profile',
  '/news':        'Yangiliklar',
  '/chat':        'AI bilan suhbat',
  '/task/create': "Topshiriq qo'shish",
  '/news/create': "Yangilik qo'shish",
}

const getSectionFromPath = (pathname) => {
  if (SECTION_MAP[pathname]) return SECTION_MAP[pathname]
  const prefix = Object.keys(SECTION_MAP).find((key) => pathname.startsWith(key))
  return prefix ? SECTION_MAP[prefix] : ''
}

// ─── Role-based default redirect ───────────────────────────────────────────────
const DefaultRedirect = () => {
  const { isAdmin } = useAuth()
  return <Navigate to={isAdmin ? '/dashboard' : '/tasks'} replace />
}

// ─── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const location       = useLocation()
  const inline         = useInline()
  const currentSection = getSectionFromPath(location.pathname)
  const { refreshUser, user, isReady } = useAuth()

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    document.body.classList.toggle('dark-mode', darkMode)
  }, [darkMode])

  useEffect(() => {
    if (isReady) refreshUser()
  }, [isReady])

  const toggleDarkMode = useCallback(() => setDarkMode((d) => !d), [])

  if (!isReady) return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100vh',
        background:     darkMode ? '#0d0f1a' : '#f4f6fb',
      }}>
        {/* Double-ring spinner matching Dashboard brand */}
        <div style={{ position: 'relative', width: 36, height: 36 }}>
          <div style={{
            position:        'absolute',
            inset:           0,
            borderRadius:    '50%',
            border:          '2.5px solid transparent',
            borderTopColor:  darkMode ? '#8384f3' : '#6768EE',
            animation:       'app-spin 0.9s linear infinite',
          }} />
          <div style={{
            position:        'absolute',
            inset:           8,
            borderRadius:    '50%',
            border:          '2px solid transparent',
            borderTopColor:  darkMode ? 'rgba(131,132,243,0.35)' : 'rgba(103,104,238,0.30)',
            animation:       'app-spin 0.6s linear infinite reverse',
          }} />
        </div>
        <style>{`@keyframes app-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <LeftNav />
      <div className="main-content">
        <TopNav
          websiteName="MetroTask"
          currentSection={currentSection}
          darkMode={darkMode}
          inline={inline}
          toggleDarkMode={toggleDarkMode}
          onUserRefresh={refreshUser}
          user={user}
        />
        <div className="content-area">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

// ─── App Root ───────────────────────────────────────────────────────────────────
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppShell />}>
              <Route index element={<DefaultRedirect />} />
              <Route path="dashboard"   element={<Dashboard />} />
              <Route path="tasks"       element={<Tasks />} />
              <Route path="tasks/:id"   element={<TaskDetail />} />
              <Route path="profile"     element={<Profile />} />
              <Route path="news"        element={<News />} />
              <Route path="chat"        element={<Chat/>} />
              <Route path="task/create" element={<TaskCreate />} />
              <Route path="news/create" element={<NewsCreate />} />
              <Route path="news/:slug"  element={<NewsDetail />} />
              <Route path="tasks/:id/finish-media" element={<KtFinishMedia />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo } from 'react'
import LeftNav from './components/LeftNav'
import TopNav from './components/TopNav'
import Dashboard from './components/Dashboard'
import Profile from './components/Profile'
import Tasks from './components/Tasks'
import TaskDetail from './components/TaskDetail'
import Chat from './components/Chat'
import News from './components/News'
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
  '/task/create': "Topshiriq qo'shish",
  '/news/create': "Yangilik qo'shish",
}

const getSectionFromPath = (pathname) => {
  if (SECTION_MAP[pathname]) return SECTION_MAP[pathname]
  const prefix = Object.keys(SECTION_MAP).find((key) => pathname.startsWith(key))
  return prefix ? SECTION_MAP[prefix] : ''
}

// ─── Role-based default redirect ──────────────────────────────────────────────
const DefaultRedirect = () => {
  const { isAdmin } = useAuth()
  return <Navigate to={isAdmin ? '/dashboard' : '/tasks'} replace />
}

// ─── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const location = useLocation()
  const inline = useInline()
  const currentSection = getSectionFromPath(location.pathname)
  const { refreshUser, user } = useAuth()
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    document.body.classList.toggle('dark-mode', darkMode)
  }, [darkMode])

  const toggleDarkMode = useCallback(() => setDarkMode((d) => !d), [])

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
          {/* Outlet renders the matched child route — AppShell never remounts */}
          <Outlet />
        </div>
      </div>
    </div>
  )
}

// ─── App Root ──────────────────────────────────────────────────────────────────
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
              <Route path="task/create" element={<TaskCreate />} />
              <Route path="news/create" element={<NewsCreate/>}/>
              <Route path='news/:slug'  element={<NewsDetail />}/>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react'
import LeftNav from './components/LeftNav'
import TopNav from './components/TopNav'
import Dashboard from './components/Dashboard'
import Profile from './components/Profile'
import Tasks from './components/Tasks'
import TaskDetail from './components/TaskDetail'
import Chat from './components/Chat'
import TaskCreate from './components/TaskCreate'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import './App.css'

// ─── Layout Context ────────────────────────────────────────────────────────────
// Replaces the prop-drilled `inline` toggle that child routes were firing upward.
// Any route component can call useLayout() to toggle inline mode directly.
const LayoutContext = createContext(null)

export const useLayout = () => {
  const context = useContext(LayoutContext)
  if (!context) throw new Error('useLayout must be used within AppShell')
  return context
}

// Maps route pathnames to human-readable section names for TopNav.
// Derived from the URL — never manually synced via callback props.
const SECTION_MAP = {
  '/dashboard':   'Dashboard',
  '/tasks':       'Tasks',
  '/profile':     'Profile',
  '/chat':        'Chat',
  '/task/create': 'Create Task',
}

const getSectionFromPath = (pathname) => {
  // Exact match first, then prefix match for dynamic segments like /tasks/:id
  if (SECTION_MAP[pathname]) return SECTION_MAP[pathname]
  const prefix = Object.keys(SECTION_MAP).find((key) => pathname.startsWith(key))
  return prefix ? SECTION_MAP[prefix] : ''
}

// ─── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const location = useLocation()

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [inline, setInline] = useState(false)

  // Derive section name from the actual URL — back/forward and direct
  // navigation will always reflect the correct section automatically.
  const currentSection = getSectionFromPath(location.pathname)

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    document.body.classList.toggle('dark-mode', darkMode)
  }, [darkMode])

  const toggleDarkMode = useCallback(() => setDarkMode((d) => !d), [])
  const toggleInline   = useCallback(() => setInline((i) => !i), [])

  const layoutValue = useMemo(
    () => ({ inline, toggleInline }),
    [inline, toggleInline]
  )

  return (
    <LayoutContext.Provider value={layoutValue}>
      <div className={`app ${darkMode ? 'dark' : 'light'}`}>
        <LeftNav />
        <div className="main-content">
          <TopNav
            websiteName="MetroTask"
            currentSection={currentSection}
            darkMode={darkMode}
            inline={inline}
            toggleDarkMode={toggleDarkMode}
          />
          <div className="content-area">
            <Routes>
              <Route path="/dashboard"   element={<Dashboard />} />
              <Route path="/tasks"       element={<Tasks />} />
              <Route path="/tasks/:id"   element={<TaskDetail />} />
              <Route path="/profile"     element={<Profile />} />
              <Route path="/chat"        element={<Chat />} />
              <Route path="/task/create" element={<TaskCreate />} />
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </LayoutContext.Provider>
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
            <Route path="/*" element={<AppShell />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
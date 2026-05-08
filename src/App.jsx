import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
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

function AppShell() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [inline, setInline] = useState(false)
  const [currentSection, setCurrentSection] = useState('Dashboard')

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    document.body.classList.toggle('dark-mode', darkMode)
  }, [darkMode])

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <LeftNav updateSection={setCurrentSection} />
      <div className="main-content">
        <TopNav
          websiteName="MetroTask"
          currentSection={currentSection}
          darkMode={darkMode}
          inline={inline}
          toggleDarkMode={() => setDarkMode(d => !d)}
        />
        <div className="content-area">
          <Routes>
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/tasks"        element={<Tasks />} />
            <Route path="/tasks/:id"    element={<TaskDetail toggleInline={() => setInline(i => !i)} />} />
            <Route path="/profile"      element={<Profile />} />
            <Route path="/chat"         element={<Chat />} />
            <Route path="/task/create"  element={<TaskCreate toggleInline={() => setInline(i => !i)}/>} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

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
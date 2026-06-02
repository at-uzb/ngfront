import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import '../assets/Login.css'

import logo from "../assets/mlogo.png"


const Login = () => {
  const [formData,    setFormData]    = useState({ phone_number: '', password: '' })
  const [loading,     setLoading]     = useState(false)
  const [localError,  setLocalError]  = useState('')
  const [showPass,    setShowPass]    = useState(false)

  const { login, isAuthenticated, error: authError } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setLocalError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.phone_number || !formData.password) {
      setLocalError("Iltimos, barcha maydonlarni to'ldiring")
      return
    }
    setLoading(true)
    setLocalError('')
    const result = await login({
      phone_number: formData.phone_number,
      password:     formData.password,
    })
    if (result.success) {
      navigate('/dashboard')
    } else {
      setLocalError(result.error || "Kirish amalga oshmadi. Iltimos, ma'lumotlarni tekshiring.")
    }
    setLoading(false)
  }

  const displayError = localError || authError

  return (
    <div className="login-page">

      {/* ── Cover (mobile only) ── */}
      <div className="login-cover">
                <img 
                  alt='Site logo' 
                  src={logo} 
                  style={{ width: '65px', height: '65px', objectFit: 'contain' }}
                  />
        <h1 className="login-cover-title">MTopshiriq</h1>
        <p className="login-cover-sub">Hisobingizga kiring</p>
      </div>

      {/* ── Card / Sheet ── */}
      <div className="login-sheet">
        <div className="login-handle" />

        {/* Desktop only logo */}
        <div className="login-logo-wrap">
                          <img 
                  alt='Site logo' 
                  src={logo} 
                  style={{ width: '65px', height: '65px', objectFit: 'contain' }}
                  />
          <h2 className="login-title">MTopshiriq</h2>
          <p className="login-sub">Xush kelibsiz! Hisobingizga kiring</p>
        </div>

        {displayError && (
          <div className="login-error" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {displayError}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>

          <div className="login-field">
            <label htmlFor="phone_number">Telefon raqam</label>
            <div className="login-input-wrap">
              <svg className="login-input-icon" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.47 2 2 0 0 1 3.69 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.02-1.02a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+998 90 123 45 67"
                disabled={loading}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Parol</label>
            <div className="login-input-wrap">
              <svg className="login-input-icon" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type={showPass ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Parolingizni kiriting"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPass(p => !p)}
                tabIndex={-1}
                aria-label={showPass ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
              >
                {showPass ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading
              ? <><span className="login-spinner" /> Kirilmoqda…</>
              : 'Kirish'
            }
          </button>

        </form>
      </div>
    </div>
  )
}

export default Login
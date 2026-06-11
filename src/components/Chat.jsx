import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'

// ── Message bubble ────────────────────────────────────────────────────────────
const Message = ({ msg }) => {
  const isUser = msg.role === 'user'
  return (
    <div className={`chat-msg chat-msg--${isUser ? 'user' : 'ai'}`}>
      {!isUser && (
        <div className="chat-msg-avatar" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2"/>
            <path d="M12 8v4l3 3"/>
          </svg>
        </div>
      )}
      <div className="chat-msg-bubble">
        {msg.content}
        {msg.streaming && <span className="chat-cursor" aria-hidden="true" />}
        {msg.excel && <ExcelButton group={msg.excel.group} timeline={msg.excel.timeline} />}
      </div>
      {isUser && (
        <div className="chat-msg-avatar chat-msg-avatar--user" aria-hidden="true">
          {msg.initials}
        </div>
      )}
    </div>
  )
}

// ── Excel button ──────────────────────────────────────────────────────────────
const ExcelButton = ({ group, timeline }) => {
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  const handleDownload = async () => {
    if (loading || done) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ group_name: group })
      if (timeline) params.set('timeline', timeline)
      const res  = await api.get(`/tasks/xl-tasks/?${params}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href     = url
      link.download = `tasks_${group}${timeline ? `_${timeline}` : ''}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch {
      alert('Excel yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button className={`chat-excel-btn${done ? ' done' : ''}`} onClick={handleDownload} disabled={loading || done}>
      {loading ? (
        <><span className="chat-excel-spinner" /> Yuklanmoqda…</>
      ) : done ? (
        <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Yuklandi</>
      ) : (
        <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Excel yuklash</>
      )}
    </button>
  )
}

// ── Session item ──────────────────────────────────────────────────────────────
const SessionItem = ({ session, active, onSelect, onDelete }) => (
  <div className={`chat-session-item${active ? ' active' : ''}`} onClick={() => onSelect(session.id)}>
    <div className="chat-session-info">
      <span className="chat-session-title">{session.title}</span>
      <span className="chat-session-meta">
        {session.message_count} xabar · {new Date(session.updated_at).toLocaleDateString('uz-UZ')}
      </span>
    </div>
    <button className="chat-session-del" onClick={e => { e.stopPropagation(); onDelete(session.id) }} aria-label="O'chirish">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
      </svg>
    </button>
  </div>
)

// ── Main Component ────────────────────────────────────────────────────────────
export default function Chat() {
  const { user } = useAuth()

  const [sessions,        setSessions]        = useState([])
  const [activeSession,   setActiveSession]   = useState(null)
  const [messages,        setMessages]        = useState([])
  const [input,           setInput]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sidebarOpen,     setSidebarOpen]     = useState(false)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const userInitials = user?.full_name
    ?.trim().split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('') ?? 'AD'

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const { data } = await api.get('/api/chat/sessions/')
      setSessions(data)
      if (data.length > 0) await openSession(data[0].id)
    } catch { console.error('Sessions yuklanmadi') }
    finally { setSessionsLoading(false) }
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openSession = async (sessionId) => {
    try {
      const { data } = await api.get(`/api/chat/sessions/${sessionId}/`)
      setActiveSession(data)
      setMessages(data.messages.map(m => ({
        id: m.id, role: m.role, content: m.content,
        excel: m.excel ?? null,
        initials: m.role === 'user' ? userInitials : null,
        streaming: false,
      })))
      setSidebarOpen(false)
    } catch { console.error('Session yuklanmadi') }
  }

  const newSession = async () => {
    try {
      const { data } = await api.post('/api/chat/sessions/')
      setSessions(prev => [data, ...prev])
      setActiveSession(data)
      setMessages([])
      setSidebarOpen(false)
      inputRef.current?.focus()
    } catch { console.error('Session yaratilmadi') }
  }

  const deleteSession = async (sessionId) => {
    try {
      await api.delete(`/api/chat/sessions/${sessionId}/`)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
        setMessages([])
        const remaining = sessions.filter(s => s.id !== sessionId)
        if (remaining.length > 0) await openSession(remaining[0].id)
      }
    } catch { console.error("Session o'chirilmadi") }
  }

  const send = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    let sessionId = activeSession?.id
    if (!sessionId) {
      try {
        const { data } = await api.post('/api/chat/sessions/')
        setSessions(prev => [data, ...prev])
        setActiveSession(data)
        sessionId = data.id
      } catch { return }
    }

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    inputRef.current?.focus()

    const userMsg = { id: Date.now(), role: 'user', content: trimmed, initials: userInitials, streaming: false }
    setMessages(prev => [...prev, userMsg])

    const aiId = Date.now() + 1
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '', excel: null, streaming: true }])
    setLoading(true)

    try {
      const { data } = await api.post(`/api/chat/sessions/${sessionId}/message/`, { message: trimmed })
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: data.reply ?? 'Javob olishda xatolik.', excel: data.excel ?? null, streaming: false } : m
      ))
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, updated_at: new Date().toISOString(), message_count: (s.message_count ?? 0) + 2, last_message: data.reply?.slice(0, 80) } : s
      ))
      if (activeSession?.title === 'Yangi suhbat') {
        setActiveSession(prev => ({ ...prev, title: trimmed.slice(0, 50) }))
      }
    } catch (err) {
      const errMsg = err.response?.data?.error ?? 'Xatolik yuz berdi.'
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: errMsg, streaming: false } : m))
    } finally {
      setLoading(false)
    }
  }, [loading, activeSession, userInitials])

  const handleSubmit  = (e) => { e.preventDefault(); send(input) }
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="chat-container">

        {/* ── Sidebar ── */}
        <div className={`chat-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="chat-sidebar-header">
            <span className="chat-sidebar-title">Suhbatlar</span>
            <button className="chat-new-btn" onClick={newSession}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Yangi
            </button>
          </div>
          <div className="chat-session-list">
            {sessionsLoading ? (
              <div className="chat-sessions-state"><span className="chat-spin-sm" /></div>
            ) : sessions.length === 0 ? (
              <div className="chat-sessions-state">Hozircha suhbat yo'q</div>
            ) : (
              sessions.map(s => (
                <SessionItem key={s.id} session={s} active={activeSession?.id === s.id}
                  onSelect={openSession} onDelete={deleteSession} />
              ))
            )}
          </div>
        </div>

        {sidebarOpen && <div className="chat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* ── Main ── */}
        <div className="chat-main">

          {/* Top bar */}
          <div className="chat-topbar">
            <button className="chat-topbar-btn" onClick={() => setSidebarOpen(p => !p)} aria-label="Suhbatlar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="chat-topbar-title">{activeSession?.title ?? 'AI Yordamchi'}</span>
            <button className="chat-topbar-btn" onClick={newSession} title="Yangi suhbat" aria-label="Yangi suhbat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="chat-body" role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className="chat-empty">
                <div className="chat-empty-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="chat-empty-title">Salom, {user?.full_name?.split(' ')[0] ?? 'Admin'}! 👋</p>
                <p className="chat-empty-sub">Topshiriqlar, tahlil yoki yangiliklar haqida savol bering</p>
              </div>
            )}
            {messages.map(msg => <Message key={msg.id} msg={msg} />)}
            <div ref={bottomRef} />
          </div>

          {/* ── NEW INPUT AREA ── */}
          <div className="chat-footer">
            <form className="chat-composer" onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                className="chat-composer__input"
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder="Savol bering…"
                disabled={loading}
                rows={1}
                aria-label="Xabar yozing"
              />
              <button
                type="submit"
                className={`chat-composer__send${input.trim() && !loading ? ' ready' : ''}`}
                disabled={!input.trim() || loading}
                aria-label="Yuborish"
              >
                {loading ? (
                  <span className="chat-composer__spin" />
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ── Light tokens ── */
.light .chat-container {
  --ch-bg:           #f4f6fb;
  --ch-surface:      #ffffff;
  --ch-surface-2:    #f0f2f8;
  --ch-border:       rgba(103,104,238,0.12);
  --ch-border-md:    rgba(103,104,238,0.25);
  --ch-text:         #0f1117;
  --ch-muted:        #7b8296;
  --ch-subtle:       #b0b8cc;
  --ch-hover:        rgba(103,104,238,0.07);
  --ch-user-bg:      #6768EE;
  --ch-user-text:    #ffffff;
  --ch-ai-bg:        #ffffff;
  --ch-ai-border:    rgba(103,104,238,0.12);
  --ch-avatar-ai:    rgba(103,104,238,0.10);
  --ch-avatar-text:  #6768EE;
  --ch-input-bg:     #ffffff;
  --ch-input-border: rgba(103,104,238,0.18);
  --ch-send-ready:   #6768EE;
}

/* ── Dark tokens ── */
.dark .chat-container {
  --ch-bg:           #0d0f1a;
  --ch-surface:      #13162a;
  --ch-surface-2:    #0f1122;
  --ch-border:       rgba(131,132,243,0.14);
  --ch-border-md:    rgba(131,132,243,0.28);
  --ch-text:         #e4e7f5;
  --ch-muted:        #4e5575;
  --ch-subtle:       #2d3354;
  --ch-hover:        rgba(103,104,238,0.10);
  --ch-user-bg:      #6768EE;
  --ch-user-text:    #ffffff;
  --ch-ai-bg:        #13162a;
  --ch-ai-border:    rgba(131,132,243,0.14);
  --ch-avatar-ai:    rgba(103,104,238,0.15);
  --ch-avatar-text:  #a5b4fc;
  --ch-input-bg:     #0f1122;
  --ch-input-border: rgba(131,132,243,0.20);
  --ch-send-ready:   #6768EE;
}

/* ── Shell ── */
.chat-container {
  display: flex;
  height: calc(100dvh - 7vh);
  background: var(--ch-bg);
  font-family: 'Inter', system-ui, sans-serif;
  overflow: hidden;
  position: relative;
}

/* ── Sidebar ── */
.chat-sidebar {
  width: 256px;
  flex-shrink: 0;
  background: var(--ch-surface);
  border-right: 1px solid var(--ch-border);
  border-top: 2px solid #6768EE;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 13px 11px;
  border-bottom: 1px solid var(--ch-border);
  flex-shrink: 0;
}

.chat-sidebar-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ch-text);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.chat-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 8px;
  border: 1px solid var(--ch-border-md);
  background: transparent;
  color: #6768EE;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.chat-new-btn:hover { background: var(--ch-hover); }

.chat-session-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: var(--ch-border) transparent;
}

.chat-sessions-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: var(--ch-muted);
  font-size: 12.5px;
  gap: 8px;
}

.chat-session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.12s;
  border: 1px solid transparent;
}

.chat-session-item:hover  { background: var(--ch-hover); }
.chat-session-item.active {
  background: var(--ch-hover);
  border-color: var(--ch-border);
  border-left: 2px solid #6768EE;
}

.chat-session-info  { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }

.chat-session-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ch-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-session-meta { font-size: 10.5px; color: var(--ch-muted); white-space: nowrap; }

.chat-session-del {
  width: 22px; height: 22px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--ch-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  padding: 0; flex-shrink: 0;
}

.chat-session-item:hover .chat-session-del { opacity: 1; }
.chat-session-del:hover { background: rgba(220,38,38,0.08); color: #ef4444; }

/* ── Sidebar overlay (mobile) ── */
.chat-sidebar-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 40;
  display: none;
  backdrop-filter: blur(2px);
}

/* ── Main area ── */
.chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }

/* ── Top bar ── */
.chat-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ch-border);
  border-top: 2px solid #6768EE;
  background: var(--ch-surface);
  flex-shrink: 0;
}

.chat-topbar-btn {
  width: 30px; height: 30px;
  border-radius: 8px;
  border: 1px solid var(--ch-border);
  background: transparent;
  color: var(--ch-muted);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  padding: 0; flex-shrink: 0;
}

.chat-topbar-btn:hover {
  background: var(--ch-hover);
  color: #6768EE;
  border-color: var(--ch-border-md);
}

.chat-topbar-title {
  flex: 1;
  font-size: 13.5px; font-weight: 600;
  color: var(--ch-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Body ── */
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--ch-border) transparent;
}

.chat-body::-webkit-scrollbar       { width: 4px; }
.chat-body::-webkit-scrollbar-track { background: transparent; }
.chat-body::-webkit-scrollbar-thumb { background: var(--ch-border); border-radius: 4px; }

/* ── Empty state ── */
.chat-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  flex: 1; gap: 10px;
  padding: 2rem 1rem; text-align: center; min-height: 200px;
}

.chat-empty-icon {
  width: 60px; height: 60px;
  border-radius: 18px;
  background: var(--ch-avatar-ai);
  border: 1px solid var(--ch-border);
  display: flex; align-items: center; justify-content: center;
  color: var(--ch-avatar-text);
  margin-bottom: 6px;
}

.chat-empty-title { font-size: 15px; font-weight: 600; color: var(--ch-text); margin: 0; }
.chat-empty-sub   { font-size: 13px; color: var(--ch-muted); margin: 0; max-width: 280px; line-height: 1.55; }

/* ── Messages ── */
.chat-msg {
  display: flex; align-items: flex-end; gap: 8px;
  animation: chatMsgIn 0.18s ease;
}

@keyframes chatMsgIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.chat-msg--user { flex-direction: row-reverse; }

.chat-msg-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--ch-avatar-ai);
  border: 1px solid var(--ch-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700;
  color: var(--ch-avatar-text);
  flex-shrink: 0;
  letter-spacing: 0.03em;
}

.chat-msg-avatar--user {
  background: var(--ch-user-bg);
  border-color: transparent;
  color: #fff;
}

.chat-msg-bubble {
  max-width: calc(100% - 80px);
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13.5px; line-height: 1.6;
  white-space: pre-wrap; word-break: break-word;
  display: flex; flex-direction: column; gap: 8px;
}

.chat-msg--ai .chat-msg-bubble {
  background: var(--ch-ai-bg);
  border: 1px solid var(--ch-ai-border);
  border-left: 2px solid #6768EE;
  color: var(--ch-text);
  border-bottom-left-radius: 4px;
}

.chat-msg--user .chat-msg-bubble {
  background: var(--ch-user-bg);
  color: var(--ch-user-text);
  border-bottom-right-radius: 4px;
}

.chat-cursor {
  display: inline-block;
  width: 2px; height: 14px;
  background: currentColor;
  margin-left: 2px; vertical-align: middle;
  border-radius: 1px;
  animation: chatBlink 0.8s ease-in-out infinite;
}

@keyframes chatBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* ── Excel button ── */
.chat-excel-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 13px;
  border-radius: 8px;
  border: 1px solid rgba(16,185,129,0.30);
  background: rgba(16,185,129,0.08);
  color: #10b981;
  font-size: 12.5px; font-weight: 500; font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  align-self: flex-start;
}

.chat-excel-btn:hover:not(:disabled) { background: rgba(16,185,129,0.14); border-color: rgba(16,185,129,0.5); }
.chat-excel-btn.done { border-color: rgba(103,104,238,0.25); background: rgba(103,104,238,0.08); color: var(--ch-avatar-text); cursor: default; }
.chat-excel-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.chat-excel-spinner {
  width: 12px; height: 12px;
  border: 2px solid rgba(16,185,129,0.25);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: chatSpin 0.7s linear infinite;
  flex-shrink: 0;
}

/* ── Footer / Composer ── */
.chat-footer {
  flex-shrink: 0;
  padding: 0 14px 14px;
  background: var(--ch-bg);
}

/* ── The new composer ── */
.chat-composer {
  background: var(--ch-input-bg);
  border: 1px solid var(--ch-input-border);
  border-bottom: 2px solid #6768EE;
  border-radius: 14px;
  box-shadow: 0 -1px 0 rgba(103,104,238,0.06), 0 2px 12px rgba(103,104,238,0.06);
  transition: border-color 0.18s, box-shadow 0.18s;
  display: flex;
  align-items: flex-end;
  gap: 0;
  padding: 10px 10px 10px 14px;
}

.chat-composer:focus-within {
  border-color: rgba(103,104,238,0.32);
  border-bottom-color: #6768EE;
  box-shadow: 0 0 0 3px rgba(103,104,238,0.10);
}

.chat-composer__input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--ch-text);
  resize: none;
  outline: none;
  line-height: 1.6;
  min-height: 24px;
  max-height: 140px;
  overflow-y: auto;
  padding: 0;
  scrollbar-width: none;
  box-sizing: border-box;
  align-self: flex-end;
  padding-bottom: 2px;
}

.chat-composer__input::-webkit-scrollbar { display: none; }
.chat-composer__input::placeholder       { color: var(--ch-subtle); }
.chat-composer__input:disabled           { opacity: 0.5; }

/* Send button — right side, inline */
.chat-composer__send {
  width: 34px; height: 34px;
  border-radius: 10px;
  border: 1px solid var(--ch-border-md);
  background: transparent;
  color: var(--ch-muted);
  display: flex; align-items: center; justify-content: center;
  cursor: not-allowed;
  flex-shrink: 0;
  transition: all 0.18s;
  padding: 0;
  margin-left: 8px;
}

.chat-composer__send.ready {
  background: #6768EE;
  border-color: transparent;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(103,104,238,0.40);
}

.chat-composer__send.ready:hover  { background: #5556d4; box-shadow: 0 3px 12px rgba(103,104,238,0.50); }
.chat-composer__send.ready:active { transform: scale(0.91); }

.chat-composer__spin {
  width: 14px; height: 14px;
  border: 2px solid rgba(103,104,238,0.20);
  border-top-color: #6768EE;
  border-radius: 50%;
  animation: chatSpin 0.75s linear infinite;
}

/* ── Spinners ── */
.chat-spin-sm {
  width: 14px; height: 14px;
  border: 2px solid var(--ch-border);
  border-top-color: #6768EE;
  border-radius: 50%;
  animation: chatSpin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes chatSpin { to { transform: rotate(360deg); } }

/* ── Mobile ── */
@media (max-width: 768px) {
  .chat-container { height: calc(100dvh - 7vh - 70px); }

  .chat-sidebar {
    position: absolute; top: 0; left: 0; bottom: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    width: 280px;
    box-shadow: 4px 0 24px rgba(0,0,0,0.18);
  }

  .chat-sidebar.open     { transform: translateX(0); }
  .chat-sidebar-overlay  { display: block; }

  .chat-body { padding: 12px 12px 6px; gap: 10px; }

  .chat-msg-bubble { max-width: calc(100% - 44px); font-size: 13px; padding: 9px 12px; }

  .chat-footer { padding: 8px 12px 12px; }
  .chat-composer__input { font-size: 13.5px; }
  .chat-composer__hint  { display: none; }
}

@media (min-width: 769px) {
  .chat-topbar-btn:first-child { display: none; }
}
`
// Chat.jsx
import { useState, useRef, useCallback } from 'react'
import { Paperclip, Send, VolumeX, MoreHorizontal, Search, ArrowLeft } from 'lucide-react'
import { GROUP_MAPPING } from '../constants/groups'
import '../assets/Chat.css'

const MOCK_MESSAGES = {
  NGS: [
    { id: 1, sender: 'A.Karimov', avatar: 'AK', text: "Bugungi yig'ilish soat 14:00 da bo'ladi.", time: '09:12', own: false },
    { id: 2, sender: 'Siz', avatar: 'SZ', text: 'Tushunarli, qatnashaman.', time: '09:15', own: true },
  ],
  SH: [
    { id: 1, sender: 'M.Yusupov', avatar: 'MY', text: '3-stantsiyada signal uzilishi kuzatilmoqda.', time: '08:00', own: false },
  ],
}

export default function Chat() {
  const [activeGroup, setActiveGroup] = useState(null)
  const [mobileView, setMobileView] = useState('groups') // 'groups' | 'chat'
  const [search, setSearch] = useState('')
  const [messages, setMessages] = useState(MOCK_MESSAGES)
  const [inputText, setInputText] = useState('')
  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)

  const filteredGroups = Object.entries(GROUP_MAPPING).filter(([key, g]) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.displayName.toLowerCase().includes(search.toLowerCase())
  )

  const activeGroupData = activeGroup ? GROUP_MAPPING[activeGroup] : null
  const activeMessages = activeGroup ? (messages[activeGroup] || []) : []

  const handleGroupSelect = (key) => {
    setActiveGroup(key)
    setMobileView('chat')
  }

  const handleBack = () => {
    setMobileView('groups')
  }

  const sendMessage = useCallback(() => {
    const text = inputText.trim()
    if (!text || !activeGroup) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setMessages(prev => ({
      ...prev,
      [activeGroup]: [...(prev[activeGroup] || []), { id: Date.now(), sender: 'Siz', avatar: 'SZ', text, time, own: true }]
    }))
    setInputText('')
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [inputText, activeGroup])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-container">
      {/* SIDEBAR */}
      <div className={`chat-groups ${mobileView === 'chat' ? 'mobile-hidden' : 'mobile-visible'}`}>
        <div className="sidebar-header">
          <p className="sidebar-title">Guruhlar</p>
          <div className="search-box">
            <Search size={13} className="search-icon" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Qidirish..."
            />
          </div>
        </div>

        <div className="groups-list">
          {filteredGroups.map(([key, g]) => (
            <div
              key={key}
              className={`group-item ${activeGroup === key ? 'active' : ''}`}
              style={{ '--group-color': g.color }}
              onClick={() => handleGroupSelect(key)}
            >
              <div className="group-icon">{g.icon}</div>
              <div className="group-info">
                <div className="group-name">{g.displayName}</div>
              </div>
              <div className="group-badge">{g.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT WINDOW */}
      <div className={`chat-window ${mobileView === 'groups' ? 'mobile-hidden' : 'mobile-visible'}`}>
        <div className="chat-header">
          {/* Back button — mobile only */}
          <button className="back-btn" onClick={handleBack}>
            <ArrowLeft size={18} />
          </button>

          <div className="header-icon">{activeGroupData?.icon ?? '💬'}</div>
          <div className="header-info">
            <div className="header-name">
              {activeGroupData?.displayName ?? 'Guruhni tanlang'}
            </div>
            <div className="header-status">
              {activeMessages.length ? `${activeMessages.length} ta xabar` : '— xabarlar mavjud emas'}
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn"><Search size={14} /></button>
            <button className="icon-btn"><VolumeX size={14} /></button>
            <button className="icon-btn"><MoreHorizontal size={14} /></button>
          </div>
        </div>

        <div className="messages-area">
          {!activeGroup ? (
            <div className="empty-state">
              <span className="empty-icon">💬</span>
              <span className="empty-text">Guruhni tanlang</span>
            </div>
          ) : activeMessages.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">{activeGroupData.icon}</span>
              <span className="empty-text">Hali xabarlar yo'q</span>
            </div>
          ) : (
            <>
              <div className="date-divider"><span className="date-label">Bugun</span></div>
              {activeMessages.map(m => (
                <div key={m.id} className={`message-row ${m.own ? 'own' : ''}`}>
                  <div className="avatar">{m.avatar}</div>
                  <div className="message-bubble">
                    <div className="bubble-sender">{m.sender}</div>
                    <div className="bubble-text">{m.text}</div>
                    <div className="bubble-time">{m.time}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="chat-input-area">
          <div className="input-row">
            <Paperclip size={16} className="attach-btn" />
            <textarea
              ref={textareaRef}
              className="msg-input"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Xabar yozing..."
              rows={1}
            />
            <button className="send-btn" onClick={sendMessage}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

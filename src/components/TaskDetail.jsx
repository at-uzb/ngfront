import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Check, X, Clock, AlertCircle,
  Paperclip, MessageSquare, Send, Loader, Image, ChevronRight
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import '../assets/TaskDetail.css'

// ── Mock comments ────────────────────────────────────────────
const MOCK_COMMENTS = [
  { id: 1, author: 'Abdulaziz T.', initials: 'AT', text: 'Topshiriq ko\'rib chiqildi, jarayonda.', time: '2 soat oldin' },
  { id: 2, author: 'Nodira K.',    initials: 'NK', text: 'Hujjatlar tayyor, tasdiqlash kerak.', time: 'Kecha' },
]

// ── Skeleton ─────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="td-container">
      <div className="td-back td-skel-back">
        <div className="t-skel-line xshort" style={{ height: 12, width: 80 }} />
      </div>
      <div className="td-card">
        <div className="td-skel-header">
          <div className="t-skel-line wide" style={{ height: 20, width: '60%' }} />
          <div className="t-skel-line short" style={{ height: 14, width: '30%' }} />
        </div>
        <div className="td-skel-meta">
          {[1,2,3].map(i => (
            <div key={i} className="td-skel-meta-item">
              <div className="t-skel-line xshort" style={{ height: 10, width: 60 }} />
              <div className="t-skel-line short"  style={{ height: 14, width: 100 }} />
            </div>
          ))}
        </div>
        <div className="td-skel-section">
          <div className="t-skel-line wide" style={{ height: 12, width: '40%', marginBottom: 12 }} />
          <div className="td-skel-media-row">
            {[1,2,3].map(i => <div key={i} className="td-skel-media-thumb" />)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function TaskDetail( {toggleInline} ) {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { isAdmin }  = useAuth()

  const [task,      setTask]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [editing,   setEditing]   = useState(false)
  const [form,      setForm]      = useState({})
  const [saving,    setSaving]    = useState(false)
  const [saveErr,   setSaveErr]   = useState('')

  // Comments (mock)
  const [comments,    setComments]    = useState(MOCK_COMMENTS)
  const [commentText, setCommentText] = useState('')
  const [nextCid,     setNextCid]     = useState(MOCK_COMMENTS.length + 1)
  const commentRef = useRef(null)

  // Media upload
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  // ── Fetch task detail ──────────────────────────────────────
  useEffect(() => {
    toggleInline();
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get(`/tasks/kts/${id}/`)
        setTask(res.data)
        setForm({
          name:     res.data.name,
          status:   res.data.status   ?? 'todo',
          priority: res.data.priority ?? 'medium',
          deadline: res.data.deadline ? res.data.deadline.slice(0, 10) : '',
        })
      } catch (err) {
        if (err.response?.status === 403 || err.response?.status === 404) {
          setError('Bu topshiriqni ko\'rishga ruxsatingiz yo\'q yoki topilmadi.')
        } else {
          setError('Topshiriqni yuklashda xatolik yuz berdi.')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => toggleInline()
  }, [id])

  // ── Save inline edit ───────────────────────────────────────
  const handleSave = async () => {
    if (!form.name?.trim()) { setSaveErr('Nom bo\'sh bo\'lmasligi kerak'); return }
    setSaving(true)
    setSaveErr('')
    try {
      const res = await api.patch(`/tasks/kts/${id}/`, {
        name:     form.name,
        status:   form.status,
        priority: form.priority,
        deadline: form.deadline || null,
      })
      setTask(res.data)
      setEditing(false)
    } catch {
      setSaveErr('Saqlashda xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setSaveErr('')
    setForm({
      name:     task.name,
      status:   task.status   ?? 'todo',
      priority: task.priority ?? 'medium',
      deadline: task.deadline ? task.deadline.slice(0, 10) : '',
    })
  }

  // ── Media upload ───────────────────────────────────────────
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post(`/tasks/kts/${id}/media/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTask(prev => ({
        ...prev,
        media_files: [...(prev.media_files ?? []), res.data],
      }))
    } catch {
      // silently fail
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // ── Add comment (mock) ─────────────────────────────────────
  const handleAddComment = () => {
    const txt = commentText.trim()
    if (!txt) return
    setComments(prev => [...prev, {
      id: nextCid,
      author: 'Siz',
      initials: '?',
      text: txt,
      time: 'Hozir',
    }])
    setNextCid(n => n + 1)
    setCommentText('')
    setTimeout(() => commentRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  // ── Helpers ────────────────────────────────────────────────
  const fmtDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('uz-UZ', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }
  const fmtDateShort = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('uz-UZ', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  }

  const STATUS_MAP = {
    todo:       { label: 'Kutilmoqda', cls: 'badge-todo' },
    inprogress: { label: 'Jarayonda',  cls: 'badge-prog' },
    done:       { label: 'Bajarildi',  cls: 'badge-done' },
  }
  const PRIORITY_MAP = {
    high:   { label: 'Yuqori', cls: 'badge-high' },
    medium: { label: "O'rta",  cls: 'badge-mid'  },
    low:    { label: 'Past',   cls: 'badge-low'  },
  }

  // ── Render states ──────────────────────────────────────────
  if (loading) return <DetailSkeleton />

  if (error) return (
    <div className="td-container">
      <button className="td-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} strokeWidth={1.8} /> Orqaga
      </button>
      <div className="td-error-box">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    </div>
  )

  const st = STATUS_MAP[task.status]   ?? STATUS_MAP.todo
  const pr = PRIORITY_MAP[task.priority] ?? PRIORITY_MAP.medium
  const editSt = STATUS_MAP[form.status]   ?? STATUS_MAP.todo
  const editPr = PRIORITY_MAP[form.priority] ?? PRIORITY_MAP.medium

  return (
    <div className="td-container">

      {/* ── Main card ── */}
      <div className="td-card">

        {/* Header */}
        <div className="td-header">
          <div className="td-header-left">
            {editing ? (
              <input
                className="td-title-input"
                value={form.name}
                autoFocus
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setSaveErr('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancelEdit() }}
              />
            ) : (
              <h1 className="td-title">{task.name}</h1>
            )}

            {task.is_overdue && (
              <span className="td-overdue-badge">
                <Clock size={11} />
                Muddati o'tgan
              </span>
            )}
          </div>

          {isAdmin && (
            <div className="td-header-actions">
              {editing ? (
                <>
                  <button className="td-action-btn confirm" onClick={handleSave} disabled={saving} title="Saqlash">
                    {saving ? <Loader size={13} className="t-spin" /> : <Check size={14} strokeWidth={2} />}
                  </button>
                  <button className="td-action-btn" onClick={handleCancelEdit} title="Bekor">
                    <X size={14} strokeWidth={2} />
                  </button>
                </>
              ) : (
                <button className="td-action-btn" onClick={() => setEditing(true)} title="Tahrirlash">
                  <Pencil size={14} strokeWidth={1.8} />
                </button>
              )}
            </div>
          )}
        </div>

        {saveErr && <div className="td-save-err">{saveErr}</div>}

        {/* ── Meta grid ── */}
        <div className="td-meta-grid">

          <div className="td-meta-item">
            <span className="td-meta-lbl">Holat</span>
            {editing ? (
              <select
                className="td-inline-select"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                {Object.entries(STATUS_MAP).map(([val, { label }]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            ) : (
              <span className={`t-badge ${st.cls}`}>{st.label}</span>
            )}
          </div>

          <div className="td-meta-item">
            <span className="td-meta-lbl">Ustuvorlik</span>
            {editing ? (
              <select
                className="td-inline-select"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              >
                {Object.entries(PRIORITY_MAP).map(([val, { label }]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            ) : (
              <span className={`t-badge ${pr.cls}`}>{pr.label}</span>
            )}
          </div>

          <div className="td-meta-item">
            <span className="td-meta-lbl">Bo'lim</span>
            <div className="td-group-row">
              <span className="t-grp-badge" style={{ background: '#888' }}>
                {task.group?.short_name ?? '—'}
              </span>
              <span className="td-meta-val">{task.group?.name ?? '—'}</span>
            </div>
          </div>

          <div className="td-meta-item">
            <span className="td-meta-lbl">Muddat</span>
            {editing ? (
              <input
                className="td-inline-input"
                type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            ) : (
              <span className={`td-meta-val${task.is_overdue ? ' td-overdue-text' : ''}`}>
                {fmtDate(task.deadline)}
              </span>
            )}
          </div>

          <div className="td-meta-item">
            <span className="td-meta-lbl">Yaratilgan</span>
            <span className="td-meta-val">{fmtDate(task.created_at)}</span>
          </div>

          <div className="td-meta-item">
            <span className="td-meta-lbl">Yangilangan</span>
            <span className="td-meta-val">{fmtDate(task.updated_at)}</span>
          </div>

          {task.time_remaining && (
            <div className="td-meta-item">
              <span className="td-meta-lbl">Vaqt holati</span>
              <span className={`td-meta-val${task.is_overdue ? ' td-overdue-text' : ''}`}>
                {task.time_remaining}
              </span>
            </div>
          )}
        </div>

        {/* ── Group admins ── */}
        {task.group?.group_admins?.length > 0 && (
          <div className="td-section">
            <div className="td-section-title">Bo'lim adminlari</div>
            <div className="td-admins-list">
              {task.group.group_admins.map(admin => (
                <div key={admin.id} className="td-admin-row">
                  {admin.photo ? (
                    <img src={admin.photo} alt={admin.full_name} className="td-admin-photo" />
                  ) : (
                    <div className="td-admin-avatar">
                      {admin.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <div className="td-admin-info">
                    <span className="td-admin-name">{admin.full_name}</span>
                    {admin.is_admin && <span className="td-admin-badge">Admin</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Media files ── */}
        <div className="td-section">
          <div className="td-section-title">
            <Paperclip size={12} strokeWidth={1.8} />
            Media fayllar
            {isAdmin && (
              <>
                <button
                  className="td-media-add"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading
                    ? <Loader size={11} className="t-spin" />
                    : <><span>+</span> Fayl qo'shish</>
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={handleMediaUpload}
                />
              </>
            )}
          </div>

          {task.media_files?.length > 0 ? (
            <div className="td-media-grid">
              {task.media_files.map((m, i) => (
                <a
                  key={m.id ?? i}
                  href={m.file ?? m.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="td-media-thumb"
                  title={m.name ?? `Fayl ${i + 1}`}
                >
                  {m.file?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                    ? <img src={m.file} alt={m.name ?? `Fayl ${i + 1}`} />
                    : <div className="td-media-file-icon"><Image size={20} /></div>
                  }
                </a>
              ))}
            </div>
          ) : (
            <div className="td-empty-media">Media fayllar yo'q</div>
          )}
        </div>

        {/* ── Comments (mock) ── */}
        <div className="td-section">
          <div className="td-section-title">
            <MessageSquare size={12} strokeWidth={1.8} />
            Izohlar
            <span className="td-comment-count">{comments.length}</span>
          </div>

          <div className="td-comments-list">
            {comments.map(c => (
              <div key={c.id} className="td-comment">
                <div className="td-comment-avt">{c.initials}</div>
                <div className="td-comment-body">
                  <div className="td-comment-meta">
                    <span className="td-comment-author">{c.author}</span>
                    <span className="td-comment-time">{c.time}</span>
                    <span className="td-comment-mock-tag">demo</span>
                  </div>
                  <div className="td-comment-text">{c.text}</div>
                </div>
              </div>
            ))}
            <div ref={commentRef} />
          </div>

          <div className="td-comment-input-row">
            <input
              className="td-comment-input"
              type="text"
              placeholder="Izoh qoldiring..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
            />
            <button
              className="td-comment-send"
              onClick={handleAddComment}
              disabled={!commentText.trim()}
            >
              <Send size={13} strokeWidth={1.8} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

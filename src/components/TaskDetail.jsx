import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Check, X, Clock, AlertCircle,
  Paperclip, MessageSquare, Send, Loader, Download,
  User, Calendar, RefreshCw, Shield, ChevronDown, FileText, Play, Flag,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import MediaCarousel from './MediaCarousel'
import '../assets/TaskDetail.css'


function DetailSkeleton() {
  return (
    <div className="td-container">
      <div className="td-skel-carousel" />
      <div className="td-card">
        <div className="td-skel-header">
          <div className="td-skel-line" style={{ width: '60%', height: 22 }} />
          <div className="td-skel-line" style={{ width: '30%', height: 14 }} />
        </div>
        <div className="td-skel-pills">
          {[80, 64, 96].map((w, i) => <div key={i} className="td-skel-pill" style={{ width: w }} />)}
        </div>
        <div className="td-skel-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="td-skel-meta-item">
              <div className="td-skel-line" style={{ width: '40%', height: 10 }} />
              <div className="td-skel-line" style={{ width: '70%', height: 14 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Avatar({ src, name, size = 32 }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  if (src) return <img src={src} alt={name} className="td-avatar-img" style={{ width: size, height: size }} />
  return (
    <div className="td-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {initials}
    </div>
  )
}

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
]

function fmtDate(iso) {
  if (!iso) return '—'
  const d     = new Date(iso)
  const day   = d.getDate()
  const month = UZ_MONTHS[d.getMonth()]
  const year  = d.getFullYear()
  const hh    = String(d.getHours()).padStart(2, '0')
  const mm    = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hh}:${mm}`
}

function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (mins < 1)  return 'Hozir'
  if (mins < 60) return `${mins} daqiqa oldin`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs} soat oldin`
  return `${Math.floor(hrs / 24)} kun oldin`
}

const STATUS_MAP = {
  kutilmoqda: { label: 'Kutilmoqda', cls: 'badge-todo', dot: '#94A3B8' },
  jarayonda:  { label: 'Jarayonda',  cls: 'badge-prog', dot: '#3B82F6' },
  bajarildi:  { label: 'Bajarildi',  cls: 'badge-done', dot: '#10B981' },
}
const PRIORITY_MAP = {
  high:   { label: 'Yuqori', cls: 'badge-high', dot: '#EF4444' },
  medium: { label: "O'rta",  cls: 'badge-mid',  dot: '#F59E0B' },
  low:    { label: 'Past',   cls: 'badge-low',  dot: '#6EE7B7' },
}

// Status pill for a single group's row in the per-group status list
const GROUP_STATUS_DOT = {
  kutilmoqda: '#94A3B8',
  jarayonda:  '#3B82F6',
  bajarildi:  '#10B981',
}

export default function TaskDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { isAdmin } = useAuth()

  const [task,        setTask]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [editing,     setEditing]     = useState(false)
  const [form,        setForm]        = useState({})
  const [saving,      setSaving]      = useState(false)
  const [saveErr,     setSaveErr]     = useState('')
  const [commentText, setCommentText] = useState('')
  const [sendingCmt,  setSendingCmt]  = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [lightbox,    setLightbox]    = useState(null)
  const [cmtFiles,    setCmtFiles]    = useState([])

  const commentEndRef = useRef(null)
  const cmtFileRef    = useRef(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const res = await api.get(`/tasks/kts/${id}/`)
        setTask(res.data)
        setForm({
          name:     res.data.name,
          status:   res.data.status   ?? 'kutilmoqda',
          priority: res.data.priority ?? 'medium',
          deadline: res.data.deadline ? res.data.deadline.slice(0, 10) : '',
        })
      } catch (err) {
        setError(
          err.response?.status === 403 || err.response?.status === 404
            ? "Bu topshiriqni ko'rishga ruxsatingiz yo'q yoki topilmadi."
            : 'Topshiriqni yuklashda xatolik yuz berdi.'
        )
      } finally { setLoading(false) }
    }
    load()
  }, [id])

  const handleSave = async () => {
    if (!form.name?.trim()) { setSaveErr("Nom bo'sh bo'lmasligi kerak"); return }
    setSaving(true); setSaveErr('')
    try {
      const res = await api.patch(`/tasks/kts/${id}/update/`, {
        name: form.name, status: form.status,
        priority: form.priority, deadline: form.deadline || null,
      })
      setTask(res.data); setEditing(false)
    } catch { setSaveErr('Saqlashda xatolik yuz berdi') }
    finally  { setSaving(false) }
  }

  const handleCancelEdit = () => {
    setEditing(false); setSaveErr('')
    setForm({
      name:     task.name,
      status:   task.status   ?? 'kutilmoqda',
      priority: task.priority ?? 'medium',
      deadline: task.deadline ? task.deadline.slice(0, 10) : '',
    })
  }

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await api.post(`/tasks/kts/${id}/media/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTask(prev => ({ ...prev, media_files: [...(prev.media_files ?? []), res.data] }))
    } catch {} finally { setUploading(false); e.target.value = '' }
  }

  const handleAddComment = async () => {
    const txt = commentText.trim()
    if (!txt && cmtFiles.length === 0) return
    setSendingCmt(true)
    try {
      const fd = new FormData()
      fd.append('text', txt)
      cmtFiles.forEach(file => fd.append('files', file))
      const res = await api.post(`/tasks/kts/${id}/comments/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTask(prev => ({ ...prev, comments: [...(prev.comments ?? []), res.data] }))
      setCommentText('')
      setCmtFiles([])
      setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (err) {
      console.error('Comment error:', err)
      setSaveErr("Izoh qo'shishda xatolik")
    } finally { setSendingCmt(false) }
  }

  // REMOVED: handleApprove — ApproveNewTaskView no longer exists.
  // The new flow has no approval step; a group uploading finish media
  // automatically advances their KTGroupStatus to jarayonda.

  // REMOVED: handleMarkDone — finishing now happens per-group, not per-task.
  // See KtFinishMedia page where each group has its own Finish button.

  const handleDownloadDocx = async () => {
    try {
      const res = await api.get(`/tasks/kts/${id}/export-docx/`, {
        responseType: 'blob',
      })
      const url  = URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href     = url
      link.download = `task_${id}.docx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setSaveErr('Word faylni yuklab olishda xatolik yuz berdi')
    }
  }

  if (loading) return <DetailSkeleton />
  if (error) return (
    <div className="td-container">
      <button className="td-back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} /> Orqaga
      </button>
      <div className="td-error-box"><AlertCircle size={18} /><span>{error}</span></div>
    </div>
  )

  const st = STATUS_MAP[task.status]     ?? STATUS_MAP.kutilmoqda
  const pr = PRIORITY_MAP[task.priority] ?? PRIORITY_MAP.medium
  const canEdit    = task.can_edit         ?? isAdmin
  const canUpload  = task.can_upload_media ?? isAdmin
  // FIXED: was reusing canUpload (which is true for site admin too).
  // This is a dedicated field — only true for group admins of an assigned group.
  const canUploadFinishMedia = task.can_upload_finish_media ?? false
  const canComment = task.can_comment      ?? true
  const comments   = task.comments         ?? []

  // FIXED: can_finish is now an ARRAY of group_ids (from KTDetailSerializer),
  // not a boolean. Empty array → no group is ready to be finished by this user.
  const finishableGroupIds = task.can_finish ?? []

  const groups        = task.groups         ?? []
  const groupStatuses = task.group_statuses ?? []

  const allAdmins = groups.flatMap(g => g.group_admins ?? [])
  const uniqueAdmins = allAdmins.filter(
    (admin, idx, arr) => arr.findIndex(a => a.id === admin.id) === idx
  )

  return (
    <div className="td-container">

      {/* HERO */}
      <div className="td-hero-card">
        <div className="td-hero-pills">
          <span className={`td-pill ${st.cls}`}>
            <span className="td-pill-dot" style={{ background: st.dot }} />{st.label}
          </span>
          <span className={`td-pill ${pr.cls}`}>
            <span className="td-pill-dot" style={{ background: pr.dot }} />{pr.label}
          </span>
          {task.is_overdue && (
            <span className="td-pill pill-overdue"><Clock size={10} /> Muddati o'tgan</span>
          )}

          {groups.map(g => (
            <span key={g.id} className="td-pill pill-group">
              <span className="td-grp-chip">{g.short_name}</span>
              {g.name}
              {g.is_admin && <Shield size={9} style={{ marginLeft: 3, opacity: 0.6 }} />}
            </span>
          ))}
        </div>

        <div className="td-hero-title-row">
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

          <div className="td-title-actions">

            {canEdit && (
              editing ? (
                <>
                  <button className="td-icon-btn confirm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader size={13} className="t-spin" /> : <Check size={14} strokeWidth={2.5} />}
                  </button>
                  <button className="td-icon-btn" onClick={handleCancelEdit}>
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <>
                  <button className="td-icon-btn" onClick={() => setEditing(true)} title="Tahrirlash">
                    <Pencil size={13} strokeWidth={1.8} />
                  </button>
                  <button className="td-icon-btn" onClick={handleDownloadDocx} title="Word yuklab olish">
                    <Download size={13} strokeWidth={1.8} />
                  </button>
                </>
              )
            )}

            {/* CHANGED: was a single "Yakunlash" button tied to task.status.
                Now: if this user can finish ANY group, send them to the
                finish-media page where each group has its own button. */}
            {!editing && finishableGroupIds.length > 0 && (
              <button
                className="td-action-btn finish"
                onClick={() => navigate(`/tasks/${id}/finish-media/`)}
              >
                <Flag size={13} strokeWidth={2.5} />
                <span className="td-finish-label">
                  Yakunlash ({finishableGroupIds.length})
                </span>
              </button>
            )}

            {/* FIXED: was  canUpload  (site admin always true → wrong button shown).
                Now uses canUploadFinishMedia — only group admins of an
                assigned group ever see this button. */}
            {!editing && canUploadFinishMedia && finishableGroupIds.length === 0 && (
              <button
                className="td-action-btn approve"
                onClick={() => navigate(`/tasks/${id}/finish-media/`)}
              >
                <Play size={13} strokeWidth={2} />
                <span className="td-finish-label">Javob yuklash</span>
              </button>
            )}
          </div>
        </div>

        {saveErr && <p className="td-save-err">{saveErr}</p>}

        {/* NEW: per-group status strip — shows where each assigned group stands */}
        {groupStatuses.length > 1 && (
          <div className="td-group-status-row">
            {groupStatuses.map(gs => (
              <span key={gs.group_id} className="td-group-status-chip" title={gs.group_name}>
                <span
                  className="td-pill-dot"
                  style={{ background: GROUP_STATUS_DOT[gs.status] ?? '#94A3B8' }}
                />
                {gs.group_short_name} — {STATUS_MAP[gs.status]?.label ?? gs.status}
              </span>
            ))}
          </div>
        )}

        {task.created_by && (
          <div className="creator-card">
            <Avatar src={task.created_by.photo} name={task.created_by.full_name} size={36} className="creator-avatar" />
            <div className="creator-meta">
              <div className="creator-meta-top">
                <span className="creator-label">Topshiriq beruvchi</span>
                <span className="creator-name">{task.created_by.full_name}</span>
              </div>
              <div className="creator-meta-bottom">
                {task.created_by.group?.[0] && (
                  <a
                    className="creator-group"
                    href={`/guruh/${task.created_by.group[0].group_id}/`}
                    title={task.created_by.group[0].name}
                  >
                    <i className="ti ti-building" aria-hidden="true" />
                    {task.created_by.group[0].short_name}
                  </a>
                )}
                <span className="creator-sep">·</span>
                <span className="creator-date">
                  <i className="ti ti-calendar" aria-hidden="true" />
                  {fmtDate(task.created_at)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <MediaCarousel
        files={task.media_files}
        onOpen={setLightbox}
        onUpload={handleMediaUpload}
        canUpload={canUpload}
        uploading={uploading}
      />

      {/* META */}
      <div className="td-meta-card">
        <div className="td-meta-grid">
          {[
            { icon: <Shield size={10} />, label: 'Holat', content: editing
                ? <div className="td-select-wrap">
                    <select className="td-inline-select" value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {Object.entries(STATUS_MAP).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                    <ChevronDown size={11} className="td-select-icon" />
                  </div>
                : <span className={`td-pill sm ${st.cls}`}><span className="td-pill-dot" style={{ background: st.dot }} />{st.label}</span>
            },
            { icon: <AlertCircle size={10} />, label: 'Ustuvorlik', content: editing
                ? <div className="td-select-wrap">
                    <select className="td-inline-select" value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      {Object.entries(PRIORITY_MAP).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                    <ChevronDown size={11} className="td-select-icon" />
                  </div>
                : <span className={`td-pill sm ${pr.cls}`}><span className="td-pill-dot" style={{ background: pr.dot }} />{pr.label}</span>
            },
            { icon: <Calendar size={10} />, label: 'Muddat', content: editing
                ? <input className="td-inline-input" type="date" value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                : <span className={`td-meta-val${task.is_overdue ? ' overdue' : ''}`}>{fmtDate(task.deadline)}</span>
            },
            task.time_remaining && {
              icon: <Clock size={10} />, label: 'Vaqt holati',
              content: <span className={`td-meta-val${task.is_overdue ? ' overdue' : ''}`}>{task.time_remaining}</span>
            },
            { icon: <RefreshCw size={10} />, label: 'Yangilangan',
              content: <span className="td-meta-val">{fmtDate(task.updated_at)}</span>
            },
          ].filter(Boolean).map((cell, i) => (
            <div key={i} className="td-meta-cell">
              <span className="td-meta-lbl">{cell.icon} {cell.label}</span>
              {cell.content}
            </div>
          ))}
        </div>
      </div>

      {/* COMMENTS */}
      <div className="td-section-card">
        <div className="td-section-hd">
          <MessageSquare size={12} strokeWidth={1.8} />
          Izohlar
          <span className="td-section-count">{comments.length}</span>
        </div>

        <div className="td-comments-list">
          {comments.length === 0 && <p className="td-empty">Hali izoh qoldirilmagan</p>}
          {comments.map(c => (
            <div key={c.id} className="td-comment">
              <div className="td-comment-avt">
                {c.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="td-comment-body">
                <div className="td-comment-meta">
                  <span className="td-comment-author">{c.full_name}</span>
                  <span className="td-comment-time">{timeAgo(c.created_at)}</span>
                </div>
                <p className="td-comment-text">{c.text}</p>
                {c.comment_files?.length > 0 && (
                  <div className="td-comment-files">
                    {c.comment_files.map((f, fi) => (
                      f.media_type === 'image'
                        ? <button key={f.id ?? fi} className="td-cmt-file-thumb"
                            onClick={() => setLightbox({ url: f.media_url, type: 'image' })}>
                            <img src={f.media_url} alt={`file-${fi}`} />
                          </button>
                        : <a key={f.id ?? fi} href={f.media_url} target="_blank" rel="noopener noreferrer"
                            className="td-cmt-file-link">
                            <FileText size={12} /> Fayl
                          </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={commentEndRef} />
        </div>

        {canComment && (
          <div className="td-composer">
            {cmtFiles.length > 0 && (
              <div className="td-cmt-preview">
                {cmtFiles.map((f, i) => (
                  <div key={i} className="td-cmt-preview-item">
                    <span>{f.name}</span>
                    <button onClick={() => setCmtFiles(p => p.filter((_, j) => j !== i))}><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="td-composer-row">
              <button className="td-cmt-attach" onClick={() => cmtFileRef.current?.click()}>
                <Paperclip size={13} />
              </button>
              <input ref={cmtFileRef} type="file" multiple style={{ display: 'none' }}
                onChange={e => setCmtFiles(p => [...p, ...Array.from(e.target.files ?? [])])} />
              <input
                className="td-cmt-input"
                type="text"
                placeholder="Izoh yozing..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
              />
              <button
                className="td-cmt-send"
                onClick={handleAddComment}
                disabled={!commentText.trim() || sendingCmt}
              >
                {sendingCmt ? <Loader size={13} className="t-spin" /> : <Send size={13} strokeWidth={2} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* GROUP ADMINS */}
      {uniqueAdmins.length > 0 && (
        <div className="td-section-card">
          <div className="td-section-hd">
            <User size={12} strokeWidth={1.8} />
            Bo'lim foydalanuvchilari
            <span className="td-section-count">{uniqueAdmins.length}</span>
          </div>
          <div className="td-admins-list">
            {uniqueAdmins.map(admin => (
              <div key={admin.id} className="td-admin-row">
                <Avatar src={admin.photo} name={admin.full_name} size={38} />
                <div className="td-admin-info">
                  <span className="td-admin-name">{admin.full_name}</span>
                  {admin.phone_number && <span className="td-admin-phone">{admin.phone_number}</span>}
                </div>
                {admin.is_admin && <span className="td-admin-badge">Admin</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="td-lightbox" onClick={() => setLightbox(null)}>
          <button className="td-lightbox-close"><X size={20} /></button>
          {lightbox.type === 'image'
            ? <img src={lightbox.url} alt="preview" onClick={e => e.stopPropagation()} />
            : <a href={lightbox.url} target="_blank" rel="noopener noreferrer" className="td-lightbox-link"
                onClick={e => e.stopPropagation()}>
                <FileText size={40} /> Faylni ochish
              </a>
          }
        </div>
      )}
    </div>
  )
}
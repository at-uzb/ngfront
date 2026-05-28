import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlignLeft, Tag, Clock, Image, Trash2, Edit3, X, Check } from 'lucide-react'
import api from '../lib/api'

const STATUSES = [
  { id: 'draft',     label: 'Qoralama',   color: '#888',    bg: 'rgba(136,136,136,0.12)' },
  { id: 'published', label: 'Chop etish', color: '#3d9e6b', bg: 'rgba(61,158,107,0.12)'  },
  { id: 'archived',  label: 'Arxiv',      color: '#d4900a', bg: 'rgba(212,144,10,0.12)'  },
]

function fmtDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export default function NewsDetail() {
  const { slug }   = useParams()
  const navigate   = useNavigate()
  const thumbRef   = useRef(null)

  const [news,        setNews]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [msg,         setMsg]         = useState(null)

  const [form, setForm] = useState({
    title: '', content: '', status: 'draft',
  })
  const [thumbFile,    setThumbFile]    = useState(null)
  const [thumbPreview, setThumbPreview] = useState(null)

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  // ── Fetch ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/news/news/${slug}/`)
        setNews(res.data)
        setForm({
          title:   res.data.title   || '',
          content: res.data.content || '',
          status:  res.data.status  || 'draft',
        })
        setThumbPreview(res.data.thumbnail || null)
      } catch {
        flash('error', "Yangilikni yuklab bo'lmadi")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const patch = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const onThumbChange = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (thumbFile) URL.revokeObjectURL(thumbPreview)
    setThumbFile(file)
    setThumbPreview(URL.createObjectURL(file))
  }

  const cancelEdit = () => {
    setEditing(false)
    setThumbFile(null)
    setThumbPreview(news?.thumbnail || null)
    setForm({
      title:   news?.title   || '',
      content: news?.content || '',
      status:  news?.status  || 'draft',
    })
  }

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim()) { flash('error', 'Sarlavha kiritilishi shart'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title',   form.title.trim())
      fd.append('content', form.content.trim())
      fd.append('status',  form.status)
      if (thumbFile) fd.append('thumbnail_file', thumbFile)
      const res = await api.patch(`/news/news/${slug}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setNews(res.data)
      setThumbFile(null)
      setEditing(false)
      flash('success', 'Yangilik saqlandi!')
    } catch (err) {
      flash('error', err?.response?.data?.detail || 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/news/news/${slug}/`)
      navigate('/news/', { replace: true })
    } catch {
      flash('error', 'O\'chirishda xatolik yuz berdi')
      setDeleting(false)
      setConfirmDel(false)
    }
  }

  const activeStatus = STATUSES.find(s => s.id === (editing ? form.status : news?.status))

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="nd2">
        <div className="nd2-cover nd2-cover--loading">
          <div className="nd2-skeleton nd2-skeleton--circle" />
          <div className="nd2-skeleton nd2-skeleton--title" />
          <div className="nd2-skeleton nd2-skeleton--sub" />
        </div>
        <div className="nd2-sheet">
          <div className="nd2-handle" />
          {[1,2,3].map(i => <div key={i} className="nd2-row"><div className="nd2-skeleton nd2-skeleton--row" /></div>)}
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="nd2">

        {/* ── Cover ── */}
        <div className="nd2-cover">
          <button className="nd2-back" onClick={() => navigate(-1)} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          {/* Edit / Delete buttons top-right */}
          <div className="nd2-cover-actions">
            {!editing ? (
              <>
                <button className="nd2-icon-btn" onClick={() => setEditing(true)} type="button" title="Tahrirlash">
                  <Edit3 size={16} strokeWidth={2} />
                </button>
                <button className="nd2-icon-btn nd2-icon-btn--danger" onClick={() => setConfirmDel(true)} type="button" title="O'chirish">
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </>
            ) : (
              <>
                <button className="nd2-icon-btn nd2-icon-btn--success" onClick={handleSave} disabled={saving} type="button" title="Saqlash">
                  <Check size={16} strokeWidth={2.5} />
                </button>
                <button className="nd2-icon-btn" onClick={cancelEdit} disabled={saving} type="button" title="Bekor qilish">
                  <X size={16} strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>

          <div className="nd2-cover-center">
            {/* Thumbnail circle */}
            {editing ? (
              <label className="nd2-thumb-label">
                <input ref={thumbRef} type="file" accept="image/*" onChange={onThumbChange} hidden />
                <div className="nd2-cover-icon nd2-cover-icon--thumb">
                  {thumbPreview
                    ? <img src={thumbPreview} alt="" />
                    : <Image size={28} strokeWidth={1.5} color="#fff" />}
                  <div className="nd2-cover-icon-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                </div>
              </label>
            ) : (
              <div className="nd2-cover-icon nd2-cover-icon--thumb">
                {thumbPreview
                  ? <img src={thumbPreview} alt="" />
                  : <Image size={28} strokeWidth={1.5} color="#fff" />}
              </div>
            )}

            <h1 className="nd2-cover-title">
              {news?.title || 'Yangilik'}
            </h1>
            <p className="nd2-cover-sub">{fmtDate(news?.published_at)}</p>

            {/* Status pill */}
            {activeStatus && (
              <span className="nd2-status-pill" style={{ background: activeStatus.bg, color: activeStatus.color }}>
                {activeStatus.label}
              </span>
            )}
          </div>
        </div>

        {/* ── Sheet ── */}
        <div className="nd2-sheet">
          <div className="nd2-handle" />

          {/* Flash */}
          {msg && (
            <div className={`nd2-flash nd2-flash--${msg.type}`} role="alert">
              {msg.type === 'success'
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              }
              {msg.text}
            </div>
          )}

          <div className="nd2-rows">

            {/* Title */}
            <div className="nd2-row">
              <div className="nd2-row-left">
                <span className="nd2-row-icon"><Tag size={15} strokeWidth={2} /></span>
                <span className="nd2-row-label">Sarlavha</span>
              </div>
              <div className="nd2-row-input">
                {editing
                  ? <input type="text" value={form.title} onChange={e => patch('title', e.target.value)} placeholder="Sarlavha..." disabled={saving} />
                  : <span className="nd2-row-value">{news?.title || '—'}</span>
                }
              </div>
            </div>

            {/* Status */}
            <div className="nd2-row">
              <div className="nd2-row-left">
                <span className="nd2-row-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <span className="nd2-row-label">Holat</span>
              </div>
              <div className="nd2-row-input nd2-chips">
                {editing
                  ? STATUSES.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className={`nd2-chip${form.status === s.id ? ' sel' : ''}`}
                        style={form.status === s.id
                          ? { background: s.bg, color: s.color, borderColor: s.color }
                          : { borderColor: '#e0e0e0', color: '#888' }
                        }
                        onClick={() => patch('status', s.id)}
                        disabled={saving}
                      >
                        {s.label}
                      </button>
                    ))
                  : <span className="nd2-row-value" style={{ color: activeStatus?.color }}>{activeStatus?.label || '—'}</span>
                }
              </div>
            </div>

            {/* Published at */}
            <div className="nd2-row">
              <div className="nd2-row-left">
                <span className="nd2-row-icon"><Clock size={15} strokeWidth={2} /></span>
                <span className="nd2-row-label">Chop vaqti</span>
              </div>
              <div className="nd2-row-input">
                <span className="nd2-row-value">{fmtDate(news?.published_at)}</span>
              </div>
            </div>

            {/* Content */}
            <div className="nd2-row nd2-row--desc">
              <div className="nd2-row-left nd2-row-left--top">
                <span className="nd2-row-icon"><AlignLeft size={15} strokeWidth={2} /></span>
                <span className="nd2-row-label">Matn</span>
              </div>
              <div className="nd2-row-input">
                {editing
                  ? <textarea value={form.content} onChange={e => patch('content', e.target.value)} placeholder="Yangilik matni..." rows={5} disabled={saving} />
                  : <p className="nd2-content-text">{news?.content || '—'}</p>
                }
              </div>
            </div>

          </div>

          {/* Save button (only in edit mode) */}
          {editing && (
            <button className="nd2-save" onClick={handleSave} disabled={saving} type="button">
              {saving ? <><span className="nd2-spinner" /> Saqlanmoqda…</> : 'Saqlash'}
            </button>
          )}

        </div>{/* /sheet */}

        {/* ── Delete confirm overlay ── */}
        {confirmDel && (
          <div className="nd2-overlay">
            <div className="nd2-confirm">
              <div className="nd2-confirm-icon">
                <Trash2 size={24} strokeWidth={1.8} color="#e05252" />
              </div>
              <h3 className="nd2-confirm-title">O'chirilsinmi?</h3>
              <p className="nd2-confirm-sub">Bu amalni qaytarib bo'lmaydi.</p>
              <div className="nd2-confirm-btns">
                <button className="nd2-confirm-cancel" onClick={() => setConfirmDel(false)} disabled={deleting}>
                  Bekor qilish
                </button>
                <button className="nd2-confirm-delete" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <><span className="nd2-spinner nd2-spinner--dark" /> O'chirilmoqda…</> : 'O\'chirish'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.nd2 {
  --accent:     #3d9e6b;
  --accent-dk:  #2e7d52;
  --accent-lt:  #d0f8d0;
  --bg:         linear-gradient(160deg, #5effa5 0%, #3d9e6b 100%);
  --danger:     #e05252;
  --danger-lt:  rgba(224,82,82,0.1);

  width: 100%;
  min-height: 100vh;
  font-family: 'Nunito', sans-serif;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  position: relative;
}

/* ── Cover ── */
.nd2-cover {
  position: relative;
  padding: 3rem 1.5rem 6.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.nd2-cover--loading { min-height: 240px; }

.nd2-back {
  position: absolute;
  top: 1.1rem; left: 1.1rem;
  width: 38px; height: 38px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.15s;
}
.nd2-back:hover { background: rgba(255,255,255,0.28); }

.nd2-cover-actions {
  position: absolute;
  top: 1.1rem; right: 1.1rem;
  display: flex; gap: 8px;
}
.nd2-icon-btn {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.15s;
}
.nd2-icon-btn:hover { background: rgba(255,255,255,0.28); }
.nd2-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.nd2-icon-btn--danger:hover  { background: rgba(224,82,82,0.35); }
.nd2-icon-btn--success:hover { background: rgba(61,158,107,0.35); }

.nd2-cover-center {
  display: flex; flex-direction: column;
  align-items: center; gap: 0.35rem;
  margin-top: 0.5rem;
}

/* Thumbnail circle */
.nd2-thumb-label { cursor: pointer; }
.nd2-cover-icon {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: rgba(255,255,255,0.22);
  border: 3px solid rgba(255,255,255,0.6);
  display: flex; align-items: center; justify-content: center;
  color: #fff; margin-bottom: 0.4rem;
  overflow: hidden; position: relative;
}
.nd2-cover-icon--thumb img {
  width: 100%; height: 100%; object-fit: cover;
}
.nd2-cover-icon-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  color: #fff; opacity: 0; transition: opacity 0.18s;
}
.nd2-thumb-label:hover .nd2-cover-icon-overlay { opacity: 1; }

.nd2-cover-title {
  font-size: 1.2rem; font-weight: 800;
  color: #fff; margin: 0; text-align: center;
  max-width: 280px;
}
.nd2-cover-sub {
  font-size: 0.8rem; color: rgba(255,255,255,0.72); margin: 0;
}
.nd2-status-pill {
  font-size: 0.68rem; font-weight: 700;
  padding: 0.2rem 0.7rem; border-radius: 99px;
  margin-top: 0.1rem; letter-spacing: 0.02em;
}

/* ── Sheet ── */
.nd2-sheet {
  background: #f5f5f5;
  border-radius: 28px 28px 0 0;
  margin-top: -3rem; flex: 1;
  padding: 0 0 2.5rem;
  display: flex; flex-direction: column;
}
.nd2-handle {
  width: 40px; height: 4px;
  background: #ddd; border-radius: 99px;
  margin: 12px auto 18px; flex-shrink: 0;
}

/* Flash */
.nd2-flash {
  display: flex; align-items: center; gap: 0.5rem;
  margin: 0 1.25rem 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.84rem; font-weight: 600; border-radius: 14px;
}
.nd2-flash--success { background: var(--accent-lt); color: var(--accent-dk); }
.nd2-flash--error   { background: var(--danger-lt); color: var(--danger); }

/* ── Rows ── */
.nd2-rows { display: flex; flex-direction: column; }

.nd2-row {
  display: flex; align-items: center;
  padding: 0 1.25rem; min-height: 62px;
  border-bottom: 1px solid #ebebeb; gap: 0.75rem;
}
.nd2-row:last-child { border-bottom: none; }
.nd2-row--desc { align-items: flex-start; padding-top: 14px; padding-bottom: 14px; }

.nd2-row-left {
  display: flex; align-items: center;
  gap: 0.55rem; width: 120px; flex-shrink: 0;
}
.nd2-row-left--top { align-items: flex-start; padding-top: 2px; }

.nd2-row-icon { display: flex; align-items: center; color: #999; flex-shrink: 0; }
.nd2-row-label { font-size: 0.86rem; font-weight: 600; color: #333; white-space: nowrap; }

.nd2-row-input { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.nd2-row-value { font-size: 0.9rem; font-weight: 500; color: #222; text-align: right; }

/* View-mode content */
.nd2-content-text {
  font-size: 0.9rem; font-weight: 400; color: #333;
  line-height: 1.65; margin: 0; white-space: pre-wrap;
}

/* Edit-mode inputs */
.nd2-sheet input,
.nd2-sheet textarea {
  width: 100%; background: transparent;
  border: none; border-bottom: 1.5px solid #d8d8d8;
  border-radius: 0; outline: none;
  font-size: 0.9rem; font-weight: 500; color: #222;
  font-family: inherit; text-align: right;
  padding: 0.3rem 0; -webkit-appearance: none; appearance: none;
  transition: border-color 0.15s; resize: none;
}
.nd2-sheet input::placeholder,
.nd2-sheet textarea::placeholder { color: #bbb; }
.nd2-sheet input:focus,
.nd2-sheet textarea:focus { border-bottom-color: var(--accent); }
.nd2-sheet input:disabled,
.nd2-sheet textarea:disabled { opacity: 0.45; cursor: not-allowed; }

.nd2-sheet textarea {
  text-align: left; line-height: 1.55;
  border-bottom: none; border: 1.5px solid #d8d8d8;
  border-radius: 10px; padding: 0.6rem 0.75rem;
}
.nd2-sheet textarea:focus { border-color: var(--accent); }

/* Status chips */
.nd2-chips { flex-direction: row !important; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
.nd2-chip {
  font-size: 0.75rem; font-weight: 700; font-family: inherit;
  padding: 0.2rem 0.75rem; border-radius: 99px;
  border: 1.5px solid; background: transparent;
  cursor: pointer; transition: all 0.15s; opacity: 0.6;
}
.nd2-chip.sel   { opacity: 1; }
.nd2-chip:hover { opacity: 0.85; }
.nd2-chip:disabled { cursor: not-allowed; opacity: 0.35; }

/* Save button */
.nd2-save {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  margin: 1.25rem 1.25rem 0; padding: 1rem;
  background: linear-gradient(160deg, #5effa5 0%, #3d9e6b 100%);
  color: #fff; border: none; border-radius: 18px;
  font-size: 0.95rem; font-weight: 800; font-family: inherit;
  cursor: pointer; text-shadow: 0 1px 2px rgba(0,0,0,0.15);
  transition: opacity 0.15s, transform 0.1s;
}
.nd2-save:hover:not(:disabled) { opacity: 0.88; }
.nd2-save:active:not(:disabled) { transform: scale(0.985); }
.nd2-save:disabled { opacity: 0.5; cursor: not-allowed; }

.nd2-spinner {
  width: 15px; height: 15px;
  border: 2.5px solid rgba(255,255,255,0.35);
  border-top-color: #fff; border-radius: 50%;
  animation: nd2-spin 0.65s linear infinite; flex-shrink: 0;
}
.nd2-spinner--dark {
  border-color: rgba(0,0,0,0.15);
  border-top-color: var(--danger);
}
@keyframes nd2-spin { to { transform: rotate(360deg); } }

/* ── Skeletons ── */
.nd2-skeleton {
  background: rgba(255,255,255,0.25);
  border-radius: 8px;
  animation: nd2-pulse 1.4s ease-in-out infinite;
}
.nd2-skeleton--circle { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 8px; }
.nd2-skeleton--title  { width: 180px; height: 20px; }
.nd2-skeleton--sub    { width: 120px; height: 14px; margin-top: 6px; }
.nd2-skeleton--row    { width: 100%; height: 18px; border-radius: 6px;
  background: #ebebeb; animation: nd2-pulse 1.4s ease-in-out infinite; }
@keyframes nd2-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}

/* ── Delete confirm overlay ── */
.nd2-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 1rem;
}
.nd2-confirm {
  background: #fff; border-radius: 24px;
  padding: 2rem 1.5rem; max-width: 320px; width: 100%;
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.nd2-confirm-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--danger-lt);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 0.25rem;
}
.nd2-confirm-title { font-size: 1.1rem; font-weight: 800; color: #1a1a1a; margin: 0; }
.nd2-confirm-sub   { font-size: 0.84rem; color: #888; margin: 0 0 0.5rem; text-align: center; }
.nd2-confirm-btns  { display: flex; gap: 10px; width: 100%; margin-top: 0.5rem; }
.nd2-confirm-cancel {
  flex: 1; padding: 0.75rem; border-radius: 14px;
  border: 1.5px solid #e0e0e0; background: #fff;
  font-size: 0.9rem; font-weight: 700; color: #555;
  font-family: inherit; cursor: pointer; transition: background 0.15s;
}
.nd2-confirm-cancel:hover { background: #f5f5f5; }
.nd2-confirm-delete {
  flex: 1; padding: 0.75rem; border-radius: 14px;
  border: none; background: var(--danger);
  font-size: 0.9rem; font-weight: 700; color: #fff;
  font-family: inherit; cursor: pointer; transition: opacity 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.nd2-confirm-delete:hover:not(:disabled) { opacity: 0.88; }
.nd2-confirm-delete:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Mobile ── */
@media (max-width: 480px) {
  .nd2-cover { padding: 2.5rem 1rem 6rem; }

  .nd2-row {
    flex-direction: column; align-items: flex-start;
    padding-top: 12px; padding-bottom: 12px;
    min-height: unset; gap: 6px;
  }
  .nd2-row-left  { width: 100%; }
  .nd2-row-left--top { padding-top: 0; }
  .nd2-row-input { width: 100%; }
  .nd2-row-value { text-align: left; }
  .nd2-chips     { justify-content: flex-start !important; gap: 4px; }

  .nd2-sheet input,
  .nd2-sheet textarea {
    text-align: left; font-size: 0.85rem; width: 100%;
  }
  .nd2-row-label { font-size: 0.8rem; }
}
`
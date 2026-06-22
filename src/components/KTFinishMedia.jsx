import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Trash2, Pencil, Check, X, UploadCloud,
  Loader2, AlertTriangle, Film, ImageIcon,
  Play, CheckCircle2,FileText,
} from 'lucide-react'
import api from '../lib/api'
import { useParams } from 'react-router-dom'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MAX_SIZE = 50 * 1024 * 1024

// ── Inline-editable description ───────────────────────────────────────────────

function EditableDesc({ value, onSave, placeholder = 'Tavsif…' }) {
  const [editing, setEditing] = useState(false)
  const [text,    setText]    = useState(value ?? '')
  const [saving,  setSaving]  = useState(false)
  const ref = useRef(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const save = async () => {
    if (text === (value ?? '')) { setEditing(false); return }
    setSaving(true)
    try { await onSave(text) }
    finally { setSaving(false); setEditing(false) }
  }

  if (editing) return (
    <div className="km-desc-edit">
      <textarea
        ref={ref}
        className="km-desc-textarea"
        value={text}
        rows={2}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
          if (e.key === 'Escape') { setText(value ?? ''); setEditing(false) }
        }}
        placeholder={placeholder}
        maxLength={300}
      />
      <div className="km-desc-actions">
        <button className="km-icon-btn km-icon-btn--confirm" onClick={save} disabled={saving}>
          {saving ? <Loader2 size={11} className="km-spin" /> : <Check size={11} />}
        </button>
        <button className="km-icon-btn km-icon-btn--cancel" onClick={() => { setText(value ?? ''); setEditing(false) }}>
          <X size={11} />
        </button>
      </div>
    </div>
  )

  return (
    <button className="km-desc-view" onClick={() => setEditing(true)}>
      <span className={text ? 'km-desc-text' : 'km-desc-placeholder'}>
        {text || placeholder}
      </span>
      <Pencil size={10} className="km-desc-pencil" />
    </button>
  )
}

// ── Single media thumb ────────────────────────────────────────────────────────

function MediaThumb({ item, onDelete, onPatch }) {
  const [deleting, setDeleting] = useState(false)
  const isVideo = item.media_type === 'video'

  const handleDelete = async () => {
    if (!window.confirm("Bu mediafaylni o'chirishni tasdiqlaysizmi?")) return
    setDeleting(true)
    try { await onDelete(item.id) }
    finally { setDeleting(false) }
  }

  return (
    <div className={`km-thumb${deleting ? ' km-thumb--deleting' : ''}`}>
      <div className="km-thumb-img">
        {isVideo ? (
          <div className="km-thumb-video">
            <div className="km-play-ring"><Play size={14} fill="currentColor" strokeWidth={0} /></div>
          </div>
        ) : (
          <img src={item.media} alt={item.description || ''} loading="lazy" />
        )}
        <button className="km-thumb-del" onClick={handleDelete} disabled={deleting} title="O'chirish">
          {deleting ? <Loader2 size={10} className="km-spin" /> : <Trash2 size={10} />}
        </button>
      </div>
      <EditableDesc
        value={item.description}
        onSave={(desc) => onPatch(item.id, { description: desc })}
        placeholder="Tavsif qo'shing…"
      />
    </div>
  )
}

// ── Media column (left — existing media) ─────────────────────────────────────

function MediaColumn({ items, loading, onDelete, onPatch }) {
  return (
    <div className="km-col">
      <div className="km-col-header km-col-header--left">
        <ImageIcon size={13} strokeWidth={2} />
        Aniqlangan kamchiliklar
      </div>
      <div className="km-col-body">
        {loading ? (
          <>
            <div className="km-skel-thumb" />
            <div className="km-skel-thumb" />
            <div className="km-skel-thumb" />
          </>
        ) : items.length === 0 ? (
          <div className="km-col-empty">
            <Film size={20} strokeWidth={1.2} />
            <span>Hali fayl yo'q</span>
          </div>
        ) : (
          <div className="km-thumbs-grid">
            {items.map(item => (
              <MediaThumb
                key={item.id}
                item={item}
                onDelete={onDelete}
                onPatch={onPatch}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Upload column (right — new uploads) ──────────────────────────────────────

function UploadColumn({ taskId, onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [uploads,  setUploads]  = useState([])
  const [descs,    setDescs]    = useState({})
  const inputRef = useRef(null)

  const processFiles = (files) => {
    const valid = Array.from(files).filter(f => {
      if (f.size > MAX_SIZE) { alert(`${f.name} — maks 50 MB`); return false }
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
        alert(`${f.name} — faqat rasm va video`)
        return false
      }
      return true
    })
    if (!valid.length) return

    const entries = valid.map(f => ({
      id:       Math.random().toString(36).slice(2),
      file:     f,
      preview:  f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      isVideo:  f.type.startsWith('video/'),
      progress: 0,
      error:    null,
      done:     false,
    }))

    setUploads(prev => [...prev, ...entries])
  }

  const uploadOne = async (uid) => {
    const entry = uploads.find(u => u.id === uid)
    if (!entry) return

    const desc = descs[uid] ?? ''
    const form = new FormData()
    form.append('media', entry.file)
    if (desc) form.append('description', desc)

    try {
      await api.post(`/tasks/${taskId}/finish-media/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 100)
          setUploads(prev => prev.map(u => u.id === uid ? { ...u, progress: pct } : u))
        },
      })
      setUploads(prev => prev.map(u => u.id === uid ? { ...u, progress: 100, done: true } : u))
      onUploaded()
      setTimeout(() => {
        setUploads(prev => {
          const item = prev.find(u => u.id === uid)
          if (item?.preview) URL.revokeObjectURL(item.preview)
          return prev.filter(u => u.id !== uid)
        })
        setDescs(prev => { const n = { ...prev }; delete n[uid]; return n })
      }, 2000)
    } catch {
      setUploads(prev => prev.map(u => u.id === uid ? { ...u, error: 'Yuklashda xatolik' } : u))
    }
  }

  const removeQueued = (uid) => {
    setUploads(prev => {
      const item = prev.find(u => u.id === uid)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter(u => u.id !== uid)
    })
    setDescs(prev => { const n = { ...prev }; delete n[uid]; return n })
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  return (
    <div className="km-col">
      <div className="km-col-header km-col-header--right">
        <UploadCloud size={13} strokeWidth={2} />
        Bartaraf etilganligi
      </div>
      <div className="km-col-body">

        {uploads.length > 0 && (
          <div className="km-thumbs-grid">
            {uploads.map(u => (
              <div key={u.id} className={`km-thumb${u.done ? ' km-thumb--done' : ''}${u.error ? ' km-thumb--error' : ''}`}>
                <div className="km-thumb-img">
                  {u.isVideo ? (
                    <div className="km-thumb-video">
                      <div className="km-play-ring"><Play size={14} fill="currentColor" strokeWidth={0} /></div>
                    </div>
                  ) : u.preview ? (
                    <img src={u.preview} alt={u.file.name} />
                  ) : null}

                  {!u.done && !u.error && u.progress > 0 && (
                    <div className="km-thumb-progress-overlay">
                      <span className="km-thumb-pct">{u.progress}%</span>
                    </div>
                  )}
                  {u.done && (
                    <div className="km-thumb-done-overlay">
                      <CheckCircle2 size={20} strokeWidth={2} />
                    </div>
                  )}
                  {u.error && (
                    <div className="km-thumb-error-overlay">
                      <AlertTriangle size={16} strokeWidth={2} />
                    </div>
                  )}
                  {!u.progress && !u.done && (
                    <button className="km-thumb-del" onClick={() => removeQueued(u.id)}>
                      <X size={10} />
                    </button>
                  )}
                  {!u.done && !u.error && (
                    <div className="km-thumb-bar">
                      <div className="km-thumb-bar-fill" style={{ width: `${u.progress}%` }} />
                    </div>
                  )}
                </div>

                <div className="km-upload-desc-row">
                  <textarea
                    className="km-desc-textarea km-desc-textarea--sm"
                    rows={2}
                    placeholder="Tavsif qo'shing…"
                    value={descs[u.id] ?? ''}
                    onChange={e => setDescs(prev => ({ ...prev, [u.id]: e.target.value }))}
                    disabled={u.progress > 0 || u.done}
                  />
                  {!u.done && !u.error && !u.progress && (
                    <button className="km-upload-send-btn" onClick={() => uploadOne(u.id)}>
                      <UploadCloud size={12} />
                      Yuklash
                    </button>
                  )}
                  {u.error && (
                    <button className="km-upload-retry-btn" onClick={() => {
                      setUploads(prev => prev.map(x => x.id === u.id ? { ...x, error: null, progress: 0 } : x))
                      uploadOne(u.id)
                    }}>
                      Qayta
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className={`km-dropzone${dragging ? ' km-dropzone--drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => processFiles(e.target.files)}
          />
          <UploadCloud size={18} strokeWidth={1.5} />
          <span>{dragging ? 'Tashlang…' : 'Fayl tanlash yoki tashlang'}</span>
          <span className="km-drop-hint">Rasm · Video · Maks 50 MB</span>
        </div>

      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function KtFinishMedia() {
  const { id: taskId } = useParams()

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // ── Initial load — no fetchMedia in deps, only taskId ─────────────────────
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: json } = await api.get(`/tasks/${taskId}/finish-media/`)
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setError('Media fayllar yuklanmadi')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [taskId])

  // ── Manual refresh after upload — stable reference ─────────────────────────
  const fetchMedia = useCallback(async () => {
    try {
      const { data: json } = await api.get(`/tasks/${taskId}/finish-media/`)
      setData(json)
    } catch {
      // silent — user already sees existing data
    }
  }, [taskId])

  const handleDelete = useCallback(async (mediaId) => {
    await api.delete(`/tasks/${taskId}/finish-media/${mediaId}/`)
    setData(prev => ({
      ...prev,
      total: prev.total - 1,
      media: prev.media.filter(m => m.id !== mediaId),
    }))
  }, [taskId])

  const handlePatch = useCallback(async (mediaId, body) => {
    const { data: updated } = await api.patch(`/tasks/${taskId}/finish-media/${mediaId}/`, body)
    setData(prev => ({
      ...prev,
      media: prev.media.map(m => m.id === mediaId ? { ...m, ...updated } : m),
    }))
  }, [taskId])

  if (error) return (
    <div className="km-root">
      <div className="km-error-state">
        <AlertTriangle size={18} />
        <p>{error}</p>
        <button className="km-retry-btn" onClick={() => {
          setError(null)
          setLoading(true)
          api.get(`/tasks/${taskId}/finish-media/`)
            .then(({ data: json }) => setData(json))
            .catch(() => setError('Media fayllar yuklanmadi'))
            .finally(() => setLoading(false))
        }}>
          Qayta urinish
        </button>
      </div>
    </div>
  )

  return (
    <>
    <style>{CSS}</style>
    <div className="km-root">

      <div className="km-header">
        {loading ? (
          <div className="km-skel-title" />
        ) : (
          <>
            <h2 className="km-title">{data?.task_name ?? 'Topshiriq'}</h2>
            <span className="km-total-badge">{data?.total ?? 0} fayl</span>
          </>
        )}
      </div>

      <div className="km-two-col">
        <MediaColumn
          items={data?.media ?? []}
          loading={loading}
          onDelete={handleDelete}
          onPatch={handlePatch}
        />

        <div className="km-col-divider" />

        <UploadColumn taskId={taskId} onUploaded={fetchMedia} />
      </div>

    </div>
    </>
  )
}
// ── Styles ─────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Light tokens ── */
.light .km-root {
  --km-bg:        #ffffff;
  --km-surface:   #f4f5fe;
  --km-border:    rgba(103,104,238,0.14);
  --km-border-h:  rgba(103,104,238,0.30);
  --km-text:      #0f1117;
  --km-muted:     #7b8296;
  --km-subtle:    #b0b8cc;
  --km-hover:     rgba(103,104,238,0.07);
  --km-shadow:    0 1px 2px rgba(103,104,238,0.06), 0 0 0 1px rgba(103,104,238,0.08);
  --km-shadow-md: 0 4px 16px rgba(103,104,238,0.10), 0 0 0 1px rgba(103,104,238,0.10);
}

/* ── Dark tokens ── */
.dark .km-root {
  --km-bg:        #13162a;
  --km-surface:   #0f1122;
  --km-border:    rgba(131,132,243,0.14);
  --km-border-h:  rgba(131,132,243,0.30);
  --km-text:      #e4e7f5;
  --km-muted:     #4e5575;
  --km-subtle:    #2d3354;
  --km-hover:     rgba(103,104,238,0.10);
  --km-shadow:    0 0 0 1px rgba(131,132,243,0.10);
  --km-shadow-md: 0 0 0 1px rgba(131,132,243,0.16), 0 8px 24px rgba(103,104,238,0.08);
}

/* ── Root ── */
.km-root {
  display: flex; flex-direction: column; gap: 16px;
  padding: 0 1rem 2rem;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--km-text);
}

/* ── Header ── */
.km-header {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}

.km-title {
  font-size: 15px; font-weight: 700;
  color: var(--km-text); letter-spacing: -0.02em; margin: 0;
}

.km-badge {
  display: inline-flex; align-items: center;
  padding: 2px 9px; border-radius: 20px;
  font-size: 10.5px; font-weight: 600;
  border: 0.5px solid; white-space: nowrap; letter-spacing: 0.02em;
}

.km-total-badge {
  font-size: 11px; font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: #6768EE;
  background: rgba(103,104,238,0.10);
  border: 1px solid rgba(103,104,238,0.20);
  border-radius: 20px; padding: 2px 10px;
}
.dark .km-total-badge { color: #a5b4fc; background: rgba(103,104,238,0.14); border-color: rgba(131,132,243,0.24); }

.km-skel-title {
  height: 18px; width: 200px; border-radius: 6px;
  background: var(--km-surface);
  animation: km-shimmer 1.4s ease-in-out infinite;
}

/* ── Two column wrapper ── */
.km-two-col {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  gap: 0;
  background: var(--km-bg);
  border: 1px solid var(--km-border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--km-shadow);
  min-height: 400px;
}

.km-col-divider {
  background: var(--km-border);
  align-self: stretch;
}

/* ── Column ── */
.km-col {
  display: flex; flex-direction: column; min-width: 0;
}

.km-col-header {
  display: flex; align-items: center; gap: 7px;
  padding: 11px 16px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em;
  border-bottom: 1px solid var(--km-border);
  flex-shrink: 0;
}

.km-col-header--left  { color: #ef4444; background: rgba(239,68,68,0.04); border-top: 2px solid #ef4444; }
.km-col-header--right { color: #10b981; background: rgba(16,185,129,0.04); border-top: 2px solid #10b981; }

.dark .km-col-header--left  { background: rgba(239,68,68,0.06); }
.dark .km-col-header--right { background: rgba(16,185,129,0.06); }

.km-col-body {
  flex: 1; padding: 14px;
  display: flex; flex-direction: column; gap: 12px;
  overflow-y: auto;
}

/* ── Thumbs grid inside a column ── */
.km-thumbs-grid {
  display: flex; flex-direction: column; gap: 14px;
}

/* ── Single thumb item ── */
.km-thumb {
  display: flex; flex-direction: column; gap: 6px;
  transition: opacity 0.2s;
}

.km-thumb--deleting { opacity: 0.35; pointer-events: none; }
.km-thumb--done .km-thumb-img { opacity: 0.7; }
.km-thumb--error .km-thumb-img { border-color: rgba(239,68,68,0.40); }

.km-thumb-img {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 9px;
  overflow: hidden;
  background: var(--km-surface);
  border: 1px solid var(--km-border);
}

.km-thumb-img img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
}

/* Video placeholder */
.km-thumb-video {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(103,104,238,0.08), rgba(103,104,238,0.16));
}

.km-play-ring {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(103,104,238,0.20);
  border: 1.5px solid rgba(103,104,238,0.40);
  display: flex; align-items: center; justify-content: center;
  color: #6768EE; padding-left: 2px;
}
.dark .km-play-ring { color: #a5b4fc; background: rgba(103,104,238,0.25); border-color: rgba(131,132,243,0.40); }

/* Delete button */
.km-thumb-del {
  position: absolute; top: 5px; right: 5px;
  width: 22px; height: 22px; border-radius: 6px;
  border: 1px solid rgba(239,68,68,0.20);
  background: rgba(13,15,26,0.60);
  color: #fca5a5;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0; opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  backdrop-filter: blur(4px);
}
.km-thumb:hover .km-thumb-del, .km-thumb .km-thumb-del:hover { opacity: 1; }
.km-thumb-del:hover { background: rgba(239,68,68,0.80); color: #fff; border-color: transparent; }

/* Progress bar inside thumb */
.km-thumb-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 3px; background: rgba(255,255,255,0.15);
}
.km-thumb-bar-fill { height: 100%; background: #6768EE; transition: width 0.2s ease; }

/* Overlay states */
.km-thumb-progress-overlay,
.km-thumb-done-overlay,
.km-thumb-error-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 9px;
}
.km-thumb-progress-overlay { background: rgba(13,15,26,0.45); }
.km-thumb-done-overlay     { background: rgba(16,185,129,0.25); color: #10b981; }
.km-thumb-error-overlay    { background: rgba(239,68,68,0.25); color: #ef4444; }
.km-thumb-pct { font-size: 13px; font-weight: 700; color: #fff; font-family: 'JetBrains Mono', monospace; }

/* ── Editable description ── */
.km-desc-view {
  display: flex; align-items: flex-start; gap: 5px;
  background: none; border: none; padding: 0;
  cursor: pointer; text-align: left; width: 100%; min-height: 16px;
}
.km-desc-text        { font-size: 12px; font-weight: 500; color: var(--km-text); line-height: 1.45; flex: 1; }
.km-desc-placeholder { font-size: 12px; color: var(--km-subtle); font-style: italic; flex: 1; }
.km-desc-pencil      { color: var(--km-subtle); flex-shrink: 0; margin-top: 2px; opacity: 0; transition: opacity 0.15s; }
.km-desc-view:hover .km-desc-pencil { opacity: 1; }

.km-desc-edit { display: flex; flex-direction: column; gap: 5px; }

.km-desc-textarea {
  width: 100%;
  font-size: 12px; font-family: 'Inter', system-ui, sans-serif;
  color: var(--km-text); background: var(--km-surface);
  border: 1px solid #6768EE; border-radius: 7px;
  padding: 6px 8px; outline: none; resize: none;
  box-sizing: border-box;
  box-shadow: 0 0 0 2px rgba(103,104,238,0.10);
  transition: box-shadow 0.15s;
}
.km-desc-textarea:focus { box-shadow: 0 0 0 3px rgba(103,104,238,0.14); }
.km-desc-textarea--sm   { font-size: 11.5px; }

.km-desc-actions { display: flex; gap: 4px; }

.km-icon-btn {
  width: 22px; height: 22px; border-radius: 6px;
  border: 1px solid var(--km-border); background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0; transition: all 0.14s;
}
.km-icon-btn--confirm { color: #10b981; border-color: rgba(16,185,129,0.25); }
.km-icon-btn--confirm:hover { background: rgba(16,185,129,0.10); }
.km-icon-btn--cancel  { color: var(--km-muted); }
.km-icon-btn--cancel:hover { background: var(--km-hover); }

/* ── Upload desc + send row ── */
.km-upload-desc-row { display: flex; flex-direction: column; gap: 5px; }

.km-upload-send-btn {
  display: inline-flex; align-items: center; gap: 5px;
  align-self: flex-end;
  height: 26px; padding: 0 12px;
  font-size: 11.5px; font-weight: 600;
  font-family: 'Inter', system-ui, sans-serif;
  background: #6768EE; color: #ffffff; border: none;
  border-radius: 7px; cursor: pointer;
  box-shadow: 0 1px 4px rgba(103,104,238,0.30);
  transition: background 0.15s;
}
.km-upload-send-btn:hover { background: #5556d4; }

.km-upload-retry-btn {
  align-self: flex-end;
  height: 24px; padding: 0 10px;
  font-size: 11px; font-weight: 600; font-family: 'Inter', system-ui, sans-serif;
  background: transparent; color: #ef4444;
  border: 1px solid rgba(239,68,68,0.25); border-radius: 6px; cursor: pointer;
  transition: background 0.15s;
}
.km-upload-retry-btn:hover { background: rgba(239,68,68,0.08); }

/* ── Drop zone ── */
.km-dropzone {
  border: 2px dashed var(--km-border-h);
  border-radius: 10px; padding: 20px 16px;
  cursor: pointer; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  color: var(--km-muted); font-size: 12.5px;
  background: var(--km-surface);
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
  outline: none;
}
.km-dropzone:hover, .km-dropzone:focus-visible {
  border-color: #6768EE; background: rgba(103,104,238,0.04);
  box-shadow: 0 0 0 3px rgba(103,104,238,0.08);
  color: #6768EE;
}
.km-dropzone--drag {
  border-color: #6768EE; border-style: solid;
  background: rgba(103,104,238,0.07);
  box-shadow: 0 0 0 3px rgba(103,104,238,0.12);
  color: #6768EE;
}
.km-drop-hint { font-size: 10.5px; color: var(--km-subtle); }

/* ── Empty / error ── */
.km-col-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 7px;
  padding: 2rem 1rem; text-align: center;
  color: var(--km-subtle); font-size: 12.5px;
  flex: 1;
}

.km-error-state {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 3rem 1rem; text-align: center; color: #ef4444; font-size: 13px;
}
.km-error-state p { margin: 0; }

.km-retry-btn {
  height: 30px; padding: 0 16px; border-radius: 8px;
  border: 1px solid rgba(239,68,68,0.22); background: transparent;
  color: #ef4444; font-size: 12px; font-weight: 500;
  font-family: 'Inter', system-ui, sans-serif;
  cursor: pointer; margin-top: 4px; transition: background 0.15s;
}
.km-retry-btn:hover { background: rgba(239,68,68,0.08); }

/* ── Skeletons ── */
.km-skel-thumb {
  aspect-ratio: 16 / 9; border-radius: 9px;
  background: var(--km-surface);
  animation: km-shimmer 1.4s ease-in-out infinite;
}

@keyframes km-shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes km-spin    { to { transform: rotate(360deg); } }
.km-spin { animation: km-spin 0.75s linear infinite; display: inline-block; }

/* ── Mobile ── */
@media (max-width: 640px) {
  .km-two-col {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1px auto;
  }
  .km-col-divider { align-self: auto; width: auto; height: 1px; }
}

/* ── Scrollbar ── */
.km-col-body::-webkit-scrollbar { width: 3px; }
.km-col-body::-webkit-scrollbar-track { background: transparent; }
.km-col-body::-webkit-scrollbar-thumb { background: rgba(103,104,238,0.18); border-radius: 99px; }
`
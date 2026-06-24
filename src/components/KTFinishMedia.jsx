import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Trash2, Pencil, Check, X, UploadCloud,
  Loader2, AlertTriangle, Play, Eye,
  CheckCircle2, ImageOff, Plus, RefreshCw,
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const MAX_FILE_BYTES = 50 * 1024 * 1024

const STATUS_META = {
  'Kutilmoqda':    { color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  'Jarayonda':     { color: '#4338ca', bg: '#ede9fe', dot: '#6366f1' },
  'Bajarildi':     { color: '#065f46', bg: '#d1fae5', dot: '#10b981' },
  'Bekor qilindi': { color: '#991b1b', bg: '#fee2e2', dot: '#ef4444' },
}

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''

const fmtBytes = (b) =>
  !b ? '' : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

// ─────────────────────────────────────────────
// StatusPill
// ─────────────────────────────────────────────

function StatusPill({ status }) {
  const m = STATUS_META[status]
  if (!m) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      color: m.color, background: m.bg,
      border: `1px solid ${m.dot}55`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {status}
    </span>
  )
}

// ─────────────────────────────────────────────
// Lightbox
// ─────────────────────────────────────────────

function Lightbox({ src, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.90)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16,
        width: 36, height: 36, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.3)',
        background: 'rgba(255,255,255,0.12)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}><X size={16} /></button>
      <img
        src={src} alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 6, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// PhotoGrid  — renders a row of thumbnails (defect OR finish side)
// ─────────────────────────────────────────────

function PhotoGrid({ items, onPreview, size = 110 }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item) => {
        const isVideo = item.media_type === 'video'
        return (
          <div
            key={item.id}
            className="photo-thumb"
            onClick={() => !isVideo && onPreview(item.media_url)}
            style={{
              position: 'relative',
              width: size, height: size,
              borderRadius: 4, overflow: 'hidden',
              border: '1px solid #d1d5db',
              background: '#f3f4f6',
              cursor: isVideo ? 'default' : 'pointer',
              flexShrink: 0,
            }}
          >
            {isVideo ? (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f0f9ff',
              }}>
                <Play size={22} fill="#6366f1" strokeWidth={0} />
              </div>
            ) : (
              <>
                <img
                  src={item.media_url} alt={item.description || ''}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div className="photo-overlay" style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.30)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', opacity: 0, transition: 'opacity .15s',
                }}><Eye size={18} /></div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// FinishPhotoGrid  — same as PhotoGrid but each thumb has edit/delete
// ─────────────────────────────────────────────

function FinishPhotoGrid({ items, onPreview, onDelete, onPatch, size = 110 }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item) => (
        <FinishThumb
          key={item.id}
          item={item}
          size={size}
          onPreview={onPreview}
          onDelete={onDelete}
          onPatch={onPatch}
        />
      ))}
    </div>
  )
}

function FinishThumb({ item, size = 110, onPreview, onDelete, onPatch }) {
  const [deleting, setDeleting] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [desc,     setDesc]     = useState(item.description ?? '')
  const [saving,   setSaving]   = useState(false)
  const textRef = useRef(null)
  const isVideo = item.media_type === 'video'

  useEffect(() => { if (editing) textRef.current?.focus() }, [editing])

  const saveDesc = async () => {
    if (desc === (item.description ?? '')) { setEditing(false); return }
    setSaving(true)
    try { await onPatch(item.id, { description: desc }) }
    finally { setSaving(false); setEditing(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm("Bu faylni o'chirishni tasdiqlaysizmi?")) return
    setDeleting(true)
    try { await onDelete(item.id) }
    finally { setDeleting(false) }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      opacity: deleting ? 0.3 : 1, transition: 'opacity .2s',
      width: size,
    }}>
      <div
        className="finish-thumb"
        onClick={() => !isVideo && onPreview(item.media_url)}
        style={{
          position: 'relative', width: size, height: size,
          borderRadius: 4, overflow: 'hidden',
          border: '1px solid #d1d5db',
          background: '#f0fdf4',
          cursor: isVideo ? 'default' : 'pointer',
          flexShrink: 0,
        }}
      >
        {isVideo ? (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Play size={22} fill="#059669" strokeWidth={0} />
          </div>
        ) : (
          <>
            <img
              src={item.media_url} alt={desc}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div className="finish-overlay" style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', opacity: 0, transition: 'opacity .15s',
            }}><Eye size={18} /></div>
          </>
        )}

        {/* Date chip */}
        <span style={{
          position: 'absolute', bottom: 3, left: 3,
          fontSize: 8, fontWeight: 600,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          padding: '1px 4px', borderRadius: 3, pointerEvents: 'none',
        }}>{fmtDate(item.uploaded_at)}</span>

        {/* Action buttons */}
        <div className="finish-actions" style={{
          position: 'absolute', top: 3, right: 3,
          display: 'flex', gap: 2, opacity: 0, transition: 'opacity .15s',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true) }}
            title="Tahrirlash"
            style={actionBtn('#6366f1')}
          ><Pencil size={9} /></button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete() }}
            disabled={deleting}
            title="O'chirish"
            style={actionBtn('#ef4444')}
          >
            {deleting
              ? <Loader2 size={9} style={{ animation: 'spin .75s linear infinite' }} />
              : <Trash2 size={9} />}
          </button>
        </div>
      </div>

      {/* Inline desc editor */}
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <textarea
            ref={textRef}
            rows={2}
            value={desc}
            maxLength={300}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveDesc() }
              if (e.key === 'Escape') { setDesc(item.description ?? ''); setEditing(false) }
            }}
            placeholder="Tavsif…"
            style={{
              fontSize: 10, borderRadius: 4, border: '1px solid #6366f1',
              padding: '3px 5px', resize: 'none', outline: 'none',
              width: '100%', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 3 }}>
            <button onClick={saveDesc} disabled={saving} style={miniBtn('#059669', '#dcfce7')}>
              {saving ? <Loader2 size={9} style={{ animation: 'spin .75s linear infinite' }} /> : <Check size={9} />}
            </button>
            <button onClick={() => { setDesc(item.description ?? ''); setEditing(false) }} style={miniBtn('#94a3b8', '#f1f5f9')}>
              <X size={9} />
            </button>
          </div>
        </div>
      ) : desc ? (
        <p
          onClick={() => setEditing(true)}
          title="Tahrirlash uchun bosing"
          style={{
            margin: 0, fontSize: 10, color: '#374151', lineHeight: 1.4,
            cursor: 'pointer', wordBreak: 'break-word',
          }}>{desc}</p>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 10, color: '#9ca3af', fontStyle: 'italic', textAlign: 'left',
          }}
        >Tavsif qo'shing…</button>
      )}
    </div>
  )
}

const actionBtn = (color) => ({
  width: 18, height: 18, borderRadius: 3, border: 'none',
  background: `${color}dd`, color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
})

const miniBtn = (color, bg) => ({
  flex: 1, height: 18, borderRadius: 4,
  border: `1px solid ${color}55`, background: bg,
  color, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
})

// ─────────────────────────────────────────────
// UploadQueue  — pick + upload files for one defect row
// ─────────────────────────────────────────────

function UploadQueue({ taskId, defectId, onUploaded }) {
  const [queue,  setQueue] = useState([])
  const [open,   setOpen]  = useState(false)
  const inputRef = useRef(null)

  const addFiles = (files) => {
    const valid = Array.from(files).filter((f) => {
      if (f.size > MAX_FILE_BYTES) { alert(`${f.name} — maksimal hajm 50 MB`); return false }
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
        alert(`${f.name} — faqat rasm yoki video fayl`); return false
      }
      return true
    })
    if (!valid.length) return
    setOpen(true)
    setQueue((prev) => [
      ...prev,
      ...valid.map((f) => ({
        id:       crypto.randomUUID(),
        file:     f,
        preview:  f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
        isVideo:  f.type.startsWith('video/'),
        desc:     '',
        progress: 0,
        error:    null,
        done:     false,
      })),
    ])
  }

  const upd    = (id, p) => setQueue((prev) => prev.map((u) => u.id === id ? { ...u, ...p } : u))
  const remove = (id)    => setQueue((prev) => {
    const u = prev.find((x) => x.id === id)
    if (u?.preview) URL.revokeObjectURL(u.preview)
    return prev.filter((x) => x.id !== id)
  })

  const upload = async (id) => {
    const u = queue.find((x) => x.id === id)
    if (!u) return
    const form = new FormData()
    form.append('media',   u.file)
    form.append('defect',  defectId)   // links this fix to its defect
    if (u.desc) form.append('description', u.desc)
    try {
      await api.post(`/tasks/${taskId}/finish-media/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => upd(id, { progress: Math.round((e.loaded / e.total) * 100) }),
      })
      upd(id, { progress: 100, done: true })
      onUploaded()
      setTimeout(() => remove(id), 2000)
    } catch {
      upd(id, { error: 'Yuklashda xatolik yuz berdi', progress: 0 })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* Queue items */}
      {queue.map((u) => (
        <div key={u.id} style={{
          display: 'flex', gap: 8, padding: '6px 8px', borderRadius: 6,
          border: `1px solid ${u.done ? '#86efac' : u.error ? '#fca5a5' : '#e5e7eb'}`,
          background: u.done ? '#f0fdf4' : u.error ? '#fff1f2' : '#f9fafb',
        }}>
          {/* Preview */}
          <div style={{
            width: 38, height: 38, borderRadius: 4, overflow: 'hidden',
            background: '#e5e7eb', flexShrink: 0, position: 'relative',
          }}>
            {u.isVideo
              ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={12} fill="#6366f1" strokeWidth={0} />
                </div>
              : u.preview
                ? <img src={u.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : null}
            {u.progress > 0 && !u.done && !u.error && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, color: '#fff',
              }}>{u.progress}%</div>
            )}
            {u.done && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}><CheckCircle2 size={13} /></div>
            )}
            {u.progress > 0 && !u.done && !u.error && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ height: '100%', width: `${u.progress}%`, background: '#6366f1', transition: 'width .2s' }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.file.name}
            </span>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>{fmtBytes(u.file.size)}</span>
            <textarea
              rows={1}
              placeholder="Tavsif (ixtiyoriy)…"
              value={u.desc}
              onChange={(e) => upd(u.id, { desc: e.target.value })}
              disabled={u.progress > 0 || u.done}
              style={{
                fontSize: 10, borderRadius: 3, border: '1px solid #e5e7eb',
                padding: '2px 4px', resize: 'none', outline: 'none',
                background: '#fff', color: '#111827', width: '100%', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {u.error && <span style={{ fontSize: 9, color: '#ef4444' }}>{u.error}</span>}
              {!u.done && !u.progress && !u.error && (
                <>
                  <button onClick={() => remove(u.id)} style={{ fontSize: 9, color: '#9ca3af', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                    Bekor
                  </button>
                  <button onClick={() => upload(u.id)} style={{
                    marginLeft: 'auto', height: 18, padding: '0 7px', fontSize: 9, fontWeight: 600,
                    background: '#6366f1', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 2,
                  }}>
                    <UploadCloud size={9} /> Yuklash
                  </button>
                </>
              )}
              {u.error && (
                <button onClick={() => { upd(u.id, { error: null }); upload(u.id) }} style={{
                  marginLeft: 'auto', fontSize: 9, color: '#ef4444',
                  border: '1px solid #fca5a5', background: 'none', borderRadius: 3,
                  padding: '1px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                }}>
                  <RefreshCw size={8} /> Qayta
                </button>
              )}
              {u.progress > 0 && !u.done && !u.error && (
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Loader2 size={9} style={{ animation: 'spin .75s linear infinite' }} /> Yuklanmoqda…
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add file trigger */}
      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
        border: '1px dashed #d1d5db',
        background: '#f9fafb', color: '#6b7280',
        fontSize: 10, fontWeight: 500, userSelect: 'none',
        alignSelf: 'flex-start',
      }}>
        <input
          ref={inputRef}
          type="file" accept="image/*,video/*" multiple
          style={{ display: 'none' }}
          onChange={(e) => addFiles(e.target.files)}
        />
        <Plus size={10} />
        Fayl qo'shish
      </label>
    </div>
  )
}

// ─────────────────────────────────────────────
// DefectRow  — the main paired row, mirrors the Word table layout
// ─────────────────────────────────────────────

function DefectRow({ index, taskId, defect, onDelete, onPatch, onUploaded }) {
  const [lightbox, setLightbox] = useState(null)
  const isFirst = index === 0

  return (
    <>
      {/* Row wrapper — two equal columns, no outer padding so borders touch */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 160 }}>

        {/* ── LEFT — defect (read-only) ── */}
        <div style={{
          padding: '14px 16px',
          borderRight: '1px solid #d1d5db',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Photos — only if the defect has a media_url (some rows are text-only) */}
          {defect.media_url && (
            <PhotoGrid
              items={[defect]}          // single defect per row in current API shape
              onPreview={(src) => setLightbox(src)}
              size={110}
            />
          )}

          {/* Description text */}
          {defect.description && (
            <p style={{
              margin: 0,
              fontSize: 12, color: '#111827', lineHeight: 1.55,
              fontStyle: 'italic',
            }}>
              {defect.description}
            </p>
          )}

          {/* Empty state */}
          {!defect.media_url && !defect.description && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#d1d5db', fontSize: 11 }}>
              <ImageOff size={13} /> <span>Rasm yo'q</span>
            </div>
          )}
        </div>

        {/* ── RIGHT — resolutions (editable) ── */}
        <div style={{
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Already uploaded fixes */}
          {defect.finish_media.length > 0 && (
            <FinishPhotoGrid
              items={defect.finish_media}
              onPreview={(src) => setLightbox(src)}
              onDelete={onDelete}
              onPatch={onPatch}
              size={110}
            />
          )}

          {/* Upload zone */}
          <UploadQueue
            taskId={taskId}
            defectId={defect.id}
            onUploaded={onUploaded}
          />
        </div>
      </div>

      {/* Row divider */}
      <div style={{ height: 1, background: '#d1d5db' }} />

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

function SkeletonRow() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 160 }}>
        {[0, 1].map((side) => (
          <div key={side} style={{
            padding: '14px 16px',
            borderRight: side === 0 ? '1px solid #d1d5db' : undefined,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 110, height: 110, borderRadius: 4,
                  background: '#f3f4f6', animation: 'shimmer 1.4s ease-in-out infinite',
                }} />
              ))}
            </div>
            <div style={{ width: '80%', height: 10, borderRadius: 4, background: '#f3f4f6', animation: 'shimmer 1.4s ease-in-out infinite' }} />
            <div style={{ width: '60%', height: 10, borderRadius: 4, background: '#f3f4f6', animation: 'shimmer 1.4s ease-in-out infinite' }} />
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: '#d1d5db' }} />
    </>
  )
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export default function KtFinishMedia() {
  const { id: taskId } = useParams()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchMedia = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data: json } = await api.get(`/tasks/${taskId}/finish-media/`)
      setData(json)
    } catch {
      setError("Ma'lumotlarni yuklab bo'lmadi")
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  const handleDelete = useCallback(async (mediaId) => {
    await api.delete(`/tasks/${taskId}/finish-media/${mediaId}/`)
    setData((prev) => ({
      ...prev,
      total: Math.max(0, (prev.total ?? 1) - 1),
      defects: prev.defects.map((d) => ({
        ...d,
        finish_media: d.finish_media.filter((m) => m.id !== mediaId),
      })),
    }))
  }, [taskId])

  const handlePatch = useCallback(async (mediaId, body) => {
    const { data: updated } = await api.patch(`/tasks/${taskId}/finish-media/${mediaId}/`, body)
    setData((prev) => ({
      ...prev,
      defects: prev.defects.map((d) => ({
        ...d,
        finish_media: d.finish_media.map((m) => (m.id === mediaId ? { ...m, ...updated } : m)),
      })),
    }))
  }, [taskId])

  const defects = data?.defects ?? []

  // ── Error ────────────────────────────────────────────────────────────────

  if (error) return (
    <>
      <style>{CSS}</style>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, padding: '3rem 1rem', color: '#dc2626',
      }}>
        <AlertTriangle size={20} />
        <p style={{ margin: 0, fontSize: 13 }}>{error}</p>
        <button onClick={fetchMedia} style={{
          padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
          border: '1px solid #fca5a5', background: 'none', color: '#dc2626',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <RefreshCw size={12} /> Qayta urinish
        </button>
      </div>
    </>
  )

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{CSS}</style>

      {/* ── Table wrapper — exactly like the Word doc ── */}
      <div style={{
        border: '1.5px solid #d1d5db',
        borderRadius: 6,
        overflow: 'hidden',
        fontFamily: "'Times New Roman', Times, serif",
      }}>

        {/* Title row */}
        <div style={{
          padding: '10px 16px',
          textAlign: 'center',
          borderBottom: '1.5px solid #d1d5db',
          background: '#fff',
        }}>
          {loading ? (
            <div style={{ width: 240, height: 16, borderRadius: 4, background: '#f3f4f6', margin: '0 auto', animation: 'shimmer 1.4s ease-in-out infinite' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                "{data?.task_name ?? 'Topshiriq'}" xizmati
              </span>
              <StatusPill status={data?.task_status} />
              {(data?.total ?? 0) > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#4338ca',
                  background: '#ede9fe', borderRadius: 20, padding: '1px 8px',
                  border: '1px solid #c4b5fd55',
                }}>{data.total} ta yechim</span>
              )}
            </div>
          )}
        </div>

        {/* Column header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          borderBottom: '1.5px solid #d1d5db',
          background: '#fff',
        }}>
          <div style={{
            padding: '8px 16px',
            borderRight: '1px solid #d1d5db',
            textAlign: 'center',
            fontSize: 13, fontWeight: 700,
            color: '#dc2626',
            borderTop: '3px solid #dc2626',
          }}>
            Aniqlangan kamchiliklar
          </div>
          <div style={{
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: 13, fontWeight: 700,
            color: '#059669',
            borderTop: '3px solid #059669',
          }}>
            Bartaraf qilinganiligi
          </div>
        </div>

        {/* Data rows */}
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : defects.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 6, padding: '3rem 1rem', color: '#9ca3af', fontSize: 12,
          }}>
            <ImageOff size={20} strokeWidth={1.2} />
            <span>Kamchiliklar topilmagan</span>
          </div>
        ) : (
          defects.map((defect, i) => (
            <DefectRow
              key={defect.id}
              index={i}
              taskId={taskId}
              defect={defect}
              onDelete={handleDelete}
              onPatch={handlePatch}
              onUploaded={fetchMedia}
            />
          ))
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// CSS — only what inline styles can't express
// ─────────────────────────────────────────────

const CSS = `
  @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes spin    { to { transform:rotate(360deg) } }

  .photo-thumb:hover .photo-overlay   { opacity: 1 !important; }
  .finish-thumb:hover .finish-overlay { opacity: 1 !important; }
  .finish-thumb:hover .finish-actions { opacity: 1 !important; }
`
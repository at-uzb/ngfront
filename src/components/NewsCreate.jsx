import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, FileImage, Loader, AlignLeft, Tag, Clock, Image } from 'lucide-react'
import api from '../lib/api'

const STATUSES = [
  { id: 'draft',     label: 'Qoralama', color: '#888',    bg: 'rgba(136,136,136,0.12)' },
  { id: 'published', label: 'Chop etish', color: '#3d9e6b', bg: 'rgba(61,158,107,0.12)' },
  { id: 'archived',  label: 'Arxiv',    color: '#d4900a', bg: 'rgba(212,144,10,0.12)'  },
]

export default function NewsCreate() {
  const navigate      = useNavigate()
  const thumbInputRef = useRef(null)
  const galleryRef    = useRef(null)

  const [form, setForm] = useState({
    title: '', content: '', status: 'draft', published_at: '',
  })
  const [thumbnail,    setThumbnail]    = useState(null)   // { file, preview }
  const [galleryFiles, setGalleryFiles] = useState([])     // [{ id, file, preview }]
  const [fieldErrors,  setFieldErrors]  = useState({})
  const [saving,       setSaving]       = useState(false)
  const [dragOver,     setDragOver]     = useState(false)
  const [msg,          setMsg]          = useState(null)

  const patch = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setFieldErrors(fe => ({ ...fe, [k]: '' }))
  }

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  // ── Thumbnail ────────────────────────────────────────────
  const setThumb = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (thumbnail) URL.revokeObjectURL(thumbnail.preview)
    setThumbnail({ file, preview: URL.createObjectURL(file) })
  }

  const removeThumb = () => {
    if (thumbnail) URL.revokeObjectURL(thumbnail.preview)
    setThumbnail(null)
  }

  // ── Gallery ──────────────────────────────────────────────
  const addGallery = useCallback((files) => {
    const next = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({
        id: Math.random().toString(36).slice(2),
        file,
        preview: URL.createObjectURL(file),
      }))
    setGalleryFiles(prev => [...prev, ...next])
  }, [])

  const removeGallery = (id) => {
    setGalleryFiles(prev => {
      const item = prev.find(f => f.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter(f => f.id !== id)
    })
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addGallery(e.dataTransfer.files)
  }

  // ── Validate ─────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.title.trim())   errs.title   = 'Sarlavha kiritilishi shart'
    if (!form.content.trim()) errs.content = 'Matn kiritilishi shart'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title',   form.title.trim())
      fd.append('content', form.content.trim())
      fd.append('status',  form.status)
      if (form.published_at) {
        const dt = new Date(form.published_at)
        fd.append('published_at', dt.toISOString().split('.')[0] + 'Z')
      }
      if (thumbnail) fd.append('thumbnail_file', thumbnail.file)
      galleryFiles.forEach(({ file }) => fd.append('gallery_files', file))

      const response = await api.post('/news/news/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate(`/news/${response.data.slug}/`)
    } catch (err) {
      const data = err?.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const fe = {}
        Object.entries(data).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? v[0] : String(v) })
        setFieldErrors(fe)
        flash('error', 'Iltimos, xatolarni tekshiring')
      } else {
        flash('error', 'Saqlashda xatolik yuz berdi')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="nc2">

        {/* ── Cover ── */}
        <div className="nc2-cover">
          <button className="nc2-back" onClick={() => navigate(-1)} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div className="nc2-cover-center">
            <div className="nc2-cover-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
              </svg>
            </div>
            <h1 className="nc2-cover-title">Yangi yangilik</h1>
            <p className="nc2-cover-sub">Barcha maydonlarni to'ldiring</p>
          </div>
        </div>

        {/* ── Sheet ── */}
        <div className="nc2-sheet">
          <div className="nc2-handle" />

          {/* Flash */}
          {msg && (
            <div className={`nc2-flash nc2-flash--${msg.type}`} role="alert">
              {msg.type === 'success'
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              }
              {msg.text}
            </div>
          )}

          <div className="nc2-rows">

            {/* Title */}
            <div className="nc2-row nc2-row--tall">
              <div className="nc2-row-left">
                <span className="nc2-row-icon"><Tag size={15} strokeWidth={2} /></span>
                <span className="nc2-row-label">Sarlavha <span className="nc2-req">*</span></span>
              </div>
              <div className="nc2-row-input">
                <input
                  className={fieldErrors.title ? 'err' : ''}
                  type="text"
                  autoFocus
                  placeholder="Yangilik sarlavhasi..."
                  value={form.title}
                  onChange={e => patch('title', e.target.value)}
                  disabled={saving}
                />
                {fieldErrors.title && <span className="nc2-ferr">{fieldErrors.title}</span>}
              </div>
            </div>

            {/* Status */}
            <div className="nc2-row">
              <div className="nc2-row-left">
                <span className="nc2-row-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <span className="nc2-row-label">Holat</span>
              </div>
              <div className="nc2-row-input nc2-chips">
                {STATUSES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`nc2-chip${form.status === s.id ? ' sel' : ''}`}
                    style={form.status === s.id
                      ? { background: s.bg, color: s.color, borderColor: s.color }
                      : { borderColor: '#e0e0e0', color: '#888' }
                    }
                    onClick={() => patch('status', s.id)}
                    disabled={saving}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Published at */}
            <div className="nc2-row">
              <div className="nc2-row-left">
                <span className="nc2-row-icon"><Clock size={15} strokeWidth={2} /></span>
                <span className="nc2-row-label">Chop vaqti</span>
              </div>
              <div className="nc2-row-input">
                <input
                  type="datetime-local"
                  value={form.published_at}
                  onChange={e => patch('published_at', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Content */}
            <div className="nc2-row nc2-row--desc">
              <div className="nc2-row-left nc2-row-left--top">
                <span className="nc2-row-icon"><AlignLeft size={15} strokeWidth={2} /></span>
                <span className="nc2-row-label">Matn <span className="nc2-req">*</span></span>
              </div>
              <div className="nc2-row-input">
                <textarea
                  className={fieldErrors.content ? 'err' : ''}
                  placeholder="Yangilik matni..."
                  value={form.content}
                  onChange={e => patch('content', e.target.value)}
                  rows={5}
                  disabled={saving}
                />
                {fieldErrors.content && <span className="nc2-ferr">{fieldErrors.content}</span>}
              </div>
            </div>

            {/* Thumbnail */}
            <div className="nc2-row nc2-row--media">
              <div className="nc2-row-left nc2-row-left--top">
                <span className="nc2-row-icon"><Image size={15} strokeWidth={2} /></span>
                <span className="nc2-row-label">Muqova</span>
              </div>
              <div className="nc2-row-input">
                {thumbnail ? (
                  <div className="nc2-thumb-wrap">
                    <img src={thumbnail.preview} alt="" />
                    <button className="nc2-thumb-del" onClick={removeThumb} type="button">
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="nc2-dropzone"
                    onClick={() => thumbInputRef.current?.click()}
                  >
                    <Upload size={16} strokeWidth={1.5} />
                    <span>Muqova rasmini <u>tanlang</u></span>
                    <input
                      ref={thumbInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => { setThumb(e.target.files[0]); e.target.value = '' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Gallery */}
            <div className="nc2-row nc2-row--media">
              <div className="nc2-row-left nc2-row-left--top">
                <span className="nc2-row-icon"><FileImage size={15} strokeWidth={2} /></span>
                <span className="nc2-row-label">Galereya</span>
              </div>
              <div className="nc2-row-input">
                <div
                  className={`nc2-dropzone${dragOver ? ' over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => galleryRef.current?.click()}
                >
                  <Upload size={18} strokeWidth={1.5} />
                  <span>Rasmlarni tashlang yoki <u>tanlang</u></span>
                  <input
                    ref={galleryRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => { addGallery(e.target.files); e.target.value = '' }}
                  />
                </div>

                {galleryFiles.length > 0 && (
                  <div className="nc2-media-grid">
                    {galleryFiles.map(({ id, preview }) => (
                      <div className="nc2-media-card" key={id}>
                        <div className="nc2-media-img-wrap">
                          <img src={preview} alt="" />
                          <button className="nc2-media-del" onClick={() => removeGallery(id)} type="button">
                            <X size={10} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>{/* /rows */}

          <button className="nc2-save" onClick={handleSave} disabled={saving} type="button">
            {saving
              ? <><span className="nc2-spinner" /> Saqlanmoqda…</>
              : 'Saqlash'}
          </button>

        </div>{/* /sheet */}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.nc2 {
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
}

/* ── Cover ── */
.nc2-cover {
  position: relative;
  padding: 3rem 1.5rem 6.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.nc2-back {
  position: absolute;
  top: 1.1rem; left: 1.1rem;
  width: 38px; height: 38px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.nc2-back:hover { background: rgba(255,255,255,0.28); }

.nc2-cover-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.5rem;
}

.nc2-cover-icon {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: rgba(255,255,255,0.22);
  border: 3px solid rgba(255,255,255,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 0.4rem;
}

.nc2-cover-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
}

.nc2-cover-sub {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.72);
  margin: 0;
}

/* ── Sheet ── */
.nc2-sheet {
  background: #f5f5f5;
  border-radius: 28px 28px 0 0;
  margin-top: -3rem;
  flex: 1;
  padding: 0 0 2.5rem;
  display: flex;
  flex-direction: column;
}

.nc2-handle {
  width: 40px; height: 4px;
  background: #ddd;
  border-radius: 99px;
  margin: 12px auto 18px;
  flex-shrink: 0;
}

/* Flash */
.nc2-flash {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 1.25rem 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.84rem;
  font-weight: 600;
  border-radius: 14px;
}
.nc2-flash--success { background: var(--accent-lt); color: var(--accent-dk); }
.nc2-flash--error   { background: var(--danger-lt); color: var(--danger); }

/* ── Rows ── */
.nc2-rows { display: flex; flex-direction: column; }

.nc2-row {
  display: flex;
  align-items: center;
  padding: 0 1.25rem;
  min-height: 62px;
  border-bottom: 1px solid #ebebeb;
  gap: 0.75rem;
}
.nc2-row:last-child { border-bottom: none; }
.nc2-row--tall  { min-height: 68px; }
.nc2-row--desc  { align-items: flex-start; padding-top: 14px; padding-bottom: 14px; }
.nc2-row--media { align-items: flex-start; padding-top: 14px; padding-bottom: 14px; }

.nc2-row-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 120px;
  flex-shrink: 0;
}
.nc2-row-left--top { align-items: flex-start; padding-top: 2px; }

.nc2-row-icon { display: flex; align-items: center; color: #999; flex-shrink: 0; }

.nc2-row-label {
  font-size: 0.86rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}
.nc2-req { color: var(--danger); }

.nc2-row-input { flex: 1; display: flex; flex-direction: column; gap: 3px; }

/* Inputs / textarea */
.nc2-sheet input,
.nc2-sheet textarea {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1.5px solid #d8d8d8;
  border-radius: 0;
  outline: none;
  font-size: 0.9rem;
  font-weight: 500;
  color: #222;
  font-family: inherit;
  text-align: right;
  padding: 0.3rem 0;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color 0.15s;
  resize: none;
}
.nc2-sheet input::placeholder,
.nc2-sheet textarea::placeholder { color: #bbb; }
.nc2-sheet input:focus,
.nc2-sheet textarea:focus { border-bottom-color: var(--accent); }
.nc2-sheet input:disabled,
.nc2-sheet textarea:disabled { opacity: 0.45; cursor: not-allowed; }
.nc2-sheet input.err,
.nc2-sheet textarea.err { border-bottom-color: var(--danger); }

.nc2-sheet textarea {
  text-align: left;
  line-height: 1.55;
  border-bottom: none;
  border: 1.5px solid #d8d8d8;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
}
.nc2-sheet textarea:focus { border-color: var(--accent); }

.nc2-ferr { font-size: 11px; color: var(--danger); }

/* Status chips */
.nc2-chips {
  flex-direction: row !important;
  gap: 6px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.nc2-chip {
  font-size: 0.75rem;
  font-weight: 700;
  font-family: inherit;
  padding: 0.2rem 0.75rem;
  border-radius: 99px;
  border: 1.5px solid;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  opacity: 0.6;
}
.nc2-chip.sel   { opacity: 1; }
.nc2-chip:hover { opacity: 0.85; }
.nc2-chip:disabled { cursor: not-allowed; opacity: 0.35; }

/* Thumbnail */
.nc2-thumb-wrap {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 16/7;
  background: #eee;
  border: 0.5px solid #e0e0e0;
}
.nc2-thumb-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
.nc2-thumb-del {
  position: absolute;
  top: 6px; right: 6px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  padding: 0;
}

/* Dropzone */
.nc2-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 20px 16px;
  border: 1.5px dashed #d0d0d0;
  border-radius: 12px;
  cursor: pointer;
  color: #aaa;
  font-size: 0.82rem;
  text-align: center;
  transition: all 0.15s;
}
.nc2-dropzone:hover,
.nc2-dropzone.over { border-color: var(--accent); color: var(--accent-dk); background: rgba(61,158,107,0.04); }
.nc2-dropzone u { text-decoration-color: currentColor; }

/* Gallery grid */
.nc2-media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  margin-top: 8px;
}
.nc2-media-card { display: flex; flex-direction: column; gap: 4px; }
.nc2-media-img-wrap {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4/3;
  background: #eee;
  border: 0.5px solid #e0e0e0;
}
.nc2-media-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
.nc2-media-del {
  position: absolute;
  top: 4px; right: 4px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s;
  padding: 0;
}
.nc2-media-img-wrap:hover .nc2-media-del { opacity: 1; }

/* Save */
.nc2-save {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 1.25rem 1.25rem 0;
  padding: 1rem;
  background: linear-gradient(160deg, #5effa5 0%, #3d9e6b 100%);
  color: #fff;
  border: none;
  border-radius: 18px;
  font-size: 0.95rem;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  text-shadow: 0 1px 2px rgba(0,0,0,0.15);
  transition: opacity 0.15s, transform 0.1s;
}
.nc2-save:hover:not(:disabled) { opacity: 0.88; }
.nc2-save:active:not(:disabled) { transform: scale(0.985); }
.nc2-save:disabled { opacity: 0.5; cursor: not-allowed; }

.nc2-spinner {
  width: 15px; height: 15px;
  border: 2.5px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: nc2-spin 0.65s linear infinite;
  flex-shrink: 0;
}
@keyframes nc2-spin { to { transform: rotate(360deg); } }

@media (max-width: 480px) {
  .nc2-cover { padding: 2.5rem 1rem 6rem; }

  .nc2-row {
    flex-direction: column;
    align-items: flex-start;
    padding-top: 12px;
    padding-bottom: 12px;
    min-height: unset;
    gap: 6px;
  }

  .nc2-row-left {
    width: 100%;
  }

  .nc2-row-left--top {
    padding-top: 0;
  }

  .nc2-row-input {
    width: 100%;
  }

  .nc2-chips {
    justify-content: flex-start !important;
    gap: 4px;
  }

  .nc2-sheet input,
  .nc2-sheet select,
  .nc2-sheet textarea {
    text-align: left;
    font-size: 0.85rem;
    width: 100%;
  }

  .nc2-row-label { font-size: 0.8rem; }
}
`
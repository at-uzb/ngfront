import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, FileImage, Calendar, AlignLeft, Tag, Users, Check } from 'lucide-react'
import api from '../lib/api'
import { useGroupStore } from '../hooks/useGroupStore'

const PRIORITIES = [
  { id: 'yuqori', label: 'Yuqori', color: '#e05252', bg: 'rgba(224,82,82,0.12)',  hours: 24  },
  { id: 'orta',   label: "O'rta",  color: '#d4900a', bg: 'rgba(212,144,10,0.12)', hours: 72  },
  { id: 'past',   label: 'Past',   color: '#3d9e6b', bg: 'rgba(61,158,107,0.12)', hours: 168 },
]

const deadlineFor = (priorityId) => {
  const hours = PRIORITIES.find(p => p.id === priorityId)?.hours ?? 168
  const dt  = new Date(Date.now() + hours * 60 * 60 * 1000)
  const pad = n => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

export default function TaskCreate() {
  const navigate     = useNavigate()
  const fileInputRef = useRef(null)
  const { groups }   = useGroupStore()   // CHANGED: no longer need selectedId/setSelectedId

  const [form, setForm] = useState({
    name: '', priority: 'past', deadline: '', description: '',
  })
  // CHANGED: was  selectedId (single number)  →  selectedGroupIds (Set of numbers)
  const [selectedGroupIds, setSelectedGroupIds] = useState(new Set())
  const [mediaFiles,  setMediaFiles]  = useState([])
  const [error,       setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving,      setSaving]      = useState(false)
  const [dragOver,    setDragOver]    = useState(false)
  const [msg,         setMsg]         = useState(null)

  useEffect(() => {
    setForm(f => ({ ...f, deadline: deadlineFor('past') }))
  }, [])

  const patch = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'priority') next.deadline = deadlineFor(v)
      return next
    })
    setFieldErrors(fe => ({ ...fe, [k]: '' }))
  }

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  // CHANGED: toggle a group in/out of the selected Set
  const toggleGroup = (id) => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setFieldErrors(fe => ({ ...fe, group_ids: '' }))
  }

  // ── Files ─────────────────────────────────────────────────────────────────

  const addFiles = useCallback((files) => {
    const next = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({
        id:          Math.random().toString(36).slice(2),
        file,
        preview:     URL.createObjectURL(file),
        description: '',
      }))
    setMediaFiles(prev => [...prev, ...next])
  }, [])

  const removeFile = (id) => {
    setMediaFiles(prev => {
      const item = prev.find(f => f.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter(f => f.id !== id)
    })
  }

  const patchFileDesc = (id, desc) =>
    setMediaFiles(prev => prev.map(f => f.id === id ? { ...f, description: desc } : f))

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  // ── Validate ──────────────────────────────────────────────────────────────

  const validate = () => {
    const errs = {}
    if (!form.name.trim())           errs.name        = 'Nom kiritilishi shart'
    if (!form.description.trim())    errs.description = 'Tavsif kiritilishi shart'
    // CHANGED: was  !selectedId  →  no group selected at all
    if (selectedGroupIds.size === 0) errs.group_ids   = "Kamida bitta bo'lim tanlanishi shart"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('name',        form.name.trim())
      fd.append('priority',    form.priority)
      fd.append('description', form.description.trim())
      if (form.deadline) {
        fd.append('deadline', new Date(form.deadline).toISOString().split('.')[0] + 'Z')
      }
      // CHANGED: was  fd.append('group_id', selectedId)
      // Now appends every selected group id as  group_ids  (backend reads getlist('group_ids'))
      selectedGroupIds.forEach(id => fd.append('group_ids', id))

      mediaFiles.forEach(({ file, description }) => {
        fd.append('media_files',  file)
        fd.append('descriptions', description || '')
      })

      const response = await api.post('/tasks/create/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate(`/tasks/${response.data.id}/`)
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
      <div className="tc2">

        {/* Cover */}
        <div className="tc2-cover">
          <button className="tc2-back" onClick={() => navigate(-1)} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="tc2-cover-center">
            <div className="tc2-cover-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <h1 className="tc2-cover-title">Yangi topshiriq</h1>
            <p className="tc2-cover-sub">Barcha maydonlarni to'ldiring</p>
          </div>
        </div>

        {/* Sheet */}
        <div className="tc2-sheet">
          <div className="tc2-handle" />

          {msg && (
            <div className={`tc2-flash tc2-flash--${msg.type}`} role="alert">
              {msg.type === 'success'
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              }
              {msg.text}
            </div>
          )}

          <div className="tc2-rows">

            {/* Name */}
            <div className="tc2-row tc2-row--tall">
              <div className="tc2-row-left">
                <span className="tc2-row-icon"><Tag size={15} strokeWidth={2} /></span>
                <span className="tc2-row-label">Nomi <span className="tc2-req">*</span></span>
              </div>
              <div className="tc2-row-input">
                <input
                  className={fieldErrors.name ? 'err' : ''}
                  type="text"
                  autoFocus
                  placeholder="Topshiriq nomi..."
                  value={form.name}
                  onChange={e => patch('name', e.target.value)}
                  disabled={saving}
                />
                {fieldErrors.name && <span className="tc2-ferr">{fieldErrors.name}</span>}
              </div>
            </div>

            {/* CHANGED: Group — was a single <select>, now a tap-to-toggle chip list */}
            <div className="tc2-row tc2-row--groups">
              <div className="tc2-row-left tc2-row-left--top">
                <span className="tc2-row-icon"><Users size={15} strokeWidth={2} /></span>
                <span className="tc2-row-label">
                  Bo'lim <span className="tc2-req">*</span>
                </span>
              </div>
              <div className="tc2-row-input">
                <div className="tc2-group-chips">
                  {groups.map(g => {
                    const active = selectedGroupIds.has(g.id)
                    return (
                      <button
                        key={g.id}
                        type="button"
                        className={`tc2-group-chip${active ? ' sel' : ''}`}
                        onClick={() => toggleGroup(g.id)}
                        disabled={saving}
                      >
                        {active && <Check size={10} strokeWidth={3} className="tc2-group-check" />}
                        <span className="tc2-group-short">{g.short_name}</span>
                        <span className="tc2-group-name">{g.name}</span>
                      </button>
                    )
                  })}
                </div>
                {selectedGroupIds.size > 0 && (
                  <p className="tc2-group-hint">
                    {selectedGroupIds.size} ta bo'lim tanlandi
                  </p>
                )}
                {fieldErrors.group_ids && (
                  <span className="tc2-ferr">{fieldErrors.group_ids}</span>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="tc2-row">
              <div className="tc2-row-left">
                <span className="tc2-row-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </span>
                <span className="tc2-row-label">Ustuvorlik</span>
              </div>
              <div className="tc2-row-input tc2-chips">
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`tc2-chip${form.priority === p.id ? ' sel' : ''}`}
                    style={form.priority === p.id
                      ? { background: p.bg, color: p.color, borderColor: p.color }
                      : { borderColor: '#e0e0e0', color: '#888' }
                    }
                    onClick={() => patch('priority', p.id)}
                    disabled={saving}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline */}
            <div className="tc2-row">
              <div className="tc2-row-left">
                <span className="tc2-row-icon"><Calendar size={15} strokeWidth={2} /></span>
                <span className="tc2-row-label">Muddat</span>
              </div>
              <div className="tc2-row-input">
                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={e => patch('deadline', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Description */}
            <div className="tc2-row tc2-row--desc">
              <div className="tc2-row-left tc2-row-left--top">
                <span className="tc2-row-icon"><AlignLeft size={15} strokeWidth={2} /></span>
                <span className="tc2-row-label">Tavsif <span className="tc2-req">*</span></span>
              </div>
              <div className="tc2-row-input">
                <textarea
                  className={fieldErrors.description ? 'err' : ''}
                  placeholder="Topshiriq haqida batafsil..."
                  value={form.description}
                  onChange={e => patch('description', e.target.value)}
                  rows={4}
                  disabled={saving}
                />
                {fieldErrors.description && <span className="tc2-ferr">{fieldErrors.description}</span>}
              </div>
            </div>

            {/* Media */}
            <div className="tc2-row tc2-row--media">
              <div className="tc2-row-left tc2-row-left--top">
                <span className="tc2-row-icon"><FileImage size={15} strokeWidth={2} /></span>
                <span className="tc2-row-label">Fayllar</span>
              </div>
              <div className="tc2-row-input">
                <div
                  className={`tc2-dropzone${dragOver ? ' over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={18} strokeWidth={1.5} />
                  <span>Rasmlarni tashlang yoki <u>tanlang</u></span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => { addFiles(e.target.files); e.target.value = '' }}
                  />
                </div>

                {mediaFiles.length > 0 && (
                  <div className="tc2-media-grid">
                    {mediaFiles.map(({ id, preview, description }) => (
                      <div className="tc2-media-card" key={id}>
                        <div className="tc2-media-img-wrap">
                          <img src={preview} alt="" />
                          <button className="tc2-media-del" onClick={() => removeFile(id)} type="button">
                            <X size={10} strokeWidth={2.5} />
                          </button>
                        </div>
                        <input
                          type="text"
                          className="tc2-media-desc"
                          placeholder="Tavsif..."
                          value={description}
                          onChange={e => patchFileDesc(id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>{/* /rows */}

          <button className="tc2-save" onClick={handleSave} disabled={saving} type="button">
            {saving
              ? <><span className="tc2-spinner" /> Saqlanmoqda…</>
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

.tc2 {
  --accent:      #6366f1;
  --accent-dk:   #4338ca;
  --accent-lt:   #eef2ff;
  --cover-from:  #818cf8;
  --cover-to:    #4f46e5;
  --danger:      #e05252;
  --danger-lt:   rgba(224, 82, 82, 0.1);

  width: 100%;
  min-height: 100vh;
  font-family: 'Nunito', sans-serif;
  background: linear-gradient(145deg, var(--cover-from) 0%, var(--cover-to) 100%);
  display: flex;
  flex-direction: column;
}

/* ── Cover ── */
.tc2-cover {
  position: relative;
  padding: 3rem 1.5rem 6.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tc2-back {
  position: absolute;
  top: 1.1rem; left: 1.1rem;
  width: 38px; height: 38px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: none;
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.tc2-back:hover { background: rgba(255,255,255,0.3); }

.tc2-cover-center {
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
  margin-top: 0.5rem;
}

.tc2-cover-icon {
  width: 72px; height: 72px; border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 3px solid rgba(255,255,255,0.55);
  display: flex; align-items: center; justify-content: center;
  color: #fff; margin-bottom: 0.4rem;
}

.tc2-cover-title {
  font-size: 1.25rem; font-weight: 800; color: #fff;
  margin: 0; text-shadow: 0 1px 4px rgba(0,0,0,0.15);
}
.tc2-cover-sub { font-size: 0.8rem; color: rgba(255,255,255,0.72); margin: 0; }

/* ── Sheet ── */
.tc2-sheet {
  background: #f5f7fa;
  border-radius: 28px 28px 0 0;
  margin-top: -3rem;
  flex: 1;
  padding: 0 0 2.5rem;
  display: flex; flex-direction: column;
}
.dark .tc2-sheet { background: #1e2235; }

.tc2-handle {
  width: 40px; height: 4px;
  background: #ddd; border-radius: 99px;
  margin: 12px auto 18px; flex-shrink: 0;
}
.dark .tc2-handle { background: rgba(120,130,255,0.2); }

/* ── Flash ── */
.tc2-flash {
  display: flex; align-items: center; gap: 0.5rem;
  margin: 0 1.25rem 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.84rem; font-weight: 600;
  border-radius: 14px;
}
.tc2-flash--success { background: var(--accent-lt); color: var(--accent-dk); }
.tc2-flash--error   { background: var(--danger-lt); color: var(--danger);    }
.dark .tc2-flash--success { background: rgba(99,102,241,0.15); color: #a5b4fc; }

/* ── Rows ── */
.tc2-rows { display: flex; flex-direction: column; }

.tc2-row {
  display: flex; align-items: center;
  padding: 0 1.25rem;
  min-height: 62px;
  border-bottom: 0.5px solid #ebebeb;
  gap: 0.75rem;
  transition: background 0.12s;
}
.tc2-row:last-child    { border-bottom: none; }
.tc2-row--tall         { min-height: 68px; }
.tc2-row--desc,
.tc2-row--media,
.tc2-row--groups       { align-items: flex-start; padding-top: 14px; padding-bottom: 14px; }
.tc2-row:focus-within  { background: rgba(99,102,241,0.04); }
.dark .tc2-row         { border-bottom-color: rgba(120,130,255,0.1); }
.dark .tc2-row:focus-within { background: rgba(99,102,241,0.07); }

.tc2-row-left {
  display: flex; align-items: center; gap: 0.55rem;
  width: 120px; flex-shrink: 0;
}
.tc2-row-left--top { align-items: flex-start; padding-top: 2px; }

.tc2-row-icon { display: flex; align-items: center; color: #aaa; flex-shrink: 0; }
.dark .tc2-row-icon { color: #5a6890; }

.tc2-row-label {
  font-size: 0.86rem; font-weight: 600; color: #333; white-space: nowrap;
}
.dark .tc2-row-label { color: #e8eaf6; }

.tc2-req { color: var(--danger); }

.tc2-row-input { flex: 1; display: flex; flex-direction: column; gap: 3px; }

/* ── Inputs / selects / textarea ── */
.tc2-sheet input,
.tc2-sheet select,
.tc2-sheet textarea {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1.5px solid #d8d8d8;
  border-radius: 0;
  outline: none;
  font-size: 0.9rem; font-weight: 500;
  color: #222;
  font-family: inherit;
  text-align: right;
  padding: 0.3rem 0;
  -webkit-appearance: none; appearance: none;
  transition: border-color 0.15s;
  resize: none;
}
.tc2-sheet input::placeholder,
.tc2-sheet textarea::placeholder { color: #bbb; }
.tc2-sheet input:focus,
.tc2-sheet select:focus,
.tc2-sheet textarea:focus { border-bottom-color: var(--accent); }
.tc2-sheet input:disabled,
.tc2-sheet select:disabled,
.tc2-sheet textarea:disabled { opacity: 0.45; cursor: not-allowed; }
.tc2-sheet input.err,
.tc2-sheet select.err,
.tc2-sheet textarea.err { border-bottom-color: var(--danger); }
.tc2-sheet textarea {
  text-align: left; line-height: 1.55;
  border-bottom: none;
  border: 1.5px solid #d8d8d8;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
}
.tc2-sheet textarea:focus { border-color: var(--accent); }

.dark .tc2-sheet input,
.dark .tc2-sheet select,
.dark .tc2-sheet textarea { color: #e8eaf6; border-bottom-color: rgba(120,130,255,0.2); }
.dark .tc2-sheet input::placeholder,
.dark .tc2-sheet textarea::placeholder { color: #3a4060; }
.dark .tc2-sheet input:focus,
.dark .tc2-sheet select:focus,
.dark .tc2-sheet textarea:focus { border-bottom-color: #818cf8; }
.dark .tc2-sheet textarea {
  border-color: rgba(120,130,255,0.2); background: rgba(120,130,255,0.04);
}
.dark .tc2-sheet textarea:focus {
  border-color: #818cf8; box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
}

.tc2-ferr { font-size: 11px; color: var(--danger); }

/* ── Priority chips ── */
.tc2-chips { flex-direction: row !important; gap: 6px; justify-content: flex-end; }

.tc2-chip {
  font-size: 0.75rem; font-weight: 700;
  font-family: inherit;
  padding: 0.2rem 0.75rem;
  border-radius: 99px; border: 1.5px solid;
  background: transparent; cursor: pointer;
  transition: all 0.15s; opacity: 0.55;
}
.tc2-chip.sel   { opacity: 1; }
.tc2-chip:hover { opacity: 0.85; }
.tc2-chip:disabled { cursor: not-allowed; opacity: 0.3; }

/* ── Group chips (NEW) ── */
.tc2-group-chips {
  display: flex; flex-direction: column; gap: 6px;
  padding-top: 2px;
}

.tc2-group-chip {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid #e0e0e0;
  background: #fff;
  cursor: pointer; text-align: left;
  font-family: inherit;
  transition: all 0.15s;
}
.tc2-group-chip:hover {
  border-color: var(--accent);
  background: var(--accent-lt);
}
.tc2-group-chip.sel {
  border-color: var(--accent);
  background: var(--accent-lt);
}
.tc2-group-chip:disabled { opacity: 0.45; cursor: not-allowed; }

.dark .tc2-group-chip {
  background: rgba(120,130,255,0.05);
  border-color: rgba(120,130,255,0.18);
}
.dark .tc2-group-chip:hover,
.dark .tc2-group-chip.sel {
  border-color: #818cf8;
  background: rgba(99,102,241,0.12);
}

.tc2-group-check {
  color: var(--accent);
  flex-shrink: 0;
}

.tc2-group-short {
  font-size: 0.78rem; font-weight: 800;
  color: var(--accent);
  background: var(--accent-lt);
  padding: 1px 7px; border-radius: 6px;
  flex-shrink: 0;
}
.dark .tc2-group-short {
  background: rgba(99,102,241,0.15);
  color: #a5b4fc;
}

.tc2-group-name {
  font-size: 0.84rem; font-weight: 600;
  color: #333; flex: 1;
}
.dark .tc2-group-name { color: #c7ccec; }

.tc2-group-hint {
  margin: 4px 0 0; font-size: 11px;
  color: var(--accent); font-weight: 600;
}

/* ── Dropzone ── */
.tc2-dropzone {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 20px 16px;
  border: 1.5px dashed #d0d0d0; border-radius: 12px;
  cursor: pointer; color: #aaa;
  font-size: 0.82rem; text-align: center;
  transition: all 0.15s;
}
.tc2-dropzone:hover, .tc2-dropzone.over {
  border-color: var(--accent); color: var(--accent-dk);
  background: rgba(99,102,241,0.04);
}
.tc2-dropzone u { text-decoration-color: currentColor; }
.dark .tc2-dropzone { border-color: rgba(120,130,255,0.2); color: #5a6890; }
.dark .tc2-dropzone:hover, .dark .tc2-dropzone.over {
  border-color: #818cf8; color: #a5b4fc; background: rgba(99,102,241,0.08);
}

/* ── Media grid ── */
.tc2-media-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px; margin-top: 8px;
}
.tc2-media-card { display: flex; flex-direction: column; gap: 4px; }

.tc2-media-img-wrap {
  position: relative; border-radius: 8px; overflow: hidden;
  aspect-ratio: 4/3; background: #eee;
  border: 0.5px solid #e0e0e0;
}
.dark .tc2-media-img-wrap { background: #1a1e30; border-color: rgba(120,130,255,0.15); }
.tc2-media-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }

.tc2-media-del {
  position: absolute; top: 4px; right: 4px;
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(0,0,0,0.5); border: none;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #fff; opacity: 0; transition: opacity 0.15s; padding: 0;
}
.tc2-media-img-wrap:hover .tc2-media-del { opacity: 1; }

.tc2-media-desc {
  font-size: 11px !important; padding: 4px 6px !important;
  border: 1px solid #e0e0e0 !important; border-radius: 6px !important;
  text-align: left !important; color: #555 !important; background: transparent !important;
}
.dark .tc2-media-desc { border-color: rgba(120,130,255,0.18) !important; color: #9fa8c7 !important; }
.tc2-media-desc:focus { border-color: var(--accent) !important; outline: none !important; }

/* ── Save button ── */
.tc2-save {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  margin: 1.25rem 1.25rem 0; padding: 1rem;
  background: linear-gradient(145deg, var(--cover-from) 0%, var(--cover-to) 100%);
  color: #fff; border: none; border-radius: 18px;
  font-size: 0.95rem; font-weight: 800; font-family: inherit;
  cursor: pointer;
  text-shadow: 0 1px 2px rgba(0,0,0,0.15);
  box-shadow: 0 4px 16px rgba(99,102,241,0.35);
  transition: opacity 0.15s, transform 0.1s;
}
.tc2-save:hover:not(:disabled)  { opacity: 0.88; }
.tc2-save:active:not(:disabled) { transform: scale(0.985); }
.tc2-save:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.dark .tc2-save {
  background: linear-gradient(145deg, #4c4faa 0%, #312e81 100%);
  box-shadow: 0 4px 16px rgba(49,46,129,0.5);
}

/* ── Spinner ── */
.tc2-spinner {
  width: 15px; height: 15px;
  border: 2.5px solid rgba(255,255,255,0.35);
  border-top-color: #fff; border-radius: 50%;
  animation: tc2-spin 0.65s linear infinite; flex-shrink: 0;
}
@keyframes tc2-spin { to { transform: rotate(360deg); } }

/* ── Mobile ── */
@media (max-width: 480px) {
  .tc2-cover { padding: 2.5rem 1rem 6rem; }
  .tc2-row {
    flex-direction: column; align-items: flex-start;
    padding-top: 12px; padding-bottom: 12px;
    min-height: unset; gap: 6px;
  }
  .tc2-row-left        { width: 100%; }
  .tc2-row-left--top   { padding-top: 0; }
  .tc2-row-input       { width: 100%; }
  .tc2-chips           { justify-content: flex-start !important; gap: 4px; }
  .tc2-sheet input,
  .tc2-sheet select,
  .tc2-sheet textarea  { text-align: left; font-size: 0.85rem; width: 100%; }
  .tc2-row-label       { font-size: 0.8rem; }
}
`
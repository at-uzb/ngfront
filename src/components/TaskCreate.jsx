import { useState, useEffect,useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, X, FileImage, Loader,
  Calendar, AlignLeft, Tag, Users, Clock,
} from 'lucide-react'
import api from '../lib/api'
import { useGroupStore } from '../hooks/useGroupStore'
import "../assets/TaskCreate.css"

const PRIORITIES = [
  { id: 'yuqori', label: 'Yuqori', cls: 'badge-high' },
  { id: 'orta',   label: "O'rta",  cls: 'badge-mid'  },
  { id: 'past',   label: 'Past',   cls: 'badge-low'  },
]

// ── Component ────────────────────────────────────────────────
export default function TaskCreate( ) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const { groups, selectedId, setSelectedId } = useGroupStore()

  const [form, setForm] = useState({
    name:        '',
    priority:    'orta',   // ← matches KT.Priority.ORTA
    assignee:    '',
    deadline:    '',
    description: '',
  })

  const [mediaFiles,  setMediaFiles]  = useState([])
  const [error,       setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving,      setSaving]      = useState(false)
  const [dragOver,    setDragOver]    = useState(false)

  const patch = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setFieldErrors(fe => ({ ...fe, [k]: '' }))
  }

  // ── File handling ────────────────────────────────────────
  const addFiles = useCallback((files) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    const next = arr.map(file => ({
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

  // ── Validate ─────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.name.trim())        errs.name        = 'Nom kiritilishi shart'
    if (!form.description.trim()) errs.description = 'Tavsif kiritilishi shart'
    if (!selectedId)              errs.group_id    = "Bo'lim tanlanishi shart"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('name',        form.name.trim())
      fd.append('group_id',    selectedId)
      fd.append('priority',    form.priority)
      fd.append('description', form.description.trim())
      if (form.assignee) fd.append('responsible_id', form.assignee)
      if (form.deadline) {
        const dt = new Date(form.deadline)
        fd.append('deadline', dt.toISOString().split('.')[0] + 'Z')
      }
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
        Object.entries(data).forEach(([k, v]) => {
          fe[k] = Array.isArray(v) ? v[0] : String(v)
        })
        setFieldErrors(fe)
      } else {
        setError('Saqlashda xatolik yuz berdi')
      }
    } finally {
      setSaving(false)
    }
  }
  
  // ── Render ───────────────────────────────────────────────
  return (
    <div className="tc-page">

      {/* ── Two-column body ───────────────────────────── */}
      <div className="tc-body">

        {/* Left — main content */}
        <div className="tc-col-main">

          {/* Name */}
          <div className="tc-field-group">
            <label className="tc-label">
              <Tag size={12} strokeWidth={2} />
              Nomi <span className="tc-req">*</span>
            </label>
            <input
              className={`tc-input tc-input-lg${fieldErrors.name ? ' err' : ''}`}
              type="text"
              autoFocus
              placeholder="Topshiriq nomini kiriting..."
              value={form.name}
              onChange={e => patch('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSave()}
            />
            {fieldErrors.name && <span className="tc-ferr">{fieldErrors.name}</span>}
          </div>

          {/* Description — now required */}
          <div className="tc-field-group">
            <label className="tc-label">
              <AlignLeft size={12} strokeWidth={2} />
              Tavsif <span className="tc-req">*</span>
            </label>
            <textarea
              className={`tc-input tc-textarea${fieldErrors.description ? ' err' : ''}`}
              placeholder="Topshiriq haqida batafsil ma'lumot..."
              value={form.description}
              onChange={e => patch('description', e.target.value)}
              rows={5}
            />
            {fieldErrors.description && <span className="tc-ferr">{fieldErrors.description}</span>}
          </div>

          {/* Media upload */}
          <div className="tc-field-group">
            <label className="tc-label">
              <FileImage size={12} strokeWidth={2} />
              Rasm va fayllar
            </label>

            <div
              className={`tc-dropzone${dragOver ? ' over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={20} strokeWidth={1.5} />
              <span className="tc-drop-text">
                Rasmlarni bu yerga tashlang yoki <u>tanlang</u>
              </span>
              <span className="tc-drop-hint">PNG, JPG, WEBP</span>
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
              <div className="tc-media-grid">
                {mediaFiles.map(({ id, preview, description }) => (
                  <div className="tc-media-card" key={id}>
                    <div className="tc-media-img-wrap">
                      <img src={preview} alt="" className="tc-media-img" />
                      <button
                        className="tc-media-del"
                        onClick={() => removeFile(id)}
                        type="button"
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                    <input
                      className="tc-input tc-media-desc"
                      type="text"
                      placeholder="Tavsif (ixtiyoriy)"
                      value={description}
                      onChange={e => patchFileDesc(id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="tc-global-err">{error}</div>}
        </div>

        {/* Right — meta sidebar */}
        <div className="tc-col-meta">

          {/* Group */}
          <div className="tc-field-group">
            <label className="tc-label">
              <Users size={12} strokeWidth={2} />
              Bo'lim <span className="tc-req">*</span>
            </label>
            <select
              className={`tc-input${fieldErrors.group_id ? ' err' : ''}`}
              value={selectedId ?? ''}
              onChange={e => {
                setSelectedId(Number(e.target.value))
                setFieldErrors(fe => ({ ...fe, group_id: '' }))
              }}
            >
              <option value="">— Tanlang —</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.short_name} — {g.name}
                </option>
              ))}
            </select>
            {fieldErrors.group_id && <span className="tc-ferr">{fieldErrors.group_id}</span>}
          </div>

          {/* Priority chips */}
          <div className="tc-field-group">
            <label className="tc-label">Ustuvorlik</label>
            <div className="tc-chip-row">
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`t-badge ${p.cls} tc-chip${form.priority === p.id ? ' tc-chip-sel' : ''}`}
                  onClick={() => patch('priority', p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className="tc-field-group">
            <label className="tc-label">
              <Calendar size={12} strokeWidth={2} />
              Muddat
            </label>
            <input
              className="tc-input"
              type="datetime-local"
              value={form.deadline}
              onChange={e => patch('deadline', e.target.value)}
            />
          </div>

          {/* Assignee */}
          <div className="tc-field-group">
            <label className="tc-label">
              <Clock size={12} strokeWidth={2} />
              Mas'ul
            </label>
            <input
              className="tc-input"
              type="text"
              maxLength={4}
              placeholder="JD"
              value={form.assignee}
              onChange={e => patch('assignee', e.target.value.toUpperCase())}
            />
          </div>

          <button
            className="t-mbtn save tc-save-full"
            onClick={handleSave}
            disabled={saving}
            type="button"
          >
            {saving
              ? <><Loader size={13} strokeWidth={1.8} className="t-spin" /> Saqlanmoqda...</>
              : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}
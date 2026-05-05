import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, X, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import GroupSelector from './GroupSelector'
import api from '../lib/api'
import '../assets/Tasks.css'

// ── Constants ────────────────────────────────────────────────
const PRIORITIES = [
  { id: 'high',   label: 'Yuqori', cls: 'badge-high' },
  { id: 'medium', label: "O'rta",  cls: 'badge-mid'  },
  { id: 'low',    label: 'Past',   cls: 'badge-low'  },
]
const STATUSES = [
  { id: 'todo',       label: 'Kutilmoqda', cls: 'badge-todo' },
  { id: 'inprogress', label: 'Jarayonda',  cls: 'badge-prog' },
  { id: 'done',       label: 'Bajarildi',  cls: 'badge-done' },
]
const FILTERS = [
  { id: 'active', label: 'Faol'      },
  { id: 'done',   label: 'Bajarildi' },
  { id: 'urgent', label: 'Urgent'    },
]

// Groups that can add tasks (admin check is additional)
const ADD_TASK_GROUPS = ['NX', 'NGZ', 'NTS']

const emptyForm = (group) => ({
  name: '', group: group === 'ALL' ? 'NX' : group,
  priority: 'medium', status: 'todo', assignee: '', due: '',
})

// ── Main Component ───────────────────────────────────────────
export default function Tasks({ selectedGroup, onGroupChange, groups = [] }) {
  const { user, isAdmin, isTasker } = useAuth()
  const navigate = useNavigate()

  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [query,   setQuery]   = useState('')
  const [filters, setFilters] = useState([])
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState({})
  const [formErr, setFormErr] = useState('')
  const [saving,  setSaving]  = useState(false)

  const canAdd = (isAdmin || isTasker) || (
    selectedGroup === 'ALL'
      ? ADD_TASK_GROUPS.includes(user?.group?.short_name)
      : ADD_TASK_GROUPS.includes(selectedGroup)
  );
  

  // ── Fetch tasks ────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedGroup && selectedGroup !== 'ALL') params.set('group', selectedGroup)
      filters.forEach(f => params.append('filter', f))
      if (query) params.set('search', query)

      const res = await api.get(`/tasks/kts/?${params.toString()}`)
      setTasks(res.data.results ?? res.data)
    } catch {
      setError('Topshiriqlarni yuklashda xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }, [selectedGroup, filters, query])

  useEffect(() => {
    const timer = setTimeout(fetchTasks, query ? 350 : 0)
    return () => clearTimeout(timer)
  }, [fetchTasks])

  // ── Stats ──────────────────────────────────────────────────
  const total  = tasks.length
  const done   = tasks.filter(t => t.status === 'done').length
  const active = tasks.filter(t => t.status !== 'done').length
  const urgent = tasks.filter(t => t.is_overdue).length
  const pct    = total ? Math.round(done / total * 100) : 0

  // ── Handlers ───────────────────────────────────────────────
  const toggleFilter = (id) =>
    setFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const openAdd  = () => { setForm(emptyForm(selectedGroup)); setFormErr(''); setModal('add') }
  const openEdit = (task, e) => {
    e.stopPropagation()
    setForm({
      id:       task.id,
      name:     task.name,
      group:    task.group?.short_name ?? '',
      priority: task.priority ?? 'medium',
      status:   task.status   ?? 'todo',
      assignee: task.assignee ?? '',
      due:      task.deadline ? task.deadline.slice(0, 10) : '',
    })
    setFormErr('')
    setModal('edit')
  }

  const saveTask = async () => {
    if (!form.name.trim()) { setFormErr('Nom kiritilishi shart'); return }
    setSaving(true)
    try {
      const payload = {
        name:     form.name,
        group:    form.group,
        priority: form.priority,
        status:   form.status,
        assignee: form.assignee,
        deadline: form.due || null,
      }
      if (modal === 'edit') {
        await api.patch(`/tasks/kts/${form.id}/`, payload)
      } else {
        await api.post('/tasks/kts/', payload)
      }
      setModal(null)
      fetchTasks()
    } catch {
      setFormErr('Saqlashda xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  const deleteTask = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm("Topshiriqni o'chirishni tasdiqlaysizmi?")) return
    try {
      await api.delete(`/tasks/kts/${id}/`)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch {
      // silently fail
    }
  }

  // ── Sections renderer ──────────────────────────────────────
  const renderContent = () => {
    if (loading) {
      return (
        <div className="t-empty">
          <Loader size={18} strokeWidth={1.8} className="t-spin" />
        </div>
      )
    }
    if (error) {
      return <div className="t-empty t-error">{error}</div>
    }
    if (!tasks.length) {
      return <div className="t-empty">Topshiriqlar topilmadi</div>
    }

    const pending  = tasks.filter(t => t.status !== 'done')
    const doneList = tasks.filter(t => t.status === 'done')

    return (
      <>
        {pending.length > 0 && (
          <div className="t-section">
            <div className="t-sec-title">Faol</div>
            <div className="t-task-list">
              {pending.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  isAdmin={isAdmin}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                />
              ))}
            </div>
          </div>
        )}
        {doneList.length > 0 && (
          <div className="t-section">
            <div className="t-sec-title">Bajarildi</div>
            <div className="t-task-list">
              {doneList.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  isAdmin={isAdmin}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="topshiriqlar">

      <div className="t-selector">
        <GroupSelector
          selectedGroup={selectedGroup}
          onGroupChange={onGroupChange}
        />
        {canAdd && (
            <button className="t-add-btn" onClick={openAdd}>
              <Plus size={13} strokeWidth={2} />
              Qo'shish
            </button>
        )}
      </div>


      {/* ── Stats ── */}
      <div className="t-stats">
        <div className="t-stat">
          <div className="t-stat-lbl">Jami</div>
          <div className="t-stat-val">{loading ? '—' : total}</div>
        </div>
        <div className="t-stat">
          <div className="t-stat-lbl">Faol</div>
          <div className="t-stat-val">{loading ? '—' : active}</div>
        </div>
        <div className="t-stat">
          <div className="t-stat-lbl">Bajarildi</div>
          <div className="t-stat-val">
            {loading ? '—' : done}
            {!loading && <span className="t-stat-pct">{pct}%</span>}
          </div>
        </div>
        <div className="t-stat urgent">
          <div className="t-stat-lbl">Muddati o'tgan</div>
          <div className="t-stat-val">{loading ? '—' : urgent}</div>
        </div>
      </div>
      {/* ── searchbar ── */}
      <div className="t-toolbar">
        <div className="t-search-wrap">
          <Search size={14} strokeWidth={1.8} className="t-search-icon" />
          <input
            className="t-search"
            type="text"
            placeholder="Qidirish..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

      </div>
      {/* ── Task list ── */}
      <div className="t-sections">{renderContent()}</div>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="t-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="t-modal">
            <div className="t-modal-hdr">
              <span>{modal === 'edit' ? 'Topshiriqni tahrirlash' : 'Yangi topshiriq'}</span>
              <button className="t-modal-close" onClick={() => setModal(null)}>
                <X size={14} strokeWidth={1.8} />
              </button>
            </div>

            <label className="t-mlbl">Nomi *</label>
            <input
              className="t-minput"
              type="text"
              placeholder="Topshiriq nomini kiriting"
              autoFocus
              value={form.name || ''}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErr('') }}
              onKeyDown={e => e.key === 'Enter' && saveTask()}
            />
            <div className="t-merr">{formErr}</div>

            <div className="t-mgrid">
              <div>
                <label className="t-mlbl">Bo'lim</label>
                <select className="t-mselect" value={form.group || ''}
                  onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
                  {groups.filter(g => ADD_TASK_GROUPS.includes(g.short_name)).map(g => (
                    <option key={g.id} value={g.short_name}>
                      {g.short_name} — {g.name.slice(0, 28)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="t-mlbl">Ustuvorlik</label>
                <select className="t-mselect" value={form.priority || 'medium'}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="t-mlbl">Holat</label>
                <select className="t-mselect" value={form.status || 'todo'}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="t-mlbl">Mas'ul</label>
                <input className="t-minput" type="text" maxLength={4} placeholder="JD"
                  value={form.assignee || ''}
                  onChange={e => setForm(f => ({ ...f, assignee: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <label className="t-mlbl">Muddat</label>
            <input className="t-minput" type="date" value={form.due || ''}
              onChange={e => setForm(f => ({ ...f, due: e.target.value }))}
            />

            <div className="t-mbtns">
              <button className="t-mbtn cancel" onClick={() => setModal(null)}>Bekor</button>
              <button className="t-mbtn save" onClick={saveTask} disabled={saving}>
                {saving ? <Loader size={13} className="t-spin" /> : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TaskCard ─────────────────────────────────────────────────
function TaskCard({ task, isAdmin, onEdit, onDelete, onClick }) {
  const st = STATUSES.find(s => s.id === task.status) ?? STATUSES[0]

  const formatDate = (iso) => {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('uz-UZ', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  }

  return (
    <div
      className={`t-task${task.status === 'done' ? ' done' : ''}${task.is_overdue ? ' overdue' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="t-check-placeholder" />

      <div className="t-tbody">
        <div className="t-tname">{task.name}</div>
        <div className="t-tmeta">
          <span className={`t-badge ${st.cls}`}>{st.label}</span>
          {task.group_name && (
            <span className="t-grp-badge" style={{ background: '#888' }}>
              {task.group_name}
            </span>
          )}
          {task.deadline && (
            <span className={`t-due${task.is_overdue ? ' over' : ''}`}>
              {formatDate(task.deadline)}
            </span>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="t-actions">
          <button className="t-act-btn" onClick={e => onEdit(task, e)} title="Tahrirlash">
            <Pencil size={12} strokeWidth={1.8} />
          </button>
          <button className="t-act-btn del" onClick={e => onDelete(task.id, e)} title="O'chirish">
            <Trash2 size={12} strokeWidth={1.8} />
          </button>
        </div>
      )}
    </div>
  )
}
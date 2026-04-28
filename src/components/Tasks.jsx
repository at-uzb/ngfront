import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { GROUP_MAPPING } from '../constants/groups'
import '../assets/Tasks.css'

// ── Constants ────────────────────────────────────────────────
const PRIORITIES = [
  { id: 'high',   label: 'Yuqori', cls: 'badge-high' },
  { id: 'medium', label: "O'rta",  cls: 'badge-mid'  },
  { id: 'low',    label: 'Past',   cls: 'badge-low'  },
]
const STATUSES = [
  { id: 'todo',       label: "Kutilmoqda", cls: 'badge-todo' },
  { id: 'inprogress', label: "Jarayonda",  cls: 'badge-prog' },
  { id: 'done',       label: 'Bajarildi',  cls: 'badge-done' },
]
const FILTERS = [
  { id: 'active', label: 'Faol'      },
  { id: 'done',   label: 'Bajarildi' },
  { id: 'high',   label: 'Urgent'    },
]
const INITIAL_TASKS = [
  { id: 1, name: 'Metro UI komponentlarini yaratish', group: 'NTS',  priority: 'high',   status: 'inprogress', assignee: 'JD', due: '2026-04-30', done: false },
  { id: 2, name: 'Tonnel monitoring tizimi',          group: 'NTB',  priority: 'medium', status: 'done',       assignee: 'AS', due: '2026-04-20', done: true  },
  { id: 3, name: 'Signalizatsiya tizimini tekshirish',group: 'SH',   priority: 'high',   status: 'todo',       assignee: 'MK', due: '2026-04-29', done: false },
  { id: 4, name: "Elektr taqsimoti auditi",           group: 'E',    priority: 'medium', status: 'inprogress', assignee: 'ZR', due: '2026-05-05', done: false },
  { id: 5, name: 'Xavfsizlik protokollari yangilash', group: 'NGS',  priority: 'high',   status: 'todo',       assignee: 'JD', due: '2026-04-28', done: false },
  { id: 6, name: "Yo'lovchi oqimi tahlili",           group: 'D',    priority: 'low',    status: 'done',       assignee: 'AS', due: '2026-04-15', done: true  },
  { id: 7, name: "Avtotransport texnik ko'rik",        group: 'AT',   priority: 'medium', status: 'todo',       assignee: 'MK', due: '2026-05-02', done: false },
  { id: 8, name: 'Marketing kampaniya rejasi',        group: 'OKM',  priority: 'low',    status: 'inprogress', assignee: 'ZR', due: '2026-05-10', done: false },
]

// ── Helpers ──────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().slice(0, 10)
const isOverdue = (due, done) => due && due < todayStr() && !done
const emptyForm = (group) => ({
  name: '', group: group === 'ALL' ? 'NGS' : group,
  priority: 'medium', status: 'todo', assignee: '', due: '',
})

// ── Main Component ───────────────────────────────────────────
// Props:
//   selectedGroup  : string  — current group code, lifted to parent (shared with Dashboard)
//   onGroupChange  : fn      — called when user picks a different group
export default function Tasks({ selectedGroup, onGroupChange }) {
  const [tasks,   setTasks]   = useState(INITIAL_TASKS)
  const [nextId,  setNextId]  = useState(9)
  const [query,   setQuery]   = useState('')
  const [filters, setFilters] = useState([])
  const [modal,   setModal]   = useState(null)   // null | 'add' | 'edit'
  const [form,    setForm]    = useState({})
  const [formErr, setFormErr] = useState('')
  const [gsOpen,  setGsOpen]  = useState(false)
  const gsRef = useRef(null)

  // Close group dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (gsRef.current && !gsRef.current.contains(e.target)) setGsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Filter logic ─────────────────────────────────────────────
  const filtered = useMemo(() => tasks.filter(t => {
    if (selectedGroup !== 'ALL' && t.group !== selectedGroup) return false
    if (filters.includes('active') && t.done)                 return false
    if (filters.includes('done')   && !t.done)                return false
    if (filters.includes('high')   && t.priority !== 'high')  return false
    if (query && !t.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [tasks, selectedGroup, filters, query])

  // ── Stats ─────────────────────────────────────────────────────
  const scope  = selectedGroup === 'ALL' ? tasks : tasks.filter(t => t.group === selectedGroup)
  const total  = scope.length
  const done   = scope.filter(t => t.done).length
  const active = scope.filter(t => !t.done).length
  const urgent = scope.filter(t => t.priority === 'high' && !t.done).length
  const pct    = total ? Math.round(done / total * 100) : 0

  // ── Handlers ──────────────────────────────────────────────────
  const toggleFilter = (id) =>
    setFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const toggleDone = (id) =>
    setTasks(prev => prev.map(t => t.id !== id ? t : {
      ...t, done: !t.done,
      status: !t.done ? 'done' : (t.status === 'done' ? 'inprogress' : t.status),
    }))

  const openAdd  = () => { setForm(emptyForm(selectedGroup)); setFormErr(''); setModal('add')  }
  const openEdit = (task) => { setForm({ ...task }); setFormErr(''); setModal('edit') }
  const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id))

  const saveTask = () => {
    if (!form.name.trim()) { setFormErr('Nom kiritilishi shart'); return }
    if (modal === 'edit') {
      setTasks(prev => prev.map(t => t.id === form.id ? { ...form } : t))
    } else {
      setTasks(prev => [...prev, { id: nextId, ...form, done: false }])
      setNextId(n => n + 1)
    }
    setModal(null)
  }

  const current = GROUP_MAPPING[selectedGroup]

  // ── Sections renderer ─────────────────────────────────────────
  const renderSections = () => {
    if (!filtered.length) {
      return <div className="t-empty">Topshiriqlar topilmadi</div>
    }
    if (selectedGroup === 'ALL') {
      return Object.entries(GROUP_MAPPING)
        .filter(([code]) => code !== 'ALL')
        .map(([code, g]) => {
          const gt = filtered.filter(t => t.group === code)
          if (!gt.length) return null
          return (
            <div key={code} className="t-section">
              <div className="t-sec-title">
                <span className="t-sec-dot" style={{ background: g.color }} />
                <span className="t-sec-icon">{g.icon}</span>
                {g.displayName}
              </div>
              <div className="t-task-list">
                {gt.map(t => (
                  <TaskCard key={t.id} task={t} showGroup={false}
                    onToggle={toggleDone} onEdit={openEdit} onDelete={deleteTask} />
                ))}
              </div>
            </div>
          )
        })
    }

    const pending  = filtered.filter(t => !t.done)
    const doneList = filtered.filter(t => t.done)
    return (
      <>
        {pending.length > 0 && (
          <div className="t-section">
            <div className="t-sec-title">Faol</div>
            <div className="t-task-list">
              {pending.map(t => (
                <TaskCard key={t.id} task={t} showGroup={false}
                  onToggle={toggleDone} onEdit={openEdit} onDelete={deleteTask} />
              ))}
            </div>
          </div>
        )}
        {doneList.length > 0 && (
          <div className="t-section">
            <div className="t-sec-title">Bajarildi</div>
            <div className="t-task-list">
              {doneList.map(t => (
                <TaskCard key={t.id} task={t} showGroup={false}
                  onToggle={toggleDone} onEdit={openEdit} onDelete={deleteTask} />
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="topshiriqlar">

      {/* ── Toolbar ── */}
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
        <div className="t-filter-row">
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`t-fchip${filters.includes(f.id) ? ' on' : ''}`}
              onClick={() => toggleFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button className="t-add-btn" onClick={openAdd}>
          <Plus size={13} strokeWidth={2} />
          Qo'shish
        </button>
      </div>

      {/* ── Group Selector — same shape as your existing GroupSelector prop API ── */}
      <div className="t-gs-wrap" ref={gsRef}>
        <button
          className="t-gs-trigger"
          onClick={() => setGsOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={gsOpen}
        >
          <span className="t-gs-emoji">{current.icon}</span>
          <span className="t-gs-badge" style={{ background: current.color }}>
            {current.name}
          </span>
          <span className="t-gs-dname">{current.displayName}</span>
          <span className={`t-gs-chev${gsOpen ? ' open' : ''}`}>▾</span>
        </button>

        {gsOpen && (
          <ul className="t-gs-dropdown" role="listbox">
            {Object.entries(GROUP_MAPPING).map(([code, g]) => (
              <li
                key={code}
                className={`t-gs-opt${selectedGroup === code ? ' sel' : ''}`}
                role="option"
                aria-selected={selectedGroup === code}
                onClick={() => { onGroupChange(code); setGsOpen(false) }}
              >
                <span className="t-gs-opt-emoji">{g.icon}</span>
                <span className="t-gs-opt-badge" style={{ background: g.color }}>{g.name}</span>
                <span className="t-gs-opt-label">{g.displayName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="t-stats">
        <div className="t-stat">
          <div className="t-stat-lbl">Jami</div>
          <div className="t-stat-val">{total}</div>
        </div>
        <div className="t-stat">
          <div className="t-stat-lbl">Faol</div>
          <div className="t-stat-val">{active}</div>
        </div>
        <div className="t-stat">
          <div className="t-stat-lbl">Bajarildi</div>
          <div className="t-stat-val">{done}<span className="t-stat-pct">{pct}%</span></div>
        </div>
        <div className="t-stat urgent">
          <div className="t-stat-lbl">Urgent</div>
          <div className="t-stat-val">{urgent}</div>
        </div>
      </div>

      {/* ── Task list ── */}
      <div className="t-sections">{renderSections()}</div>

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
                <select className="t-mselect" value={form.group || 'NGS'}
                  onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
                  {Object.entries(GROUP_MAPPING)
                    .filter(([c]) => c !== 'ALL')
                    .map(([code, g]) => (
                      <option key={code} value={code}>
                        {g.name} — {g.displayName.slice(0, 28)}
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
              <button className="t-mbtn save"   onClick={saveTask}>Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TaskCard ─────────────────────────────────────────────────
function TaskCard({ task, showGroup, onToggle, onEdit, onDelete }) {
  const pr   = PRIORITIES.find(p => p.id === task.priority)
  const st   = STATUSES.find(s => s.id === task.status)
  const g    = GROUP_MAPPING[task.group]
  const over = isOverdue(task.due, task.done)

  return (
    <div className={`t-task${task.done ? ' done' : ''}`}>
      <button
        className={`t-check${task.done ? ' on' : ''}`}
        onClick={() => onToggle(task.id)}
        aria-label="Toggle complete"
      >
        {task.done && <Check size={10} strokeWidth={2.5} color="white" />}
      </button>

      <div className="t-tbody">
        <div className="t-tname">{task.name}</div>
        <div className="t-tmeta">
          <span className={`t-badge ${pr.cls}`}>{pr.label}</span>
          <span className={`t-badge ${st.cls}`}>{st.label}</span>
          {showGroup && g && (
            <span className="t-grp-badge" style={{ background: g.color }}>{g.name}</span>
          )}
          {task.due && (
            <span className={`t-due${over ? ' over' : ''}`}>{task.due}</span>
          )}
        </div>
      </div>

      <div className="t-avt" title={task.assignee}>{task.assignee || '?'}</div>

      <div className="t-actions">
        <button className="t-act-btn" onClick={() => onEdit(task)} title="Tahrirlash">
          <Pencil size={12} strokeWidth={1.8} />
        </button>
        <button className="t-act-btn del" onClick={() => onDelete(task.id)} title="O'chirish">
          <Trash2 size={12} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
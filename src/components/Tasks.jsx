import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Plus, FileSpreadsheet, Pencil, Trash2, Loader2,
  Clock, AlertTriangle, CheckCircle2, Calendar, Inbox,
  SlidersHorizontal, X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGroupStore } from '../hooks/useGroupStore'
import GroupSelector from './GroupSelector'
import api from '../lib/api'
import '../assets/Tasks.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const ADD_TASK_GROUPS = ['NX', 'NGZ', 'NTS']

const TIMELINE_OPTIONS = [
  { id: '',         label: 'Barchasi'     },
  { id: 'today',    label: 'Bugun'        },
  { id: 'tomorrow', label: 'Ertaga'       },
  { id: 'week',     label: 'Bu hafta'     },
  { id: 'month',    label: 'Bu oy'        },
  { id: '2_months', label: '2 oy'         },
  { id: 'year',     label: 'Bu yil'       },
  { id: 'past',     label: "O'tib ketgan" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('uz-UZ', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
    : null

const isSameDay = (iso, offsetDays = 0) => {
  if (!iso) return false
  const d   = new Date(iso)
  const ref = new Date()
  ref.setDate(ref.getDate() + offsetDays)
  return (
    d.getDate()     === ref.getDate()     &&
    d.getMonth()    === ref.getMonth()    &&
    d.getFullYear() === ref.getFullYear()
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Tasks() {
  const { user, isAdmin, isTasker } = useAuth()
  const navigate = useNavigate()
  const { selectedGroup } = useGroupStore()

  const [tasks,       setTasks]       = useState([])
  const [stats,       setStats]       = useState({})
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [query,       setQuery]       = useState('')
  const [timeline,    setTimeline]    = useState('')
  const [groupBy,     setGroupBy]     = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const searchRef = useRef(null)

  const canAdd =
    isAdmin || isTasker ||
    ADD_TASK_GROUPS.includes(selectedGroup?.short_name ?? user?.group?.short_name)

  const hasActiveFilters = timeline !== '' || groupBy

  const [exportLoading, setExportLoading] = useState(false)

  const handleExport = useCallback(async () => {
    const groupShortName = selectedGroup?.short_name
    if (!groupShortName) return

    setExportLoading(true)
    try {
      const params = new URLSearchParams({ group_name: groupShortName })
      if (timeline) params.set('timeline', timeline)

      const res = await api.get(`/tasks/xl-tasks/?${params}`, {
        responseType: 'blob',  // critical — tells axios not to parse binary as text
      })

      const url  = URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href     = url
      link.download = `tasks_${groupShortName}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Faylni yuklab olishda xatolik yuz berdi')
    } finally {
      setExportLoading(false)
    }
  }, [selectedGroup, timeline])
  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedGroup && selectedGroup.id !== 'ALL') params.set('group', selectedGroup.id)
      if (query)         params.set('search', query)
      if (timeline)      params.set('timeline', timeline)
      if (groupBy)       params.set('group_by', 'group')

      const { data } = await api.get(`/tasks/kts/?${params}`)

      // Handle both paginated and non-paginated response shapes
      const payload = data.results ?? data
      setTasks(payload.results ?? [])
      setStats(payload.stats   ?? {})
    } catch {
      setError('Topshiriqlarni yuklashda xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }, [selectedGroup?.id, query, timeline, groupBy])

  useEffect(() => {
    if (!selectedGroup) return
    const timer = setTimeout(fetchTasks, query ? 350 : 0)
    return () => clearTimeout(timer)
  }, [fetchTasks, selectedGroup])

  // ── Delete ─────────────────────────────────────────────────────────────────

  const deleteTask = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm("Topshiriqni o'chirishni tasdiqlaysizmi?")) return
    try {
      await api.delete(`/tasks/kts/${id}/`)
      setTasks(prev => prev.filter(t => t.id !== id))
      setStats(prev => ({ ...prev, total: Math.max(0, (prev.total ?? 0) - 1) }))
    } catch {
      fetchTasks() // re-sync on failure
    }
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const total      = stats.total       ?? 0
  const upcoming   = stats.upcoming    ?? 0
  const overdue    = stats.overdue     ?? 0
  const noDeadline = stats.no_deadline ?? 0
  const dueToday   = stats.due_today   ?? 0

  // Backend ordering: deadline_bucket 0 (upcoming) → 1 (past) → 2 (no deadline)
  const upcomingTasks   = tasks.filter(t => !t.is_overdue && t.deadline)
  const overdueTasks    = tasks.filter(t => t.is_overdue)
  const noDeadlineTasks = tasks.filter(t => !t.deadline)

  const activeTimelineLabel = TIMELINE_OPTIONS.find(t => t.id === timeline)?.label

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="topshiriqlar">

      {/* ── Selector + action buttons ── */}
      <div className="t-selector">
        <GroupSelector />
        <button
          className={`t-icon-btn${showFilters ? ' on' : ''}${hasActiveFilters ? ' has-dot' : ''}`}
          onClick={() => setShowFilters(p => !p)}
          title="Filtrlar"
        >
          <SlidersHorizontal size={14} strokeWidth={1.8} />
        </button>
        {canAdd && (
        <button className="t-add-btn" onClick={handleExport} disabled={exportLoading}>
          {exportLoading
            ? <Loader2 size={13} strokeWidth={2} className="t-spin" />
            : <FileSpreadsheet size={13} strokeWidth={2} />
          }
          <span className="t-btn-lbl">{exportLoading ? '...' : 'Yuklash'}</span>
        </button>

        )}
        {canAdd && (
          <button className="t-add-btn" onClick={() => navigate('/task/create/')}>
            <Plus size={13} strokeWidth={2.5} />
            <span className="t-btn-lbl">Qo'shish</span>
          </button>
        )}
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="t-filter-panel">
          <div className="t-filter-row">
            <span className="t-filter-lbl">Muddat</span>
            <div className="t-chips">
              {TIMELINE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`t-fchip${timeline === opt.id ? ' on' : ''}`}
                  onClick={() => setTimeline(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="t-filter-row center">
            <span className="t-filter-lbl">Ko'rinish</span>
            <label className="t-toggle-lbl">
              <input
                type="checkbox"
                checked={groupBy}
                onChange={e => setGroupBy(e.target.checked)}
              />
              <span className="t-toggle-track" />
              Guruh statistikasini ko'rsatish
            </label>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="t-stats">
        <div className="t-stat">
          <Calendar size={12} strokeWidth={1.8} className="t-stat-ico" />
          <div className="t-stat-lbl">Jami</div>
          <div className="t-stat-val">
            {loading ? <span className="t-stat-skel" /> : total}
          </div>
        </div>
        <div className="t-stat blue">
          <Clock size={12} strokeWidth={1.8} className="t-stat-ico" />
          <div className="t-stat-lbl">Kutilmoqda</div>
          <div className="t-stat-val">
            {loading ? <span className="t-stat-skel" /> : upcoming}
          </div>
          {!loading && dueToday > 0 && (
            <div className="t-stat-sub">{dueToday} bugun</div>
          )}
        </div>
        <div className={`t-stat${overdue > 0 ? ' urgent' : ''}`}>
          <AlertTriangle size={12} strokeWidth={1.8} className="t-stat-ico" />
          <div className="t-stat-lbl">Muddati o'tgan</div>
          <div className="t-stat-val">
            {loading ? <span className="t-stat-skel" /> : overdue}
          </div>
        </div>
        <div className="t-stat">
          <Inbox size={12} strokeWidth={1.8} className="t-stat-ico" />
          <div className="t-stat-lbl">Muddatsiz</div>
          <div className="t-stat-val">
            {loading ? <span className="t-stat-skel" /> : noDeadline}
          </div>
        </div>
      </div>

      {/* ── Group breakdown ── */}
      {groupBy && stats.by_group && Object.keys(stats.by_group).length > 0 && (
        <GroupBreakdown data={stats.by_group} />
      )}

      {/* ── Search ── */}
      <div className="t-toolbar">
        <div className="t-search-wrap">
          <Search size={13} strokeWidth={1.8} className="t-search-icon" />
          <input
            ref={searchRef}
            className="t-search"
            type="text"
            placeholder="Topshiriq nomi, guruh yoki ijrochi..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="t-search-clear"
              onClick={() => { setQuery(''); searchRef.current?.focus() }}
            >
              <X size={10} />
            </button>
          )}
        </div>
        {timeline && (
          <button className="t-active-pill" onClick={() => setTimeline('')}>
            <Calendar size={10} strokeWidth={2} />
            {activeTimelineLabel}
            <X size={9} />
          </button>
        )}
      </div>

      {/* ── Task list ── */}
      <div className="t-sections">
        {loading ? (
          <div className="t-empty">
            <Loader2 size={17} strokeWidth={1.5} className="t-spin" />
          </div>
        ) : error ? (
          <div className="t-empty t-error">
            <AlertTriangle size={15} strokeWidth={1.5} />
            <p>{error}</p>
            <button className="t-retry-btn" onClick={fetchTasks}>Qayta urinish</button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="t-empty">
            <CheckCircle2 size={20} strokeWidth={1.2} />
            <p>Topshiriqlar topilmadi</p>
          </div>
        ) : (
          <>
            {upcomingTasks.length > 0 && (
              <Section title="Faol" count={upcomingTasks.length}>
                {upcomingTasks.map(t => (
                  <TaskCard key={t.id} task={t}
                    onEdit={() => navigate(`/task/${t.id}/edit/`)}
                    onDelete={deleteTask}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                  />
                ))}
              </Section>
            )}
            {overdueTasks.length > 0 && (
              <Section title="Muddati o'tgan" count={overdueTasks.length} variant="overdue">
                {overdueTasks.map(t => (
                  <TaskCard key={t.id} task={t}
                    onEdit={() => navigate(`/task/${t.id}/edit/`)}
                    onDelete={deleteTask}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                  />
                ))}
              </Section>
            )}
            {noDeadlineTasks.length > 0 && (
              <Section title="Muddatsiz" count={noDeadlineTasks.length} variant="muted">
                {noDeadlineTasks.map(t => (
                  <TaskCard key={t.id} task={t}
                    onEdit={() => navigate(`/task/${t.id}/edit/`)}
                    onDelete={deleteTask}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── GroupBreakdown ────────────────────────────────────────────────────────────

function GroupBreakdown({ data }) {
  return (
    <div className="t-breakdown">
      <div className="t-breakdown-ttl">Guruhlar bo'yicha</div>
      <div className="t-breakdown-grid">
        {Object.entries(data).map(([short, g]) => {
          const pct = g.total ? Math.round(g.upcoming / g.total * 100) : 0
          return (
            <div key={short} className="t-bd-card">
              <div className="t-bd-head">
                <span className="t-bd-short">{short}</span>
                <span className="t-bd-name">{g.name}</span>
              </div>
              <div className="t-bd-nums">
                <span title="Jami">{g.total}</span>
                <span className="t-bd-sep" />
                <span className="t-bd-blue" title="Kutilmoqda">{g.upcoming}</span>
                <span className="t-bd-sep" />
                <span className="t-bd-red" title="Muddati o'tgan">{g.overdue}</span>
                {g.due_today > 0 && (
                  <>
                    <span className="t-bd-sep" />
                    <span className="t-bd-gold">{g.due_today} bugun</span>
                  </>
                )}
              </div>
              <div className="t-bd-bar">
                <div className="t-bd-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, count, children, variant }) {
  return (
    <div className={`t-section${variant ? ` ${variant}` : ''}`}>
      <div className="t-sec-head">
        <span className="t-sec-title">{title}</span>
        <span className="t-sec-count">{count}</span>
        <span className="t-sec-divider" />
      </div>
      <div className="t-task-list">{children}</div>
    </div>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ task, onEdit, onDelete, onClick }) {
  const isOverdue  = task.is_overdue
  const isTodayDl  = isSameDay(task.deadline, 0)
  const isTomorDl  = isSameDay(task.deadline, 1)

  const dlLabel = isOverdue  ? `⚠ ${fmtDate(task.deadline)}`
    : isTodayDl ? 'Bugun'
    : isTomorDl ? 'Ertaga'
    : fmtDate(task.deadline)

  const dlMod = isOverdue  ? 'over'
    : isTodayDl ? 'today'
    : isTomorDl ? 'tmrw'
    : ''

  return (
    <div
      className={[
        't-task',
        isOverdue        ? 'overdue' : '',
        task.is_due_soon ? 'soon'    : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <div className="t-task-bar" />
      <div className="t-check-placeholder" />

      <div className="t-tbody">
        <div className="t-tname">{task.name}</div>
        <div className="t-tmeta">
          {task.group_name && (
            <span className="t-tag t-tag-group">{task.group_name}</span>
          )}
          {task.deadline ? (
            <span className={`t-tag t-tag-dl${dlMod ? ` ${dlMod}` : ''}`}>
              <Calendar size={9} strokeWidth={2} />
              {dlLabel}
            </span>
          ) : (
            <span className="t-tag t-tag-none">Muddatsiz</span>
          )}
          {task.is_due_soon && !isOverdue && (
            <span className="t-tag t-tag-soon">Tez orada</span>
          )}
        </div>
      </div>

      {/* {(task.can_edit || task.can_delete) && (
        <div className="t-actions" onClick={e => e.stopPropagation()}>
          {task.can_edit && (
            <button
              className="t-act-btn"
              onClick={() => onEdit(task)}
              title="Tahrirlash"
            >
              <Pencil size={12} strokeWidth={1.8} />
            </button>
          )}
          {task.can_delete && (
            <button
              className="t-act-btn del"
              onClick={e => onDelete(task.id, e)}
              title="O'chirish"
            >
              <Trash2 size={12} strokeWidth={1.8} />
            </button>
          )}
        </div>
      )} */}
    </div>
  )
}
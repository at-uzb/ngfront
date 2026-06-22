import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Plus, FileSpreadsheet, Loader2,
  Clock, AlertTriangle, CheckCircle2, Calendar, Inbox, X, ChevronDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGroupStore } from '../hooks/useGroupStore'
import GroupSelector from './GroupSelector'
import api from '../lib/api'

// ── Constants ──────────────────────────────────────────────────────────────────

const TIMELINE_OPTIONS = [
  { id: '',              label: 'Barcha vaqt'    },
  { id: 'last_week',     label: 'Oxirgi hafta'   },
  { id: 'last_month',    label: 'Oxirgi oy'      },
  { id: 'past_3_months', label: "So'nggi 3 oy"   },
  { id: 'year',          label: 'Yil'            },
  { id: 'past',          label: "Muddati o'tgan" },
]

// Status values must match Django KT.Status choices exactly
const STATUS = {
  ALL:       null,
  UPCOMING:  'kutilmoqda',
  OVERDUE:   '__overdue__',   // pseudo-status, handled via deadline__lt filter on backend
  DONE:      'bajarildi',
}

// ── Utils (move to src/utils/date.js in your project) ─────────────────────────

export const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('uz-UZ', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
    : null

export const isSameDay = (iso, offsetDays = 0) => {
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Tasks() {
  const { user, isAdmin, isTasker } = useAuth()
  const navigate                    = useNavigate()
  const { selectedGroup }           = useGroupStore()

  // All filters live here — all sent to server, nothing filtered client-side
  const [tasks,         setTasks]         = useState([])
  const [stats,         setStats]         = useState({})
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [query,         setQuery]         = useState('')
  const [timeline,      setTimeline]      = useState('')
  const [statusFilter,  setStatusFilter]  = useState(STATUS.ALL)
  const [exportLoading, setExportLoading] = useState(false)

  const searchRef = useRef(null)

  // canAdd comes from backend via user object — ADD_TASK_GROUPS removed
  const canAdd = isAdmin || isTasker || user?.can_add_tasks

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    const groupShortName = selectedGroup?.short_name
    if (!groupShortName) return
    setExportLoading(true)
    try {
      const params = new URLSearchParams({ group_name: groupShortName })
      if (timeline) params.set('timeline', timeline)
      const res  = await api.get(`/tasks/xl-tasks/?${params}`, { responseType: 'blob' })
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

  // ── Fetch — ALL filtering is server-side ───────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()

      if (selectedGroup?.id !== 'ALL') params.set('group',    selectedGroup?.id)
      if (query)                        params.set('search',   query)
      if (timeline)                     params.set('timeline', timeline)

      // Status filter — all goes to server
      if (statusFilter === STATUS.DONE) {
        params.set('status', 'bajarildi')
      } else if (statusFilter === STATUS.OVERDUE) {
        params.set('overdue', 'true')
      } else if (statusFilter === STATUS.UPCOMING) {
        params.set('upcoming', 'true')
      }
      // STATUS.ALL → no extra param, backend returns all active tasks

      const { data } = await api.get(`/tasks/kts/?${params}`)
      const payload  = data.results ?? data
      setTasks(payload.results ?? [])
      setStats(payload.stats   ?? {})
    } catch {
      setError('Topshiriqlarni yuklashda xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }, [selectedGroup?.id, query, timeline, statusFilter])

  useEffect(() => {
    if (!selectedGroup) return
    const timer = setTimeout(fetchTasks, query ? 350 : 0)
    return () => clearTimeout(timer)
  }, [fetchTasks, selectedGroup])

  // Reset status filter when group or timeline changes
  useEffect(() => {
    setStatusFilter(STATUS.ALL)
  }, [selectedGroup?.id, timeline])

  // ── Delete — optimistic with full stats update ─────────────────────────────

  const deleteTask = useCallback(async (id, e) => {
    e.stopPropagation()
    if (!window.confirm("Topshiriqni o'chirishni tasdiqlaysizmi?")) return

    // Snapshot before removal so we can update stats accurately
    const removed = tasks.find(t => t.id === id)
    if (!removed) return

    setTasks(prev => prev.filter(t => t.id !== id))

    // Update every affected stat counter atomically
    setStats(prev => {
      const next = { ...prev, total: Math.max(0, (prev.total ?? 0) - 1) }
      if (removed.is_overdue) {
        next.overdue = Math.max(0, (prev.overdue ?? 0) - 1)
      } else if (removed.deadline) {
        next.upcoming = Math.max(0, (prev.upcoming ?? 0) - 1)
        if (removed.is_due_soon) {
          next.due_today = Math.max(0, (prev.due_today ?? 0) - 1)
        }
      }
      return next
    })

    try {
      await api.delete(`/tasks/kts/${id}/`)
    } catch {
      // Rollback on failure
      fetchTasks()
    }
  }, [tasks, fetchTasks])

  // ── Stat card click — toggle filter, send to server ───────────────────────

  const handleStatClick = useCallback((key) => {
    setStatusFilter(prev => prev === key ? STATUS.ALL : key)
  }, [])

  // ── Derived stats ──────────────────────────────────────────────────────────

  const total    = stats.total     ?? 0
  const upcoming = stats.upcoming  ?? 0
  const overdue  = stats.overdue   ?? 0
  const done     = stats.done      ?? 0
  const dueToday = stats.due_today ?? 0

  const activeTimelineLabel = TIMELINE_OPTIONS.find(t => t.id === timeline)?.label

  // Tasks come pre-bucketed from server — just split by is_overdue / deadline
  const upcomingTasks   = tasks.filter(t => !t.is_overdue &&  t.deadline)
  const overdueTasks    = tasks.filter(t =>  t.is_overdue)
  const noDeadlineTasks = tasks.filter(t => !t.deadline && !t.is_overdue)
  // Done tasks have is_overdue=false naturally since status=bajarildi
  // When statusFilter===DONE, all tasks land in upcomingTasks or noDeadlineTasks
  // We handle that by showing them under a single "Bajarilgan" section instead
  const doneTasks = statusFilter === STATUS.DONE ? tasks : []

  // ── Render ─────────────────────────────────────────────────────────────────

  const statCards = [
    {
      key:   STATUS.ALL,
      label: 'Jami',
      value: total,
      icon:  Calendar,
      mod:   '',
    },
    {
      key:   STATUS.UPCOMING,
      label: 'Kutilmoqda',
      value: upcoming,
      icon:  Clock,
      mod:   'blue',
      sub:   dueToday > 0 ? `${dueToday} bugun` : null,
    },
    {
      key:   STATUS.OVERDUE,
      label: "Muddati o'tgan",
      value: overdue,
      icon:  AlertTriangle,
      mod:   overdue > 0 ? 'urgent' : '',
    },
    {
      key:   STATUS.DONE,
      label: 'Bajarilgan',
      value: done,
      icon:  Inbox,
      mod:   'green',
    },
  ]

  return (
  <>
    <style>{CSS}</style>
    <div className="topshiriqlar">

      {/* ── Filter bar ── */}
      <div className="df-wrap">
        <div className="df-row">
          <GroupSelector />
          <div className="t-filter-actions">
            {isAdmin && (
              <button
                className="t-add-btn"
                onClick={handleExport}
                disabled={exportLoading}
                title="Excel yuklash"
              >
                {exportLoading
                  ? <Loader2 size={13} strokeWidth={2} className="t-spin" />
                  : <FileSpreadsheet size={13} strokeWidth={2} />
                }
                <span className="t-btn-lbl">{exportLoading ? '...' : 'Yuklash'}</span>
              </button>
            )}
            {canAdd && (
              <button
                className="t-add-btn primary"
                onClick={() => navigate('/task/create/')}
                title="Topshiriq qo'shish"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span className="t-btn-lbl">Qo'shish</span>
              </button>
            )}
          </div>
        </div>

        <div className="df-divider" />

        <div className="df-row">
          <div className="df-period-tabs">
            {TIMELINE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                className={`df-tab${timeline === opt.id ? ' active' : ''}`}
                onClick={() => setTimeline(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="t-stats">
        {statCards.map(({ key, label, value, icon: Icon, mod, sub }) => (
          <div
            key={String(key)}
            className={[
              't-stat',
              mod,
              statusFilter === key && key !== STATUS.ALL ? 'active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => handleStatClick(key)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handleStatClick(key)}
            aria-pressed={statusFilter === key}
          >
            <Icon size={12} strokeWidth={1.8} className="t-stat-ico" />
            <div className="t-stat-lbl">{label}</div>
            <div className="t-stat-val">
              {loading ? <span className="t-stat-skel" /> : value}
            </div>
            {sub && !loading && <div className="t-stat-sub">{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Group breakdown ── */}
      {stats.by_group && Object.keys(stats.by_group).length > 0 && (
        <GroupBreakdown data={stats.by_group} />
      )}

      {/* ── Toolbar ── */}
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
              aria-label="Tozalash"
            >
              <X size={10} />
            </button>
          )}
        </div>
        <div className="t-pills">
          {timeline && (
            <button className="t-active-pill" onClick={() => setTimeline('')}>
              <Calendar size={10} strokeWidth={2} />
              {activeTimelineLabel}
              <X size={9} />
            </button>
          )}
          {statusFilter && statusFilter !== STATUS.ALL && (
            <button className="t-active-pill" onClick={() => setStatusFilter(STATUS.ALL)}>
              <X size={9} />
              {statCards.find(s => s.key === statusFilter)?.label}
            </button>
          )}
        </div>
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
        ) : statusFilter === STATUS.DONE ? (
          // Done tasks — shown as a single flat section
          <Section title="Bajarilgan" count={doneTasks.length} variant="done">
            {doneTasks.map(t => (
              <TaskCard
                key={t.id}
                task={t}
                onDelete={deleteTask}
                onClick={() => navigate(`/tasks/${t.id}`)}
              />
            ))}
          </Section>
        ) : (
          <>
            {upcomingTasks.length > 0 && (
              <Section title="Faol" count={upcomingTasks.length}>
                {upcomingTasks.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onDelete={deleteTask}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                  />
                ))}
              </Section>
            )}
            {overdueTasks.length > 0 && (
              <Section title="Muddati o'tgan" count={overdueTasks.length} variant="overdue">
                {overdueTasks.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onDelete={deleteTask}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                  />
                ))}
              </Section>
            )}
            {noDeadlineTasks.length > 0 && (
              <Section title="Muddatsiz" count={noDeadlineTasks.length} variant="muted">
                {noDeadlineTasks.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
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
  </>
  )

}

// ── GroupBreakdown ─────────────────────────────────────────────────────────────

function GroupBreakdown({ data }) {
  return (
    <div className="t-breakdown">
      <div className="t-breakdown-ttl">Guruhlar bo'yicha</div>
      <div className="t-breakdown-grid">
        {Object.entries(data).map(([short, g]) => {
          const pct = g.total ? Math.round((g.upcoming / g.total) * 100) : 0
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

// ── Section ────────────────────────────────────────────────────────────────────

function Section({ title, count, variant, children }) {
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

// ── TaskCard ───────────────────────────────────────────────────────────────────

function TaskCard({ task, onDelete, onClick }) {
  const isOverdue = task.is_overdue
  const isDone    = task.status === 'bajarildi'
  const isTodayDl = isSameDay(task.deadline, 0)
  const isTomorDl = isSameDay(task.deadline, 1)

  const dlLabel = isOverdue  ? `⚠ ${fmtDate(task.deadline)}`
                : isTodayDl  ? 'Bugun'
                : isTomorDl  ? 'Ertaga'
                : fmtDate(task.deadline)

  const dlMod = isOverdue ? 'over'
              : isTodayDl ? 'today'
              : isTomorDl ? 'tmrw'
              : ''

  return (
    <div
      className={[
        't-task',
        isOverdue        ? 'overdue' : '',
        isDone           ? 'done'    : '',
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
          {isDone && (
            <span className="t-tag t-tag-done">Bajarildi</span>
          )}
          {task.deadline ? (
            <span className={`t-tag t-tag-dl${dlMod ? ` ${dlMod}` : ''}`}>
              <Calendar size={9} strokeWidth={2} />
              {dlLabel}
            </span>
          ) : (
            !isDone && <span className="t-tag t-tag-none">Muddatsiz</span>
          )}
          {task.is_due_soon && !isOverdue && !isDone && (
            <span className="t-tag t-tag-soon">Tez orada</span>
          )}
        </div>
      </div>

      {onDelete && (
        <div className="t-actions">
          <button
            className="t-act-btn del"
            onClick={e => onDelete(task.id, e)}
            title="O'chirish"
          >
            <X size={11} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}
// ── Styles ────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --t-font:      'Inter', system-ui, sans-serif;
  --t-mono:      'JetBrains Mono', monospace;
  --t-radius:    10px;
  --t-radius-sm: 8px;
  --t-radius-lg: 12px;
}

/* ── Light tokens ── */
.light {
  --t-brand:       #6768EE;
  --t-brand-rgb:   103, 104, 238;
  --t-brand-light: #eff0fe;
  --t-brand-muted: rgba(103,104,238,0.10);
  --t-brand-bdr:   rgba(103,104,238,0.20);

  --t-bg:        #ffffff;
  --t-surface:   #f4f6fb;
  --t-surface-2: #eef0f8;
  --t-border:    rgba(103,104,238,0.10);
  --t-border-md: rgba(103,104,238,0.22);
  --t-text:      #0f1117;
  --t-muted:     #7b8296;
  --t-subtle:    #b0b8cc;
  --t-hover:     #eff0fe;
  --t-shadow-sm: 0 1px 2px rgba(103,104,238,0.06), 0 0 0 1px rgba(103,104,238,0.07);
  --t-shadow-md: 0 4px 16px rgba(103,104,238,0.10), 0 0 0 1px rgba(103,104,238,0.10);

  --t-urgent-bg:   #fff1f2;
  --t-urgent-bdr:  rgba(220,38,38,0.20);
  --t-urgent-text: #dc2626;
  --t-blue-bg:     #eff0fe;
  --t-blue-text:   #6768EE;
  --t-gold-bg:     #fffbeb;
  --t-gold-text:   #b45309;
  --t-green-bg:    #f0fdf4;
  --t-green-text:  #15803d;
}

/* ── Dark tokens ── */
.dark {
  --t-brand:       #8384f3;
  --t-brand-rgb:   131, 132, 243;
  --t-brand-light: rgba(103,104,238,0.18);
  --t-brand-muted: rgba(103,104,238,0.10);
  --t-brand-bdr:   rgba(131,132,243,0.28);

  --t-bg:        #13162a;
  --t-surface:   #0f1122;
  --t-surface-2: #0b0d1a;
  --t-border:    rgba(131,132,243,0.12);
  --t-border-md: rgba(131,132,243,0.26);
  --t-text:      #e4e7f5;
  --t-muted:     #4e5575;
  --t-subtle:    #2e3350;
  --t-hover:     rgba(103,104,238,0.09);
  --t-shadow-sm: 0 0 0 1px rgba(131,132,243,0.10);
  --t-shadow-md: 0 0 0 1px rgba(131,132,243,0.16), 0 8px 24px rgba(103,104,238,0.08);

  --t-urgent-bg:   rgba(220,38,38,0.08);
  --t-urgent-bdr:  rgba(220,38,38,0.22);
  --t-urgent-text: #f87171;
  --t-blue-bg:     rgba(103,104,238,0.14);
  --t-blue-text:   #a5b4fc;
  --t-gold-bg:     rgba(180,83,9,0.14);
  --t-gold-text:   #fbbf24;
  --t-green-bg:    rgba(21,128,61,0.12);
  --t-green-text:  #86efac;
}

/* ── Root ── */
.topshiriqlar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 15px;
  font-family: var(--t-font);
  width: 100%;
  box-sizing: border-box;
}

/* ── Filter bar (df-wrap shared with DashboardFilter) ── */
.df-wrap {
  display: flex;
  flex-direction: column;
  background: var(--t-bg);
  border: 1px solid var(--t-border);
  border-top: 2px solid var(--t-brand);
  border-radius: 14px;
  box-shadow: var(--t-shadow-sm);
  font-family: var(--t-font);
  transition: background 0.3s, border-color 0.3s;
}

.df-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.df-divider {
  height: 1px;
  background: var(--t-border);
  margin: 0 16px;
  flex-shrink: 0;
}

.df-row .group-selector { flex: 1; min-width: 0; }
.df-row .group-selector__trigger { width: 100%; }

.df-period-tabs {
  display: flex;
  flex: 1;
  min-width: 0;
  background: var(--t-surface);
  border: 1px solid var(--t-border);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}

.df-tab {
  flex: 1 1 0;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 6px 4px;
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--t-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-family: var(--t-font);
  white-space: nowrap;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
}

.df-tab:hover { color: var(--t-text); background: var(--t-bg); }

.df-tab.active {
  background: var(--t-brand);
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(var(--t-brand-rgb), 0.35);
}

.dark .df-tab.active {
  background: rgba(var(--t-brand-rgb), 0.22);
  color: #a5b4fc;
  border: 0.5px solid rgba(var(--t-brand-rgb), 0.30);
  box-shadow: none;
}

/* ── Action buttons ── */
.t-filter-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
}

.t-add-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: var(--t-radius);
  border: 1px solid var(--t-border-md);
  background: var(--t-bg);
  font-size: 13px;
  font-weight: 500;
  color: var(--t-text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--t-font);
  transition: all 0.15s;
  white-space: nowrap;
}

.t-add-btn:hover {
  background: var(--t-hover);
  border-color: var(--t-brand-bdr);
  color: var(--t-brand);
}

.t-add-btn.primary {
  background: var(--t-brand);
  color: #ffffff;
  border-color: transparent;
}

.t-add-btn.primary:hover {
  opacity: 0.88;
  color: #ffffff;
}

.t-add-btn:disabled       { opacity: 0.5; cursor: not-allowed; }
.t-add-btn:disabled:hover { background: var(--t-bg); color: var(--t-text); border-color: var(--t-border-md); }

/* ── Stats ── */
.t-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 8px;
}

.t-stat {
  background: var(--t-bg);
  border: 1px solid var(--t-border);
  border-top: 2px solid var(--t-brand-bdr);
  border-radius: var(--t-radius);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  box-shadow: var(--t-shadow-sm);
}

.t-stat:hover {
  border-color: var(--t-border-md);
  border-top-color: var(--t-brand);
  box-shadow: var(--t-shadow-md);
  transform: translateY(-1px);
}

.t-stat-ico { color: var(--t-subtle); margin-bottom: 2px; }
.t-stat-lbl { font-size: 10.5px; color: var(--t-muted); }

.t-stat-val {
  font-size: 22px;
  font-weight: 700;
  color: var(--t-text);
  display: flex;
  align-items: baseline;
  gap: 4px;
  line-height: 1.15;
  letter-spacing: -0.04em;
  font-family: var(--t-mono);
}

.t-stat.urgent .t-stat-val { color: var(--t-urgent-text); }
.t-stat.urgent { border-top-color: var(--t-urgent-text); }
.t-stat.blue   .t-stat-val { color: var(--t-blue-text); }
.t-stat.blue   { border-top-color: var(--t-brand); }

.t-stat-sub { font-size: 10px; color: var(--t-subtle); margin-top: 1px; }
.t-stat.blue .t-stat-sub { color: var(--t-blue-text); opacity: 0.8; }

.t-stat-skel {
  display: inline-block;
  width: 28px; height: 22px;
  border-radius: 4px;
  background: var(--t-surface);
  animation: t-shimmer 1.4s ease-in-out infinite;
}

/* ── Group breakdown ── */
.t-breakdown {
  background: var(--t-bg);
  border: 1px solid var(--t-border);
  border-top: 2px solid var(--t-brand);
  border-radius: var(--t-radius);
  padding: 13px 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--t-shadow-sm);
}

.t-breakdown-ttl {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t-muted);
}

.t-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 6px;
}

.t-bd-card {
  background: var(--t-surface);
  border: 1px solid var(--t-border);
  border-radius: var(--t-radius-sm);
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: border-color 0.15s;
}

.t-bd-card:hover { border-color: var(--t-border-md); }

.t-bd-head { display: flex; align-items: center; gap: 6px; min-width: 0; }

.t-bd-short {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
  background: var(--t-brand-light);
  color: var(--t-brand);
  border: 1px solid var(--t-brand-bdr);
  flex-shrink: 0;
  font-family: var(--t-mono);
  letter-spacing: 0.03em;
}

.t-bd-name {
  font-size: 11.5px;
  color: var(--t-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.t-bd-nums {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--t-muted);
}

.t-bd-sep  { width: 1px; height: 9px; background: var(--t-border-md); flex-shrink: 0; }
.t-bd-blue { color: var(--t-blue-text);   font-weight: 600; }
.t-bd-red  { color: var(--t-urgent-text); font-weight: 600; }
.t-bd-gold { color: var(--t-gold-text);   font-size: 10.5px; }

.t-bd-bar {
  height: 3px;
  border-radius: 99px;
  background: var(--t-border);
  overflow: hidden;
}

.t-bd-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--t-brand);
  opacity: 0.5;
  transition: width 0.4s ease;
}

/* ── Toolbar / search ── */
.t-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.t-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
}

.t-search-icon {
  position: absolute;
  left: 11px; top: 50%;
  transform: translateY(-50%);
  color: var(--t-subtle);
  pointer-events: none;
}

.t-search {
  width: 100%;
  height: 36px;
  padding: 0 32px 0 34px;
  border-radius: var(--t-radius);
  border: 1px solid var(--t-border);
  background: var(--t-bg);
  font-size: 13px;
  font-family: var(--t-font);
  color: var(--t-text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
  box-shadow: var(--t-shadow-sm);
}

.t-search::placeholder { color: var(--t-subtle); }

.t-search:focus {
  border-color: var(--t-brand-bdr);
  box-shadow: 0 0 0 3px rgba(var(--t-brand-rgb), 0.10);
}

.t-search-clear {
  position: absolute;
  right: 8px; top: 50%;
  transform: translateY(-50%);
  width: 16px; height: 16px;
  border-radius: 50%;
  border: none;
  background: var(--t-border-md);
  color: var(--t-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.12s;
}

.t-search-clear:hover { background: var(--t-brand); color: #fff; }

.t-active-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 99px;
  border: 1px solid var(--t-brand-bdr);
  background: var(--t-brand-light);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--t-brand);
  cursor: pointer;
  font-family: var(--t-font);
  white-space: nowrap;
  transition: opacity 0.12s;
}

.t-active-pill:hover { opacity: 0.75; }

/* ── Empty / loading / error ── */
.t-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 20px;
  color: var(--t-subtle);
  font-size: 13px;
  text-align: center;
}

.t-empty p { margin: 0; color: var(--t-subtle); }
.t-error   { color: var(--t-urgent-text) !important; }

.t-retry-btn {
  height: 28px;
  padding: 0 14px;
  border-radius: var(--t-radius-sm);
  border: 1px solid var(--t-urgent-bdr);
  background: transparent;
  color: var(--t-urgent-text);
  font-size: 12px;
  font-family: var(--t-font);
  cursor: pointer;
  margin-top: 4px;
  transition: background 0.15s;
}

.t-retry-btn:hover { background: var(--t-urgent-bg); }

/* ── Animations ── */
@keyframes t-spin    { to { transform: rotate(360deg); } }
@keyframes t-shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
.t-spin { animation: t-spin 0.8s linear infinite; display: inline-block; }

/* ── Sections ── */
.t-sections { display: flex; flex-direction: column; gap: 20px; }
.t-section  { display: flex; flex-direction: column; gap: 7px; }

.t-sec-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 2px;
}

.t-sec-title {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t-muted);
}

.t-sec-count {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 99px;
  background: var(--t-brand-light);
  color: var(--t-brand);
  border: 1px solid var(--t-brand-bdr);
  font-family: var(--t-mono);
}

.t-sec-divider { flex: 1; height: 1px; background: var(--t-border); }

.t-section.overdue .t-sec-title { color: var(--t-urgent-text); }
.t-section.overdue .t-sec-count {
  background: var(--t-urgent-bg);
  color: var(--t-urgent-text);
  border-color: var(--t-urgent-bdr);
}
.t-section.muted .t-sec-title { color: var(--t-subtle); }
.t-section.muted .t-sec-count { background: var(--t-surface); color: var(--t-subtle); border-color: var(--t-border); }

.t-task-list { display: flex; flex-direction: column; gap: 5px; }

/* ── Task card ── */
.t-task {
  background: var(--t-bg);
  border: 1px solid var(--t-border);
  border-radius: 11px;
  padding: 11px 13px;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
  position: relative;
  overflow: hidden;
  box-shadow: var(--t-shadow-sm);
}

.t-task:hover {
  border-color: var(--t-border-md);
  box-shadow: var(--t-shadow-md);
}

.t-task:hover .t-actions { opacity: 1; }
.t-task:active { transform: scale(0.995); }

.t-task.overdue {
  border-color: var(--t-urgent-bdr);
  background: var(--t-urgent-bg);
}
.t-task.overdue:hover { border-color: rgba(220,38,38,0.38); }

/* Left accent bar */
.t-task-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--t-brand-bdr);
  border-radius: 11px 0 0 11px;
}

.t-task.overdue .t-task-bar { background: var(--t-urgent-text); opacity: 0.7; }
.t-task.soon    .t-task-bar { background: var(--t-gold-text);   opacity: 0.7; }

.t-check-placeholder { width: 18px; height: 18px; flex-shrink: 0; }
.t-tbody { flex: 1; min-width: 0; }

.t-tname {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--t-text);
  margin-bottom: 6px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.t-tmeta { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }

/* ── Tags ── */
.t-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 8px;
  border-radius: 20px;
  font-size: 10.5px;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid transparent;
}

.t-tag-group {
  background: var(--t-surface);
  color: var(--t-muted);
  border-color: var(--t-border);
}
.t-tag-none {
  background: var(--t-surface);
  color: var(--t-subtle);
  border-color: var(--t-border);
}
.t-tag-soon {
  background: var(--t-gold-bg);
  color: var(--t-gold-text);
  border-color: rgba(180,83,9,0.15);
}

.t-tag-dl       { background: var(--t-green-bg);  color: var(--t-green-text); border-color: rgba(21,128,61,0.15); }
.t-tag-dl.over  { background: var(--t-urgent-bg); color: var(--t-urgent-text); border-color: var(--t-urgent-bdr); }
.t-tag-dl.today { background: var(--t-blue-bg);   color: var(--t-blue-text); font-weight: 600; border-color: var(--t-brand-bdr); }
.t-tag-dl.tmrw  { background: var(--t-gold-bg);   color: var(--t-gold-text); border-color: rgba(180,83,9,0.15); }

/* ── Task actions ── */
.t-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.t-act-btn {
  width: 26px; height: 26px;
  border-radius: 7px;
  border: 1px solid var(--t-border);
  background: var(--t-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t-muted);
  font-family: var(--t-font);
  transition: all 0.15s;
  padding: 0;
}

.t-act-btn:hover     { background: var(--t-hover); color: var(--t-brand); border-color: var(--t-brand-bdr); }
.t-act-btn.del:hover { background: var(--t-urgent-bg); color: var(--t-urgent-text); border-color: var(--t-urgent-bdr); }
.t-stat.active {
  border-color: var(--t-brand-bdr);
  border-top-color: var(--t-brand);
  box-shadow: var(--t-shadow-md);
  background: var(--t-brand-muted);
}
.t-stat.urgent.active {
  background: var(--t-urgent-bg);
  border-top-color: var(--t-urgent-text);
}
.t-stat.blue.active {
  background: var(--t-blue-bg);
}
/* ── Mobile ── */
@media (max-width: 640px) {
  .t-search-wrap    { min-width: 100%; order: -1; }
  .t-add-btn        { margin-left: auto; padding: 0 10px; }
  .t-stats          { grid-template-columns: repeat(2, 1fr); }
  .t-actions        { opacity: 1; }
  .t-breakdown-grid { grid-template-columns: 1fr 1fr; }
  .t-btn-lbl        { display: none; }

  .df-row { padding: 10px 12px; gap: 8px; }
  .df-row:has(.df-period-tabs) { padding: 10px 12px; }

  .df-period-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3px;
    padding: 3px;
  }

  .df-period-tabs:has(.df-tab:nth-child(5):last-child) {
    grid-template-columns: repeat(6, 1fr);
  }
  .df-period-tabs:has(.df-tab:nth-child(5):last-child) .df-tab:nth-child(1),
  .df-period-tabs:has(.df-tab:nth-child(5):last-child) .df-tab:nth-child(2),
  .df-period-tabs:has(.df-tab:nth-child(5):last-child) .df-tab:nth-child(3) { grid-column: span 2; }
  .df-period-tabs:has(.df-tab:nth-child(5):last-child) .df-tab:nth-child(4),
  .df-period-tabs:has(.df-tab:nth-child(5):last-child) .df-tab:nth-child(5) { grid-column: span 3; }

  .df-tab { font-size: 0.72rem; padding: 7px 4px; }
}
`
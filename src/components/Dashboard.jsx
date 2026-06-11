import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useGroupStore } from '../hooks/useGroupStore'
import api from '../lib/api'
import DashboardFilter from "./Dashboardfilter"

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_LABELS = {
  yuqori: 'Yuqori',
  orta:   "O'rtacha",
  past:   'Past',
}

const PRIORITY_COLORS = {
  yuqori: {
    bg: '#fffbeb', text: '#b45309', dot: '#f59e0b',
    darkBg: 'rgba(245,158,11,0.12)', darkText: '#fbbf24', darkBorder: 'rgba(245,158,11,0.25)',
  },
  orta: {
    bg: '#eff0fe', text: '#4f46e5', dot: '#6768EE',
    darkBg: 'rgba(103,104,238,0.15)', darkText: '#a5b4fc', darkBorder: 'rgba(103,104,238,0.3)',
  },
  past: {
    bg: '#f0fdf4', text: '#15803d', dot: '#22c55e',
    darkBg: 'rgba(34,197,94,0.12)', darkText: '#86efac', darkBorder: 'rgba(34,197,94,0.25)',
  },
}

const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
]

const fmtDateUz = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()} ${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

const translateDuration = (raw) => {
  if (!raw) return raw
  const match = raw.match(/(\d+)d\s*(\d+)h\s*(\d+)m/)
  if (!match) return raw
  const totalMins = parseInt(match[1]) * 1440 + parseInt(match[2]) * 60 + parseInt(match[3])
  const days = totalMins / 1440
  return `${days < 1 ? days.toFixed(1) : Math.round(days * 10) / 10} kun`
}

const translateCountdown = (raw) => {
  if (!raw) return raw
  return raw
    .replace(/(\d+)\s*d/, '$1k')
    .replace(/(\d+)\s*h/, '$1s')
    .replace(/(\d+)\s*m/, '$1d')
}

function parseTimeLeft(timeLeft) {
  const match = timeLeft.match(/(\d+)d\s*(\d+)h\s*(\d+)m/)
  if (!match) return 0
  return parseInt(match[1]) * 1440 + parseInt(match[2]) * 60 + parseInt(match[3])
}

function urgencyLevel(timeLeft) {
  const mins = parseTimeLeft(timeLeft)
  if (mins < 60 * 24)     return 'critical'
  if (mins < 60 * 24 * 3) return 'warning'
  return 'normal'
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, accent, accentRgb }) => (
  <div className="stat-card" style={{ '--accent': accent, '--accent-rgb': accentRgb }}>
    <div className="stat-icon-wrap">
      <span className="stat-icon">{icon}</span>
    </div>
    <div className="stat-body">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? '—'}</span>
    </div>
    <div className="stat-shine" />
  </div>
)

const CountdownBar = ({ timeLeft }) => {
  const mins    = parseTimeLeft(timeLeft)
  const maxMins = 60 * 24 * 30
  const pct     = Math.min(100, (mins / maxMins) * 100)
  const level   = urgencyLevel(timeLeft)
  return (
    <div className="countdown-bar-wrap">
      <div className="countdown-bar-track">
        <div className={`countdown-bar-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`countdown-label ${level}`}>
        {translateCountdown(timeLeft)}
      </span>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

const PriorityChip = ({ priority, isDark }) => {
  const c = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.orta
  return (
    <span
      className="priority-chip"
      style={isDark
        ? { background: c.darkBg, color: c.darkText, border: `1px solid ${c.darkBorder}` }
        : { background: c.bg, color: c.text }
      }
    >
      <span className="priority-dot" style={{ background: isDark ? c.darkText : c.dot }} />
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { selectedGroup, loading: groupLoading } = useGroupStore()

  const [period,  setPeriod]  = useState('')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [isDark,  setIsDark]  = useState(
    () => document.querySelector('.app')?.classList.contains('dark') ?? false
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.querySelector('.app')?.classList.contains('dark') ?? false)
    })
    const app = document.querySelector('.app')
    if (app) observer.observe(app, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const fetchAnalytics = useCallback(async () => {
    if (!selectedGroup) return
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (selectedGroup.short_name !== 'ALL') params.group = selectedGroup.short_name
      if (period) params.period = period
      const { data: json } = await api.get('/tasks/kt/analytics/', { params })
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedGroup?.short_name, period])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  // ── Derived chart data ────────────────────────────────────────────────────

  const lineData = (() => {
    if (!data) return []
    const map = {}
    data.line_chart.created_tasks.forEach(({ date, count }) => {
      map[date] = { date, created: count, done: 0 }
    })
    data.line_chart.done_tasks.forEach(({ date, count }) => {
      if (!map[date]) map[date] = { date, created: 0, done: 0 }
      map[date].done = count
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  })()

  const barData = data ? [
    { name: 'Yuqori',   done: data.bar_chart.high.done_tasks,   pending: data.bar_chart.high.pending_tasks },
    { name: "O'rtacha", done: data.bar_chart.middle.done_tasks, pending: data.bar_chart.middle.pending_tasks },
    { name: 'Past',     done: data.bar_chart.low.done_tasks,    pending: data.bar_chart.low.pending_tasks },
  ] : []

  const runningOut = data ? Object.values(data.tasks_running_out) : []

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{CSS}</style>
      <div className="dash">

        <DashboardFilter period={period} onPeriodChange={setPeriod} />

        {(loading || groupLoading) && (
          <div className="overlay">
            <div className="spinner">
              <div className="spinner-ring" />
              <div className="spinner-ring inner" />
            </div>
            <p>Ma'lumotlar yuklanmoqda…</p>
          </div>
        )}

        {error && !loading && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={fetchAnalytics}>Qayta urinish</button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* ── Stat Cards ── */}
            <div className="stats-grid">
              <StatCard icon="⚡" label="Faol topshiriqlar"        value={data.active_tasks}                  accent="#6768EE" accentRgb="103,104,238" />
              <StatCard icon="⏳" label="Kutilayotganlar"           value={data.pending_tasks}                 accent="#06b6d4" accentRgb="6,182,212" />
              <StatCard icon="🕐" label="O'rtacha hal qilish vaqti" value={translateDuration(data.avg_time)}  accent="#a78bfa" accentRgb="167,139,250" />
              <StatCard icon="✅" label="O'z vaqtida hal qilingan"  value={data.in_time}                      accent="#10b981" accentRgb="16,185,129" />
            </div>

            {/* ── Charts ── */}
            <div className="charts-grid">
              <div className="chart-card">
                <h3 className="chart-title">Vaqt bo'yicha topshiriqlar</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={lineData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--dash-text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--dash-text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="created" stroke="#6768EE" strokeWidth={2.5} dot={{ r: 4, fill: '#6768EE', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} name="Yaratilgan" />
                    <Line type="monotone" dataKey="done"    stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} name="Bajarilgan" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3 className="chart-title">Prioritet bo'yicha</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--dash-text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--dash-text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="done"    fill="#10b981" radius={[5, 5, 0, 0]} name="Bajarilgan" />
                    <Bar dataKey="pending" fill="#6768EE" radius={[5, 5, 0, 0]} name="Kutilayotgan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Running out ── */}
            <div className="running-out-card">
              <h3 className="chart-title">
                Muddati yaqinlashayotgan topshiriqlar
                <span className="badge">{runningOut.length}</span>
              </h3>
              {runningOut.length === 0 ? (
                <div className="empty-state">Hozircha muddati yaqin topshiriqlar yo'q 🎉</div>
              ) : (
                <div className="running-out-list">
                  {runningOut.map((task, i) => {
                    const level = urgencyLevel(task.time_left)
                    return (
                      <div key={i} className={`task-row ${level}`}>
                        <div className="task-row-left">
                          <span className="task-index">{String(i + 1).padStart(2, '0')}</span>
                          <div className="task-info">
                            <span className="task-name">{task.name}</span>
                            <span className="task-meta">{fmtDateUz(task.created_at)}</span>
                          </div>
                        </div>
                        <div className="task-row-right">
                          <PriorityChip priority={task.priority} isDark={isDark} />
                          <CountdownBar timeLeft={task.time_left} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {!data && !loading && !error && (
          <div className="overlay muted"><p>Guruhni tanlang 👆</p></div>
        )}

      </div>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Light tokens ── */
.dash {
  --brand:            #6768EE;
  --brand-rgb:        103, 104, 238;
  --brand-light:      #eff0fe;
  --brand-muted:      rgba(103,104,238,0.10);
  --brand-border:     rgba(103,104,238,0.25);

  --dash-bg:          #f4f6fb;
  --dash-surface:     #ffffff;
  --dash-surface-2:   #f0f2f8;
  --dash-border:      rgba(103,104,238,0.12);
  --dash-border-h:    rgba(103,104,238,0.28);
  --dash-text:        #0f1117;
  --dash-text-muted:  #7b8296;
  --dash-shadow-sm:   0 1px 2px rgba(103,104,238,0.06), 0 0 0 1px rgba(103,104,238,0.07);
  --dash-shadow-md:   0 4px 16px rgba(103,104,238,0.10), 0 0 0 1px rgba(103,104,238,0.10);
  --dash-radius:      14px;
  --dash-radius-sm:   9px;

  font-family: 'Inter', sans-serif;
  background: var(--dash-bg);
  min-height: 100vh;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--dash-text);
}

/* ── Dark tokens ── */
.dark .dash {
  --brand:            #8384f3;
  --brand-rgb:        131, 132, 243;
  --brand-light:      rgba(103,104,238,0.18);
  --brand-muted:      rgba(103,104,238,0.10);
  --brand-border:     rgba(131,132,243,0.30);

  --dash-bg:          #0d0f1a;
  --dash-surface:     #13162a;
  --dash-surface-2:   #0f1122;
  --dash-border:      rgba(131,132,243,0.14);
  --dash-border-h:    rgba(131,132,243,0.30);
  --dash-text:        #e4e7f5;
  --dash-text-muted:  #4e5575;
  --dash-shadow-sm:   0 0 0 1px rgba(131,132,243,0.10);
  --dash-shadow-md:   0 0 0 1px rgba(131,132,243,0.16), 0 8px 24px rgba(103,104,238,0.08);
}

/* ── Filter bar ── */
.dash-filter {
  display: flex;
  align-items: center;
  background: var(--dash-surface);
  border: 1px solid var(--dash-border);
  border-radius: var(--dash-radius);
  padding: 0;
  box-shadow: var(--dash-shadow-sm);
  overflow: hidden;
}

.dash-filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 20px;
  flex: 1;
  min-width: 0;
}

.dash-filter-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--dash-text-muted);
}

.dash-filter-control       { width: 100%; }
.dash-filter-control > *   { width: 100% !important; }

.dash-filter-divider {
  width: 1px;
  align-self: stretch;
  background: var(--dash-border);
  flex-shrink: 0;
}

/* ── Period tabs ── */
.period-tabs {
  display: flex;
  width: 100%;
  background: var(--dash-surface-2);
  border: 1px solid var(--dash-border);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}

.period-tab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 6px 12px;
  border-radius: 7px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--dash-text-muted);
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Inter', sans-serif;
  white-space: nowrap;
  text-align: center;
}

.period-tab:hover {
  color: var(--dash-text);
  background: var(--dash-surface);
}

.period-tab.active {
  background: var(--brand);
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(var(--brand-rgb), 0.35);
}

.dark .period-tab.active {
  background: rgba(var(--brand-rgb), 0.22);
  color: #c7c9ff;
  border: 1px solid rgba(var(--brand-rgb), 0.30);
  box-shadow: none;
}

/* ── Stat Cards ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.stat-card {
  position: relative;
  background: var(--dash-surface);
  border: 1px solid var(--dash-border);
  border-top: 2px solid var(--accent);
  border-radius: var(--dash-radius);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: var(--dash-shadow-sm);
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}

.stat-card:hover {
  box-shadow: var(--dash-shadow-md);
  transform: translateY(-2px);
  border-color: var(--dash-border-h);
  border-top-color: var(--accent);
}

.stat-shine {
  position: absolute;
  top: 0; right: 0;
  width: 110px; height: 110px;
  background: radial-gradient(circle at 80% 20%, rgba(var(--accent-rgb), 0.08) 0%, transparent 70%);
  pointer-events: none;
  border-radius: 50%;
}

.stat-icon-wrap {
  width: 46px; height: 46px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.10);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-size: 1.2rem;
}

.stat-body  { display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 0.72rem; font-weight: 500; color: var(--dash-text-muted); line-height: 1.3; }
.stat-value { font-size: 1.7rem; font-weight: 700; letter-spacing: -0.04em; line-height: 1; color: var(--dash-text); }

/* ── Chart Cards ── */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.chart-card {
  background: var(--dash-surface);
  border: 1px solid var(--dash-border);
  border-top: 2px solid var(--brand);
  border-radius: var(--dash-radius);
  padding: 22px;
  box-shadow: var(--dash-shadow-sm);
  transition: box-shadow 0.2s;
}

.chart-card:hover {
  box-shadow: var(--dash-shadow-md);
}

.chart-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--dash-text);
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.01em;
}

.badge {
  background: var(--brand-light);
  color: var(--brand);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  font-family: 'JetBrains Mono', monospace;
  border: 1px solid var(--brand-border);
}

.dark .badge {
  background: rgba(var(--brand-rgb), 0.15);
  color: #a5b4fc;
  border-color: rgba(var(--brand-rgb), 0.28);
}

/* ── Tooltip ── */
.chart-tooltip {
  background: var(--dash-surface);
  border: 1px solid var(--dash-border-h);
  border-radius: var(--dash-radius-sm);
  padding: 10px 14px;
  font-size: 0.82rem;
  box-shadow: var(--dash-shadow-md);
  color: var(--dash-text);
}

.chart-tooltip-label {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--dash-text-muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── Running out card ── */
.running-out-card {
  background: var(--dash-surface);
  border: 1px solid var(--dash-border);
  border-top: 2px solid var(--brand);
  border-radius: var(--dash-radius);
  padding: 22px;
  box-shadow: var(--dash-shadow-sm);
}

.running-out-list { display: flex; flex-direction: column; gap: 4px; }

.task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 14px;
  border-radius: var(--dash-radius-sm);
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}

.task-row:hover {
  background: var(--dash-surface-2);
  border-color: var(--dash-border);
}

.task-row.critical {
  border-left: 3px solid #ef4444;
  border-radius: 0 var(--dash-radius-sm) var(--dash-radius-sm) 0;
}
.task-row.warning {
  border-left: 3px solid #f59e0b;
  border-radius: 0 var(--dash-radius-sm) var(--dash-radius-sm) 0;
}
.task-row.normal {
  border-left: 3px solid var(--brand-border);
  border-radius: 0 var(--dash-radius-sm) var(--dash-radius-sm) 0;
}

.dark .task-row.critical { background: rgba(239,68,68,0.05); }
.dark .task-row.warning  { background: rgba(245,158,11,0.04); }
.dark .task-row.normal   { background: rgba(var(--brand-rgb), 0.04); }

.task-row-left  { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; overflow: hidden; }
.task-row-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }

.task-index {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.70rem;
  font-weight: 500;
  color: var(--dash-text-muted);
  width: 22px;
  text-align: right;
  flex-shrink: 0;
  opacity: 0.6;
}

.task-info  { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; overflow: hidden; }

.task-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--dash-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.task-meta {
  font-size: 0.70rem;
  color: var(--dash-text-muted);
}

/* ── Priority chip ── */
.priority-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.70rem;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.priority-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* ── Countdown bar ── */
.countdown-bar-wrap { display: flex; align-items: center; gap: 10px; }

.countdown-bar-track {
  width: 100px; height: 4px;
  background: var(--dash-surface-2);
  border-radius: 99px;
  overflow: hidden;
  border: 1px solid var(--dash-border);
}

.countdown-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; }
.countdown-bar-fill.critical { background: #ef4444; }
.countdown-bar-fill.warning  { background: #f59e0b; }
.countdown-bar-fill.normal   { background: var(--brand); }

.countdown-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.70rem;
  font-weight: 500;
  white-space: nowrap;
}
.countdown-label.critical { color: #ef4444; }
.countdown-label.warning  { color: #d97706; }
.countdown-label.normal   { color: var(--brand); }

.dark .countdown-label.critical { color: #f87171; }
.dark .countdown-label.warning  { color: #fbbf24; }
.dark .countdown-label.normal   { color: #a5b4fc; }

/* ── Overlays ── */
.overlay {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 300px; gap: 16px;
  color: var(--dash-text-muted); font-size: 0.9rem;
}
.overlay.muted { opacity: 0.5; }

.spinner {
  position: relative;
  width: 40px; height: 40px;
}
.spinner-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: var(--brand);
  animation: spin 0.9s linear infinite;
}
.spinner-ring.inner {
  inset: 8px;
  border-top-color: rgba(var(--brand-rgb), 0.35);
  animation-duration: 0.6s;
  animation-direction: reverse;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Error banner ── */
.error-banner {
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-left: 3px solid #ef4444;
  border-radius: 0 var(--dash-radius-sm) var(--dash-radius-sm) 0;
  padding: 12px 16px;
  color: #dc2626;
  font-size: 0.85rem;
  display: flex; align-items: center;
  justify-content: space-between; gap: 12px;
}
.dark .error-banner {
  background: rgba(220,38,38,0.08);
  border-color: rgba(220,38,38,0.20);
  border-left-color: #ef4444;
  color: #fca5a5;
}
.error-banner button {
  border: 1px solid rgba(220,38,38,0.35);
  background: transparent;
  color: #dc2626;
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  transition: background 0.15s;
}
.error-banner button:hover { background: rgba(220,38,38,0.06); }
.dark .error-banner button { color: #fca5a5; border-color: rgba(220,38,38,0.25); }

.empty-state {
  text-align: center; padding: 36px;
  color: var(--dash-text-muted); font-size: 0.88rem;
}

/* ── Scrollbar (webkit) ── */
.dash ::-webkit-scrollbar { width: 5px; height: 5px; }
.dash ::-webkit-scrollbar-track { background: transparent; }
.dash ::-webkit-scrollbar-thumb {
  background: var(--brand-border);
  border-radius: 99px;
}

/* ── Responsive ── */
@media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) {
  .dash { padding: 14px; gap: 14px; }
  .dash-filter { flex-direction: column; }
  .dash-filter-divider { width: auto; height: 1px; align-self: stretch; }
  .charts-grid { grid-template-columns: 1fr; }
  .task-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  .task-row-right { width: 100%; justify-content: space-between; }
  .countdown-bar-track { width: 80px; }
  .period-tabs { flex-wrap: wrap; }
}
@media (max-width: 480px) { .stat-icon-wrap { display: none; } }
`

export default Dashboard
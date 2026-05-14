import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useGroupStore } from '../hooks/useGroupStore'
import api from '../lib/api'
import DashboardFilter from './DashboardFilter'

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_LABELS = {
  yuqori: 'Yuqori',
  orta:   "O'rtacha",
  past:   'Past',
}

const PRIORITY_COLORS = {
  yuqori: { bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' },
  orta:   { bg: '#dbeafe', text: '#2563eb', dot: '#3b82f6' },
  past:   { bg: '#dcfce7', text: '#16a34a', dot: '#22c55e' },
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

const StatCard = ({ icon, label, value, accent }) => (
  <div className="stat-card" style={{ '--accent': accent }}>
    <div className="stat-icon-wrap">
      <span className="stat-icon">{icon}</span>
    </div>
    <div className="stat-body">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? '—'}</span>
    </div>
    <div className="stat-glow" />
  </div>
)

const CountdownBar = ({ timeLeft }) => {
  const mins     = parseTimeLeft(timeLeft)
  const maxMins  = 60 * 24 * 30           // 30 days as 100%
  const pct      = Math.min(100, (mins / maxMins) * 100)
  const level    = urgencyLevel(timeLeft)
  return (
    <div className="countdown-bar-wrap">
      <div className="countdown-bar-track">
        <div
          className={`countdown-bar-fill ${level}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`countdown-label ${level}`}>{timeLeft}</span>
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

// ── Main Component ────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { selectedGroup, loading: groupLoading } = useGroupStore()

  const [period, setPeriod]   = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

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

  // ── Derived chart data ──────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{CSS}</style>
      <div className="dash">

        {/* ── Filter ── */}
        <DashboardFilter period={period} onPeriodChange={setPeriod} />

        {/* ── Loading / Error overlays ── */}
        {(loading || groupLoading) && (
          <div className="overlay">
            <div className="orbit"><div className="orbit-dot" /></div>
            <p>Ma'lumotlar yuklanmoqda…</p>
          </div>
        )}

        {error && !loading && (
          <div className="error-banner">
            ⚠️ {error}
            <button onClick={fetchAnalytics}>Qayta urinish</button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* ── Stat Cards ── */}
            <div className="stats-grid">
              <StatCard icon="⚡" label="Faol topshiriqlar"       value={data.active_tasks}   accent="#f59e0b" />
              <StatCard icon="⏳" label="Kutilayotganlar"          value={data.pending_tasks}  accent="#3b82f6" />
              <StatCard icon="🕐" label="O'rtacha hal qilish vaqti" value={data.avg_time}      accent="#8b5cf6" />
              <StatCard icon="✅" label="O'z vaqtida hal qilingan"  value={data.in_time}       accent="#10b981" />
            </div>

            {/* ── Charts ── */}
            <div className="charts-grid">
              <div className="chart-card">
                <h3 className="chart-title">Vaqt bo'yicha topshiriqlar</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={lineData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Yaratilgan" />
                    <Line type="monotone" dataKey="done"    stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Bajarilgan" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3 className="chart-title">Prioritet bo'yicha</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="done"    fill="#10b981" radius={[4, 4, 0, 0]} name="Bajarilgan" />
                    <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Kutilayotgan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Tasks Running Out ── */}
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
                    const level  = urgencyLevel(task.time_left)
                    const colors = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.orta
                    return (
                      <div key={i} className={`task-row ${level}`}>
                        <div className="task-row-left">
                          <span className="task-index">{i + 1}</span>
                          <div className="task-info">
                            <span className="task-name">{task.name}</span>
                            <span className="task-meta">
                              {new Date(task.created_at).toLocaleDateString('uz-UZ', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="task-row-right">
                          <span
                            className="priority-chip"
                            style={{ background: colors.bg, color: colors.text }}
                          >
                            <span className="priority-dot" style={{ background: colors.dot }} />
                            {PRIORITY_LABELS[task.priority] ?? task.priority}
                          </span>
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
          <div className="overlay muted">
            <p>Guruhni tanlang 👆</p>
          </div>
        )}
      </div>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:           #f8f7f4;
  --surface:      #ffffff;
  --surface-2:    #f4f3f0;
  --border:       #e8e6e1;
  --border-hover: #d0cdc6;
  --text:         #1a1917;
  --text-muted:   #78716c;
  --shadow-sm:    0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:    0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --radius:       14px;
  --radius-sm:    8px;
  font-family: 'DM Sans', sans-serif;
}

.dash {
  background: var(--bg);
  min-height: 100vh;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--text);
}

/* ── Filter bar ── */
.dash-filter {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0;
  box-shadow: var(--shadow-sm);
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
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.dash-filter-control {
  width: 100%;
}

.dash-filter-control > * {
  width: 100% !important;
}

.dash-filter-divider {
  width: 1px;
  align-self: stretch;
  background: var(--border);
  flex-shrink: 0;
}

/* ── Period tabs ── */
.period-tabs {
  display: flex;
  width: 100%;
  background: var(--surface-2);
  border: 1px solid var(--border);
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
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
  text-align: center;
}

.period-tab:hover { color: var(--text); background: var(--surface); }

.period-tab.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

/* ── Stat Cards ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.stat-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--border-hover);
}

.stat-glow {
  position: absolute;
  top: -30px; right: -30px;
  width: 80px; height: 80px;
  background: var(--accent);
  opacity: 0.08;
  border-radius: 50%;
  pointer-events: none;
}

.stat-icon-wrap {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-size: 1.3rem;
}

.stat-body { display: flex; flex-direction: column; gap: 3px; }
.stat-label { font-size: 0.73rem; font-weight: 500; color: var(--text-muted); line-height: 1.3; }
.stat-value { font-size: 1.65rem; font-weight: 700; letter-spacing: -0.03em; line-height: 1; }

/* ── Chart Cards ── */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.chart-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 22px;
  box-shadow: var(--shadow-sm);
}

.chart-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  background: #fef3c7;
  color: #d97706;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  font-family: 'DM Mono', monospace;
}

/* ── Custom tooltip ── */
.chart-tooltip {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 0.82rem;
  box-shadow: var(--shadow-md);
}

.chart-tooltip-label {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text-muted);
  font-size: 0.75rem;
}

/* ── Running out card ── */
.running-out-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 22px;
  box-shadow: var(--shadow-sm);
}

.running-out-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}

.task-row:hover { background: var(--surface-2); border-color: var(--border); }

.task-row.critical { border-left: 3px solid #ef4444; }
.task-row.warning  { border-left: 3px solid #f59e0b; }
.task-row.normal   { border-left: 3px solid var(--border); }

.task-row-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.task-index {
  font-family: 'DM Mono', monospace;
  font-size: 0.72rem;
  color: var(--text-muted);
  width: 20px;
  text-align: right;
  flex-shrink: 0;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.task-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.task-row-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

/* ── Priority chip ── */
.priority-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.priority-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Countdown bar ── */
.countdown-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.countdown-bar-track {
  width: 100px;
  height: 5px;
  background: var(--surface-2);
  border-radius: 99px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.countdown-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
}

.countdown-bar-fill.critical { background: #ef4444; }
.countdown-bar-fill.warning  { background: #f59e0b; }
.countdown-bar-fill.normal   { background: #10b981; }

.countdown-label {
  font-family: 'DM Mono', monospace;
  font-size: 0.72rem;
  font-weight: 500;
  white-space: nowrap;
}

.countdown-label.critical { color: #ef4444; }
.countdown-label.warning  { color: #d97706; }
.countdown-label.normal   { color: #16a34a; }

/* ── Overlays ── */
.overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.overlay.muted { opacity: 0.5; }

.orbit {
  width: 44px; height: 44px;
  border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: #f59e0b;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  color: #dc2626;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.error-banner button {
  border: 1px solid #fca5a5;
  background: white;
  color: #dc2626;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
  font-size: 0.88rem;
}

/* ── Responsive ── */
@media (max-width: 1100px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

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

@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
}
`

export default Dashboard
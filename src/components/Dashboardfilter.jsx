import GroupSelector from './GroupSelector'

const PERIODS = [
  { value: '',              label: 'Barcha vaqt'  },
  { value: 'last_week',     label: 'Oxirgi hafta' },
  { value: 'last_month',    label: 'Oxirgi oy'    },
  { value: 'past_3_months', label: 'Oxirgi 3 oy'  },
  { value: 'year',          label: 'Yil'          },
]

export { PERIODS }

export default function DashboardFilter({ period, onPeriodChange }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="df-wrap">

        <div className="df-row">
          <GroupSelector />
        </div>

        <div className="df-divider" />

        <div className="df-row">
          <div className="df-period-tabs">
            {PERIODS.map(p => (
              <button
                key={p.value}
                className={`df-tab${period === p.value ? ' active' : ''}`}
                onClick={() => onPeriodChange(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CSS = `
/* ── Light tokens ── */
.light .df-wrap {
  --df-bg:                #ffffff;
  --df-border:            rgba(103,104,238,0.12);
  --df-divider:           rgba(103,104,238,0.08);
  --df-tabs-bg:           #f4f5fe;
  --df-text:              #0f1117;
  --df-muted:             #7b8296;
  --df-shadow:            0 1px 2px rgba(103,104,238,0.06), 0 0 0 1px rgba(103,104,238,0.07);
  --df-tab-active-shadow: 0 1px 3px rgba(103,104,238,0.10);
}

/* ── Dark tokens ── */
.dark .df-wrap {
  --df-bg:                #13162a;
  --df-border:            rgba(131,132,243,0.14);
  --df-divider:           rgba(131,132,243,0.08);
  --df-tabs-bg:           #0f1122;
  --df-text:              #e4e7f5;
  --df-muted:             #4e5575;
  --df-shadow:            0 0 0 1px rgba(131,132,243,0.10);
  --df-tab-active-shadow: none;
}

.df-wrap {
  display: flex;
  flex-direction: column;
  background: var(--df-bg);
  border: 1px solid var(--df-border);
  border-top: 2px solid #6768EE;
  border-radius: 14px;
  box-shadow: var(--df-shadow);
  font-family: 'Inter', sans-serif;
  transition: background 0.3s, border-color 0.3s;
}

/* ── Rows ── */
.df-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.df-row .group-selector {
  flex: 1;
  min-width: 0;
}

.df-row .group-selector__trigger {
  width: 100%;
}

/* ── Divider ── */
.df-divider {
  height: 1px;
  background: var(--df-divider);
  margin: 0 16px;
  flex-shrink: 0;
}

/* ── Period tabs ── */
.df-period-tabs {
  display: flex;
  flex: 1;
  min-width: 0;
  background: var(--df-tabs-bg);
  border: 1px solid var(--df-border);
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
  color: var(--df-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-family: 'Inter', sans-serif;
  white-space: nowrap;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
}

.df-tab:hover {
  color: var(--df-text);
  background: var(--df-bg);
}

.df-tab.active {
  background: #6768EE;
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(103,104,238,0.35);
}

.dark .df-tab.active {
  background: rgba(103,104,238,0.22);
  color: #a5b4fc;
  border: 0.5px solid rgba(131,132,243,0.30);
  box-shadow: none;
}

/* ── Tasks action buttons ── */
.t-filter-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .df-row {
    padding: 10px 12px;
    gap: 8px;
  }

  .df-row .group-selector {
    width: 100%;
  }

  .df-row:has(.df-period-tabs) {
    padding: 10px 12px;
  }

  .df-period-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3px;
    padding: 3px;
  }

  .df-tab:nth-child(4),
  .df-tab:nth-child(5) {
    grid-column: span 1;
  }

  .df-period-tabs:has(.df-tab:nth-child(5):last-child) {
    grid-template-columns: repeat(6, 1fr);
  }

  .df-period-tabs:has(.df-tab:nth-child(5):last-child) .df-tab:nth-child(1),
  .df-period-tabs:has(.df-tab:nth-child(5):last-child) .df-tab:nth-child(2),
  .df-period-tabs:has(.df-tab:nth-child(5):last-child) .df-tab:nth-child(3) {
    grid-column: span 2;
  }

  .df-period-tabs:has(.df-tab:nth-child(5):last-child) .df-tab:nth-child(4),
  .df-period-tabs:has(.df-tab:nth-child(5):last-child) .df-tab:nth-child(5) {
    grid-column: span 3;
  }

  .df-tab {
    font-size: 0.72rem;
    padding: 7px 4px;
  }
}
`
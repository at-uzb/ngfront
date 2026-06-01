import GroupSelector from './GroupSelector'
import '../assets/Dashboardfilter.css'

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
    <div className="df-wrap">

      <div className="df-row">
        <GroupSelector />
      </div>

      <div className="df-divider" />

      {/* Period tabs — full width row */}
      <div className="df-row">
        <div className="df-period-tabs">
          {PERIODS.map(p => (
            <button
              key={p.value}
              className={`df-tab ${period === p.value ? 'active' : ''}`}
              onClick={() => onPeriodChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
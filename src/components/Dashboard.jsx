import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

import { useGroupStore } from '../hooks/useGroupStore'
import GroupSelector from './GroupSelector'
import '../assets/Dashboard.css'

const Dashboard = () => {

  const { selectedGroup, loading: groupLoading } = useGroupStore()

  const [dashboardData, setDashboardData] = useState({
    stats: {},
    ticketsOverTime: [],
    pendingTickets: [],
    resolutionByCategory: []
  })
  const [loading, setLoading] = useState(false)

  const generateMockData = (groupId) => {
    const randomFactor = Math.random() * 0.3 + 0.85
    return {
      stats: {
        totalActiveTickets: Math.floor(150 * randomFactor),
        avgResolutionTime: (Math.random() * 4 + 1.5).toFixed(1),
        onTimeResolution: Math.floor(70 + Math.random() * 25),
        pendingTickets: Math.floor(20 * randomFactor)
      },
      ticketsOverTime: [
        { date: 'Yanvar',  resolved: Math.floor(25 * randomFactor), created: Math.floor(28 * randomFactor) },
        { date: 'Fevral',  resolved: Math.floor(30 * randomFactor), created: Math.floor(27 * randomFactor) },
        { date: 'Mart',    resolved: Math.floor(28 * randomFactor), created: Math.floor(32 * randomFactor) },
        { date: 'Aprel',   resolved: Math.floor(35 * randomFactor), created: Math.floor(30 * randomFactor) },
        { date: 'May',     resolved: Math.floor(32 * randomFactor), created: Math.floor(34 * randomFactor) },
        { date: 'Iyun',    resolved: Math.floor(38 * randomFactor), created: Math.floor(35 * randomFactor) }
      ],
      pendingTickets: [
        { id: `${groupId}-001`, title: 'Topshiriq 1', priority: 'High',   age: '2 kun', assignee: 'Ishchi A' },
        { id: `${groupId}-002`, title: 'Topshiriq 2', priority: 'Medium', age: '3 kun', assignee: 'Ishchi B' },
        { id: `${groupId}-003`, title: 'Topshiriq 3', priority: 'Low',    age: '5 kun', assignee: 'Ishchi C' },
        { id: `${groupId}-004`, title: 'Topshiriq 4', priority: 'High',   age: '1 kun', assignee: 'Ishchi D' }
      ],
      resolutionByCategory: [
        { name: '1-toifa', resolved: Math.floor(40 * randomFactor), pending: Math.floor(8 * randomFactor) },
        { name: '2-toifa', resolved: Math.floor(35 * randomFactor), pending: Math.floor(6 * randomFactor) },
        { name: '3-toifa', resolved: Math.floor(30 * randomFactor), pending: Math.floor(5 * randomFactor) },
        { name: '4-toifa', resolved: Math.floor(25 * randomFactor), pending: Math.floor(4 * randomFactor) }
      ]
    }
  }

  // Re-fetch whenever the selected group changes
  useEffect(() => {
    if (!selectedGroup) return
    setLoading(true)
    const timer = setTimeout(() => {
      setDashboardData(generateMockData(selectedGroup.id))
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [selectedGroup?.id])

  const getPriorityClass = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':   return 'priority-high'
      case 'medium': return 'priority-medium'
      case 'low':    return 'priority-low'
      default:       return ''
    }
  }

  const getPriorityText = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':   return 'Yuqori'
      case 'medium': return "O'rtacha"
      case 'low':    return 'Past'
      default:       return priority
    }
  }

  if (groupLoading || loading) {
    return (
      <div className="dashboard">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">

      {/* Group Selector — no props needed, state lives in the hook */}
      <div className="filter-bar">
        <h3>Xizmatlar bo'yicha:</h3>
        <GroupSelector />
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-info">
            <h3>Faol topshiriqlar</h3>
            <p className="stat-value">{dashboardData.stats.totalActiveTickets}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-info">
            <h3>O'rtacha hal qilish vaqti</h3>
            <p className="stat-value">{dashboardData.stats.avgResolutionTime} kun</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>O'z vaqtida hal qilish</h3>
            <p className="stat-value">{dashboardData.stats.onTimeResolution}%</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>Kutilayotgan topshiriqlar</h3>
            <p className="stat-value">{dashboardData.stats.pendingTickets}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Vaqt bo'yicha hal qilingan topshiriqlar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.ticketsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="resolved" stroke="#8884d8" name="Hal qilingan" />
              <Line type="monotone" dataKey="created"  stroke="#82ca9d" name="Yaratilgan" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Kategoriyalar bo'yicha hal qilish</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.resolutionByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="resolved" fill="#8884d8" name="Hal qilingan" />
              <Bar dataKey="pending"  fill="#ff8042" name="Kutilayotgan" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending Tickets Table */}
      <div className="pending-tickets">
        <h3>Kutilayotgan topshiriqlar</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Sarlavha</th>
                <th>Prioritet</th>
                <th>Kunlar</th>
                <th>Mas'ul</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.pendingTickets?.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>{ticket.title}</td>
                  <td>
                    <span className={`priority-badge ${getPriorityClass(ticket.priority)}`}>
                      {getPriorityText(ticket.priority)}
                    </span>
                  </td>
                  <td>{ticket.age}</td>
                  <td>{ticket.assignee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

export default Dashboard
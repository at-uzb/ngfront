import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Loader2, Search, X, Newspaper, AlertTriangle, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import NewsModal from './NewsModal'
import '../assets/News.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('uz-UZ', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
    : null

// ── Main Component ────────────────────────────────────────────────────────────

export default function News() {
  const { isAdmin } = useAuth()
  const navigate    = useNavigate()

  const [news,    setNews]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [query,   setQuery]   = useState('')

  // modal state
  const [activeSlug, setActiveSlug] = useState(null)

  const searchRef = useRef(null)

  // ── Fetch list ─────────────────────────────────────────────────────────────

  const fetchNews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query) params.set('search', query)
      const { data } = await api.get(`/news/news/?${params}`)
      setNews(data.results ?? [])
      setTotal(data.count  ?? 0)
    } catch {
      setError('Yangiliklar yuklanmadi')
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const timer = setTimeout(fetchNews, query ? 350 : 0)
    return () => clearTimeout(timer)
  }, [fetchNews])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="news-page">

      {/* ── Search + Add ── */}
      <div className="news-toolbar">
        <div className="news-search-wrap">
          <Search size={13} strokeWidth={1.8} className="news-search-icon" />
          <input
            ref={searchRef}
            className="news-search"
            type="text"
            placeholder="Yangilik nomi..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="news-search-clear"
              onClick={() => { setQuery(''); searchRef.current?.focus() }}
            >
              <X size={10} />
            </button>
          )}
        </div>

        {isAdmin && (
          <button className="news-add-btn" onClick={() => navigate('/news/create/')}>
            <Plus size={13} strokeWidth={2.5} />
            <span className="news-btn-lbl">Qo'shish</span>
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="news-state">
          <Loader2 size={18} strokeWidth={1.5} className="news-spin" />
        </div>
      ) : error ? (
        <div className="news-state news-state--error">
          <AlertTriangle size={16} strokeWidth={1.5} />
          <p>{error}</p>
          <button className="news-retry-btn" onClick={fetchNews}>Qayta urinish</button>
        </div>
      ) : news.length === 0 ? (
        <div className="news-state">
          <Newspaper size={22} strokeWidth={1.2} />
          <p>Yangiliklar topilmadi</p>
        </div>
      ) : (
        <div className="news-grid">
          {news.map((item, i) => (
            <NewsCard
              key={item.id}
              item={item}
              index={i}
              onClick={() => setActiveSlug(item.slug)}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <NewsModal
        slug={activeSlug}
        onClose={() => setActiveSlug(null)}
      />

    </div>
  )
}

// ── NewsCard ──────────────────────────────────────────────────────────────────

function NewsCard({ item, index, onClick }) {
  return (
    <div
      className="news-card"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
    >
      <div className="news-card-thumb">
        {item.thumbnail
          ? <img src={item.thumbnail} alt={item.title} loading="lazy" />
          : <div className="news-card-thumb-placeholder"><Newspaper size={22} strokeWidth={1.2} /></div>
        }
      </div>
      <div className="news-card-body">
        <div className="news-card-title">{item.title}</div>
        <div className="news-card-foot">
          <span className="news-card-date">
            <Calendar size={10} strokeWidth={1.8} />
            {fmtDate(item.published_at)}
          </span>
          <span className={`news-card-badge ${item.status}`}>
            {item.status === 'published' ? 'Chop etilgan' : 'Qoralama'}
          </span>
        </div>
      </div>
    </div>
  )
}
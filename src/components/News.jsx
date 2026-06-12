import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Loader2, Search, X, Newspaper, AlertTriangle, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import NewsModal from './NewsModal'

const fmtDate = (iso) => {
  if (!iso) return null
  // handle both "2026-05-26" and "2026-05-26T10:30:00Z" formats
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return iso
  return `${match[3]}.${match[2]}.${match[1]}`
}

export default function News() {
  const { isAdmin } = useAuth()
  const navigate    = useNavigate()

  const [news,       setNews]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [query,      setQuery]      = useState('')
  const [activeSlug, setActiveSlug] = useState(null)

  const searchRef = useRef(null)

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

  return (
    <>
      <style>{CSS}</style>
      <div className="news-page">

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

        <NewsModal slug={activeSlug} onClose={() => setActiveSlug(null)} />

      </div>
    </>
  )
}

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
          : <div className="news-card-thumb-placeholder"><Newspaper size={20} strokeWidth={1.2} /></div>
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

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Light tokens ── */
.light .news-page {
  --n-bg:        #ffffff;
  --n-surface:   #f0f2ff;
  --n-border:    rgba(103,104,238,0.12);
  --n-border-h:  rgba(103,104,238,0.28);
  --n-text:      #0f1117;
  --n-muted:     #7b8296;
  --n-subtle:    #b0b8cc;
  --n-hover:     rgba(103,104,238,0.07);
  --n-shadow-sm: 0 1px 2px rgba(103,104,238,0.06), 0 0 0 1px rgba(103,104,238,0.07);
  --n-shadow-md: 0 4px 16px rgba(103,104,238,0.10), 0 0 0 1px rgba(103,104,238,0.10);
  --n-error:     #ef4444;
  --n-error-bg:  rgba(239,68,68,0.08);
}

/* ── Dark tokens ── */
.dark .news-page {
  --n-bg:        #1e2438;
  --n-surface:   #151a2e;
  --n-border:    rgba(131,132,243,0.14);
  --n-border-h:  rgba(131,132,243,0.30);
  --n-text:      #e4e7f5;
  --n-muted:     #4e5575;
  --n-subtle:    #2d3354;
  --n-hover:     rgba(103,104,238,0.10);
  --n-shadow-sm: 0 0 0 1px rgba(131,132,243,0.10);
  --n-shadow-md: 0 0 0 1px rgba(131,132,243,0.16), 0 8px 24px rgba(103,104,238,0.08);
  --n-error:     #fca5a5;
  --n-error-bg:  rgba(220,38,38,0.10);
}

/* ── Page ── */
.news-page {
  padding: 0 1rem 2rem;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Toolbar ── */
.news-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1rem;
}

/* ── Search ── */
.news-search-wrap {
  position: relative;
  flex: 1;
}

.news-search-icon {
  position: absolute;
  left: 10px; top: 50%;
  transform: translateY(-50%);
  color: var(--n-subtle);
  pointer-events: none;
}

.news-search {
  width: 100%;
  height: 36px;
  padding: 0 32px 0 32px;
  font-size: 13px;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--n-text);
  background: var(--n-bg);
  border: 1px solid #4F6EF7;
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.news-search::placeholder { color: var(--n-subtle); }

.news-search:focus {
  border-color: #4F6EF7;
  box-shadow: 0 0 0 3px rgba(79,110,247,0.12);
}

.news-search-clear {
  position: absolute;
  right: 8px; top: 50%;
  transform: translateY(-50%);
  width: 17px; height: 17px;
  border-radius: 50%;
  border: none;
  background: rgba(79,110,247,0.12);
  color: var(--n-muted);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 0;
  transition: background 0.12s;
}

.news-search-clear:hover { background: #4F6EF7; color: #ffffff; }

/* ── Add button ── */
.news-add-btn {
  display: flex; align-items: center; gap: 5px;
  height: 36px;
  padding: 0 16px;
  font-size: 13px; font-weight: 600;
  font-family: 'Inter', system-ui, sans-serif;
  color: #ffffff;
  background: #4F6EF7;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s;
}

.news-add-btn:hover { background: #3a57d0; }

@media (max-width: 640px) {
  .news-btn-lbl { display: none; }
  .news-add-btn { padding: 0; width: 36px; justify-content: center; }
}

/* ── States ── */
.news-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px;
  padding: 4rem 1rem;
  color: var(--n-muted);
  font-size: 13px;
}

.news-state p { margin: 0; color: var(--n-muted); }
.news-state--error     { color: var(--n-error); }
.news-state--error p   { color: var(--n-error); }

.news-retry-btn {
  margin-top: 4px;
  height: 30px; padding: 0 16px;
  font-size: 12px; font-weight: 500;
  font-family: 'Inter', system-ui, sans-serif;
  border: 1px solid rgba(220,38,38,0.22);
  border-radius: 7px;
  background: transparent;
  cursor: pointer;
  color: var(--n-error);
  transition: background 0.15s;
}

.news-retry-btn:hover { background: var(--n-error-bg); }

@keyframes newsSpin { to { transform: rotate(360deg); } }
.news-spin { animation: newsSpin 0.9s linear infinite; }

/* ── Grid ── */
.news-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Card ── */
.news-card {
  display: flex;
  align-items: stretch;
  background: var(--n-bg);
  border: 1px solid var(--n-border);
  border-left: 3px solid #4F6EF7;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--n-shadow-sm);
  transition: border-color 0.15s, box-shadow 0.18s, transform 0.15s;
  animation: newsCardIn 0.25s ease both;
  outline: none;
}

.news-card:hover {
  border-color: var(--n-border-h);
  border-left-color: #4F6EF7;
  box-shadow: var(--n-shadow-md);
  transform: translateY(-1px);
}

.news-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(79,110,247,0.15);
}

@keyframes newsCardIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Thumbnail ── */
.news-card-thumb {
  width: 100px;
  min-width: 100px;
  height: 82px;
  overflow: hidden;
  flex-shrink: 0;
}

.news-card-thumb img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  transition: transform 0.32s ease;
}

.news-card:hover .news-card-thumb img { transform: scale(1.05); }

.news-card-thumb-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: var(--n-surface);
  color: var(--n-subtle);
}

/* ── Card body ── */
.news-card-body {
  flex: 1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.news-card-title {
  font-size: 13px; font-weight: 600;
  color: var(--n-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-card-foot {
  display: flex; align-items: center;
  justify-content: space-between; gap: 6px;
  margin-top: 8px;
}

.news-card-date {
  display: flex; align-items: center; gap: 4px;
  font-size: 10.5px;
  color: var(--n-muted);
  font-family: 'JetBrains Mono', monospace;
}

/* ── Badge ── */
.news-card-badge {
  font-size: 10px; font-weight: 700;
  padding: 2px 8px; border-radius: 20px;
  flex-shrink: 0; letter-spacing: 0.02em;
  border: 0.5px solid transparent;
}

.news-card-badge.published {
  background: rgba(34,197,94,0.10); color: #15803d;
  border-color: rgba(34,197,94,0.20);
}
.dark .news-card-badge.published {
  background: rgba(34,197,94,0.12); color: #86efac;
  border-color: rgba(34,197,94,0.22);
}
.news-card-badge.draft {
  background: rgba(245,158,11,0.10); color: #b45309;
  border-color: rgba(245,158,11,0.20);
}
.dark .news-card-badge.draft {
  background: rgba(245,158,11,0.12); color: #fbbf24;
  border-color: rgba(245,158,11,0.22);
}

/* ── Scrollbar ── */
.news-page ::-webkit-scrollbar { width: 4px; height: 4px; }
.news-page ::-webkit-scrollbar-track { background: transparent; }
.news-page ::-webkit-scrollbar-thumb { background: rgba(79,110,247,0.18); border-radius: 99px; }
`
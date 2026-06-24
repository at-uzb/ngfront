import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Loader2, Search, X, Newspaper, AlertTriangle, Calendar, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import NewsModal from './NewsModal'

const fmtDate = (iso) => {
  if (!iso) return null
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return iso
  return `${match[3]}.${match[2]}.${match[1]}`
}

export default function News() {
  const { isAdmin } = useAuth()
  const navigate    = useNavigate()

  const [news,       setNews]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [query,      setQuery]      = useState('')
  const [activeSlug, setActiveSlug] = useState(null)
  const [deleting,   setDeleting]   = useState(null) // slug being deleted

  const searchRef = useRef(null)

  const fetchNews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query) params.set('search', query)
      const { data } = await api.get(`/news/news/?${params}`)
      setNews(data.results ?? [])
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

  const handleDelete = async (e, slug) => {
    e.stopPropagation()
    if (!window.confirm('Bu yangilikni o\'chirishni tasdiqlaysizmi?')) return
    setDeleting(slug)
    try {
      await api.delete(`/news/news/${slug}/`)
      setNews(prev => prev.filter(n => n.slug !== slug))
    } catch {
      alert('O\'chirishda xatolik yuz berdi')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="np">

        {/* ── Toolbar ── */}
        <div className="np-toolbar">
          <div className="np-search-wrap">
            <Search size={13} strokeWidth={1.8} className="np-search-ico" />
            <input
              ref={searchRef}
              className="np-search"
              type="text"
              placeholder="Yangilik qidirish…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button className="np-search-clear" onClick={() => { setQuery(''); searchRef.current?.focus() }}>
                <X size={10} />
              </button>
            )}
          </div>
          {isAdmin && (
            <button className="np-add-btn" onClick={() => navigate('/news/create/')}>
              <Plus size={14} strokeWidth={2.5} />
              <span className="np-btn-lbl">Qo'shish</span>
            </button>
          )}
        </div>

        {/* ── States ── */}
        {loading ? (
          <div className="np-state">
            <div className="np-spinner">
              <div className="np-spinner-ring" />
              <div className="np-spinner-ring np-spinner-ring--inner" />
            </div>
          </div>
        ) : error ? (
          <div className="np-state np-state--error">
            <AlertTriangle size={18} strokeWidth={1.5} />
            <p>{error}</p>
            <button className="np-retry-btn" onClick={fetchNews}>Qayta urinish</button>
          </div>
        ) : news.length === 0 ? (
          <div className="np-state">
            <div className="np-empty-icon"><Newspaper size={22} strokeWidth={1.2} /></div>
            <p>Yangiliklar topilmadi</p>
          </div>
        ) : (
          <div className="np-list">
            {news.map((item, i) => (
              <NewsCard
                key={item.id}
                item={item}
                index={i}
                isAdmin={isAdmin}
                deleting={deleting === item.slug}
                onOpen={() => setActiveSlug(item.slug)}
                onDelete={(e) => handleDelete(e, item.slug)}
              />
            ))}
          </div>
        )}

        <NewsModal slug={activeSlug} onClose={() => setActiveSlug(null)} />
      </div>
    </>
  )
}

function NewsCard({ item, index, isAdmin, deleting, onOpen, onDelete }) {
  return (
    <div
      className={`np-card${deleting ? ' np-card--deleting' : ''}`}
      style={{ animationDelay: `${index * 35}ms` }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onOpen()}
    >
      {/* Deleting overlay */}
      {deleting && (
        <div className="np-card-del-overlay">
          <Loader2 size={18} className="np-spin" />
          <span>O'chirilmoqda…</span>
        </div>
      )}

      {/* Thumb */}
      <div className="np-card-thumb">
        {item.thumbnail
          ? <img src={item.thumbnail} alt={item.title} loading="lazy" />
          : <div className="np-card-thumb-ph"><Newspaper size={18} strokeWidth={1.2} /></div>
        }
        {/* Status dot on thumb */}
        {item.status === 'draft' && <span className="np-draft-dot" title="Qoralama" />}
      </div>

      {/* Body */}
      <div className="np-card-body">
        <p className="np-card-title">{item.title}</p>
        <div className="np-card-meta">
          <span className="np-card-date">
            <Calendar size={9} strokeWidth={2} />
            {fmtDate(item.published_at) ?? '—'}
          </span>
          <span className={`np-card-badge np-card-badge--${item.status}`}>
            {item.status === 'published' ? 'Chop etilgan' : 'Qoralama'}
          </span>
        </div>
      </div>

      {/* Delete button — admin only, appears on hover */}
      {isAdmin && (
        <button
          className="np-card-del"
          onClick={onDelete}
          disabled={deleting}
          title="O'chirish"
        >
          {deleting
            ? <Loader2 size={13} className="np-spin" />
            : <Trash2 size={13} />
          }
        </button>
      )}
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Light tokens ── */
.light .np {
  --np-bg:         #ffffff;
  --np-surface:    #f4f5fe;
  --np-border:     rgba(103,104,238,0.13);
  --np-border-h:   rgba(103,104,238,0.30);
  --np-text:       #0f1117;
  --np-muted:      #7b8296;
  --np-subtle:     #b0b8cc;
  --np-hover:      rgba(103,104,238,0.05);
  --np-shadow-sm:  0 1px 3px rgba(103,104,238,0.07), 0 0 0 1px rgba(103,104,238,0.07);
  --np-shadow-md:  0 4px 18px rgba(103,104,238,0.11), 0 0 0 1px rgba(103,104,238,0.10);
  --np-error:      #ef4444;
  --np-error-bg:   rgba(239,68,68,0.07);
}

/* ── Dark tokens ── */
.dark .np {
  --np-bg:         #13162a;
  --np-surface:    #0f1122;
  --np-border:     rgba(131,132,243,0.14);
  --np-border-h:   rgba(131,132,243,0.32);
  --np-text:       #e4e7f5;
  --np-muted:      #4e5575;
  --np-subtle:     #2d3354;
  --np-hover:      rgba(103,104,238,0.09);
  --np-shadow-sm:  0 0 0 1px rgba(131,132,243,0.10);
  --np-shadow-md:  0 0 0 1px rgba(131,132,243,0.18), 0 6px 20px rgba(103,104,238,0.10);
  --np-error:      #fca5a5;
  --np-error-bg:   rgba(220,38,38,0.09);
}

/* ── Page ── */
.np {
  padding: 0 1rem 2rem;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--np-text);
  display: flex; flex-direction: column; gap: 12px;
}

/* ── Toolbar ── */
.np-toolbar {
  display: flex; align-items: center; gap: 8px;
}

/* ── Search ── */
.np-search-wrap {
  position: relative; flex: 1;
}

.np-search-ico {
  position: absolute; left: 11px; top: 50%;
  transform: translateY(-50%);
  color: var(--np-subtle); pointer-events: none;
}

.np-search {
  width: 100%; height: 36px;
  padding: 0 32px 0 32px;
  font-size: 13px; font-family: 'Inter', system-ui, sans-serif;
  color: var(--np-text); background: var(--np-bg);
  border: 1px solid #6768EE;
  border-radius: 10px; outline: none; box-sizing: border-box;
  transition: box-shadow 0.15s;
}

.np-search::placeholder { color: var(--np-subtle); }

.np-search:focus {
  box-shadow: 0 0 0 3px rgba(103,104,238,0.12);
}

.np-search-clear {
  position: absolute; right: 8px; top: 50%;
  transform: translateY(-50%);
  width: 17px; height: 17px; border-radius: 50%;
  border: none; background: rgba(103,104,238,0.12);
  color: var(--np-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 0; transition: background 0.12s;
}
.np-search-clear:hover { background: #6768EE; color: #fff; }

/* ── Add button ── */
.np-add-btn {
  display: flex; align-items: center; gap: 5px;
  height: 36px; padding: 0 16px;
  font-size: 13px; font-weight: 600;
  font-family: 'Inter', system-ui, sans-serif;
  color: #fff; background: #6768EE;
  border: none; border-radius: 10px; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(103,104,238,0.30);
  transition: background 0.15s, box-shadow 0.15s;
}
.np-add-btn:hover { background: #5556d4; box-shadow: 0 2px 8px rgba(103,104,238,0.40); }

@media (max-width: 640px) {
  .np-btn-lbl { display: none; }
  .np-add-btn { padding: 0; width: 36px; justify-content: center; }
}

/* ── States ── */
.np-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; padding: 5rem 1rem;
  color: var(--np-muted); font-size: 13px; text-align: center;
}
.np-state p { margin: 0; }
.np-state--error { color: var(--np-error); }
.np-state--error p { color: var(--np-error); }

.np-empty-icon {
  width: 52px; height: 52px; border-radius: 14px;
  background: rgba(103,104,238,0.08);
  border: 1px solid rgba(103,104,238,0.14);
  display: flex; align-items: center; justify-content: center;
  color: rgba(103,104,238,0.50);
}
.dark .np-empty-icon { background: rgba(103,104,238,0.12); border-color: rgba(131,132,243,0.18); }

.np-retry-btn {
  height: 28px; padding: 0 14px; border-radius: 7px;
  border: 1px solid rgba(239,68,68,0.22); background: transparent;
  color: var(--np-error); font-size: 12px; font-weight: 500;
  font-family: 'Inter', system-ui, sans-serif; cursor: pointer;
  transition: background 0.14s;
}
.np-retry-btn:hover { background: var(--np-error-bg); }

/* ── Spinner ── */
.np-spinner { position: relative; width: 36px; height: 36px; }
.np-spinner-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: #6768EE;
  animation: np-spin 0.9s linear infinite;
}
.np-spinner-ring--inner {
  inset: 8px;
  border-top-color: rgba(103,104,238,0.30);
  animation-duration: 0.6s;
  animation-direction: reverse;
}
@keyframes np-spin { to { transform: rotate(360deg); } }
@keyframes np-spin-sm { to { transform: rotate(360deg); } }
.np-spin { animation: np-spin-sm 0.75s linear infinite; display: inline-block; }

/* ── List ── */
.np-list {
  display: flex; flex-direction: column; gap: 8px;
}

/* ── Card ── */
.np-card {
  display: flex; align-items: stretch;
  background: var(--np-bg);
  border: 1px solid var(--np-border);
  border-left: 2px solid #6768EE;
  border-bottom: 2px solid #6768EE;
  border-radius: 12px;
  overflow: hidden; cursor: pointer;
  box-shadow: var(--np-shadow-sm);
  transition: border-color 0.15s, box-shadow 0.18s, transform 0.14s, opacity 0.2s;
  animation: np-card-in 0.22s ease both;
  outline: none;
  position: relative;
}

.np-card:hover {
  border-color: var(--np-border-h);
  border-left-color: #6768EE;
  border-bottom-color: #6768EE;
  box-shadow: var(--np-shadow-md);
  transform: translateY(-1px);
}

.np-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(103,104,238,0.15);
}

.np-card--deleting {
  pointer-events: none;
  position: relative;
}

/* Red overlay while deleting */
.np-card-del-overlay {
  position: absolute; inset: 0; z-index: 10;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: rgba(239,68,68,0.10);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  border-radius: 11px;
  color: #ef4444;
  font-size: 12.5px; font-weight: 600;
  animation: np-card-in 0.15s ease;
}

.dark .np-card-del-overlay {
  background: rgba(239,68,68,0.14);
  color: #fca5a5;
}

@keyframes np-card-in {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Thumb ── */
.np-card-thumb {
  width: 90px; min-width: 90px; height: 76px;
  overflow: hidden; flex-shrink: 0;
  position: relative;
}

.np-card-thumb img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: transform 0.32s ease;
}
.np-card:hover .np-card-thumb img { transform: scale(1.06); }

.np-card-thumb-ph {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: var(--np-surface); color: var(--np-subtle);
}

/* Draft dot on thumb */
.np-draft-dot {
  position: absolute; top: 5px; left: 5px;
  width: 7px; height: 7px; border-radius: 50%;
  background: #f59e0b;
  border: 1.5px solid rgba(255,255,255,0.9);
}

/* ── Card body ── */
.np-card-body {
  flex: 1; min-width: 0;
  padding: 10px 12px;
  display: flex; flex-direction: column;
  justify-content: space-between;
}

.np-card-title {
  font-size: 13px; font-weight: 600;
  color: var(--np-text); line-height: 1.4; margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.np-card-meta {
  display: flex; align-items: center;
  justify-content: space-between; gap: 6px;
  margin-top: 6px;
}

.np-card-date {
  display: flex; align-items: center; gap: 3px;
  font-size: 10px; color: var(--np-muted);
  font-family: 'JetBrains Mono', monospace;
}

/* ── Badge ── */
.np-card-badge {
  font-size: 9.5px; font-weight: 700;
  padding: 2px 7px; border-radius: 20px;
  letter-spacing: 0.03em;
  border: 0.5px solid transparent; white-space: nowrap;
}

.np-card-badge--published {
  background: rgba(34,197,94,0.10); color: #15803d;
  border-color: rgba(34,197,94,0.20);
}
.dark .np-card-badge--published {
  background: rgba(34,197,94,0.12); color: #86efac;
  border-color: rgba(34,197,94,0.22);
}
.np-card-badge--draft {
  background: rgba(245,158,11,0.10); color: #b45309;
  border-color: rgba(245,158,11,0.20);
}
.dark .np-card-badge--draft {
  background: rgba(245,158,11,0.12); color: #fbbf24;
  border-color: rgba(245,158,11,0.22);
}

/* ── Delete button ── */
.np-card-del {
  width: 34px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: transparent;
  border: none; border-left: 1px solid var(--np-border);
  color: var(--np-subtle);
  cursor: pointer; padding: 0;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}
.np-card:hover .np-card-del { opacity: 1; }
.np-card-del:hover { background: rgba(239,68,68,0.07); color: #ef4444; }
.dark .np-card-del:hover { background: rgba(239,68,68,0.10); color: #fca5a5; }

/* ── Scrollbar ── */
.np ::-webkit-scrollbar { width: 4px; }
.np ::-webkit-scrollbar-track { background: transparent; }
.np ::-webkit-scrollbar-thumb { background: rgba(103,104,238,0.18); border-radius: 99px; }
`
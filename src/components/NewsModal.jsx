import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertTriangle, Calendar, ChevronLeft, X } from 'lucide-react'
import api from '../lib/api'
import '../assets/NewsModal.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDateLong = (iso) => {
  if (!iso) return null
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return iso
  const months = [
    'yanvar','fevral','mart','aprel','may','iyun',
    'iyul','avgust','sentabr','oktabr','noyabr','dekabr'
  ]
  const [, y, m, d] = match
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

// ── NewsModal ─────────────────────────────────────────────────────────────────

export default function NewsModal({ slug, onClose }) {
  const [detail,  setDetail]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const isOpen = Boolean(slug)

  // ── Fetch detail when slug changes ─────────────────────────────────────────

  const fetchDetail = useCallback(async () => {
    if (!slug) return
    setDetail(null)
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.get(`/news/news/${slug}/`)
      console.log(data)
      setDetail(data)
    } catch {
      setError('Yangilik yuklanmadi')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // ── Escape key ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // ── Body scroll lock ───────────────────────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="nm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="nm-modal" role="dialog" aria-modal="true">

        {/* Topbar */}
        <div className="nm-topbar">
          <button className="nm-back" onClick={onClose}>
            <ChevronLeft size={15} strokeWidth={2} />
            <span>Orqaga</span>
          </button>
          <button className="nm-close" onClick={onClose} aria-label="Yopish">
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="nm-state">
            <Loader2 size={18} strokeWidth={1.5} className="nm-spin" />
          </div>
        ) : error ? (
          <div className="nm-state nm-state--error">
            <AlertTriangle size={16} strokeWidth={1.5} />
            <p>{error}</p>
            <button className="nm-retry" onClick={fetchDetail}>Qayta urinish</button>
          </div>
        ) : detail ? (
          <>
            {detail.thumbnail && (
              <img className="nm-thumb" src={detail.thumbnail} alt={detail.title} />
            )}
            <div className="nm-content">
              <h1 className="nm-title">{detail.title}</h1>
              <div className="nm-meta">
                <span className="nm-date">
                  <Calendar size={11} strokeWidth={1.8} />
                  {fmtDateLong(detail.published_at)}
                </span>
                <span className={`nm-status ${detail.status}`}>
                  {detail.status === 'published' ? 'Chop etilgan' : 'Qoralama'}
                </span>
              </div>
              <p className="nm-text">{detail.content}</p>
            </div>
          </>
        ) : null}

      </div>
    </div>
  )
}
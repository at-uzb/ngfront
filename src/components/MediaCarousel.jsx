import { useState, useRef, useEffect } from 'react'
import { Plus, FileText, Loader, ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from 'lucide-react'
import '../assets/MediaCarousel.css'

// ── Video tile with inline controls ───────────────────────
function VideoTile({ file, active }) {
  const videoRef               = useRef(null)
  const [playing, setPlaying]  = useState(false)
  const [muted,   setMuted]    = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!active && videoRef.current) {
      videoRef.current.pause()
      setPlaying(false)
    }
  }, [active])

  const toggle = (e) => {
    e.stopPropagation()
    const v = videoRef.current; if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else { v.play().then(() => setPlaying(true)).catch(() => {}) }
  }

  const toggleMute = (e) => {
    e.stopPropagation()
    if (!videoRef.current) return
    videoRef.current.muted = !muted
    setMuted(m => !m)
  }

  const seek = (e) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    if (videoRef.current)
      videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration
  }

  return (
    <div className="mc-video-wrap" onClick={toggle}>
      <video
        ref={videoRef}
        src={file.media_url}
        className="mc-video"
        muted={muted}
        playsInline
        preload="metadata"
        onTimeUpdate={() => {
          const v = videoRef.current
          if (v?.duration) setProgress(v.currentTime / v.duration)
        }}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <div className="mc-play-overlay">
          <Play size={20} fill="white" strokeWidth={0} />
        </div>
      )}
      <div className="mc-vid-bar" onClick={e => e.stopPropagation()}>
        <div className="mc-vid-progress" onClick={seek}>
          <div className="mc-vid-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <button className="mc-vid-mute" onClick={toggleMute}>
          {muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
const VISIBLE = 3

export default function MediaCarousel({ files, onOpen, onUpload, canUpload, uploading }) {
  const [offset,   setOffset]   = useState(0)
  const [dragX,    setDragX]    = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX  = useRef(0)
  const fileRef = useRef(null)

  const total   = files?.length ?? 0
  const canPrev = offset > 0
  const canNext = offset + VISIBLE < total

  const go = (dir) =>
    setOffset(o => Math.max(0, Math.min(o + dir, Math.max(0, total - VISIBLE))))

  const onPointerDown = (e) => {
    startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    setDragging(true); setDragX(0)
  }
  const onPointerMove = (e) => {
    if (!dragging) return
    setDragX((e.clientX ?? e.touches?.[0]?.clientX ?? 0) - startX.current)
  }
  const onPointerUp = () => {
    if (Math.abs(dragX) > 50) go(dragX < 0 ? 1 : -1)
    setDragging(false); setDragX(0)
  }

  if (!total && !canUpload) return null

  // pad to always show VISIBLE slots
  const slots = [...(files ?? []).slice(offset, offset + VISIBLE)]
  while (slots.length < VISIBLE) slots.push(null)

  return (
    <div className="mc-root">
      {/* ── 3-item strip ── */}
      <div
        className={`mc-strip${dragging ? ' dragging' : ''}`}
        style={{ transform: `translateX(${dragX * 0.25}px)` }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        {slots.map((f, i) => {
          const absIdx = offset + i
          return (
            <div key={f?.id ?? `pad-${i}`} className="mc-item">
              {!f ? (
                <div className="mc-item-pad" />
              ) : f.media_type === 'image' ? (
                <img
                  src={f.media_url}
                  alt={f.description ?? `Rasm ${absIdx + 1}`}
                  className="mc-item-img"
                  draggable={false}
                  onClick={() => Math.abs(dragX) < 5 && onOpen?.({ url: f.media_url, type: 'image' })}
                />
              ) : f.media_type === 'video' ? (
                <VideoTile file={f} active />
              ) : (
                <div className="mc-item-file" onClick={() => onOpen?.({ url: f.media_url, type: f.media_type })}>
                  <FileText size={22} strokeWidth={1.2} />
                  <span>{f.description || `Fayl ${absIdx + 1}`}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── arrows ── */}
      {canPrev && (
        <button className="mc-arrow left" onClick={() => go(-1)}>
          <ChevronLeft size={14} />
        </button>
      )}
      {canNext && (
        <button className="mc-arrow right" onClick={() => go(1)}>
          <ChevronRight size={14} />
        </button>
      )}

      {/* ── top-right pill ── */}
      <div className="mc-topbar">
        {total > VISIBLE && (
          <span className="mc-counter">
            {offset + 1}–{Math.min(offset + VISIBLE, total)}/{total}
          </span>
        )}
        {canUpload && (
          <>
            <button className="mc-upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader size={10} className="mc-spin" /> : <><Plus size={10} /> Fayl</>}
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx"
              style={{ display: 'none' }} onChange={onUpload} />
          </>
        )}
      </div>

      {/* ── dots ── */}
      {total > VISIBLE && (
        <div className="mc-dots">
          {Array.from({ length: total - VISIBLE + 1 }).map((_, i) => (
            <button key={i} className={`mc-dot${i === offset ? ' active' : ''}`} onClick={() => setOffset(i)} />
          ))}
        </div>
      )}
    </div>
  )
}
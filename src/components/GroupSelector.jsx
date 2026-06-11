import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Users, AlertCircle, Loader2, LayoutGrid } from 'lucide-react'
import { useGroupStore, ALL_GROUP } from '../hooks/useGroupStore'

// Derive a readable text color from any bg color (hex, named, or fallback)
function getContrastColor(bgColor) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return lum > 128 ? '#1e293b' : '#ffffff'
  } catch {
    return '#ffffff'
  }
}

const FALLBACK_COLORS = [
  '#6768EE', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

const _colorCache = new Map()
function isValidColor(raw) {
  if (_colorCache.has(raw)) return _colorCache.get(raw)
  try {
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillStyle = raw
    const resolved = ctx.fillStyle
    const isBlack = ['black', '#000', '#000000'].includes(raw.toLowerCase())
    const valid = isBlack || resolved !== '#000000'
    _colorCache.set(raw, valid)
    return valid
  } catch {
    return false
  }
}

function resolveColor(group, index) {
  const raw = (group.color ?? '').trim()
  if (raw && isValidColor(raw)) return raw
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

function initials(group) {
  if (group.short_name) return group.short_name.slice(0, 2).toUpperCase()
  return group.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function GroupSelector() {
  const { groups, selectedId, selectedGroup, loading, error, setSelectedId } = useGroupStore()

  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return
    listRef.current?.children[focusedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex, isOpen])

  useEffect(() => {
    if (isOpen) {
      const idx = groups.findIndex((g) => g.id === selectedId)
      setFocusedIndex(idx >= 0 ? idx : 0)
    }
  }, [isOpen, selectedId, groups])

  const handleSelect = useCallback((id) => {
    setSelectedId(id)
    setIsOpen(false)
  }, [setSelectedId])

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, groups.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0) handleSelect(groups[focusedIndex].id)
        break
      case 'Escape':
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  const listId = 'group-selector-list'

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="group-selector group-selector--loading" aria-busy="true">
          <Loader2 size={15} className="group-selector__spinner" aria-hidden="true" />
          <span className="group-selector__loading-text">Yuklanmoqda…</span>
        </div>
      </>
    )
  }

  if (error || groups.length === 0) {
    return (
      <>
        <style>{CSS}</style>
        <div className="group-selector group-selector--error" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{error ?? 'Guruhlar topilmadi'}</span>
        </div>
      </>
    )
  }

  if (groups.length === 1) {
    const color = resolveColor(groups[0], 0)
    const contrast = getContrastColor(color)
    return (
      <>
        <style>{CSS}</style>
        <div className="group-selector">
          <div
            className="group-selector__trigger"
            style={{ '--group-color': color, cursor: 'default' }}
          >
            <span
              className="group-selector__avatar"
              style={{ background: color, color: contrast }}
              aria-hidden="true"
            >
              {initials(groups[0])}
            </span>
            <span className="group-selector__info">
              <span className="group-selector__name">{groups[0].name}</span>
              {groups[0].admin_count !== null && (
                <span className="group-selector__meta">{groups[0].admin_count} admin</span>
              )}
            </span>
          </div>
        </div>
      </>
    )
  }

  const selColor = selectedGroup
    ? resolveColor(selectedGroup, groups.findIndex((g) => g.id === selectedGroup.id))
    : '#6768EE'
  const selContrast = getContrastColor(selColor)

  return (
    <>
      <style>{CSS}</style>
      <div className="group-selector" ref={containerRef}>
        <button
          className="group-selector__trigger"
          onClick={() => setIsOpen((p) => !p)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={
            isOpen && focusedIndex >= 0 ? `gs-opt-${groups[focusedIndex]?.id}` : undefined
          }
          aria-label={selectedGroup ? `Tanlangan guruh: ${selectedGroup.name}` : 'Guruh tanlang'}
          style={{ '--group-color': selColor }}
        >
          <span
            className="group-selector__avatar"
            style={{ background: selColor, color: selContrast }}
            aria-hidden="true"
          >
            {selectedGroup?.id === 'ALL'
              ? <LayoutGrid size={14} />
              : selectedGroup ? initials(selectedGroup) : <Users size={13} />}
          </span>

          <span className="group-selector__info">
            <span className="group-selector__name">
              {selectedGroup?.name ?? 'Guruh tanlang'}
            </span>
            {selectedGroup && selectedGroup.admin_count !== null && (
              <span className="group-selector__meta">
                {selectedGroup.admin_count} admin
              </span>
            )}
          </span>

          <ChevronDown
            className={`group-selector__chevron${isOpen ? ' open' : ''}`}
            size={15}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <ul
            id={listId}
            className="group-selector__dropdown"
            role="listbox"
            ref={listRef}
            onKeyDown={handleKeyDown}
            aria-label="Guruhlar ro'yxati"
          >
            {groups.map((group, index) => {
              const color = resolveColor(group, index)
              const contrast = getContrastColor(color)
              const isSelected = group.id === selectedId
              const isFocused = index === focusedIndex
              return (
                <li
                  key={group.id}
                  id={`gs-opt-${group.id}`}
                  className={[
                    'group-selector__option',
                    isSelected ? 'selected' : '',
                    isFocused ? 'focused' : '',
                  ].join(' ').trim()}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(group.id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <span
                    className="group-selector__option-avatar"
                    style={{ background: color, color: contrast }}
                    aria-hidden="true"
                  >
                    {group.id === 'ALL' ? <LayoutGrid size={13} /> : initials(group)}
                  </span>
                  <span className="group-selector__option-body">
                    <span className="group-selector__option-name">{group.name}</span>
                    <span className="group-selector__option-sub">
                      {group.id !== 'ALL' && (
                        <span
                          className="group-selector__option-badge"
                          style={{
                            background: color + '22',
                            color,
                            border: `0.5px solid ${color}44`,
                          }}
                        >
                          {group.short_name}
                        </span>
                      )}
                      {group.admin_count !== null && (
                        <span className="group-selector__option-admins">
                          {group.admin_count} admin
                        </span>
                      )}
                    </span>
                  </span>
                  {isSelected && (
                    <span className="group-selector__check" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CSS = `
/* ── Light tokens ── */
.light .group-selector {
  --gs-bg:          #ffffff;
  --gs-bg-2:        #f4f6fb;
  --gs-border:      rgba(103,104,238,0.12);
  --gs-border-h:    rgba(103,104,238,0.28);
  --gs-hover-bg:    #eff0fe;
  --gs-text:        #0f1117;
  --gs-text-muted:  #7b8296;
  --gs-shadow:      0 1px 2px rgba(103,104,238,0.06), 0 0 0 1px rgba(103,104,238,0.07);
  --gs-drop-shadow: 0 8px 32px rgba(103,104,238,0.13), 0 0 0 1px rgba(103,104,238,0.10);
  --gs-scrollbar:   rgba(103,104,238,0.18);
  --gs-error-bg:    #fff1f2;
  --gs-error-border:#fecaca;
  --gs-error-text:  #dc2626;
}

/* ── Dark tokens ── */
.dark .group-selector {
  --gs-bg:          #13162a;
  --gs-bg-2:        #0f1122;
  --gs-border:      rgba(131,132,243,0.14);
  --gs-border-h:    rgba(131,132,243,0.30);
  --gs-hover-bg:    rgba(103,104,238,0.10);
  --gs-text:        #e4e7f5;
  --gs-text-muted:  #4e5575;
  --gs-shadow:      0 0 0 1px rgba(131,132,243,0.10);
  --gs-drop-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(131,132,243,0.16);
  --gs-scrollbar:   rgba(131,132,243,0.20);
  --gs-error-bg:    rgba(220,38,38,0.08);
  --gs-error-border:rgba(220,38,38,0.22);
  --gs-error-text:  #fca5a5;
}

/* ── Root ── */
.group-selector {
  position: relative;
  width: 100%;
  min-width: 0;
  font-family: 'Inter', sans-serif;
}

/* ── Trigger ── */
.group-selector__trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 3px 10px 3px 3px;
  background: var(--gs-bg);
  border: 1px solid var(--gs-border);
  border-top: 2px solid #6768EE;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
  box-shadow: var(--gs-shadow);
  min-width: 0;
  box-sizing: border-box;
}

.group-selector__trigger:hover {
  border-color: rgba(103,104,238,0.35);
  border-top-color: #6768EE;
  background: var(--gs-hover-bg);
  box-shadow: 0 0 0 3px rgba(103,104,238,0.07);
}

.group-selector__trigger:focus-visible {
  border-color: #6768EE;
  box-shadow: 0 0 0 3px rgba(103,104,238,0.15);
  outline: none;
}

/* ── Avatar ── */
.group-selector__avatar {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: filter 0.15s;
}

.group-selector__trigger:hover .group-selector__avatar {
  filter: brightness(1.08);
}

/* ── Text block ── */
.group-selector__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.group-selector__name {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--gs-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.group-selector__meta {
  font-size: 0.7rem;
  color: var(--gs-text-muted);
  line-height: 1;
}

/* ── Chevron ── */
.group-selector__chevron {
  flex-shrink: 0;
  color: var(--gs-text-muted);
  transition: transform 0.2s;
}
.group-selector__chevron.open { transform: rotate(180deg); }

/* ── Loading / error ── */
.group-selector--loading,
.group-selector--error {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border: 1px solid var(--gs-border);
  border-radius: 12px;
  font-size: 0.82rem;
}

.group-selector--loading {
  color: var(--gs-text-muted);
  background: var(--gs-bg);
}

.group-selector--error {
  color: var(--gs-error-text);
  border-color: var(--gs-error-border);
  background: var(--gs-error-bg);
}

@keyframes gs-spin { to { transform: rotate(360deg); } }
.group-selector__loading-text { font-size: 0.82rem; }

/* ── Dropdown ── */
.group-selector__dropdown {
  position: absolute;
  top: calc(100% + 7px);
  left: 0; right: 0;
  z-index: 200;
  background: var(--gs-bg);
  border: 1px solid var(--gs-border);
  border-radius: 14px;
  box-shadow: var(--gs-drop-shadow);
  max-height: 340px;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 5px;
  -webkit-overflow-scrolling: touch;
  animation: gs-appear 0.14s ease;
  scrollbar-width: thin;
  scrollbar-color: var(--gs-scrollbar) transparent;
}

.group-selector__dropdown::-webkit-scrollbar { width: 4px; }
.group-selector__dropdown::-webkit-scrollbar-track { background: transparent; }
.group-selector__dropdown::-webkit-scrollbar-thumb {
  background: var(--gs-scrollbar);
  border-radius: 4px;
}

@keyframes gs-appear {
  from { opacity: 0; transform: translateY(-5px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}

/* ── Option ── */
.group-selector__option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 9px;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
  border: 0.5px solid transparent;
}

.group-selector__option:hover,
.group-selector__option.focused {
  background: var(--gs-hover-bg);
}

.group-selector__option.selected {
  background: var(--gs-hover-bg);
  border-color: var(--gs-border-h);
}

.group-selector__option.selected .group-selector__option-name {
  color: #6768EE;
  font-weight: 600;
}

.dark .group-selector__option.selected .group-selector__option-name {
  color: #a5b4fc;
}

/* ── Option avatar ── */
.group-selector__option-avatar {
  flex-shrink: 0;
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

/* ── Option body ── */
.group-selector__option-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.group-selector__option-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--gs-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.group-selector__option-sub {
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-selector__option-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.group-selector__option-admins {
  font-size: 0.67rem;
  color: var(--gs-text-muted);
}

/* ── Checkmark ── */
.group-selector__check {
  flex-shrink: 0;
  color: #6768EE;
  display: flex;
  align-items: center;
}

.dark .group-selector__check {
  color: #a5b4fc;
}

/* ── Loading spinner brand color ── */
.group-selector__spinner {
  animation: gs-spin 0.8s linear infinite;
  color: #6768EE;
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .group-selector__dropdown { animation: none; }
  .group-selector__chevron  { transition: none; }
  .group-selector__trigger  { transition: none; }
  .group-selector__spinner  { animation: none; }
}

/* ── Mobile ── */
@media (max-width: 600px) {
  .group-selector__trigger { padding: 5px 8px 5px 5px; }
  .group-selector__name    { font-size: 0.78rem; }
  .group-selector__dropdown {
    max-height: 270px;
    left: -8px; right: -8px;
  }
  .group-selector__option-name { font-size: 0.76rem; }
}
`
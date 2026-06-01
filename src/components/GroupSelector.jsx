import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Users, AlertCircle, Loader2, LayoutGrid } from 'lucide-react'
import { useGroupStore, ALL_GROUP } from '../hooks/useGroupStore'
import '../assets/GroupSelector.css'

// Derive a readable text color from any bg color (hex, named, or fallback)
function getContrastColor(bgColor) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    // WCAG luminance
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return lum > 128 ? '#1e293b' : '#ffffff'
  } catch {
    return '#ffffff'
  }
}

// Consistent color per group id (fallback when color is invalid/missing)
const FALLBACK_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

// Validate any CSS color string (hex, rgb, named, etc.) using canvas
const _colorCache = new Map()
function isValidColor(raw) {
  if (_colorCache.has(raw)) return _colorCache.get(raw)
  try {
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillStyle = raw
    const resolved = ctx.fillStyle
    // If canvas parsed it to something other than black, it's valid
    // Special-case actual black values so they aren't rejected
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

// Two-letter initials from short_name or name
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

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  // Scroll focused item into view
  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return
    listRef.current?.children[focusedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex, isOpen])

  // Restore focused index when opening
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

  // ── Loading state
  if (loading) {
    return (
      <div className="group-selector group-selector--loading" aria-busy="true">
        <Loader2 size={15} className="group-selector__spinner" aria-hidden="true" />
        <span className="group-selector__loading-text">Yuklanmoqda…</span>
      </div>
    )
  }

  // ── Error state
  if (error || groups.length === 0) {
    return (
      <div className="group-selector group-selector--error" role="alert">
        <AlertCircle size={15} aria-hidden="true" />
        <span>{error ?? 'Guruhlar topilmadi'}</span>
      </div>
    )
  }

  // ── Single group: static display, no dropdown, no chevron
  if (groups.length === 1) {
    const color = resolveColor(groups[0], 0)
    const contrast = getContrastColor(color)
    return (
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
    )
  }

  const selColor = selectedGroup
    ? resolveColor(selectedGroup, groups.findIndex((g) => g.id === selectedGroup.id))
    : '#6366f1'
  const selContrast = getContrastColor(selColor)

  return (
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
        {/* Avatar pill */}
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
  )
}
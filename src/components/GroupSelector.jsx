import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { GROUP_MAPPING } from '../constants/groups'
import '../assets/GroupSelector.css'

const CODES = Object.keys(GROUP_MAPPING)

const GroupSelector = ({ selectedGroup, onGroupChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const current = GROUP_MAPPING[selectedGroup]

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [])

  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return
    const item = listRef.current?.children[focusedIndex]
    item?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex, isOpen])

  useEffect(() => {
    if (isOpen) setFocusedIndex(CODES.indexOf(selectedGroup))
  }, [isOpen, selectedGroup])

  const handleSelect = useCallback((code) => {
    onGroupChange(code)
    setIsOpen(false)
  }, [onGroupChange])

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, CODES.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0) handleSelect(CODES[focusedIndex])
        break
      case 'Escape':
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  const listId = 'group-selector-list'

  return (
    <div className="group-selector" ref={containerRef}>
      <button
        className="group-selector__trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={
          isOpen && focusedIndex >= 0 ? `gs-opt-${CODES[focusedIndex]}` : undefined
        }
        style={{ '--group-color': current.color }}
      >
        <span className="group-selector__icon">{current.icon}</span>
        <span className="group-selector__code" style={{ backgroundColor: current.color }}>
          {current.name}
        </span>
        <span className="group-selector__display-name">{current.displayName}</span>

        {/* Lucide chevron — replaces the ▾ character */}
        <ChevronDown
          className={`group-selector__chevron${isOpen ? ' open' : ''}`}
          size={16}
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
        >
          {CODES.map((code, index) => {
            const group = GROUP_MAPPING[code]
            const isSelected = selectedGroup === code
            return (
              <li
                key={code}
                id={`gs-opt-${code}`}
                className={`group-selector__option${isSelected ? ' selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(code)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <span className="group-selector__option-icon">{group.icon}</span>
                <span
                  className="group-selector__option-code"
                  style={{ backgroundColor: group.color }}
                >
                  {group.name}
                </span>
                <span className="group-selector__option-label">{group.displayName}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default GroupSelector
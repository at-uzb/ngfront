  import { useState, useRef, useEffect } from 'react'
  import { GROUP_MAPPING } from '../constants/groups'
  import '../assets/GroupSelector.css'

  const GroupSelector = ({ selectedGroup, onGroupChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)
    const current = GROUP_MAPPING[selectedGroup]

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          setIsOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (code) => {
      onGroupChange(code)
      setIsOpen(false)
    }

    return (
      <div className="group-selector" ref={dropdownRef}>
        {/* Trigger row: code badge + display name + chevron — all on one line */}
        <button
          className="group-selector__trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          style={{ '--group-color': current.color }}
        >
          <span className="group-selector__icon">{current.icon}</span>
          <span className="group-selector__code" style={{ backgroundColor: current.color }}>
            {current.name}
          </span>
          <span className="group-selector__display-name">{current.displayName}</span>
          <span className={`group-selector__chevron ${isOpen ? 'open' : ''}`}>▾</span>
        </button>

        {/* Dropdown list */}
        {isOpen && (
          <ul className="group-selector__dropdown" role="listbox">
            {Object.entries(GROUP_MAPPING).map(([code, group]) => (
              <li
                key={code}
                className={`group-selector__option ${selectedGroup === code ? 'selected' : ''}`}
                role="option"
                aria-selected={selectedGroup === code}
                onClick={() => handleSelect(code)}
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
            ))}
          </ul>
        )}
      </div>
    )
  }

  export default GroupSelector

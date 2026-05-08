import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const STORAGE_KEY = 'selectedGroupId'

// Sentinel entry that represents "all groups"
export const ALL_GROUP = {
  id:          'ALL',
  short_name:  'ALL',
  name:        'Barcha xizmatlar',
  color:       '#6366f1',
  admin_count: null,
}

// Module-level subscribers so all hook instances share one state
let _groups = []
let _selectedId = 'ALL'
let _loading = true
let _error = null
let _fetched = false
const _listeners = new Set()

function notify() {
  _listeners.forEach((fn) => fn())
}

async function fetchGroups() {
  if (_fetched) return
  _fetched = true

  try {
    const res = await api.get('/groups/list/')

    // ALL_GROUP always sits at the top
    _groups = [ALL_GROUP, ...(res.data.results ?? [])]

    const stored = localStorage.getItem(STORAGE_KEY)
    const valid = _groups.find((g) => String(g.id) === String(stored))

    // Default to ALL if nothing valid is stored
    _selectedId = valid ? valid.id : 'ALL'

    _loading = false
  } catch (err) {
    _error = err.response?.data?.detail || err.message
    _loading = false
  }

  notify()
}

fetchGroups()

export function useGroupStore() {
  const [, rerender] = useState(0)

  useEffect(() => {
    const update = () => rerender((n) => n + 1)
    _listeners.add(update)
    return () => _listeners.delete(update)
  }, [])

  const setSelectedId = useCallback((id) => {
    _selectedId = id
    localStorage.setItem(STORAGE_KEY, String(id))
    notify()
  }, [])

  const selectedGroup = _groups.find((g) => String(g.id) === String(_selectedId)) ?? ALL_GROUP

  return {
    groups: _groups,
    selectedId: _selectedId,
    selectedGroup,
    loading: _loading,
    error: _error,
    setSelectedId,
  }
}
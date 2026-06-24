import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const STORAGE_KEY = 'selectedGroupId'

export const ALL_GROUP = {
  id:          'ALL',
  short_name:  'ALL',
  name:        'Barcha xizmatlar',
  color:       '#6366f1',
  admin_count: null,
}

let _groups = []
let _selectedId = 'ALL'
let _loading = false
let _error = null
let _fetched = false
const _listeners = new Set()

function notify() {
  _listeners.forEach((fn) => fn())
}

async function fetchGroups() {
  if (_fetched) return
  _fetched = true
  _loading = true
  _error = null
  notify()

  try {
    const res = await api.get('/groups/list/')
    const results = res.data.results ?? []

    if (results.length === 1) {
      _groups = results
      _selectedId = results[0].id
    } else {
      _groups = [ALL_GROUP, ...results]
      const stored = localStorage.getItem(STORAGE_KEY)
      const valid = _groups.find((g) => String(g.id) === String(stored))
      _selectedId = valid ? valid.id : 'ALL'
    }

    _loading = false
  } catch (err) {
    if (err.response?.status === 401) {
      _fetched = false // allow retry after re-login
    }
    _error = err.response?.data?.detail || err.message
    _loading = false
  }

  notify()
}

// Call this once after login sets the token on your api instance
export function initGroupStore() {
  _fetched = false
  _groups = []
  _selectedId = 'ALL'
  _loading = false
  _error = null
  notify()
  fetchGroups()
}

export function useGroupStore() {
  const [, rerender] = useState(0)

  useEffect(() => {
    const update = () => rerender((n) => n + 1)
    _listeners.add(update)

    // If not yet fetched (first mount after login), kick off fetch
    if (!_fetched) {
      fetchGroups()
    }

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
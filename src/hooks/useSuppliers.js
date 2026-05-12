// ─── src/hooks/useSuppliers.js ────────────────────────────────────────────────
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'cma_suppliers'

function loadSuppliers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error('Error loading suppliers:', e)
  }
  return []
}

function saveSuppliers(suppliers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers))
  } catch (e) {
    console.error('Error saving suppliers:', e)
  }
}

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSuppliers(loadSuppliers())
    setLoading(false)
  }, [])

  const loadSuppliers = () => {
    const data = loadSuppliers()
    setSuppliers(data)
    return data
  }

  const addSupplier = async (supplier) => {
    const newSupplier = {
      id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...supplier,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setSuppliers(prev => {
      const updated = [...prev, newSupplier]
      saveSuppliers(updated)
      return updated
    })

    return { data: newSupplier, error: null }
  }

  const updateSupplier = async (id, updates) => {
    setSuppliers(prev => {
      const updated = prev.map(s =>
        s.id === id
          ? { ...s, ...updates, updated_at: new Date().toISOString() }
          : s
      )
      saveSuppliers(updated)
      return updated
    })

    return { error: null }
  }

  const removeSupplier = async (id) => {
    setSuppliers(prev => {
      const updated = prev.filter(s => s.id !== id)
      saveSuppliers(updated)
      return updated
    })

    return { error: null }
  }

  return {
    suppliers,
    loading,
    loadSuppliers,
    addSupplier,
    updateSupplier,
    removeSupplier,
  }
}

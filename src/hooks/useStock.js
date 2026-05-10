import { useState, useEffect } from 'react'

const STORAGE_KEY = 'cma_inventory_items'
const VERSION_KEY = 'cma_data_version'
const CURRENT_VERSION = '2'

// Fresh start: purana testing data clear karo
function migrateIfNeeded() {
  const version = localStorage.getItem(VERSION_KEY)
  if (version !== CURRENT_VERSION) {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION)
  }
}

function loadItems() {
  migrateIfNeeded()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {}
  return []  // Fresh start — koi demo data nahi
}

function saveItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {}
}

export const useStock = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setItems(loadItems())
    setLoading(false)
  }, [])

  const addItems = async (newItems) => {
    const rows = newItems.map((item, i) => ({
      id: `${Date.now()}-${i}`,
      medicine_name: item.medicine_name || item.name || 'Unknown',
      batch_no: item.batch_no || null,
      expiry_date: item.expiry_date || null,
      quantity: parseInt(item.qty) || parseInt(item.quantity) || 0,
      unit_price: parseFloat(item.mrp) || parseFloat(item.unit_price) || 0,
      source: item.source || 'ai_scan',
      low_stock_threshold: item.low_stock_threshold || 100,
      created_at: new Date().toISOString(),
    }))
    setItems(prev => {
      const updated = [...prev, ...rows]
      saveItems(updated)
      return updated
    })
    return { data: rows, error: null }
  }

  const updateItem = async (id, updates) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, ...updates } : i)
      saveItems(updated)
      return updated
    })
    return { data: null, error: null }
  }

  const removeItem = async (id) => {
    setItems(prev => {
      const updated = prev.filter(i => i.id !== id)
      saveItems(updated)
      return updated
    })
    return { error: null }
  }

  const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEY)
    setItems([])
  }

  return { items, loading, addItems, updateItem, removeItem, clearAllData }
}

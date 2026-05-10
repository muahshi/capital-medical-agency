import { useState, useEffect } from 'react'

const STORAGE_KEY = 'cma_inventory_items'
const VERSION_KEY = 'cma_data_version'
const CURRENT_VERSION = '3'

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
  return []
}

function saveItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {}
}

// Normalize name for duplicate matching: lowercase + remove spaces/punctuation
function normalizeName(name = '') {
  return name.toLowerCase().replace(/[\s\-_.]/g, '').trim()
}

export const useStock = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setItems(loadItems())
    setLoading(false)
  }, [])

  const addItems = async (newItems) => {
    let addedCount = 0
    let updatedCount = 0

    setItems(prev => {
      const updated = [...prev]

      newItems.forEach((item) => {
        const incomingName = normalizeName(item.medicine_name || item.name)
        const incomingBatch = (item.batch_no || '').trim().toLowerCase()
        const incomingQty = parseInt(item.qty) || parseInt(item.quantity) || 0

        // Duplicate check: same medicine name + same batch number
        const dupIndex = updated.findIndex(existing => {
          const sameName = normalizeName(existing.medicine_name) === incomingName
          const sameBatch = incomingBatch
            ? (existing.batch_no || '').trim().toLowerCase() === incomingBatch
            : true
          return sameName && sameBatch
        })

        if (dupIndex !== -1) {
          // Duplicate mila — quantity update karo
          updated[dupIndex] = {
            ...updated[dupIndex],
            quantity: updated[dupIndex].quantity + incomingQty,
            unit_price: parseFloat(item.mrp) || parseFloat(item.unit_price) || updated[dupIndex].unit_price,
            updated_at: new Date().toISOString(),
          }
          updatedCount++
        } else {
          // Naya item add karo
          updated.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            medicine_name: item.medicine_name || item.name || 'Unknown',
            batch_no: item.batch_no || null,
            expiry_date: item.expiry_date || null,
            quantity: incomingQty,
            unit_price: parseFloat(item.mrp) || parseFloat(item.unit_price) || 0,
            source: item.source || 'ai_scan',
            low_stock_threshold: item.low_stock_threshold || 100,
            created_at: new Date().toISOString(),
          })
          addedCount++
        }
      })

      saveItems(updated)
      return updated
    })

    return { added: addedCount, updated: updatedCount, error: null }
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

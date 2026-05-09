import { useState, useEffect, useCallback } from 'react'
import { fetchStock, insertStockItems, updateStockItem, deleteStockItem } from '../lib/supabase'
import { DEMO_STOCK } from '../lib/stockUtils'

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

export function useStock(userId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (DEMO_MODE || !userId) {
        // Demo mode — use local storage or hardcoded data
        const saved = localStorage.getItem('cma_demo_stock')
        setItems(saved ? JSON.parse(saved) : DEMO_STOCK)
      } else {
        const { data, error: err } = await fetchStock(userId)
        if (err) throw err
        setItems(data || [])
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const addItems = useCallback(async (newItems) => {
    if (DEMO_MODE || !userId) {
      const withIds = newItems.map((item, i) => ({
        ...item,
        id: Date.now() + i,
        retailer_id: 'demo',
        quantity: item.qty || 0,
        unit_price: item.mrp || 0,
        low_stock_threshold: 100,
        source: 'ai_scan',
        created_at: new Date().toISOString(),
      }))
      const updated = [...withIds, ...items]
      setItems(updated)
      localStorage.setItem('cma_demo_stock', JSON.stringify(updated))
      return { data: withIds, error: null }
    }

    const { data, error: err } = await insertStockItems(userId, newItems)
    if (!err) await load()
    return { data, error: err }
  }, [userId, items, load])

  const updateItem = useCallback(async (id, updates) => {
    if (DEMO_MODE || !userId) {
      const updated = items.map(item => item.id === id ? { ...item, ...updates } : item)
      setItems(updated)
      localStorage.setItem('cma_demo_stock', JSON.stringify(updated))
      return { error: null }
    }
    const { error: err } = await updateStockItem(id, updates)
    if (!err) await load()
    return { error: err }
  }, [userId, items, load])

  const removeItem = useCallback(async (id) => {
    if (DEMO_MODE || !userId) {
      const updated = items.filter(item => item.id !== id)
      setItems(updated)
      localStorage.setItem('cma_demo_stock', JSON.stringify(updated))
      return { error: null }
    }
    const { error: err } = await deleteStockItem(id)
    if (!err) await load()
    return { error: err }
  }, [userId, items, load])

  return { items, loading, error, refresh: load, addItems, updateItem, removeItem }
}

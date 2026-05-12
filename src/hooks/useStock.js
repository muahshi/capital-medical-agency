// ─── src/hooks/useStock.js — Supabase sync + localStorage offline ─────────────
import { useState, useEffect, useCallback } from 'react'
import { fetchStock, upsertStockItems, updateStockItem as dbUpdate, deleteStockItem as dbDelete, subscribeToStock } from '../lib/supabase'

const LS_KEY  = 'cma_inventory_items'
const VER_KEY = 'cma_data_version'
const VERSION = '4'

function migrate() {
  if (localStorage.getItem(VER_KEY) !== VERSION) {
    // v4: keep existing data, just update version
    localStorage.setItem(VER_KEY, VERSION)
  }
}

function loadLocal() {
  migrate()
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function saveLocal(items) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)) } catch {}
}

function normName(name = '') {
  return name.toLowerCase().replace(/[\s\-_.]/g, '').trim()
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2,7)}`
}

export const useStock = () => {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // ── Boot: load local first, then sync from Supabase ──────────────────────
  useEffect(() => {
    const local = loadLocal()
    setItems(local)
    setLoading(false)

    // Try Supabase sync
    syncFromDB(local)

    // Real-time subscription
    const unsub = subscribeToStock(({ eventType, new: row, old }) => {
      setItems(prev => {
        let updated
        if (eventType === 'INSERT') {
          updated = prev.some(i => i.id === row.id) ? prev : [row, ...prev]
        } else if (eventType === 'UPDATE') {
          updated = prev.map(i => i.id === row.id ? { ...i, ...row } : i)
        } else if (eventType === 'DELETE') {
          updated = prev.filter(i => i.id !== old.id)
        } else {
          updated = prev
        }
        saveLocal(updated)
        return updated
      })
    })

    return () => unsub()
  }, [])

  async function syncFromDB(localItems) {
    setSyncing(true)
    try {
      const { data, error } = await fetchStock()
      if (error || !data) return

      if (data.length > 0) {
        // DB has data — use it as source of truth
        setItems(data)
        saveLocal(data)
      } else if (localItems.length > 0) {
        // DB empty but local has data — push local to DB
        await upsertStockItems(localItems)
      }
    } catch (e) {
      console.warn('[useStock] Sync failed, using local:', e.message)
    } finally {
      setSyncing(false)
    }
  }

  // ── addItems — duplicate check + DB sync ─────────────────────────────────
  const addItems = useCallback(async (newItems) => {
    let addedCount = 0, updatedCount = 0
    const toUpsert = []

    setItems(prev => {
      const updated = [...prev]

      newItems.forEach(item => {
        const inName  = normName(item.medicine_name || item.name)
        const inBatch = (item.batch_no || '').trim().toLowerCase()
        const inQty   = parseInt(item.qty) || parseInt(item.quantity) || 0

        const dupIdx = updated.findIndex(ex => {
          const sameName  = normName(ex.medicine_name) === inName
          const sameBatch = inBatch ? (ex.batch_no||'').trim().toLowerCase() === inBatch : true
          return sameName && sameBatch
        })

        if (dupIdx !== -1) {
          updated[dupIdx] = {
            ...updated[dupIdx],
            quantity: updated[dupIdx].quantity + inQty,
            unit_price: parseFloat(item.mrp) || parseFloat(item.unit_price) || updated[dupIdx].unit_price,
            gst_percent: item.gst_percent || updated[dupIdx].gst_percent,
            updated_at: new Date().toISOString(),
          }
          toUpsert.push(updated[dupIdx])
          updatedCount++
        } else {
          const newRow = {
            id:                  genId(),
            medicine_name:       item.medicine_name || item.name || 'Unknown',
            batch_no:            item.batch_no || null,
            expiry_date:         item.expiry_date || null,
            quantity:            inQty,
            unit_price:          parseFloat(item.mrp) || parseFloat(item.unit_price) || 0,
            gst_percent:         item.gst_percent || null,
            supplier:            item.supplier || null,
            source:              item.source || 'ai_scan',
            low_stock_threshold: item.low_stock_threshold || 50,
            created_at:          new Date().toISOString(),
            updated_at:          new Date().toISOString(),
          }
          updated.push(newRow)
          toUpsert.push(newRow)
          addedCount++
        }
      })

      saveLocal(updated)
      return updated
    })

    // Async DB sync (non-blocking)
    if (toUpsert.length > 0) {
      upsertStockItems(toUpsert).catch(e => console.warn('[useStock] DB sync failed:', e.message))
    }

    return { added: addedCount, updated: updatedCount, error: null }
  }, [])

  // ── updateItem ────────────────────────────────────────────────────────────
  const updateItem = useCallback(async (id, updates) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } : i)
      saveLocal(updated)
      return updated
    })
    // DB sync
    const { error } = await dbUpdate(id, updates)
    return { data: null, error }
  }, [])

  // ── removeItem ────────────────────────────────────────────────────────────
  const removeItem = useCallback(async (id) => {
    setItems(prev => {
      const updated = prev.filter(i => i.id !== id)
      saveLocal(updated)
      return updated
    })
    const { error } = await dbDelete(id)
    return { error }
  }, [])

  // ── clearAllData ──────────────────────────────────────────────────────────
  const clearAllData = useCallback(() => {
    localStorage.removeItem(LS_KEY)
    setItems([])
  }, [])

  // ── Manual resync ─────────────────────────────────────────────────────────
  const resync = useCallback(() => syncFromDB(items), [items])

  return { items, loading, syncing, addItems, updateItem, removeItem, clearAllData, resync }
}

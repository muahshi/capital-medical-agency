// ─── src/hooks/useOrders.js — Supabase real-time + localStorage offline ───────
import { useState, useEffect, useCallback } from 'react'
import { fetchOrders, insertOrder, updateOrderStatus, subscribeToOrders } from '../lib/supabase'

const LS_KEY = 'cma_orders'

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveLocal(orders) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(orders)) } catch {}
}

export const useOrders = () => {
  const [orders,  setOrders]  = useState([])
  const [syncing, setSyncing] = useState(false)

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Load local immediately
    setOrders(loadLocal())

    // Sync from DB
    syncFromDB()

    // Real-time: new orders from salesmen appear instantly
    const unsub = subscribeToOrders(({ eventType, new: row, old }) => {
      setOrders(prev => {
        let updated
        if (eventType === 'INSERT') {
          updated = prev.some(o => o.id === row.id) ? prev : [row, ...prev]
          // Ping admin (cross-tab)
          try { localStorage.setItem('cma_new_order_ping', Date.now().toString()) } catch {}
        } else if (eventType === 'UPDATE') {
          updated = prev.map(o => o.id === row.id ? { ...o, ...row } : o)
        } else if (eventType === 'DELETE') {
          updated = prev.filter(o => o.id !== old.id)
        } else {
          updated = prev
        }
        saveLocal(updated)
        return updated
      })
    })

    return () => unsub()
  }, [])

  async function syncFromDB() {
    setSyncing(true)
    try {
      const { data, error } = await fetchOrders()
      if (error || !data) return
      if (data.length > 0) {
        setOrders(data)
        saveLocal(data)
      }
    } catch (e) {
      console.warn('[useOrders] Sync failed, using local:', e.message)
    } finally {
      setSyncing(false)
    }
  }

  // ── addOrder ──────────────────────────────────────────────────────────────
  const addOrder = useCallback(async (orderData) => {
    const order = {
      id:            orderData.id || `ORD-${Date.now()}`,
      salesman_code: orderData.salesman_code || '',
      salesman_name: orderData.salesman_name || '',
      customer_name: orderData.customer_name || 'Walk-in Customer',
      items:         orderData.items || [],
      notes:         orderData.notes || null,
      transcript:    orderData.transcript || null,
      status:        'pending',
      created_at:    new Date().toISOString(),
    }

    // Optimistic local update
    setOrders(prev => {
      const updated = [order, ...prev]
      saveLocal(updated)
      return updated
    })

    // Notify admin cross-tab
    try { localStorage.setItem('cma_new_order_ping', Date.now().toString()) } catch {}

    // DB insert (async)
    const { error } = await insertOrder(order)
    if (error) console.warn('[useOrders] DB insert failed:', error.message)

    return order
  }, [])

  // ── markOrderProcessed ────────────────────────────────────────────────────
  const markOrderProcessed = useCallback(async (id) => {
    setOrders(prev => {
      const updated = prev.map(o =>
        o.id === id ? { ...o, status: 'processed', processed_at: new Date().toISOString() } : o
      )
      saveLocal(updated)
      return updated
    })
    await updateOrderStatus(id, 'processed')
  }, [])

  // ── markOrderCancelled ────────────────────────────────────────────────────
  const markOrderCancelled = useCallback(async (id) => {
    setOrders(prev => {
      const updated = prev.map(o =>
        o.id === id ? { ...o, status: 'cancelled' } : o
      )
      saveLocal(updated)
      return updated
    })
    await updateOrderStatus(id, 'cancelled')
  }, [])

  const pendingCount = orders.filter(o => o.status === 'pending').length

  return { orders, syncing, pendingCount, addOrder, markOrderProcessed, markOrderCancelled }
}

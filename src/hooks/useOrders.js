// ── useOrders — localStorage based order management ──
import { useState, useEffect } from 'react'

const ORDERS_KEY = 'cma_orders'

function loadOrders() {
  try {
    const stored = localStorage.getItem(ORDERS_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {}
  return []
}

function saveOrders(orders) {
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)) } catch (e) {}
}

export const useOrders = () => {
  const [orders, setOrders] = useState([])

  useEffect(() => { setOrders(loadOrders()) }, [])

  const addOrder = (order) => {
    const newOrder = {
      id: `ORD-${Date.now()}`,
      ...order,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    setOrders(prev => {
      const updated = [newOrder, ...prev]
      saveOrders(updated)
      return updated
    })
    // Notify admin via localStorage event (cross-tab)
    try {
      localStorage.setItem('cma_new_order_ping', Date.now().toString())
    } catch (e) {}
    return newOrder
  }

  const markOrderProcessed = (id) => {
    setOrders(prev => {
      const updated = prev.map(o => o.id === id ? { ...o, status: 'processed', processed_at: new Date().toISOString() } : o)
      saveOrders(updated)
      return updated
    })
  }

  const markOrderCancelled = (id) => {
    setOrders(prev => {
      const updated = prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o)
      saveOrders(updated)
      return updated
    })
  }

  return { orders, addOrder, markOrderProcessed, markOrderCancelled }
}

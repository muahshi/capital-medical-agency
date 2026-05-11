// ─── src/App.jsx ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
import { LoginPage } from './components/LoginPage'
import Dashboard from './components/Dashboard'
import InventoryPage from './components/InventoryPage'
import ScannerPage from './components/ScannerPage'
import HistoryPage from './components/HistoryPage'
import SettingsPage from './components/SettingsPage'
import InsightsPage from './components/InsightsPage'
import BottomNav from './components/BottomNav'
import SalesmanPortal from './components/SalesmanPortal'
import { useStock } from './hooks/useStock'
import { useOrders } from './hooks/useOrders'
import { verifySession, logoutSession } from './lib/supabase'
import './styles/globals.css'

// ── Route detection ────────────────────────────────────────────────────────────
function getCurrentRoute() {
  const path = window.location.pathname
  return (path === '/salesman' || path.startsWith('/salesman')) ? 'salesman' : 'admin'
}

// ── Auth states ────────────────────────────────────────────────────────────────
// null    = checking
// false   = not logged in
// object  = { role, label, token, ... }
const SESSION_RECHECK_MS = 5 * 60 * 1000   // 5 min pe recheck

export default function App() {
  const [route]             = useState(getCurrentRoute)
  const [session, setSession]           = useState(null)          // null=loading
  const [sessionChecked, setSessionChecked] = useState(false)
  const [activeTab, setActiveTab]       = useState('dashboard')
  const [inventoryFilter, setInventoryFilter] = useState('all')

  const { items, loading: stockLoading, addItems, updateItem, removeItem, clearAllData } = useStock()
  const { orders, addOrder, markOrderProcessed } = useOrders()

  // ── Global session check ───────────────────────────────────────────────────
  const checkSession = useCallback(async () => {
    try {
      const result = await verifySession()
      if (result.valid) {
        setSession(result.user)
      } else {
        setSession(false)
        // Reason-specific message
        if (result.reason === 'deactivated') {
          alert('Aapka access band kar diya gaya hai. Admin se contact karo.')
        } else if (result.reason === 'expired') {
          alert('Session expire ho gaya. Dobara login karo.')
        }
      }
    } catch (err) {
      console.error('[CMA] Session check failed:', err)
      // Network error pe existing session rakh lo, crash mat karo
      const existing = localStorage.getItem('cma_session_token')
      setSession(existing ? { token: existing, role: 'unknown' } : false)
    } finally {
      setSessionChecked(true)
    }
  }, [])

  // Initial check
  useEffect(() => {
    checkSession()
  }, [checkSession])

  // Periodic recheck (auto-lock agar DB pe key change ho)
  useEffect(() => {
    if (!session) return
    const interval = setInterval(checkSession, SESSION_RECHECK_MS)
    return () => clearInterval(interval)
  }, [session, checkSession])

  // App focus pe recheck (tab switch karne par)
  useEffect(() => {
    const onFocus = () => { if (session) checkSession() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [session, checkSession])

  // ── PWA back button ────────────────────────────────────────────────────────
  useEffect(() => {
    window.history.replaceState({ tab: 'dashboard' }, '')
    const handlePop = (e) => {
      const prev = e.state?.tab || 'dashboard'
      setActiveTab(prev)
      window.history.pushState({ tab: prev }, '')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  const goBack = useCallback(() => {
    window.history.pushState({ tab: 'dashboard' }, '')
    setActiveTab('dashboard')
  }, [])

  const handleTabChange = useCallback((tab) => {
    window.history.pushState({ tab }, '')\
    setActiveTab(tab)
  }, [])

  const handleNavigate = useCallback((tab, filter) => {
    window.history.pushState({ tab }, '')
    setActiveTab(tab)
    if (filter) setInventoryFilter(filter)
  }, [])

  const handleLogout = async () => {
    await logoutSession()
    setSession(false)
    window.location.reload()
  }

  const handleLoginSuccess = (user) => {
    setSession(user)
  }

  // ── Loading spinner ────────────────────────────────────────────────────────
  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-yellow-500/20 border-t-yellow-500 animate-spin rounded-full" />
        <p className="text-gray-600 text-xs font-mono tracking-widest uppercase">Verifying session...</p>
      </div>
    )
  }

  // ── Salesman route ─────────────────────────────────────────────────────────
  // SalesmanPortal apna auth handle karta hai (code se)
  if (route === 'salesman') {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Toaster position="top-center" />
        <SalesmanPortal onOrderSubmit={addOrder} />
      </div>
    )
  }

  // ── Admin login ────────────────────────────────────────────────────────────
  if (!session || session === false) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Toaster position="top-center" />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </div>
    )
  }

  const pendingOrderCount = orders.filter(o => o.status === 'pending').length

  // ── Admin App ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#F5F5F0]">
      <Toaster position="top-center" />
      <main className="flex-1 flex flex-col overflow-hidden pb-20">
        {activeTab === 'dashboard' && (
          <Dashboard
            items={items}
            orders={orders}
            pendingOrderCount={pendingOrderCount}
            onNavigate={handleNavigate}
            onMarkOrderProcessed={markOrderProcessed}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryPage items={items} onUpdate={updateItem} onDelete={removeItem}
            initialFilter={inventoryFilter} onBack={goBack} />
        )}
        {activeTab === 'scan' && (
          <ScannerPage onItemsAdded={addItems} onBack={goBack} />
        )}
        {activeTab === 'history' && (
          <HistoryPage items={items} onBack={goBack} />
        )}
        {activeTab === 'insights' && (
          <InsightsPage items={items} orders={orders} onBack={goBack} />
        )}
        {activeTab === 'settings' && (
          <SettingsPage
            user={{ label: session?.label || 'Admin', role: 'Admin' }}
            isDemoMode={false}
            items={items}
            onLogout={handleLogout}
            onBack={goBack}
            onClearData={clearAllData}
          />
        )}
      </main>
      <BottomNav active={activeTab} onChange={handleTabChange} pendingOrders={pendingOrderCount} />
    </div>
  )
}

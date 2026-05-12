// ─── src/App.jsx — Production v3.0 ───────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
import { LoginPage }    from './components/LoginPage'
import Dashboard        from './components/Dashboard'
import InventoryPage    from './components/InventoryPage'
import ScannerPage      from './components/ScannerPage'
import HistoryPage      from './components/HistoryPage'
import SettingsPage     from './components/SettingsPage'
import InsightsPage     from './components/InsightsPage'
import BottomNav        from './components/BottomNav'
import SalesmanPortal   from './components/SalesmanPortal'
import { useStock }     from './hooks/useStock'
import { useOrders }    from './hooks/useOrders'
import { verifySession, logoutSession } from './lib/supabase'
import './styles/globals.css'

const RECHECK_MS = 5 * 60 * 1000

function getRoute() {
  const p = window.location.pathname
  return p === '/salesman' || p.startsWith('/salesman') ? 'salesman' : 'admin'
}

export default function App() {
  const [route]                   = useState(getRoute)
  const [session,    setSession]  = useState(null)
  const [checked,    setChecked]  = useState(false)
  const [activeTab,  setActiveTab]= useState('dashboard')
  const [invFilter,  setInvFilter]= useState('all')

  const { items, loading: stockLoading, syncing: stockSyncing, addItems, updateItem, removeItem, clearAllData } = useStock()
  const { orders, syncing: orderSyncing, addOrder, markOrderProcessed, markOrderCancelled } = useOrders()

  const checkSession = useCallback(async () => {
    try {
      const r = await verifySession()
      if (r.valid) { setSession(r.user) }
      else {
        setSession(false)
        if (r.reason === 'deactivated') alert('Aapka access band kar diya gaya hai.')
        else if (r.reason === 'expired') alert('Session expire ho gaya. Dobara login karo.')
      }
    } catch {
      const tok = localStorage.getItem('cma_session_token') || localStorage.getItem('cma_admin_auth')
      setSession(tok ? { role: 'admin', label: 'Admin', token: tok } : false)
    } finally { setChecked(true) }
  }, [])

  useEffect(() => { checkSession() }, [checkSession])

  useEffect(() => {
    if (!session) return
    const t = setInterval(checkSession, RECHECK_MS)
    return () => clearInterval(t)
  }, [session, checkSession])

  useEffect(() => {
    const fn = () => { if (session) checkSession() }
    window.addEventListener('focus', fn)
    return () => window.removeEventListener('focus', fn)
  }, [session, checkSession])

  useEffect(() => {
    window.history.replaceState({ tab: 'dashboard' }, '')
    const fn = (e) => {
      const t = e.state?.tab || 'dashboard'
      setActiveTab(t)
      window.history.pushState({ tab: t }, '')
    }
    window.addEventListener('popstate', fn)
    return () => window.removeEventListener('popstate', fn)
  }, [])

  const goBack         = useCallback(() => { window.history.pushState({ tab: 'dashboard' }, ''); setActiveTab('dashboard') }, [])
  const handleTabChange= useCallback((tab) => { window.history.pushState({ tab }, ''); setActiveTab(tab) }, [])
  const handleNavigate = useCallback((tab, filter) => { window.history.pushState({ tab }, ''); setActiveTab(tab); if (filter) setInvFilter(filter) }, [])
  const handleLogout   = async () => { await logoutSession(); setSession(false); window.location.reload() }

  if (!checked) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
        <p className="text-gray-600 text-xs font-mono tracking-widest uppercase">Loading CMA OS...</p>
      </div>
    )
  }

  if (route === 'salesman') {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Toaster position="top-center" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
        <SalesmanPortal onOrderSubmit={addOrder} />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Toaster position="top-center" />
        <LoginPage onLoginSuccess={setSession} />
      </div>
    )
  }

  const pendingOrderCount = orders.filter(o => o.status === 'pending').length

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#F5F5F0]">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
      {(stockSyncing || orderSyncing) && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-yellow-500/20 z-50">
          <div className="h-full bg-yellow-500 w-3/5 animate-pulse" />
        </div>
      )}
      <main className="flex-1 flex flex-col overflow-hidden pb-20">
        {activeTab === 'dashboard'  && <Dashboard items={items} orders={orders} pendingOrderCount={pendingOrderCount} onNavigate={handleNavigate} onMarkOrderProcessed={markOrderProcessed} />}
        {activeTab === 'inventory'  && <InventoryPage items={items} onUpdate={updateItem} onDelete={removeItem} initialFilter={invFilter} onBack={goBack} />}
        {activeTab === 'scan'       && <ScannerPage onItemsAdded={addItems} onBack={goBack} />}
        {activeTab === 'history'    && <HistoryPage items={items} onBack={goBack} />}
        {activeTab === 'insights'   && <InsightsPage items={items} orders={orders} onBack={goBack} />}
        {activeTab === 'settings'   && <SettingsPage user={{ label: session?.label || 'Admin', role: session?.role || 'admin' }} isDemoMode={false} items={items} onLogout={handleLogout} onBack={goBack} onClearData={clearAllData} />}
      </main>
      <BottomNav active={activeTab} onChange={handleTabChange} pendingOrders={pendingOrderCount} />
    </div>
  )
}

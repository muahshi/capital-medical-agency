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
import './styles/globals.css'

// ── Route detection ──
function getCurrentRoute() {
  const path = window.location.pathname
  if (path === '/salesman' || path.startsWith('/salesman')) return 'salesman'
  return 'admin'
}

export default function App() {
  const [route] = useState(getCurrentRoute)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [inventoryFilter, setInventoryFilter] = useState('all')

  const { items, loading: stockLoading, addItems, updateItem, removeItem, clearAllData } = useStock()
  const { orders, addOrder, markOrderProcessed } = useOrders()

  // ── Auth check ──
  useEffect(() => {
    try {
      if (localStorage.getItem('cma_admin_auth') === 'true') setIsAuthenticated(true)
    } catch (e) {}
    setIsLoading(false)
  }, [])

  // ── PWA back button ──
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
    window.history.pushState({ tab }, '')
    setActiveTab(tab)
  }, [])

  const handleNavigate = useCallback((tab, filter) => {
    window.history.pushState({ tab }, '')
    setActiveTab(tab)
    if (filter) setInventoryFilter(filter)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('cma_admin_auth')
    window.location.reload()
  }

  // ── Salesman route — no auth needed ──
  if (route === 'salesman') {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Toaster position="top-center" />
        <SalesmanPortal onOrderSubmit={addOrder} />
      </div>
    )
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-yellow-500/20 border-t-yellow-500 animate-spin rounded-full" />
      </div>
    )
  }

  // ── Admin Login ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Toaster position="top-center" />
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
      </div>
    )
  }

  const pendingOrderCount = orders.filter(o => o.status === 'pending').length

  // ── Admin App ──
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
            user={{ email: 'admin@capitalmedical.agency', role: 'Owner' }}
            isDemoMode={false} items={items}
            onLogout={handleLogout} onBack={goBack} onClearData={clearAllData}
          />
        )}
      </main>
      <BottomNav active={activeTab} onChange={handleTabChange} pendingOrders={pendingOrderCount} />
    </div>
  )
}

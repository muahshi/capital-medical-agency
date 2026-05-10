import React, { useState, useEffect, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
import { LoginPage } from './components/LoginPage'
import Dashboard from './components/Dashboard'
import InventoryPage from './components/InventoryPage'
import ScannerPage from './components/ScannerPage'
import HistoryPage from './components/HistoryPage'
import SettingsPage from './components/SettingsPage'
import BottomNav from './components/BottomNav'
import { useStock } from './hooks/useStock'
import './styles/globals.css'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [inventoryFilter, setInventoryFilter] = useState('all')

  // ── Auth: sirf localStorage ──
  useEffect(() => {
    try {
      if (localStorage.getItem('cma_admin_auth') === 'true') {
        setIsAuthenticated(true)
      }
    } catch (e) {}
    setIsLoading(false)
  }, [])

  // ── PWA Hardware Back Button ──
  // Jab bhi tab change ho, history mein push karo
  // Jab hardware back press ho, dashboard par le jao
  useEffect(() => {
    // Initial state push
    window.history.replaceState({ tab: 'dashboard' }, '')

    const handlePopState = (e) => {
      const prevTab = e.state?.tab || 'dashboard'
      setActiveTab(prevTab)
      // Always push a fresh state so back button keeps working
      window.history.pushState({ tab: prevTab }, '')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('cma_admin_auth')
    window.location.reload()
  }

  const handleNavigate = useCallback((tab, filter) => {
    window.history.pushState({ tab }, '')
    setActiveTab(tab)
    if (filter) setInventoryFilter(filter)
  }, [])

  const handleTabChange = useCallback((tab) => {
    window.history.pushState({ tab }, '')
    setActiveTab(tab)
  }, [])

  const goBack = useCallback(() => {
    window.history.pushState({ tab: 'dashboard' }, '')
    setActiveTab('dashboard')
  }, [])

  const { items, loading: stockLoading, addItems, updateItem, removeItem, clearAllData } = useStock()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-yellow-500/20 border-t-yellow-500 animate-spin rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Toaster position="top-center" />
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#F5F5F0]">
      <Toaster position="top-center" />

      <main className="flex-1 flex flex-col overflow-hidden pb-20">
        {activeTab === 'dashboard' && (
          <Dashboard items={items} onNavigate={handleNavigate} />
        )}
        {activeTab === 'inventory' && (
          <InventoryPage
            items={items}
            onUpdate={updateItem}
            onDelete={removeItem}
            initialFilter={inventoryFilter}
            onBack={goBack}
          />
        )}
        {activeTab === 'scan' && (
          <ScannerPage
            onItemsAdded={addItems}
            onBack={goBack}
          />
        )}
        {activeTab === 'history' && (
          <HistoryPage items={items} onBack={goBack} />
        )}
        {activeTab === 'settings' && (
          <SettingsPage
            user={{ email: 'admin@capitalmedical.agency', role: 'Owner' }}
            isDemoMode={false}
            items={items}
            onLogout={handleLogout}
            onBack={goBack}
            onClearData={clearAllData}
          />
        )}
      </main>

      <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  )
}

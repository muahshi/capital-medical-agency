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

  // ── Auth: sirf localStorage, koi Supabase nahi ──
  useEffect(() => {
    try {
      if (localStorage.getItem('cma_admin_auth') === 'true') {
        setIsAuthenticated(true)
      }
    } catch (e) {}
    setIsLoading(false)
  }, [])

  // ── Hardware back button (PWA) ──
  useEffect(() => {
    const onBack = (e) => {
      if (activeTab !== 'dashboard') {
        e.preventDefault()
        setActiveTab('dashboard')
      }
    }
    window.addEventListener('popstate', onBack)
    return () => window.removeEventListener('popstate', onBack)
  }, [activeTab])

  const handleLogout = () => {
    localStorage.removeItem('cma_admin_auth')
    window.location.reload()
  }

  const handleNavigate = useCallback((tab, filter) => {
    setActiveTab(tab)
    if (filter) setInventoryFilter(filter)
  }, [])

  const handleTabChange = useCallback((tab) => {
    // Push state so hardware back button works
    window.history.pushState({ tab }, '', '')
    setActiveTab(tab)
  }, [])

  const { items, loading: stockLoading, addItems, updateItem, removeItem } = useStock()

  // ── Loading spinner ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-yellow-500/20 border-t-yellow-500 animate-spin rounded-full" />
      </div>
    )
  }

  // ── Login screen ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Toaster position="top-center" />
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
      </div>
    )
  }

  // ── Main App ──
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
            onBack={() => handleTabChange('dashboard')}
          />
        )}
        {activeTab === 'scan' && (
          <ScannerPage
            onItemsAdded={addItems}
            onBack={() => handleTabChange('dashboard')}
          />
        )}
        {activeTab === 'history' && (
          <HistoryPage
            items={items}
            onBack={() => handleTabChange('dashboard')}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsPage
            user={{ email: 'admin@capitalmedical.agency', role: 'Owner' }}
            isDemoMode={false}
            items={items}
            onLogout={handleLogout}
            onBack={() => handleTabChange('dashboard')}
          />
        )}
      </main>

      <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  )
}

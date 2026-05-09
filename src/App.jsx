```react
import React, { useState, useEffect, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
// Components direct import (Verify paths in your project)
import { LoginPage } from './components/LoginPage'
import Dashboard from './components/Dashboard'
import InventoryPage from './components/InventoryPage'
import ScannerPage from './components/ScannerPage'
import HistoryPage from './components/HistoryPage'
import SettingsPage from './components/SettingsPage'
import BottomNav from './components/BottomNav'
import './styles/globals.css'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [inventoryFilter, setInventoryFilter] = useState('all')

  // Auth check logic - No Supabase dependency here
  useEffect(() => {
    try {
      const authStatus = localStorage.getItem('cma_admin_auth')
      if (authStatus === 'true') {
        setIsAuthenticated(true)
      }
    } catch (e) {
      console.error("Auth state check failed", e)
    }
    // Chota sa delay loading smooth karne ke liye
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('cma_admin_auth')
    setIsAuthenticated(false)
    window.location.reload() // Full clean state
  }

  const handleNavigate = useCallback((tab, filter) => {
    setActiveTab(tab)
    if (filter) setInventoryFilter(filter)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-yellow-500/20 border-t-yellow-500 animate-spin rounded-full" />
      </div>
    )
  }

  // Agar login nahi hai toh sirf Login Page dikhao
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Toaster position="top-center" />
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
      </div>
    )
  }

  // Main Application Layout
  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#F5F5F0]">
      <Toaster position="top-center" />
      
      <main className="flex-1 flex flex-col overflow-hidden pb-20">
        {activeTab === 'dashboard' && (
          <Dashboard items={[]} onNavigate={handleNavigate} />
        )}
        {activeTab === 'inventory' && (
          <InventoryPage 
            items={[]} 
            onUpdate={() => {}} 
            onDelete={() => {}} 
            initialFilter={inventoryFilter} 
          />
        )}
        {activeTab === 'scan' && (
          <ScannerPage userId="admin-cma" onItemsAdded={() => {}} />
        )}
        {activeTab === 'history' && (
          <HistoryPage items={[]} />
        )}
        {activeTab === 'settings' && (
          <SettingsPage 
            user={{ email: 'admin@capitalmedical.agency', role: 'Owner' }} 
            isDemoMode={false} 
            items={[]}
            onLogout={handleLogout}
          />
        )}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

```

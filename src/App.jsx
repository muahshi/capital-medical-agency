import { useState, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useStock } from './hooks/useStock'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import InventoryPage from './components/InventoryPage'
import ScannerPage from './components/ScannerPage'
import HistoryPage from './components/HistoryPage'
import SettingsPage from './components/SettingsPage'
import BottomNav from './components/BottomNav'
import './styles/globals.css'

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

export default function App() {
  const { user, loading } = useAuth()
  const [isDemoMode, setIsDemoMode] = useState(DEMO_MODE)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [inventoryFilter, setInventoryFilter] = useState('all')

  const currentUser = isDemoMode ? { id: 'demo', email: 'demo@cma.local' } : user

  const { items, loading: stockLoading, addItems, updateItem, removeItem, refresh } = useStock(
    isDemoMode ? null : currentUser?.id
  )

  const handleNavigate = useCallback((tab, filter) => {
    setActiveTab(tab)
    if (filter) setInventoryFilter(filter)
  }, [])

  const handleScanComplete = useCallback(async (newItems) => {
    const { error } = await addItems(newItems)
    if (error) throw error
  }, [addItems])

  // Loading state
  if (loading && !isDemoMode) {
    return (
      <div className="h-full bg-dark-950 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-gold-500/20 border-t-gold-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border border-gold-500/10 border-t-gold-500/40 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
        </div>
        <p className="text-gold-500 font-mono text-sm tracking-widest">LOADING CMA...</p>
      </div>
    )
  }

  // Auth check (skip for demo mode)
  if (!isDemoMode && !user) {
    return (
      <>
        <LoginPage onDemoMode={() => setIsDemoMode(true)} />
        <Toaster position="top-center" />
      </>
    )
  }

  return (
    <div className="h-full flex flex-col bg-dark-950">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#111',
            color: '#F5F5F0',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: '12px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          },
        }}
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'dashboard' && (
          <Dashboard items={items} onNavigate={handleNavigate} />
        )}
        {activeTab === 'inventory' && (
          <InventoryPage
            items={items}
            onUpdate={updateItem}
            onDelete={removeItem}
            initialFilter={inventoryFilter}
          />
        )}
        {activeTab === 'scan' && (
          <ScannerPage
            userId={currentUser?.id}
            onItemsAdded={handleScanComplete}
          />
        )}
        {activeTab === 'history' && (
          <HistoryPage items={items} />
        )}
        {activeTab === 'settings' && (
          <SettingsPage
            user={currentUser}
            isDemoMode={isDemoMode}
            items={items}
          />
        )}
      </main>

      {/* Bottom navigation */}
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

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

export default function App() {
  const { user, loading } = useAuth()
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [inventoryFilter, setInventoryFilter] = useState('all')

  const currentUser = isDemoMode ? { id: null, email: 'demo@cma.local' } : user

  const { items, loading: stockLoading, addItems, updateItem, removeItem } = useStock(
    isDemoMode ? null : user?.id
  )

  const handleNavigate = useCallback((tab, filter) => {
    setActiveTab(tab)
    if (filter) setInventoryFilter(filter)
  }, [])

  const handleScanComplete = useCallback(async (newItems) => {
    if (addItems) {
      const { error } = await addItems(newItems)
      if (error) throw error
    }
  }, [addItems])

  // Loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
        <p className="text-yellow-500 font-mono text-xs tracking-widest uppercase">Loading...</p>
      </div>
    )
  }

  // Show login if not logged in and not demo mode
  if (!isDemoMode && !user) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Toaster position="top-center" />
        <LoginPage onDemoMode={() => setIsDemoMode(true)} />
      </div>
    )
  }

  // Main app
  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#F5F5F0]">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#111',
            color: '#F5F5F0',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: '12px',
          },
        }}
      />
      <main className="flex-1 flex flex-col overflow-hidden pb-20">
        {activeTab === 'dashboard' && (
          <Dashboard items={items || []} onNavigate={handleNavigate} />
        )}
        {activeTab === 'inventory' && (
          <InventoryPage
            items={items || []}
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
          <HistoryPage items={items || []} />
        )}
        {activeTab === 'settings' && (
          <SettingsPage
            user={currentUser}
            isDemoMode={isDemoMode}
            items={items || []}
          />
        )}
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

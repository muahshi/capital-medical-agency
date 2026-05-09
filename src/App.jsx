```react
import { useState, useCallback } from 'react' // 'import' must be lowercase
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

// Safe check for environment variables
const getDemoMode = () => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return !url || url.includes('placeholder') || url === "";
  } catch (e) {
    return true; // Default to demo if env is missing
  }
}

const DEMO_MODE = getDemoMode();

export default function App() {
  const { user, loading } = useAuth()
  const [isDemoMode, setIsDemoMode] = useState(DEMO_MODE)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [inventoryFilter, setInventoryFilter] = useState('all')

  const currentUser = isDemoMode ? { id: 'demo', email: 'demo@cma.local' } : user

  const { items, loading: stockLoading, addItems, updateItem, removeItem } = useStock(
    isDemoMode ? null : currentUser?.id
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

  // 1. Loading state (Sirf tab dikhaye jab auth confirm ho raha ho)
  if (loading && !isDemoMode) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
        </div>
        <p className="text-yellow-500 font-mono text-xs tracking-widest uppercase">Initializing Systems...</p>
      </div>
    )
  }

  // 2. Auth check (Login dikhaye agar user nahi hai aur demo mode off hai)
  if (!isDemoMode && !user) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <LoginPage onDemoMode={() => setIsDemoMode(true)} />
        <Toaster position="top-center" />
      </div>
    )
  }

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

      {/* Main content area */}
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

      {/* Bottom navigation */}
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

```

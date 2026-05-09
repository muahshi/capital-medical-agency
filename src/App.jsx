```react
import { useState, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useStock } from './hooks/useStock'
import { LoginPage } from './components/LoginPage' // Named import from our new LoginPage
import Dashboard from './components/Dashboard'
import InventoryPage from './components/InventoryPage'
import ScannerPage from './components/ScannerPage'
import HistoryPage from './components/HistoryPage'
import SettingsPage from './components/SettingsPage'
import BottomNav from './components/BottomNav'
import './styles/globals.css'

const getDemoMode = () => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return !url || url.includes('placeholder') || url === "";
  } catch (e) {
    return true;
  }
}

const DEMO_MODE = getDemoMode();

// Use 'export default' here so main.jsx can find it
export default function App() {
  const { user, loading } = useAuth()
  const [isDemoMode, setIsDemoMode] = useState(DEMO_MODE)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [inventoryFilter, setInventoryFilter] = useState('all')

  const currentUser = isDemoMode ? { id: 'demo', email: 'demo@cma.local' } : user
  const { items, addItems, updateItem, removeItem } = useStock(isDemoMode ? null : currentUser?.id)

  const handleNavigate = useCallback((tab, filter) => {
    setActiveTab(tab)
    if (filter) setInventoryFilter(filter)
  }, [])

  if (loading && !isDemoMode) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-yellow-500/20 border-t-yellow-500 animate-spin rounded-full" />
      </div>
    )
  }

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
      <Toaster position="top-center" />
      <main className="flex-1 flex flex-col overflow-hidden pb-20">
        {activeTab === 'dashboard' && <Dashboard items={items || []} onNavigate={handleNavigate} />}
        {activeTab === 'inventory' && <InventoryPage items={items || []} onUpdate={updateItem} onDelete={removeItem} initialFilter={inventoryFilter} />}
        {activeTab === 'scan' && <ScannerPage userId={currentUser?.id} onItemsAdded={addItems} />}
        {activeTab === 'history' && <HistoryPage items={items || []} />}
        {activeTab === 'settings' && <SettingsPage user={currentUser} isDemoMode={isDemoMode} items={items || []} />}
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

```

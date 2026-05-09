```react
import { useState, useEffect, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
import { useStock } from './hooks/useStock'
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

  // Check auth on load
  useEffect(() => {
    const authStatus = localStorage.getItem('cma_admin_auth')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  // Agar hum authenticated hain toh stock hooks chalu karenge
  // Note: Yahan aap apni original useAuth ya demo ID pass kar sakte hain
  const { items, addItems, updateItem, removeItem } = useStock('cma-admin-user')

  const handleNavigate = useCallback((tab, filter) => {
    setActiveTab(tab)
    if (filter) setInventoryFilter(filter)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('cma_admin_auth')
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-yellow-500/20 border-t-yellow-500 animate-spin rounded-full" />
      </div>
    )
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="bg-[#050505]">
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
        <Toaster position="top-center" />
      </div>
    )
  }

  // Dashboard View
  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#F5F5F0]">
      <Toaster position="top-center" />
      
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
          <ScannerPage userId="cma-admin-user" onItemsAdded={addItems} />
        )}
        {activeTab === 'history' && (
          <HistoryPage items={items || []} />
        )}
        {activeTab === 'settings' && (
          <SettingsPage 
            user={{ email: 'admin@capitalmedical.agency' }} 
            isDemoMode={false} 
            items={items || []}
            onLogout={handleLogout}
          />
        )}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

```

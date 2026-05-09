```react
import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { Toaster } from 'react-hot-toast'
import { LoginPage } from './components/LoginPage'
import BottomNav from './components/BottomNav'
import './styles/globals.css'

// Lazy loading components to prevent white screen crashes
const Dashboard = lazy(() => import('./components/Dashboard'))
const InventoryPage = lazy(() => import('./components/InventoryPage'))
const ScannerPage = lazy(() => import('./components/ScannerPage'))
const HistoryPage = lazy(() => import('./components/HistoryPage'))
const SettingsPage = lazy(() => import('./components/SettingsPage'))

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    try {
      const authStatus = localStorage.getItem('cma_admin_auth')
      if (authStatus === 'true') {
        setIsAuthenticated(true)
      }
    } catch (e) {
      console.error("Storage error:", e)
    }
    setIsLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('cma_admin_auth')
    setIsAuthenticated(false)
  }

  // Loading state with a dark background to match theme
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-yellow-500/20 border-t-yellow-500 animate-spin rounded-full" />
      </div>
    )
  }

  // 1. Agar login nahi hai, toh seedha Login Page dikhao
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
        <Toaster position="top-center" />
      </div>
    )
  }

  // 2. Agar login hai, toh Dashboard dikhao
  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#F5F5F0]">
      <Toaster position="top-center" />
      
      <main className="flex-1 flex flex-col overflow-hidden pb-20">
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-yellow-500/10 border-t-yellow-500 animate-spin rounded-full" />
          </div>
        }>
          {activeTab === 'dashboard' && <Dashboard items={[]} onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'inventory' && <InventoryPage items={[]} onUpdate={() => {}} onDelete={() => {}} />}
          {activeTab === 'scan' && <ScannerPage userId="admin" onItemsAdded={() => {}} />}
          {activeTab === 'history' && <HistoryPage items={[]} />}
          {activeTab === 'settings' && (
            <SettingsPage 
              user={{ email: 'admin@capitalmedical.agency' }} 
              isDemoMode={false} 
              items={[]} 
              onLogout={handleLogout} 
            />
          )}
        </Suspense>
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  )
}

```

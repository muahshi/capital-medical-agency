import { useState } from 'react'
import { User, Bell, Database, Wifi, WifiOff, LogOut, ChevronRight, Shield, Smartphone, Info } from 'lucide-react'
import { signOut } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function SettingsPage({ user, isDemoMode, items }) {
  const [notifEnabled, setNotifEnabled] = useState(false)

  async function handleInstallPWA() {
    toast('Open browser menu → "Add to Home Screen" to install!', {
      className: 'toast-dark',
      icon: '📱',
      duration: 5000,
    })
  }

  async function handleLogout() {
    // localStorage clear karke reload — simple & reliable
    localStorage.removeItem('cma_admin_auth')
    window.location.reload()
  }

  async function requestNotifications() {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported', { className: 'toast-dark' })
      return
    }
    const perm = await Notification.requestPermission()
    setNotifEnabled(perm === 'granted')
    toast(perm === 'granted' ? '✅ Notifications enabled!' : '❌ Permission denied', { className: 'toast-dark' })
  }

  function exportCSV() {
    const headers = ['Medicine Name', 'Batch No', 'Expiry', 'Quantity', 'MRP', 'Source']
    const rows = items.map(i => [
      i.medicine_name, i.batch_no || '', i.expiry_date || '', i.quantity, i.unit_price || '', i.source || ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cma-inventory-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported!', { className: 'toast-dark' })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-dark-400 text-xs font-mono tracking-widest uppercase">App</p>
        <h1 className="font-display text-3xl text-white tracking-widest">SETTINGS</h1>
      </div>

      <div className="flex-1 scroll-area px-4 pb-4 space-y-4">
        {/* Profile card */}
        <div className="bg-dark-800 rounded-2xl p-4 border border-dark-600 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
            <User className="w-6 h-6 text-gold-500" />
          </div>
          <div>
            {isDemoMode ? (
              <>
                <p className="text-white font-semibold">Demo User</p>
                <p className="text-dark-400 text-xs font-mono">demo@capitalmedical.com</p>
              </>
            ) : (
              <>
                <p className="text-white font-semibold">{user?.email?.split('@')[0] || 'User'}</p>
                <p className="text-dark-400 text-xs font-mono">{user?.email}</p>
              </>
            )}
          </div>
          {isDemoMode && (
            <div className="ml-auto bg-amber-900/30 border border-amber-500/30 rounded-lg px-2 py-1">
              <p className="text-amber-400 text-[10px] font-mono">DEMO</p>
            </div>
          )}
        </div>

        {/* PWA Section */}
        <SettingSection title="MOBILE APP">
          <SettingRow
            icon={<Smartphone className="w-4 h-4 text-blue-400" />}
            label="Install as App"
            description="Add to Home Screen for app-like experience"
            onClick={handleInstallPWA}
          />
          <SettingRow
            icon={<Bell className="w-4 h-4 text-gold-500" />}
            label="Push Notifications"
            description="Get alerts for low stock & expiry"
            onClick={requestNotifications}
            trailing={
              <div className={`w-10 h-5 rounded-full transition-colors ${notifEnabled ? 'bg-gold-500' : 'bg-dark-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${notifEnabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
              </div>
            }
          />
        </SettingSection>

        {/* Data Section */}
        <SettingSection title="DATA">
          <SettingRow
            icon={<Database className="w-4 h-4 text-green-400" />}
            label="Export to CSV"
            description={`Export ${items.length} inventory items`}
            onClick={exportCSV}
          />
        </SettingSection>

        {/* API Status */}
        <SettingSection title="API STATUS">
          <div className="px-4 py-3 space-y-2">
            <ApiStatus
              label="Groq Vision AI"
              connected={!!import.meta.env.VITE_GROQ_API_KEY}
              desc="Bill scanning & OCR"
            />
            <ApiStatus
              label="Supabase Database"
              connected={!import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')}
              desc="Inventory storage"
            />
          </div>
        </SettingSection>

        {/* App Info */}
        <SettingSection title="ABOUT">
          <div className="px-4 py-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-dark-400 text-sm">Version</span>
              <span className="text-white text-sm font-mono">2.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400 text-sm">AI Model</span>
              <span className="text-gold-500 text-sm font-mono">llama-3.2-11b-vision</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400 text-sm">Mode</span>
              <span className="text-white text-sm font-mono">{isDemoMode ? 'Demo' : 'Live'}</span>
            </div>
          </div>
        </SettingSection>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-950/20 border border-red-900/30 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          <span className="text-red-400 font-semibold">Sign Out</span>
        </button>
      </div>
    </div>
  )
}

function SettingSection({ title, children }) {
  return (
    <div>
      <p className="section-title mb-2 px-1">{title}</p>
      <div className="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden divide-y divide-dark-700">
        {children}
      </div>
    </div>
  )
}

function SettingRow({ icon, label, description, onClick, trailing }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-dark-700 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-dark-400 text-xs mt-0.5">{description}</p>}
      </div>
      {trailing || <ChevronRight className="w-4 h-4 text-dark-500 shrink-0" />}
    </button>
  )
}

function ApiStatus({ label, connected, desc }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-white text-sm">{label}</p>
        <p className="text-dark-400 text-xs">{desc}</p>
      </div>
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
        connected ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} ${connected ? 'animate-pulse' : ''}`} />
        <span className={`text-[10px] font-mono ${connected ? 'text-green-400' : 'text-red-400'}`}>
          {connected ? 'CONNECTED' : 'NOT SET'}
        </span>
      </div>
    </div>
  )
}

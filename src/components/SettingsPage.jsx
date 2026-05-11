import { useState, useEffect } from 'react'
import {
  User, Bell, Database, LogOut, ChevronRight, Shield,
  Smartphone, Plus, Copy, ToggleLeft, ToggleRight,
  RefreshCw, MapPin, AlertCircle, Users, Download
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchSalesmanCodes,
  createSalesmanCode,
  toggleSalesmanActive,
  logoutSession
} from '../lib/supabase'

const COLOR_OPTIONS = [
  { label: 'Gold',   value: '#F59E0B' },
  { label: 'Blue',   value: '#3B82F6' },
  { label: 'Green',  value: '#10B981' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Pink',   value: '#EC4899' },
]

export default function SettingsPage({ user, isDemoMode, items, onLogout, onBack, onClearData }) {
  const [activeSection, setActiveSection] = useState(null) // null | 'salesman'
  const [salesmen, setSalesmen]     = useState([])
  const [smLoading, setSmLoading]   = useState(false)
  const [creating, setCreating]     = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [newCode, setNewCode]       = useState(null)
  const [form, setForm]             = useState({ label: '', city: '', avatar: '', color: '#F59E0B' })

  // Load salesman codes when section opens
  useEffect(() => {
    if (activeSection === 'salesman') loadSalesmen()
  }, [activeSection])

  const loadSalesmen = async () => {
    setSmLoading(true)
    const { data, error } = await fetchSalesmanCodes()
    if (!error) setSalesmen(data)
    else toast.error('Load nahi hua')
    setSmLoading(false)
  }

  const handleCreate = async () => {
    if (!form.label.trim() || !form.city.trim()) {
      toast.error('Naam aur city required hain')
      return
    }
    setCreating(true)
    const avatar = form.avatar.trim() || form.label.trim()[0].toUpperCase()
    const { data, error, code } = await createSalesmanCode({ ...form, avatar })
    setCreating(false)
    if (error) { toast.error('Code nahi bana. Try again.'); return }
    setNewCode(code)
    toast.success('✓ Salesman code ban gaya!')
    setShowForm(false)
    setForm({ label: '', city: '', avatar: '', color: '#F59E0B' })
    loadSalesmen()
  }

  const handleToggle = async (id, currentActive, label) => {
    const msg = currentActive
      ? `"${label}" ko DISABLE karna chahte ho? Wo turant logout ho jayega.`
      : `"${label}" ko ENABLE karna chahte ho?`
    if (!window.confirm(msg)) return
    const { error } = await toggleSalesmanActive(id, !currentActive)
    if (error) { toast.error('Update nahi hua'); return }
    toast.success(currentActive ? `${label} disabled ✓` : `${label} enabled ✓`)
    loadSalesmen()
  }

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code)
      .then(() => toast.success('Code copy ho gaya!'))
      .catch(() => toast.error('Manual copy karo: ' + code))
  }

  const handleLogout = async () => {
    await logoutSession()
    if (onLogout) onLogout()
    else window.location.reload()
  }

  const exportCSV = () => {
    const headers = ['Medicine Name', 'Batch No', 'Expiry', 'Quantity', 'MRP']
    const rows = items.map(i => [
      i.medicine_name, i.batch_no || '', i.expiry_date || '', i.quantity, i.unit_price || ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cma-inventory-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported!')
  }

  // ── Salesman Manager Section ─────────────────────────────────────
  if (activeSection === 'salesman') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-white/5">
          <button
            onClick={() => { setActiveSection(null); setNewCode(null); setShowForm(false) }}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4 text-gray-400 rotate-180" />
          </button>
          <div>
            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Admin Panel</p>
            <h1 className="text-white text-xl font-bold tracking-wide">Salesman Codes</h1>
          </div>
          <button onClick={loadSalesmen} className="ml-auto w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">

          {/* New code success alert */}
          {newCode && (
            <div className="bg-green-950/40 border border-green-500/30 rounded-2xl p-4">
              <p className="text-green-400 text-[10px] font-mono tracking-widest mb-2">✓ NAYA CODE READY — ABHI COPY KARO</p>
              <div className="flex items-center gap-3 bg-black/40 rounded-xl p-3">
                <span className="text-white font-mono text-lg font-bold tracking-widest flex-1">{newCode}</span>
                <button onClick={() => copyCode(newCode)} className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                  <Copy className="w-4 h-4 text-gray-300" />
                </button>
              </div>
              <p className="text-gray-600 text-xs mt-2">Salesman ko WhatsApp karo. App mein save mat karo.</p>
              <button onClick={() => setNewCode(null)} className="text-gray-600 text-xs mt-2 underline">Dismiss</button>
            </div>
          )}

          {/* Add button */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-2xl py-4 flex items-center justify-center gap-2 text-yellow-500 font-bold text-sm active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" /> Naya Salesman Add Karo
          </button>

          {/* Create form */}
          {showForm && (
            <div className="bg-[#0a0a0a] border border-white/8 rounded-2xl p-4 space-y-4">
              <p className="text-white font-bold text-sm">Salesman Details</p>

              {/* Name */}
              <div className="space-y-1">
                <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">Naam *</p>
                <div className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
                  <User className="w-4 h-4 text-gray-600 shrink-0" />
                  <input
                    className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-gray-700"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. Rahul"
                  />
                </div>
              </div>

              {/* City */}
              <div className="space-y-1">
                <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">City *</p>
                <div className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
                  <MapPin className="w-4 h-4 text-gray-600 shrink-0" />
                  <input
                    className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-gray-700"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="e.g. Bhopal"
                  />
                </div>
              </div>

              {/* Avatar */}
              <div className="space-y-1">
                <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">Avatar Letter (optional)</p>
                <div className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
                  <input
                    className="bg-transparent outline-none text-white text-lg font-bold font-mono w-10 text-center placeholder:text-gray-700"
                    value={form.avatar}
                    maxLength={1}
                    onChange={e => setForm(f => ({ ...f, avatar: e.target.value.toUpperCase() }))}
                    placeholder="R"
                  />
                  <p className="text-gray-600 text-xs">Naam ka pehla letter auto-fill hoga</p>
                </div>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">Color</p>
                <div className="flex gap-3">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setForm(f => ({ ...f, color: c.value }))}
                      style={{ background: c.value }}
                      className={`w-8 h-8 rounded-lg transition-all ${form.color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 bg-yellow-500 text-black font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
                >
                  {creating ? 'Ban raha hai...' : '✓ Code Banao'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-white/5 border border-white/10 text-gray-400 py-3 px-5 rounded-xl text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Salesman list */}
          {smLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : salesmen.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">
              Koi salesman nahi. Upar se add karo.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">{salesmen.length} Salesmen</p>
              {salesmen.map(s => (
                <div
                  key={s.id}
                  className={`bg-[#0a0a0a] rounded-2xl p-4 border transition-all ${s.is_active ? 'border-white/6' : 'border-red-500/20 opacity-60'}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      style={{ background: s.color || '#F59E0B' }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-bold text-base shrink-0"
                    >
                      {s.avatar || s.label[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{s.label}</p>
                      <p className="text-gray-600 text-xs">{s.city || '—'}</p>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(s.id, s.is_active, s.label)}
                      className={s.is_active ? 'text-green-400' : 'text-red-400'}
                    >
                      {s.is_active
                        ? <ToggleRight className="w-8 h-8" />
                        : <ToggleLeft className="w-8 h-8" />
                      }
                    </button>
                  </div>

                  {/* Code row */}
                  <div className="mt-3 flex items-center gap-3 bg-black/40 rounded-xl px-3 py-2">
                    <span className="text-yellow-500 font-mono text-sm font-bold tracking-widest flex-1">{s.code}</span>
                    <button onClick={() => copyCode(s.code)}>
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  {!s.is_active && (
                    <div className="mt-2 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-red-400" />
                      <span className="text-red-400 text-[10px] font-mono">DISABLED — Login blocked</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info footer */}
          <div className="bg-white/2 border border-white/5 rounded-xl p-3 space-y-1">
            <p className="text-gray-700 text-[10px] font-mono leading-relaxed">
              ⚡ Toggle OFF → salesman turant logout + future login block<br />
              🔑 Code format: NAME-CITY-RANDOM (e.g. RAH-BPL-7741)<br />
              📋 Naya code sirf ek baar dikhega — copy karke do
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main Settings ────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      <div className="px-4 pt-4 pb-2">
        <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">App</p>
        <h1 className="text-white text-3xl font-bold tracking-widest">SETTINGS</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-4">

        {/* Profile card */}
        <div className="bg-[#0a0a0a] rounded-2xl p-4 border border-white/6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
            <User className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-white font-semibold">{user?.label || 'Admin'}</p>
            <p className="text-gray-500 text-xs font-mono">Capital Medical Agency</p>
          </div>
          <div className="ml-auto bg-yellow-900/20 border border-yellow-500/20 rounded-lg px-2 py-1">
            <p className="text-yellow-500 text-[10px] font-mono">ADMIN</p>
          </div>
        </div>

        {/* Salesman Manager — main feature */}
        <button
          onClick={() => setActiveSection('salesman')}
          className="w-full bg-[#0a0a0a] border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-semibold text-sm">Salesman Manage Karo</p>
            <p className="text-gray-500 text-xs mt-0.5">Codes add / disable / copy karo</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        {/* Security */}
        <div className="bg-[#0a0a0a] border border-white/6 rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-gray-500" />
            <p className="text-white font-semibold text-sm">Security</p>
          </div>
          <div className="text-gray-600 text-xs font-mono space-y-1 leading-relaxed pl-8">
            <p>✓ DB-backed token authentication</p>
            <p>✓ Auto-lock on key change</p>
            <p>✓ Session expires in 30 days</p>
            <p>✓ Salesman codes isolated</p>
          </div>
        </div>

        {/* Export */}
        <button
          onClick={exportCSV}
          className="w-full bg-[#0a0a0a] border border-white/6 rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-semibold text-sm">Export Inventory CSV</p>
            <p className="text-gray-500 text-xs mt-0.5">Excel mein open kar sakte ho</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        {/* PWA Install */}
        <button
          onClick={() => toast('Browser menu → "Add to Home Screen"', { icon: '📱', duration: 4000 })}
          className="w-full bg-[#0a0a0a] border border-white/6 rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-semibold text-sm">Install App (PWA)</p>
            <p className="text-gray-500 text-xs mt-0.5">Home screen pe add karo</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-950/20 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-red-400 font-semibold text-sm">Logout</p>
            <p className="text-gray-600 text-xs mt-0.5">Session terminate hoga</p>
          </div>
        </button>

        <p className="text-center text-gray-800 text-[10px] font-mono uppercase tracking-widest pb-4">
          Capital Medical Agency v2.0 • Bhopal
        </p>
      </div>
    </div>
  )
}

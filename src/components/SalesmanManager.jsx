// ─── src/components/SalesmanManager.jsx ──────────────────────────────────────
// Admin ke liye — salesman codes manage karna (create, disable, view)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Plus, Copy, ToggleLeft, ToggleRight, RefreshCw, User, MapPin, Shield, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchSalesmanCodes, createSalesmanCode, toggleSalesmanActive } from '../lib/supabase'

const COLOR_OPTIONS = [
  { label: 'Gold',    value: '#F59E0B' },
  { label: 'Blue',    value: '#3B82F6' },
  { label: 'Green',   value: '#10B981' },
  { label: 'Purple',  value: '#8B5CF6' },
  { label: 'Pink',    value: '#EC4899' },
]

export default function SalesmanManager() {
  const [salesmen, setSalesmen]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ label: '', city: '', avatar: '', color: '#F59E0B' })
  const [newCode, setNewCode]     = useState(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await fetchSalesmanCodes()
    if (!error) setSalesmen(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.label.trim() || !form.city.trim()) {
      toast.error('Naam aur city dono required hain')
      return
    }
    setCreating(true)
    const avatar = form.avatar.trim() || form.label.trim()[0].toUpperCase()
    const { data, error, code } = await createSalesmanCode({ ...form, avatar })
    setCreating(false)
    if (error) { toast.error('Code create nahi hua. Try again.'); return }
    setNewCode(code)
    toast.success('Salesman code ban gaya!')
    setShowForm(false)
    setForm({ label: '', city: '', avatar: '', color: '#F59E0B' })
    load()
  }

  const handleToggle = async (id, currentActive) => {
    const msg = currentActive
      ? 'Iss salesman ko DISABLE karna chahte ho? Wo turant logout ho jayega.'
      : 'Iss salesman ko ENABLE karna chahte ho?'
    if (!window.confirm(msg)) return

    const { error } = await toggleSalesmanActive(id, !currentActive)
    if (error) { toast.error('Update nahi hua'); return }
    toast.success(currentActive ? 'Salesman disabled — auto-logout hua!' : 'Salesman enabled!')
    load()
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => toast.success('Code copy ho gaya!'))
  }

  return (
    <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ color: '#F59E0B', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>ADMIN PANEL</div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Salesman Codes</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={btnGhost}><RefreshCw size={14} /></button>
          <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
            <Plus size={14} /> Naya Add
          </button>
        </div>
      </div>

      {/* New code alert */}
      {newCode && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ color: '#10B981', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 }}>✓ NAYA CODE READY — SIRF EK BAAR DIKHEGA</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: 18, fontWeight: 800, letterSpacing: 2 }}>{newCode}</span>
            <button onClick={() => copyCode(newCode)} style={{ ...btnGhost, padding: '6px 10px' }}>
              <Copy size={14} />
            </button>
          </div>
          <div style={{ color: '#6B7280', fontSize: 11, marginTop: 6 }}>Yeh code salesman ko WhatsApp ya personally do. App mein save mat karo.</div>
          <button onClick={() => setNewCode(null)} style={{ marginTop: 8, color: '#6B7280', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <div style={{ color: '#fff', fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Naya Salesman Add Karo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="Naam (e.g. Rahul)" icon={<User size={13} />}>
              <input style={inputStyle} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Salesman ka naam" />
            </Field>
            <Field label="City" icon={<MapPin size={13} />}>
              <input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Bhopal" />
            </Field>
            <Field label="Avatar Letter (optional)" icon={<Shield size={13} />}>
              <input style={{ ...inputStyle, maxWidth: 60, textAlign: 'center', letterSpacing: 2 }} value={form.avatar} maxLength={1} onChange={e => setForm(f => ({ ...f, avatar: e.target.value.toUpperCase() }))} placeholder="R" />
            </Field>
            <div>
              <div style={fieldLabel}>Color</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} onClick={() => setForm(f => ({ ...f, color: c.value }))}
                    style={{ width: 28, height: 28, borderRadius: 8, background: c.value, border: form.color === c.value ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={handleCreate} disabled={creating}>
              {creating ? 'Ban raha hai...' : '✓ Code Banao'}
            </button>
            <button style={btnGhost} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#4B5563', fontSize: 13 }}>Loading...</div>
      ) : salesmen.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#4B5563', fontSize: 13 }}>
          Koi salesman nahi. "Naya Add" karo.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {salesmen.map(s => (
            <div key={s.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.is_active ? 'rgba(255,255,255,0.07)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 18, padding: '14px 16px', opacity: s.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Avatar */}
                <div style={{ width: 40, height: 40, borderRadius: 12, background: s.color || '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  {s.avatar || s.label[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                  <div style={{ color: '#6B7280', fontSize: 11 }}>{s.city || '—'}</div>
                </div>
                {/* Toggle */}
                <button onClick={() => handleToggle(s.id, s.is_active)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.is_active ? '#10B981' : '#EF4444' }}>
                  {s.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>

              {/* Code row */}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '8px 12px' }}>
                <span style={{ color: '#F59E0B', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: 1, flex: 1 }}>
                  {s.code}
                </span>
                <button onClick={() => copyCode(s.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                  <Copy size={13} />
                </button>
              </div>

              {!s.is_active && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4, alignItems: 'center' }}>
                  <AlertCircle size={11} color="#EF4444" />
                  <span style={{ color: '#EF4444', fontSize: 10, fontFamily: 'monospace' }}>DISABLED — Login blocked, all sessions terminated</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, color: '#374151', fontSize: 11, lineHeight: 1.6, fontFamily: 'monospace' }}>
        ⚡ Toggle OFF → salesman turant logout + future login block<br/>
        🔑 Codes generate hote hain: NAME-CITY-RANDOM format mein<br/>
        📋 Code sirf ek baar dikhega — copy karke salesman ko do
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Field({ label, icon, children }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px', marginTop: 4 }}>
        <span style={{ color: '#6B7280' }}>{icon}</span>
        {children}
      </div>
    </div>
  )
}

const fieldLabel = { color: '#4B5563', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, fontWeight: 700 }
const inputStyle = { flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }
const btnPrimary = { background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', borderRadius: 12, padding: '10px 16px', color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
const btnGhost   = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }

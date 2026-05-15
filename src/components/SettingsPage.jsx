// ─── src/components/SettingsPage.jsx — Phase 4 Complete ─────────────────────
import { useState, useEffect } from 'react'
import {
  User, LogOut, ChevronRight, Shield, Smartphone, Plus,
  Copy, ToggleLeft, ToggleRight, RefreshCw, MapPin, AlertCircle,
  Users, Download, Brain, ShoppingCart, FileText, Scan,
  ChevronLeft, BarChart2, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchSalesmanCodes, createSalesmanCode,
  toggleSalesmanActive, logoutSession
} from '../lib/supabase'
import SmartReorder from './SmartReorder'
import TaxReports   from './TaxReports'
import BarcodeScanner from './BarcodeScanner'

const COLOR_OPTIONS = [
  { value:'#F59E0B', label:'Gold'   },
  { value:'#3B82F6', label:'Blue'   },
  { value:'#10B981', label:'Green'  },
  { value:'#8B5CF6', label:'Purple' },
  { value:'#EC4899', label:'Pink'   },
]

export default function SettingsPage({ user, items = [], orders = [], onLogout, onBack, onClearData }) {
  const [section,  setSection]  = useState(null)

  // Salesman state
  const [salesmen,  setSalesmen]  = useState([])
  const [smLoading, setSmLoading] = useState(false)
  const [creating,  setCreating]  = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [newCode,   setNewCode]   = useState(null)
  const [form,      setForm]      = useState({label:'',city:'',avatar:'',color:'#F59E0B'})
  const [showBarcode, setShowBarcode] = useState(false)

  useEffect(() => { if (section==='salesman') loadSalesmen() }, [section])

  const loadSalesmen = async () => {
    setSmLoading(true)
    const { data } = await fetchSalesmanCodes()
    setSalesmen(data || [])
    setSmLoading(false)
  }

  const handleCreate = async () => {
    if (!form.label.trim()||!form.city.trim()) { toast.error('Naam aur city required'); return }
    setCreating(true)
    const { data, error, code } = await createSalesmanCode({ ...form, avatar: form.avatar||form.label[0].toUpperCase() })
    setCreating(false)
    if (error) { toast.error('Code nahi bana'); return }
    setNewCode(code); setShowForm(false)
    setForm({label:'',city:'',avatar:'',color:'#F59E0B'})
    toast.success('Code ready! ✓')
    loadSalesmen()
  }

  const handleToggle = async (id, cur, label) => {
    if (!window.confirm(cur?`"${label}" disable karna chahte ho? Turant logout hoga.`:`"${label}" enable karna chahte ho?`)) return
    const { error } = await toggleSalesmanActive(id, !cur)
    if (error) { toast.error('Update nahi hua'); return }
    toast.success(cur?`${label} disabled`:`${label} enabled`)
    loadSalesmen()
  }

  const handleLogout = async () => { await logoutSession(); onLogout?.() }

  // Sub-sections
  if (section === 'salesman') return <SalesmanSection salesmen={salesmen} smLoading={smLoading} showForm={showForm} setShowForm={setShowForm} form={form} setForm={setForm} creating={creating} handleCreate={handleCreate} handleToggle={handleToggle} newCode={newCode} setNewCode={setNewCode} onBack={()=>setSection(null)} loadSalesmen={loadSalesmen}/>
  if (section === 'reorder')  return <SmartReorder  items={items} orders={orders} onBack={()=>setSection(null)}/>
  if (section === 'tax')      return <TaxReports    orders={orders} stockItems={items} onBack={()=>setSection(null)}/>

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#040407' }}>

      {/* Barcode scanner overlay */}
      {showBarcode && <BarcodeScanner items={items} onClose={()=>setShowBarcode(false)} onItemFound={(item,code)=>{ toast.success(`${item.medicine_name} — Stock: ${item.quantity}`); }} mode="lookup"/>}

      {/* Header */}
      <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace', letterSpacing:3 }}>ADMIN</div>
        <div style={{ color:'#fff', fontSize:22, fontFamily:'Space Grotesk,sans-serif', fontWeight:800, letterSpacing:1 }}>SETTINGS</div>
      </div>

      <div style={{ flex:1,overflowY:'auto',padding:'14px 14px 100px' }}>

        {/* Profile */}
        <div style={{ background:'rgba(10,12,18,1)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:18,padding:'16px',marginBottom:16,display:'flex',alignItems:'center',gap:14 }}>
          <div style={{ width:48,height:48,borderRadius:16,background:'rgba(0,229,255,0.08)',border:'1px solid rgba(0,229,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <User size={24} color="#00E5FF"/>
          </div>
          <div>
            <div style={{ color:'#fff',fontWeight:700,fontSize:15 }}>{user?.label||'Admin'}</div>
            <div style={{ color:'rgba(255,255,255,0.3)',fontSize:11,fontFamily:'monospace' }}>Capital Medical Agency · Bhopal</div>
          </div>
          <div style={{ marginLeft:'auto',background:'rgba(0,229,255,0.08)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:8,padding:'4px 10px' }}>
            <span style={{ color:'#00E5FF',fontSize:9,fontFamily:'monospace',fontWeight:700 }}>ADMIN</span>
          </div>
        </div>

        {/* Phase 4 Features */}
        <div style={{ color:'rgba(255,255,255,0.2)',fontSize:9,fontFamily:'monospace',letterSpacing:3,marginBottom:10 }}>PHASE 4 · AI FEATURES</div>

        <MenuCard
          icon={<Brain size={20} color="#00E5FF"/>}
          iconBg="rgba(0,229,255,0.08)"
          iconBorder="rgba(0,229,255,0.2)"
          title="Smart Reorder (AI)"
          sub="AI purchase suggestions + WhatsApp PO"
          badge="AI"
          badgeColor="#00E5FF"
          onClick={()=>setSection('reorder')}
        />

        <MenuCard
          icon={<FileText size={20} color="#FFD700"/>}
          iconBg="rgba(255,215,0,0.08)"
          iconBorder="rgba(255,215,0,0.2)"
          title="GST & Tax Reports"
          sub="GSTR-1 export, HSN summary — CA-ready"
          badge="NEW"
          badgeColor="#FFD700"
          onClick={()=>setSection('tax')}
        />

        <MenuCard
          icon={<Scan size={20} color="#8B5CF6"/>}
          iconBg="rgba(139,92,246,0.08)"
          iconBorder="rgba(139,92,246,0.2)"
          title="Barcode Scanner"
          sub="Medicine lookup by barcode/QR"
          badge="NEW"
          badgeColor="#8B5CF6"
          onClick={()=>setShowBarcode(true)}
        />

        <div style={{ color:'rgba(255,255,255,0.2)',fontSize:9,fontFamily:'monospace',letterSpacing:3,margin:'16px 0 10px' }}>MANAGEMENT</div>

        <MenuCard
          icon={<Users size={20} color="#F59E0B"/>}
          iconBg="rgba(245,158,11,0.08)"
          iconBorder="rgba(245,158,11,0.2)"
          title="Salesman Codes"
          sub="Add, disable, manage field team"
          onClick={()=>setSection('salesman')}
        />

        <MenuCard
          icon={<Download size={20} color="rgba(255,255,255,0.5)"/>}
          iconBg="rgba(255,255,255,0.04)"
          iconBorder="rgba(255,255,255,0.08)"
          title="Export Inventory CSV"
          sub="Excel mein open kar sakte ho"
          onClick={()=>{
            const headers=['Medicine Name','Batch No','Expiry','Qty','MRP','GST%','Supplier']
            const rows=items.map(i=>[i.medicine_name,i.batch_no||'',i.expiry_date||'',i.quantity,i.unit_price||0,i.gst_percent||'',i.supplier||''])
            const csv=[headers,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n')
            const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`cma-inventory-${new Date().toISOString().slice(0,10)}.csv`;a.click()
            toast.success('CSV exported!')
          }}
        />

        <MenuCard
          icon={<Smartphone size={20} color="rgba(255,255,255,0.5)"/>}
          iconBg="rgba(255,255,255,0.04)"
          iconBorder="rgba(255,255,255,0.08)"
          title="Install App (PWA)"
          sub="Home screen pe add karo"
          onClick={()=>toast('Browser menu → "Add to Home Screen"',{icon:'📱',duration:4000})}
        />

        <div style={{ color:'rgba(255,255,255,0.2)',fontSize:9,fontFamily:'monospace',letterSpacing:3,margin:'16px 0 10px' }}>SECURITY</div>

        <div style={{ background:'rgba(10,12,18,1)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:16,padding:'14px 16px',marginBottom:10 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
            <Shield size={16} color="rgba(255,255,255,0.4)"/>
            <span style={{ color:'rgba(255,255,255,0.6)',fontSize:13,fontWeight:600 }}>Security Status</span>
          </div>
          {['✓ Supabase token auth','✓ Auto-lock on key change','✓ RLS enabled','✓ Session expires 30 days','✓ Salesman codes isolated'].map(item=>(
            <div key={item} style={{ color:'rgba(0,255,136,0.5)',fontSize:11,fontFamily:'monospace',padding:'3px 0' }}>{item}</div>
          ))}
        </div>

        {/* Logout */}
        <button onClick={handleLogout} style={{ width:'100%',background:'rgba(255,77,109,0.06)',border:'1px solid rgba(255,77,109,0.15)',borderRadius:18,padding:'16px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',marginBottom:8 }}>
          <div style={{ width:44,height:44,borderRadius:14,background:'rgba(255,77,109,0.08)',border:'1px solid rgba(255,77,109,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <LogOut size={20} color="#FF4D6D"/>
          </div>
          <div style={{ textAlign:'left' }}>
            <div style={{ color:'#FF4D6D',fontWeight:700,fontSize:14 }}>Logout</div>
            <div style={{ color:'rgba(255,255,255,0.3)',fontSize:11 }}>Session terminate hoga</div>
          </div>
        </button>

        <div style={{ textAlign:'center',color:'rgba(255,255,255,0.1)',fontSize:10,fontFamily:'monospace',letterSpacing:2,marginTop:12 }}>
          CAPITAL MEDICAL AGENCY v4.0 · AI OS
        </div>
      </div>
    </div>
  )
}

// ── Menu Card ─────────────────────────────────────────────────────────────────
function MenuCard({ icon, iconBg, iconBorder, title, sub, badge, badgeColor, onClick }) {
  return (
    <button onClick={onClick} style={{ width:'100%',background:'rgba(10,12,18,1)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:18,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',marginBottom:8,textAlign:'left',transition:'background 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
      onMouseLeave={e=>e.currentTarget.style.background='rgba(10,12,18,1)'}
    >
      <div style={{ width:44,height:44,borderRadius:14,background:iconBg,border:`1px solid ${iconBorder}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:2 }}>
          <span style={{ color:'#fff',fontWeight:700,fontSize:14 }}>{title}</span>
          {badge && <span style={{ background:`${badgeColor}18`,border:`1px solid ${badgeColor}30`,color:badgeColor,fontSize:8,fontFamily:'monospace',fontWeight:700,padding:'2px 6px',borderRadius:6 }}>{badge}</span>}
        </div>
        <div style={{ color:'rgba(255,255,255,0.35)',fontSize:12 }}>{sub}</div>
      </div>
      <ChevronRight size={16} color="rgba(255,255,255,0.2)"/>
    </button>
  )
}

// ── Salesman Section ──────────────────────────────────────────────────────────
function SalesmanSection({ salesmen, smLoading, showForm, setShowForm, form, setForm, creating, handleCreate, handleToggle, newCode, setNewCode, onBack, loadSalesmen }) {
  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#040407' }}>
      <div style={{ padding:'16px 16px 12px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',gap:12 }}>
        <button onClick={onBack} style={{ width:36,height:36,borderRadius:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <ChevronLeft size={18} color="rgba(255,255,255,0.6)"/>
        </button>
        <div>
          <div style={{ color:'rgba(255,255,255,0.3)',fontSize:9,fontFamily:'monospace',letterSpacing:3 }}>MANAGEMENT</div>
          <div style={{ color:'#fff',fontSize:18,fontFamily:'Space Grotesk,sans-serif',fontWeight:800 }}>SALESMAN CODES</div>
        </div>
        <button onClick={loadSalesmen} style={{ marginLeft:'auto',width:34,height:34,borderRadius:10,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <RefreshCw size={14} color="rgba(255,255,255,0.4)"/>
        </button>
      </div>

      <div style={{ flex:1,overflowY:'auto',padding:'14px 14px 100px' }}>

        {/* New code alert */}
        {newCode && (
          <div style={{ background:'rgba(0,255,136,0.06)',border:'1px solid rgba(0,255,136,0.2)',borderRadius:18,padding:'14px 16px',marginBottom:14 }}>
            <div style={{ color:'#00FF88',fontSize:9,fontFamily:'monospace',letterSpacing:2,marginBottom:8 }}>✓ CODE READY — ABHI COPY KARO</div>
            <div style={{ display:'flex',alignItems:'center',gap:10,background:'rgba(0,0,0,0.3)',borderRadius:12,padding:'10px 14px' }}>
              <span style={{ color:'#fff',fontFamily:'monospace',fontSize:18,fontWeight:800,letterSpacing:3,flex:1 }}>{newCode}</span>
              <button onClick={()=>navigator.clipboard?.writeText(newCode).then(()=>toast.success('Copied!'))} style={{ background:'none',border:'none',cursor:'pointer' }}>
                <Copy size={16} color="#00FF88"/>
              </button>
            </div>
            <div style={{ color:'rgba(255,255,255,0.3)',fontSize:11,marginTop:8 }}>Salesman ko WhatsApp karo. App mein save mat karo.</div>
            <button onClick={()=>setNewCode(null)} style={{ color:'rgba(255,255,255,0.2)',fontSize:11,background:'none',border:'none',cursor:'pointer',marginTop:6 }}>Dismiss</button>
          </div>
        )}

        {/* Add button */}
        <button onClick={()=>setShowForm(!showForm)} style={{ width:'100%',background:'rgba(0,229,255,0.06)',border:'1px solid rgba(0,229,255,0.15)',borderRadius:18,padding:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:10,cursor:'pointer',marginBottom:12 }}>
          <Plus size={16} color="#00E5FF"/>
          <span style={{ color:'#00E5FF',fontWeight:700,fontSize:13 }}>Naya Salesman Add Karo</span>
        </button>

        {/* Form */}
        {showForm && (
          <div style={{ background:'rgba(10,12,18,1)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:'18px',marginBottom:14 }}>
            {[['Naam *','label','Rahul'],['City *','city','Bhopal'],['Avatar Letter','avatar','R']].map(([label,key,ph])=>(
              <div key={key} style={{ marginBottom:12 }}>
                <div style={{ color:'rgba(255,255,255,0.3)',fontSize:9,fontFamily:'monospace',letterSpacing:2,marginBottom:5 }}>{label.toUpperCase()}</div>
                <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} maxLength={key==='avatar'?1:50}
                  style={{ width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'10px 14px',color:'#fff',fontSize:13,outline:'none' }}/>
              </div>
            ))}
            <div style={{ marginBottom:14 }}>
              <div style={{ color:'rgba(255,255,255,0.3)',fontSize:9,fontFamily:'monospace',letterSpacing:2,marginBottom:8 }}>COLOR</div>
              <div style={{ display:'flex',gap:8 }}>
                {COLOR_OPTIONS.map(c=>(
                  <button key={c.value} onClick={()=>setForm(p=>({...p,color:c.value}))}
                    style={{ width:30,height:30,borderRadius:8,background:c.value,border:form.color===c.value?'3px solid #fff':'2px solid transparent',cursor:'pointer' }}/>
                ))}
              </div>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={handleCreate} disabled={creating} style={{ flex:1,background:'linear-gradient(135deg,#00B8D9,#0070F3)',border:'none',borderRadius:12,padding:'12px',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',opacity:creating?0.6:1 }}>
                {creating?'Ban raha hai...':'✓ Code Banao'}
              </button>
              <button onClick={()=>setShowForm(false)} style={{ padding:'12px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,color:'rgba(255,255,255,0.4)',cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Salesman list */}
        {smLoading ? (
          <div style={{ textAlign:'center',padding:40,color:'rgba(255,255,255,0.3)',fontSize:13 }}>Loading...</div>
        ) : salesmen.length===0 ? (
          <div style={{ textAlign:'center',padding:40,color:'rgba(255,255,255,0.2)',fontSize:13 }}>Koi salesman nahi. Add karo.</div>
        ) : salesmen.map(s=>(
          <div key={s.id} style={{ background:'rgba(10,12,18,1)',border:`1px solid ${s.is_active?'rgba(255,255,255,0.06)':'rgba(255,77,109,0.15)'}`,borderRadius:18,padding:'14px 16px',marginBottom:10,opacity:s.is_active?1:0.55 }}>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:10 }}>
              <div style={{ width:40,height:40,borderRadius:12,background:s.color||'#F59E0B',display:'flex',alignItems:'center',justifyContent:'center',color:'#000',fontWeight:800,fontSize:16,flexShrink:0 }}>
                {s.avatar||s.label[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:'#fff',fontWeight:700,fontSize:14 }}>{s.label}</div>
                <div style={{ color:'rgba(255,255,255,0.3)',fontSize:11 }}>{s.city||'—'}</div>
              </div>
              <button onClick={()=>handleToggle(s.id,s.is_active,s.label)} style={{ background:'none',border:'none',cursor:'pointer',color:s.is_active?'#00FF88':'#FF4D6D' }}>
                {s.is_active?<ToggleRight size={28}/>:<ToggleLeft size={28}/>}
              </button>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,0.3)',borderRadius:10,padding:'8px 12px' }}>
              <span style={{ color:'#FFD700',fontFamily:'monospace',fontSize:13,fontWeight:700,letterSpacing:1,flex:1 }}>{s.code}</span>
              <button onClick={()=>navigator.clipboard?.writeText(s.code).then(()=>toast.success('Copied!'))} style={{ background:'none',border:'none',cursor:'pointer' }}>
                <Copy size={13} color="rgba(255,255,255,0.3)"/>
              </button>
            </div>
            {!s.is_active&&<div style={{ display:'flex',alignItems:'center',gap:4,marginTop:8 }}><AlertCircle size={11} color="#FF4D6D"/><span style={{ color:'#FF4D6D',fontSize:10,fontFamily:'monospace' }}>DISABLED — Login blocked</span></div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── src/components/Dashboard.jsx — Premium UI v4.0 ──────────────────────────
// LOGIC UNTOUCHED — Only UI upgraded to match reference screenshot
import { useMemo, useState, useEffect, useRef } from 'react'
import {
  ChevronRight, AlertCircle, FileOutput, X, Check,
  Truck, Loader, CheckCircle2, Users, Bell, BarChart2,
  IndianRupee, User, Pill, ChevronDown
} from 'lucide-react'
import {
  getStockStatus, formatExpiry, formatCurrency,
  calculateTotalStockValue, getExpiringItems,
  getLowStockItems, getDaysToExpiry
} from '../lib/stockUtils'
import { updateOrderStatus } from '../lib/supabase'

// ─── Medicine form → icon emoji ───────────────────────────────────────────────
function MedIcon({ name = '', form = '' }) {
  const n = (name + form).toLowerCase()
  let emoji = '💊'; let bg = 'rgba(0,229,255,0.08)'; let border = 'rgba(0,229,255,0.2)'
  if (n.includes('syrup')||n.includes('liquid')||n.includes('ml'))         { emoji='🍶'; bg='rgba(255,140,66,0.1)';  border='rgba(255,140,66,0.25)' }
  else if (n.includes('inject')||n.includes('iv')||n.includes('vial'))      { emoji='💉'; bg='rgba(0,255,136,0.08)';  border='rgba(0,255,136,0.2)'  }
  else if (n.includes('capsule')||n.includes('cap'))                         { emoji='🔴'; bg='rgba(255,77,109,0.08)'; border='rgba(255,77,109,0.2)' }
  else if (n.includes('cream')||n.includes('ointment')||n.includes('gel'))  { emoji='🧴'; bg='rgba(139,92,246,0.08)'; border='rgba(139,92,246,0.2)' }
  else if (n.includes('drop'))                                               { emoji='💧'; bg='rgba(0,229,255,0.1)';   border='rgba(0,229,255,0.25)' }
  return (
    <div style={{
      width:42, height:42, borderRadius:12, flexShrink:0,
      background:bg, border:`1px solid ${border}`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:20,
    }}>
      {emoji}
    </div>
  )
}

// ─── Barcode aesthetic ────────────────────────────────────────────────────────
const BARCODE_HEIGHTS = [10,14,8,12,10,14,6,12,10,8,14,10,12,6,14,10,8,12]
function Barcode() {
  return (
    <div className="barcode-lines" style={{ color:'rgba(255,255,255,0.4)' }}>
      {BARCODE_HEIGHTS.map((h,i) => <span key={i} style={{ height:h }} />)}
    </div>
  )
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ color = '#00FF88', data }) {
  const pts = data || [30,45,38,55,48,62,58,70,65,80]
  const max = Math.max(...pts), min = Math.min(...pts)
  const W=80, H=28
  const coords = pts.map((v,i) => [
    (i/(pts.length-1))*W,
    H - ((v-min)/(max-min||1)) * H * 0.85
  ])
  const d = coords.map((p,i) => `${i===0?'M':'L'}${p[0]},${p[1]}`).join(' ')
  const fill = coords.map((p,i) => `${i===0?'M':'L'}${p[0]},${p[1]}`).join(' ') + ` L${W},${H} L0,${H} Z`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${color.replace('#','')})`}/>
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Network animation (scanner bg) ──────────────────────────────────────────
const NODES = [
  {x:'78%',y:'15%',s:4,delay:'0s'},{x:'85%',y:'40%',s:3,delay:'0.5s'},
  {x:'68%',y:'60%',s:5,delay:'1s'},{x:'90%',y:'70%',s:2,delay:'1.5s'},
  {x:'75%',y:'85%',s:3,delay:'0.3s'},{x:'55%',y:'30%',s:2,delay:'0.8s'},
]

function NetworkBg() {
  return (
    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.25}} viewBox="0 0 300 120">
      {/* Lines */}
      <line x1="234" y1="18"  x2="255" y2="48"  stroke="#00E5FF" strokeWidth="0.5" opacity="0.4"/>
      <line x1="255" y1="48"  x2="204" y2="72"  stroke="#00E5FF" strokeWidth="0.5" opacity="0.4"/>
      <line x1="204" y1="72"  x2="270" y2="84"  stroke="#00E5FF" strokeWidth="0.5" opacity="0.3"/>
      <line x1="255" y1="48"  x2="270" y2="84"  stroke="#7C3AED" strokeWidth="0.5" opacity="0.3"/>
      <line x1="165" y1="36"  x2="234" y2="18"  stroke="#00E5FF" strokeWidth="0.5" opacity="0.3"/>
      <line x1="165" y1="36"  x2="204" y2="72"  stroke="#7C3AED" strokeWidth="0.5" opacity="0.2"/>
      {/* Nodes */}
      {[{x:234,y:18},{x:255,y:48},{x:204,y:72},{x:270,y:84},{x:225,y:102},{x:165,y:36}].map((n,i)=>(
        <circle key={i} cx={n.x} cy={n.y} r="2.5" fill="#00E5FF" opacity="0.6"/>
      ))}
    </svg>
  )
}

// ─── Status chip ──────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const map = {
    ok:       { cls:'chip-in-stock',  label:'IN STOCK'      },
    low:      { cls:'chip-low-stock', label:'LOW STOCK'     },
    critical: { cls:'chip-critical',  label:'CRITICAL'      },
    out:      { cls:'chip-out',       label:'OUT OF STOCK'  },
    expiring: { cls:'chip-expiring',  label:'EXPIRING SOON' },
    expired:  { cls:'chip-expired',   label:'EXPIRED'       },
  }
  const s = map[status] || map.ok
  return <span className={s.cls}>{s.label}</span>
}

const DEFAULT_COMM = 2

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Dashboard({
  items, orders = [], pendingOrderCount = 0,
  onNavigate, onMarkOrderProcessed
}) {
  const [returnNote,    setReturnNote]    = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [mainTab,       setMainTab]       = useState('dashboard')
  const [orderFilter,   setOrderFilter]   = useState('all')
  const [updatingId,    setUpdatingId]    = useState(null)

  const stats = useMemo(() => ({
    totalValue:    calculateTotalStockValue(items),
    expiringIn90:  getExpiringItems(items, 90),
    lowStockItems: getLowStockItems(items),
    actionItems:   items.filter(i => { const d=getDaysToExpiry(i.expiry_date); return d!==null && d<=90 }),
    recentBills:   items.filter(i => i.source==='ai_scan').slice(0,5).length,
  }), [items])

  const salesmanStats = useMemo(() => {
    const map = {}
    orders.forEach(o => {
      const k = o.salesman_code||o.salesman_name||'unknown'
      if (!map[k]) map[k] = { name:o.salesman_name, code:o.salesman_code, total:0, pending:0, processing:0, delivered:0, cancelled:0, totalValue:0, commission:0, customers:new Set(), lastOrder:null }
      map[k].total++
      map[k][o.status] = (map[k][o.status]||0)+1
      map[k].totalValue += o.order_value||0
      map[k].commission += o.commission||(o.order_value||0)*DEFAULT_COMM/100
      if (o.customer_name) map[k].customers.add(o.customer_name)
      const d = new Date(o.created_at)
      if (!map[k].lastOrder||d>new Date(map[k].lastOrder)) map[k].lastOrder=o.created_at
    })
    return Object.values(map).sort((a,b)=>b.total-a.total)
  }, [orders])

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, newStatus)
      onMarkOrderProcessed(orderId)
      if (selectedOrder?.id===orderId) setSelectedOrder(p=>p?{...p,status:newStatus}:null)
    } finally { setUpdatingId(null) }
  }

  const filteredOrders = useMemo(() => {
    const s = [...orders].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
    return orderFilter==='all' ? s : s.filter(o=>o.status===orderFilter)
  }, [orders, orderFilter])

  const recentItems = items.slice(0,6)

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background:'#040407' }}>

      {/* ── HEADER ── */}
      <div style={{
        padding:'16px 16px 10px',
        borderBottom:'1px solid rgba(255,255,255,0.05)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:18, fontFamily:'Space Grotesk,sans-serif', fontWeight:800, color:'#fff', letterSpacing:1 }}>
              CAPITAL MEDICAL AGENCY
            </span>
            {/* AI badge */}
            <span style={{
              background:'rgba(0,229,255,0.1)', border:'1px solid rgba(0,229,255,0.3)',
              color:'#00E5FF', fontSize:9, fontFamily:'monospace', fontWeight:700,
              padding:'2px 6px', borderRadius:6, letterSpacing:1,
              boxShadow:'0 0 8px rgba(0,229,255,0.2)',
            }}>AI</span>
          </div>
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'monospace', letterSpacing:3, marginTop:2 }}>
            SMARTER INVENTORY. BETTER DECISIONS.
          </div>
        </div>
        {/* Pending badge */}
        {pendingOrderCount>0 && (
          <button onClick={()=>setMainTab('orders')} style={{
            background:'rgba(255,77,109,0.15)', border:'1px solid rgba(255,77,109,0.3)',
            borderRadius:10, padding:'6px 10px', display:'flex', alignItems:'center', gap:6,
          }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#FF4D6D', boxShadow:'0 0 6px #FF4D6D' }} />
            <span style={{ color:'#FF6B8A', fontSize:11, fontFamily:'monospace', fontWeight:700 }}>{pendingOrderCount}</span>
          </button>
        )}
      </div>

      {/* ── MAIN TABS ── */}
      <div style={{ display:'flex', gap:6, padding:'10px 16px 0', overflowX:'auto' }}>
        {[
          { id:'dashboard', label:'Overview' },
          { id:'orders',    label:`Orders${pendingOrderCount>0?` (${pendingOrderCount})`:''}`},
          { id:'salesmen',  label:'Salesmen' },
        ].map(t => (
          <button key={t.id} onClick={()=>setMainTab(t.id)} style={{
            flexShrink:0, padding:'7px 14px', borderRadius:10, fontSize:11, fontFamily:'monospace', fontWeight:700,
            background: mainTab===t.id ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
            border: mainTab===t.id ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
            color: mainTab===t.id ? '#00E5FF' : 'rgba(255,255,255,0.3)',
            transition:'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          DASHBOARD TAB
      ═══════════════════════════════════════════════ */}
      {mainTab==='dashboard' && (
        <div className="scroll-area flex-1" style={{ padding:'12px 14px 100px' }}>

          {/* ── 4 STAT CARDS ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>

            {/* Stock Value */}
            <div className="stat-card" style={{ padding:'14px 14px 10px', color:'#00FF88' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <div style={{ width:32,height:32, borderRadius:10, background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>₹</div>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:9, fontFamily:'monospace', letterSpacing:1.5 }}>STOCK VALUE</span>
              </div>
              <div style={{ color:'#fff', fontSize:22, fontFamily:'Space Grotesk,sans-serif', fontWeight:800, lineHeight:1, marginBottom:8 }}>
                {formatCurrency(stats.totalValue)}
              </div>
              <Sparkline color="#00FF88" />
              <div style={{ color:'rgba(0,255,136,0.7)', fontSize:9, fontFamily:'monospace', marginTop:4, display:'flex', alignItems:'center', gap:3 }}>
                <span>▲</span> {items.length} products
              </div>
            </div>

            {/* Expiry Alerts */}
            <div className="stat-card" style={{ padding:'14px 14px 10px', color:'#FF4D6D' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <div style={{ width:32,height:32, borderRadius:10, background:'rgba(255,77,109,0.12)', border:'1px solid rgba(255,77,109,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#FF4D6D" strokeWidth="2"/>
                    <line x1="12" y1="9" x2="12" y2="13" stroke="#FF4D6D" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="17" x2="12.01" y2="17" stroke="#FF4D6D" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:9, fontFamily:'monospace', letterSpacing:1.5 }}>EXPIRY ALERTS</span>
              </div>
              <div style={{ color:'#FF4D6D', fontSize:32, fontFamily:'Space Grotesk,sans-serif', fontWeight:800, lineHeight:1, marginBottom:4, textShadow:'0 0 20px rgba(255,77,109,0.4)' }}>
                {stats.expiringIn90.length}
              </div>
              <div style={{ color:'rgba(255,255,255,0.25)', fontSize:9, fontFamily:'monospace', marginBottom:8 }}>ITEMS</div>
              <button onClick={()=>onNavigate('inventory','expiring')} style={{ background:'none', border:'none', color:'#FF6B8A', fontSize:10, fontFamily:'monospace', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                View Alerts <ChevronRight size={10}/>
              </button>
            </div>

            {/* Low Stock */}
            <div className="stat-card" style={{ padding:'14px 14px 10px', color:'#FF8C42' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <div style={{ width:32,height:32, borderRadius:10, background:'rgba(255,140,66,0.1)', border:'1px solid rgba(255,140,66,0.22)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📦</div>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:9, fontFamily:'monospace', letterSpacing:1.5 }}>LOW STOCK</span>
              </div>
              <div style={{ color:'#FF8C42', fontSize:32, fontFamily:'Space Grotesk,sans-serif', fontWeight:800, lineHeight:1, marginBottom:4, textShadow:'0 0 20px rgba(255,140,66,0.3)' }}>
                {stats.lowStockItems.length}
              </div>
              <div style={{ color:'rgba(255,255,255,0.25)', fontSize:9, fontFamily:'monospace', marginBottom:8 }}>ITEMS</div>
              <button onClick={()=>onNavigate('inventory','low')} style={{ background:'none', border:'none', color:'#FF8C42', fontSize:10, fontFamily:'monospace', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                View Items <ChevronRight size={10}/>
              </button>
            </div>

            {/* Recent Bills / Orders */}
            <div className="stat-card" style={{ padding:'14px 14px 10px', color:'rgba(255,255,255,0.6)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <div style={{ width:32,height:32, borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📋</div>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:9, fontFamily:'monospace', letterSpacing:1.5 }}>FIELD ORDERS</span>
              </div>
              <div style={{ color:'#fff', fontSize:32, fontFamily:'Space Grotesk,sans-serif', fontWeight:800, lineHeight:1, marginBottom:4 }}>
                {orders.length}
              </div>
              <div style={{ color:'rgba(255,255,255,0.25)', fontSize:9, fontFamily:'monospace', marginBottom:8 }}>
                {pendingOrderCount} PENDING
              </div>
              <button onClick={()=>setMainTab('orders')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:10, fontFamily:'monospace', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                View Orders <ChevronRight size={10}/>
              </button>
            </div>
          </div>

          {/* ── SCANNER BUTTON ── */}
          <button
            onClick={()=>onNavigate('scan')}
            style={{
              width:'100%', position:'relative', overflow:'hidden',
              borderRadius:20, padding:'20px 24px',
              background:'linear-gradient(135deg,#0a0a1e 0%,#0f0f2e 40%,#0a0a1e 100%)',
              border:'1px solid rgba(124,58,237,0.4)',
              boxShadow:'0 0 30px rgba(124,58,237,0.15), 0 0 60px rgba(37,99,235,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
              cursor:'pointer', marginBottom:14,
              display:'flex', alignItems:'center', gap:20,
              textAlign:'left',
            }}
          >
            {/* Network bg */}
            <NetworkBg />

            {/* Purple gradient border glow */}
            <div style={{
              position:'absolute', inset:0, borderRadius:20,
              background:'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(37,99,235,0.05))',
              border:'1px solid transparent',
              backgroundClip:'padding-box',
            }}/>

            {/* Camera icon */}
            <div style={{ position:'relative', zIndex:2, flexShrink:0 }}>
              <div style={{
                width:64, height:64, borderRadius:16,
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.1)',
                display:'flex', alignItems:'center', justifyContent:'center',
                position:'relative',
              }}>
                <div className="corner-tl"/><div className="corner-tr"/>
                <div className="corner-bl"/><div className="corner-br"/>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="12" cy="13" r="4" stroke="#00E5FF" strokeWidth="1.5"/>
                </svg>
                {/* Scan line */}
                <div className="scan-line-anim"/>
              </div>
            </div>

            {/* Text */}
            <div style={{ position:'relative', zIndex:2, flex:1 }}>
              <div style={{ color:'#fff', fontSize:22, fontFamily:'Space Grotesk,sans-serif', fontWeight:800, letterSpacing:1, marginBottom:4 }}>
                SCAN NEW BILL <span style={{ fontSize:16, opacity:0.7 }}>(AI)</span>
              </div>
              <div style={{ color:'rgba(0,229,255,0.6)', fontSize:10, fontFamily:'monospace', letterSpacing:2 }}>
                AI POWERED · SMART RECOGNITION · ACCURATE RESULTS
              </div>
            </div>

            <ChevronRight size={20} color="rgba(255,255,255,0.3)" style={{ position:'relative', zIndex:2, flexShrink:0 }}/>
          </button>

          {/* ── ACTION REQUIRED ── */}
          {stats.actionItems.length>0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <div style={{ width:3, height:16, borderRadius:99, background:'#FF4D6D', boxShadow:'0 0 6px #FF4D6D' }}/>
                <span style={{ color:'#FF6B8A', fontSize:10, fontFamily:'monospace', letterSpacing:2, fontWeight:700 }}>
                  ACTION REQUIRED ({stats.actionItems.length})
                </span>
              </div>
              {stats.actionItems.slice(0,2).map(item => {
                const days=getDaysToExpiry(item.expiry_date)
                const isExpired=days!==null&&days<0
                return (
                  <div key={item.id} style={{
                    background:isExpired?'rgba(255,77,109,0.06)':'rgba(255,140,66,0.05)',
                    border:`1px solid ${isExpired?'rgba(255,77,109,0.2)':'rgba(255,140,66,0.18)'}`,
                    borderRadius:14, padding:'12px 14px',
                    display:'flex', alignItems:'center', gap:12, marginBottom:8,
                  }}>
                    <MedIcon name={item.medicine_name}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:'#fff', fontSize:13, fontWeight:600, marginBottom:2 }}>{item.medicine_name}</div>
                      <div style={{ color:'rgba(255,255,255,0.35)', fontSize:10, fontFamily:'monospace' }}>
                        {item.batch_no||'—'} · Exp: {formatExpiry(item.expiry_date)}
                        <span style={{ color:isExpired?'#FF4D6D':'#FF8C42', fontWeight:700, marginLeft:6 }}>
                          {isExpired?`${Math.abs(days)}d ago`:`${days}d left`}
                        </span>
                      </div>
                    </div>
                    <button onClick={()=>setReturnNote(item)} style={{
                      flexShrink:0, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                      borderRadius:8, padding:'6px 10px', color:'rgba(255,255,255,0.6)',
                      fontSize:10, fontFamily:'monospace', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:4,
                    }}>
                      <FileOutput size={12}/> RETURN
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── STOCK OVERVIEW TABLE ── */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:3, height:16, borderRadius:99, background:'#00E5FF', boxShadow:'0 0 6px #00E5FF' }}/>
                <span style={{ color:'rgba(255,255,255,0.7)', fontSize:11, fontFamily:'monospace', letterSpacing:2, fontWeight:700 }}>STOCK OVERVIEW</span>
              </div>
              <button onClick={()=>onNavigate('inventory')} style={{ background:'none', border:'none', color:'#FFD700', fontSize:10, fontFamily:'monospace', cursor:'pointer', display:'flex', alignItems:'center', gap:3, fontWeight:700 }}>
                View All <ChevronRight size={10}/>
              </button>
            </div>

            <div style={{ background:'var(--bg-card)', borderRadius:16, overflow:'hidden', border:'1px solid rgba(255,255,255,0.05)' }}>
              {/* Table header */}
              <div style={{
                display:'grid', gridTemplateColumns:'1fr 80px 60px 90px',
                padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)',
                background:'rgba(255,255,255,0.02)',
              }}>
                {['MEDICINE','BATCH NO.','QTY','STATUS'].map(h => (
                  <span key={h} style={{ color:'rgba(255,255,255,0.25)', fontSize:9, fontFamily:'monospace', letterSpacing:1 }}>{h}</span>
                ))}
              </div>

              {recentItems.length===0 ? (
                <EmptyState text="Koi stock nahi. Bill scan karo." />
              ) : (
                recentItems.map((item,i) => {
                  const status = getStockStatus(item)
                  const days   = getDaysToExpiry(item.expiry_date)
                  const qtyColor =
                    status==='expired'||status==='out' ? '#FF4D6D' :
                    status==='low'||status==='critical'||status==='expiring' ? '#FF8C42' :
                    '#00FF88'

                  return (
                    <div key={item.id} onClick={()=>onNavigate('inventory')}
                      style={{
                        display:'grid', gridTemplateColumns:'1fr 80px 60px 90px',
                        padding:'12px 14px', cursor:'pointer',
                        borderBottom:i<recentItems.length-1?'1px solid rgba(255,255,255,0.04)':'none',
                        transition:'background 0.15s',
                        alignItems:'center',
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      {/* Medicine col */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                        <MedIcon name={item.medicine_name} form={item.form}/>
                        <div style={{ minWidth:0 }}>
                          <div style={{ color:'#fff', fontSize:13, fontWeight:600, lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {item.medicine_name}
                          </div>
                          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginTop:1 }}>{item.form||'Tablet'}</div>
                        </div>
                      </div>

                      {/* Batch col */}
                      <div>
                        <div style={{ color:'rgba(255,255,255,0.5)', fontSize:10, fontFamily:'monospace', marginBottom:3 }}>
                          {item.batch_no||'—'}
                        </div>
                        <Barcode/>
                      </div>

                      {/* Qty col */}
                      <div style={{ color:qtyColor, fontSize:14, fontFamily:'Space Grotesk,sans-serif', fontWeight:700, textShadow:`0 0 10px ${qtyColor}60` }}>
                        {(item.quantity||0).toLocaleString('en-IN')}
                      </div>

                      {/* Status col */}
                      <StatusChip status={status}/>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          ORDERS TAB
      ═══════════════════════════════════════════════ */}
      {mainTab==='orders' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filter chips */}
          <div style={{ display:'flex', gap:6, padding:'10px 14px', overflowX:'auto' }}>
            {[
              {id:'all',        label:`All (${orders.length})`},
              {id:'pending',    label:`Pending (${orders.filter(o=>o.status==='pending').length})`},
              {id:'processing', label:'Processing'},
              {id:'delivered',  label:'Delivered'},
              {id:'cancelled',  label:'Cancelled'},
            ].map(f=>(
              <button key={f.id} onClick={()=>setOrderFilter(f.id)} style={{
                flexShrink:0, padding:'6px 12px', borderRadius:10,
                fontSize:10, fontFamily:'monospace', fontWeight:700,
                background: orderFilter===f.id?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',
                border: orderFilter===f.id?'1px solid rgba(0,229,255,0.25)':'1px solid rgba(255,255,255,0.06)',
                color: orderFilter===f.id?'#00E5FF':'rgba(255,255,255,0.3)',
                transition:'all 0.2s', cursor:'pointer',
              }}>{f.label}</button>
            ))}
          </div>

          <div className="scroll-area flex-1" style={{ padding:'4px 14px 100px' }}>
            {filteredOrders.length===0 ? (
              <EmptyState text={orderFilter==='all'?'Koi order nahi abhi.':`Koi ${orderFilter} order nahi.`}/>
            ) : filteredOrders.map(order=>(
              <OrderCard key={order.id} order={order}
                isUpdating={updatingId===order.id}
                onOpen={()=>setSelectedOrder(order)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          SALESMEN TAB
      ═══════════════════════════════════════════════ */}
      {mainTab==='salesmen' && (
        <div className="scroll-area flex-1" style={{ padding:'10px 14px 100px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
            {[
              {label:'Salesmen',  val:salesmanStats.length,                                                        color:'#fff'},
              {label:'Orders',    val:orders.length,                                                               color:'#00E5FF'},
              {label:'Commission',val:`₹${Math.round(orders.reduce((s,o)=>s+(o.commission||0),0)).toLocaleString('en-IN')}`, color:'#00FF88'},
            ].map(s=>(
              <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'12px 10px', textAlign:'center' }}>
                <div style={{ color:s.color, fontWeight:800, fontSize:18, fontFamily:'Space Grotesk,sans-serif' }}>{s.val}</div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {salesmanStats.length===0
            ? <EmptyState text="Koi salesman order nahi."/>
            : salesmanStats.map((s,idx)=><SalesmanCard key={s.code||s.name} stat={s} rank={idx} orders={orders}/>)
          }
        </div>
      )}

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} isUpdating={updatingId===selectedOrder.id}
          onClose={()=>setSelectedOrder(null)} onStatusChange={handleStatusChange}/>
      )}
      {returnNote && <ReturnNoteModal item={returnNote} onClose={()=>setReturnNote(null)}/>}
    </div>
  )
}

// ─── EMPTY STATE ───────────────────────────────────────────────────────────────
function EmptyState({ text }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', gap:12 }}>
      <div style={{ fontSize:40, opacity:0.3 }}>📭</div>
      <p style={{ color:'rgba(255,255,255,0.2)', fontSize:13, textAlign:'center' }}>{text}</p>
    </div>
  )
}

// ─── ORDER CARD ────────────────────────────────────────────────────────────────
function OrderCard({ order, isUpdating, onOpen, onStatusChange }) {
  const nextStatus = { pending:'processing', processing:'delivered' }[order.status]
  const statusColors = { pending:'#F59E0B', processing:'#3B82F6', delivered:'#00FF88', cancelled:'#FF4D6D' }
  const sc = statusColors[order.status]||'#888'

  return (
    <div style={{
      background:'var(--bg-card)', border:`1px solid rgba(255,255,255,0.06)`,
      borderLeft:`3px solid ${sc}`, borderRadius:14, marginBottom:8, overflow:'hidden',
    }}>
      <button onClick={onOpen} style={{ width:'100%', padding:'12px 14px', textAlign:'left', background:'none', border:'none', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
              <span style={{ color:'#fff', fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{order.customer_name}</span>
              <span style={{ flexShrink:0, background:`${sc}20`, color:sc, fontSize:9, fontFamily:'monospace', fontWeight:700, padding:'2px 7px', borderRadius:6 }}>
                {order.status?.toUpperCase()}
              </span>
            </div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'monospace' }}>
              {order.salesman_name} · {order.items?.length} items · {new Date(order.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
            </div>
            <div style={{ color:'rgba(255,255,255,0.2)', fontSize:10, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {order.items?.slice(0,3).map(i=>i.medicine_name).join(', ')}{order.items?.length>3&&` +${order.items.length-3} more`}
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            {order.order_value>0 && <div style={{ color:'#FFD700', fontFamily:'monospace', fontSize:11, fontWeight:700 }}>₹{Math.round(order.order_value).toLocaleString('en-IN')}</div>}
            {order.commission>0  && <div style={{ color:'#00FF88', fontFamily:'monospace', fontSize:9 }}>₹{Math.round(order.commission)} comm</div>}
          </div>
        </div>
      </button>

      {nextStatus && !['delivered','cancelled'].includes(order.status) && (
        <div style={{ display:'flex', gap:6, padding:'0 14px 12px' }}>
          <button onClick={()=>onStatusChange(order.id,nextStatus)} disabled={isUpdating} style={{
            flex:1, padding:'8px', borderRadius:10, fontSize:10, fontFamily:'monospace', fontWeight:700,
            cursor:'pointer', border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            background: nextStatus==='processing'?'rgba(59,130,246,0.15)':'rgba(0,255,136,0.12)',
            color: nextStatus==='processing'?'#3B82F6':'#00FF88',
            opacity: isUpdating?0.5:1,
          }}>
            {isUpdating?<Loader size={12} style={{animation:'spin 1s linear infinite'}}/>:<Truck size={12}/>}
            {nextStatus==='processing'?'→ Processing':'→ Delivered'}
          </button>
          <button onClick={()=>onStatusChange(order.id,'cancelled')} disabled={isUpdating} style={{
            padding:'8px 12px', borderRadius:10, fontSize:10, fontFamily:'monospace',
            background:'rgba(255,77,109,0.1)', color:'#FF4D6D', border:'none', cursor:'pointer',
          }}>Cancel</button>
        </div>
      )}
    </div>
  )
}

// ─── ORDER DETAIL MODAL ────────────────────────────────────────────────────────
function OrderDetailModal({ order, isUpdating, onClose, onStatusChange }) {
  const [localStatus, setLocalStatus] = useState(order.status)
  const handleChange = async (s) => { setLocalStatus(s); await onStatusChange(order.id,s) }
  const flow = ['pending','processing','delivered']

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', zIndex:50, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:12 }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:400, background:'#0A0C12', border:'1px solid rgba(255,255,255,0.1)', borderRadius:24, overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'monospace' }}>{order.id}</div>
            <div style={{ color:'#fff', fontWeight:700, fontSize:18 }}>{order.customer_name}</div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={16} color="#fff"/>
          </button>
        </div>

        <div style={{ padding:'16px 20px', maxHeight:'65vh', overflowY:'auto' }}>
          {/* Status flow */}
          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
            {flow.map((s,i)=>{
              const done=i<flow.indexOf(localStatus)
              const cur=s===localStatus
              return (
                <div key={s} style={{ display:'flex', alignItems:'center', flex:1 }}>
                  {i>0 && <div style={{ flex:1, height:1, background: done||cur?'#00E5FF':'rgba(255,255,255,0.1)' }}/>}
                  <button onClick={()=>handleChange(s)} style={{
                    width:30, height:30, borderRadius:'50%', border:'none', cursor:'pointer',
                    background: done?'#00E5FF':cur?'rgba(0,229,255,0.2)':'rgba(255,255,255,0.06)',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    boxShadow: cur?'0 0 12px rgba(0,229,255,0.4)':'none',
                  }}>
                    {done ? <Check size={14} color="#000"/> : <span style={{ color:cur?'#00E5FF':'rgba(255,255,255,0.3)', fontSize:11, fontWeight:700 }}>{i+1}</span>}
                  </button>
                  {i<flow.length-1 && <div style={{ flex:1, height:1, background: done?'#00E5FF':'rgba(255,255,255,0.1)' }}/>}
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            {flow.map(s=><span key={s} style={{ color:s===localStatus?'#00E5FF':'rgba(255,255,255,0.25)', fontSize:9, fontFamily:'monospace' }}>{s.toUpperCase()}</span>)}
          </div>

          {/* Value row */}
          {(order.order_value>0||order.commission>0) && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {order.order_value>0 && <div style={{ background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.15)', borderRadius:12, padding:'10px', textAlign:'center' }}>
                <div style={{ color:'#FFD700', fontWeight:800, fontSize:15 }}>₹{Math.round(order.order_value).toLocaleString('en-IN')}</div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace' }}>ORDER VALUE</div>
              </div>}
              {order.commission>0 && <div style={{ background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.15)', borderRadius:12, padding:'10px', textAlign:'center' }}>
                <div style={{ color:'#00FF88', fontWeight:800, fontSize:15 }}>₹{Math.round(order.commission).toLocaleString('en-IN')}</div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace' }}>COMMISSION</div>
              </div>}
            </div>
          )}

          {/* Salesman */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
            <User size={14} color="#FFD700"/>
            <div>
              <div style={{ color:'#fff', fontWeight:600, fontSize:13 }}>{order.salesman_name}</div>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'monospace' }}>
                {new Date(order.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom:12 }}>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace', letterSpacing:2, marginBottom:8 }}>ITEMS ({order.items?.length})</div>
            {order.items?.map((item,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.02)', borderRadius:10, padding:'8px 12px', marginBottom:4 }}>
                <Pill size={13} color="#00E5FF"/>
                <span style={{ flex:1, color:'#fff', fontSize:12 }}>{item.medicine_name}</span>
                <span style={{ color:'#FFD700', fontFamily:'monospace', fontWeight:700, fontSize:13 }}>×{item.qty}</span>
              </div>
            ))}
          </div>

          {order.transcript && (
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 12px', marginBottom:8 }}>
              <div style={{ color:'rgba(255,255,255,0.25)', fontSize:9, fontFamily:'monospace', marginBottom:4 }}>VOICE TRANSCRIPT</div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontStyle:'italic' }}>"{order.transcript}"</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px 20px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:8 }}>
          {localStatus==='pending' && (
            <button onClick={()=>handleChange('processing')} disabled={isUpdating} style={{ width:'100%', background:'rgba(59,130,246,0.2)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:14, padding:'12px', color:'#3B82F6', fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {isUpdating?<Loader size={16} style={{animation:'spin 1s linear infinite'}}/>:<Truck size={16}/>} Mark as Processing
            </button>
          )}
          {localStatus==='processing' && (
            <button onClick={()=>handleChange('delivered')} disabled={isUpdating} style={{ width:'100%', background:'rgba(0,255,136,0.15)', border:'1px solid rgba(0,255,136,0.3)', borderRadius:14, padding:'12px', color:'#00FF88', fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {isUpdating?<Loader size={16} style={{animation:'spin 1s linear infinite'}}/>:<Check size={16}/>} Mark as Delivered
            </button>
          )}
          {localStatus==='delivered' && (
            <div style={{ textAlign:'center', color:'#00FF88', fontWeight:800, fontSize:13, padding:'12px' }}>✓ Delivered</div>
          )}
          {!['delivered','cancelled'].includes(localStatus) && (
            <button onClick={()=>handleChange('cancelled')} disabled={isUpdating} style={{ width:'100%', background:'rgba(255,77,109,0.08)', border:'1px solid rgba(255,77,109,0.2)', borderRadius:14, padding:'10px', color:'#FF4D6D', fontSize:12, cursor:'pointer' }}>
              Cancel Order
            </button>
          )}
          <button onClick={onClose} style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'10px', color:'rgba(255,255,255,0.4)', fontSize:12, cursor:'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── SALESMAN CARD ─────────────────────────────────────────────────────────────
function SalesmanCard({ stat, rank, orders }) {
  const [exp, setExp] = useState(false)
  const rankColors=['#FFD700','#C0C0C0','#CD7F32']
  const color=rankColors[rank]||'rgba(255,255,255,0.3)'
  const myOrders=orders.filter(o=>(o.salesman_code||o.salesman_name)===(stat.code||stat.name)).slice(0,4)

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, marginBottom:10, overflow:'hidden' }}>
      <button onClick={()=>setExp(!exp)} style={{ width:'100%', padding:'14px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:12, background:`${color}18`, border:`1px solid ${color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
            {rank<3?['🥇','🥈','🥉'][rank]:`#${rank+1}`}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'#fff', fontWeight:700, fontSize:13 }}>{stat.name}</div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'monospace' }}>
              {stat.total} orders · {stat.customers.size} customers
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'#00FF88', fontWeight:700, fontFamily:'monospace', fontSize:12 }}>₹{Math.round(stat.commission).toLocaleString('en-IN')}</div>
            <div style={{ color:'rgba(255,255,255,0.2)', fontSize:9, fontFamily:'monospace' }}>commission</div>
          </div>
          <ChevronDown size={14} color="rgba(255,255,255,0.3)" style={{ transform:exp?'rotate(180deg)':'none', transition:'transform 0.2s', flexShrink:0 }}/>
        </div>
        {/* Progress */}
        <div style={{ marginTop:10, height:2, background:'rgba(255,255,255,0.05)', borderRadius:99 }}>
          <div style={{ height:'100%', width:'80%', background:`linear-gradient(90deg,${color},${color}60)`, borderRadius:99 }}/>
        </div>
      </button>

      {exp && (
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', padding:'12px 16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <div style={{ background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.12)', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ color:'#FFD700', fontWeight:800, fontSize:14 }}>₹{Math.round(stat.totalValue).toLocaleString('en-IN')}</div>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace' }}>ORDER VALUE</div>
            </div>
            <div style={{ background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.12)', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ color:'#00FF88', fontWeight:800, fontSize:14 }}>₹{Math.round(stat.commission).toLocaleString('en-IN')}</div>
              <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace' }}>COMMISSION</div>
            </div>
          </div>
          {myOrders.map(o=>(
            <div key={o.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.02)', borderRadius:8, padding:'7px 10px', marginBottom:4 }}>
              <div>
                <div style={{ color:'#fff', fontSize:11, fontWeight:600 }}>{o.customer_name}</div>
                <div style={{ color:'rgba(255,255,255,0.25)', fontSize:9 }}>{o.items?.length} items</div>
              </div>
              <span style={{
                fontSize:8, fontFamily:'monospace', fontWeight:700, padding:'2px 7px', borderRadius:6,
                background: o.status==='delivered'?'rgba(0,255,136,0.12)':o.status==='pending'?'rgba(255,215,0,0.12)':'rgba(59,130,246,0.12)',
                color: o.status==='delivered'?'#00FF88':o.status==='pending'?'#FFD700':'#3B82F6',
              }}>{o.status?.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── RETURN NOTE MODAL ─────────────────────────────────────────────────────────
function ReturnNoteModal({ item, onClose }) {
  const [copied, setCopied] = useState(false)
  const days=getDaysToExpiry(item.expiry_date)
  const isExp=days!==null&&days<0
  const note=`RETURN NOTE — Capital Medical Agency, Bhopal\n━━━━━━━━━━━━━━━━━━━━━━━━━\nDate: ${new Date().toLocaleDateString('en-IN')}\nMedicine: ${item.medicine_name}\nBatch No: ${item.batch_no||'N/A'}\nExpiry: ${formatExpiry(item.expiry_date)}\nQty: ${item.quantity}\nStatus: ${isExp?'EXPIRED':`Expiring in ${days} days`}\nReason: ${isExp?'Past expiry':'Near expiry — return to supplier'}\n━━━━━━━━━━━━━━━━━━━━━━━━━\nAuthorized by: Admin | CMA System`
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', zIndex:50, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:400, background:'#0A0C12', border:'1px solid rgba(255,255,255,0.1)', borderRadius:24, overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px' }}>
          <span style={{ color:'#fff', fontWeight:700, fontSize:16 }}>Return Note</span>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14} color="#fff"/></button>
        </div>
        <pre style={{ margin:'0 16px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px', color:'rgba(255,255,255,0.6)', fontSize:11, fontFamily:'monospace', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{note}</pre>
        <div style={{ display:'flex', gap:8, padding:'0 16px 20px' }}>
          <button onClick={()=>navigator.clipboard.writeText(note).then(()=>setCopied(true))} style={{ flex:1, background:copied?'rgba(0,255,136,0.2)':'rgba(255,215,0,0.15)', border:`1px solid ${copied?'rgba(0,255,136,0.3)':'rgba(255,215,0,0.3)'}`, borderRadius:14, padding:'12px', color:copied?'#00FF88':'#FFD700', fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {copied?<><Check size={16}/> Copied!</>:'Copy Note'}
          </button>
          <button onClick={onClose} style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'12px', color:'rgba(255,255,255,0.4)', fontSize:13, cursor:'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

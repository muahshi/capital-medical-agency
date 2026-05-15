// ─── src/components/SmartReorder.jsx — Phase 4 AI Purchase Assistant ──────────
import { useState, useMemo, useCallback } from 'react'
import {
  Brain, ShoppingCart, Send, RefreshCw, Loader, CheckCircle,
  AlertTriangle, ChevronRight, Copy, MessageCircle, Package,
  TrendingDown, Zap, Plus, Minus, Trash2, X, Star
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getDaysToExpiry, getStockStatus, formatCurrency } from '../lib/stockUtils'
import { supabase } from '../lib/supabase'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

// ── AI suggestion generator ───────────────────────────────────────────────────
async function generateAISuggestions(items, orders) {
  if (!GROQ_KEY) return buildLocalSuggestions(items, orders)

  const stockSummary = items.slice(0, 40).map(i => ({
    name:     i.medicine_name,
    stock:    i.quantity,
    min:      i.low_stock_threshold || 50,
    expiry:   getDaysToExpiry(i.expiry_date),
    price:    i.unit_price || 0,
    supplier: i.supplier || 'Unknown',
  }))

  const orderSummary = orders.slice(0, 30).map(o => ({
    items: o.items?.map(i => i.medicine_name),
    date:  new Date(o.created_at).toLocaleDateString('en-IN'),
  }))

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: `You are a smart purchase assistant for Capital Medical Agency, Bhopal (Indian pharma distributor).

INVENTORY (${items.length} items): ${JSON.stringify(stockSummary)}
RECENT ORDERS (${orders.length} total): ${JSON.stringify(orderSummary.slice(0,10))}

Analyze and return ONLY valid JSON array of top 8 purchase suggestions:
[{
  "medicine_name": "exact name",
  "current_stock": 10,
  "suggested_qty": 200,
  "priority": "high|medium|low",
  "reason": "1 line Hinglish reason",
  "supplier": "supplier name or Unknown",
  "est_days_left": 5,
  "unit_price": 10.5
}]

Rules:
- High priority: stock=0 OR expiry<15 days OR stock<20% of min
- Medium: stock<50% of min OR fast moving from orders
- Low: stock<min threshold
- Suggest qty for 30-day stock based on order frequency
- Return ONLY the JSON array, no markdown`
      }]
    })
  })

  if (!res.ok) return buildLocalSuggestions(items, orders)
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '[]'
  try {
    return JSON.parse(raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim())
  } catch {
    return buildLocalSuggestions(items, orders)
  }
}

function buildLocalSuggestions(items, orders) {
  // Count medicine frequency in orders
  const freq = {}
  orders.forEach(o => o.items?.forEach(i => { freq[i.medicine_name] = (freq[i.medicine_name] || 0) + 1 }))

  return items
    .filter(i => {
      const s = getStockStatus(i)
      return s === 'out' || s === 'critical' || s === 'low' || s === 'expiring' || s === 'expired'
    })
    .sort((a, b) => {
      const pa = getStockStatus(a) === 'out' ? 0 : getStockStatus(a) === 'critical' ? 1 : 2
      const pb = getStockStatus(b) === 'out' ? 0 : getStockStatus(b) === 'critical' ? 1 : 2
      return pa - pb
    })
    .slice(0, 8)
    .map(i => {
      const status = getStockStatus(i)
      const daysLeft = getDaysToExpiry(i.expiry_date)
      const orderFreq = freq[i.medicine_name] || 0
      const suggestedQty = Math.max(
        (i.low_stock_threshold || 50) * 2,
        orderFreq * 10
      )
      return {
        medicine_name: i.medicine_name,
        current_stock: i.quantity,
        suggested_qty: suggestedQty,
        priority: status === 'out' || status === 'critical' ? 'high' : status === 'expiring' ? 'high' : 'medium',
        reason: status === 'out' ? 'Stock khatam ho gaya!' : status === 'critical' ? 'Bahut kam stock bacha hai' : status === 'expiring' ? 'Jaldi expire hoga — naya stock mangwao' : 'Stock low hai',
        supplier: i.supplier || 'Unknown',
        est_days_left: status === 'out' ? 0 : Math.round(i.quantity / Math.max(1, orderFreq)),
        unit_price: i.unit_price || 0,
      }
    })
}

// ── WhatsApp PO Generator ─────────────────────────────────────────────────────
function generatePOText(items, companyName = 'Capital Medical Agency') {
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const total = items.reduce((s, i) => s + (i.suggested_qty * (i.unit_price || 0)), 0)

  let msg = `🏥 *PURCHASE ORDER*\n`
  msg += `*${companyName}, Bhopal*\n`
  msg += `📅 Date: ${date}\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`
  msg += `*ITEMS REQUIRED:*\n\n`

  items.forEach((item, i) => {
    msg += `${i + 1}. *${item.medicine_name}*\n`
    msg += `   Qty: ${item.suggested_qty} units\n`
    msg += `   Current Stock: ${item.current_stock}\n`
    if (item.unit_price > 0) msg += `   Est. Rate: ₹${item.unit_price}\n`
    msg += `\n`
  })

  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`
  if (total > 0) msg += `*Est. Total: ₹${Math.round(total).toLocaleString('en-IN')}*\n`
  msg += `\n_Generated by CMA AI OS_`
  return msg
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function SmartReorder({ items = [], orders = [], onBack }) {
  const [suggestions,   setSuggestions]   = useState([])
  const [loading,       setLoading]       = useState(false)
  const [generated,     setGenerated]     = useState(false)
  const [editQtys,      setEditQtys]      = useState({})
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showPO,        setShowPO]        = useState(false)
  const [poText,        setPOText]        = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const suggs = await generateAISuggestions(items, orders)
      setSuggestions(suggs)
      // Auto-select high priority
      const highPrio = new Set(suggs.filter(s => s.priority === 'high').map(s => s.medicine_name))
      setSelectedItems(highPrio)
      setGenerated(true)
      toast.success(`${suggs.length} suggestions ready!`)
    } catch (e) {
      toast.error('AI failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const getQty = (name, def) => editQtys[name] ?? def

  const toggleSelect = (name) => {
    setSelectedItems(prev => {
      const n = new Set(prev)
      n.has(name) ? n.delete(name) : n.add(name)
      return n
    })
  }

  const selectedList = suggestions.filter(s => selectedItems.has(s.medicine_name))

  const handleCreatePO = () => {
    if (selectedList.length === 0) { toast.error('Koi item select nahi kiya'); return }
    const withQtys = selectedList.map(s => ({ ...s, suggested_qty: getQty(s.medicine_name, s.suggested_qty) }))
    const text = generatePOText(withQtys)
    setPOText(text)
    setShowPO(true)
  }

  const handleWhatsApp = (supplier = '') => {
    const encoded = encodeURIComponent(poText)
    const phone = supplier.replace(/\D/g, '')
    const url = phone
      ? `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }

  const priorityColor = { high: '#FF4D6D', medium: '#FF8C42', low: '#FFD700' }
  const priorityBg    = { high: 'rgba(255,77,109,0.08)', medium: 'rgba(255,140,66,0.08)', low: 'rgba(255,215,0,0.06)' }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#040407' }}>

      {/* Header */}
      <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ color:'rgba(0,229,255,0.6)', fontSize:9, fontFamily:'monospace', letterSpacing:3 }}>PHASE 4 · AI BRAIN</div>
        <div style={{ color:'#fff', fontSize:20, fontFamily:'Space Grotesk,sans-serif', fontWeight:800 }}>SMART REORDER</div>
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginTop:2 }}>AI-powered purchase suggestions based on stock + sales</div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 100px' }}>

        {/* Generate button */}
        {!generated ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, padding:'32px 0' }}>
            <div style={{ width:80, height:80, borderRadius:24, background:'rgba(0,229,255,0.06)', border:'1px solid rgba(0,229,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Brain size={36} color="#00E5FF"/>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ color:'#fff', fontWeight:700, fontSize:16, marginBottom:6 }}>AI Purchase Assistant</div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13, lineHeight:1.6 }}>
                Groq AI aapka stock + sales history analyze karega<br/>aur next 15-30 din ke liye suggestions dega
              </div>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, width:'100%' }}>
              {[
                { label:'Total Stock Items', val:items.length,                                                  color:'#fff'   },
                { label:'Low/Out of Stock',  val:items.filter(i=>['low','critical','out'].includes(getStockStatus(i))).length, color:'#FF8C42'},
                { label:'Recent Orders',     val:orders.length,                                                 color:'#00E5FF'},
              ].map(s => (
                <div key={s.label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'12px 10px', textAlign:'center' }}>
                  <div style={{ color:s.color, fontWeight:800, fontSize:18, fontFamily:'Space Grotesk,sans-serif' }}>{s.val}</div>
                  <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace', marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <button onClick={handleGenerate} disabled={loading} style={{
              width:'100%', background:'linear-gradient(135deg,#00B8D9,#0070F3)',
              border:'none', borderRadius:18, padding:'18px 24px', color:'#fff',
              fontWeight:800, fontSize:15, fontFamily:'Space Grotesk,sans-serif',
              cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1,
              display:'flex', alignItems:'center', justifyContent:'center', gap:12,
              boxShadow:'0 0 30px rgba(0,180,217,0.25)',
            }}>
              {loading
                ? <><div style={{ width:20,height:20,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/> AI Analyze Kar Raha Hai...</>
                : <><Brain size={20}/> Generate AI Suggestions</>
              }
            </button>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>{suggestions.length} Suggestions</div>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>{selectedItems.size} selected</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleGenerate} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'8px 12px', color:'rgba(255,255,255,0.5)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                  <RefreshCw size={12}/> Refresh
                </button>
                <button onClick={handleCreatePO} disabled={selectedItems.size===0} style={{
                  background:selectedItems.size>0?'linear-gradient(135deg,#00B8D9,#0070F3)':'rgba(255,255,255,0.04)',
                  border:'none', borderRadius:12, padding:'8px 14px',
                  color:selectedItems.size>0?'#fff':'rgba(255,255,255,0.3)',
                  fontSize:11, fontWeight:700, cursor:selectedItems.size>0?'pointer':'not-allowed',
                  display:'flex', alignItems:'center', gap:6,
                }}>
                  <ShoppingCart size={12}/> Create PO
                </button>
              </div>
            </div>

            {/* Select all */}
            <button onClick={() => {
              if (selectedItems.size === suggestions.length) setSelectedItems(new Set())
              else setSelectedItems(new Set(suggestions.map(s => s.medicine_name)))
            }} style={{ width:'100%', background:'rgba(0,229,255,0.04)', border:'1px solid rgba(0,229,255,0.1)', borderRadius:12, padding:'10px', color:'#00E5FF', fontSize:11, fontFamily:'monospace', fontWeight:700, cursor:'pointer', marginBottom:12 }}>
              {selectedItems.size === suggestions.length ? '☑ Deselect All' : '☐ Select All'}
            </button>

            {/* Suggestion cards */}
            {suggestions.map((s, i) => {
              const selected  = selectedItems.has(s.medicine_name)
              const qty       = getQty(s.medicine_name, s.suggested_qty)
              const estCost   = qty * (s.unit_price || 0)

              return (
                <div key={i} style={{
                  background:selected?priorityBg[s.priority]:'rgba(255,255,255,0.02)',
                  border:`1px solid ${selected?priorityColor[s.priority]+'40':'rgba(255,255,255,0.06)'}`,
                  borderRadius:18, padding:'14px 16px', marginBottom:10,
                  transition:'all 0.2s',
                }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                    {/* Select checkbox */}
                    <button onClick={() => toggleSelect(s.medicine_name)} style={{
                      width:22, height:22, borderRadius:7, flexShrink:0,
                      background:selected?priorityColor[s.priority]:'rgba(255,255,255,0.05)',
                      border:`2px solid ${selected?priorityColor[s.priority]:'rgba(255,255,255,0.15)'}`,
                      cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {selected && <CheckCircle size={13} color="#fff"/>}
                    </button>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <span style={{ color:'#fff', fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.medicine_name}</span>
                        <span style={{
                          flexShrink:0,
                          background:`${priorityColor[s.priority]}18`,
                          color:priorityColor[s.priority],
                          border:`1px solid ${priorityColor[s.priority]}35`,
                          fontSize:8, fontFamily:'monospace', fontWeight:700,
                          padding:'2px 6px', borderRadius:6,
                        }}>{s.priority?.toUpperCase()}</span>
                      </div>
                      <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{s.reason}</div>
                      <div style={{ color:'rgba(255,255,255,0.25)', fontSize:10, fontFamily:'monospace', marginTop:2 }}>
                        Stock: {s.current_stock} · Supplier: {s.supplier}
                        {s.est_days_left !== undefined && ` · ~${s.est_days_left}d left`}
                      </div>
                    </div>
                  </div>

                  {/* Qty stepper */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'monospace' }}>ORDER QTY:</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'4px 10px' }}>
                        <button onClick={() => setEditQtys(p=>({...p,[s.medicine_name]:Math.max(1,(getQty(s.medicine_name,s.suggested_qty))-10)}))}
                          style={{ background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',display:'flex',alignItems:'center' }}>
                          <Minus size={12}/>
                        </button>
                        <span style={{ color:'#FFD700', fontFamily:'Space Grotesk,sans-serif', fontWeight:800, fontSize:15, minWidth:40, textAlign:'center' }}>{qty}</span>
                        <button onClick={() => setEditQtys(p=>({...p,[s.medicine_name]:(getQty(s.medicine_name,s.suggested_qty))+10}))}
                          style={{ background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',display:'flex',alignItems:'center' }}>
                          <Plus size={12}/>
                        </button>
                      </div>
                    </div>
                    {estCost > 0 && (
                      <span style={{ color:'#00FF88', fontFamily:'monospace', fontSize:12, fontWeight:700 }}>
                        ≈ ₹{Math.round(estCost).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Summary footer */}
            {selectedList.length > 0 && (
              <div style={{ background:'rgba(0,229,255,0.04)', border:'1px solid rgba(0,229,255,0.15)', borderRadius:18, padding:'14px 16px', marginTop:8 }}>
                <div style={{ color:'rgba(0,229,255,0.7)', fontSize:10, fontFamily:'monospace', letterSpacing:2, marginBottom:8 }}>PURCHASE ORDER SUMMARY</div>
                <div style={{ color:'#fff', fontWeight:700, marginBottom:4 }}>{selectedList.length} medicines selected</div>
                <div style={{ color:'#00FF88', fontWeight:800, fontSize:16 }}>
                  Est. Total: ₹{Math.round(selectedList.reduce((s,i)=>s+(getQty(i.medicine_name,i.suggested_qty)*(i.unit_price||0)),0)).toLocaleString('en-IN')}
                </div>
                <button onClick={handleCreatePO} style={{
                  width:'100%', marginTop:12,
                  background:'linear-gradient(135deg,#25D366,#128C7E)',
                  border:'none', borderRadius:14, padding:'14px', color:'#fff',
                  fontWeight:800, fontSize:14, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  boxShadow:'0 0 20px rgba(37,211,102,0.2)',
                }}>
                  <MessageCircle size={18}/> Create & Send on WhatsApp
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* PO Modal */}
      {showPO && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(8px)',zIndex:60,display:'flex',alignItems:'flex-end',padding:12 }}
          onClick={()=>setShowPO(false)}>
          <div style={{ width:'100%',maxWidth:460,margin:'0 auto',background:'#0A0C12',border:'1px solid rgba(0,229,255,0.2)',borderRadius:24,overflow:'hidden' }}
            onClick={e=>e.stopPropagation()}>

            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div style={{ color:'rgba(0,229,255,0.6)',fontSize:9,fontFamily:'monospace',letterSpacing:2 }}>READY TO SEND</div>
                <div style={{ color:'#fff',fontWeight:800,fontSize:16 }}>Purchase Order</div>
              </div>
              <button onClick={()=>setShowPO(false)} style={{ width:30,height:30,borderRadius:8,background:'rgba(255,255,255,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <X size={15} color="#fff"/>
              </button>
            </div>

            <pre style={{ margin:'14px 16px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'14px',color:'rgba(255,255,255,0.7)',fontSize:11,fontFamily:'monospace',lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:'40vh',overflowY:'auto' }}>
              {poText}
            </pre>

            <div style={{ display:'flex',flexDirection:'column',gap:8,padding:'0 16px 20px' }}>
              {/* WhatsApp buttons by supplier */}
              {[...new Set(selectedList.map(s=>s.supplier).filter(s=>s&&s!=='Unknown'))].map(supplier=>(
                <button key={supplier} onClick={()=>handleWhatsApp(supplier)} style={{
                  width:'100%',background:'linear-gradient(135deg,#25D366,#128C7E)',border:'none',borderRadius:14,padding:'13px',
                  color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,
                }}>
                  <MessageCircle size={16}/> WhatsApp: {supplier}
                </button>
              ))}
              <button onClick={()=>handleWhatsApp()} style={{
                width:'100%',background:'linear-gradient(135deg,#25D366,#128C7E)',border:'none',borderRadius:14,padding:'13px',
                color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,
              }}>
                <MessageCircle size={16}/> WhatsApp pe Bhejo
              </button>
              <button onClick={()=>{navigator.clipboard?.writeText(poText).then(()=>toast.success('Copied!'))}} style={{
                width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'12px',
                color:'rgba(255,255,255,0.6)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,
              }}>
                <Copy size={15}/> Copy Text
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

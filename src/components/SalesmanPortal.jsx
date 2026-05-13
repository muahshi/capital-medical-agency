// ─── src/components/SalesmanPortal.jsx — Phase 3 ─────────────────────────────
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic, MicOff, Send, User, Package, CheckCircle, Loader,
  ChevronRight, X, Clock, BarChart2, ArrowLeft, ShoppingBag,
  Brain, Plus, Minus, Trash2, Sparkles, Search, TrendingUp,
  Award, IndianRupee, Star, RefreshCw, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { loginWithCode } from '../lib/supabase'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────
const MY_ORDERS_KEY   = 'cma_my_orders_'
const COMMISSION_RATE = 2   // default 2% — overridden from DB

// ─── Local storage helpers ────────────────────────────────────────────────────
const loadMyOrders   = (code) => { try { return JSON.parse(localStorage.getItem(MY_ORDERS_KEY + code) || '[]') } catch { return [] } }
const saveMyOrders   = (code, o) => { try { localStorage.setItem(MY_ORDERS_KEY + code, JSON.stringify(o)) } catch {} }

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function fetchCustomers() {
  if (!supabase) return []
  const { data } = await supabase.from('customers').select('id,name,shop_name,area,city,phone').eq('is_active', true).order('name')
  return data || []
}

async function createCustomer(payload) {
  if (!supabase) return { data: { id: Date.now().toString(), ...payload }, error: null }
  return supabase.from('customers').insert(payload).select().single()
}

async function fetchCommissionRate(code) {
  if (!supabase) return COMMISSION_RATE
  const { data } = await supabase.from('commission_rates').select('rate_percent').eq('salesman_code', code).single()
  return data?.rate_percent ?? COMMISSION_RATE
}

async function saveOrderToDB(order) {
  if (!supabase) return
  try {
    await supabase.from('orders').insert({
      id:            order.id,
      salesman_code: order.salesman_code,
      salesman_name: order.salesman_name,
      customer_name: order.customer_name,
      customer_id:   order.customer_id || null,
      items:         order.items,
      notes:         order.notes || null,
      transcript:    order.transcript || null,
      order_value:   order.order_value || 0,
      commission:    order.commission || 0,
      status:        'pending',
      created_at:    order.created_at,
    })
  } catch (e) { console.warn('[SalesmanPortal] DB save failed:', e.message) }
}

// ─── Groq AI ──────────────────────────────────────────────────────────────────
async function parseOrderWithAI(transcript, salesmanName, customers = []) {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key) return parseDemoOrder(transcript)

  const custList = customers.slice(0, 20).map(c => `${c.name} (${c.shop_name || ''}, ${c.area || ''})`).join('; ')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 900,
      temperature: 0.1,
      messages: [{ role: 'user', content:
`You are an order parser for Capital Medical Agency, Bhopal (Indian pharma distributor).
Parse this voice/text order from salesman "${salesmanName}".

Known customers: ${custList || 'None'}

Voice input: "${transcript}"

Return ONLY valid JSON (no markdown):
{
  "customer_name": "name from input OR best match from known customers",
  "items": [
    {"medicine_name": "exact name", "qty": 10, "unit": "strip/box/bottle/pcs", "notes": null}
  ],
  "notes": null
}

Rules:
- Match customer name loosely to known list
- Extract ALL medicine names
- qty must be positive integer
- If no customer mentioned: "Walk-in Customer"
- Return ONLY the JSON`
      }]
    })
  })
  if (!res.ok) throw new Error('AI parse failed')
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'
  return JSON.parse(raw.replace(/```json\n?/gi,'').replace(/```\n?/gi,'').trim())
}

async function getAISalesTips(orders, name, commissionRate) {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key || orders.length === 0) return getDefaultTips(name)
  try {
    const summary = orders.slice(-15).map(o => ({
      customer: o.customer_name,
      items: o.items?.length,
      value: o.order_value || 0,
      date: new Date(o.created_at).toLocaleDateString('en-IN')
    }))
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        temperature: 0.7,
        messages: [{ role: 'user', content:
`Sales coach for ${name}, Capital Medical Agency.
Orders: ${JSON.stringify(summary)}
Commission rate: ${commissionRate}%

Give 3 Hinglish tips to increase sales & commission. Return ONLY JSON array:
[{"emoji":"🎯","title":"short title","tip":"2 line tip in Hinglish"}]` }]
      })
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || '[]'
    return JSON.parse(raw.replace(/```json\n?/gi,'').replace(/```\n?/gi,'').trim())
  } catch { return getDefaultTips(name) }
}

function getDefaultTips(name) {
  return [
    { emoji:'🎯', title:'Top Customers', tip:`${name} bhai, apne top 3 customers ko hafte mein 2 baar visit karo — unka order double ho sakta hai!` },
    { emoji:'📈', title:'Bundle Selling', tip:'Jab Paracetamol order aaye, saath mein ORS aur Vitamin C suggest karo — average order value 30% badhti hai.' },
    { emoji:'⚡', title:'Morning Orders', tip:'Subah 9-11 baje ke orders sabse fast process hote hain. Pehle busy customers pehle visit karo.' },
  ]
}

function parseDemoOrder(transcript) {
  const words = transcript.split(/[\s,]+/)
  const items = []
  let i = 0
  while (i < words.length) {
    const n = parseInt(words[i])
    if (!isNaN(n) && words[i+1]) {
      const name = words.slice(i+1, i+4).join(' ').replace(/[,.]$/, '').trim()
      if (name.length > 1) items.push({ medicine_name: name, qty: n, unit: 'strip', notes: null })
      i += 4
    } else i++
  }
  const m = transcript.match(/(?:customer|for|ko)[:\s]+([a-zA-Z\s]+?)(?:\s+(?:chahiye|wants|ko|order)|,|$)/i)
  if (items.length === 0) items.push({ medicine_name: transcript.slice(0,30)||'Medicine', qty:1, unit:'strip', notes:'Manual review needed' })
  return { customer_name: m?.[1]?.trim() || 'Walk-in Customer', items, notes: null }
}

function calcStats(orders, rate) {
  const total     = orders.length
  const totalVal  = orders.reduce((s,o) => s + (o.order_value||0), 0)
  const commission= totalVal * rate / 100
  const customers = [...new Set(orders.map(o => o.customer_name))].length
  const today     = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length
  const topCust   = (() => {
    const m = {}
    orders.forEach(o => { m[o.customer_name] = (m[o.customer_name]||0) + 1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—'
  })()
  return { total, totalVal, commission, customers, today, topCust }
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function SalesmanPortal({ onOrderSubmit }) {
  const [stage,         setStage]         = useState('login')
  const [salesman,      setSalesman]       = useState(null)
  const [codeInput,     setCodeInput]      = useState('')
  const [customers,     setCustomers]      = useState([])
  const [selCustomer,   setSelCustomer]    = useState(null)
  const [custSearch,    setCustSearch]     = useState('')
  const [showCustDrop,  setShowCustDrop]   = useState(false)
  const [showAddCust,   setShowAddCust]    = useState(false)
  const [newCust,       setNewCust]        = useState({ name:'', shop_name:'', area:'', phone:'', gstin:'' })
  const [transcript,    setTranscript]     = useState('')
  const [manualInput,   setManualInput]    = useState('')
  const [isRecording,   setIsRecording]    = useState(false)
  const [parsedOrder,   setParsedOrder]    = useState(null)
  const [isParsing,     setIsParsing]      = useState(false)
  const [myOrders,      setMyOrders]       = useState([])
  const [insights,      setInsights]       = useState([])
  const [insightsLoading,setInsightsLoading]=useState(false)
  const [commRate,      setCommRate]       = useState(COMMISSION_RATE)
  const [activeTab,     setActiveTab]      = useState('order')
  const [justSubmitted, setJustSubmitted]  = useState(null)
  const [filterStatus,  setFilterStatus]   = useState('all')

  const recRef    = useRef(null)
  const finalRef  = useRef('')

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!salesman) return
    const orders = loadMyOrders(salesman.code)
    setMyOrders(orders)
    fetchCustomers().then(setCustomers)
    fetchCommissionRate(salesman.code).then(setCommRate)
  }, [salesman])

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const code = codeInput.trim()
    if (!code) return
    setStage('logging_in')
    try {
      const result = await loginWithCode(code)
      if (!result.success) { toast.error(result.error || 'Galat code!'); setStage('login'); return }
      if (result.user.role !== 'salesman') { toast.error('Yeh salesman portal hai.'); setStage('login'); return }
      setSalesman({ code, name: result.user.label, city: result.user.city||'', avatar: result.user.avatar||result.user.label[0].toUpperCase(), color: result.user.color||'#F59E0B' })
      setStage('main')
    } catch { toast.error('Network error. Internet check karo.'); setStage('login') }
  }

  // ── Voice ─────────────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.error('Voice nahi chali — type karo'); return }
    finalRef.current = ''
    setTranscript('')
    const rec = new SR()
    rec.lang = 'hi-IN'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      setTranscript((finalRef.current + interim).trim())
    }
    rec.onerror  = () => { toast.error('Mic error'); setIsRecording(false) }
    rec.onend    = () => setIsRecording(false)
    rec.start()
    recRef.current = rec
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => { recRef.current?.stop(); setIsRecording(false) }, [])

  // ── Parse order ───────────────────────────────────────────────────────────
  const handleParseOrder = async () => {
    const text = (transcript || manualInput).trim()
    if (!text) { toast.error('Pehle order bolo ya type karo'); return }
    setIsParsing(true)
    try {
      const parsed = await parseOrderWithAI(text, salesman.name, customers)
      if (selCustomer) parsed.customer_name = selCustomer.shop_name || selCustomer.name
      setParsedOrder({ ...parsed, transcript: text })
      setStage('review')
    } catch { toast.error('Parse nahi hua. Dobara try karo.') }
    finally { setIsParsing(false) }
  }

  // ── Submit order ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!parsedOrder) return
    // Estimate order value from inventory if possible
    const orderValue = parsedOrder.items.reduce((s, i) => s + (i.qty || 1) * 50, 0) // rough estimate
    const commission = parseFloat((orderValue * commRate / 100).toFixed(2))

    const order = {
      id:            `ORD-${Date.now()}`,
      salesman_code: salesman.code,
      salesman_name: salesman.name + (salesman.city ? ` (${salesman.city})` : ''),
      customer_name: parsedOrder.customer_name || selCustomer?.name || 'Walk-in Customer',
      customer_id:   selCustomer?.id || null,
      items:         parsedOrder.items,
      notes:         parsedOrder.notes,
      transcript:    parsedOrder.transcript,
      order_value:   orderValue,
      commission,
      status:        'pending',
      created_at:    new Date().toISOString(),
    }

    // Local save
    const updated = [order, ...myOrders]
    setMyOrders(updated)
    saveMyOrders(salesman.code, updated)

    // Parent hook (cross-tab admin ping)
    onOrderSubmit(order)

    // DB save
    await saveOrderToDB(order)

    setJustSubmitted(order)
    setStage('done')
    toast.success('Order bhej diya! ✅')
  }

  // ── Add new customer ──────────────────────────────────────────────────────
  const handleAddCustomer = async () => {
    if (!newCust.name.trim()) { toast.error('Naam required hai'); return }
    const { data, error } = await createCustomer({ ...newCust, created_by: salesman.code })
    if (error) { toast.error('Customer add nahi hua'); return }
    const updated = [data, ...customers]
    setCustomers(updated)
    setSelCustomer(data)
    setCustSearch(data.shop_name || data.name)
    setShowAddCust(false)
    setNewCust({ name:'', shop_name:'', area:'', phone:'', gstin:'' })
    toast.success('Customer add ho gaya ✓')
  }

  const resetOrder = () => {
    setTranscript(''); finalRef.current = ''; setManualInput('')
    setParsedOrder(null); setSelCustomer(null); setCustSearch('')
    setJustSubmitted(null); setStage('main'); setActiveTab('order')
  }

  const filteredCusts = customers.filter(c => {
    const q = custSearch.toLowerCase()
    return !q || c.name?.toLowerCase().includes(q) || c.shop_name?.toLowerCase().includes(q) || c.area?.toLowerCase().includes(q)
  })

  const filteredOrders = myOrders.filter(o => filterStatus === 'all' || o.status === filterStatus)
  const stats = salesman ? calcStats(myOrders, commRate) : null

  // ════════════════════════════════════════════════════════════════
  // SCREENS
  // ════════════════════════════════════════════════════════════════

  // ── Login ─────────────────────────────────────────────────────────────────
  if (stage === 'login' || stage === 'logging_in') {
    return (
      <div style={S.screen}>
        <div style={S.glow} />
        <div style={S.loginWrap}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={S.logoBox}><Package size={26} color="#F59E0B" /></div>
            <div style={S.logoTitle}>CAPITAL MEDICAL</div>
            <div style={S.logoSub}>SALESMAN PORTAL · FIELD APP</div>
          </div>

          <div style={S.card}>
            <div style={S.fieldLabel}>APNA CODE DAALO</div>
            <input
              style={S.codeInput}
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="RAM-BPL-1992"
              maxLength={16}
              autoCapitalize="characters"
            />
            <button
              style={{ ...S.primaryBtn, opacity: stage==='logging_in'?0.6:1 }}
              onClick={handleLogin}
              disabled={stage==='logging_in'}
            >
              {stage==='logging_in'
                ? <><span style={S.spinner} /> VERIFYING...</>
                : <>LOGIN KARO <ChevronRight size={18} /></>
              }
            </button>
          </div>

          <p style={{ color:'#374151', fontSize:11, textAlign:'center', marginTop:32, fontFamily:'monospace', letterSpacing:1 }}>
            Code nahi hai? Admin se WhatsApp par maango.
          </p>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (stage === 'done' && justSubmitted) {
    return (
      <div style={S.screen}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 24px', gap:24 }}>
          <div style={S.successRing}>
            <div style={S.successInner}><CheckCircle size={36} color="#10B981" /></div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ color:'#10B981', fontSize:10, fontFamily:'monospace', letterSpacing:3, marginBottom:6 }}>ORDER SUBMITTED ✓</div>
            <div style={{ color:'#fff', fontSize:26, fontWeight:800, marginBottom:4 }}>Order Bheja! 🎉</div>
            <div style={{ color:'#6B7280', fontSize:13 }}>Admin ko mil gaya — processing hoga abhi</div>
          </div>
          <div style={S.doneCard}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ color:'#4B5563', fontSize:10, fontFamily:'monospace' }}>{justSubmitted.id}</span>
              <span style={{ color:'#F59E0B', fontSize:10, fontFamily:'monospace' }}>PENDING</span>
            </div>
            <div style={{ color:'#fff', fontWeight:700, marginBottom:4 }}>{justSubmitted.customer_name}</div>
            <div style={{ color:'#6B7280', fontSize:12, marginBottom:10 }}>{justSubmitted.items.length} items</div>
            {justSubmitted.commission > 0 && (
              <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12, padding:'8px 12px', marginBottom:10 }}>
                <span style={{ color:'#10B981', fontSize:12 }}>💰 Estimated commission: ₹{justSubmitted.commission.toFixed(0)}</span>
              </div>
            )}
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {justSubmitted.items.map((item, i) => (
                <span key={i} style={S.badge}>{item.medicine_name} ×{item.qty}</span>
              ))}
            </div>
          </div>
          <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:10 }}>
            <button style={S.primaryBtn} onClick={resetOrder}><Plus size={18} /> Naya Order Karo</button>
            <button style={S.ghostBtn} onClick={() => { setJustSubmitted(null); setStage('main'); setActiveTab('history') }}>History Dekho</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Review ────────────────────────────────────────────────────────────────
  if (stage === 'review' && parsedOrder) {
    const updateQty   = (idx, d) => setParsedOrder(p => { const items=[...p.items]; items[idx]={...items[idx],qty:Math.max(1,(items[idx].qty||1)+d)}; return {...p,items} })
    const removeItem  = (idx)    => { const items=parsedOrder.items.filter((_,i)=>i!==idx); if(items.length===0){setStage('main');return}; setParsedOrder(p=>({...p,items})) }

    return (
      <div style={S.screen}>
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'20px 16px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <button style={S.backBtn} onClick={() => setStage('main')}><ArrowLeft size={18} color="#9CA3AF" /></button>
          <div>
            <div style={{ color:'#6B7280', fontSize:10, fontFamily:'monospace', letterSpacing:2 }}>STEP 2 OF 2</div>
            <div style={{ color:'#fff', fontSize:18, fontWeight:800 }}>ORDER CONFIRM KARO</div>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 120px' }}>
          {/* Customer */}
          <div style={{ marginBottom:16 }}>
            <div style={S.fieldLabel}>CUSTOMER</div>
            <div style={{ ...S.inputRow, gap:12 }}>
              <User size={16} color="#F59E0B" />
              <span style={{ color:'#fff', fontWeight:700 }}>{parsedOrder.customer_name}</span>
            </div>
          </div>

          {/* Items */}
          <div style={S.fieldLabel}>ITEMS ({parsedOrder.items.length})</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {parsedOrder.items.map((item, i) => (
              <div key={i} style={S.itemRow}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'#fff', fontWeight:600, fontSize:14 }}>{item.medicine_name}</div>
                  {item.unit && <div style={{ color:'#6B7280', fontSize:11 }}>{item.unit}</div>}
                </div>
                <div style={S.qtyStepper}>
                  <button style={S.stepBtn} onClick={() => updateQty(i,-1)}><Minus size={12} /></button>
                  <span style={{ color:'#F59E0B', fontFamily:'monospace', fontWeight:800, fontSize:15, minWidth:28, textAlign:'center' }}>{item.qty}</span>
                  <button style={S.stepBtn} onClick={() => updateQty(i,+1)}><Plus size={12} /></button>
                </div>
                <button style={S.deleteBtn} onClick={() => removeItem(i)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          {parsedOrder.notes && (
            <div style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:12, padding:'10px 14px', marginBottom:16 }}>
              <span style={{ color:'#F59E0B', fontSize:11 }}>📝 {parsedOrder.notes}</span>
            </div>
          )}
        </div>

        <div style={S.reviewFooter}>
          <button style={S.primaryBtn} onClick={handleSubmit}><Send size={18} /> ORDER BHEJO</button>
          <button style={S.ghostBtn} onClick={resetOrder}>Dobara Karo</button>
        </div>
      </div>
    )
  }

  // ── Main App ──────────────────────────────────────────────────────────────
  return (
    <div style={S.screen}>
      {/* Header */}
      <div style={S.appHeader}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ ...S.avatarDot, background:salesman.color, width:40, height:40, borderRadius:12, fontSize:16 }}>{salesman.avatar}</div>
          <div>
            <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>{salesman.name}</div>
            <div style={{ color:'#6B7280', fontSize:10, fontFamily:'monospace' }}>
              {salesman.city} · {commRate}% commission
            </div>
          </div>
        </div>
        <button style={S.logoutBtn} onClick={() => { setSalesman(null); setStage('login') }}>Logout</button>
      </div>

      {/* Stats strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, padding:'10px 12px' }}>
        <StatPill icon={<ShoppingBag size={13} color="#F59E0B" />} value={stats.total}          label="Orders"    />
        <StatPill icon={<User size={13} color="#3B82F6" />}         value={stats.customers}      label="Customers" />
        <StatPill icon={<TrendingUp size={13} color="#10B981" />}   value={`₹${Math.round(stats.commission)}`} label="Commission" />
        <StatPill icon={<Star size={13} color="#8B5CF6" />}         value={stats.today}          label="Today"     />
      </div>

      {/* Tabs */}
      <div style={S.tabBar}>
        {[
          { id:'order',    icon:<Mic size={14}/>,       label:'New Order'  },
          { id:'history',  icon:<Clock size={14}/>,     label:'My Orders'  },
          { id:'report',   icon:<BarChart2 size={14}/>, label:'Report'     },
          { id:'insights', icon:<Brain size={14}/>,     label:'AI Tips'    },
        ].map(t => (
          <button key={t.id}
            style={{ ...S.tabBtn, ...(activeTab===t.id ? S.tabBtnActive : {}) }}
            onClick={() => {
              setActiveTab(t.id)
              if (t.id==='insights' && insights.length===0) {
                setInsightsLoading(true)
                getAISalesTips(myOrders, salesman.name, commRate).then(d => { setInsights(d); setInsightsLoading(false) })
              }
            }}
          >
            {t.icon}<span style={{ fontSize:10 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── ORDER TAB ── */}
      {activeTab === 'order' && (
        <div style={S.tabContent}>
          {/* Customer selector */}
          <div style={{ position:'relative' }}>
            <div style={S.fieldLabel}>CUSTOMER / RETAILER SELECT KARO</div>
            <div style={S.inputRow} onClick={() => setShowCustDrop(true)}>
              <Search size={15} color="#6B7280" />
              <input
                style={{ flex:1, background:'none', border:'none', color:'#fff', fontSize:14, outline:'none' }}
                value={custSearch}
                onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true) }}
                placeholder="Customer naam ya dukaan dhundo..."
              />
              {selCustomer && <button onClick={(e) => { e.stopPropagation(); setSelCustomer(null); setCustSearch('') }}><X size={14} color="#6B7280" /></button>}
            </div>

            {showCustDrop && (
              <div style={S.dropdown}>
                <button style={{ ...S.dropItem, color:'#F59E0B', borderBottom:'1px solid rgba(255,255,255,0.06)' }}
                  onClick={() => { setShowCustDrop(false); setShowAddCust(true) }}>
                  <Plus size={14} /> + Naya Customer Add Karo
                </button>
                {filteredCusts.slice(0,8).map(c => (
                  <button key={c.id} style={S.dropItem} onClick={() => { setSelCustomer(c); setCustSearch(c.shop_name||c.name); setShowCustDrop(false) }}>
                    <div>
                      <div style={{ color:'#fff', fontWeight:600, fontSize:13 }}>{c.shop_name || c.name}</div>
                      <div style={{ color:'#6B7280', fontSize:11 }}>{c.name} · {c.area} · {c.city}</div>
                    </div>
                  </button>
                ))}
                {filteredCusts.length === 0 && (
                  <div style={{ color:'#4B5563', fontSize:12, padding:'12px 16px', textAlign:'center' }}>Koi customer nahi mila</div>
                )}
              </div>
            )}
          </div>

          {/* Add customer modal */}
          {showAddCust && (
            <div style={S.modal} onClick={() => setShowAddCust(false)}>
              <div style={S.modalCard} onClick={e => e.stopPropagation()}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <span style={{ color:'#fff', fontWeight:700 }}>Naya Customer Add</span>
                  <button onClick={() => setShowAddCust(false)}><X size={18} color="#6B7280" /></button>
                </div>
                {[
                  ['Customer/Owner Naam *', 'name',      'Ramesh Kumar'],
                  ['Dukaan Naam',           'shop_name', 'Ram Medicals'],
                  ['Area/Locality',         'area',      'MP Nagar'],
                  ['Phone',                 'phone',     '9812345678'],
                  ['GSTIN (optional)',       'gstin',     '23AAAA...'],
                ].map(([label, key, ph]) => (
                  <div key={key} style={{ marginBottom:10 }}>
                    <div style={S.fieldLabel}>{label}</div>
                    <input
                      style={S.textInputFull}
                      value={newCust[key]}
                      onChange={e => setNewCust(p=>({...p,[key]:e.target.value}))}
                      placeholder={ph}
                    />
                  </div>
                ))}
                <button style={{ ...S.primaryBtn, marginTop:8 }} onClick={handleAddCustomer}>
                  <CheckCircle size={16} /> Add Customer
                </button>
              </div>
            </div>
          )}

          {/* Mic */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'12px 0' }}>
            <div style={{ ...S.micRing, ...(isRecording?S.micRingRec:{}) }}>
              <button
                style={{ ...S.micBtn, ...(isRecording?S.micBtnRec:{}) }}
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                onPointerLeave={stopRecording}
              >
                {isRecording ? <MicOff size={28} color="#fff" /> : <Mic size={28} color="#fff" />}
              </button>
            </div>
            <div style={{ color:'#6B7280', fontSize:12, textAlign:'center', lineHeight:1.7 }}>
              {isRecording
                ? <span style={{ color:'#EF4444' }}>● Recording... chhor do jab ho jaye</span>
                : <><b style={{ color:'#9CA3AF' }}>Press & Hold</b> mic — phir order bolo:<br/>
                    <span style={{ color:'#4B5563', fontFamily:'monospace', fontSize:11 }}>"Ram Medicals ko 10 Zifi-200 aur 5 Dolo 650"</span></>
              }
            </div>
          </div>

          {/* Transcript */}
          {transcript && (
            <div style={S.transcriptBox}>
              <div style={{ color:'#4B5563', fontSize:10, fontFamily:'monospace', letterSpacing:2, marginBottom:6 }}>SUNA GAYA</div>
              <p style={{ color:'#E5E7EB', fontSize:13, lineHeight:1.7, margin:0 }}>{transcript}</p>
              <button style={{ marginTop:8, color:'#EF4444', fontSize:11, background:'none', border:'none', cursor:'pointer' }}
                onClick={() => { setTranscript(''); finalRef.current='' }}>Clear ✕</button>
            </div>
          )}

          {/* Manual input */}
          <div>
            <div style={S.fieldLabel}>YA TYPE KARO</div>
            <textarea
              style={S.textarea}
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="10 Zifi-200, 5 Dolo 650, 2 Limcee..."
              rows={3}
            />
          </div>

          <button
            style={{ ...S.primaryBtn, opacity:(isParsing||(!transcript&&!manualInput))?0.4:1 }}
            disabled={isParsing||(!transcript&&!manualInput)}
            onClick={handleParseOrder}
          >
            {isParsing
              ? <><span style={S.spinner} /> AI Parse Kar Raha Hai...</>
              : <><Sparkles size={18} /> ORDER REVIEW KARO</>
            }
          </button>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div style={S.tabContent}>
          {/* Filter */}
          <div style={{ display:'flex', gap:6, marginBottom:4, overflowX:'auto', paddingBottom:4 }}>
            {['all','pending','processing','delivered','cancelled'].map(s => (
              <button key={s} style={{ ...S.filterChip, ...(filterStatus===s?S.filterChipActive:{}) }}
                onClick={() => setFilterStatus(s)}>
                {s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#4B5563', fontSize:13 }}>
              {filterStatus==='all'?'Abhi tak koi order nahi. Pehla order karo!':'Is status mein koi order nahi.'}
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} style={S.histCard}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{order.customer_name}</div>
                    <div style={{ color:'#6B7280', fontSize:11, fontFamily:'monospace', marginTop:2 }}>
                      {order.id} · {new Date(order.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:order.commission>0?8:0 }}>
                  {order.items?.map((item,i) => <span key={i} style={S.badge}>{item.medicine_name} ×{item.qty}</span>)}
                </div>
                {order.commission > 0 && (
                  <div style={{ color:'#10B981', fontSize:11, fontFamily:'monospace' }}>
                    💰 Commission: ₹{order.commission.toFixed(0)} ({commRate}%)
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {activeTab === 'report' && (
        <div style={S.tabContent}>
          <div style={{ color:'#F59E0B', fontSize:10, fontFamily:'monospace', letterSpacing:2, marginBottom:16 }}>SALES REPORT — {salesman.name.toUpperCase()}</div>

          {/* Summary cards */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              { label:'Total Orders',     val: stats.total,                                  color:'#fff'     },
              { label:'Customers',        val: stats.customers,                              color:'#3B82F6'  },
              { label:'Est. Order Value', val: `₹${Math.round(stats.totalVal).toLocaleString('en-IN')}`, color:'#F59E0B'  },
              { label:`Commission (${commRate}%)`, val: `₹${Math.round(stats.commission).toLocaleString('en-IN')}`, color:'#10B981' },
            ].map(s => (
              <div key={s.label} style={S.reportCard}>
                <div style={{ color:s.color, fontWeight:800, fontSize:22, marginBottom:2 }}>{s.val}</div>
                <div style={{ color:'#6B7280', fontSize:10, fontFamily:'monospace' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top customer */}
          {stats.topCust !== '—' && (
            <div style={{ background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:18, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ color:'#8B5CF6', fontSize:10, fontFamily:'monospace', letterSpacing:2, marginBottom:4 }}>TOP CUSTOMER</div>
              <div style={{ color:'#fff', fontWeight:700 }}>{stats.topCust}</div>
            </div>
          )}

          {/* Status breakdown */}
          <div style={S.reportCard}>
            <div style={{ color:'#fff', fontWeight:700, marginBottom:10 }}>Status Breakdown</div>
            {['pending','processing','delivered','cancelled'].map(s => {
              const cnt = myOrders.filter(o=>o.status===s).length
              const pct = myOrders.length>0 ? (cnt/myOrders.length)*100 : 0
              return (
                <div key={s} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ color:'#9CA3AF', fontSize:12 }}>{s.charAt(0).toUpperCase()+s.slice(1)}</span>
                    <span style={{ color:'#fff', fontFamily:'monospace', fontSize:12 }}>{cnt}</span>
                  </div>
                  <div style={{ height:4, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background: s==='delivered'?'#10B981':s==='pending'?'#F59E0B':s==='processing'?'#3B82F6':'#EF4444', borderRadius:99 }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Today's orders */}
          <div style={{ ...S.reportCard, marginTop:0 }}>
            <div style={{ color:'#fff', fontWeight:700, marginBottom:10 }}>Today's Orders ({stats.today})</div>
            {myOrders.filter(o => new Date(o.created_at).toDateString()===new Date().toDateString()).length === 0
              ? <div style={{ color:'#4B5563', fontSize:12, textAlign:'center', padding:'12px 0' }}>Aaj koi order nahi</div>
              : myOrders.filter(o => new Date(o.created_at).toDateString()===new Date().toDateString()).map(o => (
                <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:6, marginBottom:6, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ color:'#fff', fontSize:12, fontWeight:600 }}>{o.customer_name}</div>
                    <div style={{ color:'#6B7280', fontSize:10 }}>{o.items?.length} items</div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── AI INSIGHTS TAB ── */}
      {activeTab === 'insights' && (
        <div style={S.tabContent}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <Sparkles size={15} color="#F59E0B" />
            <span style={{ color:'#F59E0B', fontSize:10, fontFamily:'monospace', letterSpacing:2 }}>AI SALES COACH</span>
          </div>
          {insightsLoading ? (
            <div style={{ textAlign:'center', padding:'48px 0' }}>
              <span style={S.spinner} />
              <div style={{ color:'#6B7280', fontSize:12, marginTop:12 }}>AI tips generate ho rahe hain...</div>
            </div>
          ) : (
            <>
              {insights.map((ins, i) => (
                <div key={i} style={S.insightCard}>
                  <div style={{ fontSize:28, marginBottom:8 }}>{ins.emoji}</div>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:14, marginBottom:6 }}>{ins.title}</div>
                  <div style={{ color:'#9CA3AF', fontSize:13, lineHeight:1.6 }}>{ins.tip}</div>
                </div>
              ))}
              <button style={S.ghostBtn} onClick={() => {
                setInsights([]); setInsightsLoading(true)
                getAISalesTips(myOrders, salesman.name, commRate).then(d => { setInsights(d); setInsightsLoading(false) })
              }}>
                <RefreshCw size={14} /> Fresh Tips Lo
              </button>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:0}
      `}</style>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatPill({ icon, value, label }) {
  return (
    <div style={S.statPill}>{icon}
      <div style={{ color:'#fff', fontWeight:800, fontSize:16, lineHeight:1 }}>{value}</div>
      <div style={{ color:'#6B7280', fontSize:9, fontFamily:'monospace' }}>{label}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending:    { bg:'rgba(245,158,11,0.15)',  color:'#F59E0B',  label:'PENDING'     },
    processing: { bg:'rgba(59,130,246,0.15)',  color:'#3B82F6',  label:'PROCESSING'  },
    delivered:  { bg:'rgba(16,185,129,0.15)',  color:'#10B981',  label:'DELIVERED'   },
    cancelled:  { bg:'rgba(239,68,68,0.15)',   color:'#EF4444',  label:'CANCELLED'   },
  }
  const s = map[status] || map.pending
  return (
    <span style={{ background:s.bg, color:s.color, fontSize:9, fontFamily:'monospace', fontWeight:700, padding:'3px 8px', borderRadius:6, letterSpacing:1, whiteSpace:'nowrap' }}>
      {s.label}
    </span>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  screen:       { minHeight:'100vh', background:'#050505', color:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', display:'flex', flexDirection:'column', overflowX:'hidden', position:'relative' },
  glow:         { position:'fixed', inset:0, zIndex:0, background:'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(245,158,11,0.07) 0%,transparent 70%)', pointerEvents:'none' },
  loginWrap:    { position:'relative', zIndex:1, flex:1, padding:'60px 24px 40px', maxWidth:400, margin:'0 auto', width:'100%' },
  logoBox:      { width:64, height:64, borderRadius:20, margin:'0 auto 16px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', display:'flex', alignItems:'center', justifyContent:'center' },
  logoTitle:    { fontSize:22, fontWeight:900, letterSpacing:4, color:'#fff', textAlign:'center' },
  logoSub:      { fontSize:9, fontFamily:'monospace', letterSpacing:3, color:'#4B5563', marginTop:4, textAlign:'center' },
  card:         { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:24, padding:24, display:'flex', flexDirection:'column', gap:14 },
  codeInput:    { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'14px 16px', color:'#fff', fontSize:20, fontFamily:'monospace', letterSpacing:4, textAlign:'center', outline:'none', width:'100%' },
  primaryBtn:   { background:'linear-gradient(135deg,#F59E0B 0%,#D97706 100%)', border:'none', borderRadius:16, padding:'16px 24px', color:'#000', fontWeight:800, fontSize:14, letterSpacing:1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', transition:'opacity 0.2s' },
  ghostBtn:     { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'14px 24px', color:'#9CA3AF', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%' },
  spinner:      { display:'inline-block', width:16, height:16, border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'#000', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  appHeader:    { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 12px', borderBottom:'1px solid rgba(255,255,255,0.04)' },
  logoutBtn:    { background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'6px 12px', color:'#6B7280', fontSize:11, fontFamily:'monospace', cursor:'pointer' },
  statPill:     { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:14, padding:'10px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:4 },
  tabBar:       { display:'flex', borderBottom:'1px solid rgba(255,255,255,0.04)', padding:'0 12px' },
  tabBtn:       { flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 4px', background:'none', border:'none', color:'#4B5563', cursor:'pointer', borderBottom:'2px solid transparent', transition:'all 0.2s' },
  tabBtnActive: { color:'#F59E0B', borderBottom:'2px solid #F59E0B' },
  tabContent:   { flex:1, overflowY:'auto', padding:'14px 14px 100px', display:'flex', flexDirection:'column', gap:12 },
  fieldLabel:   { color:'#4B5563', fontSize:10, fontFamily:'monospace', letterSpacing:2, fontWeight:700, marginBottom:4 },
  inputRow:     { display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'12px 16px' },
  dropdown:     { position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, zIndex:50, maxHeight:280, overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.6)' },
  dropItem:     { width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', color:'#9CA3AF', cursor:'pointer', textAlign:'left', transition:'background 0.15s' },
  modal:        { position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(4px)', zIndex:100, display:'flex', alignItems:'flex-end', padding:12 },
  modalCard:    { width:'100%', maxWidth:400, margin:'0 auto', background:'#0d0d0d', border:'1px solid rgba(255,255,255,0.1)', borderRadius:24, padding:20, maxHeight:'80vh', overflowY:'auto' },
  textInputFull:{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 14px', color:'#fff', fontSize:14, outline:'none' },
  micRing:      { width:110, height:110, borderRadius:'50%', background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.3s' },
  micRingRec:   { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.4)', boxShadow:'0 0 30px rgba(239,68,68,0.15)' },
  micBtn:       { width:76, height:76, borderRadius:'50%', background:'linear-gradient(135deg,#1D4ED8,#2563EB)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 24px rgba(37,99,235,0.4)', touchAction:'none' },
  micBtnRec:    { background:'linear-gradient(135deg,#B91C1C,#EF4444)', boxShadow:'0 8px 24px rgba(239,68,68,0.5)' },
  transcriptBox:{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'14px 16px' },
  textarea:     { width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'12px 14px', color:'#E5E7EB', fontSize:13, outline:'none', resize:'none', fontFamily:'inherit' },
  itemRow:      { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 },
  qtyStepper:   { display:'flex', alignItems:'center', gap:6, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:'4px 8px' },
  stepBtn:      { background:'none', border:'none', color:'#F59E0B', cursor:'pointer', padding:2, display:'flex', alignItems:'center' },
  deleteBtn:    { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:8, color:'#EF4444', cursor:'pointer', padding:6, display:'flex', alignItems:'center', flexShrink:0 },
  reviewFooter: { position:'fixed', bottom:0, left:0, right:0, padding:'12px 16px 28px', background:'linear-gradient(to top,#050505 80%,transparent)', display:'flex', flexDirection:'column', gap:8 },
  backBtn:      { width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  filterChip:   { flexShrink:0, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'5px 12px', color:'#6B7280', fontSize:11, fontFamily:'monospace', cursor:'pointer', whiteSpace:'nowrap' },
  filterChipActive:{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', color:'#F59E0B' },
  histCard:     { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'14px 16px' },
  badge:        { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'3px 8px', color:'#9CA3AF', fontSize:11 },
  reportCard:   { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:18, padding:'16px', marginBottom:10 },
  insightCard:  { background:'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(245,158,11,0.02))', border:'1px solid rgba(245,158,11,0.15)', borderRadius:18, padding:'16px' },
  avatarDot:    { display:'flex', alignItems:'center', justifyContent:'center', color:'#000', fontWeight:800, flexShrink:0 },
  successRing:  { width:110, height:110, borderRadius:'50%', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center' },
  successInner: { width:80, height:80, borderRadius:'50%', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center' },
  doneCard:     { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'18px 16px', width:'100%', maxWidth:360 },
}

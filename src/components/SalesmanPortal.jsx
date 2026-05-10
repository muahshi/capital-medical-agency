import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic, MicOff, Send, User, Package, CheckCircle, Loader,
  ChevronRight, X, TrendingUp, Award, Clock, BarChart2,
  Zap, Star, ArrowLeft, ShoppingBag, Brain, Target,
  Activity, ChevronDown, Plus, Minus, Trash2, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────
const SALESMAN_CODES = {
  SALES1: { name: 'Rahul', city: 'Bhopal', avatar: 'R', color: '#F59E0B' },
  SALES2: { name: 'Vikram', city: 'Indore', avatar: 'V', color: '#3B82F6' },
  SALES3: { name: 'Suresh', city: 'Jabalpur', avatar: 'S', color: '#10B981' },
}

const STORAGE_KEY = 'cma_salesman_orders'
const MY_ORDERS_KEY = 'cma_my_orders_'

// ─── Local Storage helpers ────────────────────────────────────────────────────
function loadMyOrders(code) {
  try { return JSON.parse(localStorage.getItem(MY_ORDERS_KEY + code) || '[]') } catch { return [] }
}
function saveMyOrders(code, orders) {
  try { localStorage.setItem(MY_ORDERS_KEY + code, JSON.stringify(orders)) } catch {}
}

// ─── Groq AI helpers ─────────────────────────────────────────────────────────
async function parseOrderWithAI(transcript, salesmanName) {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key) return parseDemoOrder(transcript)

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: `You are an order parser for Capital Medical Agency, Bhopal.
Parse this voice/text order from salesman "${salesmanName}" and return ONLY valid JSON, no markdown.

Input: "${transcript}"

Return EXACTLY this format:
{
  "customer_name": "extracted customer/retailer name",
  "items": [
    {"medicine_name": "name", "qty": 10, "notes": null}
  ],
  "notes": null
}

Rules:
- Extract ALL medicine names mentioned
- qty must be a positive integer
- If customer name not found, use "Walk-in Customer"
- Return ONLY the JSON object, nothing else`
      }]
    })
  })
  if (!res.ok) throw new Error('AI parse failed')
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'
  const clean = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()
  return JSON.parse(clean)
}

async function getAIInsights(orders, salesmanName) {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key || orders.length === 0) return getDemoInsights(salesmanName)

  const summary = orders.slice(-20).map(o => ({
    customer: o.customer_name,
    items: o.items.map(i => `${i.medicine_name} x${i.qty}`).join(', '),
    date: new Date(o.created_at).toLocaleDateString('en-IN')
  }))

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: `You are a sales coach AI for Capital Medical Agency, Bhopal.
Salesman: ${salesmanName}
Recent orders (last 20): ${JSON.stringify(summary)}

Give 3 short, actionable, motivating insights in Hinglish to help them sell more.
Return ONLY valid JSON array, no markdown:
[
  {"emoji": "🎯", "title": "Short title", "tip": "1-2 sentence actionable tip in Hinglish"},
  {"emoji": "📈", "title": "Short title", "tip": "1-2 sentence actionable tip in Hinglish"},
  {"emoji": "⚡", "title": "Short title", "tip": "1-2 sentence actionable tip in Hinglish"}
]`
      }]
    })
  })
  if (!res.ok) return getDemoInsights(salesmanName)
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '[]'
  const clean = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()
  return JSON.parse(clean)
}

function getDemoInsights(name) {
  return [
    { emoji: '🎯', title: 'Top Customer Focus', tip: `${name} bhai, aapke repeat customers pe dhyan do — unhe naye products suggest karo. Loyalty hi asli sales engine hai!` },
    { emoji: '📈', title: 'Morning Orders Win', tip: 'Subah 9-11 baje ke orders sabse jaldi process hote hain. Pehle visit morning mein karo, conversion rate badh jaata hai.' },
    { emoji: '⚡', title: 'Bundle Opportunity', tip: 'Jab Paracetamol order aaye, saath mein ORS aur Vitamin C suggest karo — average order value 30% tak badh sakti hai!' },
  ]
}

function parseDemoOrder(transcript) {
  const items = []
  const words = transcript.split(/[\s,]+/)
  let i = 0
  while (i < words.length) {
    const num = parseInt(words[i])
    if (!isNaN(num) && words[i + 1]) {
      const name = words.slice(i + 1, i + 3).join(' ').replace(/[,.]$/, '')
      if (name.length > 2) items.push({ medicine_name: name, qty: num, notes: null })
      i += 3
    } else i++
  }
  const custMatch = transcript.match(/(?:customer|ko|for)[:\s]+([a-zA-Z\s]+?)(?:\s+(?:chahiye|wants|need|ko)|,|$)/i)
  const customer = custMatch ? custMatch[1].trim() : 'Walk-in Customer'
  if (items.length === 0) items.push({ medicine_name: transcript.slice(0, 30).trim() || 'Medicine', qty: 1, notes: 'Manual review needed' })
  return { customer_name: customer, items, notes: null }
}

// ─── Stats Calculator ─────────────────────────────────────────────────────────
function calcStats(orders) {
  const total = orders.length
  const totalItems = orders.reduce((s, o) => s + (o.items?.length || 0), 0)
  const customers = [...new Set(orders.map(o => o.customer_name))].length
  const today = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length
  const medicineCount = {}
  orders.forEach(o => o.items?.forEach(i => {
    const k = i.medicine_name
    medicineCount[k] = (medicineCount[k] || 0) + (i.qty || 1)
  }))
  const topMed = Object.entries(medicineCount).sort((a, b) => b[1] - a[1])[0]
  return { total, totalItems, customers, today, topMed: topMed?.[0] || '—' }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SalesmanPortal({ onOrderSubmit }) {
  const [stage, setStage] = useState('login')
  const [salesman, setSalesman] = useState(null)
  const [codeInput, setCodeInput] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [parsedOrder, setParsedOrder] = useState(null)
  const [isParsing, setIsParsing] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [myOrders, setMyOrders] = useState([])
  const [insights, setInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('order') // order | history | insights
  const [justSubmitted, setJustSubmitted] = useState(null)

  const recognitionRef = useRef(null)
  const finalTextRef = useRef('')

  // Load orders on login
  useEffect(() => {
    if (salesman) {
      const orders = loadMyOrders(salesman.code)
      setMyOrders(orders)
    }
  }, [salesman])

  // ── Login ──
  const handleLogin = () => {
    const code = codeInput.trim().toUpperCase()
    const info = SALESMAN_CODES[code]
    if (info) {
      setSalesman({ code, ...info })
      setStage('main')
    } else {
      toast.error('Galat code! CMA admin se lelo.')
    }
  }

  // ── Voice ──
  const startRecording = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) { toast.error('Voice nahi chali. Text mein type karo.'); return }

    finalTextRef.current = ''
    setTranscript('')

    const rec = new SpeechRec()
    rec.lang = 'hi-IN'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      let interim = ''
      // Only accumulate from resultIndex to avoid repeats
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTextRef.current += e.results[i][0].transcript + ' '
        } else {
          interim = e.results[i][0].transcript
        }
      }
      setTranscript((finalTextRef.current + interim).trim())
    }
    rec.onerror = () => { toast.error('Mic error'); setIsRecording(false) }
    rec.onend = () => setIsRecording(false)
    rec.start()
    recognitionRef.current = rec
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }, [])

  // ── Parse ──
  const handleParseOrder = async () => {
    const text = (transcript || manualInput).trim()
    if (!text) { toast.error('Pehle order bolo ya type karo'); return }
    setIsParsing(true)
    try {
      const parsed = await parseOrderWithAI(text, salesman.name)
      if (customerName.trim()) parsed.customer_name = customerName.trim()
      setParsedOrder(parsed)
      setStage('review')
    } catch {
      toast.error('Order parse nahi hua. Dobara try karo.')
    } finally {
      setIsParsing(false)
    }
  }

  // ── Edit qty in review ──
  const updateQty = (idx, delta) => {
    setParsedOrder(prev => {
      const items = [...prev.items]
      items[idx] = { ...items[idx], qty: Math.max(1, (items[idx].qty || 1) + delta) }
      return { ...prev, items }
    })
  }

  const removeItem = (idx) => {
    setParsedOrder(prev => {
      const items = prev.items.filter((_, i) => i !== idx)
      if (items.length === 0) { setStage('main'); return prev }
      return { ...prev, items }
    })
  }

  // ── Submit ──
  const handleSubmit = () => {
    if (!parsedOrder) return
    const order = {
      id: `ORD-${Date.now()}`,
      salesman_code: salesman.code,
      salesman_name: `${salesman.name} (${salesman.city})`,
      customer_name: parsedOrder.customer_name || customerName || 'Walk-in',
      items: parsedOrder.items,
      notes: parsedOrder.notes,
      created_at: new Date().toISOString(),
      status: 'pending',
    }
    // Save to localStorage for admin
    onOrderSubmit(order)
    // Save to my orders history
    const updated = [order, ...myOrders]
    saveMyOrders(salesman.code, updated)
    setMyOrders(updated)
    setJustSubmitted(order)
    setStage('done')
    toast.success('Order bhej diya! ✅', { duration: 3000 })
  }

  const resetOrder = () => {
    setTranscript('')
    finalTextRef.current = ''
    setManualInput('')
    setParsedOrder(null)
    setCustomerName('')
    setJustSubmitted(null)
    setStage('main')
    setActiveTab('order')
  }

  // ── Load insights ──
  const loadInsights = async () => {
    if (insights.length > 0) { setActiveTab('insights'); return }
    setActiveTab('insights')
    setInsightsLoading(true)
    try {
      const data = await getAIInsights(myOrders, salesman.name)
      setInsights(data)
    } catch {
      setInsights(getDemoInsights(salesman.name))
    } finally {
      setInsightsLoading(false)
    }
  }

  const stats = salesman ? calcStats(myOrders) : null

  // ════════════════════════════════════════════════════════
  // ── LOGIN SCREEN ──
  // ════════════════════════════════════════════════════════
  if (stage === 'login') {
    return (
      <div style={styles.screen}>
        <div style={styles.loginBg} />
        <div style={styles.loginContainer}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={styles.loginLogo}>
              <Package size={28} color="#F59E0B" />
            </div>
            <div style={styles.loginTitle}>CAPITAL MEDICAL</div>
            <div style={styles.loginSub}>SALESMAN PORTAL</div>
          </div>

          {/* Card */}
          <div style={styles.loginCard}>
            <div style={styles.fieldLabel}>APNA CODE DAALO</div>
            <input
              style={styles.codeInput}
              type="text"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="SALES1"
              maxLength={8}
            />
            <button style={styles.loginBtn} onClick={handleLogin}>
              LOGIN KARO <ChevronRight size={18} />
            </button>
          </div>

          {/* Salesman list */}
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(SALESMAN_CODES).map(([code, info]) => (
              <button key={code} style={styles.salesmanPill} onClick={() => { setCodeInput(code); }}>
                <div style={{ ...styles.avatarDot, background: info.color }}>{info.avatar}</div>
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>{info.name} — {info.city}</span>
                <span style={{ color: '#4B5563', fontSize: 11, marginLeft: 'auto', fontFamily: 'monospace' }}>{code}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // ── DONE SCREEN ──
  // ════════════════════════════════════════════════════════
  if (stage === 'done' && justSubmitted) {
    return (
      <div style={styles.screen}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', gap: 24 }}>
          {/* Success ring */}
          <div style={styles.successRing}>
            <div style={styles.successInner}>
              <CheckCircle size={36} color="#10B981" />
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#10B981', fontSize: 11, fontFamily: 'monospace', letterSpacing: 3, marginBottom: 6 }}>ORDER SUBMITTED</div>
            <div style={{ color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>Order Bheja! 🎉</div>
            <div style={{ color: '#6B7280', fontSize: 13 }}>Admin ko mil gaya — processing hoga abhi</div>
          </div>

          {/* Order summary card */}
          <div style={styles.doneCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#6B7280', fontSize: 11, fontFamily: 'monospace' }}>{justSubmitted.id}</span>
              <span style={{ color: '#F59E0B', fontSize: 11, fontFamily: 'monospace' }}>PENDING</span>
            </div>
            <div style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>{justSubmitted.customer_name}</div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>{justSubmitted.items.length} items ordered</div>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {justSubmitted.items.map((item, i) => (
                <span key={i} style={styles.itemBadge}>{item.medicine_name} ×{item.qty}</span>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button style={styles.primaryBtn} onClick={resetOrder}>
              <Plus size={18} /> Naya Order Karo
            </button>
            <button style={styles.ghostBtn} onClick={() => { setJustSubmitted(null); setStage('main'); setActiveTab('history') }}>
              Order History Dekho
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // ── REVIEW SCREEN ──
  // ════════════════════════════════════════════════════════
  if (stage === 'review' && parsedOrder) {
    return (
      <div style={styles.screen}>
        {/* Header */}
        <div style={styles.reviewHeader}>
          <button style={styles.backBtn} onClick={() => setStage('main')}>
            <ArrowLeft size={18} color="#9CA3AF" />
          </button>
          <div>
            <div style={{ color: '#6B7280', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>STEP 2 OF 2</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>ORDER CONFIRM KARO</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 100px' }}>
          {/* Customer name */}
          <div style={styles.reviewSection}>
            <div style={styles.sectionLabel}>CUSTOMER / RETAILER</div>
            <div style={{ ...styles.reviewCard, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={styles.customerIcon}><User size={16} color="#F59E0B" /></div>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{parsedOrder.customer_name}</span>
            </div>
          </div>

          {/* Items */}
          <div style={styles.reviewSection}>
            <div style={{ ...styles.sectionLabel, display: 'flex', justifyContent: 'space-between' }}>
              <span>ITEMS ({parsedOrder.items?.length})</span>
              <span style={{ color: '#4B5563' }}>Qty adjust karo ↕</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parsedOrder.items?.map((item, i) => (
                <div key={i} style={styles.itemRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.medicine_name}
                    </div>
                    {item.notes && <div style={{ color: '#6B7280', fontSize: 11, marginTop: 2 }}>{item.notes}</div>}
                  </div>
                  {/* Qty stepper */}
                  <div style={styles.qtyStepper}>
                    <button style={styles.stepBtn} onClick={() => updateQty(i, -1)}><Minus size={12} /></button>
                    <span style={{ color: '#F59E0B', fontFamily: 'monospace', fontWeight: 800, fontSize: 15, minWidth: 28, textAlign: 'center' }}>{item.qty}</span>
                    <button style={styles.stepBtn} onClick={() => updateQty(i, 1)}><Plus size={12} /></button>
                  </div>
                  <button style={styles.deleteBtn} onClick={() => removeItem(i)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          {parsedOrder.notes && (
            <div style={styles.notesBox}>
              <span style={{ color: '#F59E0B', fontSize: 11 }}>📝 {parsedOrder.notes}</span>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div style={styles.reviewFooter}>
          <button style={styles.primaryBtn} onClick={handleSubmit}>
            <Send size={18} /> ORDER BHEJO
          </button>
          <button style={styles.ghostBtn} onClick={resetOrder}>Dobara Karo</button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // ── MAIN APP (tabs) ──
  // ════════════════════════════════════════════════════════
  return (
    <div style={styles.screen}>
      {/* Header */}
      <div style={styles.appHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ ...styles.avatarDot, background: salesman.color, width: 40, height: 40, fontSize: 16, borderRadius: 12 }}>
            {salesman.avatar}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{salesman.name}</div>
            <div style={{ color: '#6B7280', fontSize: 11, fontFamily: 'monospace' }}>{salesman.city} · {stats.today} orders today</div>
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={() => setStage('login')}>Logout</button>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <StatPill icon={<ShoppingBag size={13} color="#F59E0B" />} value={stats.total} label="Orders" />
        <StatPill icon={<User size={13} color="#3B82F6" />} value={stats.customers} label="Customers" />
        <StatPill icon={<Package size={13} color="#10B981" />} value={stats.totalItems} label="Items" />
        <StatPill icon={<Star size={13} color="#8B5CF6" />} value={stats.today} label="Today" />
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {[
          { id: 'order', icon: <Mic size={15} />, label: 'New Order' },
          { id: 'history', icon: <Clock size={15} />, label: 'History' },
          { id: 'insights', icon: <Brain size={15} />, label: 'AI Tips' },
        ].map(tab => (
          <button
            key={tab.id}
            style={{ ...styles.tabBtn, ...(activeTab === tab.id ? styles.tabBtnActive : {}) }}
            onClick={() => tab.id === 'insights' ? loadInsights() : setActiveTab(tab.id)}
          >
            {tab.icon}
            <span style={{ fontSize: 11 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── ORDER TAB ── */}
      {activeTab === 'order' && (
        <div style={styles.tabContent}>
          {/* Customer name */}
          <div style={styles.fieldBlock}>
            <div style={styles.fieldLabel}>CUSTOMER / RETAILER NAME</div>
            <div style={styles.inputRow}>
              <User size={16} color="#6B7280" style={{ flexShrink: 0 }} />
              <input
                style={styles.textInput}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Ram Medicals, Indore"
              />
            </div>
          </div>

          {/* Mic button */}
          <div style={styles.micSection}>
            <div style={styles.micRing}>
              <div style={{ ...styles.micRingInner, ...(isRecording ? styles.micRingRecording : {}) }}>
                <button
                  style={{ ...styles.micBtn, ...(isRecording ? styles.micBtnRecording : {}) }}
                  onPointerDown={startRecording}
                  onPointerUp={stopRecording}
                  onPointerLeave={stopRecording}
                >
                  {isRecording
                    ? <MicOff size={30} color="#fff" />
                    : <Mic size={30} color="#fff" />
                  }
                </button>
              </div>
            </div>
            <div style={{ color: '#6B7280', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
              {isRecording
                ? <span style={{ color: '#EF4444' }}>● Recording... chhor do jab ho jaye</span>
                : <><b style={{ color: '#9CA3AF' }}>Press & Hold</b> karo aur bolte raho:<br/><span style={{ color: '#6B7280', fontFamily: 'monospace', fontSize: 11 }}>"Ram Medicals ko 50 Paracetamol chahiye"</span></>
              }
            </div>

            {/* Waveform */}
            {isRecording && (
              <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 24 }}>
                {[...Array(9)].map((_, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 99, background: '#EF4444',
                    animation: `wave 0.8s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`,
                    height: `${6 + Math.sin(i) * 10 + 6}px`
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Transcript */}
          {transcript && (
            <div style={styles.transcriptBox}>
              <div style={{ color: '#6B7280', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 6 }}>SUNA GAYA</div>
              <p style={{ color: '#E5E7EB', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{transcript}</p>
              <button style={{ marginTop: 8, color: '#EF4444', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => { setTranscript(''); finalTextRef.current = '' }}>
                Clear ✕
              </button>
            </div>
          )}

          {/* Manual input */}
          <div style={styles.fieldBlock}>
            <div style={styles.fieldLabel}>YA TYPE KARO (voice nahi chali?)</div>
            <textarea
              style={styles.textarea}
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="e.g. 50 Paracetamol 500mg, 20 Amoxicillin 500mg..."
              rows={3}
            />
          </div>

          {/* Parse button */}
          <button
            style={{ ...styles.primaryBtn, opacity: (isParsing || (!transcript && !manualInput)) ? 0.4 : 1 }}
            disabled={isParsing || (!transcript && !manualInput)}
            onClick={handleParseOrder}
          >
            {isParsing
              ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> AI Parse Kar Raha Hai...</>
              : <><Zap size={18} /> ORDER REVIEW KARO</>
            }
          </button>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div style={styles.tabContent}>
          {myOrders.length === 0 ? (
            <div style={styles.emptyState}>
              <Clock size={40} color="#374151" />
              <div style={{ color: '#6B7280', marginTop: 12 }}>Abhi tak koi order nahi</div>
              <div style={{ color: '#4B5563', fontSize: 12, marginTop: 4 }}>Pehla order karo!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ color: '#6B7280', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 }}>
                TOTAL {myOrders.length} ORDERS
              </div>
              {myOrders.map(order => (
                <div key={order.id} style={styles.historyCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{order.customer_name}</span>
                    <span style={{
                      ...styles.statusBadge,
                      background: order.status === 'processed' ? '#064E3B' : '#1C1917',
                      color: order.status === 'processed' ? '#10B981' : '#F59E0B',
                      borderColor: order.status === 'processed' ? '#065F46' : '#78350F',
                    }}>
                      {order.status === 'processed' ? '✓ DONE' : 'PENDING'}
                    </span>
                  </div>
                  <div style={{ color: '#6B7280', fontSize: 11, fontFamily: 'monospace', marginBottom: 8 }}>
                    {order.id} · {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {order.items?.map((item, i) => (
                      <span key={i} style={styles.itemBadge}>{item.medicine_name} ×{item.qty}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INSIGHTS TAB ── */}
      {activeTab === 'insights' && (
        <div style={styles.tabContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sparkles size={16} color="#F59E0B" />
            <span style={{ color: '#F59E0B', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2 }}>AI SALES COACH</span>
          </div>

          {insightsLoading ? (
            <div style={styles.emptyState}>
              <Loader size={32} color="#F59E0B" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ color: '#6B7280', marginTop: 12, fontSize: 13 }}>AI insights generate ho rahe hain...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {insights.map((ins, i) => (
                <div key={i} style={styles.insightCard}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{ins.emoji}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{ins.title}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 1.6 }}>{ins.tip}</div>
                </div>
              ))}

              {/* Performance bar */}
              {myOrders.length > 0 && (
                <div style={styles.perfCard}>
                  <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity size={16} color="#F59E0B" /> Aapka Performance
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <PerfBar label="Orders Today" value={stats.today} max={10} color="#F59E0B" />
                    <PerfBar label="Total Customers" value={stats.customers} max={50} color="#3B82F6" />
                    <PerfBar label="Total Orders" value={stats.total} max={100} color="#10B981" />
                  </div>
                  <div style={{ marginTop: 12, color: '#6B7280', fontSize: 11 }}>
                    Top medicine: <span style={{ color: '#F59E0B' }}>{stats.topMed}</span>
                  </div>
                </div>
              )}

              <button style={{ ...styles.ghostBtn, marginTop: 4 }} onClick={() => { setInsights([]); loadInsights() }}>
                <Zap size={14} /> Fresh Insights Lo
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatPill({ icon, value, label }) {
  return (
    <div style={styles.statPill}>
      {icon}
      <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}>{label}</div>
    </div>
  )
}

function PerfBar({ label, value, max, color }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#9CA3AF', fontSize: 11 }}>{label}</span>
        <span style={{ color, fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: '#1F2937', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  screen: {
    minHeight: '100vh',
    background: '#050505',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
    position: 'relative',
  },
  loginBg: {
    position: 'fixed', inset: 0, zIndex: 0,
    background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  loginContainer: {
    position: 'relative', zIndex: 1,
    flex: 1, padding: '60px 24px 40px',
    maxWidth: 400, margin: '0 auto', width: '100%',
  },
  loginLogo: {
    width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  loginTitle: {
    fontSize: 22, fontWeight: 900, letterSpacing: 4, color: '#fff',
  },
  loginSub: {
    fontSize: 10, fontFamily: 'monospace', letterSpacing: 4, color: '#4B5563', marginTop: 4,
  },
  loginCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 24, padding: 24,
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  codeInput: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14, padding: '14px 16px',
    color: '#fff', fontSize: 22, fontFamily: 'monospace',
    letterSpacing: 6, textAlign: 'center',
    outline: 'none', width: '100%',
  },
  loginBtn: {
    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    border: 'none', borderRadius: 14,
    padding: '14px 24px', color: '#000',
    fontWeight: 800, fontSize: 14, letterSpacing: 2,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8, width: '100%',
  },
  salesmanPill: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 12, padding: '10px 14px',
    display: 'flex', alignItems: 'center', gap: 10,
    cursor: 'pointer', width: '100%',
  },
  avatarDot: {
    width: 32, height: 32, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#000', fontWeight: 800, fontSize: 13, flexShrink: 0,
  },
  appHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 16px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  logoutBtn: {
    background: 'none', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '6px 12px',
    color: '#6B7280', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
  },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8, padding: '10px 12px',
  },
  statPill: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 14, padding: '10px 8px',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4,
  },
  tabBar: {
    display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)',
    padding: '0 12px',
  },
  tabBtn: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4, padding: '10px 8px',
    background: 'none', border: 'none', color: '#4B5563',
    cursor: 'pointer', borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    color: '#F59E0B',
    borderBottom: '2px solid #F59E0B',
  },
  tabContent: {
    flex: 1, overflowY: 'auto', padding: '16px 16px 100px',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  fieldBlock: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: {
    color: '#4B5563', fontSize: 10, fontFamily: 'monospace',
    letterSpacing: 2, fontWeight: 700,
  },
  inputRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '12px 16px',
  },
  textInput: {
    flex: 1, background: 'none', border: 'none',
    color: '#fff', fontSize: 14, outline: 'none',
  },
  micSection: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 16, padding: '12px 0',
  },
  micRing: {
    width: 120, height: 120, borderRadius: '50%',
    background: 'rgba(245,158,11,0.05)',
    border: '1px solid rgba(245,158,11,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  micRingInner: {
    width: 96, height: 96, borderRadius: '50%',
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  micRingRecording: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.4)',
    boxShadow: '0 0 30px rgba(239,68,68,0.2)',
  },
  micBtn: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
    transition: 'all 0.2s',
  },
  micBtnRecording: {
    background: 'linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)',
    boxShadow: '0 8px 32px rgba(239,68,68,0.5)',
    transform: 'scale(1.05)',
  },
  transcriptBox: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: '14px 16px',
  },
  textarea: {
    width: '100%', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: '12px 14px',
    color: '#E5E7EB', fontSize: 13, outline: 'none',
    resize: 'none', fontFamily: 'inherit',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    border: 'none', borderRadius: 16, padding: '16px 24px',
    color: '#000', fontWeight: 800, fontSize: 14, letterSpacing: 1,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8, width: '100%',
    transition: 'opacity 0.2s, transform 0.15s',
  },
  ghostBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '14px 24px',
    color: '#9CA3AF', fontWeight: 600, fontSize: 13,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8, width: '100%',
  },
  reviewHeader: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '20px 16px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewSection: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 },
  sectionLabel: {
    color: '#4B5563', fontSize: 10, fontFamily: 'monospace',
    letterSpacing: 2, fontWeight: 700, display: 'flex',
    alignItems: 'center',
  },
  reviewCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: '14px 16px',
  },
  customerIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  itemRow: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: '12px 14px',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  qtyStepper: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: 10, padding: '4px 8px',
  },
  stepBtn: {
    background: 'none', border: 'none', color: '#F59E0B',
    cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center',
  },
  deleteBtn: {
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: 8, color: '#EF4444', cursor: 'pointer',
    padding: '6px', display: 'flex', alignItems: 'center',
    flexShrink: 0,
  },
  notesBox: {
    background: 'rgba(245,158,11,0.06)',
    border: '1px solid rgba(245,158,11,0.15)',
    borderRadius: 12, padding: '10px 14px',
  },
  reviewFooter: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    padding: '12px 16px 24px',
    background: 'linear-gradient(to top, #050505 80%, transparent)',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  historyCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: '14px 16px',
  },
  statusBadge: {
    fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
    border: '1px solid', borderRadius: 6, padding: '3px 7px',
    letterSpacing: 1,
  },
  itemBadge: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '3px 8px',
    color: '#9CA3AF', fontSize: 11,
  },
  insightCard: {
    background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.02) 100%)',
    border: '1px solid rgba(245,158,11,0.15)',
    borderRadius: 18, padding: '18px 16px',
  },
  perfCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 18, padding: '18px 16px',
  },
  emptyState: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '60px 0', gap: 0,
  },
  successRing: {
    width: 110, height: 110, borderRadius: '50%',
    background: 'rgba(16,185,129,0.06)',
    border: '1px solid rgba(16,185,129,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  successInner: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  doneCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 20, padding: '18px 16px', width: '100%', maxWidth: 360,
  },
}

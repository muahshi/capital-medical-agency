// ─── src/components/InsightsPage.jsx — AI-powered ERP Insights v3.0 ──────────
import { useMemo, useState } from 'react'
import {
  Brain, ChevronLeft, Package, Clock, Lightbulb,
  BarChart2, FileText, Mic, MicOff, AlertTriangle,
  TrendingDown, ShoppingCart, Zap, RefreshCw, X,
  CheckCircle, Loader, Receipt, Star, Target
} from 'lucide-react'
import { differenceInDays, parseISO, isValid } from 'date-fns'
import { formatCurrency, getDaysToExpiry, formatExpiry } from '../lib/stockUtils'
import toast from 'react-hot-toast'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function askGroq(prompt, system = '', json = false) {
  if (!GROQ_KEY) throw new Error('GROQ key nahi hai')
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.2,
      response_format: json ? { type: 'json_object' } : undefined,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt }
      ]
    })
  })
  if (!res.ok) throw new Error('Groq API error')
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ── GST Calculator ─────────────────────────────────────────────────────────────
function calculateGST(items) {
  let totalTaxable = 0, totalCGST = 0, totalSGST = 0
  const slabs = { 5: 0, 12: 0, 18: 0, 28: 0 }
  items.forEach(i => {
    const gst = i.gst_percent || 12
    const taxable = (i.quantity || 0) * (i.unit_price || 0)
    const cgst = taxable * (gst / 2) / 100
    const sgst = taxable * (gst / 2) / 100
    totalTaxable += taxable
    totalCGST += cgst
    totalSGST += sgst
    const slab = [5, 12, 18, 28].reduce((a, b) => Math.abs(b - gst) < Math.abs(a - gst) ? b : a)
    slabs[slab] += taxable
  })
  return { totalTaxable, totalCGST, totalSGST, grandTotal: totalTaxable + totalCGST + totalSGST, slabs }
}

// ── Local insight generators ───────────────────────────────────────────────────
function buildInsights(items) {
  const today = new Date()
  const insights = []

  const dead = items.filter(i => i.created_at && differenceInDays(today, parseISO(i.created_at)) > 60 && i.quantity > 0)
  if (dead.length > 0) {
    const blocked = dead.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    insights.push({ type: 'dead_stock', severity: 'high', emoji: '💀',
      title: `${dead.length} Dead Stock Items`,
      desc: `₹${blocked.toLocaleString('en-IN')} blocked capital — items not moving for 60+ days`,
      items: dead.slice(0, 5), action: 'Return to supplier ya discount sale karo' })
  }

  const expiring30 = items.filter(i => { const d = getDaysToExpiry(i.expiry_date); return d !== null && d >= 0 && d <= 30 })
  if (expiring30.length > 0)
    insights.push({ type: 'expiry_urgent', severity: 'critical', emoji: '⚠️',
      title: `${expiring30.length} Items Expire in 30 Days!`,
      desc: `Turant action required — return/sell karo`,
      items: expiring30.slice(0, 5), action: 'Supplier ko return note bhejo' })

  const low = items.filter(i => i.quantity > 0 && i.quantity < (i.low_stock_threshold || 50))
  if (low.length > 0)
    insights.push({ type: 'reorder', severity: 'medium', emoji: '📦',
      title: `${low.length} Items Need Reorder`,
      desc: `Stock critical level pe — supplier ko order karo`,
      items: low.slice(0, 5), action: 'Purchase order banao' })

  const outOfStock = items.filter(i => i.quantity === 0)
  if (outOfStock.length > 0)
    insights.push({ type: 'out_of_stock', severity: 'high', emoji: '🚨',
      title: `${outOfStock.length} Items Out of Stock`,
      desc: `Sales rok rahe hain — immediately reorder karo`,
      items: outOfStock.slice(0, 5), action: 'Emergency purchase order' })

  return insights
}

const TABS = [
  { id: 'insights',    icon: <Brain size={14} />,      label: 'AI Insights'  },
  { id: 'gst',         icon: <Receipt size={14} />,    label: 'GST Summary'  },
  { id: 'reorder',     icon: <ShoppingCart size={14}/>, label: 'Reorder List' },
  { id: 'voice',       icon: <Mic size={14} />,        label: 'AI Assistant' },
]

export default function InsightsPage({ items, orders = [], onBack }) {
  const [activeTab,      setActiveTab]      = useState('insights')
  const [aiAnalysis,     setAiAnalysis]     = useState('')
  const [aiLoading,      setAiLoading]      = useState(false)
  const [voiceText,      setVoiceText]      = useState('')
  const [voiceAnswer,    setVoiceAnswer]    = useState('')
  const [voiceLoading,   setVoiceLoading]   = useState(false)
  const [isRecording,    setIsRecording]    = useState(false)
  const [recRef,         setRecRef]         = useState(null)
  const [finalRef]                          = useState({ current: '' })

  const insights = useMemo(() => buildInsights(items), [items])
  const gst      = useMemo(() => calculateGST(items),  [items])

  const reorderItems = useMemo(() =>
    items.filter(i => i.quantity < (i.low_stock_threshold || 50))
      .sort((a, b) => a.quantity - b.quantity)
  , [items])

  // ── AI Full Analysis ──────────────────────────────────────────────────────
  const runAIAnalysis = async () => {
    if (!GROQ_KEY) { toast.error('GROQ API key required'); return }
    setAiLoading(true)
    setAiAnalysis('')
    try {
      const summary = items.slice(0, 40).map(i => ({
        name: i.medicine_name,
        qty: i.quantity,
        exp: i.expiry_date ? getDaysToExpiry(i.expiry_date) + 'd' : 'N/A',
        val: `₹${(i.quantity * i.unit_price).toFixed(0)}`
      }))
      const orderSummary = orders.slice(0, 20).map(o => ({
        customer: o.customer_name,
        items: o.items?.length,
        salesman: o.salesman_name,
        status: o.status
      }))
      const text = await askGroq(
        `You are an AI business analyst for Capital Medical Agency, Bhopal — a medical distributor.
Analyze this inventory and order data and give 5 specific, actionable business insights in Hinglish.
Be specific with medicine names and numbers.

INVENTORY (${items.length} items): ${JSON.stringify(summary)}
RECENT ORDERS (${orders.length} total): ${JSON.stringify(orderSummary)}
STOCK VALUE: ₹${items.reduce((s,i) => s + i.quantity*i.unit_price, 0).toLocaleString('en-IN')}

Give insights as numbered list. Each insight: 2-3 lines. Focus on:
1. Dead stock / slow movers
2. Reorder urgency
3. Expiry risk
4. Sales pattern
5. Profit opportunity`,
        'You are a medical inventory AI analyst for Indian pharmaceutical distributors.'
      )
      setAiAnalysis(text)
    } catch (e) {
      toast.error('AI analysis failed: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // ── Voice Assistant ────────────────────────────────────────────────────────
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.error('Voice nahi chali — type karo'); return }
    finalRef.current = ''
    setVoiceText('')
    setVoiceAnswer('')
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
      setVoiceText((finalRef.current + interim).trim())
    }
    rec.onend = () => setIsRecording(false)
    rec.start()
    setRecRef(rec)
    setIsRecording(true)
  }

  const stopVoice = () => { recRef?.stop(); setIsRecording(false) }

  const askVoiceQuestion = async () => {
    const q = voiceText.trim()
    if (!q) { toast.error('Pehle question poocho'); return }
    if (!GROQ_KEY) { toast.error('GROQ key required'); return }
    setVoiceLoading(true)
    setVoiceAnswer('')
    try {
      const ctx = items.slice(0, 30).map(i =>
        `${i.medicine_name}: qty=${i.quantity}, exp=${i.expiry_date || 'N/A'}, price=₹${i.unit_price}`
      ).join('\n')
      const ans = await askGroq(
        `Inventory data:\n${ctx}\n\nQuestion: ${q}\n\nAnswer in Hinglish, 2-4 lines, specific numbers.`,
        'You are CMA AI assistant. Answer questions about medical inventory in Hinglish.'
      )
      setVoiceAnswer(ans)
    } catch (e) {
      toast.error('AI failed: ' + e.message)
    } finally {
      setVoiceLoading(false)
    }
  }

  const copyReorderList = () => {
    const text = `REORDER LIST — Capital Medical Agency\nDate: ${new Date().toLocaleDateString('en-IN')}\n\n` +
      reorderItems.map((i, idx) => `${idx+1}. ${i.medicine_name} | Stock: ${i.quantity} | Min: ${i.low_stock_threshold || 50}`).join('\n')
    navigator.clipboard?.writeText(text).then(() => toast.success('Copied!'))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">Intelligence</p>
        <h1 className="text-white text-3xl font-bold tracking-widest">AI INSIGHTS</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === t.id
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-white/3 text-gray-500 border border-white/5'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">

        {/* ── INSIGHTS TAB ── */}
        {activeTab === 'insights' && (
          <>
            {/* AI full analysis button */}
            <button onClick={runAIAnalysis} disabled={aiLoading}
              className="w-full flex items-center gap-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl px-4 py-4 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {aiLoading
                ? <Loader size={18} className="text-yellow-500 animate-spin shrink-0" />
                : <Zap size={18} className="text-yellow-500 shrink-0" />
              }
              <div className="text-left">
                <p className="text-white font-bold text-sm">Full AI Business Analysis</p>
                <p className="text-gray-500 text-xs">Groq se deep inventory + order insights</p>
              </div>
              <RefreshCw size={14} className="text-gray-600 ml-auto" />
            </button>

            {aiAnalysis && (
              <div className="bg-[#0d0d0d] border border-yellow-500/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={14} className="text-yellow-500" />
                  <span className="text-yellow-500 text-[10px] font-mono uppercase tracking-widest">AI Analysis</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
              </div>
            )}

            {/* Auto insights */}
            {insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircle size={40} className="text-green-500" />
                <p className="text-white font-semibold">Sab theek hai!</p>
                <p className="text-gray-500 text-sm text-center">Koi urgent alert nahi abhi.</p>
              </div>
            ) : (
              insights.map((ins, idx) => (
                <div key={idx} className={`rounded-2xl p-4 border ${
                  ins.severity === 'critical' ? 'bg-red-950/25 border-red-500/25' :
                  ins.severity === 'high'     ? 'bg-orange-950/20 border-orange-500/20' :
                                               'bg-yellow-950/15 border-yellow-500/15'
                }`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{ins.emoji}</span>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{ins.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{ins.desc}</p>
                    </div>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                      ins.severity === 'critical' ? 'text-red-400 border-red-500/30' :
                      ins.severity === 'high'     ? 'text-orange-400 border-orange-500/30' :
                                                   'text-yellow-400 border-yellow-500/30'
                    }`}>{ins.severity.toUpperCase()}</span>
                  </div>
                  {ins.items?.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {ins.items.map((i, j) => (
                        <div key={j} className="flex items-center justify-between bg-black/20 rounded-xl px-3 py-1.5">
                          <p className="text-white text-xs truncate flex-1">{i.medicine_name}</p>
                          <span className="text-gray-400 text-[11px] font-mono ml-2">qty: {i.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
                    <Target size={12} className="text-yellow-500 shrink-0" />
                    <p className="text-yellow-400 text-xs">{ins.action}</p>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── GST TAB ── */}
        {activeTab === 'gst' && (
          <>
            <div className="bg-[#0d0d0d] border border-white/6 rounded-2xl p-5">
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-4">GST Summary — Current Inventory</p>
              <div className="space-y-3">
                <GSTRow label="Total Taxable Value"  value={formatCurrency(gst.totalTaxable)} />
                <GSTRow label="CGST"                 value={formatCurrency(gst.totalCGST)}    sub="Central" />
                <GSTRow label="SGST"                 value={formatCurrency(gst.totalSGST)}    sub="State" />
                <div className="border-t border-white/5 pt-3">
                  <GSTRow label="Grand Total (incl. GST)" value={formatCurrency(gst.grandTotal)} highlight />
                </div>
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-white/6 rounded-2xl p-4">
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-3">Slab-wise Breakup</p>
              {Object.entries(gst.slabs).map(([slab, val]) => (
                val > 0 && (
                  <div key={slab} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white bg-white/10 px-2 py-0.5 rounded-lg">{slab}% GST</span>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-bold">{formatCurrency(val)}</p>
                      <p className="text-gray-600 text-[10px]">taxable</p>
                    </div>
                  </div>
                )
              ))}
            </div>

            <div className="bg-[#0d0d0d] border border-white/6 rounded-2xl p-4 space-y-2">
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Notes</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                • Medicines mostly fall under 5% or 12% GST slab<br/>
                • CGST + SGST for intra-state (Madhya Pradesh)<br/>
                • IGST for inter-state supply<br/>
                • Items without GST% assumed 12%
              </p>
            </div>
          </>
        )}

        {/* ── REORDER TAB ── */}
        {activeTab === 'reorder' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">{reorderItems.length} items need reorder</p>
              {reorderItems.length > 0 && (
                <button onClick={copyReorderList}
                  className="text-yellow-500 text-xs font-mono flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl"
                >
                  <FileText size={12} /> Copy List
                </button>
              )}
            </div>

            {reorderItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircle size={40} className="text-green-500" />
                <p className="text-white font-semibold">Stock Healthy!</p>
                <p className="text-gray-500 text-sm">Koi item low stock nahi hai abhi.</p>
              </div>
            ) : (
              <div className="bg-[#0d0d0d] border border-white/6 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 border-b border-white/5">
                  <span className="text-gray-600 text-[10px] font-mono uppercase">MEDICINE</span>
                  <span className="text-gray-600 text-[10px] font-mono uppercase">STOCK</span>
                  <span className="text-gray-600 text-[10px] font-mono uppercase">MIN</span>
                </div>
                {reorderItems.map((item, i) => {
                  const pct = Math.min(100, (item.quantity / (item.low_stock_threshold || 50)) * 100)
                  return (
                    <div key={item.id} className={`px-4 py-3 ${i < reorderItems.length-1 ? 'border-b border-white/5' : ''}`}>
                      <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                        <div>
                          <p className="text-white text-sm leading-tight">{item.medicine_name}</p>
                          <p className="text-gray-600 text-[10px] font-mono mt-0.5">{item.batch_no || '—'}</p>
                        </div>
                        <span className={`font-mono text-sm font-bold ${item.quantity === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-gray-500 font-mono text-sm">{item.low_stock_threshold || 50}</span>
                      </div>
                      <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct < 30 ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${pct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── VOICE ASSISTANT TAB ── */}
        {activeTab === 'voice' && (
          <>
            <div className="bg-[#0d0d0d] border border-white/6 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={14} className="text-yellow-500" />
                <p className="text-white font-bold text-sm">AI Inventory Assistant</p>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                Koi bhi question poocho — "Kitna Paracetamol hai?", "Kya expire hone wala hai?", "Reorder kya karna hai?"
              </p>
            </div>

            {/* Mic */}
            <div className="flex flex-col items-center gap-4 py-4">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all ${
                isRecording
                  ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/20'
                  : 'bg-white/3 border-white/10'
              }`}>
                <button
                  onPointerDown={startVoice}
                  onPointerUp={stopVoice}
                  onPointerLeave={stopVoice}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                    isRecording ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                >
                  {isRecording ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-black" />}
                </button>
              </div>
              <p className="text-gray-500 text-xs text-center font-mono">
                {isRecording ? '● Recording...' : 'Press & Hold to speak'}
              </p>
            </div>

            {/* Text input fallback */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-3 flex items-center gap-3">
              <input
                className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-gray-700"
                value={voiceText}
                onChange={e => setVoiceText(e.target.value)}
                placeholder="Ya type karo apna question..."
                onKeyDown={e => e.key === 'Enter' && askVoiceQuestion()}
              />
              {voiceText && (
                <button onClick={() => setVoiceText('')}><X size={14} className="text-gray-600" /></button>
              )}
            </div>

            <button
              onClick={askVoiceQuestion}
              disabled={!voiceText.trim() || voiceLoading}
              className="w-full bg-yellow-500 disabled:opacity-40 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {voiceLoading ? <Loader size={18} className="animate-spin" /> : <Zap size={18} />}
              {voiceLoading ? 'AI Soch Raha Hai...' : 'Ask AI'}
            </button>

            {voiceAnswer && (
              <div className="bg-[#0d0d0d] border border-yellow-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={12} className="text-yellow-500" />
                  <span className="text-yellow-500 text-[10px] font-mono uppercase">AI Answer</span>
                </div>
                <p className="text-white text-sm leading-relaxed">{voiceAnswer}</p>
              </div>
            )}

            {/* Sample questions */}
            <div className="space-y-2">
              <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">Sample Questions</p>
              {[
                'Kaunsi medicines expire hone wali hain?',
                'Sabse zyada quantity kiska hai?',
                'Total stock value kitni hai?',
                'Kya reorder karna chahiye?',
              ].map(q => (
                <button key={q} onClick={() => setVoiceText(q)}
                  className="w-full text-left bg-white/3 border border-white/5 rounded-xl px-4 py-2.5 text-gray-400 text-xs active:bg-white/5">
                  "{q}"
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function GSTRow({ label, value, sub, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm ${highlight ? 'text-white font-bold' : 'text-gray-400'}`}>{label}</p>
        {sub && <p className="text-gray-600 text-[10px]">{sub}</p>}
      </div>
      <p className={`font-mono font-bold ${highlight ? 'text-yellow-500 text-lg' : 'text-white text-sm'}`}>{value}</p>
    </div>
  )
}

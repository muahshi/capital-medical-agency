import { useMemo, useState, useRef } from 'react'
import {
  TrendingDown, AlertTriangle, Brain, ChevronLeft,
  Package, Clock, ShoppingCart, Lightbulb, ChevronRight,
  BarChart2, FileText, Mic, MicOff, Upload, Camera,
  CheckCircle, Loader, Receipt, MessageSquare
} from 'lucide-react'
import { differenceInDays, parseISO, isValid } from 'date-fns'
import { formatCurrency, getDaysToExpiry, formatExpiry } from '../lib/stockUtils'
import toast from 'react-hot-toast'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

// ── AI call helper ──
async function askGroq(prompt, systemMsg = '') {
  if (!GROQ_KEY) throw new Error('GROQ key nahi hai')
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.2,
      messages: [
        ...(systemMsg ? [{ role: 'system', content: systemMsg }] : []),
        { role: 'user', content: prompt }
      ]
    })
  })
  if (!res.ok) throw new Error('Groq API error')
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ── Prescription Vision API ──
async function readPrescriptionWithGroq(base64, mimeType) {
  if (!GROQ_KEY) {
    return `DEMO PRESCRIPTION READ:\n\n1. Paracetamol 500mg - 1 tab TDS x 5 days\n2. Cetirizine 10mg - 1 tab OD x 3 days\n3. Amoxicillin 250mg - 1 cap BD x 7 days\n\n(Demo mode - GROQ key add karo real reading ke liye)`
  }
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: `You are a medical prescription reader for Indian pharmacies. Read this handwritten or printed prescription and extract:
1. Each medicine name
2. Dosage/strength
3. Frequency (TDS, BD, OD etc)
4. Duration

Format as a clean numbered list. If something is unclear, write [unclear]. Respond in English.` }
        ]
      }]
    })
  })
  if (!res.ok) throw new Error('Vision API error')
  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'Could not read prescription'
}

// ── GST Calculator ──
function calculateGST(items) {
  const gstSlabs = { 5: [], 12: [], 18: [], 28: [] }
  let totalTaxable = 0, totalCGST = 0, totalSGST = 0, grandTotal = 0

  items.forEach(item => {
    const gst = item.gst_percent || 12
    const taxable = (item.quantity || 0) * (item.unit_price || 0)
    const cgst = taxable * (gst / 2) / 100
    const sgst = taxable * (gst / 2) / 100
    totalTaxable += taxable
    totalCGST += cgst
    totalSGST += sgst
    grandTotal += taxable + cgst + sgst
    const slab = [5, 12, 18, 28].reduce((a, b) => Math.abs(b - gst) < Math.abs(a - gst) ? b : a)
    gstSlabs[slab].push({ ...item, taxable, cgst, sgst })
  })

  return { gstSlabs, totalTaxable, totalCGST, totalSGST, grandTotal }
}

// ── Insights generator ──
function generateInsights(items) {
  const today = new Date()
  const insights = []

  const deadStock = items.filter(item => {
    if (!item.created_at) return false
    return differenceInDays(today, parseISO(item.created_at)) > 60 && item.quantity > 0
  })
  if (deadStock.length > 0) {
    const blocked = deadStock.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    insights.push({ type: 'dead_stock', severity: 'high', icon: 'dead',
      title: `${deadStock.length} Dead Stock Items!`,
      message: `${formatCurrency(blocked)} ka paisa block — 60+ din se nahi bika.`,
      action: 'Discount par nikalo ya supplier ko return bhejo.',
      items: deadStock.slice(0, 5) })
  }

  const expiring = items.filter(i => { const d = getDaysToExpiry(i.expiry_date); return d !== null && d >= 0 && d <= 90 })
    .sort((a, b) => getDaysToExpiry(a.expiry_date) - getDaysToExpiry(b.expiry_date))
  if (expiring.length > 0) {
    insights.push({ type: 'expiry', severity: 'high', icon: 'expiry',
      title: `${expiring.length} items 90 din mein expire!`,
      message: expiring.slice(0, 3).map(i => i.medicine_name).join(', '),
      action: '15-20% discount par nikalo ya company return note banao.',
      items: expiring.slice(0, 5) })
  }

  const lowStock = items.filter(i => i.quantity <= (i.low_stock_threshold || 100) && i.quantity > 0)
  if (lowStock.length > 0) {
    insights.push({ type: 'procurement', severity: 'medium', icon: 'procurement',
      title: `${lowStock.length} items low stock mein`,
      message: lowStock.slice(0, 3).map(i => i.medicine_name).join(', '),
      action: 'Supplier ko abhi order bhejo. Lead time 2-3 din hoti hai.',
      items: lowStock.slice(0, 5) })
  }

  const topValue = [...items].sort((a, b) => b.quantity * b.unit_price - a.quantity * a.unit_price).slice(0, 3)
  if (topValue.length > 0) {
    insights.push({ type: 'high_value', severity: 'info', icon: 'value',
      title: 'Top Value Items',
      message: `${topValue[0].medicine_name} — ${formatCurrency(topValue[0].quantity * topValue[0].unit_price)} ka stock.`,
      action: 'Inhe priority par sell karo. Turnover high rakho.',
      items: topValue })
  }

  const month = today.getMonth() + 1
  const seasonal = month >= 6 && month <= 9
    ? { meds: ['Ciprofloxacin', 'ORS', 'Metronidazole', 'Norflox'], season: 'Barsat (Monsoon)' }
    : month >= 10 || month <= 2
    ? { meds: ['Cetirizine', 'Paracetamol', 'Cough syrup', 'Azithromycin'], season: 'Sardi (Winter)' }
    : { meds: ['Electrolytes', 'Antacids', 'ORS', 'Vitamin C'], season: 'Garmi (Summer)' }
  insights.push({ type: 'seasonal', severity: 'info', icon: 'seasonal',
    title: `${seasonal.season} Procurement Hint`,
    message: `Is mausam mein zyada bikti hain: ${seasonal.meds.join(', ')}`,
    action: 'Inhe extra stock karo abhi. Demand badhne wali hai.',
    items: [] })

  return insights
}

const SEV = {
  high: { bg: 'bg-red-950/25', border: 'border-red-800/40', badge: 'bg-red-500/20 text-red-400', dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-950/20', border: 'border-amber-800/30', badge: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-500' },
  info: { bg: 'bg-blue-950/20', border: 'border-blue-800/20', badge: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-500' },
}
const ICONS = {
  dead: <TrendingDown className="w-5 h-5" />,
  expiry: <Clock className="w-5 h-5" />,
  procurement: <ShoppingCart className="w-5 h-5" />,
  value: <BarChart2 className="w-5 h-5" />,
  seasonal: <Lightbulb className="w-5 h-5" />,
}

// ── TABS ──
const TABS = [
  { id: 'insights', label: 'Insights', icon: Brain },
  { id: 'gst', label: 'GST', icon: Receipt },
  { id: 'prescription', label: 'Parchi', icon: FileText },
  { id: 'procurement', label: 'Kharid AI', icon: MessageSquare },
]

export default function InsightsPage({ items, orders, onBack }) {
  const [tab, setTab] = useState('insights')
  const [expanded, setExpanded] = useState(null)
  const insights = useMemo(() => generateInsights(items), [items])
  const highCount = insights.filter(i => i.severity === 'high').length
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex-1">
            <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">AI Powered</p>
            <h1 className="text-2xl font-bold text-white tracking-widest">INSIGHTS</h1>
          </div>
          {highCount > 0 && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <p className="text-red-400 text-xs font-mono font-bold">{highCount} URGENT</p>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white/5 rounded-2xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all text-[10px] font-mono ${
                tab === id ? 'bg-yellow-500 text-black font-bold' : 'text-gray-500'
              }`}>
              <Icon className="w-4 h-4" />
              {label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {tab === 'insights' && (
          <InsightsTab insights={insights} items={items} totalValue={totalValue} expanded={expanded} setExpanded={setExpanded} />
        )}
        {tab === 'gst' && <GSTTab items={items} />}
        {tab === 'prescription' && <PrescriptionTab />}
        {tab === 'procurement' && <ProcurementTab items={items} orders={orders} />}
      </div>
    </div>
  )
}

// ── TAB 1: Insights ──
function InsightsTab({ insights, items, totalValue, expanded, setExpanded }) {
  return (
    <div className="space-y-3 pt-1">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Items', value: items.length, color: 'text-white' },
          { label: 'Stock Value', value: formatCurrency(totalValue), color: 'text-yellow-500' },
          { label: 'Alerts', value: insights.filter(i => i.severity === 'high').length, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0d0d0d] border border-white/5 rounded-xl p-3 text-center">
            <p className={`font-bold text-base ${color}`}>{value}</p>
            <p className="text-gray-600 text-[9px] font-mono uppercase mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-purple-950/20 border border-purple-500/20 rounded-xl px-3 py-2">
        <Brain className="w-4 h-4 text-purple-400 shrink-0" />
        <p className="text-purple-300 text-xs font-mono">AI ne data analyze kiya — {insights.length} insights ready</p>
      </div>

      {insights.map((insight, i) => {
        const cfg = SEV[insight.severity]
        const isOpen = expanded === i
        return (
          <div key={i} className={`rounded-2xl border ${cfg.bg} ${cfg.border} overflow-hidden`}>
            <button className="w-full flex items-start gap-3 p-4 text-left active:opacity-80" onClick={() => setExpanded(isOpen ? null : i)}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.badge}`}>{ICONS[insight.icon]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                  <p className="text-white text-sm font-bold">{insight.title}</p>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{insight.message}</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-600 shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                <div className="bg-white/5 rounded-xl px-3 py-2.5 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-yellow-300 text-xs leading-relaxed">{insight.action}</p>
                </div>
                {insight.items?.map((item, j) => {
                  const days = getDaysToExpiry(item.expiry_date)
                  return (
                    <div key={j} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                      <div>
                        <p className="text-white text-xs font-medium">{item.medicine_name}</p>
                        <p className="text-gray-600 text-[10px] font-mono">Qty: {item.quantity?.toLocaleString('en-IN')}{days !== null && ` · ${days >= 0 ? `${days}d` : 'EXPIRED'}`}</p>
                      </div>
                      <p className="text-gray-400 text-xs font-mono">{formatCurrency(item.quantity * item.unit_price)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── TAB 2: GST Calculator ──
function GSTTab({ items }) {
  const [selectedItems, setSelectedItems] = useState(() => new Set(items.map(i => i.id)))
  const [showBreakdown, setShowBreakdown] = useState(false)

  const selected = items.filter(i => selectedItems.has(i.id))
  const gst = useMemo(() => calculateGST(selected), [selected])

  const toggle = (id) => setSelectedItems(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div className="space-y-4 pt-1">
      <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-4 space-y-3">
        <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">GST Summary</p>
        <div className="space-y-2">
          {[
            { label: 'Taxable Amount', value: formatCurrency(gst.totalTaxable), color: 'text-white' },
            { label: 'CGST (Total)', value: formatCurrency(gst.totalCGST), color: 'text-blue-400' },
            { label: 'SGST (Total)', value: formatCurrency(gst.totalSGST), color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <p className="text-gray-500 text-sm">{label}</p>
              <p className={`font-mono font-bold ${color}`}>{value}</p>
            </div>
          ))}
          <div className="border-t border-white/10 pt-2 flex items-center justify-between">
            <p className="text-white font-semibold">Grand Total</p>
            <p className="text-yellow-500 font-mono font-bold text-lg">{formatCurrency(gst.grandTotal)}</p>
          </div>
        </div>

        <button onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full text-center text-yellow-500 text-xs font-mono flex items-center justify-center gap-1 pt-1">
          {showBreakdown ? 'Hide' : 'Show'} Slab Breakdown <ChevronRight className={`w-3 h-3 transition-transform ${showBreakdown ? 'rotate-90' : ''}`} />
        </button>

        {showBreakdown && (
          <div className="space-y-2 pt-1">
            {[5, 12, 18, 28].map(slab => {
              const slabItems = gst.gstSlabs[slab]
              if (!slabItems?.length) return null
              const slabTotal = slabItems.reduce((s, i) => s + i.taxable, 0)
              return (
                <div key={slab} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-xs font-mono font-bold">{slab}% GST Slab</span>
                    <span className="text-gray-400 text-xs font-mono">{slabItems.length} items · {formatCurrency(slabTotal)}</span>
                  </div>
                  {slabItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-t border-white/5">
                      <p className="text-gray-400 text-xs truncate flex-1">{item.medicine_name}</p>
                      <p className="text-gray-500 text-[10px] font-mono shrink-0 ml-2">
                        C+S: {formatCurrency(item.cgst + item.sgst)}
                      </p>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Item selector */}
      <div className="space-y-1">
        <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Items Select Karo</p>
        {items.map(item => (
          <button key={item.id} onClick={() => toggle(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
              selectedItems.has(item.id) ? 'bg-white/5 border-yellow-500/30' : 'bg-white/[0.02] border-white/5 opacity-50'
            }`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              selectedItems.has(item.id) ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600'
            }`}>
              {selectedItems.has(item.id) && <CheckCircle className="w-3 h-3 text-black" />}
            </div>
            <p className="flex-1 text-white text-xs">{item.medicine_name}</p>
            <p className="text-gray-500 text-[10px] font-mono">{item.gst_percent || 12}% GST</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── TAB 3: Prescription Reader ──
function PrescriptionTab() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)
  const camRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setImage(file)
    setResult(null)
  }

  const readPrescription = async () => {
    if (!image && !preview) { toast.error('Pehle parchi ki photo lo'); return }
    setLoading(true)
    try {
      let base64, mime
      if (image) {
        mime = image.type || 'image/jpeg'
        base64 = await new Promise((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(r.result.split(',')[1])
          r.onerror = rej
          r.readAsDataURL(image)
        })
      } else {
        // Demo mode
        base64 = ''
        mime = 'image/jpeg'
      }
      const text = await readPrescriptionWithGroq(base64, mime)
      setResult(text)
    } catch (err) {
      toast.error(err.message || 'Parchi read nahi hui')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-4 space-y-2">
        <p className="text-white font-semibold text-sm">Handwritten Parchi Reader</p>
        <p className="text-gray-500 text-xs leading-relaxed">
          Retailer ki parchi ki photo lo — AI medicines ki list bana dega. Doctor ki handwriting bhi read hoti hai.
        </p>
      </div>

      {/* Preview */}
      {preview && (
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#0d0d0d] border border-white/10">
          <img src={preview} alt="Prescription" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => camRef.current?.click()}
          className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-3 text-white text-sm font-medium active:scale-95 transition-all">
          <Camera className="w-4 h-4" /> Camera
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-3 text-white text-sm font-medium active:scale-95 transition-all">
          <Upload className="w-4 h-4" /> Gallery
        </button>
      </div>

      <button onClick={readPrescription} disabled={loading}
        className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 active:scale-95 transition-all text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
        {loading ? <><Loader className="w-5 h-5 animate-spin" /> Reading...</> : <><FileText className="w-5 h-5" /> PARCHI PADHO</>}
      </button>

      {/* Result */}
      {result && (
        <div className="bg-[#0d0d0d] border border-green-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-green-400 text-xs font-mono uppercase tracking-widest">Prescription Read Ho Gayi</p>
          </div>
          <pre className="text-gray-300 text-xs font-mono leading-relaxed whitespace-pre-wrap">{result}</pre>
          <button onClick={() => navigator.clipboard.writeText(result).then(() => toast.success('Copied!'))}
            className="w-full text-center text-yellow-500 text-xs font-mono py-2 border border-yellow-500/20 rounded-xl active:scale-95">
            Copy kar lo
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = '' }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = '' }} />
    </div>
  )
}

// ── TAB 4: Smart Procurement AI ──
function ProcurementTab({ items, orders }) {
  const [aiAdvice, setAiAdvice] = useState(null)
  const [loading, setLoading] = useState(false)

  const getAIAdvice = async () => {
    setLoading(true)
    try {
      const month = new Date().getMonth() + 1
      const stockSummary = items.map(i => ({
        name: i.medicine_name,
        qty: i.quantity,
        threshold: i.low_stock_threshold || 100,
        expiry_days: getDaysToExpiry(i.expiry_date),
        value: i.quantity * i.unit_price
      }))

      const prompt = `You are a procurement advisor for Capital Medical Agency, Bhopal (wholesale pharma distributor).

Current stock data: ${JSON.stringify(stockSummary)}
Current month: ${month} (${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1]})
Recent orders count: ${orders?.length || 0}

Give me:
1. Which medicines to ORDER NOW (running low)
2. Seasonal demand prediction for this month in central India
3. Which items to AVOID ordering (overstocked or expiring)
4. Top 3 action items for this week

Be specific, practical, in Hinglish (Hindi+English mix). Keep it concise.`

      if (!GROQ_KEY) {
        setAiAdvice(`📦 PROCUREMENT ADVICE (Demo Mode)

ORDER NOW:
• ${items.filter(i => i.quantity <= (i.low_stock_threshold || 100)).slice(0, 3).map(i => i.medicine_name).join(', ') || 'All stock sufficient'}

SEASONAL (Month ${month}):
• ${month >= 6 && month <= 9 ? 'Monsoon: ORS, Ciprofloxacin, Metronidazole extra rakho' : month >= 10 || month <= 2 ? 'Sardi: Cetirizine, Paracetamol, Cough syrup extra rakho' : 'Garmi: Electrolytes, ORS, Antacids extra rakho'}

AVOID:
• Jo items 90 din mein expire ho rahe hain unhe mat order karo

TOP 3 ACTIONS:
1. Low stock items immediately order karo
2. Expiring items discount par nikalo
3. Dead stock supplier ko return bhejo

(Demo mode — GROQ key add karo real AI advice ke liye)`)
        return
      }

      const advice = await askGroq(prompt)
      setAiAdvice(advice)
    } catch {
      toast.error('AI advice nahi aayi. Dobara try karo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-4 space-y-2">
        <p className="text-white font-semibold text-sm">Smart Procurement AI</p>
        <p className="text-gray-500 text-xs leading-relaxed">
          Aapka stock data dekh ke AI batayega — kya order karo, kya avoid karo, is mahine kya zyada bikne wala hai.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-3">
          <p className="text-red-400 font-bold text-xl">{items.filter(i => i.quantity <= (i.low_stock_threshold || 100)).length}</p>
          <p className="text-gray-600 text-[10px] font-mono uppercase">Order Karo</p>
        </div>
        <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3">
          <p className="text-amber-400 font-bold text-xl">{items.filter(i => { const d = getDaysToExpiry(i.expiry_date); return d !== null && d <= 90 && d >= 0 }).length}</p>
          <p className="text-gray-600 text-[10px] font-mono uppercase">Expiry Alert</p>
        </div>
      </div>

      <button onClick={getAIAdvice} disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 active:scale-95 transition-all text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
        {loading
          ? <><Loader className="w-5 h-5 animate-spin" /> AI Soch Raha Hai...</>
          : <><Brain className="w-5 h-5" /> AI ADVICE LO</>}
      </button>

      {aiAdvice && (
        <div className="bg-[#0d0d0d] border border-purple-500/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <p className="text-purple-400 text-xs font-mono uppercase tracking-widest">AI Procurement Advice</p>
          </div>
          <pre className="text-gray-300 text-xs font-mono leading-relaxed whitespace-pre-wrap">{aiAdvice}</pre>
          <button onClick={() => navigator.clipboard.writeText(aiAdvice).then(() => toast.success('Copied!'))}
            className="w-full text-center text-purple-400 text-xs font-mono py-2 border border-purple-500/20 rounded-xl active:scale-95">
            Copy kar lo
          </button>
        </div>
      )}
    </div>
  )
}

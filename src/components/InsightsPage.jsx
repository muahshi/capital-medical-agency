import { useMemo, useState } from 'react'
import {
  TrendingDown, AlertTriangle, Brain, ChevronLeft,
  Package, Clock, ShoppingCart, Lightbulb, ChevronRight,
  BarChart2, RefreshCw
} from 'lucide-react'
import { differenceInDays, parseISO, isValid, format } from 'date-fns'
import { formatCurrency, getDaysToExpiry } from '../lib/stockUtils'

// ── AI Insight Engine (pure logic, no API needed) ──
function generateInsights(items) {
  const today = new Date()
  const insights = []

  // 1. Dead Stock — 60+ din se koi movement nahi (no scan, created long ago)
  const deadStock = items.filter(item => {
    if (!item.created_at) return false
    const daysSinceAdded = differenceInDays(today, parseISO(item.created_at))
    return daysSinceAdded > 60 && item.quantity > 0
  })

  if (deadStock.length > 0) {
    const blockedValue = deadStock.reduce((s, i) => s + (i.quantity * i.unit_price), 0)
    insights.push({
      type: 'dead_stock',
      severity: 'high',
      title: `${deadStock.length} Dead Stock Items!`,
      message: `Paisa block ho raha hai — ${formatCurrency(blockedValue)} ka stock 60+ din se nahi bika.`,
      action: 'Discount par nikalo ya supplier ko return bhejo.',
      items: deadStock.slice(0, 5),
      icon: 'dead',
    })
  }

  // 2. Expiry alerts — next 90 days
  const expiringItems = items.filter(item => {
    const days = getDaysToExpiry(item.expiry_date)
    return days !== null && days >= 0 && days <= 90
  }).sort((a, b) => getDaysToExpiry(a.expiry_date) - getDaysToExpiry(b.expiry_date))

  if (expiringItems.length > 0) {
    insights.push({
      type: 'expiry_alert',
      severity: 'high',
      title: `${expiringItems.length} items expire hone wale hain`,
      message: `Agle 3 mahine mein expire: ${expiringItems.slice(0, 3).map(i => i.medicine_name).join(', ')}`,
      action: '15-20% discount par nikalo. Company return note generate karo.',
      items: expiringItems.slice(0, 5),
      icon: 'expiry',
    })
  }

  // 3. Low stock procurement suggestions
  const lowStock = items.filter(i => i.quantity <= (i.low_stock_threshold || 100) && i.quantity > 0)
  if (lowStock.length > 0) {
    insights.push({
      type: 'procurement',
      severity: 'medium',
      title: `${lowStock.length} items ka stock khatam hone wala hai`,
      message: `${lowStock.map(i => i.medicine_name).slice(0, 3).join(', ')} — jaldi order karo.`,
      action: 'Supplier ko abhi order bhejo. Lead time consider karo.',
      items: lowStock.slice(0, 5),
      icon: 'procurement',
    })
  }

  // 4. High value items insight
  const highValueItems = [...items]
    .sort((a, b) => (b.quantity * b.unit_price) - (a.quantity * a.unit_price))
    .slice(0, 3)

  if (highValueItems.length > 0) {
    const topValue = highValueItems[0].quantity * highValueItems[0].unit_price
    insights.push({
      type: 'high_value',
      severity: 'info',
      title: 'Top Value Items',
      message: `${highValueItems[0].medicine_name} — ${formatCurrency(topValue)} ka stock hai.`,
      action: 'Inhe priority par sell karo. Inka turnover high rakho.',
      items: highValueItems,
      icon: 'value',
    })
  }

  // 5. Seasonal procurement hint (month-based)
  const month = today.getMonth() + 1
  let seasonalHint = null
  if (month >= 6 && month <= 9) {
    seasonalHint = { medicines: ['Ciprofloxacin', 'ORS', 'Metronidazole', 'Norflox'], season: 'Barsat (Monsoon)' }
  } else if (month >= 10 && month <= 2) {
    seasonalHint = { medicines: ['Cetirizine', 'Paracetamol', 'Cough syrup', 'Azithromycin'], season: 'Sardi (Winter)' }
  } else {
    seasonalHint = { medicines: ['Electrolytes', 'Antacids', 'Sunscreen'], season: 'Garmi (Summer)' }
  }

  insights.push({
    type: 'seasonal',
    severity: 'info',
    title: `${seasonalHint.season} Procurement Hint`,
    message: `Is mausam mein zyada bikti hain: ${seasonalHint.medicines.join(', ')}`,
    action: 'Inhe extra stock karo. Demand zyada hogi.',
    items: [],
    icon: 'seasonal',
  })

  return insights
}

const SEVERITY_CONFIG = {
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

export default function InsightsPage({ items, orders, onBack }) {
  const [expanded, setExpanded] = useState(null)

  const insights = useMemo(() => generateInsights(items), [items])

  const highCount = insights.filter(i => i.severity === 'high').length
  const totalValue = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0)

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 shrink-0">
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

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Items', value: items.length, color: 'text-white' },
            { label: 'Stock Value', value: formatCurrency(totalValue), color: 'text-yellow-500' },
            { label: 'Alerts', value: insights.filter(i => i.severity === 'high').length, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0d0d0d] border border-white/5 rounded-xl p-3 text-center">
              <p className={`font-bold text-lg ${color}`}>{value}</p>
              <p className="text-gray-600 text-[10px] font-mono uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* AI Badge */}
        <div className="flex items-center gap-2 bg-purple-950/20 border border-purple-500/20 rounded-xl px-4 py-2.5">
          <Brain className="w-4 h-4 text-purple-400" />
          <p className="text-purple-300 text-xs font-mono">AI ne aapka data analyze kiya — {insights.length} insights ready hain</p>
        </div>

        {/* Insight cards */}
        {insights.length === 0 ? (
          <div className="flex flex-col items-center py-16 space-y-3 text-gray-600">
            <RefreshCw className="w-10 h-10" />
            <p className="font-mono text-sm">Koi insight nahi. Stock add karo pehle.</p>
          </div>
        ) : (
          insights.map((insight, i) => {
            const cfg = SEVERITY_CONFIG[insight.severity]
            const isOpen = expanded === i
            return (
              <div key={i} className={`rounded-2xl border ${cfg.bg} ${cfg.border} overflow-hidden`}>
                <button
                  className="w-full flex items-start gap-3 p-4 text-left active:opacity-80"
                  onClick={() => setExpanded(isOpen ? null : i)}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.badge}`}>
                    {ICONS[insight.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <p className="text-white text-sm font-bold leading-snug">{insight.title}</p>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{insight.message}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-600 shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                    {/* Action */}
                    <div className="bg-white/5 rounded-xl px-3 py-2.5 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-yellow-300 text-xs leading-relaxed">{insight.action}</p>
                    </div>

                    {/* Item list */}
                    {insight.items?.length > 0 && (
                      <div className="space-y-1.5">
                        {insight.items.map((item, j) => {
                          const days = getDaysToExpiry(item.expiry_date)
                          return (
                            <div key={j} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                              <div>
                                <p className="text-white text-xs font-medium">{item.medicine_name}</p>
                                <p className="text-gray-600 text-[10px] font-mono">
                                  Qty: {item.quantity?.toLocaleString('en-IN')}
                                  {days !== null && ` · ${days >= 0 ? `${days}d left` : 'EXPIRED'}`}
                                </p>
                              </div>
                              <p className="text-gray-400 text-xs font-mono">
                                {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* GST & Prescription features — coming soon cards */}
        <div className="space-y-2 pt-2">
          <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">COMING SOON</p>
          {[
            { icon: '🧾', title: 'Auto GST Breakdown', sub: 'Bill scan → CGST/SGST auto calculate' },
            { icon: '💊', title: 'Handwritten Prescription Reader', sub: 'Parchi photo → medicine list' },
            { icon: '📱', title: 'WhatsApp Payment Reminders', sub: 'Retailer credit limit cross → auto reminder' },
            { icon: '📈', title: 'Smart Procurement AI', sub: 'Sales history → auto reorder suggestions' },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 opacity-60">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-white text-sm font-medium">{title}</p>
                <p className="text-gray-600 text-xs">{sub}</p>
              </div>
              <div className="ml-auto bg-white/5 rounded-lg px-2 py-1">
                <p className="text-gray-600 text-[9px] font-mono uppercase">Soon</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

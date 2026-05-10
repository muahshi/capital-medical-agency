import { useMemo, useState } from 'react'
import {
  TrendingUp, AlertTriangle, Package, FileText, Bell,
  ChevronRight, Clock, AlertCircle, FileOutput, X, Check
} from 'lucide-react'
import {
  getStockStatus, getStatusClass, getStatusLabel,
  formatExpiry, formatCurrency, calculateTotalStockValue,
  getExpiringItems, getLowStockItems, getDaysToExpiry
} from '../lib/stockUtils'
import { differenceInDays, parseISO } from 'date-fns'

export default function Dashboard({ items, orders = [], pendingOrderCount = 0, onNavigate, onMarkOrderProcessed }) {
  const [returnNote, setReturnNote] = useState(null) // null | item

  const stats = useMemo(() => {
    const totalValue = calculateTotalStockValue(items)
    const expiringIn90 = getExpiringItems(items, 90)
    const lowStockItems = getLowStockItems(items)
    // Action required: expiring in 90 days or already expired
    const actionItems = items.filter(item => {
      const days = getDaysToExpiry(item.expiry_date)
      return days !== null && days <= 90
    })
    return { totalValue, expiringIn90, lowStockItems, actionItems }
  }, [items])

  const recentItems = items.slice(0, 5)

  return (
    <div className="scroll-area flex-1 p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="pt-2 pb-1">
        <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">Inventory Overview</p>
        <h1 className="text-3xl font-bold text-white tracking-widest">DASHBOARD</h1>
      </div>

      {/* New Order Notification Banner */}
      {pendingOrderCount > 0 && (
        <button
          onClick={() => {
            const el = document.getElementById('recent-orders')
            el?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="w-full flex items-center gap-3 bg-blue-950/40 border border-blue-500/30 rounded-2xl px-4 py-3 active:scale-[0.98] transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <p className="flex-1 text-blue-300 text-sm font-mono">
            🔔 {pendingOrderCount} New Order{pendingOrderCount > 1 ? 's' : ''} from Field Team!
          </p>
          <ChevronRight className="w-4 h-4 text-blue-400" />
        </button>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-yellow-500" />}
          label="STOCK VALUE"
          value={formatCurrency(stats.totalValue)}
          sub={`${items.length} products`}
          valueClass="text-yellow-500"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          label="EXPIRY ALERTS"
          value={stats.expiringIn90.length}
          sub="next 90 days"
          valueClass="text-red-400"
          onClick={() => onNavigate('inventory', 'expiring')}
          cta="View Alerts"
        />
        <StatCard
          icon={<Package className="w-5 h-5 text-amber-400" />}
          label="LOW STOCK"
          value={stats.lowStockItems.length}
          sub="items"
          valueClass="text-amber-400"
          onClick={() => onNavigate('inventory', 'low')}
          cta="View Items"
        />
        <StatCard
          icon={<FileText className="w-5 h-5 text-gray-400" />}
          label="TOTAL ITEMS"
          value={items.length}
          sub="in inventory"
          valueClass="text-white"
        />
      </div>

      {/* AI Scan Banner */}
      <button
        onClick={() => onNavigate('scan')}
        className="w-full relative overflow-hidden rounded-2xl p-4 text-left active:scale-[0.98] transition-transform"
        style={{
          background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 50%, #060610 100%)',
          border: '1px solid rgba(100, 100, 255, 0.3)',
          boxShadow: '0 0 30px rgba(80,80,200,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-yellow-500/60 rounded-sm" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold text-white tracking-widest">SCAN NEW BILL</p>
            <p className="text-xs text-blue-300/70 font-mono mt-0.5">AI POWERED · GROQ VISION · INSTANT OCR</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/30" />
        </div>
      </button>

      {/* ── ACTION REQUIRED — Return section ── */}
      {stats.actionItems.length > 0 && (
        <ActionRequired items={stats.actionItems} onGenerateReturn={setReturnNote} />
      )}

      {/* Expiring Soon */}
      {stats.expiringIn90.length > 0 && (
        <ExpirySection items={stats.expiringIn90} />
      )}

      {/* Stock Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">STOCK OVERVIEW</span>
          <button onClick={() => onNavigate('inventory')} className="text-yellow-500 text-xs font-mono flex items-center gap-1">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="bg-[#0d0d0d] rounded-2xl overflow-hidden border border-white/5">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 border-b border-white/5">
            <span className="text-gray-600 text-[10px] font-mono uppercase">MEDICINE</span>
            <span className="text-gray-600 text-[10px] font-mono uppercase">QTY</span>
            <span className="text-gray-600 text-[10px] font-mono uppercase">STATUS</span>
          </div>
          {recentItems.length === 0 ? (
            <div className="py-10 text-center text-gray-600 text-sm">
              Koi item nahi. Pehle bill scan karo.
            </div>
          ) : (
            recentItems.map((item, i) => (
              <StockRow key={item.id} item={item} isLast={i === recentItems.length - 1} />
            ))
          )}
        </div>
      </div>

      {/* Recent Orders from Salesmen */}
      {orders.length > 0 && (
        <RecentOrdersSection orders={orders} onMarkProcessed={onMarkOrderProcessed} />
      )}

      {/* Return Note Modal */}
      {returnNote && (
        <ReturnNoteModal item={returnNote} onClose={() => setReturnNote(null)} />
      )}
    </div>
  )
}

// ── Action Required Section ──
function ActionRequired({ items, onGenerateReturn }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-orange-400" />
        <span className="text-orange-400 text-[10px] font-mono uppercase tracking-widest font-bold">
          ACTION REQUIRED ({items.length})
        </span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 4).map(item => {
          const days = getDaysToExpiry(item.expiry_date)
          const isExpired = days !== null && days < 0
          return (
            <div
              key={item.id}
              className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${
                isExpired
                  ? 'bg-red-950/25 border-red-800/40'
                  : 'bg-orange-950/20 border-orange-800/30'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{item.medicine_name}</p>
                <p className="text-gray-500 text-[11px] font-mono mt-0.5">
                  {item.batch_no || '—'} · Exp: {formatExpiry(item.expiry_date)}
                  <span className={`ml-2 font-bold ${isExpired ? 'text-red-400' : 'text-orange-400'}`}>
                    {isExpired ? `${Math.abs(days)}d ago` : `${days}d left`}
                  </span>
                </p>
              </div>
              <button
                onClick={() => onGenerateReturn(item)}
                className="shrink-0 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white text-[11px] font-mono px-3 py-1.5 rounded-xl border border-white/10"
              >
                <FileOutput className="w-3.5 h-3.5" />
                RETURN NOTE
              </button>
            </div>
          )
        })}
        {items.length > 4 && (
          <p className="text-gray-600 text-xs font-mono text-center">+{items.length - 4} more items</p>
        )}
      </div>
    </div>
  )
}

// ── Return Note Modal ──
function ReturnNoteModal({ item, onClose }) {
  const [copied, setCopied] = useState(false)
  const days = getDaysToExpiry(item.expiry_date)
  const isExpired = days !== null && days < 0

  const noteText = `RETURN NOTE — Capital Medical Agency, Bhopal
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${new Date().toLocaleDateString('en-IN')}
Medicine: ${item.medicine_name}
Batch No: ${item.batch_no || 'N/A'}
Expiry: ${formatExpiry(item.expiry_date)}
Qty in Stock: ${item.quantity}
Status: ${isExpired ? 'EXPIRED' : `Expiring in ${days} days`}
Reason: ${isExpired ? 'Past expiry date' : 'Near expiry — return to supplier'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Authorized by: Admin | CMA System`

  const handleCopy = () => {
    navigator.clipboard.writeText(noteText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/10 rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Generated</p>
            <p className="text-white font-bold text-lg">Return Note</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center active:scale-95">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <pre className="mx-4 mb-4 bg-white/5 border border-white/5 rounded-xl p-4 text-gray-300 text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
          {noteText}
        </pre>

        <div className="flex gap-2 px-4 pb-5">
          <button
            onClick={handleCopy}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
              copied ? 'bg-green-500 text-black' : 'bg-yellow-500 text-black'
            }`}
          >
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : 'Copy Note'}
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-white/5 text-white border border-white/10 text-sm font-semibold active:scale-95">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, valueClass, onClick, cta }) {
  return (
    <div
      className={`bg-[#0d0d0d] border border-white/5 rounded-2xl p-4 ${onClick ? 'active:scale-95 cursor-pointer' : ''} transition-transform`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${valueClass} tracking-wider mb-0.5`}>{value}</div>
      <div className="text-gray-500 text-xs uppercase font-mono tracking-wider">{sub}</div>
      {cta && onClick && (
        <button className="mt-2 text-xs text-yellow-500 font-mono flex items-center gap-0.5">
          {cta} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

function ExpirySection({ items }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-red-400" />
        <span className="text-red-400 text-[10px] font-mono uppercase tracking-widest font-bold">EXPIRING WITHIN 90 DAYS</span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 3).map(item => {
          const days = differenceInDays(parseISO(item.expiry_date), new Date())
          return (
            <div key={item.id} className="bg-red-950/20 border border-red-900/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{item.medicine_name}</p>
                <p className="text-gray-500 text-xs font-mono">{item.batch_no || '—'} · {formatExpiry(item.expiry_date)}</p>
              </div>
              <div className="text-right">
                <p className="text-red-400 text-sm font-mono font-bold">{days}d</p>
                <p className="text-gray-600 text-[10px]">remaining</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StockRow({ item, isLast }) {
  const status = getStockStatus(item)
  return (
    <div className={`grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-3 ${!isLast ? 'border-b border-white/5' : ''}`}>
      <div>
        <p className="text-white text-sm leading-tight">{item.medicine_name}</p>
        <p className="text-gray-600 text-[10px] font-mono mt-0.5">{item.batch_no || '—'} · {formatExpiry(item.expiry_date)}</p>
      </div>
      <span className="text-white font-mono text-sm">{(item.quantity || 0).toLocaleString('en-IN')}</span>
      <span className={getStatusClass(status)}>{getStatusLabel(status)}</span>
    </div>
  )
}

// ── Recent Orders Component ──
export function RecentOrdersSection({ orders, onMarkProcessed }) {
  const pending = orders.filter(o => o.status === 'pending')
  const recent = orders.slice(0, 6)

  if (orders.length === 0) return null

  return (
    <div id="recent-orders" className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-400" />
          <span className="text-blue-400 text-[10px] font-mono uppercase tracking-widest font-bold">
            FIELD ORDERS {pending.length > 0 && `(${pending.length} PENDING)`}
          </span>
        </div>
      </div>

      <div className="bg-[#0d0d0d] rounded-2xl overflow-hidden border border-blue-500/10">
        {recent.map((order, i) => (
          <div key={order.id} className={`px-4 py-3 ${i < recent.length - 1 ? 'border-b border-white/5' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white text-sm font-semibold truncate">{order.customer_name}</p>
                  <span className={`shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                    order.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-400'
                      : order.status === 'processed'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-500'
                  }`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-500 text-[11px] font-mono">
                  {order.salesman_name} · {order.items?.length} items · {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-gray-600 text-[11px] mt-0.5 truncate">
                  {order.items?.slice(0, 2).map(i => i.medicine_name).join(', ')}
                  {order.items?.length > 2 && ` +${order.items.length - 2} more`}
                </p>
              </div>
              {order.status === 'pending' && onMarkProcessed && (
                <button
                  onClick={() => onMarkProcessed(order.id)}
                  className="shrink-0 text-[10px] font-mono bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-1.5 rounded-lg active:scale-95 transition-all"
                >
                  DONE
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

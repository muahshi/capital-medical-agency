import { useMemo } from 'react'
import { TrendingUp, AlertTriangle, Package, FileText, ChevronRight, Clock } from 'lucide-react'
import {
  getStockStatus, getStatusClass, getStatusLabel,
  formatExpiry, formatCurrency, calculateTotalStockValue,
  getExpiringItems, getLowStockItems
} from '../lib/stockUtils'
import { differenceInDays, parseISO } from 'date-fns'

export default function Dashboard({ items, onNavigate }) {
  const stats = useMemo(() => {
    const totalValue = calculateTotalStockValue(items)
    const expiringItems = getExpiringItems(items, 90)
    const lowStockItems = getLowStockItems(items)
    return { totalValue, expiringItems, lowStockItems }
  }, [items])

  const recentItems = items.slice(0, 5)

  return (
    <div className="scroll-area flex-1 p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="pt-2 pb-1">
        <p className="text-dark-400 text-xs font-mono tracking-widest uppercase">Inventory Overview</p>
        <h1 className="font-display text-3xl text-white tracking-widest text-glow">DASHBOARD</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-gold-500" />}
          label="STOCK VALUE"
          value={formatCurrency(stats.totalValue)}
          sub={`${items.length} products`}
          valueClass="text-gold-500"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          label="EXPIRY ALERTS"
          value={stats.expiringItems.length}
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
          icon={<FileText className="w-5 h-5 text-dark-300" />}
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
          boxShadow: '0 0 30px rgba(80, 80, 200, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Animated glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-1/2 w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />

        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              {/* Scanner icon with corners */}
              <div className="relative w-8 h-8">
                <div className="corner-tl !w-3 !h-3" />
                <div className="corner-tr !w-3 !h-3" />
                <div className="corner-bl !w-3 !h-3" />
                <div className="corner-br !w-3 !h-3" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full border border-gold-500/50" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <p className="font-display text-xl tracking-widest text-white">SCAN NEW BILL</p>
            <p className="text-xs text-blue-300/70 font-mono mt-0.5">AI POWERED · GROQ VISION · INSTANT OCR</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/30" />
        </div>
      </button>

      {/* Expiring Soon */}
      {stats.expiringItems.length > 0 && (
        <ExpirySection items={stats.expiringItems} />
      )}

      {/* Stock Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="section-title">STOCK OVERVIEW</span>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-gold-500 text-xs font-mono flex items-center gap-1"
          >
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-dark-800 rounded-2xl overflow-hidden border border-dark-600">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 border-b border-dark-700">
            <span className="text-dark-400 text-[10px] font-mono uppercase tracking-wider">MEDICINE</span>
            <span className="text-dark-400 text-[10px] font-mono uppercase tracking-wider">QTY</span>
            <span className="text-dark-400 text-[10px] font-mono uppercase tracking-wider">STATUS</span>
          </div>

          {recentItems.length === 0 ? (
            <div className="py-8 text-center text-dark-400 text-sm">
              No items yet. Scan a bill to add stock.
            </div>
          ) : (
            recentItems.map((item, i) => (
              <StockRow key={item.id} item={item} isLast={i === recentItems.length - 1} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, valueClass, onClick, cta }) {
  return (
    <div
      className={`card-gold p-4 ${onClick ? 'active:scale-95 cursor-pointer' : ''} transition-transform`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[10px] font-mono text-dark-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`font-display text-3xl ${valueClass} tracking-wider mb-0.5`}>{value}</div>
      <div className="text-dark-400 text-xs uppercase font-mono tracking-wider">{sub}</div>
      {cta && onClick && (
        <button className="mt-2 text-xs text-gold-500 font-mono flex items-center gap-0.5">
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
        <span className="section-title text-red-400">EXPIRING WITHIN 90 DAYS</span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 3).map(item => {
          const days = differenceInDays(parseISO(item.expiry_date), new Date())
          return (
            <div key={item.id} className="bg-red-950/20 border border-red-900/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{item.medicine_name}</p>
                <p className="text-dark-400 text-xs font-mono">{item.batch_no || '—'} · {formatExpiry(item.expiry_date)}</p>
              </div>
              <div className="text-right">
                <p className="text-red-400 text-sm font-mono font-bold">{days}d</p>
                <p className="text-dark-400 text-[10px]">remaining</p>
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
    <div className={`grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-3 ${!isLast ? 'border-b border-dark-700' : ''}`}>
      <div>
        <p className="text-white text-sm leading-tight">{item.medicine_name}</p>
        <p className="text-dark-400 text-[10px] font-mono mt-0.5">{item.batch_no || '—'} · {formatExpiry(item.expiry_date)}</p>
      </div>
      <span className="text-white font-mono text-sm">{(item.quantity || 0).toLocaleString()}</span>
      <span className={getStatusClass(status)}>{getStatusLabel(status)}</span>
    </div>
  )
}

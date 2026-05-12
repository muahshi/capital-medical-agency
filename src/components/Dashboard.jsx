import { useMemo, useState } from 'react'
import {
  TrendingUp, AlertTriangle, Package, FileText, Bell,
  ChevronRight, Clock, AlertCircle, FileOutput, X, Check,
  User, MapPin, Pill, Phone, BarChart2, Users, Calendar
} from 'lucide-react'
import {
  getStockStatus, getStatusClass, getStatusLabel,
  formatExpiry, formatCurrency, calculateTotalStockValue,
  getExpiringItems, getLowStockItems, getDaysToExpiry
} from '../lib/stockUtils'
import { differenceInDays, parseISO } from 'date-fns'

export default function Dashboard({ items, orders = [], pendingOrderCount = 0, onNavigate, onMarkOrderProcessed }) {
  const [returnNote, setReturnNote] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [activeOrdersTab, setActiveOrdersTab] = useState('orders') // orders | reports

  const stats = useMemo(() => {
    const totalValue = calculateTotalStockValue(items)
    const expiringIn90 = getExpiringItems(items, 90)
    const lowStockItems = getLowStockItems(items)
    const actionItems = items.filter(item => {
      const days = getDaysToExpiry(item.expiry_date)
      return days !== null && days <= 90
    })
    return { totalValue, expiringIn90, lowStockItems, actionItems }
  }, [items])

  // Salesman reports data
  const salesmanStats = useMemo(() => {
    const map = {}
    orders.forEach(o => {
      const key = o.salesman_code || o.salesman_name
      if (!map[key]) {
        map[key] = {
          name: o.salesman_name,
          code: o.salesman_code,
          totalOrders: 0,
          pendingOrders: 0,
          processedOrders: 0,
          totalItems: 0,
          customers: new Set(),
          lastOrder: null,
        }
      }
      map[key].totalOrders++
      if (o.status === 'pending') map[key].pendingOrders++
      if (o.status === 'processed') map[key].processedOrders++
      map[key].totalItems += o.items?.length || 0
      if (o.customer_name) map[key].customers.add(o.customer_name)
      const d = new Date(o.created_at)
      if (!map[key].lastOrder || d > new Date(map[key].lastOrder)) map[key].lastOrder = o.created_at
    })
    return Object.values(map).sort((a, b) => b.totalOrders - a.totalOrders)
  }, [orders])

  const recentItems = items.slice(0, 5)

  return (
    <div className="scroll-area flex-1 p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="pt-2 pb-1">
        <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">Inventory Overview</p>
        <h1 className="text-3xl font-bold text-white tracking-widest">DASHBOARD</h1>
      </div>

      {/* Pending order banner */}
      {pendingOrderCount > 0 && (
        <button
          onClick={() => {
            setActiveOrdersTab('orders')
            document.getElementById('orders-section')?.scrollIntoView({ behavior: 'smooth' })
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
            <div className="w-4 h-4 border-2 border-yellow-500/60 rounded-sm" />
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold text-white tracking-widest">SCAN NEW BILL</p>
            <p className="text-xs text-blue-300/70 font-mono mt-0.5">AI POWERED · GROQ VISION · INSTANT OCR</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/30" />
        </div>
      </button>

      {/* Quick Actions - Phase 1 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('suppliers')}
          className="bg-[#0d0d0d] border border-yellow-500/20 rounded-2xl p-4 text-left active:scale-[0.98] transition-all hover:border-yellow-500/40"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-yellow-500" />
            <span className="text-white font-semibold">Suppliers</span>
          </div>
          <p className="text-xs text-gray-500 font-mono">Manage supplier contacts</p>
        </button>
        <button
          onClick={() => onNavigate('inventory')}
          className="bg-[#0d0d0d] border border-gray-700 rounded-2xl p-4 text-left active:scale-[0.98] transition-all hover:border-gray-600"
        >
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-gray-400" />
            <span className="text-white font-semibold">Inventory</span>
          </div>
          <p className="text-xs text-gray-500 font-mono">View all stock items</p>
        </button>
      </div>

      {/* Action Required */}
      {stats.actionItems.length > 0 && (
        <ActionRequired items={stats.actionItems} onGenerateReturn={setReturnNote} />
      )}

      {/* Expiring Soon */}
      {stats.expiringIn90.length > 0 && <ExpirySection items={stats.expiringIn90} />}

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
            <div className="py-10 text-center text-gray-600 text-sm">Koi item nahi. Pehle bill scan karo.</div>
          ) : (
            recentItems.map((item, i) => (
              <StockRow key={item.id} item={item} isLast={i === recentItems.length - 1} />
            ))
          )}
        </div>
      </div>

      {/* ── ORDERS + SALESMAN REPORTS SECTION ── */}
      {orders.length > 0 && (
        <div id="orders-section" className="space-y-3">
          {/* Tab switcher */}
          <div className="flex gap-2 bg-white/3 border border-white/6 rounded-2xl p-1">
            <button
              onClick={() => setActiveOrdersTab('orders')}
              className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeOrdersTab === 'orders'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
                  : 'text-gray-600'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              FIELD ORDERS {pendingOrderCount > 0 && `(${pendingOrderCount})`}
            </button>
            <button
              onClick={() => setActiveOrdersTab('reports')}
              className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeOrdersTab === 'reports'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
                  : 'text-gray-600'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              SALESMAN REPORTS
            </button>
          </div>

          {/* Orders list */}
          {activeOrdersTab === 'orders' && (
            <OrdersList
              orders={orders}
              onMarkProcessed={onMarkOrderProcessed}
              onOpen={setSelectedOrder}
            />
          )}

          {/* Salesman reports */}
          {activeOrdersTab === 'reports' && (
            <SalesmanReports stats={salesmanStats} orders={orders} />
          )}
        </div>
      )}

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onMarkProcessed={(id) => {
            onMarkOrderProcessed(id)
            setSelectedOrder(prev => prev ? { ...prev, status: 'processed' } : null)
          }}
        />
      )}
      {returnNote && (
        <ReturnNoteModal item={returnNote} onClose={() => setReturnNote(null)} />
      )}
    </div>
  )
}

// ── Orders List ───────────────────────────────────────────────────────────────
function OrdersList({ orders, onMarkProcessed, onOpen }) {
  const sorted = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="bg-[#0d0d0d] rounded-2xl overflow-hidden border border-blue-500/10">
      {sorted.slice(0, 10).map((order, i) => (
        <button
          key={order.id}
          onClick={() => onOpen(order)}
          className={`w-full text-left px-4 py-3 active:bg-white/3 transition-all ${i < Math.min(sorted.length, 10) - 1 ? 'border-b border-white/5' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-white text-sm font-semibold truncate">{order.customer_name}</p>
                <span className={`shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                  order.status === 'pending'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {order.status?.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-500 text-[11px] font-mono">
                {order.salesman_name} · {order.items?.length} items · {
                  new Date(order.created_at).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                  })
                }
              </p>
              <p className="text-gray-600 text-[11px] mt-0.5 truncate">
                {order.items?.slice(0, 2).map(i => i.medicine_name).join(', ')}
                {order.items?.length > 2 && ` +${order.items.length - 2} more`}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-700 shrink-0 mt-1" />
          </div>
        </button>
      ))}
      {orders.length > 10 && (
        <div className="px-4 py-2 text-center text-gray-600 text-xs font-mono border-t border-white/5">
          +{orders.length - 10} aur orders hain
        </div>
      )}
    </div>
  )
}

// ── Order Detail Modal ────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose, onMarkProcessed }) {
  const [done, setDone] = useState(order.status === 'processed')

  const handleMark = () => {
    onMarkProcessed(order.id)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#0d0d0d] border border-white/10 rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
          <div>
            <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">{order.id}</p>
            <p className="text-white font-bold text-lg mt-0.5">{order.customer_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Salesman info */}
          <div className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-2xl px-4 py-3">
            <User className="w-4 h-4 text-yellow-500 shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold">{order.salesman_name}</p>
              <p className="text-gray-500 text-xs font-mono">
                {new Date(order.created_at).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <span className={`ml-auto text-[10px] font-mono px-2 py-1 rounded-lg ${
              done || order.status === 'processed'
                ? 'bg-green-500/15 text-green-400'
                : 'bg-amber-500/15 text-amber-400'
            }`}>
              {done || order.status === 'processed' ? '✓ PROCESSED' : 'PENDING'}
            </span>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">
              ITEMS ({order.items?.length})
            </p>
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                <Pill className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="flex-1 text-white text-sm">{item.medicine_name}</p>
                <span className="text-yellow-500 font-mono font-bold text-sm">×{item.qty}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl px-4 py-3">
              <p className="text-amber-400 text-xs font-mono">📝 {order.notes}</p>
            </div>
          )}

          {/* Voice transcript */}
          {order.transcript && (
            <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-3">
              <p className="text-gray-600 text-[10px] font-mono uppercase mb-1">Voice Transcript</p>
              <p className="text-gray-400 text-xs italic leading-relaxed">"{order.transcript}"</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-3 border-t border-white/5 space-y-2">
          {!(done || order.status === 'processed') && (
            <button
              onClick={handleMark}
              className="w-full bg-green-500 text-black font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Check className="w-5 h-5" /> Mark as Processed
            </button>
          )}
          {(done || order.status === 'processed') && (
            <div className="w-full bg-green-900/20 border border-green-500/20 text-green-400 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Order Processed ✓
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full bg-white/5 border border-white/8 text-gray-400 py-3 rounded-2xl text-sm font-semibold active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Salesman Reports ──────────────────────────────────────────────────────────
function SalesmanReports({ stats, orders }) {
  const [selected, setSelected] = useState(null)

  if (stats.length === 0) {
    return (
      <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl py-12 text-center">
        <Users className="w-8 h-8 text-gray-700 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">Koi salesman orders nahi abhi</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-3 text-center">
          <p className="text-yellow-500 font-bold text-xl">{stats.length}</p>
          <p className="text-gray-600 text-[10px] font-mono">SALESMEN</p>
        </div>
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-3 text-center">
          <p className="text-blue-400 font-bold text-xl">{orders.length}</p>
          <p className="text-gray-600 text-[10px] font-mono">ORDERS</p>
        </div>
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-3 text-center">
          <p className="text-green-400 font-bold text-xl">
            {orders.filter(o => o.status === 'processed').length}
          </p>
          <p className="text-gray-600 text-[10px] font-mono">DONE</p>
        </div>
      </div>

      {/* Leaderboard */}
      <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">PERFORMANCE RANKING</p>
      <div className="space-y-2">
        {stats.map((s, idx) => (
          <button
            key={s.code || s.name}
            onClick={() => setSelected(selected?.name === s.name ? null : s)}
            className="w-full bg-[#0d0d0d] border border-white/6 rounded-2xl p-4 text-left active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              {/* Rank */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                'bg-white/5 text-gray-600'
              }`}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{s.name}</p>
                <p className="text-gray-500 text-[11px] font-mono">
                  {s.totalOrders} orders · {s.customers.size} customers · {s.totalItems} items
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-white font-bold text-sm">{s.totalOrders}</p>
                <p className="text-gray-600 text-[10px] font-mono">orders</p>
              </div>

              <ChevronRight className={`w-4 h-4 text-gray-700 transition-transform ${selected?.name === s.name ? 'rotate-90' : ''}`} />
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, (s.totalOrders / (stats[0]?.totalOrders || 1)) * 100)}%` }}
              />
            </div>

            {/* Expanded detail */}
            {selected?.name === s.name && (
              <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                <MiniStat label="Total Orders"    value={s.totalOrders}   color="text-blue-400" />
                <MiniStat label="Processed"       value={s.processedOrders} color="text-green-400" />
                <MiniStat label="Pending"         value={s.pendingOrders} color="text-amber-400" />
                <MiniStat label="Unique Customers" value={s.customers.size} color="text-purple-400" />
                <div className="col-span-2 bg-white/3 rounded-xl px-3 py-2">
                  <p className="text-gray-600 text-[10px] font-mono">LAST ORDER</p>
                  <p className="text-white text-xs font-mono mt-0.5">
                    {s.lastOrder
                      ? new Date(s.lastOrder).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })
                      : '—'}
                  </p>
                </div>
                {/* That salesman's recent orders */}
                <div className="col-span-2 space-y-1 mt-1">
                  <p className="text-gray-600 text-[10px] font-mono uppercase">Recent Orders</p>
                  {orders
                    .filter(o => (o.salesman_code || o.salesman_name) === (s.code || s.name))
                    .slice(0, 3)
                    .map(o => (
                      <div key={o.id} className="flex justify-between items-center bg-white/2 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-white text-xs font-medium">{o.customer_name}</p>
                          <p className="text-gray-600 text-[10px] font-mono">{o.items?.length} items</p>
                        </div>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          o.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
                        }`}>{o.status?.toUpperCase()}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="bg-white/3 rounded-xl px-3 py-2">
      <p className="text-gray-600 text-[10px] font-mono">{label}</p>
      <p className={`${color} font-bold text-base`}>{value}</p>
    </div>
  )
}

// ── Existing sub-components ───────────────────────────────────────────────────
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
            <div key={item.id} className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${
              isExpired ? 'bg-red-950/25 border-red-800/40' : 'bg-orange-950/20 border-orange-800/30'
            }`}>
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
                <FileOutput className="w-3.5 h-3.5" /> RETURN NOTE
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReturnNoteModal({ item, onClose }) {
  const [copied, setCopied] = useState(false)
  const days = getDaysToExpiry(item.expiry_date)
  const isExpired = days !== null && days < 0
  const noteText = `RETURN NOTE — Capital Medical Agency, Bhopal
━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${new Date().toLocaleDateString('en-IN')}
Medicine: ${item.medicine_name}
Batch No: ${item.batch_no || 'N/A'}
Expiry: ${formatExpiry(item.expiry_date)}
Qty: ${item.quantity}
Status: ${isExpired ? 'EXPIRED' : `Expiring in ${days} days`}
Reason: ${isExpired ? 'Past expiry date' : 'Near expiry — return to supplier'}
━━━━━━━━━━━━━━━━━━━━━━━━━
Authorized by: Admin | CMA System`

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/10 rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="text-white font-bold text-lg">Return Note</p>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <pre className="mx-4 mb-4 bg-white/5 border border-white/5 rounded-xl p-4 text-gray-300 text-[11px] font-mono leading-relaxed whitespace-pre-wrap">{noteText}</pre>
        <div className="flex gap-2 px-4 pb-5">
          <button
            onClick={() => navigator.clipboard.writeText(noteText).then(() => setCopied(true))}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
              copied ? 'bg-green-500 text-black' : 'bg-yellow-500 text-black'
            }`}
          >
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : 'Copy Note'}
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-white/5 text-white border border-white/10 text-sm font-semibold">Close</button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, valueClass, onClick, cta }) {
  return (
    <div className={`bg-[#0d0d0d] border border-white/5 rounded-2xl p-4 ${onClick ? 'active:scale-95 cursor-pointer' : ''} transition-transform`} onClick={onClick}>
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{label}</span></div>
      <div className={`text-3xl font-bold ${valueClass} tracking-wider mb-0.5`}>{value}</div>
      <div className="text-gray-500 text-xs uppercase font-mono tracking-wider">{sub}</div>
      {cta && onClick && (
        <button className="mt-2 text-xs text-yellow-500 font-mono flex items-center gap-0.5">{cta} <ChevronRight className="w-3 h-3" /></button>
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

// Keep this export for backward compatibility
export function RecentOrdersSection({ orders, onMarkProcessed }) {
  return null
}

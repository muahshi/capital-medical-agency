// ─── src/components/Dashboard.jsx — Phase 3: Live Orders + Commission ─────────
import { useMemo, useState, useEffect } from 'react'
import {
  TrendingUp, AlertTriangle, Package, FileText, Bell,
  ChevronRight, Clock, AlertCircle, FileOutput, X, Check,
  User, Pill, BarChart2, Users, RefreshCw, Truck,
  IndianRupee, Filter, ChevronDown, Circle, CheckCircle2,
  Loader, Eye, Award, TrendingDown, Zap
} from 'lucide-react'
import {
  getStockStatus, getStatusClass, getStatusLabel,
  formatExpiry, formatCurrency, calculateTotalStockValue,
  getExpiringItems, getLowStockItems, getDaysToExpiry
} from '../lib/stockUtils'
import { differenceInDays, parseISO } from 'date-fns'
import { updateOrderStatus } from '../lib/supabase'

// ─── Commission rate (can be per-salesman from DB later) ──────────────────────
const DEFAULT_COMM = 2

export default function Dashboard({
  items, orders = [], pendingOrderCount = 0,
  onNavigate, onMarkOrderProcessed
}) {
  const [returnNote,     setReturnNote]    = useState(null)
  const [selectedOrder,  setSelectedOrder] = useState(null)
  const [mainTab,        setMainTab]       = useState('dashboard')  // dashboard | orders | salesmen
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [updatingId,     setUpdatingId]    = useState(null)

  // New order ping listener
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'cma_new_order_ping') {
        // Flash the orders tab
        setMainTab(prev => {
          if (prev !== 'orders') {
            // Brief visual cue handled by pendingOrderCount badge
          }
          return prev
        })
      }
    }
    window.addEventListener('storage', fn)
    return () => window.removeEventListener('storage', fn)
  }, [])

  const stats = useMemo(() => ({
    totalValue:    calculateTotalStockValue(items),
    expiringIn90:  getExpiringItems(items, 90),
    lowStockItems: getLowStockItems(items),
    actionItems:   items.filter(i => { const d = getDaysToExpiry(i.expiry_date); return d !== null && d <= 90 }),
  }), [items])

  // Salesman aggregated stats
  const salesmanStats = useMemo(() => {
    const map = {}
    orders.forEach(o => {
      const key = o.salesman_code || o.salesman_name || 'unknown'
      if (!map[key]) map[key] = {
        name: o.salesman_name, code: o.salesman_code,
        total: 0, pending: 0, processing: 0, delivered: 0, cancelled: 0,
        totalValue: 0, commission: 0, customers: new Set(), lastOrder: null,
      }
      map[key].total++
      map[key][o.status] = (map[key][o.status] || 0) + 1
      map[key].totalValue += o.order_value || 0
      map[key].commission += o.commission || (o.order_value || 0) * DEFAULT_COMM / 100
      if (o.customer_name) map[key].customers.add(o.customer_name)
      const d = new Date(o.created_at)
      if (!map[key].lastOrder || d > new Date(map[key].lastOrder)) map[key].lastOrder = o.created_at
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [orders])

  // Order status update
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      if (newStatus === 'processing' || newStatus === 'delivered') {
        await updateOrderStatus(orderId, newStatus)
        onMarkOrderProcessed(orderId)  // local state update
      } else {
        await updateOrderStatus(orderId, newStatus)
        onMarkOrderProcessed(orderId)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingId(null)
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null)
    }
  }

  const filteredOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (orderStatusFilter === 'all') return sorted
    return sorted.filter(o => o.status === orderStatusFilter)
  }, [orders, orderStatusFilter])

  const recentItems = items.slice(0, 5)

  // ─── MAIN NAV TABS ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top nav */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">Capital Medical Agency</p>
        <h1 className="text-3xl font-bold text-white tracking-widest">
          {mainTab === 'dashboard' ? 'DASHBOARD' : mainTab === 'orders' ? 'LIVE ORDERS' : 'SALESMEN'}
        </h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 px-4 pb-3">
        {[
          { id:'dashboard', label:'Overview',   icon:<BarChart2 size={13}/> },
          { id:'orders',    label:`Orders ${pendingOrderCount>0?`(${pendingOrderCount})`:''}`, icon:<Bell size={13}/> },
          { id:'salesmen',  label:'Salesmen',   icon:<Users size={13}/> },
        ].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              mainTab === t.id
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-white/3 text-gray-500 border border-white/5'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          DASHBOARD TAB
      ══════════════════════════════════════════════ */}
      {mainTab === 'dashboard' && (
        <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">

          {/* Pending order banner */}
          {pendingOrderCount > 0 && (
            <button onClick={() => setMainTab('orders')}
              className="w-full flex items-center gap-3 bg-blue-950/40 border border-blue-500/30 rounded-2xl px-4 py-3 active:scale-[0.98] transition-all">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <p className="flex-1 text-blue-300 text-sm font-mono">
                🔔 {pendingOrderCount} New Field Order{pendingOrderCount > 1 ? 's' : ''} — Tap to manage
              </p>
              <ChevronRight className="w-4 h-4 text-blue-400" />
            </button>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<TrendingUp className="w-5 h-5 text-yellow-500"/>} label="STOCK VALUE"
              value={formatCurrency(stats.totalValue)} sub={`${items.length} products`}
              valueClass="text-yellow-500" />
            <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-400"/>} label="EXPIRY ALERTS"
              value={stats.expiringIn90.length} sub="next 90 days" valueClass="text-red-400"
              onClick={() => onNavigate('inventory','expiring')} cta="View" />
            <StatCard icon={<Package className="w-5 h-5 text-amber-400"/>} label="LOW STOCK"
              value={stats.lowStockItems.length} sub="items" valueClass="text-amber-400"
              onClick={() => onNavigate('inventory','low')} cta="View" />
            <StatCard icon={<IndianRupee className="w-5 h-5 text-green-400"/>} label="TOTAL ORDERS"
              value={orders.length} sub={`${pendingOrderCount} pending`} valueClass="text-white" />
          </div>

          {/* AI Scan Banner */}
          <button onClick={() => onNavigate('scan')}
            className="w-full relative overflow-hidden rounded-2xl p-4 text-left active:scale-[0.98] transition-transform"
            style={{ background:'linear-gradient(135deg,#0a0a1a,#0d0d2b,#060610)', border:'1px solid rgba(100,100,255,0.25)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-yellow-500/60 rounded-sm" />
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-white tracking-widest">SCAN NEW BILL</p>
                <p className="text-xs text-blue-300/70 font-mono mt-0.5">AI POWERED · GROQ VISION · OCR</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30" />
            </div>
          </button>

          {/* Action required */}
          {stats.actionItems.length > 0 && (
            <ActionRequired items={stats.actionItems} onGenerateReturn={setReturnNote} />
          )}

          {/* Stock overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">STOCK OVERVIEW</span>
              <button onClick={() => onNavigate('inventory')} className="text-yellow-500 text-xs font-mono flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3"/>
              </button>
            </div>
            <div className="bg-[#0d0d0d] rounded-2xl overflow-hidden border border-white/5">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 border-b border-white/5">
                <span className="text-gray-600 text-[10px] font-mono uppercase">MEDICINE</span>
                <span className="text-gray-600 text-[10px] font-mono uppercase">QTY</span>
                <span className="text-gray-600 text-[10px] font-mono uppercase">STATUS</span>
              </div>
              {recentItems.length === 0
                ? <div className="py-10 text-center text-gray-600 text-sm">Koi item nahi. Bill scan karo.</div>
                : recentItems.map((item, i) => <StockRow key={item.id} item={item} isLast={i===recentItems.length-1}/>)
              }
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          LIVE ORDERS TAB
      ══════════════════════════════════════════════ */}
      {mainTab === 'orders' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Status filter */}
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
            {[
              { id:'all',        label:`All (${orders.length})` },
              { id:'pending',    label:`Pending (${orders.filter(o=>o.status==='pending').length})` },
              { id:'processing', label:`Processing` },
              { id:'delivered',  label:`Delivered` },
              { id:'cancelled',  label:`Cancelled` },
            ].map(f => (
              <button key={f.id} onClick={() => setOrderStatusFilter(f.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all ${
                  orderStatusFilter===f.id
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-white/3 text-gray-500 border border-white/5'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Orders list */}
          <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Bell className="w-10 h-10 text-gray-700" />
                <p className="text-gray-500 text-sm">
                  {orderStatusFilter==='all' ? 'Koi order nahi abhi.' : `Koi ${orderStatusFilter} order nahi.`}
                </p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isUpdating={updatingId === order.id}
                  onOpen={() => setSelectedOrder(order)}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SALESMEN TAB
      ══════════════════════════════════════════════ */}
      {mainTab === 'salesmen' && (
        <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Salesmen"   value={salesmanStats.length}                       color="text-white" />
            <MiniStat label="Total Orders" value={orders.length}                            color="text-blue-400" />
            <MiniStat label="Commission"
              value={`₹${Math.round(orders.reduce((s,o)=>s+(o.commission||0),0)).toLocaleString('en-IN')}`}
              color="text-green-400" />
          </div>

          {salesmanStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-10 h-10 text-gray-700" />
              <p className="text-gray-500 text-sm">Koi salesman order nahi abhi.</p>
            </div>
          ) : (
            salesmanStats.map((s, idx) => (
              <SalesmanCard key={s.code||s.name} stat={s} rank={idx} orders={orders} />
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isUpdating={updatingId === selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
      {returnNote && <ReturnNoteModal item={returnNote} onClose={() => setReturnNote(null)} />}
    </div>
  )
}

// ─── ORDER CARD ────────────────────────────────────────────────────────────────
function OrderCard({ order, isUpdating, onOpen, onStatusChange }) {
  const [showActions, setShowActions] = useState(false)
  const nextStatus = {
    pending:    'processing',
    processing: 'delivered',
  }[order.status]

  const nextLabel = {
    pending:    '→ Mark Processing',
    processing: '→ Mark Delivered',
  }[order.status]

  return (
    <div className={`bg-[#0d0d0d] rounded-2xl border transition-all ${
      order.status==='pending'    ? 'border-amber-500/20' :
      order.status==='processing' ? 'border-blue-500/20'  :
      order.status==='delivered'  ? 'border-green-500/15' :
      'border-white/5'
    }`}>
      {/* Main row */}
      <button className="w-full text-left p-4" onClick={onOpen}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-bold text-sm truncate">{order.customer_name}</p>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-gray-500 text-[11px] font-mono">
              {order.salesman_name} · {order.items?.length} items ·{' '}
              {new Date(order.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
            </p>
            <p className="text-gray-600 text-[11px] mt-0.5 truncate">
              {order.items?.slice(0,3).map(i=>i.medicine_name).join(', ')}
              {order.items?.length>3 && ` +${order.items.length-3} more`}
            </p>
          </div>
          <div className="text-right shrink-0">
            {order.order_value>0 && <p className="text-white font-mono text-xs">₹{Math.round(order.order_value).toLocaleString('en-IN')}</p>}
            {order.commission>0 && <p className="text-green-400 font-mono text-[10px]">₹{Math.round(order.commission)} comm</p>}
          </div>
        </div>
      </button>

      {/* Quick action */}
      {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={() => onStatusChange(order.id, nextStatus)}
            disabled={isUpdating}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 ${
              nextStatus==='processing'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                : 'bg-green-500/15 text-green-400 border border-green-500/20'
            }`}
          >
            {isUpdating ? <Loader className="w-3.5 h-3.5 animate-spin"/> : <Truck className="w-3.5 h-3.5"/>}
            {isUpdating ? 'Updating...' : nextLabel}
          </button>
          <button
            onClick={() => onStatusChange(order.id, 'cancelled')}
            disabled={isUpdating}
            className="px-3 py-2 rounded-xl text-xs text-red-400 border border-red-500/15 bg-red-500/8 active:scale-95"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ─── ORDER DETAIL MODAL ────────────────────────────────────────────────────────
function OrderDetailModal({ order, isUpdating, onClose, onStatusChange }) {
  const [localStatus, setLocalStatus] = useState(order.status)

  const handleChange = async (newStatus) => {
    setLocalStatus(newStatus)
    await onStatusChange(order.id, newStatus)
  }

  const statusFlow = ['pending','processing','delivered']
  const currentIdx = statusFlow.indexOf(localStatus)

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end justify-center p-3"
      onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/10 rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
          <div>
            <p className="text-gray-500 text-[10px] font-mono">{order.id}</p>
            <p className="text-white font-bold text-lg">{order.customer_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400"/>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">

          {/* Status pipeline */}
          <div className="flex items-center gap-1">
            {statusFlow.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex-1 h-0.5 ${i===0?'hidden':''} ${i<=currentIdx?'bg-yellow-500':'bg-white/10'}`}/>
                <button
                  onClick={() => s !== 'cancelled' && handleChange(s)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-[10px] font-bold transition-all ${
                    i < currentIdx  ? 'border-yellow-500 bg-yellow-500 text-black' :
                    i === currentIdx ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' :
                                      'border-white/10 bg-transparent text-gray-600'
                  }`}
                >
                  {i < currentIdx ? <Check className="w-3.5 h-3.5"/> : i+1}
                </button>
                <div className={`flex-1 h-0.5 ${i===statusFlow.length-1?'hidden':''} ${i<currentIdx?'bg-yellow-500':'bg-white/10'}`}/>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-1">
            {statusFlow.map(s => (
              <span key={s} className={`text-[9px] font-mono ${s===localStatus?'text-yellow-400':'text-gray-600'}`}>
                {s.toUpperCase()}
              </span>
            ))}
          </div>

          {/* Salesman + time */}
          <div className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-2xl px-4 py-3">
            <User className="w-4 h-4 text-yellow-500 shrink-0"/>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">{order.salesman_name}</p>
              <p className="text-gray-500 text-xs font-mono">
                {new Date(order.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
              </p>
            </div>
            <OrderStatusBadge status={localStatus}/>
          </div>

          {/* Value + commission */}
          {(order.order_value > 0 || order.commission > 0) && (
            <div className="grid grid-cols-2 gap-2">
              {order.order_value>0 && (
                <div className="bg-yellow-500/8 border border-yellow-500/15 rounded-xl px-3 py-2 text-center">
                  <p className="text-yellow-400 font-bold text-base">₹{Math.round(order.order_value).toLocaleString('en-IN')}</p>
                  <p className="text-gray-600 text-[10px] font-mono">Order Value</p>
                </div>
              )}
              {order.commission>0 && (
                <div className="bg-green-500/8 border border-green-500/15 rounded-xl px-3 py-2 text-center">
                  <p className="text-green-400 font-bold text-base">₹{Math.round(order.commission).toLocaleString('en-IN')}</p>
                  <p className="text-gray-600 text-[10px] font-mono">Commission</p>
                </div>
              )}
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-2">ITEMS ({order.items?.length})</p>
            <div className="space-y-1.5">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-xl px-4 py-2.5">
                  <Pill className="w-3.5 h-3.5 text-blue-400 shrink-0"/>
                  <p className="flex-1 text-white text-sm">{item.medicine_name}</p>
                  <span className="text-yellow-500 font-mono font-bold text-sm">×{item.qty}</span>
                  {item.unit && <span className="text-gray-600 text-[10px]">{item.unit}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Voice transcript */}
          {order.transcript && (
            <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-3">
              <p className="text-gray-600 text-[10px] font-mono uppercase mb-1">Voice Transcript</p>
              <p className="text-gray-400 text-xs italic leading-relaxed">"{order.transcript}"</p>
            </div>
          )}

          {order.notes && (
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl px-4 py-2.5">
              <p className="text-amber-400 text-xs">📝 {order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 pt-3 border-t border-white/5 space-y-2">
          {localStatus === 'pending' && (
            <button onClick={() => handleChange('processing')} disabled={isUpdating}
              className="w-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
              {isUpdating ? <Loader className="w-4 h-4 animate-spin"/> : <Truck className="w-4 h-4"/>}
              Mark as Processing
            </button>
          )}
          {localStatus === 'processing' && (
            <button onClick={() => handleChange('delivered')} disabled={isUpdating}
              className="w-full bg-green-500 text-black font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
              {isUpdating ? <Loader className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
              Mark as Delivered
            </button>
          )}
          {localStatus === 'delivered' && (
            <div className="w-full bg-green-900/20 border border-green-500/20 text-green-400 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5"/> Delivered ✓
            </div>
          )}
          {localStatus !== 'cancelled' && localStatus !== 'delivered' && (
            <button onClick={() => handleChange('cancelled')} disabled={isUpdating}
              className="w-full bg-red-950/20 border border-red-500/20 text-red-400 py-3 rounded-2xl text-sm font-semibold active:scale-95">
              Cancel Order
            </button>
          )}
          <button onClick={onClose} className="w-full bg-white/5 border border-white/8 text-gray-400 py-3 rounded-2xl text-sm active:scale-95">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SALESMAN CARD ─────────────────────────────────────────────────────────────
function SalesmanCard({ stat, rank, orders }) {
  const [expanded, setExpanded] = useState(false)
  const rankColors = ['#F59E0B','#9CA3AF','#92400E']
  const rankEmojis = ['🥇','🥈','🥉']
  const color = rankColors[rank] || '#4B5563'
  const myOrders = orders.filter(o => (o.salesman_code||o.salesman_name)===(stat.code||stat.name)).slice(0,5)

  return (
    <div className="bg-[#0d0d0d] border border-white/6 rounded-2xl overflow-hidden">
      <button className="w-full p-4 text-left active:bg-white/3 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black shrink-0"
            style={{ background:`${color}22`, color }}>
            {rank < 3 ? rankEmojis[rank] : `#${rank+1}`}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{stat.name}</p>
            <p className="text-gray-500 text-[11px] font-mono">
              {stat.total} orders · {stat.customers.size} customers
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-green-400 font-bold text-sm font-mono">₹{Math.round(stat.commission).toLocaleString('en-IN')}</p>
            <p className="text-gray-600 text-[9px] font-mono">commission</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform shrink-0 ${expanded?'rotate-180':''}`}/>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width:'100%', background: color, opacity:0.6 }}/>
        </div>

        {/* Status pills */}
        <div className="flex gap-2 mt-3">
          {[
            { s:'pending',    c:'#F59E0B', v:stat.pending    },
            { s:'processing', c:'#3B82F6', v:stat.processing  },
            { s:'delivered',  c:'#10B981', v:stat.delivered   },
            { s:'cancelled',  c:'#EF4444', v:stat.cancelled   },
          ].filter(x=>x.v>0).map(x => (
            <span key={x.s} style={{ background:`${x.c}18`, color:x.c, border:`1px solid ${x.c}30` }}
              className="text-[9px] font-mono px-2 py-0.5 rounded-lg">
              {x.s} {x.v}
            </span>
          ))}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-3">
          {/* Commission detail */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-yellow-500/8 border border-yellow-500/15 rounded-xl px-3 py-2">
              <p className="text-yellow-400 font-bold text-sm">₹{Math.round(stat.totalValue).toLocaleString('en-IN')}</p>
              <p className="text-gray-600 text-[10px] font-mono">Est. Order Value</p>
            </div>
            <div className="bg-green-500/8 border border-green-500/15 rounded-xl px-3 py-2">
              <p className="text-green-400 font-bold text-sm">₹{Math.round(stat.commission).toLocaleString('en-IN')}</p>
              <p className="text-gray-600 text-[10px] font-mono">Commission ({DEFAULT_COMM}%)</p>
            </div>
          </div>

          {/* Last order */}
          {stat.lastOrder && (
            <p className="text-gray-600 text-[10px] font-mono">
              Last order: {new Date(stat.lastOrder).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
            </p>
          )}

          {/* Recent orders */}
          <div className="space-y-1.5">
            <p className="text-gray-600 text-[10px] font-mono uppercase">Recent Orders</p>
            {myOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between bg-white/2 rounded-xl px-3 py-2">
                <div>
                  <p className="text-white text-xs font-medium">{o.customer_name}</p>
                  <p className="text-gray-600 text-[10px]">{o.items?.length} items</p>
                </div>
                <OrderStatusBadge status={o.status}/>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function OrderStatusBadge({ status }) {
  const map = {
    pending:    { bg:'bg-amber-500/15',  text:'text-amber-400',  label:'PENDING'     },
    processing: { bg:'bg-blue-500/15',   text:'text-blue-400',   label:'PROCESSING'  },
    processed:  { bg:'bg-blue-500/15',   text:'text-blue-400',   label:'PROCESSING'  },
    delivered:  { bg:'bg-green-500/15',  text:'text-green-400',  label:'DELIVERED'   },
    cancelled:  { bg:'bg-red-500/15',    text:'text-red-400',    label:'CANCELLED'   },
  }
  const s = map[status] || map.pending
  return (
    <span className={`${s.bg} ${s.text} text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg whitespace-nowrap`}>
      {s.label}
    </span>
  )
}

function StatCard({ icon, label, value, sub, valueClass, onClick, cta }) {
  return (
    <div className={`bg-[#0d0d0d] border border-white/5 rounded-2xl p-4 ${onClick?'active:scale-95 cursor-pointer':''} transition-transform`} onClick={onClick}>
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{label}</span></div>
      <div className={`text-3xl font-bold ${valueClass} tracking-wider mb-0.5`}>{value}</div>
      <div className="text-gray-500 text-xs uppercase font-mono tracking-wider">{sub}</div>
      {cta && onClick && <button className="mt-2 text-xs text-yellow-500 font-mono flex items-center gap-0.5">{cta} <ChevronRight className="w-3 h-3"/></button>}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-3 text-center">
      <p className={`${color} font-bold text-lg`}>{value}</p>
      <p className="text-gray-600 text-[10px] font-mono">{label}</p>
    </div>
  )
}

function ActionRequired({ items, onGenerateReturn }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-orange-400"/>
        <span className="text-orange-400 text-[10px] font-mono uppercase tracking-widest font-bold">ACTION REQUIRED ({items.length})</span>
      </div>
      {items.slice(0,3).map(item => {
        const days = getDaysToExpiry(item.expiry_date)
        const isExpired = days !== null && days < 0
        return (
          <div key={item.id} className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${isExpired?'bg-red-950/25 border-red-800/40':'bg-orange-950/20 border-orange-800/30'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{item.medicine_name}</p>
              <p className="text-gray-500 text-[11px] font-mono mt-0.5">
                {item.batch_no||'—'} · Exp: {formatExpiry(item.expiry_date)}
                <span className={`ml-2 font-bold ${isExpired?'text-red-400':'text-orange-400'}`}>
                  {isExpired?`${Math.abs(days)}d ago`:`${days}d left`}
                </span>
              </p>
            </div>
            <button onClick={() => onGenerateReturn(item)}
              className="shrink-0 text-white text-[11px] font-mono px-3 py-1.5 rounded-xl border border-white/10 bg-white/10 flex items-center gap-1.5 active:scale-95">
              <FileOutput className="w-3.5 h-3.5"/> RETURN
            </button>
          </div>
        )
      })}
    </div>
  )
}

function StockRow({ item, isLast }) {
  const status = getStockStatus(item)
  return (
    <div className={`grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-3 ${!isLast?'border-b border-white/5':''}`}>
      <div>
        <p className="text-white text-sm leading-tight">{item.medicine_name}</p>
        <p className="text-gray-600 text-[10px] font-mono mt-0.5">{item.batch_no||'—'} · {formatExpiry(item.expiry_date)}</p>
      </div>
      <span className="text-white font-mono text-sm">{(item.quantity||0).toLocaleString('en-IN')}</span>
      <span className={getStatusClass(status)}>{getStatusLabel(status)}</span>
    </div>
  )
}

function ReturnNoteModal({ item, onClose }) {
  const [copied, setCopied] = useState(false)
  const days = getDaysToExpiry(item.expiry_date)
  const isExpired = days !== null && days < 0
  const note = `RETURN NOTE — Capital Medical Agency, Bhopal
━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${new Date().toLocaleDateString('en-IN')}
Medicine: ${item.medicine_name}
Batch No: ${item.batch_no||'N/A'}
Expiry: ${formatExpiry(item.expiry_date)}
Qty: ${item.quantity}
Status: ${isExpired?'EXPIRED':`Expiring in ${days} days`}
Reason: ${isExpired?'Past expiry date':'Near expiry — return to supplier'}
━━━━━━━━━━━━━━━━━━━━━━━━━
Authorized by: Admin | CMA System`

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/10 rounded-3xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="text-white font-bold text-lg">Return Note</p>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400"/>
          </button>
        </div>
        <pre className="mx-4 mb-4 bg-white/5 border border-white/5 rounded-xl p-4 text-gray-300 text-[11px] font-mono leading-relaxed whitespace-pre-wrap">{note}</pre>
        <div className="flex gap-2 px-4 pb-5">
          <button onClick={() => navigator.clipboard.writeText(note).then(()=>setCopied(true))}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 ${copied?'bg-green-500 text-black':'bg-yellow-500 text-black'}`}>
            {copied?<><Check className="w-4 h-4"/> Copied!</>:'Copy Note'}
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-white/5 text-white border border-white/10 text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── src/lib/stockUtils.js — Shared utilities v3.0 ───────────────────────────
import { differenceInDays, parseISO, isValid, format } from 'date-fns'

// ── Status logic ──────────────────────────────────────────────────────────────
export function getStockStatus(item) {
  const days = getDaysToExpiry(item.expiry_date)
  if (days !== null && days < 0)  return 'expired'
  if (days !== null && days <= 30) return 'expiring'
  const threshold = item.low_stock_threshold || 50
  if (item.quantity === 0)              return 'out'
  if (item.quantity < threshold * 0.3)  return 'critical'
  if (item.quantity < threshold)        return 'low'
  return 'ok'
}

export function getStatusLabel(status) {
  const map = { ok:'IN STOCK', low:'LOW STOCK', critical:'CRITICAL', out:'OUT', expired:'EXPIRED', expiring:'EXP SOON' }
  return map[status] || status.toUpperCase()
}

export function getStatusClass(status) {
  const base = 'text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg whitespace-nowrap'
  const map = {
    ok:       `${base} bg-green-900/40 text-green-400`,
    low:      `${base} bg-amber-900/40 text-amber-400`,
    critical: `${base} bg-orange-900/40 text-orange-400`,
    out:      `${base} bg-red-900/40 text-red-400`,
    expired:  `${base} bg-red-900/60 text-red-300`,
    expiring: `${base} bg-orange-900/40 text-orange-300`,
  }
  return map[status] || `${base} bg-gray-900 text-gray-400`
}

// ── Expiry helpers ────────────────────────────────────────────────────────────
export function getDaysToExpiry(expiry_date) {
  if (!expiry_date) return null
  try {
    let d
    if (typeof expiry_date === 'string' && /^\d{2}\/\d{4}$/.test(expiry_date)) {
      const [m, y] = expiry_date.split('/')
      d = new Date(parseInt(y), parseInt(m) - 1, 1)
    } else {
      d = parseISO(expiry_date)
    }
    if (!isValid(d)) return null
    return differenceInDays(d, new Date())
  } catch { return null }
}

export function formatExpiry(expiry_date) {
  if (!expiry_date) return 'N/A'
  try {
    if (typeof expiry_date === 'string' && /^\d{2}\/\d{4}$/.test(expiry_date)) return expiry_date
    const d = parseISO(expiry_date)
    if (!isValid(d)) return expiry_date
    return format(d, 'MM/yyyy')
  } catch { return expiry_date }
}

// ── Aggregators ───────────────────────────────────────────────────────────────
export function calculateTotalStockValue(items = []) {
  return items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unit_price || 0), 0)
}

export function getExpiringItems(items = [], days = 90) {
  return items.filter(i => {
    const d = getDaysToExpiry(i.expiry_date)
    return d !== null && d >= 0 && d <= days
  }).sort((a, b) => (getDaysToExpiry(a.expiry_date) || 0) - (getDaysToExpiry(b.expiry_date) || 0))
}

export function getLowStockItems(items = []) {
  return items.filter(i => {
    const s = getStockStatus(i)
    return s === 'low' || s === 'critical' || s === 'out'
  })
}

// ── Formatting ────────────────────────────────────────────────────────────────
export function formatCurrency(val = 0) {
  if (val >= 100000) return `₹${(val/100000).toFixed(1)}L`
  if (val >= 1000)   return `₹${(val/1000).toFixed(1)}K`
  return `₹${Math.round(val).toLocaleString('en-IN')}`
}

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
  } catch { return dateStr }
}

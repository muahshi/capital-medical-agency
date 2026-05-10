import { differenceInDays, parseISO, isValid } from 'date-fns'

/**
 * Smart expiry logic:
 * - Nikal gayi → 'expired' (Red)
 * - 180 din (6 mahine) se kam → 'expiring' (Yellow)
 * - Stock kam hai → 'low_stock'
 * - Sab theek → 'in_stock'
 */
export function getStockStatus(item) {
  const today = new Date()

  if (item.expiry_date) {
    const expiry = parseISO(item.expiry_date)
    if (isValid(expiry)) {
      const daysToExpiry = differenceInDays(expiry, today)
      if (daysToExpiry < 0) return 'expired'
      if (daysToExpiry <= 180) return 'expiring'  // 6 mahine
    }
  }

  const threshold = item.low_stock_threshold || 100
  if (item.quantity <= 0) return 'out_of_stock'
  if (item.quantity <= threshold) return 'low_stock'

  return 'in_stock'
}

export function getStatusLabel(status) {
  const map = {
    in_stock: 'IN STOCK',
    low_stock: 'LOW STOCK',
    expiring: 'EXPIRING SOON',
    expired: 'EXPIRED',
    out_of_stock: 'OUT OF STOCK',
  }
  return map[status] || 'UNKNOWN'
}

export function getStatusClass(status) {
  const map = {
    in_stock: 'badge-in-stock',
    low_stock: 'badge-low-stock',
    expiring: 'badge-expiring',
    expired: 'badge-expired',
    out_of_stock: 'badge-expired',
  }
  return map[status] || 'badge-in-stock'
}

export function getDaysToExpiry(expiryDate) {
  if (!expiryDate) return null
  const expiry = parseISO(expiryDate)
  if (!isValid(expiry)) return null
  return differenceInDays(expiry, new Date())
}

export function formatExpiry(expiryDate) {
  if (!expiryDate) return '—'
  try {
    const d = parseISO(expiryDate)
    if (!isValid(d)) return expiryDate
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${month}/${year}`
  } catch {
    return expiryDate
  }
}

// Indian Rupee format: ₹1,23,456
export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '₹0'
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

export function calculateTotalStockValue(items) {
  return items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unit_price || 0)
  }, 0)
}

export function getExpiringItems(items, days = 180) {
  const today = new Date()
  return items.filter(item => {
    if (!item.expiry_date) return false
    const expiry = parseISO(item.expiry_date)
    if (!isValid(expiry)) return false
    const diff = differenceInDays(expiry, today)
    return diff >= 0 && diff <= days
  })
}

export function getLowStockItems(items) {
  return items.filter(item => {
    const threshold = item.low_stock_threshold || 100
    return item.quantity <= threshold && item.quantity > 0
  })
}

export function getOutOfStockItems(items) {
  return items.filter(item => item.quantity <= 0)
}

import { differenceInDays, parseISO, isValid } from 'date-fns'

/**
 * Get stock status for a medicine item
 */
export function getStockStatus(item) {
  const today = new Date()

  if (item.expiry_date) {
    const expiry = parseISO(item.expiry_date)
    if (isValid(expiry)) {
      const daysToExpiry = differenceInDays(expiry, today)
      if (daysToExpiry < 0) return 'expired'
      if (daysToExpiry <= 90) return 'expiring'
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

export function formatCurrency(amount) {
  if (!amount) return '₹0'
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function calculateTotalStockValue(items) {
  return items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unit_price || 0)
  }, 0)
}

export function getExpiringItems(items, days = 90) {
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

// Demo stock data for offline/demo mode
export const DEMO_STOCK = [
  { id: '1', medicine_name: 'Paracetamol 650mg', batch_no: 'PAR65023A', expiry_date: '2026-05-31', quantity: 12450, unit_price: 2.50, low_stock_threshold: 1000, source: 'manual' },
  { id: '2', medicine_name: 'Amoxicillin 500mg', batch_no: 'AMX50024B', expiry_date: '2025-09-30', quantity: 5320, unit_price: 8.75, low_stock_threshold: 5000, source: 'ai_scan' },
  { id: '3', medicine_name: 'Cetirizine 10mg', batch_no: 'CET1024C', expiry_date: '2025-07-31', quantity: 2150, unit_price: 3.20, low_stock_threshold: 5000, source: 'ai_scan' },
  { id: '4', medicine_name: 'Ambroxol Syrup 100ml', batch_no: 'AMBX0424D', expiry_date: '2025-06-30', quantity: 1080, unit_price: 45.00, low_stock_threshold: 200, source: 'manual' },
  { id: '5', medicine_name: 'Pantoprazole 40mg', batch_no: 'PANT4024E', expiry_date: '2026-11-30', quantity: 3600, unit_price: 5.20, low_stock_threshold: 500, source: 'ai_scan' },
  { id: '6', medicine_name: 'Metformin 500mg', batch_no: 'MET5024F', expiry_date: '2026-08-31', quantity: 8900, unit_price: 3.20, low_stock_threshold: 1000, source: 'manual' },
]

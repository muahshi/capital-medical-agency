import { useState, useMemo } from 'react'
import { Search, Filter, Plus, Trash2, Edit2, X, Check, ChevronDown, SortAsc, Upload } from 'lucide-react'
import {
  getStockStatus, getStatusClass, getStatusLabel,
  formatExpiry, formatCurrency, getDaysToExpiry,
  getExpiringItems, getLowStockItems
} from '../lib/stockUtils'
import toast from 'react-hot-toast'
import BulkInventoryImport from './BulkInventoryImport'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'low', label: 'Low Stock' },
  { id: 'expiring', label: 'Expiring' },
  { id: 'expired', label: 'Expired' },
]

export default function InventoryPage({ items, onUpdate, onDelete, initialFilter, suppliers = [], onBulkImport }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(initialFilter || 'all')
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)
  
  // Phase 1: Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [expiryRangeFilter, setExpiryRangeFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [showBulkImport, setShowBulkImport] = useState(false)

  const categories = ['all', ...new Set(items.map(i => i.category).filter(Boolean))]
  const supplierOptions = [{ id: 'all', name: 'All Suppliers' }, ...suppliers]

  const filtered = useMemo(() => {
    let list = [...items]

    // Apply status filter
    if (filter === 'low') list = getLowStockItems(list)
    else if (filter === 'expiring') list = getExpiringItems(list, 90)
    else if (filter === 'expired') list = list.filter(i => getStockStatus(i) === 'expired')

    // Phase 1: Category filter
    if (categoryFilter !== 'all') {
      list = list.filter(i => i.category === categoryFilter)
    }

    // Phase 1: Expiry range filter
    if (expiryRangeFilter !== 'all') {
      const now = new Date()
      list = list.filter(i => {
        if (!i.expiry_date) return false
        const days = getDaysToExpiry(i.expiry_date)
        if (days === null) return false
        
        if (expiryRangeFilter === '30days') return days <= 30
        if (expiryRangeFilter === '90days') return days <= 90 && days > 30
        if (expiryRangeFilter === '6months') return days <= 180 && days > 90
        if (expiryRangeFilter === 'expired') return days < 0
        return true
      })
    }

    // Phase 1: Supplier filter
    if (supplierFilter !== 'all') {
      list = list.filter(i => i.supplier_id === supplierFilter)
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.medicine_name?.toLowerCase().includes(q) ||
        i.batch_no?.toLowerCase().includes(q)
      )
    }

    // Sort by status priority
    const priority = { expired: 0, expiring: 1, low_stock: 2, out_of_stock: 3, in_stock: 4 }
    list.sort((a, b) => (priority[getStockStatus(a)] || 4) - (priority[getStockStatus(b)] || 4))

    return list
  }, [items, filter, search, categoryFilter, expiryRangeFilter, supplierFilter])

  function startEdit(item) {
    setEditingId(item.id)
    setEditData({
      quantity: item.quantity,
      unit_price: item.unit_price,
    })
  }

  async function saveEdit(item) {
    const { error } = await onUpdate(item.id, {
      quantity: parseInt(editData.quantity) || 0,
      unit_price: parseFloat(editData.unit_price) || 0,
    })
    if (error) {
      toast.error('Failed to update', { className: 'toast-dark' })
    } else {
      toast.success('Updated!', { className: 'toast-dark' })
    }
    setEditingId(null)
  }

  async function confirmDeleteItem(id) {
    const { error } = await onDelete(id)
    if (error) {
      toast.error('Failed to delete', { className: 'toast-dark' })
    } else {
      toast.success('Removed from inventory', { className: 'toast-dark' })
    }
    setConfirmDelete(null)
  }

  const activeAdvancedFiltersCount = 
    (categoryFilter !== 'all' ? 1 : 0) +
    (expiryRangeFilter !== 'all' ? 1 : 0) +
    (supplierFilter !== 'all' ? 1 : 0)

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-end justify-between">
        <div>
          <p className="text-dark-400 text-xs font-mono tracking-widest uppercase">Real-time</p>
          <h1 className="font-display text-3xl text-white tracking-widest">INVENTORY</h1>
        </div>
        <button
          onClick={() => setShowBulkImport(true)}
          className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 rounded-lg text-xs text-gold-500 hover:bg-gold-500/20 transition-all flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          Bulk Import
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="search"
            placeholder="Search medicine or batch..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-dark pl-10 bg-dark-800"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scroll-area">
          {FILTERS.map(f => {
            const count = f.id === 'all' ? items.length
              : f.id === 'low' ? getLowStockItems(items).length
              : f.id === 'expiring' ? getExpiringItems(items, 90).length
              : items.filter(i => getStockStatus(i) === 'expired').length

            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                  filter === f.id
                    ? 'bg-gold-500 text-dark-900 font-bold'
                    : 'bg-dark-700 text-dark-300 border border-dark-600'
                }`}
              >
                {f.label}
                <span className={`text-[10px] ${filter === f.id ? 'text-dark-800' : 'text-dark-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
              activeAdvancedFiltersCount > 0
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                : 'bg-dark-700 text-dark-300 border border-dark-600'
            }`}
          >
            <Filter className="w-3 h-3" />
            Filters
            {activeAdvancedFiltersCount > 0 && (
              <span className="text-[10px] bg-blue-500 text-white rounded-full px-1.5">{activeAdvancedFiltersCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="px-4 pb-3 space-y-3 border-b border-dark-700">
          {/* Category Filter */}
          <div>
            <label className="text-dark-400 text-xs font-mono uppercase block mb-1.5">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full input-dark text-sm bg-dark-800"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Expiry Range Filter */}
          <div>
            <label className="text-dark-400 text-xs font-mono uppercase block mb-1.5">Expiry Range</label>
            <select
              value={expiryRangeFilter}
              onChange={(e) => setExpiryRangeFilter(e.target.value)}
              className="w-full input-dark text-sm bg-dark-800"
            >
              <option value="all">All Dates</option>
              <option value="expired">Already Expired</option>
              <option value="30days">Within 30 Days</option>
              <option value="90days">31-90 Days</option>
              <option value="6months">91-180 Days</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div>
            <label className="text-dark-400 text-xs font-mono uppercase block mb-1.5">Supplier</label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full input-dark text-sm bg-dark-800"
            >
              {supplierOptions.map(sup => (
                <option key={sup.id} value={sup.id}>
                  {sup.name || sup.supplier_name || 'All Suppliers'}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {activeAdvancedFiltersCount > 0 && (
            <button
              onClick={() => {
                setCategoryFilter('all')
                setExpiryRangeFilter('all')
                setSupplierFilter('all')
              }}
              className="w-full py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg text-xs text-dark-300 font-mono transition-all"
            >
              Clear Advanced Filters
            </button>
          )}
        </div>
      )}

      {/* Items count */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-dark-400 text-xs font-mono">{filtered.length} items</span>
        <span className="text-dark-400 text-xs font-mono">
          {formatCurrency(filtered.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0))}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 scroll-area px-4 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-600 flex items-center justify-center">
              <Search className="w-8 h-8 text-dark-500" />
            </div>
            <p className="text-dark-400 text-sm">No items found</p>
          </div>
        ) : (
          filtered.map(item => {
            const status = getStockStatus(item)
            const days = getDaysToExpiry(item.expiry_date)
            const isEditing = editingId === item.id
            const isDeleting = confirmDelete === item.id

            return (
              <div
                key={item.id}
                className={`bg-dark-800 rounded-2xl border transition-all ${
                  status === 'expired' ? 'border-red-900/50' :
                  status === 'expiring' ? 'border-amber-900/50' :
                  status === 'low_stock' ? 'border-amber-800/30' :
                  'border-dark-600'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold leading-tight truncate">{item.medicine_name}</p>
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        <span className="text-dark-400 text-xs font-mono">{item.batch_no || '—'}</span>
                        <span className={`text-xs font-mono ${
                          days !== null && days <= 30 ? 'text-red-400' :
                          days !== null && days <= 90 ? 'text-amber-400' :
                          'text-dark-400'
                        }`}>
                          Exp: {formatExpiry(item.expiry_date)}
                          {days !== null && ` (${days}d)`}
                        </span>
                      </div>
                      {item.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-dark-700 border border-dark-600 rounded text-[10px] text-dark-300 font-mono">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span className={getStatusClass(status)}>{getStatusLabel(status)}</span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-dark-400 text-[10px] font-mono uppercase">Quantity</label>
                          <input
                            type="number"
                            value={editData.quantity}
                            onChange={e => setEditData(d => ({ ...d, quantity: e.target.value }))}
                            className="input-dark mt-1 text-sm py-2"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-dark-400 text-[10px] font-mono uppercase">MRP (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editData.unit_price}
                            onChange={e => setEditData(d => ({ ...d, unit_price: e.target.value }))}
                            className="input-dark mt-1 text-sm py-2"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(item)}
                          className="flex-1 btn-gold py-2 flex items-center justify-center gap-1 text-sm"
                        >
                          <Check className="w-4 h-4" /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 btn-ghost py-2 flex items-center justify-center gap-1 text-sm"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    <div className="space-y-2">
                      <p className="text-red-400 text-sm">Delete this item?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmDeleteItem(item.id)}
                          className="flex-1 bg-red-900/40 border border-red-500/40 text-red-400 rounded-xl py-2 text-sm font-mono active:scale-95"
                        >
                          DELETE
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="flex-1 btn-ghost py-2 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-dark-400 text-[10px] font-mono uppercase">Stock</p>
                          <p className={`text-sm font-mono font-bold ${
                            status === 'low_stock' ? 'text-amber-400' :
                            status === 'out_of_stock' ? 'text-red-400' :
                            'text-white'
                          }`}>
                            {(item.quantity || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-dark-400 text-[10px] font-mono uppercase">MRP</p>
                          <p className="text-white text-sm font-mono">{formatCurrency(item.unit_price)}</p>
                        </div>
                        <div>
                          <p className="text-dark-400 text-[10px] font-mono uppercase">Value</p>
                          <p className="text-gold-500 text-sm font-mono font-bold">
                            {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="w-8 h-8 rounded-lg bg-dark-700 border border-dark-600 flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-dark-300" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item.id)}
                          className="w-8 h-8 rounded-lg bg-red-950/30 border border-red-900/30 flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkInventoryImport
          suppliers={suppliers}
          onClose={() => setShowBulkImport(false)}
          onImport={onBulkImport}
        />
      )}
    </div>
  )
}

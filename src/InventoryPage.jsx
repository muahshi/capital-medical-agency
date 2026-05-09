import { useState, useMemo } from 'react'
import { Search, Filter, Plus, Trash2, Edit2, X, Check, ChevronDown, SortAsc } from 'lucide-react'
import {
  getStockStatus, getStatusClass, getStatusLabel,
  formatExpiry, formatCurrency, getDaysToExpiry,
  getExpiringItems, getLowStockItems
} from '../lib/stockUtils'
import toast from 'react-hot-toast'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'low', label: 'Low Stock' },
  { id: 'expiring', label: 'Expiring' },
  { id: 'expired', label: 'Expired' },
]

export default function InventoryPage({ items, onUpdate, onDelete, initialFilter }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(initialFilter || 'all')
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(() => {
    let list = [...items]

    // Apply status filter
    if (filter === 'low') list = getLowStockItems(list)
    else if (filter === 'expiring') list = getExpiringItems(list, 90)
    else if (filter === 'expired') list = list.filter(i => getStockStatus(i) === 'expired')

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
  }, [items, filter, search])

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-dark-400 text-xs font-mono tracking-widest uppercase">Real-time</p>
        <h1 className="font-display text-3xl text-white tracking-widest">INVENTORY</h1>
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
        </div>
      </div>

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
    </div>
  )
}

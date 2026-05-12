// ─── src/components/InventoryPage.jsx — Full ERP v3.0 ────────────────────────
import { useState, useMemo, useRef } from 'react'
import {
  Search, Filter, X, ChevronLeft, Edit2, Trash2, Save,
  Package, AlertTriangle, Clock, CheckCircle, ChevronDown,
  Plus, Download, SortAsc, SortDesc, BarChart2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getStockStatus, getStatusClass, getStatusLabel, formatExpiry, getDaysToExpiry, formatCurrency } from '../lib/stockUtils'

const FILTER_OPTS = [
  { id: 'all',      label: 'All Stock',    icon: <Package size={12} /> },
  { id: 'low',      label: 'Low Stock',    icon: <AlertTriangle size={12} /> },
  { id: 'expiring', label: 'Expiring',     icon: <Clock size={12} /> },
  { id: 'expired',  label: 'Expired',      icon: <X size={12} /> },
  { id: 'ok',       label: 'Healthy',      icon: <CheckCircle size={12} /> },
]

const SORT_OPTS = [
  { id: 'name_asc',    label: 'Name A→Z'     },
  { id: 'name_desc',   label: 'Name Z→A'     },
  { id: 'qty_asc',     label: 'Qty Low→High' },
  { id: 'qty_desc',    label: 'Qty High→Low' },
  { id: 'expiry_asc',  label: 'Expiry Soon'  },
  { id: 'added_desc',  label: 'Recently Added'},
]

function applyFilter(items, filter) {
  switch (filter) {
    case 'low':      return items.filter(i => { const s = getStockStatus(i); return s === 'low' || s === 'critical' })
    case 'expiring': return items.filter(i => { const d = getDaysToExpiry(i.expiry_date); return d !== null && d >= 0 && d <= 90 })
    case 'expired':  return items.filter(i => { const d = getDaysToExpiry(i.expiry_date); return d !== null && d < 0 })
    case 'ok':       return items.filter(i => getStockStatus(i) === 'ok')
    default:         return items
  }
}

function applySort(items, sort) {
  const arr = [...items]
  switch (sort) {
    case 'name_asc':   return arr.sort((a,b) => a.medicine_name.localeCompare(b.medicine_name))
    case 'name_desc':  return arr.sort((a,b) => b.medicine_name.localeCompare(a.medicine_name))
    case 'qty_asc':    return arr.sort((a,b) => a.quantity - b.quantity)
    case 'qty_desc':   return arr.sort((a,b) => b.quantity - a.quantity)
    case 'expiry_asc': return arr.sort((a,b) => {
      const da = getDaysToExpiry(a.expiry_date) ?? 9999
      const db = getDaysToExpiry(b.expiry_date) ?? 9999
      return da - db
    })
    case 'added_desc': return arr.sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0))
    default:           return arr
  }
}

export default function InventoryPage({ items, onUpdate, onDelete, initialFilter = 'all', onBack }) {
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState(initialFilter)
  const [sort,        setSort]        = useState('added_desc')
  const [showSort,    setShowSort]    = useState(false)
  const [editId,      setEditId]      = useState(null)
  const [editData,    setEditData]    = useState({})
  const [saving,      setSaving]      = useState(false)
  const [deleteConf,  setDeleteConf]  = useState(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [addData,     setAddData]     = useState({ medicine_name:'', batch_no:'', expiry_date:'', quantity:'', unit_price:'', gst_percent:'12', supplier:'', low_stock_threshold:'50' })

  const processed = useMemo(() => {
    let res = applyFilter(items, filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      res = res.filter(i =>
        i.medicine_name?.toLowerCase().includes(q) ||
        i.batch_no?.toLowerCase().includes(q) ||
        i.supplier?.toLowerCase().includes(q)
      )
    }
    return applySort(res, sort)
  }, [items, filter, search, sort])

  const stats = useMemo(() => ({
    total:    items.length,
    low:      items.filter(i => { const s = getStockStatus(i); return s==='low'||s==='critical' }).length,
    expiring: items.filter(i => { const d = getDaysToExpiry(i.expiry_date); return d!==null && d>=0 && d<=90 }).length,
    expired:  items.filter(i => { const d = getDaysToExpiry(i.expiry_date); return d!==null && d<0 }).length,
    value:    items.reduce((s,i) => s + i.quantity*(i.unit_price||0), 0),
  }), [items])

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const startEdit = (item) => {
    setEditId(item.id)
    setEditData({
      medicine_name:       item.medicine_name,
      batch_no:            item.batch_no || '',
      expiry_date:         item.expiry_date || '',
      quantity:            item.quantity,
      unit_price:          item.unit_price || 0,
      gst_percent:         item.gst_percent || 12,
      supplier:            item.supplier || '',
      low_stock_threshold: item.low_stock_threshold || 50,
    })
  }

  const saveEdit = async () => {
    setSaving(true)
    const updates = {
      ...editData,
      quantity:            parseInt(editData.quantity)            || 0,
      unit_price:          parseFloat(editData.unit_price)        || 0,
      gst_percent:         parseFloat(editData.gst_percent)       || 12,
      low_stock_threshold: parseInt(editData.low_stock_threshold) || 50,
    }
    const { error } = await onUpdate(editId, updates)
    setSaving(false)
    if (error) { toast.error('Save nahi hua'); return }
    toast.success('Item update ho gaya ✓')
    setEditId(null)
  }

  const confirmDelete = async () => {
    const { error } = await onDelete(deleteConf.id)
    if (error) { toast.error('Delete nahi hua'); return }
    toast.success(`${deleteConf.medicine_name} delete ho gaya`)
    setDeleteConf(null)
  }

  // ── Add Item ──────────────────────────────────────────────────────────────
  const handleAddItem = async () => {
    if (!addData.medicine_name.trim()) { toast.error('Medicine name required'); return }
    const item = {
      id:                  `${Date.now()}-manual`,
      medicine_name:       addData.medicine_name.trim(),
      batch_no:            addData.batch_no || null,
      expiry_date:         addData.expiry_date || null,
      quantity:            parseInt(addData.quantity) || 0,
      unit_price:          parseFloat(addData.unit_price) || 0,
      gst_percent:         parseFloat(addData.gst_percent) || 12,
      supplier:            addData.supplier || null,
      low_stock_threshold: parseInt(addData.low_stock_threshold) || 50,
      source:              'manual',
      created_at:          new Date().toISOString(),
    }
    // Use parent addItems via onUpdate flow — we add via a dummy addItems
    // Instead write directly to store
    await onUpdate(item.id, item)   // Will be handled as add in hook
    toast.success('Item add ho gaya ✓')
    setShowAdd(false)
    setAddData({ medicine_name:'', batch_no:'', expiry_date:'', quantity:'', unit_price:'', gst_percent:'12', supplier:'', low_stock_threshold:'50' })
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Medicine Name','Batch No','Expiry','Qty','MRP','GST%','Supplier','Status']
    const rows = processed.map(i => [
      i.medicine_name, i.batch_no||'', i.expiry_date||'', i.quantity,
      i.unit_price||0, i.gst_percent||'', i.supplier||'',
      getStatusLabel(getStockStatus(i))
    ])
    const csv = [headers,...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }))
    a.download = `cma-inventory-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    toast.success('CSV exported!')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <div className="flex-1">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Inventory</p>
          <h1 className="text-white text-xl font-bold tracking-wide">STOCK LIST</h1>
        </div>
        <button onClick={exportCSV} className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
          <Download size={16} className="text-gray-400" />
        </button>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-500/25 rounded-xl px-3 py-2">
          <Plus size={14} className="text-yellow-500" />
          <span className="text-yellow-500 text-xs font-bold">Add</span>
        </button>
      </div>

      {/* Stats strip */}
      <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
        {[
          { label:'Total',    val: stats.total,    color:'text-white'      },
          { label:'Low',      val: stats.low,      color:'text-amber-400'  },
          { label:'Expiring', val: stats.expiring, color:'text-orange-400' },
          { label:'Expired',  val: stats.expired,  color:'text-red-400'    },
        ].map(s => (
          <div key={s.label} className="shrink-0 bg-white/3 border border-white/5 rounded-xl px-3 py-1.5 text-center">
            <p className={`${s.color} font-bold text-base leading-tight`}>{s.val}</p>
            <p className="text-gray-600 text-[9px] font-mono">{s.label}</p>
          </div>
        ))}
        <div className="shrink-0 bg-white/3 border border-white/5 rounded-xl px-3 py-1.5 text-center">
          <p className="text-yellow-500 font-bold text-base leading-tight">{formatCurrency(stats.value)}</p>
          <p className="text-gray-600 text-[9px] font-mono">Value</p>
        </div>
      </div>

      {/* Search + sort */}
      <div className="px-4 pb-2 flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3 py-2.5">
          <Search size={14} className="text-gray-600 shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-gray-700"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Medicine ya batch search karo..."
          />
          {search && <button onClick={() => setSearch('')}><X size={12} className="text-gray-600" /></button>}
        </div>
        <div className="relative">
          <button onClick={() => setShowSort(!showSort)}
            className="h-full px-3 bg-white/4 border border-white/8 rounded-xl flex items-center gap-1.5">
            <SortAsc size={14} className="text-gray-400" />
            <ChevronDown size={12} className="text-gray-600" />
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-30 shadow-xl">
              {SORT_OPTS.map(s => (
                <button key={s.id} onClick={() => { setSort(s.id); setShowSort(false) }}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${sort===s.id ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-400 hover:bg-white/5'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
        {FILTER_OPTS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold whitespace-nowrap shrink-0 transition-all ${
              filter===f.id
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-white/3 text-gray-500 border border-white/5'
            }`}>
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2">
        {processed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package size={40} className="text-gray-700" />
            <p className="text-gray-500 text-sm">
              {search ? `"${search}" nahi mila` : 'Koi item nahi is filter mein'}
            </p>
          </div>
        ) : (
          processed.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              isEditing={editId === item.id}
              editData={editData}
              saving={saving}
              onEdit={startEdit}
              onSave={saveEdit}
              onCancel={() => setEditId(null)}
              onEditChange={(k, v) => setEditData(p => ({ ...p, [k]: v }))}
              onDelete={() => setDeleteConf(item)}
            />
          ))
        )}
      </div>

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end p-3" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-sm mx-auto bg-[#0d0d0d] border border-white/10 rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
              <p className="text-white font-bold">Add New Item</p>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
              <AddField label="Medicine Name *"      value={addData.medicine_name}       onChange={v => setAddData(p=>({...p,medicine_name:v}))}       placeholder="e.g. Paracetamol 500mg" />
              <AddField label="Batch No"             value={addData.batch_no}            onChange={v => setAddData(p=>({...p,batch_no:v}))}            placeholder="e.g. BT2401" />
              <AddField label="Expiry Date"          value={addData.expiry_date}         onChange={v => setAddData(p=>({...p,expiry_date:v}))}         type="date" />
              <AddField label="Quantity"             value={addData.quantity}            onChange={v => setAddData(p=>({...p,quantity:v}))}            placeholder="0" type="number" />
              <AddField label="MRP / Unit Price (₹)" value={addData.unit_price}          onChange={v => setAddData(p=>({...p,unit_price:v}))}          placeholder="0.00" type="number" />
              <AddField label="GST %"                value={addData.gst_percent}         onChange={v => setAddData(p=>({...p,gst_percent:v}))}         placeholder="12" type="number" />
              <AddField label="Supplier"             value={addData.supplier}            onChange={v => setAddData(p=>({...p,supplier:v}))}            placeholder="e.g. Cipla" />
              <AddField label="Min Stock (Reorder)" value={addData.low_stock_threshold} onChange={v => setAddData(p=>({...p,low_stock_threshold:v}))} placeholder="50" type="number" />
            </div>
            <div className="px-5 pb-5 pt-2">
              <button onClick={handleAddItem} className="w-full bg-yellow-500 text-black font-bold py-3.5 rounded-2xl active:scale-95 transition-all">
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConf && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConf(null)}>
          <div className="w-full max-w-xs bg-[#0d0d0d] border border-red-500/20 rounded-3xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <p className="text-white font-bold mb-1">Delete Item?</p>
            <p className="text-gray-500 text-sm mb-5">"{deleteConf.medicine_name}" permanently delete ho jayega.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConf(null)} className="flex-1 bg-white/5 border border-white/10 text-gray-400 py-3 rounded-2xl text-sm">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-2xl text-sm active:scale-95">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Item Card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, isEditing, editData, saving, onEdit, onSave, onCancel, onEditChange, onDelete }) {
  const status  = getStockStatus(item)
  const days    = getDaysToExpiry(item.expiry_date)
  const isExpired = days !== null && days < 0
  const isUrgent  = days !== null && days >= 0 && days <= 30

  if (isEditing) {
    return (
      <div className="bg-[#0d0d0d] border border-yellow-500/30 rounded-2xl p-4 space-y-3">
        <p className="text-yellow-500 text-[10px] font-mono uppercase tracking-widest">Editing</p>
        <EditField label="Medicine Name" value={editData.medicine_name}       onChange={v => onEditChange('medicine_name', v)} />
        <div className="grid grid-cols-2 gap-2">
          <EditField label="Batch No"   value={editData.batch_no}    onChange={v => onEditChange('batch_no', v)} />
          <EditField label="Expiry"     value={editData.expiry_date} onChange={v => onEditChange('expiry_date', v)} type="date" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <EditField label="Qty"     value={editData.quantity}   onChange={v => onEditChange('quantity', v)}   type="number" />
          <EditField label="MRP (₹)" value={editData.unit_price} onChange={v => onEditChange('unit_price', v)} type="number" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <EditField label="GST %" value={editData.gst_percent}         onChange={v => onEditChange('gst_percent', v)}         type="number" />
          <EditField label="Min"   value={editData.low_stock_threshold} onChange={v => onEditChange('low_stock_threshold', v)} type="number" />
        </div>
        <EditField label="Supplier" value={editData.supplier} onChange={v => onEditChange('supplier', v)} />
        <div className="flex gap-2 pt-1">
          <button onClick={onSave} disabled={saving}
            className="flex-1 bg-yellow-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
            {saving ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /></> : <><Save size={16} /> Save</>}
          </button>
          <button onClick={onCancel} className="flex-1 bg-white/5 border border-white/10 text-gray-400 py-3 rounded-xl text-sm">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-[#0d0d0d] rounded-2xl p-4 border transition-all ${
      isExpired ? 'border-red-500/20' : isUrgent ? 'border-orange-500/15' : 'border-white/5'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight truncate">{item.medicine_name}</p>
          <p className="text-gray-600 text-[11px] font-mono mt-0.5">
            {item.batch_no || '—'} · {formatExpiry(item.expiry_date)}
            {days !== null && (
              <span className={`ml-1.5 font-bold ${isExpired ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-gray-500'}`}>
                {isExpired ? `${Math.abs(days)}d ago` : `${days}d left`}
              </span>
            )}
          </p>
          {item.supplier && <p className="text-gray-700 text-[10px] mt-0.5">{item.supplier}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-white font-bold font-mono text-sm">{item.quantity}</p>
            {item.unit_price > 0 && <p className="text-gray-600 text-[10px]">₹{item.unit_price}</p>}
          </div>
          <span className={getStatusClass(status)}>{getStatusLabel(status)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        {item.gst_percent && (
          <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-0.5 rounded-lg">GST {item.gst_percent}%</span>
        )}
        <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-0.5 rounded-lg">
          ₹{((item.quantity||0) * (item.unit_price||0)).toLocaleString('en-IN')} value
        </span>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => onEdit(item)} className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center active:scale-95">
            <Edit2 size={13} className="text-gray-400" />
          </button>
          <button onClick={onDelete} className="w-8 h-8 rounded-xl bg-red-500/8 border border-red-500/15 flex items-center justify-center active:scale-95">
            <Trash2 size={13} className="text-red-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

function EditField({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest mb-1">{label}</p>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-yellow-500/50"
      />
    </div>
  )
}

function AddField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest mb-1">{label}</p>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-yellow-500/40 placeholder:text-gray-700"
      />
    </div>
  )
}

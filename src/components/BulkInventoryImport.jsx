// ─── src/components/BulkInventoryImport.jsx ──────────────────────────────────
import React, { useState } from 'react'
import { X, Upload, Plus, Trash2, FileText, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BulkInventoryImport({ onClose, onImport, suppliers = [] }) {
  const [entries, setEntries] = useState([
    { medicine_name: '', batch_no: '', expiry_date: '', quantity: '', unit_price: '', category: 'General', supplier_id: '' }
  ])
  const [importing, setImporting] = useState(false)

  const categories = ['Antibiotic', 'Painkiller', 'Vitamin', 'Syrup', 'Injection', 'General']

  const addEntry = () => {
    setEntries([...entries, { medicine_name: '', batch_no: '', expiry_date: '', quantity: '', unit_price: '', category: 'General', supplier_id: '' }])
  }

  const removeEntry = (index) => {
    if (entries.length === 1) {
      toast.error('Kam se kam 1 entry chahiye!')
      return
    }
    setEntries(entries.filter((_, i) => i !== index))
  }

  const updateEntry = (index, field, value) => {
    const updated = [...entries]
    updated[index][field] = value
    setEntries(updated)
  }

  const handleImport = async () => {
    // Validation
    const valid = entries.filter(e => 
      e.medicine_name.trim() && 
      e.batch_no.trim() && 
      e.quantity && 
      parseInt(e.quantity) > 0
    )

    if (valid.length === 0) {
      toast.error('Kam se kam 1 valid entry fill karo (Medicine, Batch, Quantity required hai)')
      return
    }

    setImporting(true)
    try {
      // Convert to proper format
      const formatted = valid.map(e => ({
        medicine_name: e.medicine_name.trim(),
        batch_no: e.batch_no.trim(),
        expiry_date: e.expiry_date || null,
        quantity: parseInt(e.quantity),
        unit_price: parseFloat(e.unit_price) || 0,
        category: e.category || 'General',
        supplier_id: e.supplier_id || null,
        source: 'bulk_import'
      }))

      await onImport(formatted)
      toast.success(`✅ ${formatted.length} items successfully imported!`)
      onClose()
    } catch (err) {
      console.error('Bulk import error:', err)
      toast.error('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csv = 'Medicine Name,Batch No,Expiry Date (YYYY-MM-DD),Quantity,Unit Price,Category,Supplier\n' +
      'Paracetamol 650mg,PAR123,2026-12-31,1000,2.50,Painkiller,\n' +
      'Amoxicillin 500mg,AMX456,2025-08-15,500,8.75,Antibiotic,'
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk_inventory_template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded!')
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-yellow-500/20 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-yellow-500/10">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-yellow-500">Bulk Inventory Import</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadTemplate}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-xs text-blue-400 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Template
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {entries.map((entry, idx) => (
              <div key={idx} className="bg-[#141414] border border-yellow-500/10 rounded-lg p-3">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-mono text-gray-500">Entry #{idx + 1}</span>
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeEntry(idx)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Medicine Name */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Medicine Name *</label>
                    <input
                      type="text"
                      value={entry.medicine_name}
                      onChange={(e) => updateEntry(idx, 'medicine_name', e.target.value)}
                      placeholder="e.g., Paracetamol 650mg"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                    />
                  </div>

                  {/* Batch No */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Batch No *</label>
                    <input
                      type="text"
                      value={entry.batch_no}
                      onChange={(e) => updateEntry(idx, 'batch_no', e.target.value)}
                      placeholder="e.g., PAR123"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={entry.expiry_date}
                      onChange={(e) => updateEntry(idx, 'expiry_date', e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-yellow-500/20 rounded text-sm text-white focus:border-yellow-500/50 focus:outline-none"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Quantity *</label>
                    <input
                      type="number"
                      value={entry.quantity}
                      onChange={(e) => updateEntry(idx, 'quantity', e.target.value)}
                      placeholder="e.g., 1000"
                      min="1"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Unit Price (₹)</label>
                    <input
                      type="number"
                      value={entry.unit_price}
                      onChange={(e) => updateEntry(idx, 'unit_price', e.target.value)}
                      placeholder="e.g., 2.50"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Category</label>
                    <select
                      value={entry.category}
                      onChange={(e) => updateEntry(idx, 'category', e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-yellow-500/20 rounded text-sm text-white focus:border-yellow-500/50 focus:outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier (spans 3 cols on desktop) */}
                  <div className="md:col-span-3">
                    <label className="block text-xs text-gray-400 mb-1">Supplier (Optional)</label>
                    <select
                      value={entry.supplier_id}
                      onChange={(e) => updateEntry(idx, 'supplier_id', e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-yellow-500/20 rounded text-sm text-white focus:border-yellow-500/50 focus:outline-none"
                    >
                      <option value="">-- None --</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>{sup.supplier_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Entry Button */}
          <button
            onClick={addEntry}
            className="mt-4 w-full py-3 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-yellow-500 font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Another Entry
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-yellow-500/10 bg-[#0A0A0A]/50">
          <p className="text-xs text-gray-500">
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} • * = Required fields
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium text-black transition-all flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {entries.length} {entries.length === 1 ? 'Item' : 'Items'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

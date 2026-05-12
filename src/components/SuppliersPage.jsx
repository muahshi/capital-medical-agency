// ─── src/components/SuppliersPage.jsx ────────────────────────────────────────
import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, FileText, DollarSign, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function SuppliersPage({ onBack }) {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('retailer_id', user.id)
        .order('supplier_name', { ascending: true })

      if (error) throw error
      setSuppliers(data || [])
    } catch (err) {
      console.error('Load suppliers error:', err)
      toast.error('Suppliers load nahi ho paye')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEdit = (supplier = null) => {
    setEditingSupplier(supplier)
    setShowAddModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supplier ko delete karna chahte ho? Stock items se link hat jayega.')) return

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Supplier deleted!')
      loadSuppliers()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Delete failed: ' + err.message)
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_person || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-yellow-500/10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-yellow-500 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Suppliers
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{suppliers.length} total suppliers</p>
          </div>
        </div>
        <button
          onClick={() => handleAddEdit(null)}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-sm font-medium text-black flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-yellow-500/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or contact person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-yellow-500/20 rounded-lg text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 animate-spin rounded-full" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No suppliers found matching your search' : 'No suppliers added yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => handleAddEdit(null)}
                className="mt-4 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded text-sm text-yellow-500 transition-all"
              >
                Add Your First Supplier
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map(supplier => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onEdit={() => handleAddEdit(supplier)}
                onDelete={() => handleDelete(supplier.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setShowAddModal(false)
            setEditingSupplier(null)
          }}
          onSave={() => {
            setShowAddModal(false)
            setEditingSupplier(null)
            loadSuppliers()
          }}
        />
      )}
    </div>
  )
}

// ── Supplier Card ────────────────────────────────────────────────────────────
function SupplierCard({ supplier, onEdit, onDelete }) {
  const outstandingColor = supplier.outstanding_balance > 0 ? 'text-red-400' : 'text-green-400'

  return (
    <div className="bg-[#0A0A0A] border border-yellow-500/20 rounded-lg p-4 hover:border-yellow-500/40 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{supplier.supplier_name}</h3>
          {supplier.contact_person && (
            <p className="text-xs text-gray-500 mt-0.5">{supplier.contact_person}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-yellow-500/10 rounded transition-colors text-yellow-500"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-500/10 rounded transition-colors text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-2 mb-3">
        {supplier.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Phone className="w-3.5 h-3.5 text-gray-600" />
            <span>{supplier.phone}</span>
          </div>
        )}
        {supplier.email && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Mail className="w-3.5 h-3.5 text-gray-600" />
            <span className="truncate">{supplier.email}</span>
          </div>
        )}
        {supplier.address && (
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5 text-gray-600 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{supplier.address}</span>
          </div>
        )}
      </div>

      {/* Outstanding Balance */}
      <div className="pt-3 border-t border-yellow-500/10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Outstanding</span>
          <span className={`text-sm font-bold ${outstandingColor}`}>
            ₹{supplier.outstanding_balance?.toLocaleString('en-IN') || '0'}
          </span>
        </div>
      </div>

      {/* Notes Preview */}
      {supplier.notes && (
        <div className="mt-2 pt-2 border-t border-yellow-500/10">
          <p className="text-xs text-gray-500 line-clamp-2">{supplier.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Supplier Modal ───────────────────────────────────────────────────────────
function SupplierModal({ supplier, onClose, onSave }) {
  const [formData, setFormData] = useState({
    supplier_name: supplier?.supplier_name || '',
    contact_person: supplier?.contact_person || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    gst_number: supplier?.gst_number || '',
    outstanding_balance: supplier?.outstanding_balance || 0,
    notes: supplier?.notes || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.supplier_name.trim()) {
      toast.error('Supplier name required hai!')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        retailer_id: user.id,
        ...formData,
        outstanding_balance: parseFloat(formData.outstanding_balance) || 0,
        updated_at: new Date().toISOString()
      }

      let error
      if (supplier) {
        // Update
        ({ error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', supplier.id))
      } else {
        // Insert
        ({ error } = await supabase
          .from('suppliers')
          .insert([payload]))
      }

      if (error) throw error
      toast.success(supplier ? 'Supplier updated!' : 'Supplier added!')
      onSave()
    } catch (err) {
      console.error('Save supplier error:', err)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-yellow-500/20 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-yellow-500/10 sticky top-0 bg-[#0A0A0A] z-10">
            <h2 className="text-lg font-bold text-yellow-500">
              {supplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>

          {/* Form Fields */}
          <div className="p-4 space-y-4">
            {/* Supplier Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Supplier Name *</label>
              <input
                type="text"
                required
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                placeholder="e.g., ABC Pharmaceuticals"
                className="w-full px-3 py-2.5 bg-[#141414] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
              />
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="e.g., Rajesh Kumar"
                className="w-full px-3 py-2.5 bg-[#141414] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., 9876543210"
                  className="w-full px-3 py-2.5 bg-[#141414] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g., contact@abc.com"
                  className="w-full px-3 py-2.5 bg-[#141414] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Complete address..."
                rows={2}
                className="w-full px-3 py-2.5 bg-[#141414] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none resize-none"
              />
            </div>

            {/* GST & Outstanding */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">GST Number</label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  placeholder="e.g., 22XXXXX1234X1Z5"
                  className="w-full px-3 py-2.5 bg-[#141414] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Outstanding Balance (₹)</label>
                <input
                  type="number"
                  value={formData.outstanding_balance}
                  onChange={(e) => setFormData({ ...formData, outstanding_balance: e.target.value })}
                  placeholder="0"
                  step="0.01"
                  className="w-full px-3 py-2.5 bg-[#141414] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-3 py-2.5 bg-[#141414] border border-yellow-500/20 rounded text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-yellow-500/10 bg-[#0A0A0A] sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium text-black transition-all"
            >
              {saving ? 'Saving...' : supplier ? 'Update' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

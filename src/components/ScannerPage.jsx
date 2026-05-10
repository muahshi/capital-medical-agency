import { useState, useRef, useCallback } from 'react'
import {
  Camera, Upload, X, Check, AlertCircle, Zap,
  RotateCcw, ChevronLeft, Plus, Trash2, Edit3, ImagePlus
} from 'lucide-react'
import { scanBillWithGroq, fileToBase64, getDemoScanResult } from '../lib/groq'
import { formatExpiry } from '../lib/stockUtils'
import toast from 'react-hot-toast'

const DEMO_MODE = !import.meta.env.VITE_GROQ_API_KEY

const STAGES = {
  IDLE: 'idle',
  PREVIEW: 'preview',
  SCANNING: 'scanning',
  REVIEW: 'review',      // Draft table — confirm karo pehle
  SAVING: 'saving',
  DONE: 'done',
}

export default function ScannerPage({ onItemsAdded, onBack }) {
  const [stage, setStage] = useState(STAGES.IDLE)
  const [imageFiles, setImageFiles] = useState([])       // Multi-image support
  const [imagePreviews, setImagePreviews] = useState([]) // Preview URLs
  const [reviewItems, setReviewItems] = useState([])     // Editable draft table
  const [error, setError] = useState(null)
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 })

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  // ── Image select (multi) ──
  const handleImagesSelect = useCallback((files) => {
    if (!files || files.length === 0) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (newFiles.length === 0) { toast.error('Valid image files select karo'); return }

    setImageFiles(prev => {
      // Revoke old
      prev.forEach(f => {})
      return [...prev, ...newFiles].slice(0, 5) // Max 5 images
    })
    setImagePreviews(prev => {
      const newUrls = newFiles.map(f => URL.createObjectURL(f))
      return [...prev, ...newUrls].slice(0, 5)
    })
    setError(null)
    setStage(STAGES.PREVIEW)
  }, [])

  const removeImage = useCallback((idx) => {
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    if (imageFiles.length <= 1) setStage(STAGES.IDLE)
  }, [imageFiles.length])

  // ── Scan all images ──
  const handleScan = useCallback(async () => {
    setStage(STAGES.SCANNING)
    setError(null)
    setScanProgress({ current: 0, total: DEMO_MODE ? 1 : imageFiles.length })

    try {
      let allResults = []

      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 2200))
        allResults = getDemoScanResult()
        setScanProgress({ current: 1, total: 1 })
      } else {
        // Har image scan karo aur results merge karo
        for (let i = 0; i < imageFiles.length; i++) {
          setScanProgress({ current: i + 1, total: imageFiles.length })
          const base64 = await fileToBase64(imageFiles[i])
          const results = await scanBillWithGroq(base64, imageFiles[i].type || 'image/jpeg')
          allResults = [...allResults, ...results]
        }
      }

      if (!allResults.length) throw new Error('Koi medicine detect nahi hui. Clearer photo try karo.')

      // Duplicate merge (same name+batch) before showing review
      const merged = mergeDuplicates(allResults)
      setReviewItems(merged.map((item, i) => ({ ...item, _id: i, _selected: true })))
      setStage(STAGES.REVIEW)
    } catch (err) {
      const msg = err.message || 'Scan fail hua. Dobara try karo.'
      setError(msg)
      setStage(STAGES.PREVIEW)
      toast.error(msg)
    }
  }, [imageFiles])

  // ── Review table: inline edit ──
  const updateReviewItem = useCallback((idx, field, value) => {
    setReviewItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    ))
  }, [])

  const toggleReviewItem = useCallback((idx) => {
    setReviewItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, _selected: !item._selected } : item
    ))
  }, [])

  const removeReviewItem = useCallback((idx) => {
    setReviewItems(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // ── Confirm & Save ──
  const handleConfirm = useCallback(async () => {
    const toSave = reviewItems.filter(item => item._selected)
    if (!toSave.length) { toast.error('Kam se kam ek item select karo'); return }
    setStage(STAGES.SAVING)
    try {
      const result = await onItemsAdded(toSave.map(({ _id, _selected, ...item }) => item))
      setStage(STAGES.DONE)
      const added = result?.added || toSave.length
      const updated = result?.updated || 0
      const msg = updated > 0
        ? `✅ ${added} naye, ${updated} quantity update!`
        : `✅ ${added} items inventory mein add!`
      toast.success(msg, { duration: 4000 })
    } catch {
      toast.error('Save fail hua')
      setStage(STAGES.REVIEW)
    }
  }, [reviewItems, onItemsAdded])

  const reset = useCallback(() => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url))
    setImageFiles([])
    setImagePreviews([])
    setReviewItems([])
    setError(null)
    setScanProgress({ current: 0, total: 0 })
    setStage(STAGES.IDLE)
  }, [imagePreviews])

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">AI Powered</p>
            <h1 className="text-2xl font-bold text-white tracking-widest">SCAN BILL</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {DEMO_MODE && (
            <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg px-2 py-1">
              <p className="text-amber-400 text-[10px] font-mono">DEMO</p>
            </div>
          )}
          {stage !== STAGES.IDLE && (
            <button onClick={reset} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {stage === STAGES.IDLE && (
          <IdleState
            onCamera={() => cameraInputRef.current?.click()}
            onUpload={() => fileInputRef.current?.click()}
            demoMode={DEMO_MODE}
          />
        )}
        {stage === STAGES.PREVIEW && (
          <PreviewState
            previews={imagePreviews}
            onRemove={removeImage}
            onAddMore={() => fileInputRef.current?.click()}
            onScan={handleScan}
            onRetake={reset}
            error={error}
            demoMode={DEMO_MODE}
          />
        )}
        {stage === STAGES.SCANNING && (
          <ScanningState progress={scanProgress} />
        )}
        {stage === STAGES.REVIEW && (
          <ReviewTable
            items={reviewItems}
            onUpdate={updateReviewItem}
            onToggle={toggleReviewItem}
            onRemove={removeReviewItem}
            onConfirm={handleConfirm}
            onRetry={reset}
          />
        )}
        {stage === STAGES.SAVING && (
          <SavingState count={reviewItems.filter(i => i._selected).length} />
        )}
        {stage === STAGES.DONE && (
          <DoneState count={reviewItems.filter(i => i._selected).length} onScanMore={reset} onBack={onBack} />
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { if (e.target.files) handleImagesSelect(e.target.files); e.target.value = '' }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { if (e.target.files) handleImagesSelect(e.target.files); e.target.value = '' }} />
    </div>
  )
}

// ── Helper: merge duplicates from multi-image scan ──
function mergeDuplicates(items) {
  const map = new Map()
  items.forEach(item => {
    const key = `${item.medicine_name?.toLowerCase()?.trim()}__${item.batch_no?.toLowerCase()?.trim() || ''}`
    if (map.has(key)) {
      map.get(key).qty = (map.get(key).qty || 0) + (item.qty || 0)
    } else {
      map.set(key, { ...item })
    }
  })
  return Array.from(map.values())
}

// ── Sub-components ──

function IdleState({ onCamera, onUpload, demoMode }) {
  return (
    <div className="space-y-4 pt-2">
      <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden flex items-center justify-center bg-[#0a0a1a] border border-yellow-500/20">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-yellow-500/20 flex items-center justify-center">
            <Camera className="w-10 h-10 text-yellow-500/60" />
          </div>
          <p className="text-white/60 text-sm">Bill / Invoice frame ke andar rakho</p>
          <p className="text-yellow-500/50 text-xs font-mono">MULTI-PAGE SUPPORT · MAX 5 IMAGES</p>
        </div>
        <div className="absolute top-4 right-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-1 flex items-center gap-1">
          <Zap className="w-3 h-3 text-yellow-500" />
          <span className="text-yellow-500 text-[10px] font-mono">AI</span>
        </div>
      </div>

      <button onClick={onCamera} className="w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 transition-all text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3">
        <Camera className="w-5 h-5" /> CAMERA SE CAPTURE KARO
      </button>
      <button onClick={onUpload} className="w-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 border border-white/10">
        <Upload className="w-5 h-5" /> GALLERY SE UPLOAD (MULTI)
      </button>

      {demoMode && (
        <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3">
          <p className="text-amber-400 text-xs font-mono text-center">⚠️ Demo Mode: VITE_GROQ_API_KEY add karo real OCR ke liye</p>
        </div>
      )}
    </div>
  )
}

function PreviewState({ previews, onRemove, onAddMore, onScan, onRetake, error, demoMode }) {
  return (
    <div className="space-y-4 pt-2">
      {/* Image grid */}
      <div className="grid grid-cols-2 gap-2">
        {previews.map((url, i) => (
          <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#0d0d0d] border border-white/10">
            <img src={url} alt={`Bill ${i + 1}`} className="w-full h-full object-cover"
              onError={e => { e.target.style.display = 'none' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            <button onClick={() => onRemove(i)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center active:scale-95">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            <div className="absolute bottom-2 left-2 bg-black/60 rounded px-1.5 py-0.5">
              <p className="text-white text-[9px] font-mono">PAGE {i + 1}</p>
            </div>
          </div>
        ))}

        {/* Add more button */}
        {previews.length < 5 && (
          <button onClick={onAddMore}
            className="aspect-[4/3] rounded-xl border border-dashed border-yellow-500/30 bg-yellow-500/5 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
            <ImagePlus className="w-6 h-6 text-yellow-500/60" />
            <span className="text-yellow-500/60 text-xs font-mono">ADD PAGE</span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-xs font-mono">{previews.length}/5 images selected</p>
        {demoMode && <p className="text-amber-400 text-xs font-mono">DEMO MODE</p>}
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button onClick={onScan} className="w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 transition-all text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3">
        <Zap className="w-5 h-5" />
        {demoMode ? 'DEMO SCAN CHALAO' : `${previews.length} IMAGE${previews.length > 1 ? 'S' : ''} SCAN KARO`}
      </button>
      <button onClick={onRetake} className="w-full bg-white/5 hover:bg-white/10 active:scale-95 text-white py-3 rounded-2xl flex items-center justify-center gap-2 border border-white/10">
        <RotateCcw className="w-4 h-4" /> Reset / Naya lelo
      </button>
    </div>
  )
}

function ScanningState({ progress }) {
  const pct = progress.total ? Math.round((progress.current / progress.total) * 100) : 0
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <div className="relative w-40 h-40">
        <div className="absolute inset-0 rounded-full border-2 border-yellow-500/30 animate-spin" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-4 rounded-full border border-yellow-500/50 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
        <div className="absolute inset-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <Zap className="w-10 h-10 text-yellow-500 animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-3 w-full max-w-xs">
        <p className="text-2xl font-bold text-yellow-500 tracking-widest">SCANNING...</p>
        {progress.total > 1 && (
          <>
            <p className="text-gray-400 text-sm font-mono">
              Image {progress.current} / {progress.total}
            </p>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className="bg-yellow-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
        <p className="text-gray-600 text-xs font-mono">Groq Vision AI extract kar raha hai...</p>
      </div>
    </div>
  )
}

// ── REVIEW TABLE — Main new feature ──
function ReviewTable({ items, onUpdate, onToggle, onRemove, onConfirm, onRetry }) {
  const selectedCount = items.filter(i => i._selected).length

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-yellow-500 font-mono text-xs tracking-widest">REVIEW & CONFIRM</p>
          <p className="text-white text-lg font-bold">{items.length} items mila</p>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-xl px-3 py-1.5">
          <p className="text-green-400 text-xs font-mono">{selectedCount} selected</p>
        </div>
      </div>

      {/* Hint */}
      <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
        <Edit3 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <p className="text-blue-400 text-xs font-mono">Quantity tap karke edit kar sakte ho</p>
      </div>

      {/* Draft table */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <ReviewRow
            key={item._id}
            item={item}
            onToggle={() => onToggle(i)}
            onUpdate={(field, val) => onUpdate(i, field, val)}
            onRemove={() => onRemove(i)}
          />
        ))}
      </div>

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        disabled={selectedCount === 0}
        className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
      >
        <Check className="w-5 h-5" />
        {selectedCount} ITEMS INVENTORY MEIN DAALO
      </button>
      <button onClick={onRetry} className="w-full bg-white/5 hover:bg-white/10 active:scale-95 text-white py-3 rounded-2xl flex items-center justify-center gap-2 border border-white/10">
        <RotateCcw className="w-4 h-4" /> Dobara scan karo
      </button>
    </div>
  )
}

function ReviewRow({ item, onToggle, onUpdate, onRemove }) {
  const [editingQty, setEditingQty] = useState(false)
  const [editingMrp, setEditingMrp] = useState(false)

  return (
    <div className={`rounded-xl border transition-all ${item._selected ? 'bg-white/5 border-yellow-500/30' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
      {/* Top row: checkbox + name + delete */}
      <div className="flex items-start gap-3 p-3 pb-2">
        <button onClick={onToggle} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${item._selected ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600'}`}>
          {item._selected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
        </button>
        <p className="flex-1 text-white text-sm font-semibold leading-snug">{item.medicine_name}</p>
        <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center text-red-500/60 hover:text-red-400 active:scale-95">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom row: batch, expiry, editable qty & mrp */}
      <div className="flex flex-wrap gap-2 px-3 pb-3 pl-11">
        <span className="text-gray-500 text-[11px] font-mono bg-white/5 px-2 py-0.5 rounded-lg">
          {item.batch_no || 'No Batch'}
        </span>
        <span className="text-gray-500 text-[11px] font-mono bg-white/5 px-2 py-0.5 rounded-lg">
          Exp: {item.expiry_display || formatExpiry(item.expiry_date) || '—'}
        </span>

        {/* Editable Qty */}
        {editingQty ? (
          <input
            autoFocus
            type="number"
            defaultValue={item.qty}
            onBlur={e => { onUpdate('qty', parseInt(e.target.value) || 0); setEditingQty(false) }}
            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
            className="w-20 bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 text-[11px] font-mono px-2 py-0.5 rounded-lg outline-none"
          />
        ) : (
          <button onClick={() => setEditingQty(true)}
            className="text-amber-400 text-[11px] font-mono bg-amber-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-amber-500/20 active:scale-95">
            Qty: {item.qty} <Edit3 className="w-2.5 h-2.5" />
          </button>
        )}

        {/* Editable MRP */}
        {editingMrp ? (
          <input
            autoFocus
            type="number"
            step="0.01"
            defaultValue={item.mrp}
            onBlur={e => { onUpdate('mrp', parseFloat(e.target.value) || 0); setEditingMrp(false) }}
            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
            className="w-20 bg-green-500/10 border border-green-500/50 text-green-400 text-[11px] font-mono px-2 py-0.5 rounded-lg outline-none"
          />
        ) : (
          <button onClick={() => setEditingMrp(true)}
            className="text-green-400 text-[11px] font-mono bg-green-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-green-500/20 active:scale-95">
            ₹{item.mrp} <Edit3 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function SavingState({ count }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <div className="w-16 h-16 rounded-full border-2 border-yellow-500/30 border-t-yellow-500 animate-spin" />
      <p className="text-white font-semibold">{count} items save ho rahe hain...</p>
    </div>
  )
}

function DoneState({ count, onScanMore, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-24 h-24 rounded-full bg-green-900/30 border-2 border-green-500/50 flex items-center justify-center">
        <Check className="w-12 h-12 text-green-400" strokeWidth={2.5} />
      </div>
      <div className="text-center">
        <p className="text-3xl font-bold text-white tracking-widest mb-1">SUCCESS!</p>
        <p className="text-yellow-500 font-mono">{count} items inventory mein add ho gaye</p>
      </div>
      <button onClick={onScanMore} className="w-full bg-yellow-500 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
        <Camera className="w-5 h-5" /> Aur Scan Karo
      </button>
      <button onClick={onBack} className="w-full bg-white/5 text-white py-3 rounded-2xl flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all">
        <ChevronLeft className="w-4 h-4" /> Dashboard par jao
      </button>
    </div>
  )
}

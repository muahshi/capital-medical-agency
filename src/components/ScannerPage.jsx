import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Check, ChevronRight, AlertCircle, Zap, RotateCcw } from 'lucide-react'
import { scanBillWithGroq, fileToBase64, getDemoScanResult } from '../lib/groq'
import { formatExpiry, getStockStatus, getStatusClass } from '../lib/stockUtils'
import toast from 'react-hot-toast'

const DEMO_MODE = !import.meta.env.VITE_GROQ_API_KEY

const STAGES = {
  IDLE: 'idle',
  PREVIEW: 'preview',
  SCANNING: 'scanning',
  RESULTS: 'results',
  SAVING: 'saving',
  DONE: 'done',
}

export default function ScannerPage({ userId, onItemsAdded }) {
  const [stage, setStage] = useState(STAGES.IDLE)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [scanResults, setScanResults] = useState([])
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [error, setError] = useState(null)

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const handleImageSelect = useCallback((file) => {
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError(null)
    setStage(STAGES.PREVIEW)
  }, [])

  const handleScan = useCallback(async () => {
    if (!imageFile && !DEMO_MODE) return
    setStage(STAGES.SCANNING)
    setError(null)

    try {
      let results
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 2200)) // Simulate API call
        results = getDemoScanResult()
      } else {
        const base64 = await fileToBase64(imageFile)
        const mimeType = imageFile.type || 'image/jpeg'
        results = await scanBillWithGroq(base64, mimeType)
      }

      if (!results.length) {
        throw new Error('No medicines detected in image. Try a clearer photo.')
      }

      setScanResults(results)
      setSelectedItems(new Set(results.map((_, i) => i)))
      setStage(STAGES.RESULTS)
    } catch (err) {
      setError(err.message || 'Scan failed. Please try again.')
      setStage(STAGES.PREVIEW)
      toast.error(err.message || 'Scan failed', { className: 'toast-dark' })
    }
  }, [imageFile])

  const toggleItem = useCallback((idx) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    const toSave = scanResults.filter((_, i) => selectedItems.has(i))
    if (!toSave.length) {
      toast.error('Select at least one item', { className: 'toast-dark' })
      return
    }

    setStage(STAGES.SAVING)
    try {
      await onItemsAdded(toSave)
      setStage(STAGES.DONE)
      toast.success(`✅ ${toSave.length} items added to inventory!`, { className: 'toast-dark', duration: 4000 })
    } catch (err) {
      toast.error('Failed to save items', { className: 'toast-dark' })
      setStage(STAGES.RESULTS)
    }
  }, [scanResults, selectedItems, onItemsAdded])

  const reset = useCallback(() => {
    setStage(STAGES.IDLE)
    setImageFile(null)
    setImagePreview(null)
    setScanResults([])
    setSelectedItems(new Set())
    setError(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <p className="text-dark-400 text-xs font-mono tracking-widest uppercase">AI Powered</p>
          <h1 className="font-display text-3xl text-white tracking-widest">SCAN BILL</h1>
        </div>
        {DEMO_MODE && (
          <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg px-3 py-1">
            <p className="text-amber-400 text-[10px] font-mono">DEMO MODE</p>
          </div>
        )}
        {stage !== STAGES.IDLE && (
          <button onClick={reset} className="text-dark-400 p-2 rounded-xl bg-dark-700 active:scale-95">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 scroll-area px-4 pb-4">
        {stage === STAGES.IDLE && <IdleState
          onCamera={() => cameraInputRef.current?.click()}
          onUpload={() => fileInputRef.current?.click()}
          demoMode={DEMO_MODE}
        />}

        {stage === STAGES.PREVIEW && <PreviewState
          imagePreview={imagePreview}
          onScan={handleScan}
          onRetake={reset}
          error={error}
          demoMode={DEMO_MODE}
        />}

        {stage === STAGES.SCANNING && <ScanningState />}

        {stage === STAGES.RESULTS && (
          <ResultsState
            results={scanResults}
            selected={selectedItems}
            onToggle={toggleItem}
            onSave={handleSave}
            onRetry={reset}
          />
        )}

        {stage === STAGES.SAVING && <SavingState count={selectedItems.size} />}

        {stage === STAGES.DONE && <DoneState count={[...selectedItems].length} onScanMore={reset} />}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleImageSelect(e.target.files[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleImageSelect(e.target.files[0])}
      />
    </div>
  )
}

function IdleState({ onCamera, onUpload, demoMode }) {
  return (
    <div className="space-y-4 pt-2 animate-slide-up">
      {/* Viewfinder */}
      <div
        className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #0a0a1a, #060610)',
          border: '1px solid rgba(212,175,55,0.2)',
        }}
      >
        {/* Corner markers */}
        <div className="absolute inset-6">
          <div className="corner-tl" />
          <div className="corner-tr" />
          <div className="corner-bl" />
          <div className="corner-br" />
          {/* Scan line animation */}
          <div className="scan-line" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Center content */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-dark-700/50 border border-gold-500/20 flex items-center justify-center">
            <Camera className="w-10 h-10 text-gold-500/60" />
          </div>
          <div>
            <p className="text-white/60 text-sm font-body">Place invoice/bill inside frame</p>
            <p className="text-gold-500/50 text-xs font-mono mt-1">GROQ VISION AI READY</p>
          </div>
        </div>

        {/* AI Badge */}
        <div className="absolute top-4 right-4 bg-gold-500/10 border border-gold-500/30 rounded-lg px-2 py-1">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-gold-500" />
            <span className="text-gold-500 text-[10px] font-mono">AI</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <button
        onClick={onCamera}
        className="btn-gold w-full flex items-center justify-center gap-3 text-base py-4"
      >
        <Camera className="w-5 h-5" />
        CAPTURE BILL
      </button>

      <button
        onClick={onUpload}
        className="btn-ghost w-full flex items-center justify-center gap-3 text-base py-4"
      >
        <Upload className="w-5 h-5" />
        UPLOAD FROM GALLERY
      </button>

      {demoMode && (
        <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3">
          <p className="text-amber-400 text-xs font-mono text-center">
            ⚠️ Demo Mode: Add VITE_GROQ_API_KEY to .env for real OCR
          </p>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { label: 'Auto OCR', desc: 'Reads text' },
          { label: 'Batch Parse', desc: 'Multi-item' },
          { label: 'Instant Save', desc: 'To inventory' },
        ].map(f => (
          <div key={f.label} className="text-center p-3 bg-dark-800 rounded-xl border border-dark-600">
            <p className="text-gold-500 text-xs font-mono font-bold">{f.label}</p>
            <p className="text-dark-400 text-[10px] mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PreviewState({ imagePreview, onScan, onRetake, error, demoMode }) {
  return (
    <div className="space-y-4 pt-2 animate-slide-up">
      {imagePreview && (
        <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
          <img src={imagePreview} alt="Bill preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-dark-950/20" />
          <div className="absolute top-3 right-3 bg-green-900/80 border border-green-500/40 rounded-lg px-2 py-1">
            <p className="text-green-400 text-[10px] font-mono">READY TO SCAN</p>
          </div>
        </div>
      )}
      {demoMode && !imagePreview && (
        <div className="aspect-[4/3] bg-dark-800 rounded-2xl flex items-center justify-center border border-dark-600">
          <div className="text-center space-y-2">
            <div className="text-4xl">🧾</div>
            <p className="text-dark-400 text-sm">Demo: No real image needed</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button onClick={onScan} className="btn-gold w-full flex items-center justify-center gap-3 text-base py-4">
        <Zap className="w-5 h-5" />
        {demoMode ? 'SIMULATE AI SCAN' : 'SCAN WITH AI'}
      </button>

      <button onClick={onRetake} className="btn-ghost w-full flex items-center justify-center gap-3 py-3">
        <RotateCcw className="w-4 h-4" />
        Retake / Change Image
      </button>
    </div>
  )
}

function ScanningState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-6 animate-fade-in">
      {/* Animated scanner */}
      <div className="relative w-48 h-48">
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-gold-500/30 animate-spin"
          style={{ animationDuration: '3s' }}
        />
        {/* Inner ring */}
        <div
          className="absolute inset-4 rounded-full border border-gold-500/50 animate-spin"
          style={{ animationDuration: '2s', animationDirection: 'reverse' }}
        />
        {/* Center */}
        <div className="absolute inset-8 rounded-full bg-gold-500/10 flex items-center justify-center">
          <Zap className="w-10 h-10 text-gold-500 animate-pulse" />
        </div>
        {/* Dots */}
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <div
            key={deg}
            className="absolute w-2 h-2 rounded-full bg-gold-500"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translateX(80px) translateY(-50%)`,
              opacity: 0.4,
            }}
          />
        ))}
      </div>

      <div className="text-center space-y-2">
        <p className="font-display text-2xl text-gold-500 tracking-widest text-glow">SCANNING</p>
        <p className="text-dark-400 text-sm font-mono">Groq Vision AI analyzing bill...</p>
        <div className="flex gap-1 justify-center">
          {[0, 0.2, 0.4].map(d => (
            <div
              key={d}
              className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-bounce"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </div>
      </div>

      <div className="text-xs text-dark-500 font-mono text-center">
        Extracting medicine names, batches & expiry dates
      </div>
    </div>
  )
}

function ResultsState({ results, selected, onToggle, onSave, onRetry }) {
  return (
    <div className="space-y-4 pt-2 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gold-500 font-mono text-xs tracking-widest">AI EXTRACTED</p>
          <p className="text-white text-lg font-semibold">{results.length} items found</p>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-xl px-3 py-1.5">
          <p className="text-green-400 text-xs font-mono">{selected.size} selected</p>
        </div>
      </div>

      <div className="space-y-2">
        {results.map((item, i) => {
          const isSelected = selected.has(i)
          const status = getStockStatus({ ...item, quantity: item.qty, low_stock_threshold: 0 })
          return (
            <button
              key={i}
              onClick={() => onToggle(i)}
              className={`w-full text-left rounded-xl p-4 border transition-all duration-150 active:scale-[0.98] ${
                isSelected
                  ? 'bg-dark-700 border-gold-500/40'
                  : 'bg-dark-800 border-dark-600 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  isSelected ? 'bg-gold-500 border-gold-500' : 'border-dark-400'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-dark-900" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white text-sm font-semibold leading-tight">{item.medicine_name}</p>
                    {item.gst_percent && (
                      <span className="text-dark-400 text-[10px] font-mono shrink-0">GST {item.gst_percent}%</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    <span className="text-dark-400 text-xs font-mono">{item.batch_no || 'No batch'}</span>
                    <span className="text-dark-400 text-xs font-mono">Exp: {item.expiry_display || formatExpiry(item.expiry_date) || '—'}</span>
                    <span className="text-amber-400 text-xs font-mono">Qty: {item.qty}</span>
                    <span className="text-green-400 text-xs font-mono">₹{item.mrp}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button onClick={onSave} className="btn-gold w-full flex items-center justify-center gap-2 py-4 text-base">
        <Check className="w-5 h-5" />
        SAVE {selected.size} ITEMS TO INVENTORY
      </button>

      <button onClick={onRetry} className="btn-ghost w-full flex items-center justify-center gap-2 py-3">
        <RotateCcw className="w-4 h-4" />
        Scan Again
      </button>
    </div>
  )
}

function SavingState({ count }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
      <div className="w-16 h-16 rounded-full border-2 border-gold-500/30 border-t-gold-500 animate-spin" />
      <p className="text-white font-semibold">Saving {count} items...</p>
      <p className="text-dark-400 text-sm font-mono">Updating inventory database</p>
    </div>
  )
}

function DoneState({ count, onScanMore }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-6 animate-slide-up">
      <div className="w-24 h-24 rounded-full bg-green-900/30 border-2 border-green-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)]">
        <Check className="w-12 h-12 text-green-400" strokeWidth={2.5} />
      </div>
      <div className="text-center">
        <p className="font-display text-3xl text-white tracking-widest mb-1">SUCCESS</p>
        <p className="text-gold-500 font-mono">{count} items added to inventory</p>
      </div>
      <button onClick={onScanMore} className="btn-gold flex items-center gap-2 px-8 py-4">
        <Camera className="w-5 h-5" />
        Scan Another Bill
      </button>
    </div>
  )
}

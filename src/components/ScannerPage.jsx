import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Check, AlertCircle, Zap, RotateCcw, ChevronLeft } from 'lucide-react'
import { scanBillWithGroq, fileToBase64, getDemoScanResult } from '../lib/groq'
import { formatExpiry, getStockStatus } from '../lib/stockUtils'
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

export default function ScannerPage({ onItemsAdded, onBack }) {
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
    // Revoke old URL
    setImagePreview(prev => { if (prev) URL.revokeObjectURL(prev); return null })

    const previewUrl = URL.createObjectURL(file)
    setImageFile(file)
    setImagePreview(previewUrl)
    setError(null)
    setStage(STAGES.PREVIEW)
  }, [])

  const handleScan = useCallback(async () => {
    setStage(STAGES.SCANNING)
    setError(null)
    try {
      let results
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 2000))
        results = getDemoScanResult()
      } else {
        const base64 = await fileToBase64(imageFile)
        results = await scanBillWithGroq(base64, imageFile.type || 'image/jpeg')
      }
      if (!results || !results.length) throw new Error('No medicines detected. Try a clearer photo.')
      setScanResults(results)
      setSelectedItems(new Set(results.map((_, i) => i)))
      setStage(STAGES.RESULTS)
    } catch (err) {
      const msg = err.message || 'Scan failed. Please try again.'
      setError(msg)
      setStage(STAGES.PREVIEW)
      toast.error(msg)
    }
  }, [imageFile])

  const toggleItem = useCallback((idx) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    const toSave = scanResults.filter((_, i) => selectedItems.has(i))
    if (!toSave.length) { toast.error('Kam se kam ek item select karo'); return }
    setStage(STAGES.SAVING)
    try {
      await onItemsAdded(toSave)
      setStage(STAGES.DONE)
      toast.success(`✅ ${toSave.length} items inventory mein add ho gaye!`, { duration: 4000 })
    } catch {
      toast.error('Save failed')
      setStage(STAGES.RESULTS)
    }
  }, [scanResults, selectedItems, onItemsAdded])

  const reset = useCallback(() => {
    setImagePreview(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setImageFile(null)
    setScanResults([])
    setSelectedItems(new Set())
    setError(null)
    setStage(STAGES.IDLE)
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all"
          >
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
            imagePreview={imagePreview}
            onScan={handleScan}
            onRetake={reset}
            error={error}
            demoMode={DEMO_MODE}
          />
        )}
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
        {stage === STAGES.DONE && <DoneState count={[...selectedItems].length} onScanMore={reset} onBack={onBack} />}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { if (e.target.files[0]) handleImageSelect(e.target.files[0]); e.target.value = '' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { if (e.target.files[0]) handleImageSelect(e.target.files[0]); e.target.value = '' }}
      />
    </div>
  )
}

function IdleState({ onCamera, onUpload, demoMode }) {
  return (
    <div className="space-y-4 pt-2">
      {/* Viewfinder */}
      <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden flex items-center justify-center bg-[#0a0a1a] border border-yellow-500/20">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-yellow-500/20 flex items-center justify-center">
            <Camera className="w-10 h-10 text-yellow-500/60" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Bill / Invoice andar rakho</p>
            <p className="text-yellow-500/50 text-xs font-mono mt-1">GROQ VISION AI READY</p>
          </div>
        </div>
        <div className="absolute top-4 right-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-1">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span className="text-yellow-500 text-[10px] font-mono">AI</span>
          </div>
        </div>
      </div>

      <button onClick={onCamera} className="w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 transition-all text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3">
        <Camera className="w-5 h-5" />
        CAMERA SE CAPTURE KARO
      </button>

      <button onClick={onUpload} className="w-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 border border-white/10">
        <Upload className="w-5 h-5" />
        GALLERY SE UPLOAD KARO
      </button>

      {demoMode && (
        <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3">
          <p className="text-amber-400 text-xs font-mono text-center">
            ⚠️ Demo Mode: VITE_GROQ_API_KEY add karo real OCR ke liye
          </p>
        </div>
      )}
    </div>
  )
}

function PreviewState({ imagePreview, onScan, onRetake, error, demoMode }) {
  return (
    <div className="space-y-4 pt-2">
      {/* Image Preview */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/10">
        {imagePreview ? (
          <>
            <img
              src={imagePreview}
              alt="Bill preview"
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div className="absolute top-3 right-3 bg-green-900/80 border border-green-500/40 rounded-lg px-2 py-1">
              <p className="text-green-400 text-[10px] font-mono">READY TO SCAN</p>
            </div>
          </>
        ) : demoMode ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-4xl">🧾</div>
              <p className="text-gray-500 text-sm">Demo: Image zaruri nahi</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-500 text-sm">Preview load nahi hua</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button onClick={onScan} className="w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 transition-all text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3">
        <Zap className="w-5 h-5" />
        {demoMode ? 'DEMO SCAN CHALAO' : 'AI SE SCAN KARO'}
      </button>

      <button onClick={onRetake} className="w-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-3 border border-white/10">
        <RotateCcw className="w-4 h-4" />
        Dobara lelo / Change karo
      </button>
    </div>
  )
}

function ScanningState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <div className="relative w-40 h-40">
        <div className="absolute inset-0 rounded-full border-2 border-yellow-500/30 animate-spin" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-4 rounded-full border border-yellow-500/50 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
        <div className="absolute inset-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <Zap className="w-10 h-10 text-yellow-500 animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-2xl font-bold text-yellow-500 tracking-widest">SCANNING...</p>
        <p className="text-gray-500 text-sm font-mono">Groq Vision AI bill analyze kar raha hai</p>
        <div className="flex gap-1 justify-center">
          {[0, 0.2, 0.4].map(d => (
            <div key={d} className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultsState({ results, selected, onToggle, onSave, onRetry }) {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-yellow-500 font-mono text-xs tracking-widest">AI EXTRACTED</p>
          <p className="text-white text-lg font-semibold">{results.length} items mile</p>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-xl px-3 py-1.5">
          <p className="text-green-400 text-xs font-mono">{selected.size} selected</p>
        </div>
      </div>

      <div className="space-y-2">
        {results.map((item, i) => {
          const isSelected = selected.has(i)
          return (
            <button
              key={i}
              onClick={() => onToggle(i)}
              className={`w-full text-left rounded-xl p-4 border transition-all active:scale-[0.98] ${
                isSelected ? 'bg-white/5 border-yellow-500/40' : 'bg-white/[0.02] border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  isSelected ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">{item.medicine_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    <span className="text-gray-500 text-xs font-mono">{item.batch_no || 'No batch'}</span>
                    <span className="text-gray-500 text-xs font-mono">Exp: {item.expiry_display || formatExpiry(item.expiry_date) || '—'}</span>
                    <span className="text-amber-400 text-xs font-mono">Qty: {item.qty}</span>
                    <span className="text-green-400 text-xs font-mono">₹{item.mrp}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button onClick={onSave} className="w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 transition-all text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
        <Check className="w-5 h-5" />
        {selected.size} ITEMS SAVE KARO
      </button>
      <button onClick={onRetry} className="w-full bg-white/5 hover:bg-white/10 active:scale-95 text-white py-3 rounded-2xl flex items-center justify-center gap-2 border border-white/10">
        <RotateCcw className="w-4 h-4" />
        Dobara scan karo
      </button>
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
        <Camera className="w-5 h-5" />
        Aur Scan Karo
      </button>
      <button onClick={onBack} className="w-full bg-white/5 text-white py-3 rounded-2xl flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all">
        <ChevronLeft className="w-4 h-4" />
        Dashboard par jao
      </button>
    </div>
  )
}

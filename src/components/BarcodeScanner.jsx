// ─── src/components/BarcodeScanner.jsx — Phase 4 ─────────────────────────────
// Mobile camera barcode/QR scanner using ZXing (loaded from CDN)
// Logic: scan → match inventory → add to list
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Zap, Package, Plus, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

// Load ZXing from CDN dynamically
async function loadZXing() {
  if (window.ZXing) return window.ZXing
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@zxing/library@0.18.6/umd/index.min.js'
    script.onload  = () => resolve(window.ZXing)
    script.onerror = () => reject(new Error('ZXing load failed'))
    document.head.appendChild(script)
  })
}

// Match barcode to inventory item
function matchBarcode(barcode, items) {
  if (!barcode || !items?.length) return null
  const q = barcode.toLowerCase().trim()
  // Exact batch match
  const exactBatch = items.find(i => i.batch_no?.toLowerCase() === q)
  if (exactBatch) return exactBatch
  // Partial name match (some barcodes encode medicine name)
  const namePart = items.find(i => i.medicine_name?.toLowerCase().includes(q) || q.includes(i.medicine_name?.toLowerCase().slice(0,5)))
  if (namePart) return namePart
  return null
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function BarcodeScanner({ items = [], onItemFound, onClose, mode = 'inventory' }) {
  const videoRef   = useRef(null)
  const readerRef  = useRef(null)
  const streamRef  = useRef(null)

  const [status,       setStatus]       = useState('loading')   // loading|scanning|found|error
  const [lastScan,     setLastScan]     = useState(null)
  const [matchedItem,  setMatchedItem]  = useState(null)
  const [manualCode,   setManualCode]   = useState('')
  const [scanHistory,  setScanHistory]  = useState([])
  const [torchOn,      setTorchOn]      = useState(false)

  // ── Init scanner ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    initScanner()
    return () => {
      mounted = false
      stopScanner()
    }
  }, [])

  const initScanner = async () => {
    setStatus('loading')
    try {
      const ZXing = await loadZXing()
      const codeReader = new ZXing.BrowserMultiFormatReader()
      readerRef.current = codeReader

      const devices = await codeReader.listVideoInputDevices()
      if (!devices?.length) throw new Error('Camera nahi mili')

      // Prefer back camera
      const backCam = devices.find(d =>
        d.label?.toLowerCase().includes('back') ||
        d.label?.toLowerCase().includes('rear') ||
        d.label?.toLowerCase().includes('environment')
      ) || devices[devices.length - 1]

      await codeReader.decodeFromVideoDevice(
        backCam.deviceId,
        videoRef.current,
        (result, err) => {
          if (result) handleScanResult(result.getText())
        }
      )
      setStatus('scanning')
    } catch (e) {
      console.error('[BarcodeScanner]', e)
      setStatus('error')
    }
  }

  const stopScanner = () => {
    try {
      readerRef.current?.reset()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    } catch {}
  }

  // ── Handle scan result ────────────────────────────────────────────────────
  const handleScanResult = useCallback((code) => {
    if (!code || code === lastScan) return
    setLastScan(code)

    const match = matchBarcode(code, items)
    setMatchedItem(match)

    setScanHistory(prev => {
      const entry = {
        code,
        medicine: match?.medicine_name || 'Unknown',
        matched: !!match,
        time: new Date().toLocaleTimeString('en-IN'),
      }
      return [entry, ...prev.slice(0, 4)]
    })

    if (match) {
      setStatus('found')
      // Vibrate on match
      navigator.vibrate?.([100, 50, 100])
      toast.success(`✓ ${match.medicine_name} found!`, { duration:2000 })
      onItemFound?.(match, code)
    } else {
      toast.error(`Barcode "${code.slice(0,20)}" inventory mein nahi mila`, { duration:3000 })
      // Resume scanning after 2s
      setTimeout(() => setStatus('scanning'), 2000)
    }
  }, [lastScan, items, onItemFound])

  // ── Manual entry ──────────────────────────────────────────────────────────
  const handleManual = () => {
    if (!manualCode.trim()) return
    handleScanResult(manualCode.trim())
    setManualCode('')
  }

  // ── Toggle torch ──────────────────────────────────────────────────────────
  const toggleTorch = async () => {
    try {
      const track = videoRef.current?.srcObject?.getVideoTracks()[0]
      if (track?.getCapabilities().torch) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] })
        setTorchOn(!torchOn)
      } else {
        toast.error('Torch supported nahi is device mein')
      }
    } catch {}
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:60,
      background:'#040407',
      display:'flex', flexDirection:'column',
    }}>
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 16px 12px',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        zIndex:2,
      }}>
        <div>
          <div style={{ color:'rgba(0,229,255,0.6)', fontSize:9, fontFamily:'monospace', letterSpacing:3 }}>PHASE 4</div>
          <div style={{ color:'#fff', fontSize:18, fontFamily:'Space Grotesk,sans-serif', fontWeight:800 }}>BARCODE SCANNER</div>
        </div>
        <button onClick={() => { stopScanner(); onClose?.() }}
          style={{ width:36,height:36,borderRadius:12,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <X size={18} color="#fff"/>
        </button>
      </div>

      {/* Camera view */}
      <div style={{ position:'relative', width:'100%', aspectRatio:'1', maxHeight:'55vw', overflow:'hidden', background:'#000', flexShrink:0 }}>
        <video
          ref={videoRef}
          style={{ width:'100%', height:'100%', objectFit:'cover' }}
          playsInline muted autoPlay
        />

        {/* Scanner overlay */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {/* Darkened corners */}
          <div style={{ position:'absolute', inset:0, background:'rgba(4,4,7,0.4)' }}/>

          {/* Scan frame */}
          <div style={{ position:'relative', width:'65%', aspectRatio:'1', zIndex:1 }}>
            {/* Corners */}
            {[
              {top:0,left:0,borderTop:'3px solid #00E5FF',borderLeft:'3px solid #00E5FF',borderRadius:'4px 0 0 0'},
              {top:0,right:0,borderTop:'3px solid #00E5FF',borderRight:'3px solid #00E5FF',borderRadius:'0 4px 0 0'},
              {bottom:0,left:0,borderBottom:'3px solid #00E5FF',borderLeft:'3px solid #00E5FF',borderRadius:'0 0 0 4px'},
              {bottom:0,right:0,borderBottom:'3px solid #00E5FF',borderRight:'3px solid #00E5FF',borderRadius:'0 0 4px 0'},
            ].map((style,i) => (
              <div key={i} style={{ position:'absolute', width:24, height:24, ...style, boxShadow:'0 0 8px rgba(0,229,255,0.5)' }}/>
            ))}

            {/* Scan line animation */}
            {status === 'scanning' && (
              <div style={{
                position:'absolute', left:0, right:0, height:2,
                background:'linear-gradient(90deg,transparent,#00E5FF,transparent)',
                boxShadow:'0 0 12px #00E5FF',
                animation:'scanLine 2s linear infinite',
              }}/>
            )}

            {/* Status overlay */}
            {status === 'found' && matchedItem && (
              <div style={{
                position:'absolute', inset:0,
                background:'rgba(0,255,136,0.15)',
                border:'2px solid #00FF88',
                borderRadius:4,
                display:'flex', alignItems:'center', justifyContent:'center',
                flexDirection:'column', gap:6,
              }}>
                <CheckCircle size={32} color="#00FF88"/>
                <span style={{ color:'#00FF88', fontWeight:800, fontSize:12, fontFamily:'monospace', textAlign:'center', padding:'0 8px' }}>
                  {matchedItem.medicine_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'8px 16px',
          background:'linear-gradient(to top,rgba(4,4,7,0.9),transparent)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {status==='loading'  && <><Loader size={14} color="#FFD700" style={{animation:'spin 1s linear infinite'}}/><span style={{color:'#FFD700',fontSize:11,fontFamily:'monospace'}}>Camera loading...</span></>}
            {status==='scanning' && <><div style={{width:8,height:8,borderRadius:'50%',background:'#00E5FF',boxShadow:'0 0 6px #00E5FF',animation:'pulseDot 1.5s ease infinite'}}/><span style={{color:'#00E5FF',fontSize:11,fontFamily:'monospace'}}>Scan karo...</span></>}
            {status==='found'    && <><CheckCircle size={14} color="#00FF88"/><span style={{color:'#00FF88',fontSize:11,fontFamily:'monospace'}}>Match mila!</span></>}
            {status==='error'    && <><AlertCircle size={14} color="#FF4D6D"/><span style={{color:'#FF4D6D',fontSize:11,fontFamily:'monospace'}}>Camera error</span></>}
          </div>
          <button onClick={toggleTorch} style={{
            background:torchOn?'rgba(255,215,0,0.2)':'rgba(255,255,255,0.1)',
            border:`1px solid ${torchOn?'rgba(255,215,0,0.4)':'rgba(255,255,255,0.15)'}`,
            borderRadius:8, padding:'4px 10px', color:torchOn?'#FFD700':'rgba(255,255,255,0.5)',
            fontSize:11, fontFamily:'monospace', cursor:'pointer',
          }}>⚡ {torchOn?'ON':'OFF'}</button>
        </div>
      </div>

      {/* Manual code input */}
      <div style={{ padding:'14px 16px 10px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace', letterSpacing:2, marginBottom:8 }}>
          MANUAL BARCODE / BATCH NO
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input
            value={manualCode}
            onChange={e=>setManualCode(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleManual()}
            placeholder="Type batch no ya barcode..."
            style={{ flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'10px 14px',color:'#fff',fontSize:13,outline:'none' }}
          />
          <button onClick={handleManual} style={{
            background:'linear-gradient(135deg,#00B8D9,#0070F3)',border:'none',borderRadius:12,
            padding:'10px 16px',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',
            display:'flex',alignItems:'center',gap:6,
          }}>
            <Zap size={14}/> Search
          </button>
        </div>
      </div>

      {/* Scan history */}
      {scanHistory.length > 0 && (
        <div style={{ flex:1,overflowY:'auto',padding:'0 16px 24px' }}>
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace', letterSpacing:2, marginBottom:8 }}>RECENT SCANS</div>
          {scanHistory.map((s,i) => (
            <div key={i} style={{
              display:'flex',alignItems:'center',gap:10,
              background:'rgba(255,255,255,0.03)',border:`1px solid ${s.matched?'rgba(0,255,136,0.15)':'rgba(255,77,109,0.15)'}`,
              borderRadius:12,padding:'10px 14px',marginBottom:6,
            }}>
              <div style={{ width:8,height:8,borderRadius:'50%',background:s.matched?'#00FF88':'#FF4D6D',flexShrink:0 }}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ color:'#fff',fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.medicine}</div>
                <div style={{ color:'rgba(255,255,255,0.3)',fontSize:10,fontFamily:'monospace' }}>{s.code.slice(0,20)} · {s.time}</div>
              </div>
              {s.matched && (
                <button onClick={()=>onItemFound?.(items.find(i=>i.medicine_name===s.medicine), s.code)} style={{
                  background:'rgba(0,255,136,0.1)',border:'1px solid rgba(0,255,136,0.2)',
                  borderRadius:8,padding:'4px 10px',color:'#00FF88',fontSize:10,fontFamily:'monospace',cursor:'pointer',
                  display:'flex',alignItems:'center',gap:4,
                }}>
                  <Plus size={10}/> Add
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error fallback */}
      {status === 'error' && (
        <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,gap:16 }}>
          <div style={{ fontSize:48 }}>📷</div>
          <p style={{ color:'rgba(255,255,255,0.5)',textAlign:'center',fontSize:13,lineHeight:1.6 }}>
            Camera access nahi mila.<br/>Permission check karo ya manual entry use karo.
          </p>
          <button onClick={initScanner} style={{
            background:'rgba(0,229,255,0.1)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:14,
            padding:'12px 24px',color:'#00E5FF',fontWeight:700,fontSize:13,cursor:'pointer',
          }}>
            Retry Camera
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes scanLine{0%{top:0%;opacity:1}90%{opacity:1}100%{top:100%;opacity:0}}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>
    </div>
  )
}

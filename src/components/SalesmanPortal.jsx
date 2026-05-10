import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, User, Package, CheckCircle, Loader, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'

const SALESMAN_CODES = { 'SALES1': 'Rahul (Bhopal)', 'SALES2': 'Vikram (Indore)', 'SALES3': 'Suresh (Jabalpur)' }

// Groq API for voice parsing
async function parseOrderWithAI(transcript, salesmanName) {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key) return parseDemoOrder(transcript)

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: `You are an order parser for Capital Medical Agency, Bhopal. 
Parse this voice order from salesman "${salesmanName}" and return ONLY valid JSON, no markdown.

Voice input: "${transcript}"

Return this exact format:
{
  "customer_name": "extracted customer/retailer name",
  "items": [
    {"medicine_name": "name", "qty": 10, "notes": "any special note or null"}
  ],
  "notes": "any overall notes or null"
}

Rules:
- Extract medicine names exactly as spoken
- qty must be integer
- If customer name not mentioned, use "Walk-in Customer"
- Return ONLY the JSON object`
      }]
    })
  })

  if (!res.ok) throw new Error('AI parse failed')
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'
  const clean = raw.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()
  return JSON.parse(clean)
}

function parseDemoOrder(transcript) {
  // Simple demo parser
  const items = []
  const patterns = [
    /(\d+)\s+(?:box|strip|bottle|pcs?)?\s*(?:of\s+)?([a-zA-Z\s]+?)(?:\s+\d+mg|\s+\d+ml)?(?:,|$|and)/gi,
    /([a-zA-Z\s]+?)\s+(\d+)\s+(?:box|strip|bottle|pcs?)/gi,
  ]
  const match = transcript.match(/customer[:\s]+([a-zA-Z\s]+?)(?:\s+(?:wants|need|order|chahiye)|,|$)/i)
  const customer = match ? match[1].trim() : 'Walk-in Customer'

  // Extract medicines from text
  const medWords = transcript.split(/[\s,]+/)
  let i = 0
  while (i < medWords.length) {
    const num = parseInt(medWords[i])
    if (!isNaN(num) && medWords[i + 1]) {
      items.push({ medicine_name: medWords.slice(i + 1, i + 4).join(' ').replace(/[,.]$/, ''), qty: num, notes: null })
      i += 4
    } else i++
  }

  if (items.length === 0) {
    items.push({ medicine_name: transcript.slice(0, 30), qty: 1, notes: 'Manual review needed' })
  }

  return { customer_name: customer, items, notes: null }
}

export default function SalesmanPortal({ onOrderSubmit }) {
  const [stage, setStage] = useState('login') // login | main | recording | review | done
  const [salesman, setSalesman] = useState(null)
  const [codeInput, setCodeInput] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [parsedOrder, setParsedOrder] = useState(null)
  const [isParsing, setIsParsing] = useState(false)
  const [manualInput, setManualInput] = useState('')

  const recognitionRef = useRef(null)
  const timerRef = useRef(null)

  // ── Login ──
  const handleLogin = () => {
    const code = codeInput.trim().toUpperCase()
    if (SALESMAN_CODES[code]) {
      setSalesman({ code, name: SALESMAN_CODES[code] })
      setStage('main')
    } else {
      toast.error('Galat code! CMA se lelo.')
    }
  }

  // ── Voice recording ──
  const startRecording = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) {
      toast.error('Voice recognition supported nahi. Text mein type karo.')
      return
    }
    const rec = new SpeechRec()
    rec.lang = 'hi-IN'
    rec.continuous = true
    rec.interimResults = true

    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      setTranscript((finalText + interim).trim())
    }
    rec.onerror = () => { toast.error('Mic error'); setIsRecording(false) }
    rec.onend = () => setIsRecording(false)

    rec.start()
    recognitionRef.current = rec
    setIsRecording(true)
    setTranscript('')
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  // ── Parse order ──
  const handleParseOrder = async () => {
    const text = transcript || manualInput
    if (!text.trim()) { toast.error('Pehle order bolo ya type karo'); return }
    setIsParsing(true)
    try {
      const parsed = await parseOrderWithAI(text, salesman.name)
      if (customerName) parsed.customer_name = customerName
      setParsedOrder(parsed)
      setStage('review')
    } catch (err) {
      toast.error('Order parse nahi hua. Dobara try karo.')
    } finally {
      setIsParsing(false)
    }
  }

  // ── Submit order ──
  const handleSubmit = () => {
    if (!parsedOrder) return
    const order = {
      salesman_code: salesman.code,
      salesman_name: salesman.name,
      customer_name: parsedOrder.customer_name || customerName || 'Walk-in',
      items: parsedOrder.items,
      notes: parsedOrder.notes,
      transcript,
    }
    onOrderSubmit(order)
    setStage('done')
    toast.success('Order bhej diya! ✅', { duration: 3000 })
  }

  const resetOrder = () => {
    setTranscript('')
    setManualInput('')
    setParsedOrder(null)
    setCustomerName('')
    setStage('main')
  }

  // ── Login screen ──
  if (stage === 'login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-xs space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Package className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-widest">CMA SALESMAN</h1>
            <p className="text-gray-500 text-xs font-mono mt-1 uppercase tracking-widest">Capital Medical Agency</p>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Apna Salesman Code daalo</label>
              <input
                type="text"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="e.g. SALES1"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-lg font-mono tracking-widest outline-none focus:border-blue-500/50"
              />
            </div>
            <button onClick={handleLogin}
              className="w-full bg-blue-500 hover:bg-blue-400 active:scale-95 transition-all text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
              Enter Karo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-gray-700 text-[10px] font-mono">Code nahi pata? CMA Admin se maango.</p>
        </div>
      </div>
    )
  }

  // ── Done screen ──
  if (stage === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white space-y-6">
        <div className="w-24 h-24 rounded-full bg-green-900/30 border-2 border-green-500/40 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold tracking-widest mb-1">ORDER BHEJA!</p>
          <p className="text-gray-400 font-mono text-sm">Admin ko mil gaya order ✓</p>
        </div>
        <button onClick={resetOrder}
          className="w-full max-w-xs bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95">
          Naya Order Lo
        </button>
        <button onClick={() => setStage('main')}
          className="text-gray-500 text-sm font-mono underline">Wapas jao</button>
      </div>
    )
  }

  // ── Review screen ──
  if (stage === 'review' && parsedOrder) {
    return (
      <div className="min-h-screen flex flex-col p-4 text-white">
        <div className="flex items-center gap-3 pt-4 pb-6">
          <button onClick={() => setStage('main')} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
          <div>
            <p className="text-gray-500 text-xs font-mono uppercase">Review Karo</p>
            <h1 className="text-xl font-bold">ORDER CONFIRM KARO</h1>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {/* Customer */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4">
            <p className="text-gray-500 text-[10px] font-mono uppercase mb-1">Customer</p>
            <p className="text-white font-semibold text-lg">{parsedOrder.customer_name}</p>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Items ({parsedOrder.items?.length})</p>
            {parsedOrder.items?.map((item, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <p className="text-white text-sm font-medium flex-1">{item.medicine_name}</p>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1">
                  <p className="text-blue-400 font-mono text-sm font-bold">×{item.qty}</p>
                </div>
              </div>
            ))}
          </div>

          {parsedOrder.notes && (
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3">
              <p className="text-amber-400 text-xs font-mono">{parsedOrder.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <button onClick={handleSubmit}
            className="w-full bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
            <Send className="w-5 h-5" /> ORDER BHEJO
          </button>
          <button onClick={resetOrder}
            className="w-full bg-white/5 text-white py-3 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95">
            Dobara Karo
          </button>
        </div>
      </div>
    )
  }

  // ── Main order screen ──
  return (
    <div className="min-h-screen flex flex-col p-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-6">
        <div>
          <p className="text-gray-500 text-[10px] font-mono uppercase">Logged in as</p>
          <p className="text-white font-bold">{salesman.name}</p>
        </div>
        <button onClick={() => setStage('login')} className="text-gray-600 text-xs font-mono underline">Logout</button>
      </div>

      <div className="flex-1 space-y-6">
        {/* Customer name */}
        <div className="space-y-2">
          <label className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Customer / Retailer Name</label>
          <div className="flex items-center gap-3 bg-[#0a0a0a] border border-white/10 rounded-2xl px-4 py-3">
            <User className="w-5 h-5 text-gray-500 shrink-0" />
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="e.g. Ram Medicals, Indore"
              className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Voice button */}
        <div className="flex flex-col items-center space-y-4 py-4">
          <button
            onPointerDown={startRecording}
            onPointerUp={stopRecording}
            onPointerLeave={stopRecording}
            className={`w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
              isRecording
                ? 'bg-red-500 shadow-2xl shadow-red-500/40 scale-105'
                : 'bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-500/20'
            }`}
          >
            {isRecording ? <MicOff className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />}
            <span className="text-white text-[10px] font-mono font-bold">
              {isRecording ? 'RECORDING...' : 'PRESS & HOLD'}
            </span>
          </button>

          {isRecording && (
            <div className="flex gap-1">
              {[0,0.1,0.2,0.3,0.4].map(d => (
                <div key={d} className="w-1 bg-red-400 rounded-full animate-bounce"
                  style={{ height: `${8 + Math.random() * 16}px`, animationDelay: `${d}s` }} />
              ))}
            </div>
          )}

          <p className="text-gray-500 text-xs font-mono text-center leading-relaxed">
            Button dabakar bolte raho:<br/>
            <span className="text-gray-400">"Ram Medicals ko 50 Paracetamol aur 20 Amoxicillin chahiye"</span>
          </p>
        </div>

        {/* Transcript display */}
        {transcript && (
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 space-y-2">
            <p className="text-gray-500 text-[10px] font-mono uppercase">Suna gaya:</p>
            <p className="text-white text-sm leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* Manual fallback */}
        <div className="space-y-2">
          <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">Ya type karo (voice nahi chali?)</p>
          <textarea
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder="e.g. 50 Paracetamol 500mg, 20 Amoxicillin 500mg..."
            rows={3}
            className="w-full bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/30 resize-none placeholder:text-gray-700"
          />
        </div>
      </div>

      {/* Parse button */}
      <div className="mt-6 pb-6">
        <button
          onClick={handleParseOrder}
          disabled={isParsing || (!transcript && !manualInput)}
          className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3"
        >
          {isParsing ? (
            <><Loader className="w-5 h-5 animate-spin" /> AI Parse Kar Raha Hai...</>
          ) : (
            <><ChevronRight className="w-5 h-5" /> ORDER REVIEW KARO</>
          )}
        </button>
      </div>
    </div>
  )
}

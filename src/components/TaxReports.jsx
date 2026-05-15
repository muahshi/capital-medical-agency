// ─── src/components/TaxReports.jsx — Phase 4 GST & GSTR-1 ────────────────────
import { useState, useMemo } from 'react'
import {
  FileText, Download, ChevronDown, CheckCircle,
  IndianRupee, Calendar, Filter, Loader, Copy, X
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── HSN codes for pharma ──────────────────────────────────────────────────────
const HSN_MAP = {
  '3004': { desc:'Medicaments (formulations)',   gst:12 },
  '3003': { desc:'Medicaments (bulk)',            gst:12 },
  '3005': { desc:'Wadding, gauze, bandages',      gst:12 },
  '3006': { desc:'Pharmaceutical goods',          gst:12 },
  '2936': { desc:'Vitamins & provitamins',        gst:5  },
  '3001': { desc:'Organs, glands (dried)',        gst:0  },
  '9018': { desc:'Medical instruments',           gst:12 },
  '3002': { desc:'Blood, antisera, vaccines',     gst:5  },
}

// ── Calculate GST from items ──────────────────────────────────────────────────
function calcGST(items = []) {
  let taxable=0, cgst=0, sgst=0
  const hsnMap = {}

  items.forEach(item => {
    const qty   = item.qty || item.quantity || 1
    const rate  = item.unit_price || 0
    const gstPct= item.gst_percent || 12
    const hsn   = item.hsn_code || '3004'
    const taxableAmt = qty * rate
    const cgstAmt    = taxableAmt * (gstPct/2) / 100
    const sgstAmt    = taxableAmt * (gstPct/2) / 100

    taxable += taxableAmt
    cgst    += cgstAmt
    sgst    += sgstAmt

    if (!hsnMap[hsn]) hsnMap[hsn] = { taxable:0, cgst:0, sgst:0, gstPct, desc:HSN_MAP[hsn]?.desc||'Medicaments' }
    hsnMap[hsn].taxable += taxableAmt
    hsnMap[hsn].cgst    += cgstAmt
    hsnMap[hsn].sgst    += sgstAmt
  })

  return { taxable, cgst, sgst, total:taxable+cgst+sgst, hsnMap }
}

// ── Build GSTR-1 rows from orders ────────────────────────────────────────────
function buildGSTR1(orders, month, year) {
  return orders
    .filter(o => {
      const d = new Date(o.created_at)
      return d.getMonth()+1 === month && d.getFullYear() === year && o.status !== 'cancelled'
    })
    .map((o, i) => {
      const gst = calcGST(o.items || [])
      return {
        sr:           i+1,
        invoice_no:   o.id,
        invoice_date: new Date(o.created_at).toLocaleDateString('en-IN'),
        customer:     o.customer_name || 'Walk-in',
        gstin:        o.customer_gstin || 'URP',  // Unregistered person
        state:        'MP',
        state_code:   '23',
        taxable:      gst.taxable,
        cgst:         gst.cgst,
        sgst:         gst.sgst,
        igst:         0,
        total:        gst.total,
        hsn:          Object.entries(gst.hsnMap).map(([code,v])=>({code,...v})),
      }
    })
}

// ── HSN Summary ───────────────────────────────────────────────────────────────
function buildHSNSummary(rows) {
  const map = {}
  rows.forEach(r => {
    r.hsn.forEach(h => {
      if (!map[h.code]) map[h.code] = { code:h.code, desc:h.desc, gstPct:h.gstPct, taxable:0, cgst:0, sgst:0 }
      map[h.code].taxable += h.taxable
      map[h.code].cgst    += h.cgst
      map[h.code].sgst    += h.sgst
    })
  })
  return Object.values(map)
}

// ── CSV generators ────────────────────────────────────────────────────────────
function toGSTR1CSV(rows) {
  const headers = ['Sr No','Invoice No','Invoice Date','Customer Name','GSTIN/UIN','Place of Supply','State Code','Taxable Value','CGST','SGST','IGST','Total Invoice Value']
  const data = rows.map(r => [r.sr,r.invoice_no,r.invoice_date,r.customer,r.gstin,`${r.state}-${r.state_code}`,r.state_code,r.taxable.toFixed(2),r.cgst.toFixed(2),r.sgst.toFixed(2),r.igst.toFixed(2),r.total.toFixed(2)])
  return [headers,...data].map(row=>row.map(c=>`"${c}"`).join(',')).join('\n')
}

function toHSNCSV(hsn) {
  const headers = ['HSN Code','Description','GST Rate','Taxable Value','CGST','SGST','Total Tax']
  const data = hsn.map(h=>[h.code,h.desc,`${h.gstPct}%`,h.taxable.toFixed(2),h.cgst.toFixed(2),h.sgst.toFixed(2),(h.cgst+h.sgst).toFixed(2)])
  return [headers,...data].map(row=>row.map(c=>`"${c}"`).join(',')).join('\n')
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type:'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function TaxReports({ orders = [], stockItems = [], onBack }) {
  const now    = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth()+1)
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [activeTab, setActiveTab] = useState('gstr1')  // gstr1 | hsn | summary

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const YEARS  = [now.getFullYear(), now.getFullYear()-1]

  const gstr1Rows  = useMemo(() => buildGSTR1(orders, selMonth, selYear), [orders, selMonth, selYear])
  const hsnSummary = useMemo(() => buildHSNSummary(gstr1Rows), [gstr1Rows])

  const totals = useMemo(() => ({
    taxable: gstr1Rows.reduce((s,r)=>s+r.taxable,0),
    cgst:    gstr1Rows.reduce((s,r)=>s+r.cgst,0),
    sgst:    gstr1Rows.reduce((s,r)=>s+r.sgst,0),
    total:   gstr1Rows.reduce((s,r)=>s+r.total,0),
    count:   gstr1Rows.length,
  }), [gstr1Rows])

  // Stock GST (for inventory value report)
  const stockGST = useMemo(() => calcGST(stockItems.map(i=>({...i,qty:i.quantity}))), [stockItems])

  const handleExportGSTR1 = () => {
    if (gstr1Rows.length === 0) { toast.error('Is mahine koi order nahi'); return }
    const csv = toGSTR1CSV(gstr1Rows)
    downloadCSV(csv, `GSTR1_${MONTHS[selMonth-1]}_${selYear}_CMA.csv`)
    toast.success('GSTR-1 CSV exported!')
  }

  const handleExportHSN = () => {
    if (hsnSummary.length === 0) { toast.error('Koi data nahi'); return }
    const csv = toHSNCSV(hsnSummary)
    downloadCSV(csv, `HSN_Summary_${MONTHS[selMonth-1]}_${selYear}_CMA.csv`)
    toast.success('HSN Summary exported!')
  }

  const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#040407' }}>

      {/* Header */}
      <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ color:'rgba(255,215,0,0.6)', fontSize:9, fontFamily:'monospace', letterSpacing:3 }}>PHASE 4 · TAX</div>
        <div style={{ color:'#fff', fontSize:20, fontFamily:'Space Grotesk,sans-serif', fontWeight:800 }}>GST & TAX REPORTS</div>
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginTop:2 }}>GSTR-1, HSN Summary — CA-ready CSV export</div>
      </div>

      {/* Month/Year selector */}
      <div style={{ display:'flex', gap:8, padding:'12px 14px 8px', overflowX:'auto' }}>
        {MONTHS.map((m,i) => (
          <button key={m} onClick={()=>setSelMonth(i+1)} style={{
            flexShrink:0, padding:'6px 14px', borderRadius:20,
            fontSize:11, fontFamily:'monospace', fontWeight:700, cursor:'pointer',
            background:selMonth===i+1?'rgba(255,215,0,0.12)':'rgba(255,255,255,0.03)',
            border:selMonth===i+1?'1px solid rgba(255,215,0,0.3)':'1px solid rgba(255,255,255,0.06)',
            color:selMonth===i+1?'#FFD700':'rgba(255,255,255,0.3)',
          }}>{m}</button>
        ))}
        {YEARS.map(y => (
          <button key={y} onClick={()=>setSelYear(y)} style={{
            flexShrink:0, padding:'6px 14px', borderRadius:20,
            fontSize:11, fontFamily:'monospace', fontWeight:700, cursor:'pointer',
            background:selYear===y?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',
            border:selYear===y?'1px solid rgba(0,229,255,0.2)':'1px solid rgba(255,255,255,0.06)',
            color:selYear===y?'#00E5FF':'rgba(255,255,255,0.3)',
          }}>{y}</button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, padding:'8px 14px' }}>
        {[
          { label:'Taxable Value', val:fmt(totals.taxable), color:'#fff'    },
          { label:'Total Tax',     val:fmt(totals.cgst+totals.sgst), color:'#FFD700'},
          { label:'CGST',          val:fmt(totals.cgst),    color:'#FF8C42' },
          { label:'SGST',          val:fmt(totals.sgst),    color:'#FF8C42' },
        ].map(s=>(
          <div key={s.label} style={{ background:'rgba(10,12,18,1)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'12px' }}>
            <div style={{ color:s.color, fontWeight:800, fontSize:16, fontFamily:'Space Grotesk,sans-serif' }}>{s.val}</div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace', letterSpacing:1, marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Export buttons */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:'8px 14px' }}>
        <button onClick={handleExportGSTR1} style={{
          background:'linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,215,0,0.05))',
          border:'1px solid rgba(255,215,0,0.25)', borderRadius:16, padding:'14px 12px',
          color:'#FFD700', fontWeight:800, fontSize:12, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <Download size={16}/> Export GSTR-1
        </button>
        <button onClick={handleExportHSN} style={{
          background:'linear-gradient(135deg,rgba(0,229,255,0.1),rgba(0,229,255,0.03))',
          border:'1px solid rgba(0,229,255,0.2)', borderRadius:16, padding:'14px 12px',
          color:'#00E5FF', fontWeight:800, fontSize:12, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <Download size={16}/> HSN Summary
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, padding:'4px 14px 8px' }}>
        {[{id:'gstr1',label:'GSTR-1 Invoices'},{id:'hsn',label:'HSN Summary'},{id:'stock',label:'Stock GST'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:'6px 12px', borderRadius:10, fontSize:10, fontFamily:'monospace', fontWeight:700, cursor:'pointer',
            background:activeTab===t.id?'rgba(255,215,0,0.1)':'rgba(255,255,255,0.03)',
            border:activeTab===t.id?'1px solid rgba(255,215,0,0.25)':'1px solid rgba(255,255,255,0.06)',
            color:activeTab===t.id?'#FFD700':'rgba(255,255,255,0.3)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 14px 100px' }}>

        {/* GSTR-1 Invoices */}
        {activeTab==='gstr1' && (
          <>
            {gstr1Rows.length===0 ? (
              <EmptyState text={`${MONTHS[selMonth-1]} ${selYear} mein koi order nahi.`}/>
            ) : (
              <div style={{ background:'rgba(10,12,18,1)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:16, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 80px 80px', gap:8, padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.02)' }}>
                  {['Sr','Customer','Taxable','Total'].map(h=><span key={h} style={{ color:'rgba(255,255,255,0.2)',fontSize:9,fontFamily:'monospace',letterSpacing:1 }}>{h}</span>)}
                </div>
                {gstr1Rows.map((r,i)=>(
                  <div key={r.invoice_no} style={{ display:'grid', gridTemplateColumns:'32px 1fr 80px 80px', gap:8, padding:'10px 12px', borderBottom:i<gstr1Rows.length-1?'1px solid rgba(255,255,255,0.04)':'none', alignItems:'center' }}>
                    <span style={{ color:'rgba(255,255,255,0.3)',fontSize:10,fontFamily:'monospace' }}>{r.sr}</span>
                    <div>
                      <div style={{ color:'#fff',fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.customer}</div>
                      <div style={{ color:'rgba(255,255,255,0.3)',fontSize:9,fontFamily:'monospace' }}>{r.invoice_date}</div>
                    </div>
                    <span style={{ color:'rgba(255,255,255,0.5)',fontFamily:'monospace',fontSize:11 }}>₹{Math.round(r.taxable).toLocaleString('en-IN')}</span>
                    <span style={{ color:'#FFD700',fontFamily:'monospace',fontSize:11,fontWeight:700 }}>₹{Math.round(r.total).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {/* Total row */}
                <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 80px 80px', gap:8, padding:'10px 12px', background:'rgba(255,215,0,0.04)', borderTop:'1px solid rgba(255,215,0,0.1)' }}>
                  <span/>
                  <span style={{ color:'#FFD700',fontSize:11,fontWeight:800 }}>TOTAL ({totals.count} invoices)</span>
                  <span style={{ color:'rgba(255,255,255,0.6)',fontFamily:'monospace',fontSize:11 }}>₹{Math.round(totals.taxable).toLocaleString('en-IN')}</span>
                  <span style={{ color:'#FFD700',fontFamily:'monospace',fontSize:12,fontWeight:800 }}>₹{Math.round(totals.total).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* HSN Summary */}
        {activeTab==='hsn' && (
          <>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginBottom:12, lineHeight:1.6 }}>
              HSN-wise summary for GSTR-1 filing. CA ko yeh file bhejo — sab kuch ready hai.
            </div>
            {hsnSummary.length===0 ? (
              <EmptyState text="Koi data nahi is mahine mein."/>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {hsnSummary.map(h=>(
                  <div key={h.code} style={{ background:'rgba(10,12,18,1)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'14px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <div>
                        <div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>HSN {h.code}</div>
                        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{h.desc}</div>
                      </div>
                      <span style={{ background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.2)', color:'#FFD700', fontSize:10, fontFamily:'monospace', fontWeight:700, padding:'3px 10px', borderRadius:8 }}>
                        {h.gstPct}% GST
                      </span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                      {[
                        {label:'Taxable',val:fmt(h.taxable),color:'rgba(255,255,255,0.7)'},
                        {label:'CGST',   val:fmt(h.cgst),   color:'#FF8C42'},
                        {label:'SGST',   val:fmt(h.sgst),   color:'#FF8C42'},
                      ].map(s=>(
                        <div key={s.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'8px', textAlign:'center' }}>
                          <div style={{ color:s.color, fontWeight:700, fontSize:13, fontFamily:'monospace' }}>{s.val}</div>
                          <div style={{ color:'rgba(255,255,255,0.25)', fontSize:9, fontFamily:'monospace' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Stock GST */}
        {activeTab==='stock' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, lineHeight:1.6 }}>
              Current inventory ka GST breakdown — for internal accounting.
            </div>
            {[
              {label:'Total Taxable Value (Stock)',  val:fmt(stockGST.taxable), color:'#fff',    icon:'📦'},
              {label:'CGST on Stock',                val:fmt(stockGST.cgst),    color:'#FF8C42', icon:'📊'},
              {label:'SGST on Stock',                val:fmt(stockGST.sgst),    color:'#FF8C42', icon:'📊'},
              {label:'Grand Total (incl. GST)',       val:fmt(stockGST.total),   color:'#FFD700', icon:'💰'},
            ].map(s=>(
              <div key={s.label} style={{ background:'rgba(10,12,18,1)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:24 }}>{s.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11 }}>{s.label}</div>
                  <div style={{ color:s.color, fontWeight:800, fontSize:18, fontFamily:'Space Grotesk,sans-serif' }}>{s.val}</div>
                </div>
              </div>
            ))}

            {/* HSN-wise stock */}
            {Object.entries(stockGST.hsnMap).length > 0 && (
              <>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace', letterSpacing:2, marginTop:4 }}>HSN-WISE STOCK BREAKDOWN</div>
                {Object.entries(stockGST.hsnMap).map(([code,v])=>(
                  <div key={code} style={{ background:'rgba(10,12,18,1)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <span style={{ color:'#00E5FF', fontFamily:'monospace', fontSize:12, fontWeight:700 }}>HSN {code}</span>
                      <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginLeft:8 }}>{v.desc}</span>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ color:'#fff', fontFamily:'monospace', fontSize:12 }}>{fmt(v.taxable)}</div>
                      <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace' }}>{v.gstPct}% GST</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', gap:12 }}>
      <div style={{ fontSize:40, opacity:0.2 }}>📋</div>
      <p style={{ color:'rgba(255,255,255,0.2)', fontSize:13, textAlign:'center' }}>{text}</p>
    </div>
  )
}

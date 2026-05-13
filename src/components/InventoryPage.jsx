// ─── src/components/InventoryPage.jsx — Premium v4.0 ──────────────────────────
// UI: Screenshot-match. Logic: untouched.
import { useState, useMemo } from 'react'
import {
  Search, X, ChevronLeft, Edit2, Trash2, Save,
  AlertTriangle, Clock, CheckCircle, Plus, Download,
  SortAsc, ChevronDown, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getStockStatus, formatExpiry, getDaysToExpiry, formatCurrency
} from '../lib/stockUtils'

// ── Reuse from Dashboard ──────────────────────────────────────────────────────
function MedIcon({ name='', form='' }) {
  const n=(name+form).toLowerCase()
  let emoji='💊'; let bg='rgba(0,229,255,0.08)'; let border='rgba(0,229,255,0.2)'
  if (n.includes('syrup')||n.includes('liquid')||n.includes('ml'))        {emoji='🍶';bg='rgba(255,140,66,0.1)'; border='rgba(255,140,66,0.25)'}
  else if (n.includes('inject')||n.includes('iv')||n.includes('vial'))    {emoji='💉';bg='rgba(0,255,136,0.08)'; border='rgba(0,255,136,0.2)'}
  else if (n.includes('capsule')||n.includes('cap'))                       {emoji='🔴';bg='rgba(255,77,109,0.08)';border='rgba(255,77,109,0.2)'}
  else if (n.includes('cream')||n.includes('ointment')||n.includes('gel')){emoji='🧴';bg='rgba(139,92,246,0.08)';border='rgba(139,92,246,0.2)'}
  else if (n.includes('drop'))                                             {emoji='💧';bg='rgba(0,229,255,0.1)';  border='rgba(0,229,255,0.25)'}
  return (
    <div style={{ width:42,height:42,borderRadius:12,flexShrink:0, background:bg,border:`1px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>
      {emoji}
    </div>
  )
}

const BARCODE_H=[10,14,8,12,10,14,6,12,10,8,14,10,12,6,14,10,8,12]
function Barcode() {
  return (
    <div style={{ display:'flex',gap:1.5,alignItems:'flex-end',height:14,opacity:0.3 }}>
      {BARCODE_H.map((h,i)=><span key={i} style={{ display:'block',width:1.5,height:h,background:'rgba(255,255,255,0.8)',borderRadius:1 }}/>)}
    </div>
  )
}

function StatusChip({ status }) {
  const map = {
    ok:       { cls:'chip-in-stock',  label:'IN STOCK'      },
    low:      { cls:'chip-low-stock', label:'LOW STOCK'     },
    critical: { cls:'chip-critical',  label:'CRITICAL'      },
    out:      { cls:'chip-out',       label:'OUT OF STOCK'  },
    expiring: { cls:'chip-expiring',  label:'EXPIRING SOON' },
    expired:  { cls:'chip-expired',   label:'EXPIRED'       },
  }
  const s=map[status]||map.ok
  return <span className={s.cls}>{s.label}</span>
}

// ── Filter / Sort ─────────────────────────────────────────────────────────────
const FILTERS = [
  {id:'all',label:'All'},
  {id:'low',label:'Low Stock'},
  {id:'expiring',label:'Expiring'},
  {id:'expired',label:'Expired'},
  {id:'ok',label:'Healthy'},
]
const SORTS = [
  {id:'added_desc',label:'Recently Added'},
  {id:'name_asc',label:'Name A→Z'},
  {id:'name_desc',label:'Name Z→A'},
  {id:'qty_asc',label:'Qty Low→High'},
  {id:'qty_desc',label:'Qty High→Low'},
  {id:'expiry_asc',label:'Expiry Soon'},
]

function applyFilter(items,f) {
  switch(f) {
    case 'low':      return items.filter(i=>{const s=getStockStatus(i);return s==='low'||s==='critical'||s==='out'})
    case 'expiring': return items.filter(i=>{const d=getDaysToExpiry(i.expiry_date);return d!==null&&d>=0&&d<=90})
    case 'expired':  return items.filter(i=>{const d=getDaysToExpiry(i.expiry_date);return d!==null&&d<0})
    case 'ok':       return items.filter(i=>getStockStatus(i)==='ok')
    default:         return items
  }
}
function applySort(items,s) {
  const a=[...items]
  switch(s) {
    case 'name_asc':   return a.sort((x,y)=>x.medicine_name.localeCompare(y.medicine_name))
    case 'name_desc':  return a.sort((x,y)=>y.medicine_name.localeCompare(x.medicine_name))
    case 'qty_asc':    return a.sort((x,y)=>x.quantity-y.quantity)
    case 'qty_desc':   return a.sort((x,y)=>y.quantity-x.quantity)
    case 'expiry_asc': return a.sort((x,y)=>(getDaysToExpiry(x.expiry_date)??9999)-(getDaysToExpiry(y.expiry_date)??9999))
    default:           return a.sort((x,y)=>new Date(y.created_at||0)-new Date(x.created_at||0))
  }
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function InventoryPage({ items, onUpdate, onDelete, initialFilter='all', onBack }) {
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState(initialFilter)
  const [sort,       setSort]       = useState('added_desc')
  const [showSort,   setShowSort]   = useState(false)
  const [editId,     setEditId]     = useState(null)
  const [editData,   setEditData]   = useState({})
  const [saving,     setSaving]     = useState(false)
  const [delConf,    setDelConf]    = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [addData,    setAddData]    = useState({medicine_name:'',batch_no:'',expiry_date:'',quantity:'',unit_price:'',gst_percent:'12',supplier:'',low_stock_threshold:'50'})

  const processed = useMemo(()=>{
    let r=applyFilter(items,filter)
    if(search.trim()){const q=search.toLowerCase();r=r.filter(i=>i.medicine_name?.toLowerCase().includes(q)||i.batch_no?.toLowerCase().includes(q)||i.supplier?.toLowerCase().includes(q))}
    return applySort(r,sort)
  },[items,filter,search,sort])

  const stats = useMemo(()=>({
    total:    items.length,
    low:      items.filter(i=>{const s=getStockStatus(i);return s==='low'||s==='critical'}).length,
    expiring: items.filter(i=>{const d=getDaysToExpiry(i.expiry_date);return d!==null&&d>=0&&d<=90}).length,
    expired:  items.filter(i=>{const d=getDaysToExpiry(i.expiry_date);return d!==null&&d<0}).length,
    value:    items.reduce((s,i)=>s+i.quantity*(i.unit_price||0),0),
  }),[items])

  const startEdit=(item)=>{setEditId(item.id);setEditData({medicine_name:item.medicine_name,batch_no:item.batch_no||'',expiry_date:item.expiry_date||'',quantity:item.quantity,unit_price:item.unit_price||0,gst_percent:item.gst_percent||12,supplier:item.supplier||'',low_stock_threshold:item.low_stock_threshold||50})}

  const saveEdit=async()=>{
    setSaving(true)
    const u={...editData,quantity:parseInt(editData.quantity)||0,unit_price:parseFloat(editData.unit_price)||0,gst_percent:parseFloat(editData.gst_percent)||12,low_stock_threshold:parseInt(editData.low_stock_threshold)||50}
    const{error}=await onUpdate(editId,u)
    setSaving(false)
    if(error){toast.error('Save nahi hua');return}
    toast.success('Updated ✓'); setEditId(null)
  }

  const handleAdd=async()=>{
    if(!addData.medicine_name.trim()){toast.error('Medicine name required');return}
    const item={id:`${Date.now()}-manual`,medicine_name:addData.medicine_name.trim(),batch_no:addData.batch_no||null,expiry_date:addData.expiry_date||null,quantity:parseInt(addData.quantity)||0,unit_price:parseFloat(addData.unit_price)||0,gst_percent:parseFloat(addData.gst_percent)||12,supplier:addData.supplier||null,low_stock_threshold:parseInt(addData.low_stock_threshold)||50,source:'manual',created_at:new Date().toISOString()}
    await onUpdate(item.id,item)
    toast.success('Item added ✓'); setShowAdd(false)
    setAddData({medicine_name:'',batch_no:'',expiry_date:'',quantity:'',unit_price:'',gst_percent:'12',supplier:'',low_stock_threshold:'50'})
  }

  const exportCSV=()=>{
    const h=['Medicine Name','Batch No','Expiry','Qty','MRP','GST%','Supplier']
    const r=processed.map(i=>[i.medicine_name,i.batch_no||'',i.expiry_date||'',i.quantity,i.unit_price||0,i.gst_percent||'',i.supplier||''])
    const csv=[h,...r].map(row=>row.map(c=>`"${c}"`).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`cma-inventory-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); toast.success('CSV exported!')
  }

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#040407' }}>

      {/* Header */}
      <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ width:36,height:36,borderRadius:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <ChevronLeft size={18} color="rgba(255,255,255,0.6)"/>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'monospace', letterSpacing:3 }}>INVENTORY</div>
          <div style={{ color:'#fff', fontSize:20, fontFamily:'Space Grotesk,sans-serif', fontWeight:800, letterSpacing:1 }}>STOCK LIST</div>
        </div>
        <button onClick={exportCSV} style={{ width:36,height:36,borderRadius:12,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Download size={15} color="rgba(255,255,255,0.4)"/>
        </button>
        <button onClick={()=>setShowAdd(true)} style={{ display:'flex',alignItems:'center',gap:6,background:'rgba(0,229,255,0.1)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:12,padding:'8px 12px',cursor:'pointer' }}>
          <Plus size={14} color="#00E5FF"/>
          <span style={{ color:'#00E5FF', fontSize:11, fontFamily:'monospace', fontWeight:700 }}>ADD</span>
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display:'flex', gap:8, padding:'10px 14px', overflowX:'auto' }}>
        {[
          {label:'TOTAL',   val:stats.total,   color:'#fff'    },
          {label:'LOW',     val:stats.low,     color:'#FF8C42' },
          {label:'EXPIRING',val:stats.expiring,color:'#FF4D6D' },
          {label:'EXPIRED', val:stats.expired, color:'#FF4D6D' },
          {label:'VALUE',   val:formatCurrency(stats.value), color:'#FFD700'},
        ].map(s=>(
          <div key={s.label} style={{ flexShrink:0,background:'rgba(10,12,18,1)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'8px 12px',textAlign:'center' }}>
            <div style={{ color:s.color, fontWeight:800, fontSize:15, fontFamily:'Space Grotesk,sans-serif', lineHeight:1 }}>{s.val}</div>
            <div style={{ color:'rgba(255,255,255,0.25)', fontSize:8, fontFamily:'monospace', letterSpacing:1, marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + sort row */}
      <div style={{ display:'flex', gap:8, padding:'4px 14px 8px' }}>
        <div style={{ flex:1,display:'flex',alignItems:'center',gap:10,background:'rgba(10,12,18,1)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'10px 14px' }}>
          <Search size={14} color="rgba(255,255,255,0.25)" style={{ flexShrink:0 }}/>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Medicine ya batch search karo..."
            style={{ flex:1,background:'none',border:'none',outline:'none',color:'#fff',fontSize:13,placeholderColor:'rgba(255,255,255,0.2)' }}
          />
          {search&&<button onClick={()=>setSearch('')} style={{ background:'none',border:'none',cursor:'pointer' }}><X size={12} color="rgba(255,255,255,0.3)"/></button>}
        </div>
        <div style={{ position:'relative' }}>
          <button onClick={()=>setShowSort(!showSort)} style={{ height:'100%',padding:'0 12px',background:'rgba(10,12,18,1)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
            <SortAsc size={14} color="rgba(255,255,255,0.4)"/>
            <ChevronDown size={11} color="rgba(255,255,255,0.25)"/>
          </button>
          {showSort&&(
            <div style={{ position:'absolute',right:0,top:'calc(100% + 4px)',width:170,background:'#0A0C12',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,overflow:'hidden',zIndex:30,boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}>
              {SORTS.map(s=>(
                <button key={s.id} onClick={()=>{setSort(s.id);setShowSort(false)}} style={{ width:'100%',padding:'10px 14px',background:sort===s.id?'rgba(0,229,255,0.08)':'none',border:'none',cursor:'pointer',textAlign:'left',color:sort===s.id?'#00E5FF':'rgba(255,255,255,0.4)',fontSize:11,fontFamily:'monospace' }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, padding:'0 14px 10px', overflowX:'auto' }}>
        {FILTERS.map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)} style={{ flexShrink:0,padding:'6px 14px',borderRadius:20,fontSize:10,fontFamily:'monospace',fontWeight:700,cursor:'pointer',transition:'all 0.2s',
            background:filter===f.id?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',
            border:filter===f.id?'1px solid rgba(0,229,255,0.25)':'1px solid rgba(255,255,255,0.06)',
            color:filter===f.id?'#00E5FF':'rgba(255,255,255,0.3)',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex:1,overflowY:'auto',padding:'0 14px 100px' }}>
        {processed.length===0 ? (
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 0',gap:12 }}>
            <div style={{ fontSize:40,opacity:0.2 }}>📦</div>
            <p style={{ color:'rgba(255,255,255,0.2)',fontSize:13 }}>{search?`"${search}" nahi mila`:'Koi item nahi is filter mein'}</p>
          </div>
        ) : (
          <div style={{ background:'rgba(10,12,18,1)',borderRadius:16,overflow:'hidden',border:'1px solid rgba(255,255,255,0.05)' }}>
            {/* Table header */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 80px 60px 90px',padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.02)' }}>
              {['MEDICINE','BATCH NO.','QTY','STATUS'].map(h=>(
                <span key={h} style={{ color:'rgba(255,255,255,0.2)',fontSize:9,fontFamily:'monospace',letterSpacing:1 }}>{h}</span>
              ))}
            </div>

            {processed.map((item,i) => {
              const status=getStockStatus(item)
              const days=getDaysToExpiry(item.expiry_date)
              const isExpired=days!==null&&days<0
              const isUrgent=days!==null&&days>=0&&days<=30
              const qtyColor = status==='expired'||status==='out'?'#FF4D6D':status==='low'||status==='critical'||status==='expiring'?'#FF8C42':'#00FF88'

              if(editId===item.id) {
                return (
                  <div key={item.id} style={{ padding:'14px',borderBottom:i<processed.length-1?'1px solid rgba(255,255,255,0.04)':'none',background:'rgba(0,229,255,0.03)',borderLeft:'2px solid rgba(0,229,255,0.3)' }}>
                    <div style={{ color:'rgba(0,229,255,0.6)',fontSize:9,fontFamily:'monospace',letterSpacing:2,marginBottom:10 }}>EDITING</div>
                    <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                      <EF label="Medicine Name" value={editData.medicine_name} onChange={v=>setEditData(p=>({...p,medicine_name:v}))}/>
                      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                        <EF label="Batch No"  value={editData.batch_no}    onChange={v=>setEditData(p=>({...p,batch_no:v}))}/>
                        <EF label="Expiry"    value={editData.expiry_date} onChange={v=>setEditData(p=>({...p,expiry_date:v}))} type="date"/>
                      </div>
                      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                        <EF label="Qty"     value={editData.quantity}   onChange={v=>setEditData(p=>({...p,quantity:v}))}   type="number"/>
                        <EF label="MRP (₹)" value={editData.unit_price} onChange={v=>setEditData(p=>({...p,unit_price:v}))} type="number"/>
                      </div>
                      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                        <EF label="GST %" value={editData.gst_percent}         onChange={v=>setEditData(p=>({...p,gst_percent:v}))}         type="number"/>
                        <EF label="Min"   value={editData.low_stock_threshold} onChange={v=>setEditData(p=>({...p,low_stock_threshold:v}))} type="number"/>
                      </div>
                      <EF label="Supplier" value={editData.supplier} onChange={v=>setEditData(p=>({...p,supplier:v}))}/>
                    </div>
                    <div style={{ display:'flex',gap:8,marginTop:12 }}>
                      <button onClick={saveEdit} disabled={saving} style={{ flex:1,background:'linear-gradient(135deg,#00B8D9,#0070F3)',border:'none',borderRadius:12,padding:'10px',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:saving?0.6:1 }}>
                        {saving?<span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite' }}/>:<Save size={14}/>} Save
                      </button>
                      <button onClick={()=>setEditId(null)} style={{ flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'10px',color:'rgba(255,255,255,0.4)',fontSize:13,cursor:'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={item.id} style={{ display:'grid',gridTemplateColumns:'1fr 80px 60px 90px',padding:'12px 14px',alignItems:'center',borderBottom:i<processed.length-1?'1px solid rgba(255,255,255,0.04)':'none',cursor:'pointer',transition:'background 0.15s',position:'relative' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.015)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  {/* Medicine */}
                  <div style={{ display:'flex',alignItems:'center',gap:10,minWidth:0 }}>
                    <MedIcon name={item.medicine_name} form={item.form}/>
                    <div style={{ minWidth:0 }}>
                      <div style={{ color:'#fff',fontSize:13,fontWeight:600,lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.medicine_name}</div>
                      <div style={{ color:'rgba(255,255,255,0.3)',fontSize:10,marginTop:1 }}>{item.form||'Tablet'}</div>
                    </div>
                  </div>

                  {/* Batch */}
                  <div>
                    <div style={{ color:'rgba(255,255,255,0.45)',fontSize:10,fontFamily:'monospace',marginBottom:3 }}>{item.batch_no||'—'}</div>
                    <Barcode/>
                  </div>

                  {/* Qty */}
                  <div style={{ color:qtyColor,fontSize:14,fontFamily:'Space Grotesk,sans-serif',fontWeight:700,textShadow:`0 0 10px ${qtyColor}60` }}>
                    {(item.quantity||0).toLocaleString('en-IN')}
                  </div>

                  {/* Status */}
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                    <StatusChip status={status}/>
                  </div>

                  {/* Edit/Delete hover overlay */}
                  <div style={{ position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',display:'flex',gap:4,opacity:0,transition:'opacity 0.15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.opacity='1';e.currentTarget.parentElement.style.background='rgba(255,255,255,0.015)'}}
                    onMouseLeave={e=>{e.currentTarget.style.opacity='0'}}
                  >
                    <button onClick={()=>startEdit(item)} style={{ width:28,height:28,borderRadius:8,background:'rgba(0,229,255,0.1)',border:'1px solid rgba(0,229,255,0.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <Edit2 size={12} color="#00E5FF"/>
                    </button>
                    <button onClick={()=>setDelConf(item)} style={{ width:28,height:28,borderRadius:8,background:'rgba(255,77,109,0.08)',border:'1px solid rgba(255,77,109,0.15)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <Trash2 size={12} color="#FF4D6D"/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',zIndex:50,display:'flex',alignItems:'flex-end',padding:12 }} onClick={()=>setShowAdd(false)}>
          <div style={{ width:'100%',maxWidth:400,margin:'0 auto',background:'#0A0C12',border:'1px solid rgba(0,229,255,0.15)',borderRadius:24,overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 20px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color:'#fff',fontWeight:700,fontSize:16 }}>Add New Item</span>
              <button onClick={()=>setShowAdd(false)} style={{ width:30,height:30,borderRadius:8,background:'rgba(255,255,255,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={14} color="#fff"/></button>
            </div>
            <div style={{ padding:'16px 20px',maxHeight:'65vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:10 }}>
              {[['Medicine Name *','medicine_name','e.g. Paracetamol 500mg','text'],['Batch No','batch_no','e.g. BT2401','text'],['Expiry Date','expiry_date','','date'],['Quantity','quantity','0','number'],['MRP / Unit Price (₹)','unit_price','0.00','number'],['GST %','gst_percent','12','number'],['Supplier','supplier','e.g. Cipla','text'],['Min Stock (Reorder)','low_stock_threshold','50','number']].map(([label,key,ph,type])=>(
                <div key={key}>
                  <div style={{ color:'rgba(255,255,255,0.3)',fontSize:9,fontFamily:'monospace',letterSpacing:2,marginBottom:5 }}>{label.toUpperCase()}</div>
                  <input type={type} value={addData[key]} onChange={e=>setAddData(p=>({...p,[key]:e.target.value}))} placeholder={ph}
                    style={{ width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'10px 14px',color:'#fff',fontSize:13,outline:'none' }}/>
                </div>
              ))}
            </div>
            <div style={{ padding:'12px 20px 20px' }}>
              <button onClick={handleAdd} style={{ width:'100%',background:'linear-gradient(135deg,#00B8D9,#0070F3)',border:'none',borderRadius:14,padding:'14px',color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer' }}>
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delConf&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:24 }} onClick={()=>setDelConf(null)}>
          <div style={{ width:'100%',maxWidth:320,background:'#0A0C12',border:'1px solid rgba(255,77,109,0.2)',borderRadius:24,padding:28,textAlign:'center' }} onClick={e=>e.stopPropagation()}>
            <div style={{ width:56,height:56,borderRadius:16,background:'rgba(255,77,109,0.1)',border:'1px solid rgba(255,77,109,0.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
              <Trash2 size={24} color="#FF4D6D"/>
            </div>
            <p style={{ color:'#fff',fontWeight:700,fontSize:16,marginBottom:6 }}>Delete Item?</p>
            <p style={{ color:'rgba(255,255,255,0.3)',fontSize:13,marginBottom:20 }}>"{delConf.medicine_name}" permanently delete ho jayega.</p>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setDelConf(null)} style={{ flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'12px',color:'rgba(255,255,255,0.4)',fontSize:13,cursor:'pointer' }}>Cancel</button>
              <button onClick={async()=>{await onDelete(delConf.id);toast.success('Deleted');setDelConf(null)}} style={{ flex:1,background:'rgba(255,77,109,0.15)',border:'1px solid rgba(255,77,109,0.3)',borderRadius:14,padding:'12px',color:'#FF4D6D',fontWeight:800,fontSize:13,cursor:'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function EF({ label, value, onChange, type='text' }) {
  return (
    <div>
      <div style={{ color:'rgba(255,255,255,0.25)',fontSize:9,fontFamily:'monospace',letterSpacing:2,marginBottom:4 }}>{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:10,padding:'8px 12px',color:'#fff',fontSize:13,outline:'none' }}/>
    </div>
  )
}

// Dashboard Phase 4 patch — adds WhatsApp Invoice + Print to order cards
// Replace the existing OrderCard and OrderDetailModal functions in Dashboard.jsx
// Also adds invoiceGenerator imports at top of file

// ── ADD these imports at the top of Dashboard.jsx ──
// import { shareInvoiceWhatsApp, printInvoice, getNextInvoiceNo } from '../lib/invoiceGenerator'
// import { MessageCircle, Printer } from 'lucide-react'

// ── REPLACE OrderCard function with this version ──
export function OrderCardPhase4({ order, isUpdating, onOpen, onStatusChange }) {
  const nextStatus = { pending:'processing', processing:'delivered' }[order.status]
  const sc = { pending:'#F59E0B', processing:'#3B82F6', delivered:'#00FF88', cancelled:'#FF4D6D' }[order.status] || '#888'

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid rgba(255,255,255,0.06)', borderLeft:`3px solid ${sc}`, borderRadius:14, marginBottom:8, overflow:'hidden' }}>
      <button onClick={onOpen} style={{ width:'100%', padding:'12px 14px', textAlign:'left', background:'none', border:'none', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
              <span style={{ color:'#fff', fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{order.customer_name}</span>
              <span style={{ flexShrink:0, background:`${sc}20`, color:sc, fontSize:9, fontFamily:'monospace', fontWeight:700, padding:'2px 7px', borderRadius:6 }}>{order.status?.toUpperCase()}</span>
            </div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'monospace' }}>
              {order.salesman_name} · {order.items?.length} items · {new Date(order.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
            </div>
            <div style={{ color:'rgba(255,255,255,0.2)', fontSize:10, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {order.items?.slice(0,3).map(i=>i.medicine_name).join(', ')}
              {order.items?.length>3 && ` +${order.items.length-3} more`}
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            {order.order_value>0 && <div style={{ color:'#FFD700', fontFamily:'monospace', fontSize:11, fontWeight:700 }}>₹{Math.round(order.order_value).toLocaleString('en-IN')}</div>}
            {order.commission>0  && <div style={{ color:'#00FF88', fontFamily:'monospace', fontSize:9 }}>₹{Math.round(order.commission)} comm</div>}
          </div>
        </div>
      </button>

      {/* Action buttons row */}
      <div style={{ display:'flex', gap:6, padding:'0 14px 12px' }}>
        {nextStatus && !['delivered','cancelled'].includes(order.status) && (
          <button onClick={() => onStatusChange(order.id, nextStatus)} disabled={isUpdating}
            style={{ flex:1, padding:'8px', borderRadius:10, fontSize:10, fontFamily:'monospace', fontWeight:700, cursor:'pointer', border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              background: nextStatus==='processing' ? 'rgba(59,130,246,0.15)' : 'rgba(0,255,136,0.12)',
              color: nextStatus==='processing' ? '#3B82F6' : '#00FF88', opacity: isUpdating ? 0.5 : 1 }}>
            {isUpdating
              ? <span style={{ width:12,height:12,border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block'}}/>
              : '🚚'
            }
            {nextStatus==='processing' ? '→ Processing' : '→ Delivered'}
          </button>
        )}
        {/* WhatsApp Invoice */}
        <button
          onClick={(e) => { e.stopPropagation(); shareInvoiceWhatsApp(order, order.invoice_no || getNextInvoiceNo()) }}
          style={{ padding:'8px 12px', borderRadius:10, fontSize:10, fontFamily:'monospace', background:'rgba(37,211,102,0.12)', color:'#25D366', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontWeight:700 }}>
          💬 Invoice
        </button>
        {!['delivered','cancelled'].includes(order.status) && (
          <button onClick={() => onStatusChange(order.id,'cancelled')} disabled={isUpdating}
            style={{ padding:'8px 10px', borderRadius:10, fontSize:10, background:'rgba(255,77,109,0.1)', color:'#FF4D6D', border:'none', cursor:'pointer' }}>✕</button>
        )}
      </div>
    </div>
  )
}

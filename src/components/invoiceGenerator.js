// ─── src/lib/invoiceGenerator.js — Phase 4 WhatsApp PDF Invoice ──────────────
// Generates professional HTML invoice → PDF → WhatsApp share
// Uses browser print API (no server needed) + html2canvas fallback

// ── Invoice number generator ──────────────────────────────────────────────────
let localCounter = parseInt(localStorage.getItem('cma_inv_counter') || '1000')
export function getNextInvoiceNo() {
  localCounter++
  localStorage.setItem('cma_inv_counter', localCounter.toString())
  const yr = new Date().getFullYear().toString().slice(-2)
  return `CMA/${yr}/${localCounter}`
}

// ── Generate invoice HTML ─────────────────────────────────────────────────────
export function generateInvoiceHTML(order, invoiceNo) {
  const date = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  const items = order.items || []
  const subtotal = items.reduce((s, i) => s + (i.qty || 1) * (i.unit_price || 0), 0)
  const gstAmt   = subtotal * 0.12
  const total    = subtotal + gstAmt

  const itemRows = items.map((item, i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #1a1a2e;color:#e2e8f0;font-size:13px;">${i+1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1a1a2e;color:#e2e8f0;font-size:13px;font-weight:600;">${item.medicine_name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1a1a2e;color:#94a3b8;font-size:12px;text-align:center;">${item.unit || 'Strip'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1a1a2e;color:#00e5ff;font-size:13px;text-align:center;font-weight:700;">${item.qty || 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1a1a2e;color:#94a3b8;font-size:12px;text-align:right;">${item.unit_price > 0 ? '₹' + item.unit_price.toFixed(2) : '—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1a1a2e;color:#ffd700;font-size:13px;text-align:right;font-weight:700;">${item.unit_price > 0 ? '₹' + ((item.qty||1)*item.unit_price).toFixed(2) : '—'}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${invoiceNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Space+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#070711;color:#e2e8f0;font-family:'DM Sans',sans-serif;min-height:100vh;padding:20px}
  .invoice{max-width:680px;margin:0 auto;background:#0a0c14;border:1px solid rgba(0,229,255,0.15);border-radius:20px;overflow:hidden;box-shadow:0 0 60px rgba(0,229,255,0.06)}
  .header{background:linear-gradient(135deg,#0a0c1e 0%,#0d1030 60%,#08080f 100%);padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);position:relative;overflow:hidden}
  .header::before{content:'';position:absolute;top:-40%;right:-10%;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(0,229,255,0.06),transparent);pointer-events:none}
  .header-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
  .company-name{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:800;color:#fff;letter-spacing:2px;margin-bottom:4px}
  .company-sub{color:rgba(0,229,255,0.5);font-size:10px;font-family:'JetBrains Mono',monospace;letter-spacing:3px}
  .invoice-badge{background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.25);border-radius:12px;padding:12px 18px;text-align:right}
  .invoice-label{color:rgba(255,255,255,0.3);font-size:9px;font-family:'JetBrains Mono',monospace;letter-spacing:3px;margin-bottom:4px}
  .invoice-no{color:#00e5ff;font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:800}
  .header-meta{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .meta-block label{color:rgba(255,255,255,0.3);font-size:9px;font-family:'JetBrains Mono',monospace;letter-spacing:2px;display:block;margin-bottom:4px}
  .meta-block .val{color:#fff;font-weight:600;font-size:13px}
  .body{padding:24px 32px}
  .section-label{color:rgba(255,255,255,0.25);font-size:9px;font-family:'JetBrains Mono',monospace;letter-spacing:3px;margin-bottom:12px}
  .bill-to{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px 18px;margin-bottom:20px}
  .bill-to .name{color:#fff;font-weight:700;font-size:15px;margin-bottom:4px}
  .bill-to .sub{color:rgba(255,255,255,0.4);font-size:12px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  thead tr{background:rgba(0,229,255,0.06);border-bottom:1px solid rgba(0,229,255,0.15)}
  thead th{padding:10px 12px;color:rgba(255,255,255,0.4);font-size:9px;font-family:'JetBrains Mono',monospace;letter-spacing:1px;font-weight:600;text-align:left}
  thead th:last-child{text-align:right}
  .totals{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px 20px;display:flex;flex-direction:column;gap:8px;margin-bottom:20px}
  .total-row{display:flex;justify-content:space-between;align-items:center}
  .total-label{color:rgba(255,255,255,0.4);font-size:12px}
  .total-val{color:rgba(255,255,255,0.7);font-family:'JetBrains Mono',monospace;font-size:12px}
  .grand-total .total-label{color:#fff;font-weight:800;font-size:14px}
  .grand-total .total-val{color:#ffd700;font-weight:800;font-size:18px;font-family:'Space Grotesk',sans-serif}
  .divider{height:1px;background:rgba(255,255,255,0.06);margin:4px 0}
  .footer{padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center}
  .footer-note{color:rgba(255,255,255,0.2);font-size:11px;line-height:1.6}
  .footer-brand{color:rgba(0,229,255,0.3);font-size:10px;font-family:'JetBrains Mono',monospace}
  .salesman-tag{background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.15);border-radius:10px;padding:8px 14px;margin-bottom:16px}
  .salesman-tag span{color:#ffd700;font-size:11px;font-family:'JetBrains Mono',monospace}
  @media print{body{background:#070711;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div class="header-top">
      <div>
        <div class="company-name">CAPITAL MEDICAL AGENCY</div>
        <div class="company-sub">SMARTER INVENTORY · AI POWERED</div>
      </div>
      <div class="invoice-badge">
        <div class="invoice-label">INVOICE NO.</div>
        <div class="invoice-no">${invoiceNo}</div>
      </div>
    </div>
    <div class="header-meta">
      <div class="meta-block"><label>DATE</label><div class="val">${date}</div></div>
      <div class="meta-block"><label>STATUS</label><div class="val" style="color:#00ff88">✓ CONFIRMED</div></div>
      <div class="meta-block"><label>ADDRESS</label><div class="val">Bhopal, Madhya Pradesh</div></div>
      <div class="meta-block"><label>GSTIN</label><div class="val" style="color:rgba(255,255,255,0.4)">On request</div></div>
    </div>
  </div>

  <div class="body">
    <div class="section-label">BILL TO</div>
    <div class="bill-to">
      <div class="name">${order.customer_name || 'Walk-in Customer'}</div>
      ${order.customer_gstin ? `<div class="sub">GSTIN: ${order.customer_gstin}</div>` : ''}
      ${order.customer_area  ? `<div class="sub">${order.customer_area}</div>` : ''}
    </div>

    ${order.salesman_name ? `
    <div class="salesman-tag">
      <span>👤 Salesman: ${order.salesman_name}</span>
    </div>` : ''}

    <div class="section-label">ORDER ITEMS</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Medicine</th><th>Unit</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Rate</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    ${subtotal > 0 ? `
    <div class="totals">
      <div class="total-row"><span class="total-label">Subtotal</span><span class="total-val">₹${subtotal.toFixed(2)}</span></div>
      <div class="total-row"><span class="total-label">CGST (6%)</span><span class="total-val">₹${(gstAmt/2).toFixed(2)}</span></div>
      <div class="total-row"><span class="total-label">SGST (6%)</span><span class="total-val">₹${(gstAmt/2).toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="total-row grand-total"><span class="total-label">TOTAL</span><span class="total-val">₹${total.toFixed(2)}</span></div>
    </div>` : ''}
  </div>

  <div class="footer">
    <div class="footer-note">
      Thank you for your business!<br/>
      Capital Medical Agency, Bhopal · CMA AI OS
    </div>
    <div class="footer-brand">CMA AI OS v4.0</div>
  </div>
</div>
</body>
</html>`
}

// ── Print as PDF ──────────────────────────────────────────────────────────────
export function printInvoice(order, invoiceNo) {
  const html    = generateInvoiceHTML(order, invoiceNo)
  const win     = window.open('', '_blank')
  if (!win) { alert('Popup blocked! Allow popups for this site.'); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => { win.focus(); win.print() }
}

// ── Share via WhatsApp ────────────────────────────────────────────────────────
export function shareInvoiceWhatsApp(order, invoiceNo) {
  const date   = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN')
  const items  = (order.items || []).map(i => `• ${i.medicine_name} ×${i.qty || 1}`).join('\n')
  const total  = (order.items || []).reduce((s, i) => s + (i.qty || 1) * (i.unit_price || 0), 0)

  const msg = `🏥 *CAPITAL MEDICAL AGENCY*
_Smarter Inventory · AI Powered_

📄 *Invoice: ${invoiceNo}*
📅 Date: ${date}

*Customer:* ${order.customer_name || 'Walk-in'}
*Salesman:* ${order.salesman_name || '—'}

*Items Ordered:*
${items}

${total > 0 ? `💰 *Est. Total: ₹${Math.round(total * 1.12).toLocaleString('en-IN')}* (incl. 12% GST)` : ''}

_Thank you for your business!_
_Capital Medical Agency, Bhopal_`

  const phone   = order.customer_phone?.replace(/\D/g,'') || ''
  const encoded = encodeURIComponent(msg)
  const url     = phone
    ? `https://wa.me/${phone.startsWith('91') ? phone : '91'+phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`

  window.open(url, '_blank')
}

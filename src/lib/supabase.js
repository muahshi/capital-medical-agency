// ─── src/lib/supabase.js — Production v3.0 ───────────────────────────────────
import { createClient } from '@supabase/supabase-js'

const SB_URL = import.meta.env.VITE_SUPABASE_URL
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const HAS_SUPABASE = !!(SB_URL && SB_KEY && !SB_URL.includes('placeholder'))

export const supabase = HAS_SUPABASE
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })
  : null

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SESSION_KEY = 'cma_session_token'
const getToken    = () => localStorage.getItem(SESSION_KEY)
const genToken    = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g,'') + Date.now().toString(36)
const deviceInfo  = () => navigator.userAgent.slice(0, 120)

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export async function loginWithCode(code) {
  if (!HAS_SUPABASE) {
    if (code.trim() === 'CMA@2024') {
      localStorage.setItem('cma_admin_auth', 'true')
      return { success: true, user: { role: 'admin', label: 'Admin (Offline)', token: 'local' } }
    }
    return { success: false, error: 'Supabase connected nahi hai. Admin code: CMA@2024' }
  }
  const { data: row, error } = await supabase
    .from('app_auth').select('id,role,label,city,avatar,color,is_active')
    .eq('code', code.trim()).single()
  if (error || !row) return { success: false, error: 'Galat code! Admin se sahi code lo.' }
  if (!row.is_active) return { success: false, error: 'Yeh code band kar diya gaya hai.' }
  const tok = genToken()
  await supabase.from('app_sessions').insert({
    auth_id: row.id, token: tok, role: row.role, label: row.label,
    device_info: deviceInfo(),
    expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString()
  })
  localStorage.setItem(SESSION_KEY, tok)
  return { success: true, user: { token: tok, role: row.role, label: row.label, city: row.city, avatar: row.avatar, color: row.color, authId: row.id } }
}

export async function verifySession() {
  const tok = getToken()
  if (!tok) {
    if (localStorage.getItem('cma_admin_auth') === 'true')
      return { valid: true, user: { role: 'admin', label: 'Admin', token: 'local' } }
    return { valid: false, reason: 'no_token' }
  }
  if (!HAS_SUPABASE) return { valid: true, user: { role: 'admin', label: 'Admin', token: tok } }
  const { data: s, error } = await supabase
    .from('app_sessions')
    .select('id,role,label,expires_at,app_auth(is_active,city,avatar,color,id)')
    .eq('token', tok).single()
  if (error || !s) { localStorage.removeItem(SESSION_KEY); return { valid: false, reason: 'invalid_token' } }
  if (new Date(s.expires_at) < new Date()) { await logoutSession(); return { valid: false, reason: 'expired' } }
  if (!s.app_auth?.is_active) { await logoutSession(); return { valid: false, reason: 'deactivated' } }
  supabase.from('app_sessions').update({ last_seen: new Date().toISOString() }).eq('token', tok)
  return { valid: true, user: { token: tok, role: s.role, label: s.label, city: s.app_auth?.city, avatar: s.app_auth?.avatar, color: s.app_auth?.color, authId: s.app_auth?.id } }
}

export async function logoutSession() {
  const tok = getToken()
  if (tok && HAS_SUPABASE) await supabase.from('app_sessions').delete().eq('token', tok)
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem('cma_admin_auth')
}

// ─── SALESMAN ─────────────────────────────────────────────────────────────────
export async function fetchSalesmanCodes() {
  if (!HAS_SUPABASE) return { data: [], error: null }
  const { data, error } = await supabase.from('app_auth').select('*').eq('role','salesman').order('created_at')
  return { data: data||[], error }
}

export async function createSalesmanCode({ label, city, avatar, color }) {
  if (!HAS_SUPABASE) return { error: { message: 'Supabase not connected' } }
  const code = `${label.slice(0,3).toUpperCase()}-${(city||'XX').slice(0,3).toUpperCase()}-${Math.floor(1000+Math.random()*9000)}`
  const { data, error } = await supabase.from('app_auth')
    .insert({ role:'salesman', code, label, city, avatar: avatar||label[0].toUpperCase(), color: color||'#F59E0B', is_active:true })
    .select().single()
  return { data, error, code }
}

export async function toggleSalesmanActive(id, is_active) {
  if (!HAS_SUPABASE) return { error: null }
  if (!is_active) await supabase.from('app_sessions').delete().eq('auth_id', id)
  const { data, error } = await supabase.from('app_auth').update({ is_active }).eq('id', id).select().single()
  return { data, error }
}

// ─── STOCK ────────────────────────────────────────────────────────────────────
export async function fetchStock() {
  if (!HAS_SUPABASE) return { data: null, error: null }
  const { data, error } = await supabase.from('medicines').select('*').order('created_at', { ascending: false })
  return { data, error }
}

export async function upsertStockItems(items) {
  if (!HAS_SUPABASE) return { data: null, error: null }
  const rows = items.map(i => ({
    id: i.id,
    medicine_name: i.medicine_name,
    batch_no: i.batch_no || null,
    expiry_date: i.expiry_date || null,
    quantity: i.quantity || 0,
    unit_price: i.unit_price || 0,
    gst_percent: i.gst_percent || null,
    supplier: i.supplier || null,
    low_stock_threshold: i.low_stock_threshold || 50,
    source: i.source || 'manual',
    updated_at: new Date().toISOString(),
  }))
  const { data, error } = await supabase.from('medicines').upsert(rows, { onConflict: 'id' }).select()
  return { data, error }
}

export async function updateStockItem(id, updates) {
  if (!HAS_SUPABASE) return { data: null, error: null }
  const { data, error } = await supabase.from('medicines')
    .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  return { data, error }
}

export async function deleteStockItem(id) {
  if (!HAS_SUPABASE) return { error: null }
  const { error } = await supabase.from('medicines').delete().eq('id', id)
  return { error }
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export async function fetchOrders() {
  if (!HAS_SUPABASE) return { data: null, error: null }
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  return { data, error }
}

export async function insertOrder(order) {
  if (!HAS_SUPABASE) return { data: null, error: null }
  const { data, error } = await supabase.from('orders').insert(order).select().single()
  return { data, error }
}

export async function updateOrderStatus(id, status) {
  if (!HAS_SUPABASE) return { error: null }
  const { data, error } = await supabase.from('orders')
    .update({ status, processed_at: status==='processed' ? new Date().toISOString() : null })
    .eq('id', id).select().single()
  return { data, error }
}

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
export async function fetchSuppliers() {
  if (!HAS_SUPABASE) return { data: [], error: null }
  const { data, error } = await supabase.from('suppliers').select('*').order('name')
  return { data: data||[], error }
}

export async function upsertSupplier(supplier) {
  if (!HAS_SUPABASE) return { error: null }
  const { data, error } = await supabase.from('suppliers')
    .upsert(supplier, { onConflict: 'id' }).select().single()
  return { data, error }
}

// ─── PURCHASE ORDERS ──────────────────────────────────────────────────────────
export async function fetchPurchaseOrders() {
  if (!HAS_SUPABASE) return { data: [], error: null }
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name, phone)')
    .order('created_at', { ascending: false })
  return { data: data||[], error }
}

export async function insertPurchaseOrder(po) {
  if (!HAS_SUPABASE) return { error: null }
  const { data, error } = await supabase.from('purchase_orders').insert(po).select().single()
  return { data, error }
}

// ─── REAL-TIME ────────────────────────────────────────────────────────────────
export function subscribeToOrders(callback) {
  if (!HAS_SUPABASE) return () => {}
  const ch = supabase.channel('orders-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe()
  return () => supabase.removeChannel(ch)
}

export function subscribeToStock(callback) {
  if (!HAS_SUPABASE) return () => {}
  const ch = supabase.channel('stock-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, callback)
    .subscribe()
  return () => supabase.removeChannel(ch)
}

// ─── AI INSIGHTS CACHE ────────────────────────────────────────────────────────
export async function saveAIInsight(type, content) {
  if (!HAS_SUPABASE) return
  await supabase.from('ai_insights')
    .upsert({ type, content, updated_at: new Date().toISOString() }, { onConflict: 'type' })
}

export async function loadAIInsight(type) {
  if (!HAS_SUPABASE) return null
  const { data } = await supabase.from('ai_insights')
    .select('content, updated_at').eq('type', type).single()
  return data
}

// ─── Legacy compat ────────────────────────────────────────────────────────────
export async function insertStockItems(items) { return upsertStockItems(items) }
export async function signOut() { await logoutSession(); window.location.reload() }
export async function getCurrentUser() { return null }
export async function saveScanLog() { return { error: null } }

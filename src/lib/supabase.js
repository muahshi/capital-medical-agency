// ─── src/lib/supabase.js ──────────────────────────────────────────────────────
// Real Supabase client with token-based auth
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[CMA] Supabase env vars missing — check .env.local')
}

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_KEY  || 'placeholder-key',
  { auth: { persistSession: false } }   // Hum apna token system use kar rahe hain
)

// ─── Token helpers ────────────────────────────────────────────────────────────
const SESSION_KEY = 'cma_session_token'

function generateToken() {
  return crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)
}

function getDeviceInfo() {
  return `${navigator.userAgent.slice(0, 80)} | ${new Date().toISOString()}`
}

// ─── LOGIN — code ko DB se match karo ────────────────────────────────────────
export async function loginWithCode(code) {
  const trimmed = code.trim()

  // 1. DB mein code aur is_active check karo
  const { data: authRow, error } = await supabase
    .from('app_auth')
    .select('id, role, label, city, avatar, color, is_active')
    .eq('code', trimmed)
    .single()

  if (error || !authRow) {
    return { success: false, error: 'Galat code! Admin se sahi code lo.' }
  }

  if (!authRow.is_active) {
    return { success: false, error: 'Yeh code band kar diya gaya hai. Admin se contact karo.' }
  }

  // 2. Session token generate karo aur DB mein save karo
  const token = generateToken()
  const { error: sessErr } = await supabase
    .from('app_sessions')
    .insert({
      auth_id:     authRow.id,
      token,
      role:        authRow.role,
      label:       authRow.label,
      device_info: getDeviceInfo(),
    })

  if (sessErr) {
    console.error('[CMA] Session create failed:', sessErr)
    return { success: false, error: 'Server error. Thodi der baad try karo.' }
  }

  // 3. Token localStorage mein save karo
  localStorage.setItem(SESSION_KEY, token)

  return {
    success: true,
    user: {
      token,
      role:   authRow.role,
      label:  authRow.label,
      city:   authRow.city,
      avatar: authRow.avatar,
      color:  authRow.color,
      authId: authRow.id,
    }
  }
}

// ─── SESSION VERIFY — har app open par check karo ────────────────────────────
export async function verifySession() {
  const token = localStorage.getItem(SESSION_KEY)
  if (!token) return { valid: false, reason: 'no_token' }

  // DB mein token exist karta hai? Expired to nahi?
  const { data: session, error } = await supabase
    .from('app_sessions')
    .select(`
      id, role, label, expires_at,
      app_auth ( is_active, city, avatar, color, id )
    `)
    .eq('token', token)
    .single()

  if (error || !session) {
    localStorage.removeItem(SESSION_KEY)
    return { valid: false, reason: 'invalid_token' }
  }

  // Expiry check
  if (new Date(session.expires_at) < new Date()) {
    await logoutSession()
    return { valid: false, reason: 'expired' }
  }

  // Auth row ka is_active check — agar admin ne disable kiya to auto-logout
  if (!session.app_auth?.is_active) {
    await logoutSession()
    return { valid: false, reason: 'deactivated' }
  }

  // last_seen update karo
  supabase.from('app_sessions').update({ last_seen: new Date().toISOString() }).eq('token', token)

  return {
    valid: true,
    user: {
      token,
      role:   session.role,
      label:  session.label,
      city:   session.app_auth?.city,
      avatar: session.app_auth?.avatar,
      color:  session.app_auth?.color,
      authId: session.app_auth?.id,
    }
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export async function logoutSession() {
  const token = localStorage.getItem(SESSION_KEY)
  if (token) {
    await supabase.from('app_sessions').delete().eq('token', token)
    localStorage.removeItem(SESSION_KEY)
  }
  // Salesman ke local order history bhi clear karo (optional)
}

// ─── STOCK helpers ────────────────────────────────────────────────────────────
export async function fetchStock() {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function insertStockItems(items) {
  const { data, error } = await supabase.from('medicines').insert(items).select()
  return { data, error }
}

export async function updateStockItem(id, updates) {
  const { data, error } = await supabase
    .from('medicines').update(updates).eq('id', id).select()
  return { data, error }
}

export async function deleteStockItem(id) {
  const { error } = await supabase.from('medicines').delete().eq('id', id)
  return { error }
}

// ─── ORDER helpers ────────────────────────────────────────────────────────────
export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function insertOrder(order) {
  const { data, error } = await supabase.from('orders').insert(order).select()
  return { data, error }
}

export async function updateOrderStatus(id, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, processed_at: new Date().toISOString() })
    .eq('id', id).select()
  return { data, error }
}

// ─── SALESMAN CODES — Admin panel ke liye ─────────────────────────────────────
export async function fetchSalesmanCodes() {
  const { data, error } = await supabase
    .from('app_auth')
    .select('id, role, code, label, city, avatar, color, is_active, created_at')
    .eq('role', 'salesman')
    .order('created_at', { ascending: true })
  return { data: data || [], error }
}

export async function createSalesmanCode({ label, city, avatar, color }) {
  // Random secure code generate karo
  const initials = label.slice(0, 3).toUpperCase()
  const cityCode  = (city || 'XX').slice(0, 3).toUpperCase()
  const randNum   = Math.floor(1000 + Math.random() * 9000)
  const code      = `${initials}-${cityCode}-${randNum}`

  const { data, error } = await supabase
    .from('app_auth')
    .insert({ role: 'salesman', code, label, city, avatar, color, is_active: true })
    .select()
    .single()

  return { data, error, code }
}

export async function toggleSalesmanActive(id, is_active) {
  // is_active = false → us salesman ke sare sessions delete → auto-logout
  if (!is_active) {
    // Pehle us auth_id ke sab sessions delete karo
    await supabase.from('app_sessions').delete().eq('auth_id', id)
  }
  const { data, error } = await supabase
    .from('app_auth')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// Legacy exports — purane imports ke liye
export async function signOut() { await logoutSession(); window.location.reload() }
export async function getCurrentUser() { return null }
export async function saveScanLog() { return { error: null } }

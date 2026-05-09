import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase env variables missing. Running in demo mode.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
)

// ─── Auth helpers ───────────────────────────────────────────────────────────

export async function signInWithMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    }
  })
  return { error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ─── Stock helpers ───────────────────────────────────────────────────────────

export async function fetchStock(userId) {
  const { data, error } = await supabase
    .from('retailer_stock')
    .select('*')
    .eq('retailer_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function insertStockItems(userId, items) {
  const rows = items.map(item => ({
    retailer_id: userId,
    medicine_name: item.medicine_name,
    batch_no: item.batch_no,
    expiry_date: item.expiry_date,
    quantity: parseInt(item.qty) || 0,
    unit_price: parseFloat(item.mrp) || 0,
    source: 'ai_scan',
    low_stock_threshold: 100,
  }))

  const { data, error } = await supabase
    .from('retailer_stock')
    .upsert(rows, { onConflict: 'retailer_id,medicine_name,batch_no' })
    .select()

  return { data, error }
}

export async function updateStockItem(id, updates) {
  const { data, error } = await supabase
    .from('retailer_stock')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
  return { data, error }
}

export async function deleteStockItem(id) {
  const { error } = await supabase
    .from('retailer_stock')
    .delete()
    .eq('id', id)
  return { error }
}

export async function saveScanLog(userId, extractedData, status = 'success') {
  const { error } = await supabase
    .from('scan_logs')
    .insert({
      user_id: userId,
      scan_type: 'invoice',
      extracted_data: extractedData,
      status,
    })
  return { error }
}

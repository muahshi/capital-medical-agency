// ─── Supabase REMOVED ────────────────────────────────────────────────────────
// Auth ab sirf localStorage se handle hoti hai (CMA@2024 secret key)
// Ye file sirf isliye hai taaki purane imports break na hon

// Dummy supabase object — koi bhi call gracefully fail hogi, crash nahi
export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
    insert: () => Promise.resolve({ data: null, error: null }),
    upsert: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
    update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }),
}

// Auth helpers — ye sab ab kuch nahi karte
export async function signInWithMagicLink() { return { error: null } }
export async function signOut() {
  localStorage.removeItem('cma_admin_auth')
  window.location.reload()
  return { error: null }
}
export async function getCurrentUser() { return null }

// Stock helpers — demo mode mein kaam karte hain
export async function fetchStock() { return { data: [], error: null } }
export async function insertStockItems() { return { data: [], error: null } }
export async function updateStockItem() { return { data: null, error: null } }
export async function deleteStockItem() { return { error: null } }
export async function saveScanLog() { return { error: null } }

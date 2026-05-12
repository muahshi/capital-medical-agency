-- ============================================================
-- CAPITAL MEDICAL AGENCY v2.0 - SUPABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'retailer' CHECK (role IN ('wholesaler', 'retailer')),
  business_name TEXT NOT NULL DEFAULT 'My Store',
  owner_name TEXT NOT NULL DEFAULT 'Owner',
  phone TEXT,
  address TEXT,
  low_stock_threshold INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RETAILER STOCK ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retailer_stock (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retailer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  category TEXT DEFAULT 'General' CHECK (category IN ('Antibiotic', 'Painkiller', 'Vitamin', 'Syrup', 'Injection', 'General')),
  batch_no TEXT,
  expiry_date DATE,
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 100,
  unit_price DECIMAL(10,2) DEFAULT 0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai_scan', 'order', 'bulk_import')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (retailer_id, medicine_name, batch_no)
);

-- ── SCAN LOGS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  scan_type TEXT NOT NULL DEFAULT 'invoice',
  extracted_data JSONB,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SUPPLIERS (Phase 1) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retailer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  outstanding_balance DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (retailer_id, supplier_name)
);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE retailer_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (id = auth.uid());

-- Stock
CREATE POLICY "Retailers manage own stock" ON retailer_stock FOR ALL USING (retailer_id = auth.uid());

-- Scan logs
CREATE POLICY "Users see own scan logs" ON scan_logs FOR ALL USING (user_id = auth.uid());

-- Suppliers
CREATE POLICY "Retailers manage own suppliers" ON suppliers FOR ALL USING (retailer_id = auth.uid());

-- ── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, business_name, owner_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'retailer'),
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Store'),
    COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Owner')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── SAMPLE DATA (optional) ─────────────────────────────────
-- Uncomment after first login to populate your inventory:
/*
INSERT INTO retailer_stock (retailer_id, medicine_name, batch_no, expiry_date, quantity, unit_price, source)
SELECT
  auth.uid(),
  medicine_name, batch_no, expiry_date::DATE, quantity, unit_price, 'manual'
FROM (VALUES
  ('Paracetamol 650mg', 'PAR65023A', '2026-05-31', 12450, 2.50),
  ('Amoxicillin 500mg', 'AMX50024B', '2025-09-30', 5320, 8.75),
  ('Cetirizine 10mg', 'CET1024C', '2025-07-31', 2150, 3.20),
  ('Ambroxol Syrup 100ml', 'AMBX0424D', '2025-06-30', 1080, 45.00),
  ('Pantoprazole 40mg', 'PANT4024E', '2026-11-30', 3600, 5.20)
) AS t(medicine_name, batch_no, expiry_date, quantity, unit_price);
*/

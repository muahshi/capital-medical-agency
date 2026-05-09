// ─── useStock — LocalStorage based, No Supabase ──────────────────────────────
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'cma_inventory_items';

const DEMO_ITEMS = [
  { id: '1', medicine_name: 'Paracetamol 650mg', batch_no: 'PAR65023A', expiry_date: '2026-05-31', quantity: 12450, unit_price: 2.50, low_stock_threshold: 1000, source: 'manual' },
  { id: '2', medicine_name: 'Amoxicillin 500mg', batch_no: 'AMX50024B', expiry_date: '2025-09-30', quantity: 5320, unit_price: 8.75, low_stock_threshold: 5000, source: 'ai_scan' },
  { id: '3', medicine_name: 'Pantoprazole 40mg', batch_no: 'PANT4024E', expiry_date: '2026-11-30', quantity: 3600, unit_price: 5.20, low_stock_threshold: 500, source: 'ai_scan' },
];

function loadItems() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  // Pehli baar — demo data save karo
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_ITEMS));
  return DEMO_ITEMS;
}

function saveItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {}
}

export const useStock = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setItems(loadItems());
    setLoading(false);
  }, []);

  const addItems = async (newItems) => {
    const rows = newItems.map((item, i) => ({
      id: Date.now() + '-' + i,
      medicine_name: item.medicine_name,
      batch_no: item.batch_no || null,
      expiry_date: item.expiry_date || null,
      quantity: parseInt(item.qty) || 0,
      unit_price: parseFloat(item.mrp) || 0,
      source: 'ai_scan',
      low_stock_threshold: 100,
    }));

    setItems(prev => {
      const updated = [...prev, ...rows];
      saveItems(updated);
      return updated;
    });
    return { data: rows, error: null };
  };

  const updateItem = async (id, updates) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, ...updates } : i);
      saveItems(updated);
      return updated;
    });
    return { data: null, error: null };
  };

  const removeItem = async (id) => {
    setItems(prev => {
      const updated = prev.filter(i => i.id !== id);
      saveItems(updated);
      return updated;
    });
    return { error: null };
  };

  return { items, loading, addItems, updateItem, removeItem };
};

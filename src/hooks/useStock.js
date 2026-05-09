import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useStock = (userId) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      // Demo mode - fake data
      setItems([
        { id: '1', medicine_name: 'Paracetamol 650mg', batch_no: 'PAR65023A', expiry_date: '2026-05-31', quantity: 12450, unit_price: 2.50, low_stock_threshold: 1000, source: 'manual' },
        { id: '2', medicine_name: 'Amoxicillin 500mg', batch_no: 'AMX50024B', expiry_date: '2025-09-30', quantity: 5320, unit_price: 8.75, low_stock_threshold: 5000, source: 'ai_scan' },
        { id: '3', medicine_name: 'Pantoprazole 40mg', batch_no: 'PANT4024E', expiry_date: '2026-11-30', quantity: 3600, unit_price: 5.20, low_stock_threshold: 500, source: 'ai_scan' },
      ]);
      return;
    }

    // Real user - fetch from Supabase
    fetchItems();
  }, [userId]);

  async function fetchItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('retailer_stock')
        .select('*')
        .eq('retailer_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Stock fetch error:', error);
        setItems([]);
      } else {
        setItems(data || []);
      }
    } catch (e) {
      console.error('Stock fetch failed:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const addItems = async (newItems) => {
    try {
      const rows = newItems.map(item => ({
        retailer_id: userId,
        medicine_name: item.medicine_name,
        batch_no: item.batch_no || null,
        expiry_date: item.expiry_date || null,
        quantity: parseInt(item.qty) || 0,
        unit_price: parseFloat(item.mrp) || 0,
        source: 'ai_scan',
        low_stock_threshold: 100,
      }));

      const { data, error } = await supabase
        .from('retailer_stock')
        .upsert(rows, { onConflict: 'retailer_id,medicine_name,batch_no' })
        .select();

      if (!error) {
        await fetchItems();
      }
      return { data, error };
    } catch (e) {
      return { error: e };
    }
  };

  const updateItem = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('retailer_stock')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (!error) {
        setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
      }
      return { data, error };
    } catch (e) {
      return { error: e };
    }
  };

  const removeItem = async (id) => {
    try {
      const { error } = await supabase
        .from('retailer_stock')
        .delete()
        .eq('id', id);

      if (!error) {
        setItems(prev => prev.filter(i => i.id !== id));
      }
      return { error };
    } catch (e) {
      return { error: e };
    }
  };

  return { items, loading, addItems, updateItem, removeItem };
};

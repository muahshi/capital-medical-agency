import { useState, useEffect } from 'react';

export const useStock = (userId) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Demo data taaki white screen na aaye
  useEffect(() => {
    if (!userId) {
      setItems([
        { id: 1, name: 'Sample Medicine A', stock: 50, price: 100 },
        { id: 2, name: 'Sample Medicine B', stock: 12, price: 250 }
      ]);
    }
  }, [userId]);

  return { 
    items, 
    loading, 
    addItems: async () => ({ error: null }),
    updateItem: async () => ({ error: null }),
    removeItem: async () => ({ error: null })
  };
};
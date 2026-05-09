// ─── useAuth — Simple localStorage Auth ──────────────────────────────────────
// Supabase/Firebase completely removed. Sirf CMA@2024 key se kaam hoga.

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({ user: null, loading: false });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Sirf localStorage check — koi network call nahi
    const authStatus = localStorage.getItem('cma_admin_auth');
    if (authStatus === 'true') {
      setUser({ email: 'admin@capitalmedical.agency', role: 'Owner' });
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

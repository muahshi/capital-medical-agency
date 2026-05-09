import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({ user: null, loading: false });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    
    // Agar Firebase config nahi hai toh directly demo mode mein jao
    if (!apiKey || apiKey === "dummy" || apiKey === undefined) {
      setLoading(false);
      return;
    }

    // Sirf tab Firebase initialize karo jab real config ho
    let unsubscribe = () => {};
    
    const initFirebase = async () => {
      try {
        const { initializeApp, getApps } = await import('firebase/app');
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        
        const firebaseConfig = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        };

        if (!getApps().length) {
          initializeApp(firebaseConfig);
        }

        const auth = getAuth();
        unsubscribe = onAuthStateChanged(
          auth,
          (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
          },
          (err) => {
            console.error('Auth error:', err);
            setLoading(false);
          }
        );
      } catch (e) {
        console.warn('Firebase init failed:', e);
        setLoading(false);
      }
    };

    initFirebase();
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

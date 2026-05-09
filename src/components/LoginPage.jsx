```react
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  Mail, Lock, Eye, EyeOff, ArrowRight, RefreshCw, ShieldCheck 
} from 'lucide-react';

// Using Named Export 'export const' to be 100% explicit for the build tool
export const LoginPage = ({ onDemoMode }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setMode('reset');
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else if (mode === 'signup') {
        result = await supabase.auth.signUp({ email, password });
      } else if (mode === 'forgot') {
        result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      } else {
        result = await supabase.auth.updateUser({ password });
      }

      if (result.error) throw result.error;
      
      if (mode === 'signup') toast.success('Check your email!');
      if (mode === 'forgot') toast.success('Reset link sent!');
      if (mode === 'reset') {
        toast.success('Password updated!');
        setMode('login');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111] border border-white/5 p-8 rounded-3xl shadow-2xl text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
        </h1>
        <p className="text-gray-500 text-sm mb-8">Capital Medical Agency Inventory</p>
        
        <form onSubmit={handleAuth} className="space-y-4 text-left">
          {mode !== 'reset' && (
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Email</label>
              <input 
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-yellow-500"
              />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Password</label>
              <input 
                type={showPassword ? "text" : "password"} required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-yellow-500"
              />
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-all flex justify-center items-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Continue'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-sm text-yellow-500 hover:underline"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
          <br/>
          <button onClick={onDemoMode} className="text-xs text-gray-500 flex items-center justify-center gap-2 w-full mt-2">
            <ShieldCheck size={14} /> Try Demo Instance
          </button>
        </div>
      </div>
    </div>
  );
};

```

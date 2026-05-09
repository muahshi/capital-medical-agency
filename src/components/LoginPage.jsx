```react
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  Mail, Lock, Eye, EyeOff, ArrowRight, Key, 
  UserPlus, LogIn, RefreshCw, ShieldCheck 
} from 'lucide-react';

// Added 'export default' here to fix the build error
export default function LoginPage({ onDemoMode }) {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setMode('reset');
      toast('Apna naya password set karein', { icon: '🔐' });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('System par swagat hai!');
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Verification email bhej di gayi hai!');
      setMode('login');
    }
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Reset link bhej diya gaya hai!');
      setMode('login');
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password update ho gaya! Ab login karein.');
      setMode('login');
      window.history.replaceState(null, null, window.location.pathname);
    }
    setLoading(false);
  };

  const content = {
    login: { title: 'Welcome Back', desc: 'CMA Dashboard mein login karein' },
    signup: { title: 'Create Account', desc: 'Digital inventory join karein' },
    forgot: { title: 'Reset Access', desc: 'Email par recovery link payein' },
    reset: { title: 'New Password', desc: 'Apna naya password enter karein' }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/10 blur-[120px] rounded-full" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 p-[1px] mb-4 shadow-lg shadow-yellow-500/20">
            <div className="w-full h-full bg-[#111] rounded-[15px] flex items-center justify-center text-yellow-500 font-bold text-2xl">
              CMA
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#F5F5F0]">{content[mode].title}</h1>
          <p className="text-gray-500 text-sm mt-2">{content[mode].desc}</p>
        </div>

        <div className="bg-[#111]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
          <form 
            onSubmit={
              mode === 'login' ? handleLogin : 
              mode === 'signup' ? handleSignup : 
              mode === 'forgot' ? handleForgot : handleUpdatePassword
            } 
            className="space-y-5"
          >
            {mode !== 'reset' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@cma.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-[#F5F5F0] focus:border-yellow-500 outline-none"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between px-1">
                  <label className="text-xs font-medium text-gray-400">
                    {mode === 'reset' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')} className="text-xs text-yellow-500 hover:underline">
                      Bhool gaye?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type={showPassword ? "text" : "password"} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-[#F5F5F0] focus:border-yellow-500 outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {loading ? <RefreshCw className="animate-spin" /> : (
                <>
                  {mode === 'login' ? 'Login' : mode === 'signup' ? 'Signup' : mode === 'forgot' ? 'Send Link' : 'Update Password'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-4">
            {mode !== 'reset' ? (
              <p className="text-gray-500 text-sm">
                {mode === 'login' ? "Account nahi hai?" : "Account hai?"} 
                <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="ml-2 text-yellow-500 font-medium">
                  {mode === 'login' ? 'Register' : 'Login'}
                </button>
              </p>
            ) : (
              <button onClick={() => setMode('login')} className="text-sm text-gray-400">← Wapas Login par jayein</button>
            )}
            
            {mode === 'login' && (
              <button onClick={onDemoMode} className="w-full py-3 rounded-xl border border-white/5 text-gray-400 text-sm hover:bg-white/5 flex items-center justify-center gap-2">
                <ShieldCheck size={16} /> Try Demo Instance
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

```

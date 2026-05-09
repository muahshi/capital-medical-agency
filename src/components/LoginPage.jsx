import { useState } from 'react'
import { Zap, Mail, Lock, Shield, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage({ onDemoMode }) {
  const [tab, setTab] = useState('login') // 'login' | 'signup' | 'otp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid') || error.message.includes('invalid')) {
          toast.error('Email ya password galat hai', { className: 'toast-dark' })
        } else {
          toast.error(error.message, { className: 'toast-dark' })
        }
      }
      // success: onAuthStateChange will handle redirect
    } catch(e) {
      toast.error('Kuch galat hua', { className: 'toast-dark' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Password kam se kam 6 characters ka hona chahiye', { className: 'toast-dark' })
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) throw error
      
      // Try immediate login
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!loginErr) {
        toast.success('Account ban gaya! Welcome!', { className: 'toast-dark' })
        return
      }
      // If email confirmation needed
      toast.success('Account ban gaya! Login karein.', { className: 'toast-dark', duration: 4000 })
      setTab('login')
    } catch(e) {
      if (e.message?.includes('already registered')) {
        toast.error('Yeh email registered hai, login karein', { className: 'toast-dark' })
        setTab('login')
      } else {
        toast.error(e.message || 'Signup fail', { className: 'toast-dark' })
      }
    } finally {
      setLoading(false)
    }
  }

  async function sendOtp(e) {
    e?.preventDefault()
    if (!email) { toast.error('Email daalo', { className: 'toast-dark' }); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: { shouldCreateUser: true }
      })
      if (error) throw error
      setTab('otp')
      toast.success('6-digit OTP email pe bheja gaya!', { className: 'toast-dark', duration: 5000 })
    } catch(e) {
      toast.error(e.message || 'OTP nahi bheja', { className: 'toast-dark' })
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(e) {
    e.preventDefault()
    if (otp.length !== 6) { toast.error('6 digit OTP daalo', { className: 'toast-dark' }); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
      if (error) throw error
      toast.success('Login ho gaye!', { className: 'toast-dark' })
    } catch(e) {
      toast.error('OTP galat hai ya expire ho gaya', { className: 'toast-dark' })
    } finally {
      setLoading(false)
    }
  }

  const Spinner = () => <div className="w-5 h-5 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#111] border border-yellow-500/30 mb-4">
            <Zap className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="font-display text-4xl text-white tracking-widest mb-1">CAPITAL</h1>
          <h2 className="font-display text-xl text-yellow-500 tracking-[0.3em]">MEDICAL AGENCY</h2>
          <p className="text-gray-500 text-xs mt-2">SMARTER INVENTORY. BETTER DECISIONS.</p>
        </div>

        {/* OTP Screen */}
        {tab === 'otp' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm text-center">
              <span className="text-yellow-400">{email}</span> pe OTP bheja gaya
            </p>
            <form onSubmit={verifyOtp} className="space-y-4">
              <input
                type="tel"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="6-digit OTP"
                className="w-full bg-[#111] border border-[#333] text-white rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none focus:border-yellow-500/50"
                maxLength={6}
                required
              />
              <button type="submit" disabled={loading}
                className="w-full bg-yellow-500 text-black font-bold rounded-xl py-4 flex items-center justify-center gap-2">
                {loading ? <Spinner /> : 'OTP Verify Karo'}
              </button>
              <button type="button" onClick={sendOtp} disabled={loading}
                className="w-full border border-yellow-500/30 text-yellow-500 rounded-xl py-3 text-sm">
                OTP dobara bhejo
              </button>
              <button type="button" onClick={() => setTab('login')}
                className="w-full text-gray-500 text-sm py-2">
                ← Wapas jao
              </button>
            </form>
          </div>
        )}

        {/* Login / Signup */}
        {(tab === 'login' || tab === 'signup') && (
          <div className="space-y-4">
            {/* Toggle */}
            <div className="flex bg-[#111] rounded-xl p-1 border border-[#222]">
              <button onClick={() => setTab('login')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'login' ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}>
                LOGIN
              </button>
              <button onClick={() => setTab('signup')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'signup' ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}>
                SIGN UP
              </button>
            </div>

            <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="space-y-3">
              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Email address" required
                  className="w-full bg-[#111] border border-[#333] text-white rounded-xl px-4 py-3.5 pl-10 outline-none focus:border-yellow-500/50" />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'Naya password (6+ chars)' : 'Password'} required minLength={6}
                  className="w-full bg-[#111] border border-[#333] text-white rounded-xl px-4 py-3.5 pl-10 pr-10 outline-none focus:border-yellow-500/50" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-yellow-500 text-black font-bold rounded-xl py-4 flex items-center justify-center gap-2 text-base">
                {loading ? <Spinner /> : tab === 'login' ? 'Login' : 'Account Banao'}
              </button>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#222]" />
              <span className="text-gray-600 text-xs">YA PHIR</span>
              <div className="flex-1 h-px bg-[#222]" />
            </div>

            <button onClick={sendOtp} disabled={loading || !email}
              className="w-full border border-[#333] text-gray-300 rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm disabled:opacity-40">
              <Mail className="w-4 h-4" />
              OTP se Login (Email pe code aayega)
            </button>

            <button onClick={onDemoMode}
              className="w-full border border-[#222] text-gray-500 rounded-xl py-3 flex items-center justify-center gap-2 text-sm">
              <Shield className="w-4 h-4" /> Demo Mode (bina login ke)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

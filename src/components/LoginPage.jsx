import { useState } from 'react'
import { Zap, Mail, Shield, Lock, ArrowLeft, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// 3 screens: 'main' | 'otp' | 'setpassword'
export default function LoginPage({ onDemoMode }) {
  const [screen, setScreen] = useState('main')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  // ── Password Login / Signup ──────────────────────────────
  async function handlePasswordLogin(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Account ban gaya! Login ho rahe hain...', { className: 'toast-dark' })
        // Auto login after signup
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
        if (loginErr) throw loginErr
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
        toast.error('Email ya password galat hai', { className: 'toast-dark' })
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Pehle OTP se login karein aur password set karein', { className: 'toast-dark' })
        setScreen('otp')
        sendOtp()
      } else if (msg.includes('already registered')) {
        toast.error('Yeh email registered hai, login karein', { className: 'toast-dark' })
        setIsSignup(false)
      } else {
        toast.error(msg || 'Kuch galat hua', { className: 'toast-dark' })
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Send OTP ─────────────────────────────────────────────
  async function sendOtp() {
    if (!email) {
      toast.error('Email daalo pehle', { className: 'toast-dark' })
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      })
      if (error) throw error
      setScreen('otp')
      toast.success('OTP bheja gaya! Email check karein', { className: 'toast-dark', duration: 5000 })
    } catch (err) {
      toast.error(err.message || 'OTP send nahi hua', { className: 'toast-dark' })
    } finally {
      setLoading(false)
    }
  }

  // ── Verify OTP ───────────────────────────────────────────
  async function handleOtpVerify(e) {
    e.preventDefault()
    if (!otp || otp.length < 6) {
      toast.error('6 digit OTP daalo', { className: 'toast-dark' })
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      })
      if (error) throw error
      toast.success('Login ho gaye!', { className: 'toast-dark' })
    } catch (err) {
      toast.error('OTP galat hai ya expire ho gaya', { className: 'toast-dark' })
    } finally {
      setLoading(false)
    }
  }

  // ── UI ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-dark-800 border border-gold-500/30 mb-4">
            <Zap className="w-10 h-10 text-gold-500" />
          </div>
          <h1 className="font-display text-4xl text-white tracking-widest mb-1">CAPITAL</h1>
          <h2 className="font-display text-xl text-gold-500 tracking-[0.3em]">MEDICAL AGENCY</h2>
        </div>

        {/* ── OTP Screen ── */}
        {screen === 'otp' && (
          <div className="space-y-4">
            <button onClick={() => setScreen('main')} className="flex items-center gap-2 text-dark-400 text-sm mb-2">
              <ArrowLeft className="w-4 h-4" /> Wapas jao
            </button>
            <p className="text-white text-sm text-center">
              <span className="text-gold-500">{email}</span> pe 6-digit OTP bheja gaya
            </p>
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div>
                <label className="block text-dark-400 text-xs uppercase tracking-widest mb-2 font-mono">OTP Code</label>
                <input
                  type="number"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="123456"
                  className="input-dark text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-gold w-full flex items-center justify-center gap-2">
                {loading
                  ? <div className="w-5 h-5 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                  : <><KeyRound className="w-4 h-4" /> OTP Verify Karo</>
                }
              </button>
              <button type="button" onClick={sendOtp} disabled={loading} className="btn-ghost w-full text-sm">
                OTP dobara bhejo
              </button>
            </form>
          </div>
        )}

        {/* ── Main Screen ── */}
        {screen === 'main' && (
          <div className="space-y-4">
            {/* Toggle */}
            <div className="flex bg-dark-800 rounded-xl p-1 border border-dark-600">
              <button
                onClick={() => setIsSignup(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-mono transition-all ${!isSignup ? 'bg-gold-500 text-dark-900 font-bold' : 'text-dark-400'}`}
              >
                LOGIN
              </button>
              <button
                onClick={() => setIsSignup(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-mono transition-all ${isSignup ? 'bg-gold-500 text-dark-900 font-bold' : 'text-dark-400'}`}
              >
                SIGN UP
              </button>
            </div>

            <form onSubmit={handlePasswordLogin} className="space-y-3">
              {/* Email */}
              <div>
                <label className="block text-dark-400 text-xs uppercase tracking-widest mb-1 font-mono">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="aap@business.com"
                    className="input-dark pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-dark-400 text-xs uppercase tracking-widest mb-1 font-mono">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="6+ characters"
                    className="input-dark pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-gold w-full flex items-center justify-center gap-2">
                {loading
                  ? <div className="w-5 h-5 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                  : isSignup ? 'Account Banao' : 'Login'
                }
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-600" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-dark-950 px-3 text-dark-400 font-mono">YA PHIR</span>
              </div>
            </div>

            {/* OTP Login */}
            <button
              onClick={sendOtp}
              disabled={loading || !email}
              className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
            >
              <Mail className="w-4 h-4" />
              OTP se Login (Email pe code aayega)
            </button>

            <button onClick={onDemoMode} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm opacity-70">
              <Shield className="w-4 h-4" /> Demo Mode
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Zap, Mail, Shield, Lock, UserPlus, LogIn } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage({ onDemoMode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    if (password.length < 6) {
      toast.error('Password kam se kam 6 characters ka hona chahiye', { className: 'toast-dark' })
      return
    }

    setLoading(true)
    try {
      if (isSignup) {
        // Sign up
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Account ban gaya! Ab login karein.', { className: 'toast-dark', duration: 4000 })
        setIsSignup(false)
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Login successful!', { className: 'toast-dark' })
      }
    } catch (err) {
      const msg = err.message || 'Kuch galat hua'
      if (msg.includes('Invalid login')) {
        toast.error('Email ya password galat hai', { className: 'toast-dark' })
      } else if (msg.includes('already registered')) {
        toast.error('Yeh email pehle se registered hai, login karein', { className: 'toast-dark' })
        setIsSignup(false)
      } else {
        toast.error(msg, { className: 'toast-dark' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gold-500/3 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-dark-800 border border-gold-500/30 mb-4 shadow-gold">
            <Zap className="w-10 h-10 text-gold-500" />
          </div>
          <h1 className="font-display text-4xl text-white tracking-widest mb-1">CAPITAL</h1>
          <h2 className="font-display text-xl text-gold-500 tracking-[0.3em]">MEDICAL AGENCY</h2>
          <p className="text-dark-400 text-sm mt-2 font-body">SMARTER INVENTORY. BETTER DECISIONS.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle Login/Signup */}
          <div className="flex bg-dark-800 rounded-xl p-1 border border-dark-600">
            <button
              type="button"
              onClick={() => setIsSignup(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-mono transition-all ${
                !isSignup ? 'bg-gold-500 text-dark-900 font-bold' : 'text-dark-400'
              }`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => setIsSignup(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-mono transition-all ${
                isSignup ? 'bg-gold-500 text-dark-900 font-bold' : 'text-dark-400'
              }`}
            >
              SIGN UP
            </button>
          </div>

          {/* Email */}
          <div>
            <label className="block text-dark-400 text-xs uppercase tracking-widest mb-2 font-mono">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="input-dark pl-10"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-dark-400 text-xs uppercase tracking-widest mb-2 font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="input-dark pl-10"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full text-center flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
            ) : isSignup ? (
              <><UserPlus className="w-4 h-4" /> Account Banao</>
            ) : (
              <><LogIn className="w-4 h-4" /> Login</>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-600" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-dark-950 px-3 text-dark-400 font-mono">OR</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onDemoMode}
            className="btn-ghost w-full text-center flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Try Demo Mode
          </button>
        </form>
      </div>
    </div>
  )
}

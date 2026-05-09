import { useState } from 'react'
import { Zap, Mail, Shield } from 'lucide-react'
import { signInWithMagicLink } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage({ onDemoMode }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleMagicLink(e) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      const { error } = await signInWithMagicLink(email)
      if (error) throw error
      setSent(true)
      toast.success('Magic link sent! Check your email.', {
        className: 'toast-dark',
        duration: 5000,
      })
    } catch (err) {
      toast.error(err.message || 'Failed to send magic link', { className: 'toast-dark' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6">
      {/* Background decoration */}
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

        {!sent ? (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label className="block text-dark-400 text-xs uppercase tracking-widest mb-2 font-mono">
                Business Email
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

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full text-center flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Send Magic Link
                </>
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

            <p className="text-dark-400 text-xs text-center leading-relaxed">
              No password needed. We'll send a secure login link to your email.
            </p>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-900/30 border border-green-500/30 flex items-center justify-center">
              <Mail className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Check Your Email</p>
              <p className="text-dark-400 text-sm">We sent a magic link to <span className="text-gold-500">{email}</span></p>
            </div>
            <button
              onClick={() => setSent(false)}
              className="text-gold-500 text-sm underline underline-offset-2"
            >
              Use different email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

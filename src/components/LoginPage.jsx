// ─── src/components/LoginPage.jsx ────────────────────────────────────────────
import React, { useState } from 'react'
import { ShieldCheck, Lock, Eye, EyeOff, ChevronRight, User } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { loginWithCode } from '../lib/supabase'

export const LoginPage = ({ onLoginSuccess }) => {
  const [passkey, setPasskey]       = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [isError, setIsError]       = useState(false)
  const [isLoading, setIsLoading]   = useState(false)
  const [errorMsg, setErrorMsg]     = useState('')

  const handleUnlock = async (e) => {
    e?.preventDefault()
    if (!passkey.trim() || isLoading) return

    setIsLoading(true)
    setIsError(false)
    setErrorMsg('')

    try {
      const result = await loginWithCode(passkey)

      if (!result.success) {
        setIsError(true)
        setErrorMsg(result.error || 'Galat key!')
        setIsLoading(false)
        setTimeout(() => setIsError(false), 3000)
        return
      }

      // Role check — LoginPage sirf admin ke liye hai
      // Salesman /salesman route pe jata hai
      if (result.user.role === 'salesman') {
        setIsError(true)
        setErrorMsg('Yeh Admin portal hai. Salesman app alag hai.')
        setIsLoading(false)
        setTimeout(() => setIsError(false), 3000)
        return
      }

      toast.success('Access Granted! ✓')
      onLoginSuccess(result.user)

    } catch (err) {
      console.error('[CMA Login]', err)
      setIsError(true)
      setErrorMsg('Network error. Internet check karo.')
      setIsLoading(false)
      setTimeout(() => setIsError(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white">
      {/* Ambient glow */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(245,158,11,0.07) 0%, transparent 70%)'
        }}
      />

      <div className="w-full max-w-sm space-y-10 relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center border border-yellow-500/20 shadow-2xl shadow-yellow-500/10">
            <ShieldCheck className="text-yellow-500 w-10 h-10" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">CMA SECURE</h1>
            <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">Admin Portal • Internal System</p>
          </div>
        </div>

        {/* Login Card */}
        <div className={`bg-[#0A0A0A] border rounded-[2rem] p-8 transition-all duration-300 ${
          isError ? 'border-red-500/50 shadow-red-500/10 shadow-lg' : 'border-white/5'
        }`}>
          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">
                Admin Master Key
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-yellow-500 transition-colors" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passkey}
                  onChange={e => setPasskey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  placeholder="Master Key daalo"
                  autoComplete="off"
                  autoCapitalize="off"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-yellow-500/50 focus:bg-white/[0.05] transition-all text-lg tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {isError && (
                <p className="text-red-400 text-xs ml-1 animate-pulse">
                  ⚠ {errorMsg}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !passkey.trim()}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10 active:scale-95 transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>Verify & Enter <ChevronRight size={18} /></>
              )}
            </button>
          </form>
        </div>

        {/* Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-3">
            <User size={14} className="text-gray-600 shrink-0" />
            <p className="text-gray-600 text-xs leading-relaxed">
              Salesman ho? <span className="text-gray-500 font-medium">/salesman</span> route pe jao ya admin se link maango.
            </p>
          </div>
          <p className="text-center text-[10px] text-gray-700 uppercase tracking-widest leading-relaxed">
            Capital Medical Agency • Bhopal, MP<br />
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  )
}

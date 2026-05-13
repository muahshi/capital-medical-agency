// ─── src/components/LoginPage.jsx — Premium Dark v4.0 ────────────────────────
import { useState } from 'react'
import { Lock, Eye, EyeOff, ChevronRight, ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { loginWithCode } from '../lib/supabase'

export const LoginPage = ({ onLoginSuccess }) => {
  const [passkey,   setPasskey]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [isError,   setIsError]   = useState(false)
  const [errorMsg,  setErrorMsg]  = useState('')
  const [loading,   setLoading]   = useState(false)

  const handleUnlock = async (e) => {
    e?.preventDefault()
    if (!passkey.trim() || loading) return
    setLoading(true); setIsError(false); setErrorMsg('')
    try {
      const result = await loginWithCode(passkey)
      if (!result.success) {
        setIsError(true)
        setErrorMsg(result.error || 'Galat key!')
        setTimeout(() => setIsError(false), 3000)
        return
      }
      if (result.user.role === 'salesman') {
        setIsError(true)
        setErrorMsg('Salesman portal alag hai — /salesman pe jao.')
        setTimeout(() => setIsError(false), 3000)
        return
      }
      toast.success('Access Granted!')
      onLoginSuccess(result.user)
    } catch {
      setIsError(true)
      setErrorMsg('Network error. Internet check karo.')
      setTimeout(() => setIsError(false), 3000)
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight:'100vh', background:'#040407',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:'24px', position:'relative', overflow:'hidden',
    }}>
      {/* Ambient glows */}
      <div style={{ position:'fixed', top:'-20%', left:'50%', transform:'translateX(-50%)', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.08) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:'-10%', right:'-10%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,229,255,0.05) 0%,transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:380, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          {/* AI badge ring */}
          <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
            <div style={{
              width:80, height:80, borderRadius:24,
              background:'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(0,229,255,0.1))',
              border:'1px solid rgba(0,229,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 0 40px rgba(0,229,255,0.08), 0 0 80px rgba(124,58,237,0.06)',
            }}>
              <ShieldCheck size={36} color="#00E5FF" strokeWidth={1.5}/>
            </div>
            {/* Rotating ring */}
            <div style={{
              position:'absolute', inset:-4, borderRadius:28,
              border:'1px solid transparent',
              background:'linear-gradient(135deg,rgba(0,229,255,0.3),transparent,rgba(124,58,237,0.3)) border-box',
              WebkitMask:'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite:'destination-out',
              maskComposite:'exclude',
            }}/>
          </div>

          <h1 style={{
            fontSize:24, fontFamily:'Space Grotesk,sans-serif', fontWeight:800,
            letterSpacing:3, color:'#fff', marginBottom:6,
          }}>CAPITAL MEDICAL</h1>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <div style={{ height:1, width:40, background:'linear-gradient(90deg,transparent,rgba(0,229,255,0.4))' }}/>
            <span style={{ color:'rgba(0,229,255,0.6)', fontSize:10, fontFamily:'monospace', letterSpacing:4 }}>ADMIN PORTAL</span>
            <div style={{ height:1, width:40, background:'linear-gradient(90deg,rgba(0,229,255,0.4),transparent)' }}/>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(10,12,18,0.9)',
          border:`1px solid ${isError?'rgba(255,77,109,0.4)':'rgba(0,229,255,0.15)'}`,
          borderRadius:24, padding:28,
          backdropFilter:'blur(20px)',
          boxShadow: isError
            ? '0 0 30px rgba(255,77,109,0.08)'
            : '0 0 30px rgba(0,229,255,0.04)',
          transition:'all 0.3s',
        }}>
          {/* Label */}
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'monospace', letterSpacing:3, marginBottom:10 }}>
            MASTER KEY
          </div>

          {/* Input */}
          <div style={{
            display:'flex', alignItems:'center', gap:12,
            background:'rgba(255,255,255,0.04)',
            border:`1px solid ${isError?'rgba(255,77,109,0.35)':'rgba(255,255,255,0.1)'}`,
            borderRadius:16, padding:'14px 16px', marginBottom:isError?10:18,
            transition:'border-color 0.2s',
          }}>
            <Lock size={16} color={isError?'#FF4D6D':'rgba(0,229,255,0.5)'} style={{ flexShrink:0 }}/>
            <input
              type={showPass?'text':'password'}
              value={passkey}
              onChange={e=>setPasskey(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleUnlock()}
              placeholder="Master key daalo..."
              autoComplete="off"
              style={{
                flex:1, background:'none', border:'none', outline:'none',
                color:'#fff', fontSize:16, letterSpacing:showPass?1:4,
                fontFamily: showPass?'DM Sans,sans-serif':'monospace',
              }}
            />
            <button type="button" onClick={()=>setShowPass(!showPass)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', flexShrink:0 }}>
              {showPass?<EyeOff size={16}/>:<Eye size={16}/>}
            </button>
          </div>

          {/* Error */}
          {isError && (
            <div style={{
              background:'rgba(255,77,109,0.08)', border:'1px solid rgba(255,77,109,0.2)',
              borderRadius:10, padding:'8px 12px', marginBottom:16,
              display:'flex', alignItems:'center', gap:8,
            }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#FF4D6D', flexShrink:0 }}/>
              <span style={{ color:'#FF6B8A', fontSize:12, fontFamily:'monospace' }}>{errorMsg}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleUnlock}
            disabled={loading||!passkey.trim()}
            style={{
              width:'100%', padding:'15px 24px', borderRadius:16, border:'none',
              background: loading||!passkey.trim()
                ? 'rgba(0,229,255,0.1)'
                : 'linear-gradient(135deg,#00B8D9,#0070F3)',
              color: loading||!passkey.trim() ? 'rgba(0,229,255,0.4)' : '#fff',
              fontWeight:800, fontSize:14, fontFamily:'Space Grotesk,sans-serif',
              letterSpacing:1, cursor: loading||!passkey.trim()?'not-allowed':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              boxShadow: (!loading&&passkey.trim()) ? '0 0 24px rgba(0,180,217,0.3)' : 'none',
              transition:'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                VERIFYING...
              </>
            ) : (
              <>VERIFY & ENTER <ChevronRight size={18}/></>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div style={{ marginTop:28, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{
            background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
            borderRadius:14, padding:'12px 16px',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'rgba(0,229,255,0.5)', flexShrink:0 }}/>
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, lineHeight:1.5 }}>
              Salesman ho? <span style={{ color:'rgba(0,229,255,0.5)', fontFamily:'monospace' }}>/salesman</span> route use karo ya admin se link maango.
            </p>
          </div>
          <p style={{ textAlign:'center', color:'rgba(255,255,255,0.12)', fontSize:10, fontFamily:'monospace', letterSpacing:2 }}>
            CAPITAL MEDICAL AGENCY · BHOPAL, MP<br/>
            AUTHORIZED PERSONNEL ONLY
          </p>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

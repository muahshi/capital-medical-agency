```react
import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  ChevronRight, 
  AlertCircle,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const LoginPage = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Aapka Private Access Key (Ise aap kabhi bhi yahan se badal sakte hain)
  const ADMIN_SECRET_PIN = "CMA@2024"; 

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsVerifying(true);

    // Thoda delay taaki professional feel aaye (Verification simulation)
    setTimeout(() => {
      if (pin === ADMIN_SECRET_PIN) {
        setError(false);
        localStorage.setItem('cma_admin_auth', 'true');
        toast.success('Access Granted! Swagat hai.', {
          style: { background: '#111', color: '#EAB308', border: '1px solid #EAB30833' }
        });
        onLoginSuccess();
      } else {
        setError(true);
        toast.error('Galat Access Key! Dubara koshish karein.');
        setIsVerifying(false);
        // Error shake effect ke liye trigger
        setTimeout(() => setError(false), 2000);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Aesthetic */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-yellow-500/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-yellow-600/5 blur-[150px] rounded-full" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-yellow-400 to-yellow-600 p-[1px] mb-6 shadow-3xl shadow-yellow-500/20">
            <div className="w-full h-full bg-[#0a0a0a] rounded-[38px] flex items-center justify-center">
              <ShieldCheck className="text-yellow-500 w-12 h-12" strokeWidth={1.2} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">CMA Private</h1>
          <p className="text-gray-500 text-xs mt-3 font-bold tracking-[0.2em] uppercase opacity-70">
            Enterprise Asset Management
          </p>
        </div>

        <div className={`bg-[#111]/90 border ${error ? 'border-red-500/50' : 'border-white/10'} backdrop-blur-3xl rounded-[3rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] transition-all duration-300 ${error ? 'translate-x-1' : ''}`}>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] uppercase tracking-[0.25em] font-black text-gray-500">
                  Secure Access Key
                </label>
                <Zap size={12} className="text-yellow-500/50" />
              </div>
              
              <div className="relative group">
                <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${error ? 'text-red-500' : 'text-gray-500 group-focus-within:text-yellow-500'}`} />
                <input 
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter Key"
                  autoFocus
                  className={`w-full bg-white/5 border ${error ? 'border-red-500/50' : 'border-white/10 group-focus-within:border-yellow-500/40'} rounded-2xl py-5 pl-14 pr-14 text-white transition-all duration-500 outline-none text-xl tracking-[0.3em] font-mono placeholder:tracking-normal placeholder:text-gray-700`}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                >
                  {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isVerifying || !pin}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-2xl shadow-yellow-600/20 active:scale-[0.97] transition-all duration-300 disabled:opacity-50 disabled:grayscale"
            >
              {isVerifying ? (
                <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-sm">Unlock System</span>
                  <ChevronRight size={20} strokeWidth={3} />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-16 text-center space-y-2">
          <p className="text-[9px] text-gray-700 uppercase tracking-[0.4em] font-bold">
            Authorized for Capital Medical Agency
          </p>
          <div className="h-[1px] w-12 bg-yellow-500/20 mx-auto" />
          <p className="text-[8px] text-gray-800 uppercase tracking-[0.2em]">
            Bhopal • Madhya Pradesh • Internal Use Only
          </p>
        </div>
      </div>
    </div>
  );
};

```

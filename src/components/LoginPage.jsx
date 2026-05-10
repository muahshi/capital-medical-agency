import React, { useState } from 'react';
import { ShieldCheck, Lock, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const LoginPage = ({ onLoginSuccess }) => {
  const [passkey, setPasskey] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isError, setIsError] = useState(false);

  // Aapki secret key
  const MASTER_KEY = "CMA@2024"; 

  const handleUnlock = (e) => {
    e.preventDefault();
    
    if (passkey === MASTER_KEY) {
      localStorage.setItem('cma_admin_auth', 'true');
      toast.success('System Unlocked!');
      onLoginSuccess();
    } else {
      setIsError(true);
      toast.error('Galat Access Key!');
      setTimeout(() => setIsError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-sm space-y-12">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center border border-yellow-500/20 shadow-2xl shadow-yellow-500/10">
            <ShieldCheck className="text-yellow-500 w-10 h-10" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">CMA SECURE</h1>
            <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">Internal Inventory System</p>
          </div>
        </div>

        {/* Input Card */}
        <div className={`bg-[#0A0A0A] border ${isError ? 'border-red-500/50' : 'border-white/5'} rounded-[2.5rem] p-8 transition-all duration-300`}>
          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Admin Access Key</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-yellow-500 transition-colors" />
                <input 
                  type={showPass ? "text" : "password"}
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter Passkey"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-yellow-500/50 focus:bg-white/[0.05] transition-all text-lg tracking-widest"
                />
                <button 
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10 active:scale-95 transition-all"
            >
              Verify & Enter
              <ChevronRight size={18} />
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-gray-700 uppercase tracking-widest leading-relaxed">
            Capital Medical Agency • Bhopal, MP<br/>
            Authorized Personnel Access Only
          </p>
        </div>
      </div>
    </div>
  );
};


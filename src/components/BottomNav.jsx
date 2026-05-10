import { LayoutDashboard, Package, ScanLine, Brain, Settings } from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'inventory', label: 'Stock', icon: Package },
  { id: 'scan', label: 'Scan', icon: ScanLine, primary: true },
  { id: 'insights', label: 'Insights', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function BottomNav({ active, onChange, pendingOrders = 0 }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#090909]/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-end justify-around px-2 pt-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {navItems.map(({ id, label, icon: Icon, primary }) => {
          const isActive = active === id
          const showBadge = id === 'dashboard' && pendingOrders > 0

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200 ${
                primary ? '-mt-6' : isActive ? 'text-yellow-500' : 'text-gray-600'
              }`}
            >
              {primary ? (
                <>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 ${
                    isActive ? 'bg-yellow-500 scale-105 shadow-yellow-500/30' : 'bg-yellow-600/80 hover:bg-yellow-500'
                  }`}>
                    <Icon className="w-7 h-7 text-black" strokeWidth={2.5} />
                  </div>
                  <span className={`text-[10px] font-mono mt-1 ${isActive ? 'text-yellow-500' : 'text-gray-600'}`}>SCAN</span>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                    {showBadge && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">{pendingOrders > 9 ? '9+' : pendingOrders}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-mono tracking-wider ${isActive ? 'text-yellow-500' : 'text-gray-600'}`}>
                    {label.toUpperCase()}
                  </span>
                  {isActive && <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-yellow-500" />}
                </>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

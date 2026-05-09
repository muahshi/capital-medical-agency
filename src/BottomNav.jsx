import { LayoutDashboard, Package, ScanLine, History, Settings } from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'scan', label: 'Scan', icon: ScanLine, primary: true },
  { id: 'history', label: 'History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="safe-bottom bg-dark-900/95 backdrop-blur-xl border-t border-dark-700">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map(({ id, label, icon: Icon, primary }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200 relative ${
                primary
                  ? '-mt-6'
                  : isActive
                  ? 'text-gold-500'
                  : 'text-dark-400'
              }`}
            >
              {primary ? (
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-gold transition-all duration-200 ${
                  isActive
                    ? 'bg-gold-500 scale-105'
                    : 'bg-gold-600/80 hover:bg-gold-500'
                }`}>
                  <Icon className="w-7 h-7 text-dark-900" strokeWidth={2.5} />
                </div>
              ) : (
                <>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className={`text-[10px] font-mono tracking-wider ${isActive ? 'text-gold-500' : 'text-dark-400'}`}>
                    {label.toUpperCase()}
                  </span>
                  {isActive && (
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-gold-500" />
                  )}
                </>
              )}
              {primary && (
                <span className={`text-[10px] font-mono mt-1 ${isActive ? 'text-gold-500' : 'text-dark-400'}`}>
                  SCAN
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

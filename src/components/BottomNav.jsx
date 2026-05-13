// ─── src/components/BottomNav.jsx — Premium Neon Nav ─────────────────────────
import { LayoutDashboard, Package, ScanLine, History, Settings } from 'lucide-react'

const NAV = [
  { id:'dashboard', label:'Dashboard', Icon:LayoutDashboard },
  { id:'inventory', label:'Inventory', Icon:Package          },
  { id:'scan',      label:'Scan',      Icon:ScanLine, primary:true },
  { id:'history',   label:'History',   Icon:History           },
  { id:'settings',  label:'Settings',  Icon:Settings          },
]

export default function BottomNav({ active, onChange, pendingOrders = 0 }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'linear-gradient(180deg, rgba(4,4,7,0) 0%, rgba(4,4,7,0.96) 20%, #040407 100%)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="flex items-end justify-around px-2 pt-3"
        style={{ paddingBottom:'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {NAV.map(({ id, label, Icon, primary }) => {
          const isActive    = active === id
          const showBadge   = id === 'dashboard' && pendingOrders > 0

          if (primary) {
            return (
              <button key={id} onClick={() => onChange(id)} className="flex flex-col items-center -mt-5 gap-1">
                {/* Outer glow ring */}
                <div style={{
                  padding: 3,
                  borderRadius: '50%',
                  background: isActive
                    ? 'linear-gradient(135deg,#7C3AED,#2563EB)'
                    : 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(37,99,235,0.4))',
                  boxShadow: isActive ? '0 0 24px rgba(124,58,237,0.5),0 0 48px rgba(37,99,235,0.2)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#7C3AED,#2563EB)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}>
                    <Icon size={24} color="#fff" strokeWidth={2.5} />
                  </div>
                </div>
                <span style={{
                  fontSize:10, fontFamily:'monospace', letterSpacing:1,
                  color: isActive ? '#7C3AED' : 'rgba(255,255,255,0.35)',
                  fontWeight: 600,
                }}>SCAN</span>
              </button>
            )
          }

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-200 active:scale-90"
            >
              {/* Active neon top indicator */}
              {isActive && (
                <div style={{
                  position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)',
                  width:20, height:2, borderRadius:99,
                  background:'linear-gradient(90deg,#00E5FF,#00B8D9)',
                  boxShadow:'0 0 8px #00E5FF, 0 0 16px rgba(0,229,255,0.4)',
                }} />
              )}

              {/* Icon container */}
              <div style={{ position:'relative' }}>
                <div style={{
                  width:36, height:36,
                  borderRadius:10,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: isActive ? 'rgba(0,229,255,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(0,229,255,0.15)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}>
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    color={isActive ? '#00E5FF' : 'rgba(255,255,255,0.35)'}
                  />
                </div>

                {/* Badge */}
                {showBadge && (
                  <div style={{
                    position:'absolute', top:-4, right:-4,
                    width:16, height:16,
                    background:'#FF4D6D',
                    borderRadius:'50%',
                    border:'2px solid #040407',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 0 8px rgba(255,77,109,0.6)',
                  }}>
                    <span style={{ color:'#fff', fontSize:8, fontWeight:800 }}>
                      {pendingOrders > 9 ? '9+' : pendingOrders}
                    </span>
                  </div>
                )}
              </div>

              <span style={{
                fontSize:9, fontFamily:'monospace', letterSpacing:0.5, fontWeight:600,
                color: isActive ? '#00E5FF' : 'rgba(255,255,255,0.3)',
                transition:'color 0.2s',
              }}>
                {label.toUpperCase()}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

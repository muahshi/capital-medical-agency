import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, parseISO, isValid, startOfWeek, addDays } from 'date-fns'
import { TrendingUp, Package, Zap, Clock } from 'lucide-react'
import { formatCurrency, calculateTotalStockValue } from '../lib/stockUtils'

export default function HistoryPage({ items }) {
  const stats = useMemo(() => {
    // Stock value by category/source
    const bySource = items.reduce((acc, item) => {
      const src = item.source || 'manual'
      acc[src] = (acc[src] || 0) + 1
      return acc
    }, {})

    // Top 5 most valuable
    const topByValue = [...items]
      .map(i => ({ ...i, value: (i.quantity || 0) * (i.unit_price || 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    // Expiry distribution (group by month)
    const expiryDist = {}
    items.forEach(item => {
      if (!item.expiry_date) return
      try {
        const d = parseISO(item.expiry_date)
        if (!isValid(d)) return
        const key = format(d, 'MMM yy')
        expiryDist[key] = (expiryDist[key] || 0) + 1
      } catch {}
    })

    const expiryChart = Object.entries(expiryDist)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([month, count]) => ({ month, count }))

    return { bySource, topByValue, expiryChart }
  }, [items])

  const totalValue = calculateTotalStockValue(items)

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-dark-400 text-xs font-mono tracking-widest uppercase">Analytics</p>
        <h1 className="font-display text-3xl text-white tracking-widest">HISTORY</h1>
      </div>

      <div className="flex-1 scroll-area px-4 pb-4 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-800 rounded-2xl p-4 border border-dark-600">
            <TrendingUp className="w-5 h-5 text-gold-500 mb-2" />
            <p className="text-dark-400 text-[10px] font-mono uppercase tracking-wider">Total Value</p>
            <p className="text-gold-500 font-display text-2xl mt-1">{formatCurrency(totalValue)}</p>
          </div>
          <div className="bg-dark-800 rounded-2xl p-4 border border-dark-600">
            <Package className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-dark-400 text-[10px] font-mono uppercase tracking-wider">Total SKUs</p>
            <p className="text-white font-display text-2xl mt-1">{items.length}</p>
          </div>
          <div className="bg-dark-800 rounded-2xl p-4 border border-dark-600">
            <Zap className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-dark-400 text-[10px] font-mono uppercase tracking-wider">AI Scanned</p>
            <p className="text-green-400 font-display text-2xl mt-1">
              {items.filter(i => i.source === 'ai_scan').length}
            </p>
          </div>
          <div className="bg-dark-800 rounded-2xl p-4 border border-dark-600">
            <Clock className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-dark-400 text-[10px] font-mono uppercase tracking-wider">Manual</p>
            <p className="text-amber-400 font-display text-2xl mt-1">
              {items.filter(i => i.source === 'manual').length}
            </p>
          </div>
        </div>

        {/* Expiry Distribution Chart */}
        {stats.expiryChart.length > 0 && (
          <div className="bg-dark-800 rounded-2xl p-4 border border-dark-600">
            <p className="section-title mb-4">EXPIRY DISTRIBUTION</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.expiryChart} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: '#111',
                    border: '1px solid rgba(212,175,55,0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.expiryChart.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={i < 2 ? '#ef4444' : i < 4 ? '#f59e0b' : '#D4AF37'}
                      opacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-dark-400 text-[10px] font-mono">Urgent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-dark-400 text-[10px] font-mono">Warning</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gold-500" />
                <span className="text-dark-400 text-[10px] font-mono">Normal</span>
              </div>
            </div>
          </div>
        )}

        {/* Top valuable items */}
        {stats.topByValue.length > 0 && (
          <div className="space-y-2">
            <p className="section-title">TOP ITEMS BY VALUE</p>
            {stats.topByValue.map((item, i) => {
              const maxVal = stats.topByValue[0]?.value || 1
              const pct = Math.round((item.value / maxVal) * 100)
              return (
                <div key={item.id} className="bg-dark-800 rounded-xl p-3 border border-dark-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gold-500 font-mono text-sm font-bold">#{i + 1}</span>
                      <p className="text-white text-sm leading-tight truncate max-w-[180px]">{item.medicine_name}</p>
                    </div>
                    <p className="text-gold-500 font-mono text-sm font-bold shrink-0">{formatCurrency(item.value)}</p>
                  </div>
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #B8960C, #D4AF37)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-dark-400 text-[10px] font-mono">
                      {(item.quantity || 0).toLocaleString()} units × ₹{item.unit_price}
                    </span>
                    <span className="text-dark-400 text-[10px] font-mono">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <TrendingUp className="w-12 h-12 text-dark-600" />
            <p className="text-dark-400 text-sm">No data yet. Start by scanning a bill.</p>
          </div>
        )}
      </div>
    </div>
  )
}

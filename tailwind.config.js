/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Brand
        cyan:    { DEFAULT:'#00E5FF', dim:'#00B8D9', glow:'rgba(0,229,255,0.15)' },
        gold:    { DEFAULT:'#FFD700', dim:'#F59E0B', glow:'rgba(255,215,0,0.15)' },
        neon:    { green:'#00FF88', red:'#FF4D6D', orange:'#FF8C42' },
        // Backgrounds
        base:    '#040407',
        card:    '#0A0C12',
        card2:   '#0E1018',
        // Borders
        border:  'rgba(255,255,255,0.06)',
      },
      boxShadow: {
        'cyan':   '0 0 20px rgba(0,229,255,0.2)',
        'gold':   '0 0 20px rgba(255,215,0,0.2)',
        'red':    '0 0 20px rgba(255,77,109,0.25)',
        'green':  '0 0 20px rgba(0,255,136,0.2)',
        'purple': '0 0 24px rgba(124,58,237,0.3)',
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'scanner-bg':       'linear-gradient(135deg,#0a0a1e 0%,#0f0f2e 40%,#0a0a1e 100%)',
        'btn-primary':      'linear-gradient(135deg,#00B8D9,#0070F3)',
        'btn-gold':         'linear-gradient(135deg,#FFD700,#F59E0B)',
        'btn-scan':         'linear-gradient(135deg,#7C3AED,#2563EB)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease both',
        'slide-up':      'slideUp 0.3s ease both',
        'pulse-cyan':    'pulseCyan 2s ease infinite',
        'scan-line':     'scanLine 2s linear infinite',
        'network':       'networkPulse 2.5s ease infinite',
        'shimmer':       'shimmer 1.5s infinite',
        'spin-slow':     'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:       { from:{ opacity:'0', transform:'translateY(8px)' }, to:{ opacity:'1', transform:'translateY(0)' } },
        slideUp:      { from:{ opacity:'0', transform:'translateY(20px)' }, to:{ opacity:'1', transform:'translateY(0)' } },
        pulseCyan:    { '0%,100%':{ boxShadow:'0 0 0 0 rgba(0,229,255,0.3)' }, '50%':{ boxShadow:'0 0 0 8px rgba(0,229,255,0)' } },
        scanLine:     { '0%':{ top:'0%', opacity:'1' }, '90%':{ opacity:'1' }, '100%':{ top:'100%', opacity:'0' } },
        networkPulse: { '0%,100%':{ opacity:'0.3' }, '50%':{ opacity:'0.8' } },
        shimmer:      { '0%':{ backgroundPosition:'-200% 0' }, '100%':{ backgroundPosition:'200% 0' } },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

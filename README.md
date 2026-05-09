# 🏥 Capital Medical Agency v2.0
### AI-Powered Medical Inventory PWA

> **Smarter Inventory. Better Decisions.**

A fully offline-capable Progressive Web App for medical inventory management with AI bill scanning via Groq Vision.

---

## ✨ Features

- 🤖 **AI Bill Scanner** — Photo lena, Groq Vision OCR automatically extract karta hai medicine name, batch, expiry, qty, MRP
- 📦 **Real-time Inventory** — Live stock tracking with low stock + expiry alerts
- 📊 **Analytics Dashboard** — Stock value, expiry charts, top items
- 📱 **PWA** — Home screen par install karo, offline bhi kaam karta hai
- 🔐 **Magic Link Auth** — Password-free secure login via Supabase

---

## 🚀 Quick Start (Mobile se bhi kar sakte ho!)

### Step 1: Project clone karo
```bash
git clone https://github.com/YOUR_USERNAME/capital-medical-agency.git
cd capital-medical-agency
npm install
```

### Step 2: Environment setup karo
```bash
cp .env.example .env
```

`.env` file mein yeh values add karo:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GROQ_API_KEY=gsk_your_groq_key
```

### Step 3: Supabase setup karo
1. [supabase.com](https://supabase.com) par account banao (free)
2. New project banao
3. **SQL Editor** → New Query → `supabase/schema.sql` ka content paste karo → Run karo
4. **Project Settings → API** se URL aur anon key copy karo

### Step 4: Groq API key lo
1. [console.groq.com](https://console.groq.com) par signup karo (free)
2. **API Keys** → Create new key
3. `.env` mein `VITE_GROQ_API_KEY` mein paste karo

### Step 5: Run karo
```bash
npm run dev
```

Browser mein `http://localhost:5173` open karo

---

## 📱 Mobile par Install kaise karein (PWA)

### Android (Chrome):
1. App ko Chrome mein open karo
2. 3-dot menu → **"Add to Home Screen"**
3. Install → Done! 🎉

### iPhone (Safari):
1. App ko Safari mein open karo
2. Share button (box with arrow) → **"Add to Home Screen"**
3. Add → Done! 🎉

---

## 🔧 Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Environment variables add karo Vercel dashboard mein:
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GROQ_API_KEY
```

Ya phir GitHub se connect karo Vercel par auto-deploy ke liye.

---

## 🧠 AI Scanner Kaise Kaam Karta Hai

```
[Bill Photo] 
    ↓
[Base64 Convert]
    ↓
[Groq Vision API - llama-3.2-11b-vision-preview]
    ↓
[JSON Extract: medicine_name, batch_no, expiry_date, qty, mrp, gst_percent]
    ↓
[Preview & Edit]
    ↓
[Supabase mein Save]
    ↓
[Inventory Update]
```

---

## 📁 Project Structure

```
capital-medical-agency/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       # Main dashboard with stats
│   │   ├── ScannerPage.jsx     # AI bill scanner (core feature)
│   │   ├── InventoryPage.jsx   # Stock management
│   │   ├── HistoryPage.jsx     # Analytics & charts
│   │   ├── SettingsPage.jsx    # App settings
│   │   ├── LoginPage.jsx       # Magic link auth
│   │   └── BottomNav.jsx       # Navigation bar
│   ├── hooks/
│   │   ├── useAuth.js          # Supabase auth context
│   │   └── useStock.js         # Stock data management
│   ├── lib/
│   │   ├── groq.js             # Groq Vision AI integration
│   │   ├── supabase.js         # Supabase client + helpers
│   │   └── stockUtils.js       # Stock calculations & utilities
│   ├── styles/
│   │   └── globals.css         # Dark luxury theme
│   ├── App.jsx                 # Root component + navigation
│   └── main.jsx               # React entry point
├── public/
│   ├── manifest.json           # PWA manifest
│   └── favicon.svg             # App icon
├── supabase/
│   └── schema.sql              # Database schema + RLS
├── .env.example                # Environment template
├── vite.config.js              # Vite + PWA config
└── tailwind.config.js          # Dark luxury design tokens
```

---

## 💡 Demo Mode

Agar API keys nahi hain toh bhi app demo mode mein chalega:
- Sample inventory data dikhega
- AI scan simulate karega (fake data se)
- LocalStorage mein data save hoga

---

## 🎨 Design System

- **Colors**: Black background + Gold (`#D4AF37`) accents
- **Typography**: Bebas Neue (display) + DM Sans (body) + JetBrains Mono (data)
- **Theme**: High-tech dark luxury, mobile-first

---

Made with ❤️ for Capital Medical Agency

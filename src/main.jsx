```react
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// Kyunki aapne 'u' small rakha hai, toh path exact yahi hona chahiye
import { AuthProvider } from './hooks/useAuth' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)

```

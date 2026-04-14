import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
        <Toaster position="top-center" toastOptions={{
          style: {
            borderRadius: '12px',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 0 4px 16px rgba(0,0,0,0.1)',
          }
        }} />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)

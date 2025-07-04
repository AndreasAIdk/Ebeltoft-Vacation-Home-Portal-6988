import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Add error logging for debugging
window.addEventListener('error', (event) => {
  console.error('🚨 Window Error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason)
})

console.log('🚀 Main.jsx loading...')

const root = document.getElementById('root')
if (!root) {
  console.error('🚨 Root element not found!')
} else {
  console.log('✅ Root element found, rendering app...')
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

registerSW({ immediate: true })
// Ask the browser to keep this site's data (single-user app, progress lives on this device).
navigator.storage?.persist?.().catch(() => {})
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)

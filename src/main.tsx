import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { registerOfflineSupport } from './pwa'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element was not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

void registerOfflineSupport({
  isProduction: import.meta.env.PROD,
  baseUrl: import.meta.env.BASE_URL,
  serviceWorker: 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
})

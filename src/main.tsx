import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { captureWebsiteResult } from './lib/assessments'
import './index.css'

// A result taken on betterhood.in, handed over by its "Keep this in the app" link.
captureWebsiteResult()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

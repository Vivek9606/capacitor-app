import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { captureWebsiteResult } from './lib/assessments'
import { captureHandoff } from './lib/handoff'
import './index.css'

// Signed in on betterhood.in: carry that session over (#handoff=…). Runs first: it keeps any #import=….
captureHandoff()
// A result taken on betterhood.in, handed over by its "Keep this in the app" link.
captureWebsiteResult()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const rootElement = document.getElementById('root')
const root = createRoot(rootElement)

import('./App.jsx')
  .then(({ default: App }) => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(App),
      ),
    )
  })
  .catch((error) => {
    const message = error?.message || 'Unknown startup error'
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f6fb;padding:24px;font-family:Inter,system-ui,sans-serif;">
        <div style="max-width:760px;width:100%;background:#ffffff;border:1px solid #d0d7e8;border-radius:16px;padding:24px;color:#0f1623;box-shadow:0 8px 30px rgba(15,22,35,0.08);">
          <h1 style="margin:0 0 8px;font-size:22px;">AegisMesh failed to start</h1>
          <p style="margin:0 0 14px;color:#3a4560;">A frontend startup error occurred before the app could render.</p>
          <pre style="margin:0;background:#eef1f8;border:1px solid #d0d7e8;border-radius:10px;padding:12px;white-space:pre-wrap;word-break:break-word;color:#0f1623;">${message}</pre>
        </div>
      </div>
    `
    console.error('Fatal startup error:', error)
  })



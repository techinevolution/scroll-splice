import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { installEditorAdapterBrowserBridge } from './automation/editorAdapter'
import './styles.css'

const rootElement = document.getElementById('root')

if (import.meta.env.DEV) {
  installEditorAdapterBrowserBridge()
}

if (!rootElement) {
  throw new Error('ScrollSplice could not find its root element.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

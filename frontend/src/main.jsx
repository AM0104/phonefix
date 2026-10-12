import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SiteProvider } from './context/SiteContext.jsx'
import './styles/theme.css'
import './styles/layout.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SiteProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </SiteProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

// Сообщаем аварийному экрану из index.html, что React уже отрисовался:
// он больше не должен показывать «интерфейс не загрузился».
window.__PHONEFIX_MOUNTED__ = true

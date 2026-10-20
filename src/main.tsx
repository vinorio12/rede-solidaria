import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { tratarFalhaDeVersao } from './lib/carregar'
import { AVISO_VERSAO_NOVA } from './components/Feedback'
import './index.css'

tratarFalhaDeVersao()

if (location.protocol !== 'file:' && 'serviceWorker' in navigator) {
  // ao trocar de versão, o service worker recarrega a página; o aviso aparece depois da recarga
  const tinhaVersao = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinhaVersao) return
    try {
      sessionStorage.setItem(AVISO_VERSAO_NOVA, '1')
    } catch {
      /* sem aviso, sem problema */
    }
  })
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registro) {
      if (registro) setInterval(() => registro.update().catch(() => undefined), 60 * 60 * 1000)
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

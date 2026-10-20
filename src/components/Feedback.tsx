import { useEffect, useState } from 'react'
import { Icone } from './Icone'

// Avisos rápidos e confete (azul e ciano) disparados de qualquer tela.

type Toast = { id: number; texto: string; tipo: 'sucesso' | 'alerta' | 'info' }
type Evento = { tipo: 'toast'; toast: Toast } | { tipo: 'confete' }
const ouvintes = new Set<(e: Evento) => void>()
let seq = 0

export function avisar(texto: string, tipo: Toast['tipo'] = 'sucesso') {
  ouvintes.forEach((o) => o({ tipo: 'toast', toast: { id: ++seq, texto, tipo } }))
}

export function confete() {
  ouvintes.forEach((o) => o({ tipo: 'confete' }))
}

/** Executa uma ação e mostra o erro de regra (se houver) como aviso, sem quebrar a tela. */
export function tentar<T>(fn: () => T, sucesso?: string): T | undefined {
  try {
    const r = fn()
    if (sucesso) avisar(sucesso)
    return r
  } catch (e) {
    avisar(e instanceof Error ? e.message : 'Algo não saiu como esperado.', 'alerta')
    return undefined
  }
}

const CORES = ['#095BA7', '#00BEDF', '#0063A7', '#9BE7F5', '#00325C']

export const AVISO_VERSAO_NOVA = 'rede-solidaria:versao-nova'

export function CamadaFeedback() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [rodada, setRodada] = useState(0)

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(AVISO_VERSAO_NOVA)) return
      sessionStorage.removeItem(AVISO_VERSAO_NOVA)
      setTimeout(() => avisar('Nova versão do app disponível e já aplicada.', 'info'), 300)
    } catch {
      /* sem sessionStorage */
    }
  }, [])

  useEffect(() => {
    const o = (e: Evento) => {
      if (e.tipo === 'toast') {
        setToasts((ts) => [...ts.slice(-2), e.toast])
        setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== e.toast.id)), 4200)
      } else {
        setRodada((r) => r + 1)
      }
    }
    ouvintes.add(o)
    return () => {
      ouvintes.delete(o)
    }
  }, [])

  useEffect(() => {
    if (!rodada) return
    const t = setTimeout(() => setRodada(0), 2600)
    return () => clearTimeout(t)
  }, [rodada])

  return (
    <>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
              t.tipo === 'alerta' ? 'bg-alerta text-white' : t.tipo === 'info' ? 'bg-weg-900 text-white' : 'bg-sucesso text-white'
            }`}
          >
            <Icone nome={t.tipo === 'alerta' ? 'alerta' : t.tipo === 'info' ? 'info' : 'check'} tamanho={18} className="mt-0.5 shrink-0" />
            {t.texto}
          </div>
        ))}
      </div>
      {rodada > 0 && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
          {Array.from({ length: 70 }, (_, i) => (
            <span
              key={`${rodada}-${i}`}
              className="absolute top-0 block rounded-sm"
              style={
                {
                  left: `${(i * 37) % 100}%`,
                  width: 6 + (i % 4) * 2,
                  height: 10 + (i % 3) * 3,
                  background: CORES[i % CORES.length],
                  animation: `cair ${1.6 + (i % 7) * 0.12}s ease-in ${(i % 10) * 0.05}s forwards`,
                  '--dx': `${((i % 9) - 4) * 18}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </>
  )
}

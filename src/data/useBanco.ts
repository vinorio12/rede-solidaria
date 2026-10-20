import { useRef, useSyncExternalStore } from 'react'
import { assinar, getBanco } from './db'

/** Banco reativo: a tela re-renderiza a cada mutação. */
export function useBanco() {
  return useSyncExternalStore(assinar, getBanco, getBanco)
}

/**
 * Cada mutação gera cópias novas dos registros. Para usar um registro como
 * dependência de efeito (WebGL, carregamentos), mantém a mesma referência
 * enquanto o conteúdo não mudar.
 */
export function useEstavel<T>(valor: T): T {
  const ref = useRef<{ json: string; valor: T } | null>(null)
  const json = JSON.stringify(valor) ?? ''
  if (!ref.current || ref.current.json !== json) ref.current = { json, valor }
  return ref.current.valor
}

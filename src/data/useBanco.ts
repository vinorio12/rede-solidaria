import { useSyncExternalStore } from 'react'
import { assinar, getBanco } from './db'

/** Banco reativo: a tela re-renderiza a cada mutação. */
export function useBanco() {
  return useSyncExternalStore(assinar, getBanco, getBanco)
}

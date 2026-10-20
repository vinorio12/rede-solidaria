import type { Banco } from '@/domain/types'
import { criarSeed, VERSAO_SEED } from './seed'

// Repositório local do protótipo. Toda leitura e escrita passa por aqui,
// então trocar por uma API REST significa reimplementar só este módulo
// e os serviços em src/domain/servicos.ts.

const CHAVE = 'rede-solidaria:db'

type Ouvinte = () => void
const ouvintes = new Set<Ouvinte>()
let banco: Banco = carregar()

function carregar(): Banco {
  try {
    const bruto = globalThis.localStorage?.getItem(CHAVE)
    if (bruto) {
      const salvo = JSON.parse(bruto) as Banco
      if (salvo.versao === VERSAO_SEED) return salvo
    }
  } catch {
    // armazenamento indisponível: segue com os dados de exemplo em memória
  }
  return criarSeed()
}

function persistir() {
  try {
    globalThis.localStorage?.setItem(CHAVE, JSON.stringify(banco))
  } catch {
    // cota excedida (ex.: muitos comprovantes): os dados seguem em memória
  }
}

export function getBanco(): Banco {
  return banco
}

/** Aplica uma mutação e notifica a interface. Gera um novo objeto raiz para o React detectar a mudança. */
export function mutar<T>(fn: (b: Banco) => T): T {
  const resultado = fn(banco)
  banco = { ...banco }
  persistir()
  ouvintes.forEach((o) => o())
  return resultado
}

export function assinar(o: Ouvinte) {
  ouvintes.add(o)
  return () => ouvintes.delete(o)
}

export function restaurarExemplo() {
  banco = criarSeed()
  persistir()
  ouvintes.forEach((o) => o())
}

export function substituirBanco(novo: Banco) {
  banco = novo
  persistir()
  ouvintes.forEach((o) => o())
}

let contador = 0
export function novoId(prefixo: string) {
  contador += 1
  return `${prefixo}_${Date.now().toString(36)}${contador.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function agoraIso() {
  return new Date().toISOString()
}

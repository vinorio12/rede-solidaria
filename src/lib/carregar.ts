import { lazy, type ComponentType } from 'react'

// Carregamento sob demanda com nova tentativa controlada: se o download de um
// pedaço do app falhar (rede instável, versão nova publicada), tenta mais uma vez
// antes de entregar o erro ao limite de erro da rota.

export function importarComNovaTentativa<T>(importar: () => Promise<T>, tentativas = 2, espera = 600): Promise<T> {
  return importar().catch((erro: unknown) => {
    if (tentativas <= 1) throw erro
    return new Promise<T>((ok, falha) => setTimeout(() => importarComNovaTentativa(importar, tentativas - 1, espera * 2).then(ok, falha), espera))
  })
}

export function lazyComNovaTentativa<P extends object>(importar: () => Promise<ComponentType<P>>) {
  return lazy(() => importarComNovaTentativa(importar).then((C) => ({ default: C })))
}

const CHAVE_RECARGA = 'rede-solidaria:recarga-versao'

/**
 * Quando o navegador tem um index.html antigo apontando para arquivos que não existem
 * mais (nova versão publicada), o Vite dispara `vite:preloadError`. Recarrega uma única
 * vez por minuto para buscar a versão nova; se falhar de novo, o limite de erro assume.
 */
export function tratarFalhaDeVersao() {
  window.addEventListener('vite:preloadError', (evento) => {
    try {
      const ultima = Number(sessionStorage.getItem(CHAVE_RECARGA) ?? 0)
      if (Date.now() - ultima < 60_000) return
      sessionStorage.setItem(CHAVE_RECARGA, String(Date.now()))
      evento.preventDefault()
      location.reload()
    } catch {
      /* sem sessionStorage: deixa o erro seguir para o limite de erro */
    }
  })
}

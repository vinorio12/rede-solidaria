// O app aberto como arquivo (duplo clique no computador = file://; no Android o
// Chrome abre arquivos baixados como content://) não tem servidor: usa rotas com
// # e não registra service worker.
export const arquivoLocal = typeof location !== 'undefined' && !/^https?:$/.test(location.protocol)

/** Endereço absoluto de uma rota interna, para links e QR Codes. */
export function urlInterna(caminho: string) {
  return arquivoLocal ? `${location.href.split('#')[0]}#${caminho}` : `${location.origin}${caminho}`
}

/** Dispara o download de um arquivo gerado no navegador. */
export function baixar(bytesPdf: Uint8Array | Blob, nome: string, tipo = 'application/pdf') {
  const blob = bytesPdf instanceof Blob ? bytesPdf : new Blob([bytesPdf as BlobPart], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

import type { Pin } from '@/domain/types'
import frente2026 from '@/assets/pins/2026/frente.png'
import foto2026 from '@/assets/pins/2026/foto-pin.png'
import mascote from '@/assets/mascote/leao-neutro.png'

// Artes oficiais dos pins por chave. Para cadastrar a arte de um novo ano,
// salve a face frontal recortada em círculo (PNG 512x512, fundo transparente)
// em src/assets/pins/<ano>/frente.png e registre a chave aqui.
export const ARTES_PINS: Record<string, { frente: string; foto?: string }> = {
  'pin-2026': { frente: frente2026, foto: foto2026 },
}

export function arteDoPin(pin: Pin) {
  return pin.arte ? ARTES_PINS[pin.arte] : undefined
}

let imgMascote: HTMLImageElement | null = null
function carregarMascote() {
  if (imgMascote) return Promise.resolve(imgMascote)
  return new Promise<HTMLImageElement>((ok) => {
    const img = new Image()
    img.onload = () => ok((imgMascote = img))
    img.onerror = () => ok(img)
    img.src = mascote
  })
}

/** Modelo procedural da face do pin (disco esmaltado com relevo, ano e leãozinho) até a arte real chegar. */
export async function desenharFaceProcedural(pin: Pin, tamanho = 512) {
  const c = document.createElement('canvas')
  c.width = c.height = tamanho
  const g = c.getContext('2d')!
  const r = tamanho / 2
  g.translate(r, r)

  const metal = g.createLinearGradient(-r, -r, r, r)
  metal.addColorStop(0, '#f4f7fa')
  metal.addColorStop(0.5, '#9aa7b4')
  metal.addColorStop(1, '#e7ecf1')
  g.fillStyle = metal
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.fill()

  const esmalte = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 0.92)
  esmalte.addColorStop(0, '#ffffff')
  esmalte.addColorStop(0.55, pin.corRelevo)
  esmalte.addColorStop(1, pin.corBase)
  g.fillStyle = esmalte
  g.beginPath()
  g.arc(0, 0, r * 0.9, 0, Math.PI * 2)
  g.fill()

  g.strokeStyle = pin.corBase
  g.lineWidth = tamanho * 0.012
  g.beginPath()
  g.arc(0, 0, r * 0.78, Math.PI * 0.15, Math.PI * 0.85)
  g.stroke()

  // texto em arco
  g.fillStyle = pin.corBase
  g.font = `bold ${tamanho * 0.07}px Arial, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const texto = 'REDE SOLIDÁRIA'
  const raio = r * 0.74
  const passo = 0.14
  const inicio = -Math.PI / 2 - ((texto.length - 1) * passo) / 2
  ;[...texto].forEach((ch, i) => {
    const a = inicio + i * passo
    g.save()
    g.rotate(a + Math.PI / 2)
    g.fillText(ch, 0, -raio)
    g.restore()
  })

  const img = await carregarMascote()
  if (img.naturalWidth) {
    const s = tamanho * 0.5
    g.globalAlpha = 0.95
    g.drawImage(img, -s / 2, -s * 0.48, s, s)
    g.globalAlpha = 1
  }

  g.fillStyle = '#ffffff'
  g.strokeStyle = pin.corBase
  g.lineWidth = tamanho * 0.012
  g.font = `bold ${tamanho * 0.13}px Arial, sans-serif`
  g.strokeText(String(pin.ano), 0, r * 0.58)
  g.fillText(String(pin.ano), 0, r * 0.58)
  return c
}

/** URL da imagem 2D da face (miniaturas e fallback sem WebGL). */
export async function urlFace(pin: Pin) {
  const arte = arteDoPin(pin)
  if (arte) return arte.frente
  return (await desenharFaceProcedural(pin, 256)).toDataURL('image/png')
}

export function suportaWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

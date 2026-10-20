import mascoteUrl from '@/assets/mascote/leao-neutro.png'

// Card compartilhável (seção 6.13): nome, nível e pin do ano. Nunca exibe valores.

function carregar(src: string) {
  return new Promise<HTMLImageElement>((ok, erro) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = erro
    img.src = src
  })
}

export async function gerarCard(d: { nome: string; nivel: string; nivelNumero: number; pinUrl?: string; pinAno?: number; insignias: number }) {
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!

  const fundo = g.createLinearGradient(0, 0, W, H)
  fundo.addColorStop(0, '#00325C')
  fundo.addColorStop(1, '#095BA7')
  g.fillStyle = fundo
  g.fillRect(0, 0, W, H)
  g.fillStyle = 'rgba(0,190,223,0.18)'
  g.beginPath()
  g.arc(W * 0.85, H * 0.12, 260, 0, Math.PI * 2)
  g.fill()

  g.fillStyle = '#ffffff'
  g.textAlign = 'center'
  g.font = 'bold 64px Arial, sans-serif'
  g.fillText('Rede Solidária', W / 2, 140)
  g.font = 'bold 30px Arial, sans-serif'
  g.fillStyle = '#00BEDF'
  g.fillText('W E G', W / 2, 190)

  if (d.pinUrl) {
    const pin = await carregar(d.pinUrl)
    g.save()
    g.shadowColor = 'rgba(0,0,0,0.45)'
    g.shadowBlur = 40
    g.shadowOffsetY = 18
    g.beginPath()
    g.arc(W / 2, 540, 250, 0, Math.PI * 2)
    g.closePath()
    g.clip()
    g.drawImage(pin, W / 2 - 250, 290, 500, 500)
    g.restore()
  }
  const mascote = await carregar(mascoteUrl)
  g.drawImage(mascote, 60, 640, 260, 260)

  g.fillStyle = '#ffffff'
  g.font = 'bold 72px Arial, sans-serif'
  const nome = d.nome.length > 24 ? `${d.nome.slice(0, 23)}…` : d.nome
  g.fillText(nome, W / 2, 930)
  g.font = '40px Arial, sans-serif'
  g.fillStyle = '#D9F6FB'
  g.fillText(`Nível ${d.nivelNumero} · ${d.nivel}`, W / 2, 1000)
  if (d.pinAno) g.fillText(`Pin ${d.pinAno} conquistado`, W / 2, 1060)
  g.fillText(`${d.insignias} insígnias na coleção`, W / 2, 1120)

  g.fillStyle = '#00BEDF'
  g.font = 'bold 34px Arial, sans-serif'
  g.fillText('Destinar o IR não custa nada a mais. Faça parte.', W / 2, 1250)

  return new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), 'image/png'))
}

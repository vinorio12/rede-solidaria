import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'
import mascoteUrl from '@/assets/mascote/leao-neutro.png'
import { data } from './datas'
import { textoCarta, type DadosCarta } from './cartaTexto'

// Geração de PDF no navegador (seção 8 e 6.13).

const AZUL_WEG = rgb(0, 50 / 255, 92 / 255)
const AZUL_RS = rgb(9 / 255, 91 / 255, 167 / 255)
const CIANO = rgb(0, 190 / 255, 223 / 255)
const CINZA = rgb(0.29, 0.36, 0.45)

async function bytes(url: string) {
  return new Uint8Array(await (await fetch(url)).arrayBuffer())
}

function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number) {
  const linhas: string[] = []
  for (const paragrafo of texto.split('\n')) {
    let linha = ''
    for (const palavra of paragrafo.split(' ')) {
      const teste = linha ? `${linha} ${palavra}` : palavra
      if (fonte.widthOfTextAtSize(teste, tamanho) > largura && linha) {
        linhas.push(linha)
        linha = palavra
      } else linha = teste
    }
    linhas.push(linha)
  }
  return linhas
}

function escrever(page: PDFPage, texto: string, x: number, y: number, fonte: PDFFont, tamanho: number, largura: number, cor = rgb(0.06, 0.14, 0.23), entrelinha = 1.45) {
  let yy = y
  for (const l of quebrar(texto, fonte, tamanho, largura)) {
    page.drawText(l, { x, y: yy, size: tamanho, font: fonte, color: cor })
    yy -= tamanho * entrelinha
  }
  return yy
}

async function cabecalho(pdf: PDFDocument, page: PDFPage, titulo: string) {
  const { width, height } = page.getSize()
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold)
  const normal = await pdf.embedFont(StandardFonts.Helvetica)
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: AZUL_WEG })
  page.drawRectangle({ x: 0, y: height - 94, width, height: 4, color: CIANO })
  const mascote = await pdf.embedPng(await bytes(mascoteUrl))
  page.drawImage(mascote, { x: 36, y: height - 84, width: 76, height: 76 })
  page.drawText('Rede Solidária', { x: 122, y: height - 46, size: 20, font: negrito, color: rgb(1, 1, 1) })
  page.drawText('WEG · Seção Desenvolvimento Social', { x: 122, y: height - 64, size: 10, font: normal, color: rgb(0.85, 0.93, 1) })
  page.drawText(titulo, { x: 36, y: height - 130, size: 15, font: negrito, color: AZUL_RS })
  return { negrito, normal }
}

export async function gerarCartaPdf(d: DadosCarta) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Carta de destinação ${d.codigo}`)
  pdf.setAuthor('Rede Solidária WEG')
  const page = pdf.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  const { negrito, normal } = await cabecalho(pdf, page, 'Carta de destinação')
  const larg = width - 72
  const tx = textoCarta(d)

  let y = height - 168
  y = escrever(page, tx.destinatario, 36, y, negrito, 11.5, larg)
  y -= 14
  y = escrever(page, tx.corpo, 36, y, normal, 11, larg)
  y -= 10
  y = escrever(page, tx.pedido, 36, y, normal, 11, larg)
  y -= 18
  y = escrever(page, tx.local, 36, y, normal, 11, larg)
  y -= 56
  page.drawLine({ start: { x: 36, y }, end: { x: 300, y }, thickness: 0.8, color: CINZA })
  page.drawText(d.nome, { x: 36, y: y - 14, size: 10.5, font: negrito })
  page.drawText(`E-mail: ${d.email} · Telefone: ${d.telefone}`, { x: 36, y: y - 28, size: 9, font: normal, color: CINZA })

  // rodapé com código único e QR Code de verificação
  const qr = await pdf.embedPng(await QRCode.toDataURL(d.urlVerificacao, { margin: 1, width: 240, color: { dark: '#00325C', light: '#FFFFFF' } }))
  page.drawRectangle({ x: 36, y: 40, width: larg, height: 110, borderColor: CIANO, borderWidth: 1, color: rgb(0.95, 0.99, 1) })
  page.drawImage(qr, { x: width - 36 - 96, y: 47, width: 96, height: 96 })
  page.drawText('Código da carta', { x: 50, y: 126, size: 9, font: normal, color: CINZA })
  page.drawText(d.codigo, { x: 50, y: 108, size: 14, font: negrito, color: AZUL_WEG })
  escrever(page, `Verifique a autenticidade em ${d.urlVerificacao} ou pelo QR Code. Emitida em ${data(d.emitidaEm)} pelo app Rede Solidária.`, 50, 88, normal, 8.5, larg - 130, CINZA, 1.4)
  return pdf.save()
}

export async function gerarCertificadoPdf(d: { nome: string; ciclo: string; nivel: string; insignias: string[]; codigo: string; pinUrl?: string }) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Certificado Rede Solidária ${d.ciclo}`)
  const page = pdf.addPage([841.89, 595.28])
  const { width, height } = page.getSize()
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold)
  const normal = await pdf.embedFont(StandardFonts.Helvetica)
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.97, 0.99, 1) })
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: AZUL_RS, borderWidth: 3 })
  page.drawRectangle({ x: 26, y: 26, width: width - 52, height: height - 52, borderColor: CIANO, borderWidth: 1 })
  const mascote = await pdf.embedPng(await bytes(mascoteUrl))
  page.drawImage(mascote, { x: 60, y: height - 210, width: 150, height: 150 })
  if (d.pinUrl) {
    const pin = await pdf.embedPng(await bytes(d.pinUrl))
    page.drawImage(pin, { x: width - 190, y: height - 190, width: 120, height: 120 })
  }
  const centro = (txt: string, y: number, size: number, font: PDFFont, color = AZUL_WEG) =>
    page.drawText(txt, { x: (width - font.widthOfTextAtSize(txt, size)) / 2, y, size, font, color })
  centro('CERTIFICADO DE PARTICIPAÇÃO', height - 110, 26, negrito)
  centro('Rede Solidária WEG', height - 140, 14, normal, AZUL_RS)
  centro('Certificamos que', height - 230, 13, normal, CINZA)
  centro(d.nome, height - 270, 30, negrito)
  const linhas = quebrar(
    `participou da ${d.ciclo} da Rede Solidária, destinando parte do Imposto de Renda aos Fundos dos Direitos da Criança e do Adolescente e da Pessoa Idosa, para que o recurso permaneça no município e transforme vidas.`,
    normal,
    13,
    width - 220,
  )
  linhas.forEach((l, i) => centro(l, height - 310 - i * 20, 13, normal, CINZA))
  centro(`Nível alcançado: ${d.nivel}`, 150, 12, negrito, AZUL_RS)
  if (d.insignias.length) centro(`Insígnias: ${d.insignias.slice(0, 6).join(' · ')}`, 130, 10, normal, CINZA)
  page.drawLine({ start: { x: width / 2 - 140, y: 92 }, end: { x: width / 2 + 140, y: 92 }, thickness: 0.8, color: CINZA })
  centro('Seção Desenvolvimento Social · Departamento de Sustentabilidade', 76, 10, normal, CINZA)
  centro(`Código ${d.codigo}`, 44, 8, normal, CINZA)
  return pdf.save()
}

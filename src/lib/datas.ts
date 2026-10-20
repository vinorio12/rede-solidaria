// Datas no formato DD/MM/AAAA e moeda em R$ (seção 12).

const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtNumero = new Intl.NumberFormat('pt-BR')

export function moeda(v: number) {
  return fmtMoeda.format(v)
}

export function numero(v: number) {
  return fmtNumero.format(v)
}

/** Converte 'AAAA-MM-DD' ou ISO completo em DD/MM/AAAA, sem deslocamento de fuso. */
export function data(iso: string | undefined) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export function dataHora(iso: string) {
  const dt = new Date(iso)
  return `${data(diaLocal(dt))} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
}

/** AAAA-MM-DD no fuso local. */
export function diaLocal(dt = new Date()) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** Chave da semana ISO (AAAA-Wnn), usada nas missões semanais. */
export function semanaIso(dt = new Date()) {
  const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
  const dia = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dia)
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const semana = Math.ceil(((d.getTime() - inicioAno.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`
}

export function diasAte(iso: string, hoje = new Date()) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  const alvo = new Date(a, m - 1, d)
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return Math.round((alvo.getTime() - base.getTime()) / 86400000)
}

/** Verifica se a data (MM-DD) cai no intervalo de uma temporada, inclusive intervalos que viram o ano. */
export function dentroDoIntervalo(mmdd: string, inicio: string, fim: string) {
  return inicio <= fim ? mmdd >= inicio && mmdd <= fim : mmdd >= inicio || mmdd <= fim
}

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function ate999(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const partes: string[] = []
  if (c) partes.push(CENTENAS[c])
  if (resto < 20) {
    if (resto) partes.push(UNIDADES[resto])
  } else {
    const d = Math.floor(resto / 10)
    const u = resto % 10
    partes.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d])
  }
  return partes.join(' e ')
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero'
  const grupos: number[] = []
  let x = n
  while (x > 0) {
    grupos.push(x % 1000)
    x = Math.floor(x / 1000)
  }
  const nomes: [string, string][] = [
    ['', ''],
    ['mil', 'mil'],
    ['milhão', 'milhões'],
    ['bilhão', 'bilhões'],
  ]
  const partes: string[] = []
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i]
    if (!g) continue
    let texto = i === 1 && g === 1 ? 'mil' : ate999(g)
    if (i >= 1 && !(i === 1 && g === 1)) texto += ' ' + (g === 1 ? nomes[i][0] : nomes[i][1])
    partes.push(texto.trim())
  }
  if (partes.length === 1) return partes[0]
  // "e" antes do último grupo quando ele é < 100 ou centena redonda
  const ultimoGrupo = grupos[0]
  const ultimo = partes.pop()!
  const usaE = ultimoGrupo > 0 && (ultimoGrupo < 100 || ultimoGrupo % 100 === 0)
  return partes.join(' ') + (usaE ? ' e ' : ' ') + ultimo
}

/** Valor em reais por extenso, para a carta de destinação. */
export function valorPorExtenso(valor: number) {
  const centavosTotais = Math.round(valor * 100)
  const reais = Math.floor(centavosTotais / 100)
  const centavos = centavosTotais % 100
  const partes: string[] = []
  if (reais > 0) {
    const milhoesRedondos = reais >= 1_000_000 && reais % 1_000_000 === 0
    partes.push(`${inteiroPorExtenso(reais)}${milhoesRedondos ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`)
  }
  if (centavos > 0) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  if (!partes.length) return 'zero real'
  return partes.join(' e ')
}

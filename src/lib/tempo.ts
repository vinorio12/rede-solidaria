// Datas do jogo sempre no fuso America/Sao_Paulo: o dia vira à meia-noite de
// Brasília e a semana começa na segunda-feira, independentemente do fuso do aparelho.

export const FUSO = 'America/Sao_Paulo'

const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
const fmtHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** AAAA-MM-DD do instante, no fuso de Brasília. */
export function diaSP(instante: Date | string | number = new Date()) {
  return fmtDia.format(new Date(instante))
}

export function horaSP(instante: Date | string | number = new Date()) {
  return fmtHora.format(new Date(instante))
}

function utcDoDia(dia: string) {
  const [a, m, d] = dia.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

export function somarDias(dia: string, n: number) {
  return new Date(utcDoDia(dia) + n * 86400000).toISOString().slice(0, 10)
}

/** Segunda-feira (AAAA-MM-DD) da semana do instante, no fuso de Brasília. */
export function segundaSP(instante: Date | string | number = new Date()) {
  const dia = diaSP(instante)
  const semana = new Date(utcDoDia(dia)).getUTCDay() // 0 = domingo
  return somarDias(dia, -((semana + 6) % 7))
}

/** Chave da semana (segunda-feira de início), usada nas missões semanais e no ranking. */
export function semanaSP(instante: Date | string | number = new Date()) {
  return segundaSP(instante)
}

/** MM-DD no fuso de Brasília. */
export function mesDiaSP(instante: Date | string | number = new Date()) {
  return diaSP(instante).slice(5)
}

/** Diferença em dias entre dois AAAA-MM-DD. */
export function diasEntre(de: string, ate: string) {
  return Math.round((utcDoDia(ate) - utcDoDia(de)) / 86400000)
}

/** Hash determinístico simples (sorteios por usuário e por dia). */
export function hash(texto: string) {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Sorteio determinístico a partir de uma semente (mesma semente, mesmo resultado). */
export function sortear(lista: string[], semente: string, quantidade: number) {
  return [...lista]
    .map((item) => ({ item, peso: hash(`${semente}:${item}`) }))
    .sort((a, b) => a.peso - b.peso)
    .slice(0, quantidade)
    .map((x) => x.item)
}

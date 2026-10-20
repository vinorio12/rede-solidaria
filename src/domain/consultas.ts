import type { Banco, Evento, Genero, ID, Missao, Nivel, Reporte, Temporada, Tier, Usuario } from './types'
import { diaSP, mesDiaSP, segundaSP } from '@/lib/tempo'
import { dentroDoIntervalo } from '@/lib/datas'

// Consultas puras sobre o banco, sem efeitos colaterais. Usadas pelo motor,
// pelas regras e pelas telas.

export function usuario(b: Banco, uid: ID) {
  return b.usuarios.find((u) => u.id === uid)
}

export function cicloAtivo(b: Banco) {
  return b.ciclos.find((c) => c.ano === b.configuracoes.cicloAtivo) ?? b.ciclos[b.ciclos.length - 1]
}

export function xpTotal(b: Banco, uid: ID) {
  let s = 0
  for (const t of b.transacoesXp) if (t.usuarioId === uid) s += t.xp
  return s
}

export function xpCiclo(b: Banco, uid: ID, ano: number) {
  let s = 0
  for (const t of b.transacoesXp) if (t.usuarioId === uid && t.ciclo === ano) s += t.xp
  return s
}

/** XP ganho dentro de um intervalo de datas (AAAA-MM-DD, inclusivo) no fuso de Brasília. */
export function xpEntre(b: Banco, uid: ID, de: string, ate: string) {
  let s = 0
  for (const t of b.transacoesXp) {
    if (t.usuarioId !== uid) continue
    const d = diaSP(t.em)
    if (d >= de && d <= ate) s += t.xp
  }
  return s
}

export function saldoPatinhas(b: Banco, uid: ID) {
  let s = 0
  for (const t of b.transacoesPatinhas) if (t.usuarioId === uid) s += t.patinhas
  return s
}

// ------------------------------------------------------------------ níveis, tiers e títulos

export function nivelDe(xp: number, niveis: Nivel[]) {
  const ordenados = [...niveis].sort((a, c) => a.xpMinimo - c.xpMinimo)
  let atual = ordenados[0]
  for (const n of ordenados) if (xp >= n.xpMinimo) atual = n
  const proximo = ordenados.find((n) => n.xpMinimo > xp)
  const progresso = proximo ? (xp - atual.xpMinimo) / (proximo.xpMinimo - atual.xpMinimo) : 1
  return { atual, proximo, progresso }
}

export function tierDe(b: Banco, nivel: Nivel): Tier {
  return b.tiers.find((t) => t.numero === nivel.tier) ?? b.tiers[0]
}

/** Estrelas de Lenda: a cada N XP depois do último nível. */
export function estrelasPrestigio(b: Banco, xp: number) {
  const topo = Math.max(...b.niveis.map((n) => n.xpMinimo))
  const passo = b.configuracoes.prestigio.xpPorEstrela
  if (xp < topo + passo || passo <= 0) return { estrelas: 0, progresso: Math.max(0, (xp - topo) / passo), faltam: topo + passo - xp }
  const estrelas = Math.floor((xp - topo) / passo)
  const resto = (xp - topo) % passo
  return { estrelas, progresso: resto / passo, faltam: passo - resto }
}

export function flexionar(texto: { m: string; f: string; n: string }, g: Genero) {
  return texto[g] ?? texto.m
}

export function statusJogador(b: Banco, uid: ID) {
  const u = usuario(b, uid)!
  const xp = xpTotal(b, uid)
  const nv = nivelDe(xp, b.niveis)
  const tier = tierDe(b, nv.atual)
  const prest = estrelasPrestigio(b, xp)
  const tituloNivel = flexionar(nv.atual.titulo, u.genero)
  let titulo = tituloNivel
  if (u.tituloEscolhido && u.tituloEscolhido !== 'nivel') {
    const ins = b.insignias.find((i) => i.id === u.tituloEscolhido)
    const tem = b.usuarioInsignias.some((x) => x.usuarioId === uid && x.insigniaId === u.tituloEscolhido)
    if (ins?.titulo && tem) titulo = flexionar(ins.titulo, u.genero)
  }
  return { usuario: u, xp, ...nv, tier, tierNome: flexionar(tier.nome, u.genero), titulo, tituloNivel, prestigio: prest, patinhas: saldoPatinhas(b, uid) }
}

// ------------------------------------------------------------------ reportes e meta

export function reportesValidados(b: Banco, filtro: (r: Reporte) => boolean = () => true) {
  return b.reportes.filter((r) => r.status === 'validado' && filtro(r))
}

/** Total arrecadado: sempre calculado a partir dos reportes validados. */
export function totalArrecadado(b: Banco, ano: number) {
  return reportesValidados(b, (r) => r.ciclo === ano).reduce((s, r) => s + r.valor, 0)
}

export function totalEmValidacao(b: Banco, ano: number) {
  return b.reportes
    .filter((r) => r.ciclo === ano && ['enviado', 'em_validacao', 'aguardando_colaborador'].includes(r.status))
    .reduce((s, r) => s + r.valor, 0)
}

export function indicadoresCiclo(b: Banco, ano: number) {
  const validados = reportesValidados(b, (r) => r.ciclo === ano)
  return {
    participantes: new Set(validados.map((r) => r.usuarioId)).size,
    municipios: new Set(validados.map((r) => `${r.municipio}/${r.uf}`)).size,
    entidades: new Set(validados.filter((r) => r.entidadeId).map((r) => r.entidadeId)).size,
  }
}

/** Ciclos com participação: histórico anterior ao app + destinações próprias ou de familiares validadas. */
export function ciclosParticipados(b: Banco, uid: ID) {
  const u = usuario(b, uid)
  const anos = new Set<number>(u?.ciclosAnteriores ?? [])
  for (const r of b.reportes) if (r.usuarioId === uid && r.status === 'validado' && !r.convidado) anos.add(r.ciclo)
  return [...anos].sort((a, c) => a - c)
}

export function ciclosConsecutivosAntes(b: Banco, uid: ID, ano: number) {
  const anos = new Set(ciclosParticipados(b, uid))
  let n = 0
  while (anos.has(ano - n - 1)) n++
  return n
}

export function sequenciaCiclos(b: Banco, uid: ID, ano: number) {
  const anos = new Set(ciclosParticipados(b, uid))
  const base = anos.has(ano) ? ano : ano - 1
  let n = 0
  while (anos.has(base - n)) n++
  return n
}

export function bonusConsecutivoPct(b: Banco, uid: ID, ano: number) {
  const t = b.configuracoes.tabelaXp
  return Math.min(ciclosConsecutivosAntes(b, uid, ano) * t.bonusConsecutivoPct, t.bonusConsecutivoMaxPct)
}

// ------------------------------------------------------------------ temporadas

export interface OcorrenciaTemporada {
  temporada: Temporada
  chave: string
  inicio: string // AAAA-MM-DD
  fim: string
}

/** Ocorrência da temporada que contém o instante (com as datas reais de início e fim). */
export function ocorrenciaTemporada(b: Banco, instante: Date | string = new Date()): OcorrenciaTemporada | undefined {
  const dia = diaSP(instante)
  const ano = Number(dia.slice(0, 4))
  const mmdd = dia.slice(5)
  for (const t of b.temporadas) {
    for (const [i, iv] of t.intervalos.entries()) {
      if (!dentroDoIntervalo(mmdd, iv.inicio, iv.fim)) continue
      const viraAno = iv.inicio > iv.fim
      const anoInicio = viraAno && mmdd <= iv.fim ? ano - 1 : ano
      const anoFim = viraAno ? anoInicio + 1 : anoInicio
      return { temporada: t, chave: `${t.id}:${anoInicio}:${i}`, inicio: `${anoInicio}-${iv.inicio}`, fim: `${anoFim}-${iv.fim}` }
    }
  }
  return undefined
}

export function temporadaAtual(b: Banco, instante: Date | string = new Date()) {
  return ocorrenciaTemporada(b, instante)?.temporada
}

/** Pontos de temporada: o XP ganho dentro da ocorrência (estornos descontam automaticamente). */
export function pontosTemporada(b: Banco, uid: ID, oc = ocorrenciaTemporada(b)) {
  return oc ? xpEntre(b, uid, oc.inicio, oc.fim) : 0
}

// ------------------------------------------------------------------ missões: disponibilidade e período

export function relampagoAtivo(b: Banco, instante: Date | string = new Date()) {
  const t = new Date(instante).getTime()
  return b.configuracoes.relampagos.find((r) => new Date(r.inicio).getTime() <= t && t <= new Date(r.fim).getTime())
}

export function missaoDisponivel(m: Missao, u: Usuario, b: Banco, instante: Date | string = new Date()) {
  if (!m.ativa) return false
  if (m.publico === 'embaixadores' && u.perfil !== 'embaixador') return false
  if (m.tierMinimo && tierDe(b, nivelDe(xpTotal(b, u.id), b.niveis).atual).numero < m.tierMinimo) return false
  if (m.tipo === 'temporada' && m.temporadaId && ocorrenciaTemporada(b, instante)?.temporada.id !== m.temporadaId) return false
  if (m.tipo === 'relampago') {
    const t = new Date(instante).getTime()
    if (!m.inicio || !m.fim || t < new Date(m.inicio).getTime() || t > new Date(m.fim).getTime()) return false
  }
  return true
}

/** Período da missão: define quando ela "reinicia". */
export function periodoMissao(b: Banco, m: Missao, instante: Date | string = new Date()) {
  switch (m.tipo) {
    case 'diaria':
      return diaSP(instante)
    case 'semanal':
      return segundaSP(instante)
    case 'temporada':
      return ocorrenciaTemporada(b, instante)?.chave ?? 'fora'
    case 'relampago':
      return m.id
    case 'embaixador':
    case 'alcateia': {
      const j = m.criterios[0]?.janela
      if (j === 'semana') return segundaSP(instante)
      if (j === 'dia') return diaSP(instante)
      if (j === 'edicao') return `edicao:${b.configuracoes.cicloAtivo}`
      return 'sempre'
    }
    default:
      return 'sempre'
  }
}

// ------------------------------------------------------------------ eventos

const indices = new WeakMap<Evento[], Map<ID, Evento>>()

/** Índice id → evento, refeito a cada nova versão do banco. */
export function eventoPorId(b: Banco, id: ID) {
  let idx = indices.get(b.eventos)
  if (!idx) {
    idx = new Map(b.eventos.map((e) => [e.id, e]))
    indices.set(b.eventos, idx)
  }
  return idx.get(id) ?? b.eventos.find((e) => e.id === id)
}

export function eventosDo(b: Banco, uid: ID, tipo?: Evento['tipo']) {
  return b.eventos.filter((e) => e.usuarioId === uid && !e.estornado && (!tipo || e.tipo === tipo))
}

export function hojeMesDia() {
  return mesDiaSP()
}

import type { Banco, ID } from './types'
import { cicloAtivo, ocorrenciaTemporada } from './consultas'
import { diaSP, segundaSP, somarDias } from '@/lib/tempo'

// Ranking baseado em XP, nunca em valor doado. Convidados não entram (v2):
// o XP dos reportes de convidado já é do colaborador.

export type PeriodoRanking = 'semana' | 'temporada' | 'edicao' | 'historico'

export interface LinhaRanking {
  posicao: number
  usuarioId: ID
  nome: string
  anonimo: boolean
  unidade?: string
  municipio: string
  xp: number
  variacao?: number // posições ganhas (+) ou perdidas (−) desde a semana anterior
}

/** XP de cada usuário no período, opcionalmente só até um dia de corte (exclusivo). */
function xpPorUsuario(b: Banco, periodo: PeriodoRanking, corte?: string, instante = new Date()) {
  const hoje = diaSP(instante)
  let de = '0000-01-01'
  let ate = '9999-12-31'
  let ciclo: number | undefined
  if (periodo === 'semana') {
    de = segundaSP(instante)
    ate = somarDias(de, 6)
  } else if (periodo === 'temporada') {
    const oc = ocorrenciaTemporada(b, instante)
    if (oc) {
      de = oc.inicio
      ate = oc.fim
    } else ate = '0000-01-01'
  } else if (periodo === 'edicao') ciclo = cicloAtivo(b).ano
  const mapa = new Map<ID, number>()
  for (const t of b.transacoesXp) {
    if (ciclo !== undefined && t.ciclo !== ciclo) continue
    const d = diaSP(t.em)
    if (d < de || d > ate || d > hoje) continue
    if (corte && d >= corte) continue
    mapa.set(t.usuarioId, (mapa.get(t.usuarioId) ?? 0) + t.xp)
  }
  return mapa
}

function ordenarComPosicao<T extends { xp: number; nome: string }>(linhas: T[]) {
  linhas.sort((a, c) => c.xp - a.xp || a.nome.localeCompare(c.nome))
  let pos = 0
  return linhas.map((l, i) => {
    if (i === 0 || l.xp !== linhas[i - 1].xp) pos = i + 1
    return { ...l, posicao: pos }
  })
}

export function rankingPessoas(b: Banco, opcoes: { periodo: PeriodoRanking; unidadeId?: ID; alcateiaId?: ID }, instante = new Date()): LinhaRanking[] {
  const elegiveis = b.usuarios
    .filter((u) => u.perfil !== 'admin')
    .filter((u) => !opcoes.unidadeId || u.unidadeId === opcoes.unidadeId)
    .filter((u) => !opcoes.alcateiaId || b.alcateiaMembros.some((m) => m.alcateiaId === opcoes.alcateiaId && m.usuarioId === u.id))
  const montar = (mapa: Map<ID, number>) =>
    ordenarComPosicao(
      elegiveis
        .map((u) => ({
          usuarioId: u.id,
          nome: u.nome,
          anonimo: u.anonimo,
          unidade: b.unidades.find((x) => x.id === u.unidadeId)?.nome,
          municipio: u.municipio,
          xp: mapa.get(u.id) ?? 0,
        }))
        .filter((l) => l.xp > 0),
    )
  const agora = montar(xpPorUsuario(b, opcoes.periodo, undefined, instante))
  // variação: posição em relação ao fim da semana anterior (no período "semana", compara com a semana passada)
  const inicioSemana = segundaSP(instante)
  const antes =
    opcoes.periodo === 'semana'
      ? montar(xpPorUsuario(b, 'semana', undefined, new Date(new Date(`${inicioSemana}T12:00:00-03:00`).getTime() - 7 * 86400000)))
      : montar(xpPorUsuario(b, opcoes.periodo, inicioSemana, instante))
  const posAntes = new Map(antes.map((l) => [l.usuarioId, l.posicao]))
  return agora.map((l) => {
    const p = posAntes.get(l.usuarioId)
    return { ...l, variacao: p === undefined ? undefined : p - l.posicao }
  })
}

export interface LinhaGrupo {
  posicao: number
  id: string
  nome: string
  emblema?: string
  xp: number
  base: number
  pontuacao: number
  participantes: number
}

function ordenarGrupos(linhas: Omit<LinhaGrupo, 'posicao'>[]): LinhaGrupo[] {
  return linhas.sort((a, c) => c.pontuacao - a.pontuacao || a.nome.localeCompare(c.nome)).map((l, i) => ({ ...l, posicao: i + 1 }))
}

/** Unidades: XP somado a cada 100 colaboradores, para não favorecer as unidades maiores. */
export function rankingUnidades(b: Banco, periodo: PeriodoRanking): LinhaGrupo[] {
  const mapa = xpPorUsuario(b, periodo)
  return ordenarGrupos(
    b.unidades.map((un) => {
      const membros = b.usuarios.filter((u) => u.unidadeId === un.id && u.perfil !== 'admin')
      const xp = membros.reduce((s, u) => s + (mapa.get(u.id) ?? 0), 0)
      return { id: un.id, nome: un.nome, xp, base: un.colaboradores, pontuacao: un.colaboradores ? Math.round((xp / un.colaboradores) * 100) : 0, participantes: membros.filter((u) => (mapa.get(u.id) ?? 0) > 0).length }
    }),
  )
}

/** Cidades: XP médio por pessoa cadastrada que mora no município. */
export function rankingCidades(b: Banco, periodo: PeriodoRanking): LinhaGrupo[] {
  const mapa = xpPorUsuario(b, periodo)
  const cidades = [...new Set(b.usuarios.filter((u) => u.perfil !== 'admin').map((u) => u.municipio))]
  return ordenarGrupos(
    cidades.map((c) => {
      const moradores = b.usuarios.filter((u) => u.municipio === c && u.perfil !== 'admin')
      const xp = moradores.reduce((s, u) => s + (mapa.get(u.id) ?? 0), 0)
      const pontuacao = moradores.length ? Math.round(xp / moradores.length) : 0
      return { id: c, nome: c, xp, base: moradores.length, pontuacao, participantes: moradores.filter((u) => (mapa.get(u.id) ?? 0) > 0).length }
    }),
  )
}

/** Alcateias: XP médio por membro, para equipes de tamanhos diferentes competirem de igual para igual. */
export function rankingAlcateias(b: Banco, periodo: PeriodoRanking): LinhaGrupo[] {
  const mapa = xpPorUsuario(b, periodo)
  return ordenarGrupos(
    b.alcateias
      .filter((a) => !a.oculta)
      .map((a) => {
        const membros = b.alcateiaMembros.filter((m) => m.alcateiaId === a.id).map((m) => m.usuarioId)
        const xp = membros.reduce((s, id) => s + (mapa.get(id) ?? 0), 0)
        const pontuacao = membros.length ? Math.round(xp / membros.length) : 0
        return { id: a.id, nome: a.nome, emblema: a.emblema, xp, base: membros.length, pontuacao, participantes: membros.filter((id) => (mapa.get(id) ?? 0) > 0).length }
      }),
  )
}

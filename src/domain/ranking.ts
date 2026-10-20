import type { Banco, ID } from './types'
import { xpCiclo, xpTotal } from './regras'

// Ranking baseado em XP, nunca em valor doado (seção 6.8).

export interface LinhaRanking {
  posicao: number
  usuarioId: ID
  nome: string
  anonimo: boolean
  unidade?: string
  municipio: string
  xp: number
}

export function rankingPessoas(
  b: Banco,
  opcoes: { ciclo: number | 'todos'; unidadeId?: ID; publico: 'colaboradores' | 'convidados' },
): LinhaRanking[] {
  const linhas = b.usuarios
    .filter((u) => u.perfil !== 'admin')
    .filter((u) => (opcoes.publico === 'convidados' ? u.perfil === 'convidado' : u.perfil !== 'convidado'))
    .filter((u) => !opcoes.unidadeId || u.unidadeId === opcoes.unidadeId)
    .map((u) => ({
      usuarioId: u.id,
      nome: u.nome,
      anonimo: u.anonimo,
      unidade: b.unidades.find((x) => x.id === u.unidadeId)?.nome,
      municipio: u.municipio,
      xp: opcoes.ciclo === 'todos' ? xpTotal(b, u.id) : xpCiclo(b, u.id, opcoes.ciclo),
    }))
    .filter((l) => l.xp > 0)
    .sort((a, c) => c.xp - a.xp || a.nome.localeCompare(c.nome))
  // empates dividem a mesma posição
  let pos = 0
  return linhas.map((l, i) => {
    if (i === 0 || l.xp !== linhas[i - 1].xp) pos = i + 1
    return { ...l, posicao: pos }
  })
}

export interface LinhaGrupo {
  posicao: number
  id: string
  nome: string
  xp: number
  base: number
  pontuacao: number // unidades: XP por 100 colaboradores; cidades: XP médio por pessoa
  participantes: number
}

function ordenar(linhas: Omit<LinhaGrupo, 'posicao'>[]): LinhaGrupo[] {
  return linhas.sort((a, c) => c.pontuacao - a.pontuacao).map((l, i) => ({ ...l, posicao: i + 1 }))
}

/** Unidades: XP somado dividido pelo número de colaboradores da unidade, para não favorecer as maiores. */
export function rankingUnidades(b: Banco, ciclo: number | 'todos') {
  return ordenar(
    b.unidades.map((un) => {
      const membros = b.usuarios.filter((u) => u.unidadeId === un.id && u.perfil !== 'convidado' && u.perfil !== 'admin')
      const xp = membros.reduce((s, u) => s + (ciclo === 'todos' ? xpTotal(b, u.id) : xpCiclo(b, u.id, ciclo)), 0)
      return {
        id: un.id,
        nome: un.nome,
        xp,
        base: un.colaboradores,
        pontuacao: un.colaboradores ? Math.round((xp / un.colaboradores) * 100) : 0,
        participantes: membros.filter((u) => (ciclo === 'todos' ? xpTotal(b, u.id) : xpCiclo(b, u.id, ciclo)) > 0).length,
      }
    }),
  )
}

/** Cidades: XP médio por pessoa cadastrada que mora no município. */
export function rankingCidades(b: Banco, ciclo: number | 'todos') {
  const cidades = [...new Set(b.usuarios.filter((u) => u.perfil !== 'admin').map((u) => u.municipio))]
  return ordenar(
    cidades.map((c) => {
      const moradores = b.usuarios.filter((u) => u.municipio === c && u.perfil !== 'admin')
      const xp = moradores.reduce((s, u) => s + (ciclo === 'todos' ? xpTotal(b, u.id) : xpCiclo(b, u.id, ciclo)), 0)
      const base = moradores.length
      return {
        id: c,
        nome: c,
        xp,
        base,
        pontuacao: base ? Math.round(xp / base) : 0,
        participantes: moradores.filter((u) => (ciclo === 'todos' ? xpTotal(b, u.id) : xpCiclo(b, u.id, ciclo)) > 0).length,
      }
    }),
  )
}

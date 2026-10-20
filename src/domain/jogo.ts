import type { Banco, CategoriaItem, ID, Item, Missao, Raridade } from './types'
import * as C from './consultas'
import { grauAtual, grauAtingido, limiteGrau, metricas, missaoCompleta, progressoCriterio, sorteioDe, alcateiaDo } from './motor'
import { diaSP, segundaSP, somarDias, sortear } from '@/lib/tempo'

// Consultas da camada de jogo para as telas: posse de itens, loja, trilha,
// radar de impacto, estatísticas e "sua próxima conquista".

export const RARIDADES: Raridade[] = ['comum', 'incomum', 'rara', 'epica', 'lendaria']
export const COR_RARIDADE: Record<Raridade, string> = {
  comum: '#8A99A8',
  incomum: '#00BEDF',
  rara: '#0063A7',
  epica: '#6B4FBB',
  lendaria: '#C9A227',
}

// ------------------------------------------------------------------ itens

/** Itens de nível, insígnia e padrão são liberados automaticamente; os demais precisam estar na coleção. */
export function possuiItem(b: Banco, uid: ID, item: Item) {
  if (item.fonte === 'padrao') return true
  if (b.usuarioItens.some((i) => i.usuarioId === uid && i.itemId === item.id)) return true
  if (item.fonte === 'nivel' && item.requisito?.nivel) return C.nivelDe(C.xpTotal(b, uid), b.niveis).atual.nivel >= item.requisito.nivel
  if (item.fonte === 'insignia' && item.requisito?.insignia) return grauAtual(b, uid, item.requisito.insignia) > 0
  return false
}

export function comoObter(b: Banco, item: Item) {
  switch (item.fonte) {
    case 'nivel':
      return `Chegue ao nível ${item.requisito?.nivel}`
    case 'insignia':
      return `Conquiste a insígnia ${b.insignias.find((i) => i.id === item.requisito?.insignia)?.nome.m ?? ''}`
    case 'loja':
      return item.raridade === 'lendaria' ? 'Não está à venda' : `Loja do Leão: ${precoItem(b, item)} Patinhas`
    case 'trilha':
      return 'Trilha da Temporada'
    case 'jornada':
      return 'Jornada do Leãozinho'
    case 'missao':
      return 'Prêmio de missão'
    case 'evento':
      return 'Evento especial'
    default:
      return 'Disponível para todos'
  }
}

export function precoItem(b: Banco, item: Item) {
  if (item.raridade === 'lendaria') return null // lendários não são vendidos
  return b.configuracoes.loja.precos[item.raridade]
}

export function itensDaCategoria(b: Banco, categoria: CategoriaItem) {
  return b.itens.filter((i) => i.categoria === categoria)
}

export function itemEquipado(b: Banco, uid: ID, categoria: Exclude<CategoriaItem, 'adesivo'>) {
  const u = C.usuario(b, uid)
  const id = u?.avatar[categoria]
  return id ? b.itens.find((i) => i.id === id) : undefined
}

function disponivelHoje(item: Item, hoje: string, edicao: number) {
  if (item.disponivelDe && hoje < item.disponivelDe) return false
  if (item.disponivelAte && hoje > item.disponivelAte) return false
  if (item.exclusivoEdicao && item.exclusivoEdicao !== edicao) return false
  return true
}

/** Loja do Leão: 6 ofertas da semana (rotação determinística) + oferta da temporada. Lendários nunca. */
export function ofertasLoja(b: Banco, instante: Date | string = new Date()) {
  const semana = segundaSP(instante)
  const hoje = diaSP(instante)
  const edicao = b.configuracoes.cicloAtivo
  const vendaveis = b.itens.filter((i) => i.fonte === 'loja' && i.raridade !== 'lendaria' && disponivelHoje(i, hoje, edicao))
  const ids = sortear(
    vendaveis.map((i) => i.id),
    `${b.configuracoes.lojaRotacaoSemente}:${semana}`,
    b.configuracoes.loja.ofertasPorSemana,
  )
  const oc = C.ocorrenciaTemporada(b, instante)
  const idTemporada = oc ? b.configuracoes.loja.ofertaTemporada[oc.temporada.id] : undefined
  const temporada = b.itens.find((i) => i.id === idTemporada && i.raridade !== 'lendaria')
  return { semana, ofertas: ids.map((id) => b.itens.find((i) => i.id === id)!).filter(Boolean), temporada, temporadaNome: oc?.temporada.nome }
}

// ------------------------------------------------------------------ trilha da temporada

export function estadoTrilha(b: Banco, uid: ID, instante: Date | string = new Date(), ocorrencia?: C.OcorrenciaTemporada) {
  const oc = ocorrencia ?? C.ocorrenciaTemporada(b, instante)
  if (!oc) return null
  const trilha = oc.temporada.trilha
  const pontos = C.pontosTemporada(b, uid, oc)
  const alcancado = Math.min(trilha.degraus, Math.floor(pontos / trilha.pontosPorDegrau))
  const registro = b.usuarioTrilhas.find((t) => t.usuarioId === uid && t.chave === oc.chave)
  return { ocorrencia: oc, trilha, pontos, alcancado, resgatados: registro?.resgatados ?? [], proximoEm: (alcancado + 1) * trilha.pontosPorDegrau - pontos }
}

/** Trilha da temporada que terminou há até 7 dias: os prêmios ainda podem ser resgatados. */
export function trilhaEmProrrogacao(b: Banco, uid: ID, instante: Date | string = new Date()) {
  const hoje = diaSP(instante)
  const atual = C.ocorrenciaTemporada(b, instante)
  for (let k = 1; k <= 7; k++) {
    const dia = somarDias(hoje, -k)
    const oc = C.ocorrenciaTemporada(b, `${dia}T12:00:00-03:00`)
    if (oc && oc.chave !== atual?.chave && oc.fim < hoje) {
      const est = estadoTrilha(b, uid, instante, oc)
      if (est && Array.from({ length: est.alcancado }, (_, i) => i + 1).some((d) => !est.resgatados.includes(d))) return { ...est, prazo: somarDias(oc.fim, 7) }
      return null
    }
  }
  return null
}

// ------------------------------------------------------------------ missões para a tela

export function missoesDoUsuario(b: Banco, uid: ID, instante: Date | string = new Date()) {
  const u = C.usuario(b, uid)!
  const dia = diaSP(instante)
  const semana = segundaSP(instante)
  const sorteioDia = b.sorteios.find((s) => s.usuarioId === uid && s.tipo === 'dia' && s.periodo === dia)
  const sorteioSemana = b.sorteios.find((s) => s.usuarioId === uid && s.tipo === 'semana' && s.periodo === semana)
  const estado = (m: Missao) => {
    const periodo = C.periodoMissao(b, m, instante)
    const um = b.usuarioMissoes.find((x) => x.usuarioId === uid && x.missaoId === m.id && x.periodo === periodo)
    const progresso = m.criterios.map((c, i) => Math.min(c.quantidade, progressoCriterio(b, c, um?.contagem[i] ?? [])))
    const total = m.criterios.reduce((s, c) => s + c.quantidade, 0)
    const feito = progresso.reduce((s, p) => s + p, 0)
    return { missao: m, periodo, progresso, fracao: total ? feito / total : 0, concluida: !!um?.concluidaEm }
  }
  const disponiveis = b.missoes.filter((m) => C.missaoDisponivel(m, u, b, instante))
  return {
    dia,
    semana,
    sorteioDia,
    sorteioSemana,
    diarias: (sorteioDia?.missoes ?? []).map((id) => b.missoes.find((m) => m.id === id)).filter((m): m is Missao => !!m).map(estado),
    semanais: (sorteioSemana?.missoes ?? []).map((id) => b.missoes.find((m) => m.id === id)).filter((m): m is Missao => !!m).map(estado),
    jornada: b.missoes.filter((m) => m.tipo === 'jornada' && m.ativa).sort((a, c) => (a.capitulo ?? 0) - (c.capitulo ?? 0)).map(estado),
    temporada: disponiveis.filter((m) => m.tipo === 'temporada').map(estado),
    relampago: disponiveis.filter((m) => m.tipo === 'relampago').map(estado),
    outras: disponiveis.filter((m) => ['familia', 'convidado', 'alcateia', 'embaixador'].includes(m.tipo)).map(estado),
  }
}

/** Garante os sorteios do dia e da semana (chamado ao abrir o app). */
export function prepararSorteios(b: Banco, uid: ID, instante: Date | string = new Date()) {
  sorteioDe(b, uid, 'dia', diaSP(instante))
  sorteioDe(b, uid, 'semana', segundaSP(instante))
}

// ------------------------------------------------------------------ insígnias para a tela

export function progressoInsignias(b: Banco, uid: ID) {
  const m = metricas(b, uid)
  return b.insignias.map((ins) => {
    const valor = m[ins.metrica] ?? 0
    const grau = grauAtual(b, uid, ins.id)
    const proximo = grau < ins.graus.length ? grau + 1 : null
    const limite = proximo ? limiteGrau(b, ins, proximo) : limiteGrau(b, ins, ins.graus.length)
    return { insignia: ins, valor, grau, proximo, limite, fracao: proximo ? Math.min(1, valor / Math.max(1, limite)) : 1, atingivel: grauAtingido(b, ins, valor) }
  })
}

// ------------------------------------------------------------------ radar de impacto e estatísticas

/** Faixas por quantidade (nunca por valor): cada atributo vai de 0 a 100. */
function faixa(valor: number, limites: number[]) {
  let pct = 0
  limites.forEach((l, i) => {
    if (valor >= l) pct = Math.round(((i + 1) / limites.length) * 100)
  })
  if (pct < 100) {
    const i = limites.findIndex((l) => valor < l)
    const anterior = i > 0 ? limites[i - 1] : 0
    pct += Math.round(((valor - anterior) / Math.max(1, limites[i] - anterior)) * (100 / limites.length))
  }
  return Math.max(0, Math.min(100, pct))
}

export function radarImpacto(b: Banco, uid: ID) {
  const m = metricas(b, uid)
  const missoes = m.missoes
  return [
    { atributo: 'Generosidade', valor: faixa(m.destinacoes_fia + m.destinacoes_idoso + m.convidados_validados + m.edicoes, [1, 3, 6, 10, 15]) },
    { atributo: 'Influência', valor: faixa(m.convites_aceitos + m.convidados_validados + m.compartilhamentos, [1, 3, 8, 15, 30]) },
    { atributo: 'Conhecimento', valor: faixa(m.licoes + m.quizzes + m.perguntas, [1, 3, 8, 15, 30]) },
    { atributo: 'Conexão', valor: faixa(m.projetos_visitados + m.entidades_visitadas + m.favoritos + m.historias, [2, 5, 12, 25, 50]) },
    { atributo: 'Constância', valor: faixa(m.edicoes * 5 + missoes, [5, 20, 50, 120, 300]) },
  ]
}

export function estatisticas(b: Banco, uid: ID, posicao?: { posicao: number; total: number }) {
  const m = metricas(b, uid)
  const u = C.usuario(b, uid)!
  const ciclo = b.configuracoes.cicloAtivo
  const itens = b.itens.filter((i) => possuiItem(b, uid, i))
  const porCategoria = new Map<string, number>()
  for (const i of itens) porCategoria.set(i.categoria, (porCategoria.get(i.categoria) ?? 0) + 1)
  return {
    xpTotal: C.xpTotal(b, uid),
    xpEdicao: C.xpCiclo(b, uid, ciclo),
    posicao: posicao?.posicao,
    percentil: posicao && posicao.total ? Math.max(1, Math.round((posicao.posicao / posicao.total) * 100)) : undefined,
    edicoes: m.edicoes,
    sequencia: C.sequenciaCiclos(b, uid, ciclo),
    destinacoes: b.reportes.filter((r) => r.usuarioId === uid && !r.convidado && !r.familiarId && r.status !== 'recusado_colaborador').length,
    familiares: new Set(C.reportesValidados(b, (r) => r.usuarioId === uid && !!r.familiarId).map((r) => r.familiarId)).size,
    convidados: C.reportesValidados(b, (r) => r.usuarioId === uid && !!r.convidado).length,
    convitesAceitos: m.convites_aceitos,
    missoes: m.missoes,
    projetos: m.projetos_visitados,
    insignias: new Set(b.usuarioInsignias.filter((x) => x.usuarioId === uid).map((x) => x.insigniaId)).size,
    insigniasTotal: b.insignias.filter((i) => !i.secreta).length,
    pins: m.pins,
    pinsTotal: b.pins.length,
    itensPorCategoria: [...porCategoria.entries()],
    alcateia: alcateiaDo(b, uid)?.nome,
    genero: u.genero,
  }
}

/** Linha do tempo: uma faixa por edição, com o pin, o nível ao fim da edição e as insígnias conquistadas. */
export function linhaDoTempo(b: Banco, uid: ID) {
  const u = C.usuario(b, uid)!
  const anos = new Set<number>([...u.ciclosAnteriores, ...b.usuarioPins.filter((p) => p.usuarioId === uid).map((p) => p.ano), ...b.usuarioInsignias.filter((x) => x.usuarioId === uid).map((x) => x.ciclo)])
  anos.add(b.configuracoes.cicloAtivo)
  let acumulado = 0
  return [...anos]
    .sort((a, c) => a - c)
    .map((ano) => {
      acumulado += C.xpCiclo(b, uid, ano)
      return {
        ano,
        pin: b.usuarioPins.some((p) => p.usuarioId === uid && p.ano === ano),
        nivel: C.nivelDe(acumulado, b.niveis).atual,
        insignias: b.usuarioInsignias.filter((x) => x.usuarioId === uid && x.ciclo === ano),
        anterior: u.ciclosAnteriores.includes(ano),
      }
    })
}

/** "Sua próxima conquista": a missão ou insígnia mais perto de ser concluída. */
export function proximaConquista(b: Banco, uid: ID) {
  const ms = missoesDoUsuario(b, uid)
  const candidatas = [...ms.diarias, ...ms.semanais, ...ms.jornada, ...ms.temporada, ...ms.relampago]
    .filter((x) => !x.concluida && x.fracao > 0)
    .map((x) => ({ tipo: 'missao' as const, titulo: x.missao.titulo, fracao: x.fracao, link: '/missoes', detalhe: `+${x.missao.xp} XP · +${x.missao.patinhas} Patinhas` }))
  for (const p of progressoInsignias(b, uid)) {
    if (!p.proximo || p.insignia.secreta || p.fracao <= 0) continue
    const nome = C.flexionar(p.insignia.nome, C.usuario(b, uid)!.genero)
    candidatas.push({ tipo: 'insignia' as never, titulo: `Insígnia ${nome}`, fracao: p.fracao, link: '/conquistas', detalhe: `${p.valor}/${p.limite}` })
  }
  candidatas.sort((a, c) => c.fracao - a.fracao)
  if (candidatas.length) return candidatas[0]
  const primeira = ms.diarias.find((x) => !x.concluida) ?? ms.jornada.find((x) => !x.concluida)
  return primeira ? { tipo: 'missao' as const, titulo: primeira.missao.titulo, fracao: 0, link: '/missoes', detalhe: `+${primeira.missao.xp} XP` } : null
}

export { missaoCompleta }

import type { Banco, Evento, ID, Insignia, Missao, Notificacao, OrigemXp, TipoEvento, TransacaoPatinhas, UsuarioMissao, ValorEvento } from './types'
import * as C from './consultas'
import { diaSP, segundaSP, sortear, somarDias, diasEntre } from '@/lib/tempo'
import { LICOES_GUIA, GLOSSARIO_TERMOS } from './conteudo'

// Motor de regras da gamificação (seção 4 do prompt v2).
// Toda ação relevante vira um EVENTO. O motor avalia o evento contra missões,
// insígnias, níveis e alcateias e concede as recompensas. Cada prêmio aponta para
// o evento de origem (raiz), o que permite estornar tudo o que um evento gerou.

let seq = 0
export const novoIdMotor = (p: string) => `${p}_${Date.now().toString(36)}${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`
const agora = () => new Date().toISOString()

export function notificar(b: Banco, uid: ID, n: Omit<Notificacao, 'id' | 'usuarioId' | 'lida' | 'em'>) {
  b.notificacoes.unshift({ id: novoIdMotor('ntf'), usuarioId: uid, lida: false, em: agora(), ...n })
}

export function auditar(b: Banco, acao: string, detalhe: string, por?: ID, alvo?: string) {
  b.log.unshift({ id: novoIdMotor('log'), em: agora(), por, acao, alvo, detalhe })
  if (b.log.length > 2000) b.log.length = 2000
}

// ------------------------------------------------------------------ créditos

interface OpcoesCredito {
  eventoId?: ID
  referencia?: string
  ciclo?: number
  por?: ID
  em?: string
}

export function creditarPatinhas(b: Banco, uid: ID, patinhas: number, origem: TransacaoPatinhas['origem'], descricao: string, op: OpcoesCredito = {}) {
  if (!patinhas) return
  b.transacoesPatinhas.push({ id: novoIdMotor('pt'), usuarioId: uid, patinhas, origem, descricao, eventoId: op.eventoId, referencia: op.referencia, em: op.em ?? agora() })
  auditar(b, patinhas > 0 ? 'credito_patinhas' : 'debito_patinhas', `${patinhas > 0 ? '+' : ''}${patinhas} Patinhas: ${descricao}`, op.por, uid)
}

/** Crédito (ou estorno, com valor negativo) de XP, com auditoria e avaliação de nível. */
export function creditarXp(b: Banco, uid: ID, xp: number, origem: OrigemXp, descricao: string, op: OpcoesCredito = {}) {
  if (!xp) return
  const antes = C.nivelDe(C.xpTotal(b, uid), b.niveis).atual.nivel
  b.transacoesXp.push({
    id: novoIdMotor('xp'),
    usuarioId: uid,
    xp,
    origem,
    eventoId: op.eventoId,
    referencia: op.referencia,
    descricao,
    ciclo: op.ciclo ?? b.configuracoes.cicloAtivo,
    em: op.em ?? agora(),
  })
  auditar(b, xp > 0 ? 'credito_xp' : 'estorno_xp', `${xp > 0 ? '+' : ''}${xp} XP: ${descricao}`, op.por, uid)
  avaliarNivel(b, uid, antes, op)
}

/** Subida de nível: Patinhas (30 × tier), evento, aviso e, na troca de tier, publicação no mural. */
function avaliarNivel(b: Banco, uid: ID, antes: number, op: OpcoesCredito) {
  const xp = C.xpTotal(b, uid)
  const atual = C.nivelDe(xp, b.niveis).atual
  const u = C.usuario(b, uid)
  if (!u) return
  if (atual.nivel > antes) {
    for (let n = antes + 1; n <= atual.nivel; n++) {
      const nivel = b.niveis.find((x) => x.nivel === n)
      if (!nivel) continue
      const ref = `nivel:${n}`
      const jaPago = somaPatinhas(b, uid, ref) > 0
      const tier = C.tierDe(b, nivel)
      if (!jaPago) creditarPatinhas(b, uid, b.configuracoes.patinhas.porTier * tier.numero, 'nivel', `Subida para o nível ${n}`, { referencia: ref, eventoId: op.eventoId })
      registrarEvento(b, uid, 'nivel_alcancado', { nivel: n, tier: tier.numero }, { chave: ref, raiz: op.eventoId })
      notificar(b, uid, { titulo: `Nível ${n}: ${C.flexionar(nivel.titulo, u.genero)}`, texto: novidadesDoNivel(b, n), tipo: 'nivel', link: '/perfil' })
      const anterior = b.niveis.find((x) => x.nivel === n - 1)
      if (anterior && anterior.tier !== nivel.tier) publicarNoMural(b, uid, 'tier', `chegou ao tier ${C.flexionar(tier.nome, u.genero)}`, '🦁', 'epica')
    }
  } else if (atual.nivel < antes) {
    // estorno derrubou o nível: as Patinhas dos níveis perdidos voltam
    for (let n = atual.nivel + 1; n <= antes; n++) {
      const ref = `nivel:${n}`
      const saldo = somaPatinhas(b, uid, ref)
      if (saldo > 0) creditarPatinhas(b, uid, -saldo, 'estorno', `Estorno da subida para o nível ${n}`, { referencia: ref })
    }
  }
}

export function novidadesDoNivel(b: Banco, n: number) {
  const nivel = b.niveis.find((x) => x.nivel === n)!
  const itens = b.itens.filter((i) => i.requisito?.nivel === n).map((i) => i.nome)
  const partes = [`+${b.configuracoes.patinhas.porTier * nivel.tier} Patinhas`]
  if (itens.length) partes.push(`desbloqueou ${itens.join(', ')}`)
  const recompensas = b.recompensas.filter((r) => r.requisito.nivel === n).map((r) => r.nome)
  if (recompensas.length) partes.push(`libera ${recompensas.join(', ')}`)
  return partes.join(' · ')
}

function somaPatinhas(b: Banco, uid: ID, referencia: string) {
  let s = 0
  for (const t of b.transacoesPatinhas) if (t.usuarioId === uid && t.referencia === referencia) s += t.patinhas
  return s
}

// ------------------------------------------------------------------ mural

export function publicarNoMural(b: Banco, uid: ID, tipo: Banco['mural'][number]['tipo'], texto: string, icone: string, raridade?: Banco['mural'][number]['raridade']) {
  const u = C.usuario(b, uid)
  if (!u || u.ocultarMural || u.perfil === 'admin') return
  b.mural.unshift({ id: novoIdMotor('mur'), usuarioId: uid, tipo, texto, icone, raridade, em: agora(), oculto: false })
}

// ------------------------------------------------------------------ eventos

export interface Premio {
  xp?: { xp: number; origem: OrigemXp; descricao: string; referencia?: string }[]
  patinhas?: { patinhas: number; origem: TransacaoPatinhas['origem']; descricao: string; referencia?: string }[]
}

export interface OpcoesEvento {
  /** Chave de idempotência (ex.: id do reporte): o mesmo evento nunca premia duas vezes. */
  chave?: string
  raiz?: ID
  em?: string
  ciclo?: number
  premio?: Premio
  por?: ID
}

/** Registra um evento e roda o motor. Retorna o evento, ou null se for repetido. */
export function registrarEvento(b: Banco, uid: ID, tipo: TipoEvento, dados: Record<string, ValorEvento> = {}, op: OpcoesEvento = {}): Evento | null {
  const u = C.usuario(b, uid)
  if (!u) return null
  if (op.chave && b.eventos.some((e) => e.usuarioId === uid && e.tipo === tipo && e.chave === op.chave && !e.estornado)) return null
  const em = op.em ?? agora()
  const ev: Evento = { id: novoIdMotor('ev'), usuarioId: uid, tipo, dados, chave: op.chave, raiz: op.raiz, em, dia: diaSP(em) }
  b.eventos.push(ev)
  const raiz = ev.raiz ?? ev.id

  for (const l of op.premio?.xp ?? []) creditarXp(b, uid, l.xp, l.origem, l.descricao, { eventoId: ev.id, referencia: l.referencia, ciclo: op.ciclo, por: op.por, em })
  for (const l of op.premio?.patinhas ?? []) creditarPatinhas(b, uid, l.patinhas, l.origem, l.descricao, { eventoId: ev.id, referencia: l.referencia, por: op.por, em })

  avaliarMissoes(b, ev, raiz)
  avaliarInsignias(b, uid, raiz)
  if (tipo === 'missao_concluida') avaliarAlcateia(b, uid, ev, raiz)
  return ev
}

// ------------------------------------------------------------------ missões

/** Diárias e semanais sorteadas por pessoa (com troca gratuita). */
export function sorteioDe(b: Banco, uid: ID, tipo: 'dia' | 'semana', periodo: string) {
  let s = b.sorteios.find((x) => x.usuarioId === uid && x.tipo === tipo && x.periodo === periodo)
  if (!s) {
    const u = C.usuario(b, uid)!
    const tipoMissao = tipo === 'dia' ? 'diaria' : 'semanal'
    const qtd = tipo === 'dia' ? b.configuracoes.missoesConfig.diariasPorDia : b.configuracoes.missoesConfig.semanaisPorSemana
    const pool = b.missoes.filter((m) => m.tipo === tipoMissao && C.missaoDisponivel(m, u, b)).map((m) => m.id)
    s = { usuarioId: uid, tipo, periodo, missoes: sortear(pool, `${uid}:${periodo}`, qtd), trocou: false, bauAberto: false }
    b.sorteios.push(s)
  }
  return s
}

function missaoAtribuida(b: Banco, uid: ID, m: Missao, ev: Evento) {
  if (m.tipo === 'diaria') return sorteioDe(b, uid, 'dia', ev.dia).missoes.includes(m.id)
  if (m.tipo === 'semanal') return sorteioDe(b, uid, 'semana', segundaSP(ev.em)).missoes.includes(m.id)
  return true
}

function eventoAtende(b: Banco, uid: ID, crit: Missao['criterios'][number], ev: Evento) {
  if (crit.evento !== ev.tipo) return false
  const u = C.usuario(b, uid)!
  const f = crit.filtro
  if (f?.municipioDoUsuario && ev.dados.municipio !== u.municipio) return false
  if (f?.ods && !((ev.dados.ods as number[] | undefined) ?? []).includes(f.ods)) return false
  if (f?.fundo && ev.dados.fundo !== f.fundo) return false
  if (f?.tipoMissao && ev.dados.tipoMissao !== f.tipoMissao) return false
  if (crit.ref && ev.dados.ref !== crit.ref) return false
  if (crit.janela === 'edicao' && (ev.dados.ciclo ?? b.configuracoes.cicloAtivo) !== b.configuracoes.cicloAtivo) return false
  return true
}

/** Progresso de um critério a partir dos eventos que contaram (distintos e por ODS calculados aqui). */
export function progressoCriterio(b: Banco, crit: Missao['criterios'][number], ids: ID[]) {
  const evs = ids.map((id) => C.eventoPorId(b, id)).filter((e): e is Evento => !!e && !e.estornado)
  if (crit.agruparPorOds) {
    const grupos = new Map<number, Set<string>>()
    for (const e of evs) for (const o of (e.dados.ods as number[] | undefined) ?? []) grupos.set(o, (grupos.get(o) ?? new Set()).add(String(e.dados.ref ?? e.id)))
    return Math.max(0, ...[...grupos.values()].map((s) => s.size))
  }
  if (crit.distinto) return new Set(evs.map((e) => String(e.dados.ref ?? e.id))).size
  return evs.length
}

export function missaoCompleta(b: Banco, m: Missao, um: UsuarioMissao) {
  return m.criterios.every((c, i) => progressoCriterio(b, c, um.contagem[i] ?? []) >= c.quantidade)
}

/** XP de missões diárias já ganho no dia (limite diário de XP). */
export function xpDiariasNoDia(b: Banco, uid: ID, dia: string) {
  let s = 0
  for (const t of b.transacoesXp) if (t.usuarioId === uid && t.referencia === `diaria:${dia}`) s += t.xp
  return Math.max(0, s)
}

function avaliarMissoes(b: Banco, ev: Evento, raiz: ID) {
  const u = C.usuario(b, ev.usuarioId)!
  for (const m of b.missoes) {
    if (!m.criterios.some((c) => c.evento === ev.tipo)) continue
    if (!C.missaoDisponivel(m, u, b, ev.em) || !missaoAtribuida(b, u.id, m, ev)) continue
    const periodo = C.periodoMissao(b, m, ev.em)
    let um = b.usuarioMissoes.find((x) => x.usuarioId === u.id && x.missaoId === m.id && x.periodo === periodo)
    if (!um) {
      um = { usuarioId: u.id, missaoId: m.id, periodo, contagem: m.criterios.map(() => []) }
      b.usuarioMissoes.push(um)
    }
    if (um.concluidaEm) continue
    let contou = false
    m.criterios.forEach((c, i) => {
      if (!eventoAtende(b, u.id, c, ev)) return
      um.contagem[i] = [...(um.contagem[i] ?? []), ev.id]
      contou = true
    })
    if (contou && missaoCompleta(b, m, um)) concluirMissao(b, m, um, ev, raiz)
  }
}

function concluirMissao(b: Banco, m: Missao, um: UsuarioMissao, ev: Evento, raiz: ID) {
  const uid = um.usuarioId
  um.concluidaEm = ev.em
  const rel = C.relampagoAtivo(b, ev.em)
  const mult = rel && m.educativa ? rel.multiplicadorEducativo : 1
  let xp = Math.round(m.xp * mult)
  const referencia = m.tipo === 'diaria' ? `diaria:${ev.dia}` : undefined
  if (m.tipo === 'diaria') xp = Math.max(0, Math.min(xp, b.configuracoes.tabelaXp.limiteDiarioMissoes - xpDiariasNoDia(b, uid, ev.dia)))
  const rotulo = { diaria: 'Missão diária', semanal: 'Missão semanal', jornada: 'Jornada', temporada: 'Missão da temporada', relampago: 'Missão relâmpago', familia: 'Missão de família', convidado: 'Missão de convidado', alcateia: 'Missão de alcateia', embaixador: 'Missão de embaixador' }[m.tipo]
  const conclusao = registrarEvento(
    b,
    uid,
    'missao_concluida',
    { missaoId: m.id, tipoMissao: m.tipo, periodo: um.periodo, xp, patinhas: m.patinhas },
    {
      chave: `${m.id}:${um.periodo}`,
      raiz,
      em: ev.em,
      premio: {
        xp: [{ xp, origem: 'missao', descricao: `${rotulo}: ${m.titulo}${mult > 1 ? ` (×${mult})` : ''}`, referencia }],
        patinhas: [{ patinhas: m.patinhas, origem: 'missao', descricao: `${rotulo}: ${m.titulo}` }],
      },
    },
  )
  um.eventoConclusao = conclusao?.id
  if (m.itemRecompensa && !b.usuarioItens.some((i) => i.usuarioId === uid && i.itemId === m.itemRecompensa)) {
    b.usuarioItens.push({ usuarioId: uid, itemId: m.itemRecompensa, origem: m.tipo === 'jornada' ? 'jornada' : 'missao', eventoId: conclusao?.id, em: ev.em })
  }
  notificar(b, uid, { titulo: `${rotulo} concluída`, texto: `${m.titulo}: +${xp} XP e +${m.patinhas} Patinhas`, tipo: 'missao', link: '/missoes' })
}

/** Baú do Dia / da Semana: abre quando todas as sorteadas do período estão concluídas. */
export function bauDisponivel(b: Banco, uid: ID, tipo: 'dia' | 'semana', periodo: string) {
  const s = b.sorteios.find((x) => x.usuarioId === uid && x.tipo === tipo && x.periodo === periodo)
  if (!s || s.bauAberto || !s.missoes.length) return false
  return s.missoes.every((id) => b.usuarioMissoes.some((x) => x.usuarioId === uid && x.missaoId === id && x.periodo === periodo && x.concluidaEm))
}

export function abrirBau(b: Banco, uid: ID, tipo: 'dia' | 'semana', periodo: string) {
  if (!bauDisponivel(b, uid, tipo, periodo)) return 0
  const s = sorteioDe(b, uid, tipo, periodo)
  s.bauAberto = true
  const patinhas = tipo === 'dia' ? b.configuracoes.patinhas.bauDia : b.configuracoes.patinhas.bauSemana
  registrarEvento(b, uid, 'bau_aberto', { tipo, periodo }, { chave: `${tipo}:${periodo}`, premio: { patinhas: [{ patinhas, origem: 'bau', descricao: tipo === 'dia' ? 'Baú do Dia' : 'Baú da Semana' }] } })
  return patinhas
}

/** Troca gratuita de uma diária ainda não concluída. */
export function trocarDiaria(b: Banco, uid: ID, dia: string, missaoId: ID) {
  const s = sorteioDe(b, uid, 'dia', dia)
  if (s.trocou) return false
  if (b.usuarioMissoes.some((x) => x.usuarioId === uid && x.missaoId === missaoId && x.periodo === dia && x.concluidaEm)) return false
  const u = C.usuario(b, uid)!
  const pool = b.missoes.filter((m) => m.tipo === 'diaria' && C.missaoDisponivel(m, u, b) && !s.missoes.includes(m.id)).map((m) => m.id)
  const [nova] = sortear(pool, `${uid}:${dia}:troca`, 1)
  if (!nova) return false
  s.missoes = s.missoes.map((id) => (id === missaoId ? nova : id))
  s.trocou = true
  return true
}

// ------------------------------------------------------------------ insígnias

/** Métricas das insígnias, calculadas a partir de eventos e reportes (nunca do valor doado). */
export function metricas(b: Banco, uid: ID): Record<string, number> {
  const u = C.usuario(b, uid)!
  const validados = C.reportesValidados(b, (r) => r.usuarioId === uid)
  const proprios = validados.filter((r) => !r.familiarId && !r.convidado)
  const familia = validados.filter((r) => !r.convidado)
  const evs = C.eventosDo(b, uid)
  const conta = (tipo: TipoEvento) => evs.filter((e) => e.tipo === tipo).length
  const distintos = (tipo: TipoEvento) => new Set(evs.filter((e) => e.tipo === tipo).map((e) => String(e.dados.ref ?? e.id))).size

  const porCiclo = new Map<number, Set<string>>()
  const fundosCiclo = new Map<number, Set<string>>()
  for (const r of familia) {
    porCiclo.set(r.ciclo, (porCiclo.get(r.ciclo) ?? new Set()).add(r.familiarId ?? 'eu'))
    fundosCiclo.set(r.ciclo, (fundosCiclo.get(r.ciclo) ?? new Set()).add(r.fundoTipo))
  }

  const entidadesDaCidade = b.entidades.filter((e) => e.municipio === u.municipio).map((e) => e.id)
  const entidadesVistas = new Set(evs.filter((e) => e.tipo === 'entidade_visitada').map((e) => String(e.dados.ref)))

  const temporadasMissoes = b.usuarioMissoes.filter((x) => x.usuarioId === uid && x.concluidaEm && b.missoes.find((m) => m.id === x.missaoId)?.tipo === 'temporada')
  const madrugador = temporadasMissoes.filter((x) => {
    const [, ano, idx] = x.periodo.split(':')
    const t = b.temporadas.find((tt) => x.periodo.startsWith(tt.id))
    const iv = t?.intervalos[Number(idx)]
    return iv ? diasEntre(`${ano}-${iv.inicio}`, diaSP(x.concluidaEm!)) < 7 : false
  }).length

  const quizPerfeito = new Set(evs.filter((e) => e.tipo === 'quiz_concluido' && e.dados.acertos === e.dados.total).map((e) => e.dados.ciclo)).size

  const semanasAlcateia = [...new Set(evs.filter((e) => e.tipo === 'alcateia_meta_batida').map((e) => String(e.dados.semana)))].sort()
  let seguidas = 0
  let melhor = 0
  semanasAlcateia.forEach((s, i) => {
    seguidas = i > 0 && somarDias(semanasAlcateia[i - 1], 7) === s ? seguidas + 1 : 1
    melhor = Math.max(melhor, seguidas)
  })

  const semanasPerfeitas = b.sorteios.filter(
    (s) => s.usuarioId === uid && s.tipo === 'semana' && s.missoes.length > 0 && s.missoes.every((id) => b.usuarioMissoes.some((x) => x.usuarioId === uid && x.missaoId === id && x.periodo === s.periodo && x.concluidaEm)),
  ).length

  const trilhasCompletas = b.usuarioTrilhas.filter((t) => {
    const temporada = b.temporadas.find((tt) => t.chave.startsWith(tt.id))
    return temporada && t.resgatados.includes(temporada.trilha.degraus)
  }).length

  return {
    destinacoes_proprias: proprios.length,
    destinacoes_fia: familia.filter((r) => r.fundoTipo === 'FIA').length,
    destinacoes_idoso: familia.filter((r) => r.fundoTipo === 'IDOSO').length,
    dupla_protecao: [...fundosCiclo.values()].some((s) => s.size >= 2) ? 1 : 0,
    familia_edicao: Math.max(0, ...[...porCiclo.values()].map((s) => s.size)),
    convidados_validados: validados.filter((r) => r.convidado).length,
    convites_aceitos: b.convites.filter((c) => c.usuarioId === uid && c.status !== 'enviado').length,
    compartilhamentos: conta('conquista_compartilhada'),
    edicoes: C.ciclosParticipados(b, uid).length,
    pioneiro: u.ciclosAnteriores.length > 0 ? 1 : 0,
    doacoes_diretas: proprios.filter((r) => r.modalidade === 'doacao_direta').length,
    madrugador,
    projetos_visitados: distintos('projeto_visitado'),
    entidades_municipio: entidadesDaCidade.length > 0 && entidadesDaCidade.every((id) => entidadesVistas.has(id)) ? 1 : 0,
    licoes_todas: LICOES_GUIA.every((l) => evs.some((e) => e.tipo === 'licao_guia_concluida' && e.dados.ref === l.id)) ? 1 : 0,
    licoes: distintos('licao_guia_concluida'),
    quiz_perfeito_edicoes: quizPerfeito,
    missoes: conta('missao_concluida'),
    semanas_perfeitas: semanasPerfeitas,
    trilhas_completas: trilhasCompletas,
    pins: b.usuarioPins.filter((p) => p.usuarioId === uid).length,
    alcateia_metas_seguidas: melhor,
    embaixador: u.perfil === 'embaixador' ? 1 : 0,
    mascote_tocado: conta('mascote_tocado'),
    glossario_completo: distintos('glossario_termo_aberto') >= GLOSSARIO_TERMOS.length ? 1 : 0,
    dia_voluntariado: evs.some((e) => e.dia.endsWith('-12-05')) ? 1 : 0,
    // atributos extras usados no radar
    perguntas: conta('pergunta_do_dia_respondida'),
    quizzes: conta('quiz_concluido'),
    historias: conta('historia_lida'),
    entidades_visitadas: distintos('entidade_visitada'),
    favoritos: distintos('entidade_favoritada'),
  }
}

/** Limite efetivo de um grau (-1 = coleção completa de pins). */
export function limiteGrau(b: Banco, ins: Insignia, grau: number) {
  const l = ins.graus[grau - 1]?.limite ?? Infinity
  return l === -1 ? b.pins.length : l
}

export function grauAtingido(b: Banco, ins: Insignia, valor: number) {
  let grau = 0
  ins.graus.forEach((_, i) => {
    if (valor >= limiteGrau(b, ins, i + 1)) grau = i + 1
  })
  return grau
}

export function grauAtual(b: Banco, uid: ID, insigniaId: ID) {
  return Math.max(0, ...b.usuarioInsignias.filter((x) => x.usuarioId === uid && x.insigniaId === insigniaId).map((x) => x.grau))
}

const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V']
export const romano = (n: number) => ROMANOS[n] ?? String(n)

/** Concede novos graus e revoga graus que deixaram de valer (estorno). */
export function avaliarInsignias(b: Banco, uid: ID, raiz?: ID) {
  const u = C.usuario(b, uid)
  if (!u) return
  const m = metricas(b, uid)
  for (const ins of b.insignias) {
    const valor = m[ins.metrica] ?? 0
    const alvo = grauAtingido(b, ins, valor)
    const atual = grauAtual(b, uid, ins.id)
    if (alvo > atual) {
      for (let g = atual + 1; g <= alvo; g++) {
        const raridade = ins.graus[g - 1].raridade
        b.usuarioInsignias.push({ usuarioId: uid, insigniaId: ins.id, grau: g, em: agora(), ciclo: b.configuracoes.cicloAtivo })
        const ref = `insignia:${ins.id}:${g}`
        if (somaPatinhas(b, uid, ref) <= 0) creditarPatinhas(b, uid, b.configuracoes.patinhas.insignia[raridade], 'insignia', `Insígnia ${C.flexionar(ins.nome, u.genero)}${ins.graus.length > 1 ? ` ${romano(g)}` : ''}`, { referencia: ref, eventoId: raiz })
        const nome = `${C.flexionar(ins.nome, u.genero)}${ins.graus.length > 1 ? ` ${romano(g)}` : ''}`
        notificar(b, uid, { titulo: ins.secreta ? `Conquista secreta: ${nome}` : `Nova insígnia: ${nome}`, texto: ins.descricao, tipo: 'insignia', link: '/conquistas' })
        if (['rara', 'epica', 'lendaria'].includes(raridade)) publicarNoMural(b, uid, 'insignia', `conquistou a insígnia ${nome}`, ins.icone, raridade)
      }
    } else if (alvo < atual && ins.metrica !== 'embaixador') {
      b.usuarioInsignias = b.usuarioInsignias.filter((x) => !(x.usuarioId === uid && x.insigniaId === ins.id && x.grau > alvo))
      for (let g = alvo + 1; g <= atual; g++) {
        const ref = `insignia:${ins.id}:${g}`
        const saldo = somaPatinhas(b, uid, ref)
        if (saldo > 0) creditarPatinhas(b, uid, -saldo, 'estorno', `Estorno da insígnia ${C.flexionar(ins.nome, u.genero)} ${romano(g)}`, { referencia: ref })
      }
      if (u.tituloEscolhido === ins.id && alvo === 0) u.tituloEscolhido = 'nivel'
      u.vitrine = u.vitrine.filter((id) => id !== ins.id || alvo > 0)
    }
  }
}

// ------------------------------------------------------------------ alcateias

export function alcateiaDo(b: Banco, uid: ID) {
  const m = b.alcateiaMembros.find((x) => x.usuarioId === uid)
  return m ? b.alcateias.find((a) => a.id === m.alcateiaId) : undefined
}

export function missoesDaAlcateiaNaSemana(b: Banco, alcateiaId: ID, semana: string) {
  const membros = new Set(b.alcateiaMembros.filter((m) => m.alcateiaId === alcateiaId).map((m) => m.usuarioId))
  const fim = somarDias(semana, 6)
  return b.eventos.filter((e) => e.tipo === 'missao_concluida' && !e.estornado && membros.has(e.usuarioId) && e.dia >= semana && e.dia <= fim).length
}

function avaliarAlcateia(b: Banco, uid: ID, ev: Evento, raiz: ID) {
  const alc = alcateiaDo(b, uid)
  if (!alc) return
  const semana = segundaSP(ev.em)
  if (missoesDaAlcateiaNaSemana(b, alc.id, semana) < alc.metaSemanal) return
  const cfg = b.configuracoes.alcateiaConfig
  for (const m of b.alcateiaMembros.filter((x) => x.alcateiaId === alc.id)) {
    const novo = registrarEvento(
      b,
      m.usuarioId,
      'alcateia_meta_batida',
      { alcateiaId: alc.id, semana },
      {
        chave: `${alc.id}:${semana}`,
        raiz: m.usuarioId === uid ? raiz : undefined,
        premio: {
          xp: [{ xp: cfg.bonusXp, origem: 'alcateia', descricao: `Meta semanal da alcateia ${alc.nome}` }],
          patinhas: [{ patinhas: cfg.bonusPatinhas, origem: 'alcateia', descricao: `Meta semanal da alcateia ${alc.nome}` }],
        },
      },
    )
    if (novo) notificar(b, m.usuarioId, { titulo: 'Sua alcateia bateu a meta', texto: `${alc.nome} completou ${alc.metaSemanal} missões nesta semana.`, tipo: 'alcateia', link: '/alcateia' })
  }
}

// ------------------------------------------------------------------ estorno

/**
 * Estorna eventos e tudo o que derivou deles: XP, Patinhas, itens de missão,
 * missões concluídas (recontadas), baús e insígnias que deixaram de valer.
 * Pontos de temporada são o XP do período, então caem junto.
 */
export function estornarEventos(b: Banco, ids: ID[], motivo: string, por?: ID) {
  const alvo = new Set(ids)
  let cresceu = true
  while (cresceu) {
    cresceu = false
    for (const e of b.eventos) if (!alvo.has(e.id) && e.raiz && alvo.has(e.raiz)) alvo.add(e.id), (cresceu = true)
  }
  const afetados = new Set<ID>()
  for (const e of b.eventos) {
    if (!alvo.has(e.id) || e.estornado) continue
    e.estornado = true
    afetados.add(e.usuarioId)
  }
  for (const t of [...b.transacoesXp]) {
    if (!t.eventoId || !alvo.has(t.eventoId) || t.xp <= 0) continue
    if (b.transacoesXp.some((x) => x.referencia === `estorno:${t.id}`)) continue
    creditarXp(b, t.usuarioId, -t.xp, 'estorno', `Estorno: ${t.descricao} (${motivo})`, { referencia: `estorno:${t.id}`, ciclo: t.ciclo, por })
  }
  for (const t of [...b.transacoesPatinhas]) {
    if (!t.eventoId || !alvo.has(t.eventoId) || t.patinhas <= 0 || (t.referencia?.startsWith('nivel:') ?? false) || (t.referencia?.startsWith('insignia:') ?? false)) continue
    if (b.transacoesPatinhas.some((x) => x.referencia === `estorno:${t.id}`)) continue
    creditarPatinhas(b, t.usuarioId, -t.patinhas, 'estorno', `Estorno: ${t.descricao}`, { referencia: `estorno:${t.id}`, por })
  }
  b.usuarioItens = b.usuarioItens.filter((i) => !i.eventoId || !alvo.has(i.eventoId))

  // missões: recontar sem os eventos estornados; conclusão desfeita estorna a conclusão também
  const conclusoesDesfeitas: ID[] = []
  for (const um of b.usuarioMissoes) {
    if (!um.contagem.some((ids2) => ids2.some((id) => alvo.has(id)))) continue
    um.contagem = um.contagem.map((ids2) => ids2.filter((id) => !alvo.has(id)))
    const m = b.missoes.find((x) => x.id === um.missaoId)
    if (um.concluidaEm && m && !missaoCompleta(b, m, um)) {
      um.concluidaEm = undefined
      if (um.eventoConclusao && !alvo.has(um.eventoConclusao)) conclusoesDesfeitas.push(um.eventoConclusao)
      um.eventoConclusao = undefined
    }
  }
  if (conclusoesDesfeitas.length) estornarEventos(b, conclusoesDesfeitas, motivo, por)
  for (const uid of afetados) avaliarInsignias(b, uid)
  auditar(b, 'estorno_eventos', `${alvo.size} evento(s) estornado(s): ${motivo}`, por)
}

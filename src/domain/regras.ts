import type {
  Banco,
  CriterioMissao,
  ID,
  Missao,
  Nivel,
  OrigemXp,
  Reporte,
  Temporada,
  Usuario,
} from './types'
import { dentroDoIntervalo, diaLocal, semanaIso } from '@/lib/datas'

// Regras de negócio puras: recebem o banco e o alteram no lugar.
// Os serviços (servicos.ts) envolvem estas funções em `mutar()` para persistir
// e avisar a interface; o seed usa as mesmas regras para gerar dados coerentes.

let seq = 0
const id = (p: string) => `${p}_${(++seq).toString(36)}${Math.random().toString(36).slice(2, 8)}`
const agora = () => new Date().toISOString()

// ---------------------------------------------------------------- consultas

export function usuario(b: Banco, uid: ID) {
  return b.usuarios.find((u) => u.id === uid)
}

export function cicloAtivo(b: Banco) {
  return b.ciclos.find((c) => c.ano === b.configuracoes.cicloAtivo) ?? b.ciclos[b.ciclos.length - 1]
}

export function xpTotal(b: Banco, uid: ID) {
  return b.transacoesXp.reduce((s, t) => (t.usuarioId === uid ? s + t.xp : s), 0)
}

export function xpCiclo(b: Banco, uid: ID, ano: number) {
  return b.transacoesXp.reduce((s, t) => (t.usuarioId === uid && t.ciclo === ano ? s + t.xp : s), 0)
}

export function nivelDe(xp: number, niveis: Nivel[]) {
  const ordenados = [...niveis].sort((a, c) => a.xpMinimo - c.xpMinimo)
  let atual = ordenados[0]
  for (const n of ordenados) if (xp >= n.xpMinimo) atual = n
  const proximo = ordenados.find((n) => n.xpMinimo > xp)
  const progresso = proximo ? (xp - atual.xpMinimo) / (proximo.xpMinimo - atual.xpMinimo) : 1
  return { atual, proximo, progresso }
}

export function reportesValidados(b: Banco, filtro: (r: Reporte) => boolean = () => true) {
  return b.reportes.filter((r) => r.status === 'validado' && filtro(r))
}

/** Total arrecadado: sempre calculado a partir dos reportes validados (seção 10). */
export function totalArrecadado(b: Banco, ano: number) {
  return reportesValidados(b, (r) => r.ciclo === ano).reduce((s, r) => s + r.valor, 0)
}

export function totalEmValidacao(b: Banco, ano: number) {
  return b.reportes
    .filter((r) => r.ciclo === ano && ['enviado', 'em_validacao', 'aguardando_padrinho'].includes(r.status))
    .reduce((s, r) => s + r.valor, 0)
}

export function indicadoresCiclo(b: Banco, ano: number) {
  const validados = reportesValidados(b, (r) => r.ciclo === ano)
  const participantes = new Set(validados.map((r) => r.usuarioId))
  const municipios = new Set(validados.map((r) => `${r.municipio}/${r.uf}`))
  const entidades = new Set(validados.filter((r) => r.entidadeId).map((r) => r.entidadeId))
  return { participantes: participantes.size, municipios: municipios.size, entidades: entidades.size }
}

/** Ciclos com participação: histórico anterior ao app + reportes validados (próprios ou de familiares). */
export function ciclosParticipados(b: Banco, uid: ID) {
  const u = usuario(b, uid)
  const anos = new Set<number>(u?.ciclosAnteriores ?? [])
  for (const r of b.reportes) if (r.usuarioId === uid && r.status === 'validado') anos.add(r.ciclo)
  return [...anos].sort((a, c) => a - c)
}

/** Quantos ciclos seguidos o usuário participou imediatamente antes de `ano`. */
export function ciclosConsecutivosAntes(b: Banco, uid: ID, ano: number) {
  const anos = new Set(ciclosParticipados(b, uid))
  let n = 0
  while (anos.has(ano - n - 1)) n++
  return n
}

/** Sequência sazonal: ciclos consecutivos com participação até o ciclo informado (inclusive, se houver). */
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

export function temporadaAtual(b: Banco, hoje = new Date()): Temporada | undefined {
  const mmdd = diaLocal(hoje).slice(5)
  return b.temporadas.find((t) => t.intervalos.some((i) => dentroDoIntervalo(mmdd, i.inicio, i.fim)))
}

export function periodoMissao(m: Missao, b: Banco, hoje = new Date()) {
  switch (m.recorrencia) {
    case 'diaria':
      return diaLocal(hoje)
    case 'semanal':
      return semanaIso(hoje)
    case 'sazonal':
      return `${m.temporadaId ?? temporadaAtual(b, hoje)?.id ?? 'tmp'}-${b.configuracoes.cicloAtivo}`
    default:
      return 'unica'
  }
}

export function missaoDisponivel(m: Missao, u: Usuario, b: Banco, hoje = new Date()) {
  if (!m.ativa) return false
  if (m.publico === 'colaboradores' && u.perfil === 'convidado') return false
  if (m.publico === 'embaixadores' && u.perfil !== 'embaixador') return false
  if (u.perfil === 'convidado' && !['diaria', 'unica'].includes(m.recorrencia) && m.criterio !== 'quiz') return false
  if (m.recorrencia === 'sazonal' && m.temporadaId && temporadaAtual(b, hoje)?.id !== m.temporadaId) return false
  return true
}

/** XP de missões diárias já ganho hoje (para o limite diário). */
export function xpMissoesHoje(b: Banco, uid: ID, hoje = new Date()) {
  const dia = diaLocal(hoje)
  return b.transacoesXp
    .filter((t) => t.usuarioId === uid && t.origem === 'missao' && t.descricao.startsWith('Missão diária') && diaLocal(new Date(t.em)) === dia)
    .reduce((s, t) => s + t.xp, 0)
}

// ---------------------------------------------------------------- escrita

export function notificar(b: Banco, uid: ID, n: { titulo: string; texto: string; tipo: Banco['notificacoes'][number]['tipo']; link?: string }) {
  b.notificacoes.unshift({ id: id('ntf'), usuarioId: uid, lida: false, em: agora(), ...n })
}

export function auditar(b: Banco, acao: string, detalhe: string, por?: ID, alvo?: string) {
  b.log.unshift({ id: id('log'), em: agora(), por, acao, alvo, detalhe })
}

/** Crédito (ou estorno, com xp negativo) com log de auditoria e aviso de subida de nível. */
export function creditarXp(
  b: Banco,
  uid: ID,
  xp: number,
  origem: OrigemXp,
  descricao: string,
  opcoes: { referencia?: ID; ciclo?: number; por?: ID; em?: string } = {},
) {
  if (!xp) return
  const antes = nivelDe(xpTotal(b, uid), b.niveis).atual
  b.transacoesXp.push({
    id: id('xp'),
    usuarioId: uid,
    xp,
    origem,
    referencia: opcoes.referencia,
    descricao,
    ciclo: opcoes.ciclo ?? b.configuracoes.cicloAtivo,
    em: opcoes.em ?? agora(),
  })
  auditar(b, xp > 0 ? 'credito_xp' : 'estorno_xp', `${xp > 0 ? '+' : ''}${xp} XP: ${descricao}`, opcoes.por, uid)
  const depois = nivelDe(xpTotal(b, uid), b.niveis).atual
  if (depois.nivel > antes.nivel) {
    notificar(b, uid, {
      titulo: `Você chegou ao nível ${depois.nivel}: ${depois.nome}`,
      texto: depois.desbloqueio,
      tipo: 'nivel',
      link: '/perfil',
    })
  }
}

export function concederInsignia(b: Banco, uid: ID, insigniaId: ID, ciclo: number) {
  if (b.usuarioInsignias.some((ui) => ui.usuarioId === uid && ui.insigniaId === insigniaId)) return false
  const ins = b.insignias.find((i) => i.id === insigniaId)
  if (!ins) return false
  b.usuarioInsignias.push({ usuarioId: uid, insigniaId, em: agora(), ciclo })
  notificar(b, uid, {
    titulo: ins.secreta ? `Conquista secreta: ${ins.nome}` : `Nova insígnia: ${ins.nome}`,
    texto: ins.descricao,
    tipo: 'insignia',
    link: '/perfil',
  })
  return true
}

export function desbloquearPin(b: Banco, uid: ID, ano: number) {
  if (b.usuarioPins.some((p) => p.usuarioId === uid && p.ano === ano)) return false
  b.usuarioPins.push({ usuarioId: uid, ano, em: agora() })
  notificar(b, uid, {
    titulo: `Pin ${ano} desbloqueado`,
    texto: 'Sua destinação foi validada e o pin do ciclo entrou para a sua coleção.',
    tipo: 'reporte',
    link: `/pins?ano=${ano}`,
  })
  return true
}

/** Reavalia as insígnias automáticas do usuário. */
export function verificarInsignias(b: Banco, uid: ID, ciclo = b.configuracoes.cicloAtivo) {
  const u = usuario(b, uid)
  if (!u) return
  const val = reportesValidados(b, (r) => r.usuarioId === uid)
  const doCiclo = val.filter((r) => r.ciclo === ciclo)
  const conceder = (ins: string, cond: boolean) => cond && concederInsignia(b, uid, ins, ciclo)

  conceder('primeira_destinacao', val.length > 0)
  const membros = new Set(doCiclo.map((r) => r.familiarId ?? 'eu'))
  const familia = membros.size >= 2
  conceder('familia_solidaria', familia)
  const fia = doCiclo.some((r) => r.fundoTipo === 'FIA')
  const idoso = doCiclo.some((r) => r.fundoTipo === 'IDOSO')
  conceder('guardiao_infancia', val.some((r) => r.fundoTipo === 'FIA'))
  conceder('guardiao_idoso', val.some((r) => r.fundoTipo === 'IDOSO'))
  conceder('dupla_protecao', fia && idoso)
  const aceitos = b.convites.filter((c) => c.usuarioId === uid && c.status !== 'enviado').length
  conceder('multiplicador', aceitos >= 5)
  const ciclos = ciclosParticipados(b, uid).length
  conceder('veterano_3', ciclos >= 3)
  conceder('veterano_5', ciclos >= 5)
  conceder('veterano_10', ciclos >= 10)
  conceder('pioneiro', u.ciclosAnteriores.length > 0)
  conceder('conhecedor_guia', b.transacoesXp.some((t) => t.usuarioId === uid && t.origem === 'quiz'))
  const projetosVistos = new Set(b.visitas.filter((v) => v.usuarioId === uid && v.tipo === 'projeto').map((v) => v.ref))
  conceder('explorador_projetos', projetosVistos.size >= 5)
  conceder('antecipado', doCiclo.some((r) => r.modalidade === 'doacao_direta'))
  conceder('embaixador', u.perfil === 'embaixador')
  conceder('coracao_de_leao', familia && fia && idoso)
  conceder('lenda_da_rede', nivelDe(xpTotal(b, uid), b.niveis).atual.nivel >= b.niveis.length)
}

/** Sinaliza reportes duplicados: mesmo comprovante ou mesmos dados (seção 7.6). */
export function detectarDuplicidade(b: Banco, r: Omit<Reporte, 'id'> & { id?: ID }, hashes: string[]) {
  const ativos = b.reportes.filter((x) => x.id !== r.id && !['estornado', 'recusado_padrinho'].includes(x.status))
  const comprovantesExistentes = new Map(b.comprovantes.map((c) => [c.id, c.hash]))
  for (const x of ativos) {
    const hx = x.comprovanteIds.map((cid) => comprovantesExistentes.get(cid))
    if (hashes.some((h) => hx.includes(h))) return `Mesmo comprovante do reporte ${x.id}`
    if (
      x.usuarioId === r.usuarioId &&
      (x.familiarId ?? '') === (r.familiarId ?? '') &&
      x.valor === r.valor &&
      x.dataPagamento === r.dataPagamento &&
      x.fundoTipo === r.fundoTipo
    )
      return `Mesmos dados do reporte ${x.id}`
  }
  return undefined
}

/** Calcula o XP de um reporte validado, conforme a tabela da seção 7.1. */
export function xpDoReporte(b: Banco, r: Reporte) {
  const t = b.configuracoes.tabelaXp
  const outrosValidados = reportesValidados(b, (x) => x.id !== r.id && x.usuarioId === r.usuarioId)
  const linhas: { xp: number; origem: OrigemXp; descricao: string }[] = []

  if (r.familiarId) {
    const familiar = b.familiares.find((f) => f.id === r.familiarId)
    const jaTeveFamiliar = outrosValidados.some((x) => x.ciclo === r.ciclo && x.familiarId === r.familiarId)
    linhas.push({
      xp: jaTeveFamiliar ? t.destinacaoAdicional : t.destinacaoFamiliar,
      origem: 'reporte_familiar',
      descricao: `Destinação de familiar validada (${familiar?.nome ?? 'familiar'})`,
    })
  } else {
    const primeiraNoCiclo = !outrosValidados.some((x) => x.ciclo === r.ciclo && !x.familiarId)
    const viaCarta = r.modalidade === 'doacao_direta' && !!r.cartaId
    if (primeiraNoCiclo) {
      linhas.push({ xp: t.primeiraDestinacao, origem: 'reporte', descricao: `Primeira destinação validada no ciclo ${r.ciclo}` })
      const u = usuario(b, r.usuarioId)
      const primeiraNaVida = !u?.ciclosAnteriores.length && !outrosValidados.some((x) => !x.familiarId)
      if (primeiraNaVida) linhas.push({ xp: t.bonusPrimeiraVida, origem: 'reporte', descricao: 'Bônus de primeira participação' })
    } else if (viaCarta) {
      linhas.push({ xp: t.doacaoCarta, origem: 'doacao_carta', descricao: 'Doação direta a entidade chancelada (carta) validada' })
    } else {
      linhas.push({ xp: t.destinacaoAdicional, origem: 'reporte', descricao: 'Destinação adicional validada no ciclo' })
    }
  }

  const bonusPct = bonusConsecutivoPct(b, r.usuarioId, r.ciclo)
  if (bonusPct > 0) {
    const base = linhas.reduce((s, l) => s + l.xp, 0)
    linhas.push({
      xp: Math.round((base * bonusPct) / 100),
      origem: linhas[0].origem,
      descricao: `Bônus de ciclos consecutivos (+${bonusPct}%)`,
    })
  }
  return linhas
}

/** Prévia do XP para a tela de confirmação do reporte. */
export function previaXp(b: Banco, r: Reporte) {
  return xpDoReporte(b, r).reduce((s, l) => s + l.xp, 0)
}

function marcosAtingidos(b: Banco, ano: number) {
  const meta = b.ciclos.find((c) => c.ano === ano)?.meta ?? 0
  if (!meta) return []
  const pct = (totalArrecadado(b, ano) / meta) * 100
  return b.configuracoes.marcos.filter((m) => pct >= m.pct).map((m) => m.pct)
}

/** Validação pela Seção DS: credita XP, atualiza insígnias, desbloqueia o pin e recalcula a meta. */
export function validarReporte(b: Banco, reporteId: ID, por?: ID, em = agora()) {
  const r = b.reportes.find((x) => x.id === reporteId)
  if (!r || r.status === 'validado') return
  const marcosAntes = marcosAtingidos(b, r.ciclo)

  for (const l of xpDoReporte(b, r)) creditarXp(b, r.usuarioId, l.xp, l.origem, l.descricao, { referencia: r.id, ciclo: r.ciclo, por, em })
  r.status = 'validado'
  r.historico.push({ status: 'validado', em, por })
  auditar(b, 'validar_reporte', `Reporte ${r.id} validado (${r.valor})`, por, r.id)

  // bônus do padrinho / quem convidou, uma vez por convidado e ciclo
  const u = usuario(b, r.usuarioId)
  if (u) {
    const padrinho = u.padrinhoEmail ? b.usuarios.find((x) => x.email.toLowerCase() === u.padrinhoEmail!.toLowerCase()) : undefined
    const quemGanha = padrinho ?? (u.convidadoPor ? usuario(b, u.convidadoPor) : undefined)
    if (quemGanha) {
      const jaRecebeu = b.transacoesXp.some(
        (t) => t.usuarioId === quemGanha.id && t.origem === 'bonus_padrinho' && t.ciclo === r.ciclo && t.descricao.endsWith(`(${u.nome})`),
      )
      if (!jaRecebeu) {
        creditarXp(b, quemGanha.id, b.configuracoes.tabelaXp.bonusPadrinho, 'bonus_padrinho', `Convidado com reporte validado (${u.nome})`, {
          referencia: r.id,
          ciclo: r.ciclo,
          por,
          em,
        })
      }
    }
    for (const c of b.convites) if (c.convidadoId === u.id && c.status !== 'reportou') c.status = 'reportou'
  }

  // missões ligadas a reportes só contam depois da validação (antifraude, seção 7.6)
  const enviadoEm = new Date(r.criadoEm)
  if (r.familiarId) registrarEvento(b, r.usuarioId, 'reporte_familiar', r.id, enviadoEm, r.id)
  if (r.modalidade === 'doacao_direta') registrarEvento(b, r.usuarioId, 'reporte_ate_prazo', r.id, enviadoEm, r.id)

  desbloquearPin(b, r.usuarioId, r.ciclo)
  notificar(b, r.usuarioId, {
    titulo: 'Reporte validado',
    texto: 'A Seção Desenvolvimento Social validou sua destinação. Obrigado por fazer parte da Rede.',
    tipo: 'reporte',
    link: `/reportes/${r.id}`,
  })
  verificarInsignias(b, r.usuarioId, r.ciclo)

  const novos = marcosAtingidos(b, r.ciclo).filter((m) => !marcosAntes.includes(m))
  for (const pct of novos) {
    const marco = b.configuracoes.marcos.find((m) => m.pct === pct)!
    for (const x of b.usuarios) notificar(b, x.id, { titulo: `Meta WEG: ${pct}% alcançados`, texto: `${marco.titulo}. ${marco.conteudo}`, tipo: 'meta', link: '/' })
    auditar(b, 'marco_meta', `Marco de ${pct}% atingido no ciclo ${r.ciclo}`, por)
  }
}

export function devolverReporte(b: Banco, reporteId: ID, motivo: string, por?: ID) {
  const r = b.reportes.find((x) => x.id === reporteId)
  if (!r) return
  r.status = 'devolvido'
  r.motivoDevolucao = motivo
  r.historico.push({ status: 'devolvido', em: agora(), por, nota: motivo })
  auditar(b, 'devolver_reporte', `Reporte ${r.id} devolvido: ${motivo}`, por, r.id)
  notificar(b, r.usuarioId, { titulo: 'Reporte devolvido para ajuste', texto: motivo, tipo: 'reporte', link: `/reportes/${r.id}` })
}

/** Estorno: desfaz o XP creditado pelo reporte (inclusive o bônus do padrinho) e registra no log. */
export function estornarReporte(b: Banco, reporteId: ID, motivo: string, por?: ID) {
  const r = b.reportes.find((x) => x.id === reporteId)
  if (!r || r.status !== 'validado') return
  const creditos = b.transacoesXp.filter((t) => t.referencia === r.id && t.xp > 0)
  for (const t of creditos) {
    creditarXp(b, t.usuarioId, -t.xp, 'estorno', `Estorno: ${t.descricao}`, { referencia: r.id, ciclo: t.ciclo, por })
  }
  r.status = 'estornado'
  r.historico.push({ status: 'estornado', em: agora(), por, nota: motivo })
  auditar(b, 'estornar_reporte', `Reporte ${r.id} estornado: ${motivo}`, por, r.id)
  notificar(b, r.usuarioId, { titulo: 'Reporte estornado', texto: motivo, tipo: 'reporte', link: `/reportes/${r.id}` })
}

/** Avança uma missão a partir de um evento do usuário. Retorna as missões concluídas agora. */
export function registrarEvento(b: Banco, uid: ID, criterio: CriterioMissao, ref?: ID, hoje = new Date(), referenciaCredito?: ID) {
  const u = usuario(b, uid)
  if (!u) return []
  const concluidas: Missao[] = []
  for (const m of b.missoes) {
    if (m.criterio !== criterio || !missaoDisponivel(m, u, b, hoje)) continue
    const periodo = periodoMissao(m, b, hoje)
    let um = b.usuarioMissoes.find((x) => x.usuarioId === uid && x.missaoId === m.id && x.periodo === periodo)
    if (!um) {
      um = { usuarioId: uid, missaoId: m.id, periodo, progresso: 0, refs: [] }
      b.usuarioMissoes.push(um)
    }
    if (um.concluidaEm) continue
    if (ref) {
      if (um.refs.includes(ref)) continue
      um.refs.push(ref)
    }
    um.progresso += 1
    if (um.progresso >= m.meta) {
      um.concluidaEm = agora()
      let xp = m.xp
      if (m.recorrencia === 'diaria') {
        const restante = b.configuracoes.tabelaXp.limiteDiarioMissoes - xpMissoesHoje(b, uid, hoje)
        xp = Math.max(0, Math.min(xp, restante))
      }
      const rotulo = { diaria: 'Missão diária', semanal: 'Missão semanal', sazonal: 'Missão sazonal', unica: 'Missão' }[m.recorrencia]
      creditarXp(b, uid, xp, 'missao', `${rotulo}: ${m.titulo}`, { referencia: referenciaCredito ?? m.id })
      concluidas.push(m)
    }
  }
  if (concluidas.length) verificarInsignias(b, uid)
  return concluidas
}

import type { Banco, ID, OrigemXp, Reporte } from './types'
import * as C from './consultas'
import { auditar, estornarEventos, notificar, registrarEvento, type Premio } from './motor'

// Regras dos reportes de destinação: XP (seção 7.1 da v1, mantida), validação,
// devolução e estorno. O XP vai sempre para o colaborador, nunca para o convidado,
// e nunca depende do valor doado.

export * from './consultas'
export { notificar, auditar } from './motor'

/** Sinaliza reportes duplicados: mesmo comprovante ou mesmos dados. */
export function detectarDuplicidade(b: Banco, r: Omit<Reporte, 'id'> & { id?: ID }, hashes: string[]) {
  const ativos = b.reportes.filter((x) => x.id !== r.id && !['estornado', 'recusado_colaborador'].includes(x.status))
  const hashDe = new Map(b.comprovantes.map((c) => [c.id, c.hash]))
  for (const x of ativos) {
    const hx = x.comprovanteIds.map((cid) => hashDe.get(cid))
    if (hashes.some((h) => hx.includes(h))) return `Mesmo comprovante do reporte ${x.id}`
    if (
      x.usuarioId === r.usuarioId &&
      (x.familiarId ?? '') === (r.familiarId ?? '') &&
      (x.convidado?.nome ?? '') === (r.convidado?.nome ?? '') &&
      x.valor === r.valor &&
      x.dataPagamento === r.dataPagamento &&
      x.fundoTipo === r.fundoTipo
    )
      return `Mesmos dados do reporte ${x.id}`
  }
  return undefined
}

/** Linhas de XP de um reporte validado. */
export function xpDoReporte(b: Banco, r: Reporte) {
  const t = b.configuracoes.tabelaXp
  const outros = C.reportesValidados(b, (x) => x.id !== r.id && x.usuarioId === r.usuarioId)
  const linhas: { xp: number; origem: OrigemXp; descricao: string }[] = []

  if (r.convidado) {
    linhas.push({ xp: t.reporteConvidado, origem: 'reporte_convidado', descricao: `Reporte de convidado validado (${r.convidado.nome})` })
    return linhas // convidado não entra no bônus de ciclos consecutivos do colaborador
  }
  if (r.familiarId) {
    const familiar = b.familiares.find((f) => f.id === r.familiarId)
    const repetido = outros.some((x) => x.ciclo === r.ciclo && x.familiarId === r.familiarId)
    linhas.push({ xp: repetido ? t.destinacaoAdicional : t.destinacaoFamiliar, origem: 'reporte_familiar', descricao: `Destinação de familiar validada (${familiar?.nome ?? 'familiar'})` })
  } else {
    const primeiraNoCiclo = !outros.some((x) => x.ciclo === r.ciclo && !x.familiarId && !x.convidado)
    if (primeiraNoCiclo) {
      linhas.push({ xp: t.primeiraDestinacao, origem: 'reporte', descricao: `Primeira destinação validada no ciclo ${r.ciclo}` })
      const u = C.usuario(b, r.usuarioId)
      if (!u?.ciclosAnteriores.length && !outros.some((x) => !x.familiarId && !x.convidado)) linhas.push({ xp: t.bonusPrimeiraVida, origem: 'reporte', descricao: 'Bônus de primeira participação' })
    } else if (r.modalidade === 'doacao_direta' && r.cartaId) {
      linhas.push({ xp: t.doacaoCarta, origem: 'doacao_carta', descricao: 'Doação direta a entidade chancelada (carta) validada' })
    } else {
      linhas.push({ xp: t.destinacaoAdicional, origem: 'reporte', descricao: 'Destinação adicional validada no ciclo' })
    }
  }
  const bonus = C.bonusConsecutivoPct(b, r.usuarioId, r.ciclo)
  if (bonus > 0) {
    const base = linhas.reduce((s, l) => s + l.xp, 0)
    linhas.push({ xp: Math.round((base * bonus) / 100), origem: linhas[0].origem, descricao: `Bônus de ciclos consecutivos (+${bonus}%)` })
  }
  return linhas
}

export function previaXp(b: Banco, r: Reporte) {
  return xpDoReporte(b, r).reduce((s, l) => s + l.xp, 0)
}

function marcosAtingidos(b: Banco, ano: number) {
  const meta = b.ciclos.find((c) => c.ano === ano)?.meta ?? 0
  if (!meta) return []
  const pct = (C.totalArrecadado(b, ano) / meta) * 100
  return b.configuracoes.marcos.filter((m) => pct >= m.pct).map((m) => m.pct)
}

/** Validação pela Seção DS: gera os eventos do reporte (XP, Patinhas, missões, insígnias), pin e meta. */
export function validarReporte(b: Banco, reporteId: ID, por?: ID, em = new Date().toISOString()) {
  const r = b.reportes.find((x) => x.id === reporteId)
  // só valida o que está na fila: nunca reporte recusado, devolvido ou aguardando o colaborador
  if (!r || !['enviado', 'em_validacao'].includes(r.status)) return
  const marcosAntes = marcosAtingidos(b, r.ciclo)
  const linhas = xpDoReporte(b, r)
  r.status = 'validado'
  r.historico.push({ status: 'validado', em, por })
  auditar(b, 'validar_reporte', `Reporte ${r.id} validado`, por, r.id)

  const p = b.configuracoes.patinhas
  const premio: Premio = { xp: linhas, patinhas: !r.familiarId && !r.convidado ? [{ patinhas: p.destinacaoPropria, origem: 'destinacao', descricao: 'Destinação própria validada' }] : [] }
  const tipo = r.convidado ? 'reporte_convidado_validado' : r.familiarId ? 'reporte_familiar_validado' : 'reporte_validado'
  const dados = { reporteId: r.id, ciclo: r.ciclo, fundo: r.fundoTipo, municipio: r.municipio, modalidade: r.modalidade }
  const ev = registrarEvento(b, r.usuarioId, tipo, dados, { chave: r.id, em, ciclo: r.ciclo, premio, por })
  const raiz = ev?.id
  if (r.modalidade === 'doacao_direta' && !r.convidado) registrarEvento(b, r.usuarioId, 'doacao_direta_validada', dados, { chave: r.id, raiz, em, ciclo: r.ciclo })
  if (r.familiarId || r.convidado) registrarEvento(b, r.usuarioId, 'multiplicacao_validada', dados, { chave: r.id, raiz, em, ciclo: r.ciclo })

  for (const c of b.convites) if (c.convidadoId === r.usuarioId && c.status !== 'reportou') c.status = 'reportou'
  if (!r.convidado && !b.usuarioPins.some((x) => x.usuarioId === r.usuarioId && x.ano === r.ciclo)) {
    b.usuarioPins.push({ usuarioId: r.usuarioId, ano: r.ciclo, em })
    notificar(b, r.usuarioId, { titulo: `Pin ${r.ciclo} desbloqueado`, texto: 'Sua destinação foi validada e o pin da edição entrou para a sua coleção.', tipo: 'reporte', link: `/pins?ano=${r.ciclo}` })
  }
  notificar(b, r.usuarioId, {
    titulo: r.convidado ? `Reporte de ${r.convidado.nome} validado` : 'Reporte validado',
    texto: 'A Seção Desenvolvimento Social validou a destinação. Obrigado por fazer parte da Rede.',
    tipo: 'reporte',
    link: `/reportes/${r.id}`,
  })

  const novos = marcosAtingidos(b, r.ciclo).filter((m) => !marcosAntes.includes(m))
  for (const pct of novos) {
    const marco = b.configuracoes.marcos.find((m) => m.pct === pct)!
    for (const x of b.usuarios) notificar(b, x.id, { titulo: `Meta WEG: ${pct}% alcançados`, texto: `${marco.titulo}. ${marco.conteudo}`, tipo: 'meta', link: '/' })
    auditar(b, 'marco_meta', `Marco de ${pct}% atingido no ciclo ${r.ciclo}`, por)
  }
}

/** Desfaz os prêmios de um reporte já validado (XP, Patinhas, pontos de temporada, insígnias, pin). */
function desfazerPremios(b: Banco, r: Reporte, motivo: string, por?: ID) {
  const raizes = b.eventos.filter((e) => e.usuarioId === r.usuarioId && e.chave === r.id && !e.estornado && !e.raiz).map((e) => e.id)
  if (raizes.length) estornarEventos(b, raizes, motivo, por)
  const aindaTem = C.reportesValidados(b, (x) => x.id !== r.id && x.usuarioId === r.usuarioId && x.ciclo === r.ciclo && !x.convidado).length > 0
  const u = C.usuario(b, r.usuarioId)
  if (!aindaTem && !u?.ciclosAnteriores.includes(r.ciclo)) b.usuarioPins = b.usuarioPins.filter((p) => !(p.usuarioId === r.usuarioId && p.ano === r.ciclo))
}

/** Devolução para ajuste. Se o reporte já estava validado, tudo o que ele gerou é estornado. */
export function devolverReporte(b: Banco, reporteId: ID, motivo: string, por?: ID) {
  const r = b.reportes.find((x) => x.id === reporteId)
  if (!r) return
  const estavaValidado = r.status === 'validado'
  r.status = 'devolvido'
  r.motivoDevolucao = motivo
  r.historico.push({ status: 'devolvido', em: new Date().toISOString(), por, nota: motivo })
  if (estavaValidado) desfazerPremios(b, r, `devolução do reporte: ${motivo}`, por)
  auditar(b, 'devolver_reporte', `Reporte ${r.id} devolvido: ${motivo}`, por, r.id)
  notificar(b, r.usuarioId, { titulo: 'Reporte devolvido para ajuste', texto: motivo, tipo: 'reporte', link: `/reportes/${r.id}` })
}

export function estornarReporte(b: Banco, reporteId: ID, motivo: string, por?: ID) {
  const r = b.reportes.find((x) => x.id === reporteId)
  if (!r || r.status !== 'validado') return
  r.status = 'estornado'
  r.historico.push({ status: 'estornado', em: new Date().toISOString(), por, nota: motivo })
  desfazerPremios(b, r, motivo, por)
  auditar(b, 'estornar_reporte', `Reporte ${r.id} estornado: ${motivo}`, por, r.id)
  notificar(b, r.usuarioId, { titulo: 'Reporte estornado', texto: motivo, tipo: 'reporte', link: `/reportes/${r.id}` })
}

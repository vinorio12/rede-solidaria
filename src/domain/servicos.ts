import { agoraIso, getBanco, mutar, novoId } from '@/data/db'
import type {
  AvatarConfig,
  Banco,
  CategoriaItem,
  Comprovante,
  Configuracoes,
  Convite,
  Esfera,
  Familiar,
  Genero,
  ID,
  Modalidade,
  Perfil,
  Projeto,
  RelacaoConvidado,
  Reporte,
  TipoEvento,
  TipoFundo,
  Usuario,
  ValorEvento,
} from './types'
import * as R from './regras'
import * as M from './motor'
import { possuiItem, precoItem, ofertasLoja, estadoTrilha, prepararSorteios, trilhaEmProrrogacao } from './jogo'
import { diaSP, segundaSP } from '@/lib/tempo'

// Camada de serviços: é o "contrato de API" do app. Hoje grava no repositório
// local; na integração com o back-end, cada função vira uma chamada REST.

export class ErroRegra extends Error {}

export const TAMANHO_MAX_COMPROVANTE = 10 * 1024 * 1024
const TAMANHO_MAX_GUARDADO = 1.5 * 1024 * 1024
const TIPOS_ACEITOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic']

export function emailWegValido(email: string) {
  return /^[^\s@]+@weg\.net$/i.test(email.trim())
}

async function hashArquivo(arquivo: File) {
  const buf = await arquivo.arrayBuffer()
  if (globalThis.crypto?.subtle) {
    const dig = await crypto.subtle.digest('SHA-256', buf)
    return [...new Uint8Array(dig)].map((x) => x.toString(16).padStart(2, '0')).join('')
  }
  return `${arquivo.name}-${arquivo.size}`
}

function lerDataUrl(arquivo: File) {
  return new Promise<string>((ok, erro) => {
    const fr = new FileReader()
    fr.onload = () => ok(String(fr.result))
    fr.onerror = () => erro(fr.error)
    fr.readAsDataURL(arquivo)
  })
}

/** Validação de arquivo: tamanho, tipo declarado e assinatura do conteúdo (PDF ou imagem de verdade). */
async function conteudoValido(a: File) {
  const cab = new Uint8Array(await a.slice(0, 12).arrayBuffer())
  const txt = String.fromCharCode(...cab)
  return txt.startsWith('%PDF') || (cab[0] === 0x89 && txt.slice(1, 4) === 'PNG') || (cab[0] === 0xff && cab[1] === 0xd8) || txt.slice(8, 12) === 'WEBP' || txt.slice(4, 8) === 'ftyp'
}

export async function prepararComprovantes(arquivos: File[]): Promise<Comprovante[]> {
  const out: Comprovante[] = []
  for (const a of arquivos) {
    if (a.size > TAMANHO_MAX_COMPROVANTE) throw new ErroRegra(`O arquivo ${a.name} passa de 10 MB.`)
    if (a.type && !TIPOS_ACEITOS.includes(a.type)) throw new ErroRegra(`O arquivo ${a.name} precisa ser PDF ou imagem.`)
    if (!(await conteudoValido(a))) throw new ErroRegra(`O arquivo ${a.name} não parece ser um PDF ou uma imagem válida.`)
    out.push({ id: novoId('cmp'), nome: a.name, tipo: a.type || 'application/octet-stream', tamanho: a.size, hash: await hashArquivo(a), dataUrl: a.size <= TAMANHO_MAX_GUARDADO ? await lerDataUrl(a) : undefined })
  }
  return out
}

// ------------------------------------------------------------------ reportes

export interface DadosReporte {
  familiarId?: ID
  convidado?: { nome: string; relacao: RelacaoConvidado }
  modalidade: Modalidade
  fundoTipo: TipoFundo
  esfera: Esfera
  municipio: string
  uf: string
  entidadeId?: ID
  valor: number
  dataPagamento: string
  cartaId?: ID
}

export function rascunhoReporte(uid: ID, d: DadosReporte): Reporte {
  const b = getBanco()
  const { convidado, ...resto } = d
  return {
    id: 'rascunho',
    usuarioId: uid,
    ciclo: b.configuracoes.cicloAtivo,
    ...resto,
    convidado: convidado ? { ...convidado, lancadoPeloColaborador: true } : undefined,
    comprovanteIds: [],
    status: 'enviado',
    historico: [],
    criadoEm: agoraIso(),
  }
}

function notificarAdmins(b: Banco, titulo: string, texto: string) {
  for (const a of b.usuarios.filter((x) => x.perfil === 'admin')) M.notificar(b, a.id, { titulo, texto, tipo: 'reporte', link: '/admin/validacao' })
}

function reportesDeConvidadoNaEdicao(b: Banco, uid: ID) {
  return b.reportes.filter((r) => r.usuarioId === uid && r.convidado && r.ciclo === b.configuracoes.cicloAtivo && r.status !== 'recusado_colaborador').length
}

/** Reporte do colaborador: próprio, de familiar ou "por um convidado" (plano alternativo sem rota pública). */
export function enviarReporte(uid: ID, d: DadosReporte, comprovantes: Comprovante[]) {
  if (!comprovantes.length) throw new ErroRegra('Envie ao menos um comprovante.')
  if (!(d.valor > 0)) throw new ErroRegra('Informe um valor maior que zero.')
  if (d.convidado && !d.convidado.nome.trim()) throw new ErroRegra('Informe o nome do convidado.')
  return mutar((b) => {
    const u = R.usuario(b, uid)
    if (!u) throw new ErroRegra('Usuário não encontrado.')
    if (d.convidado && reportesDeConvidadoNaEdicao(b, uid) >= b.configuracoes.convidados.limitePorEdicao)
      throw new ErroRegra(`Limite de ${b.configuracoes.convidados.limitePorEdicao} reportes de convidado por edição atingido.`)
    const r: Reporte = {
      ...rascunhoReporte(uid, d),
      id: novoId('rep'),
      comprovanteIds: comprovantes.map((c) => c.id),
      status: 'enviado',
      historico: [{ status: 'enviado', em: agoraIso(), por: uid, nota: d.convidado ? `Lançado pelo colaborador em nome de ${d.convidado.nome}` : undefined }],
    }
    r.duplicidadeSuspeita = R.detectarDuplicidade(b, r, comprovantes.map((c) => c.hash))
    b.comprovantes.push(...comprovantes)
    b.reportes.push(r)
    R.auditar(b, 'enviar_reporte', `Reporte ${r.id} enviado${r.duplicidadeSuspeita ? ` (possível duplicidade: ${r.duplicidadeSuspeita})` : ''}`, uid, r.id)
    notificarAdmins(b, 'Novo reporte na fila', `${u.nome} enviou um reporte para validação.`)
    return r
  })
}

export function reenviarReporte(reporteId: ID, d: Partial<DadosReporte>, novos: Comprovante[]) {
  return mutar((b) => {
    const r = b.reportes.find((x) => x.id === reporteId)
    if (!r || r.status !== 'devolvido') throw new ErroRegra('Só é possível ajustar reportes devolvidos.')
    const { convidado: _c, ...resto } = d
    Object.assign(r, resto)
    if (novos.length) {
      b.comprovantes.push(...novos)
      r.comprovanteIds = [...r.comprovanteIds, ...novos.map((c) => c.id)]
    }
    r.status = 'enviado'
    r.motivoDevolucao = undefined
    r.historico.push({ status: 'enviado', em: agoraIso(), por: r.usuarioId, nota: 'Reenviado após ajuste' })
    R.auditar(b, 'reenviar_reporte', `Reporte ${r.id} reenviado após ajuste`, r.usuarioId, r.id)
  })
}

// ------------------------------------------------------------------ convidado sem cadastro (seção 2)

export function linkConvidadoDe(b: Banco, uid: ID) {
  return b.linksConvidado.find((l) => l.usuarioId === uid && l.ativo)
}

export function gerarLinkConvidado(uid: ID) {
  return mutar((b) => {
    let l = linkConvidadoDe(b, uid)
    if (!l) {
      l = { id: novoId('lnk'), usuarioId: uid, codigo: `C${Math.random().toString(36).slice(2, 8).toUpperCase()}`, criadoEm: agoraIso(), ativo: true, envios: [] }
      b.linksConvidado.push(l)
      R.auditar(b, 'link_convidado', `Link de convidado ${l.codigo} gerado`, uid, l.id)
    }
    M.registrarEvento(b, uid, 'link_convidado_gerado', { ref: l.id }, { chave: l.id })
    return l
  })
}

export function renovarLinkConvidado(uid: ID) {
  mutar((b) => {
    for (const l of b.linksConvidado) if (l.usuarioId === uid) l.ativo = false
  })
  return gerarLinkConvidado(uid)
}

/** Dados mínimos que a página pública mostra: só o primeiro nome do colaborador. */
export function infoLinkPublico(codigo: string) {
  const b = getBanco()
  const l = b.linksConvidado.find((x) => x.codigo === codigo.toUpperCase() && x.ativo)
  const u = l && R.usuario(b, l.usuarioId)
  if (!l || !u) return null
  return { primeiroNome: u.nome.split(' ')[0], esgotado: reportesDeConvidadoNaEdicao(b, u.id) >= b.configuracoes.convidados.limitePorEdicao }
}

export interface DadosFormularioConvidado {
  nome: string
  relacao: RelacaoConvidado
  modalidade: Modalidade
  fundoTipo: TipoFundo
  municipio: string
  uf: string
  valor: number
  dataPagamento: string
  consentimento: boolean
  /** Campo-armadilha para robôs: precisa vir vazio. */
  site?: string
  dispositivo: string
  abertoEm: number
}

/** Única operação acessível sem login: o reporte chega ao colaborador para confirmação. */
export function enviarReporteConvidado(codigo: string, d: DadosFormularioConvidado, comprovantes: Comprovante[]) {
  if (d.site) throw new ErroRegra('Não foi possível enviar.')
  if (Date.now() - d.abertoEm < 3000) throw new ErroRegra('Confira os dados antes de enviar.')
  if (!d.consentimento) throw new ErroRegra('É preciso aceitar o termo de consentimento.')
  if (!d.nome.trim() || d.nome.trim().length < 3) throw new ErroRegra('Informe o seu nome.')
  if (!(d.valor > 0)) throw new ErroRegra('Informe o valor pago.')
  if (!comprovantes.length) throw new ErroRegra('Anexe o comprovante.')
  return mutar((b) => {
    const l = b.linksConvidado.find((x) => x.codigo === codigo.toUpperCase() && x.ativo)
    if (!l) throw new ErroRegra('Link inválido ou desativado.')
    const cfg = b.configuracoes.convidados
    const hoje = diaSP()
    if (l.envios.filter((e) => diaSP(e.em) === hoje).length >= cfg.limitePorLinkDia) throw new ErroRegra('Este link atingiu o limite de envios de hoje. Tente amanhã.')
    if (b.linksConvidado.flatMap((x) => x.envios).filter((e) => e.dispositivo === d.dispositivo && diaSP(e.em) === hoje).length >= cfg.limitePorDispositivoDia)
      throw new ErroRegra('Limite de envios deste aparelho atingido hoje.')
    if (reportesDeConvidadoNaEdicao(b, l.usuarioId) >= cfg.limitePorEdicao) throw new ErroRegra('Este colaborador já atingiu o limite de reportes de convidados desta edição.')
    const r: Reporte = {
      id: novoId('rep'),
      usuarioId: l.usuarioId,
      convidado: { nome: d.nome.trim(), relacao: d.relacao, linkId: l.id, lancadoPeloColaborador: false },
      ciclo: b.configuracoes.cicloAtivo,
      modalidade: d.modalidade,
      fundoTipo: d.fundoTipo,
      esfera: 'municipal',
      municipio: d.municipio,
      uf: d.uf,
      valor: d.valor,
      dataPagamento: d.dataPagamento,
      comprovanteIds: comprovantes.map((c) => c.id),
      status: 'aguardando_colaborador',
      historico: [{ status: 'aguardando_colaborador', em: agoraIso(), nota: `Enviado por ${d.nome.trim()} pelo link de convidado` }],
      criadoEm: agoraIso(),
    }
    r.duplicidadeSuspeita = R.detectarDuplicidade(b, r, comprovantes.map((c) => c.hash))
    l.envios.push({ em: agoraIso(), dispositivo: d.dispositivo })
    b.comprovantes.push(...comprovantes)
    b.reportes.push(r)
    M.notificar(b, l.usuarioId, { titulo: 'Reporte de convidado para confirmar', texto: `${r.convidado!.nome} reportou uma destinação em seu nome.`, tipo: 'convidado', link: '/convidados' })
    R.auditar(b, 'reporte_convidado', `Reporte ${r.id} recebido pelo link ${l.codigo}`, undefined, r.id)
    return r.id
  })
}

export function decidirReporteConvidado(uid: ID, reporteId: ID, confirmar: boolean, motivo?: string) {
  mutar((b) => {
    const r = b.reportes.find((x) => x.id === reporteId)
    if (!r || r.usuarioId !== uid || r.status !== 'aguardando_colaborador') throw new ErroRegra('Reporte não encontrado.')
    if (confirmar) {
      r.status = 'enviado'
      r.historico.push({ status: 'enviado', em: agoraIso(), por: uid, nota: 'Confirmado pelo colaborador' })
      notificarAdmins(b, 'Novo reporte na fila', `Reporte de convidado (${r.convidado?.nome}) confirmado pelo colaborador.`)
    } else {
      r.status = 'recusado_colaborador'
      r.historico.push({ status: 'recusado_colaborador', em: agoraIso(), por: uid, nota: motivo || 'Recusado pelo colaborador' })
    }
    R.auditar(b, confirmar ? 'confirmar_reporte_convidado' : 'recusar_reporte_convidado', `Reporte ${r.id}`, uid, r.id)
  })
}

// ------------------------------------------------------------------ família

export function salvarFamiliar(f: Omit<Familiar, 'id'> & { id?: ID }) {
  return mutar((b) => {
    let salvo: Familiar
    if (f.id) {
      const x = b.familiares.find((y) => y.id === f.id)!
      Object.assign(x, f)
      salvo = x
    } else {
      salvo = { ...f, id: novoId('fam') }
      b.familiares.push(salvo)
    }
    M.registrarEvento(b, f.usuarioId, 'familia_atualizada', { ref: salvo.id })
    return salvo
  })
}

export function removerFamiliar(id: ID) {
  mutar((b) => {
    if (b.reportes.some((r) => r.familiarId === id)) throw new ErroRegra('Este familiar já tem reportes e não pode ser removido.')
    b.familiares = b.familiares.filter((f) => f.id !== id)
  })
}

// ------------------------------------------------------------------ validação (Seção DS)

export function iniciarAnalise(reporteId: ID, adminId: ID) {
  mutar((b) => {
    const r = b.reportes.find((x) => x.id === reporteId)
    if (!r || r.status !== 'enviado') return
    r.status = 'em_validacao'
    r.historico.push({ status: 'em_validacao', em: agoraIso(), por: adminId })
    M.notificar(b, r.usuarioId, { titulo: 'Reporte em validação', texto: 'A Seção DS começou a analisar o comprovante.', tipo: 'reporte', link: `/reportes/${r.id}` })
  })
}

export const validar = (reporteId: ID, adminId: ID) => mutar((b) => R.validarReporte(b, reporteId, adminId))
export const devolver = (reporteId: ID, motivo: string, adminId: ID) => mutar((b) => R.devolverReporte(b, reporteId, motivo, adminId))
export const estornar = (reporteId: ID, motivo: string, adminId: ID) => mutar((b) => R.estornarReporte(b, reporteId, motivo, adminId))

// ------------------------------------------------------------------ eventos do dia a dia

/** Ponto único para as telas registrarem eventos (visitas, leituras, check-in...). Retorna as missões concluídas. */
export function registrar(uid: ID, tipo: TipoEvento, dados: Record<string, ValorEvento> = {}, chave?: string) {
  // Evento idempotente já registrado: não grava nem notifica, para que telas que
  // registram ao abrir (useEffect) não entrem em laço de atualização.
  if (chave && getBanco().eventos.some((e) => e.usuarioId === uid && e.tipo === tipo && e.chave === chave && !e.estornado)) return []
  return mutar((b) => {
    const antes = b.eventos.length
    M.registrarEvento(b, uid, tipo, dados, { chave })
    return b.eventos
      .slice(antes)
      .filter((e) => e.tipo === 'missao_concluida')
      .map((e) => b.missoes.find((m) => m.id === e.dados.missaoId)!)
      .filter(Boolean)
  })
}

export function registrarVisitaProjeto(uid: ID, p: Projeto) {
  return registrar(uid, 'projeto_visitado', { ref: p.id, municipio: p.municipio, ods: p.ods, fundo: p.fundo })
}

export function checkin(uid: ID) {
  return registrar(uid, 'checkin', {}, `checkin:${diaSP()}`)
}

/** Quiz do guia: 50 XP uma vez por edição, mais missões. */
export function concluirQuiz(uid: ID, acertos: number, total: number) {
  return mutar((b) => {
    const ciclo = b.configuracoes.cicloAtivo
    const aprovado = acertos / total >= 0.6
    const jaGanhou = b.transacoesXp.some((t) => t.usuarioId === uid && t.origem === 'quiz' && t.ciclo === ciclo)
    const premio = aprovado && !jaGanhou ? { xp: [{ xp: b.configuracoes.tabelaXp.quiz, origem: 'quiz' as const, descricao: 'Quiz do guia concluído' }] } : undefined
    M.registrarEvento(b, uid, 'quiz_concluido', { acertos, total, ciclo }, { premio })
    return { aprovado, ganhouXp: !!premio }
  })
}

export function enviarConvites(uid: ID, contatos: string[], canal: Convite['canal'], tipo: Convite['tipo']) {
  return mutar((b) => {
    const cfg = b.configuracoes
    const limpos = [...new Set(contatos.map((c) => c.trim()).filter(Boolean))]
    if (limpos.length > cfg.limiteLoteConvites) throw new ErroRegra(`Envie no máximo ${cfg.limiteLoteConvites} convites por vez.`)
    const hoje = diaSP()
    const enviadosHoje = b.convites.filter((c) => c.usuarioId === uid && diaSP(c.em) === hoje).length
    if (enviadosHoje + limpos.length > cfg.limiteConvitesDia) throw new ErroRegra(`Limite diário de ${cfg.limiteConvitesDia} convites. Restam ${Math.max(0, cfg.limiteConvitesDia - enviadosHoje)} hoje.`)
    for (const contato of limpos) {
      if (canal === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) throw new ErroRegra(`E-mail inválido: ${contato}`)
      const c: Convite = { id: novoId('cnv'), usuarioId: uid, contato, canal, tipo, status: 'enviado', em: agoraIso() }
      b.convites.push(c)
      if (canal === 'email') R.auditar(b, 'email_simulado', `Convite enviado para ${contato}`, uid)
      M.registrarEvento(b, uid, 'convite_enviado', { ref: c.id }, { chave: c.id })
    }
    return limpos.length
  })
}

/** Protótipo: simula o aceite (no app real, vem do primeiro login do colega com o código). */
export function simularAceite(conviteId: ID) {
  mutar((b) => {
    const c = b.convites.find((x) => x.id === conviteId)
    if (!c || c.status !== 'enviado') return
    c.status = 'aceito'
    M.registrarEvento(b, c.usuarioId, 'convite_aceito', { ref: c.id }, { chave: c.id, premio: { xp: [{ xp: b.configuracoes.tabelaXp.conviteAceito, origem: 'convite_aceito', descricao: `Convite aceito (${c.contato})` }] } })
    M.notificar(b, c.usuarioId, { titulo: 'Convite aceito', texto: `${c.contato} entrou na Rede.`, tipo: 'convite', link: '/convidar' })
  })
}

// ------------------------------------------------------------------ economia: loja, avatar, baús, trilha

export function comprarItem(uid: ID, itemId: ID) {
  return mutar((b) => {
    const item = b.itens.find((i) => i.id === itemId)
    if (!item) throw new ErroRegra('Item não encontrado.')
    const preco = precoItem(b, item)
    if (preco === null) throw new ErroRegra('Itens lendários não estão à venda: só podem ser conquistados.')
    const { ofertas, temporada } = ofertasLoja(b)
    if (![...ofertas, temporada].some((o) => o?.id === itemId)) throw new ErroRegra('Este item não está nas ofertas desta semana.')
    if (possuiItem(b, uid, item)) throw new ErroRegra('Você já tem este item.')
    if (R.saldoPatinhas(b, uid) < preco) throw new ErroRegra('Patinhas insuficientes.')
    M.creditarPatinhas(b, uid, -preco, 'compra', `Loja do Leão: ${item.nome}`, { referencia: `compra:${item.id}` })
    b.usuarioItens.push({ usuarioId: uid, itemId, origem: 'compra', em: agoraIso() })
    return item
  })
}

export function equipar(uid: ID, categoria: Exclude<CategoriaItem, 'adesivo'>, itemId: ID | undefined) {
  mutar((b) => {
    const u = R.usuario(b, uid)!
    if (itemId) {
      const item = b.itens.find((i) => i.id === itemId)
      if (!item || item.categoria !== categoria) throw new ErroRegra('Item inválido para esta categoria.')
      if (!possuiItem(b, uid, item)) throw new ErroRegra('Você ainda não tem este item.')
    }
    u.avatar = { ...u.avatar, [categoria]: itemId }
    M.registrarEvento(b, uid, 'item_equipado', { ref: itemId ?? `sem-${categoria}`, categoria })
  })
}

export function salvarAvatar(uid: ID, avatar: AvatarConfig) {
  mutar((b) => {
    const u = R.usuario(b, uid)!
    for (const [cat, id] of Object.entries(avatar)) {
      if (!id) continue
      const item = b.itens.find((i) => i.id === id)
      if (!item || item.categoria !== cat || !possuiItem(b, uid, item)) throw new ErroRegra('Há itens que você ainda não tem na prévia.')
    }
    u.avatar = { ...avatar }
    M.registrarEvento(b, uid, 'item_equipado', { ref: 'avatar' })
  })
}

/** Sorteia as diárias e semanais do período, se ainda não houver (só grava quando falta). */
export function prepararMissoes(uid: ID) {
  const b = getBanco()
  const dia = diaSP()
  const temDia = b.sorteios.some((s) => s.usuarioId === uid && s.tipo === 'dia' && s.periodo === dia)
  const temSemana = b.sorteios.some((s) => s.usuarioId === uid && s.tipo === 'semana' && s.periodo === segundaSP())
  if (!temDia || !temSemana) mutar((bb) => prepararSorteios(bb, uid))
}

export function abrirBau(uid: ID, tipo: 'dia' | 'semana', periodo: string) {
  return mutar((b) => M.abrirBau(b, uid, tipo, periodo))
}

export function trocarDiaria(uid: ID, dia: string, missaoId: ID) {
  return mutar((b) => M.trocarDiaria(b, uid, dia, missaoId))
}

export function resgatarDegrau(uid: ID, degrau: number, chave?: string) {
  return mutar((b) => {
    const anterior = trilhaEmProrrogacao(b, uid)
    const est = chave && anterior?.ocorrencia.chave === chave ? anterior : estadoTrilha(b, uid)
    if (!est) throw new ErroRegra('Nenhuma temporada ativa.')
    if (degrau > est.alcancado) throw new ErroRegra('Degrau ainda não alcançado.')
    let reg = b.usuarioTrilhas.find((t) => t.usuarioId === uid && t.chave === est.ocorrencia.chave)
    if (!reg) {
      reg = { usuarioId: uid, chave: est.ocorrencia.chave, resgatados: [] }
      b.usuarioTrilhas.push(reg)
    }
    if (reg.resgatados.includes(degrau)) throw new ErroRegra('Degrau já resgatado.')
    const rec = est.trilha.recompensas.find((r) => r.degrau === degrau)
    reg.resgatados.push(degrau)
    if (rec?.patinhas) M.creditarPatinhas(b, uid, rec.patinhas, 'trilha', `${est.ocorrencia.temporada.nome}: degrau ${degrau}`, { referencia: `trilha:${est.ocorrencia.chave}:${degrau}` })
    if (rec?.itemId && !b.usuarioItens.some((i) => i.usuarioId === uid && i.itemId === rec.itemId)) b.usuarioItens.push({ usuarioId: uid, itemId: rec.itemId, origem: 'trilha', em: agoraIso() })
    if (degrau === est.trilha.degraus) {
      M.publicarNoMural(b, uid, 'trilha', `concluiu a trilha da ${est.ocorrencia.temporada.nome}`, '🏁', 'epica')
      M.avaliarInsignias(b, uid)
    }
    return rec
  })
}

// ------------------------------------------------------------------ alcateias e mural

export function criarAlcateia(uid: ID, nome: string, emblema: string) {
  const limpo = nome.trim()
  if (limpo.length < 3 || limpo.length > 30) throw new ErroRegra('O nome precisa ter de 3 a 30 caracteres.')
  return mutar((b) => {
    if (M.alcateiaDo(b, uid)) throw new ErroRegra('Saia da alcateia atual antes de criar outra.')
    if (b.alcateias.some((a) => a.nome.toLowerCase() === limpo.toLowerCase())) throw new ErroRegra('Já existe uma alcateia com esse nome.')
    const a = { id: novoId('alc'), nome: limpo, emblema, criadorId: uid, metaSemanal: b.configuracoes.alcateiaConfig.metaSemanalPadrao, criadaEm: agoraIso(), oculta: false }
    b.alcateias.push(a)
    b.alcateiaMembros.push({ alcateiaId: a.id, usuarioId: uid, em: agoraIso() })
    M.registrarEvento(b, uid, 'alcateia_criada', { ref: a.id })
    M.registrarEvento(b, uid, 'alcateia_entrou', { ref: a.id }, { chave: a.id })
    return a
  })
}

export function entrarAlcateia(uid: ID, alcateiaId: ID) {
  mutar((b) => {
    if (M.alcateiaDo(b, uid)) throw new ErroRegra('Você já está em uma alcateia.')
    const a = b.alcateias.find((x) => x.id === alcateiaId && !x.oculta)
    if (!a) throw new ErroRegra('Alcateia não encontrada.')
    if (b.alcateiaMembros.filter((m) => m.alcateiaId === a.id).length >= b.configuracoes.alcateiaConfig.maxMembros)
      throw new ErroRegra(`A alcateia já tem ${b.configuracoes.alcateiaConfig.maxMembros} pessoas.`)
    b.alcateiaMembros.push({ alcateiaId: a.id, usuarioId: uid, em: agoraIso() })
    M.registrarEvento(b, uid, 'alcateia_entrou', { ref: a.id }, { chave: a.id })
  })
}

export function sairAlcateia(uid: ID) {
  mutar((b) => {
    b.alcateiaMembros = b.alcateiaMembros.filter((m) => m.usuarioId !== uid)
  })
}

export function reagir(uid: ID, postId: ID, adesivo: ID) {
  return mutar((b) => {
    const post = b.mural.find((p) => p.id === postId)
    if (!post || post.oculto) throw new ErroRegra('Publicação indisponível.')
    if (post.usuarioId === uid) throw new ErroRegra('Reaja às conquistas dos colegas.')
    const item = b.itens.find((i) => i.id === adesivo && i.categoria === 'adesivo')
    if (!item || !possuiItem(b, uid, item)) throw new ErroRegra('Adesivo indisponível.')
    b.reacoes = b.reacoes.filter((r) => !(r.postId === postId && r.usuarioId === uid))
    b.reacoes.push({ postId, usuarioId: uid, adesivo, em: agoraIso() })
    const antes = b.eventos.length
    M.registrarEvento(b, uid, 'reacao_enviada', { ref: postId }, { chave: postId })
    return b.eventos.slice(antes).filter((e) => e.tipo === 'missao_concluida').length
  })
}

// ------------------------------------------------------------------ recompensas institucionais e Voto do Leão

export function requisitoAtendido(b: Banco, uid: ID, req: { nivel?: number; tier?: number; insignia?: ID; grau?: number }) {
  const st = R.statusJogador(b, uid)
  if (req.nivel && st.atual.nivel < req.nivel) return false
  if (req.tier && st.tier.numero < req.tier) return false
  if (req.insignia && M.grauAtual(b, uid, req.insignia) < (req.grau ?? 1)) return false
  return true
}

export function resgatar(uid: ID, recompensaId: ID) {
  return mutar((b) => {
    const rc = b.recompensas.find((x) => x.id === recompensaId)
    if (!rc) throw new ErroRegra('Recompensa não encontrada.')
    if (!requisitoAtendido(b, uid, rc.requisito)) throw new ErroRegra('Você ainda não atende ao requisito.')
    if (rc.estoque !== null && rc.estoque <= 0) throw new ErroRegra('Estoque esgotado.')
    if (rc.validoAte && rc.validoAte < diaSP()) throw new ErroRegra('Recompensa fora do período de validade.')
    const edicao = b.configuracoes.cicloAtivo
    if (b.resgates.some((x) => x.usuarioId === uid && x.recompensaId === recompensaId && x.edicao === edicao && x.status !== 'recusado')) throw new ErroRegra('Limite de 1 por pessoa por edição.')
    if (rc.estoque !== null) rc.estoque -= 1
    b.resgates.push({ id: novoId('rsg'), usuarioId: uid, recompensaId, edicao, status: 'solicitado', em: agoraIso() })
    const u = R.usuario(b, uid)!
    R.auditar(b, 'resgate', `${u.nome} solicitou ${rc.nome}`, uid, rc.id)
    for (const a of b.usuarios.filter((x) => x.perfil === 'admin')) M.notificar(b, a.id, { titulo: 'Nova solicitação de recompensa', texto: `${u.nome}: ${rc.nome}`, tipo: 'recompensa', link: '/admin/gamificacao' })
  })
}

export function atualizarResgate(resgateId: ID, status: 'aprovado' | 'entregue' | 'recusado', adminId: ID) {
  mutar((b) => {
    const r = b.resgates.find((x) => x.id === resgateId)
    if (!r) return
    const rc = b.recompensas.find((x) => x.id === r.recompensaId)
    if (status === 'recusado' && rc && rc.estoque !== null && r.status !== 'recusado') rc.estoque += 1
    r.status = status
    R.auditar(b, 'resgate_status', `Resgate ${r.id}: ${status}`, adminId, r.id)
    M.notificar(b, r.usuarioId, { titulo: `Recompensa: ${status}`, texto: rc?.nome ?? '', tipo: 'recompensa', link: '/recompensas' })
  })
}

export function votosDisponiveis(b: Banco, uid: ID) {
  const cfg = b.configuracoes.votoLeao
  const total = R.statusJogador(b, uid).tier.numero * cfg.votosPorTier
  const usados = b.votos.filter((v) => v.usuarioId === uid && v.edicao === b.configuracoes.cicloAtivo).length
  return { total, usados, restantes: Math.max(0, total - usados) }
}

export function votar(uid: ID, projetoId: ID) {
  mutar((b) => {
    const cfg = b.configuracoes.votoLeao
    if (!cfg.ativo) throw new ErroRegra('A votação não está aberta.')
    if (!cfg.projetos.includes(projetoId)) throw new ErroRegra('Projeto fora da votação.')
    if (votosDisponiveis(b, uid).restantes <= 0) throw new ErroRegra('Você já usou todos os seus votos. Ganhe mais subindo de tier.')
    b.votos.push({ usuarioId: uid, projetoId, edicao: b.configuracoes.cicloAtivo, em: agoraIso() })
  })
}

// ------------------------------------------------------------------ perfil e LGPD

type CamposPerfil = Pick<Usuario, 'nome' | 'municipio' | 'cpf' | 'endereco' | 'telefone' | 'anonimo' | 'notificacoes' | 'unidadeId' | 'genero' | 'tituloEscolhido' | 'vitrine' | 'ocultarMural' | 'sons' | 'usarFoto'>

export function vagasVitrine(b: Banco, uid: ID) {
  const tier = R.statusJogador(b, uid).tier.numero
  return 3 + (tier >= 4 ? 1 : 0) + (tier >= 5 ? 1 : 0)
}

export function atualizarPerfil(uid: ID, dados: Partial<CamposPerfil>) {
  mutar((b) => {
    const u = R.usuario(b, uid)
    if (!u) return
    if (dados.vitrine) dados.vitrine = dados.vitrine.slice(0, vagasVitrine(b, uid))
    Object.assign(u, dados)
    if (u.nome && u.municipio && u.cpf && u.endereco && u.telefone)
      M.registrarEvento(b, uid, 'perfil_completo', {}, { chave: 'perfil', premio: { xp: [{ xp: b.configuracoes.tabelaXp.perfilCompleto, origem: 'perfil_completo', descricao: 'Perfil completo' }] } })
  })
}

export function registrarConsentimento(uid: ID) {
  mutar((b) => {
    const u = R.usuario(b, uid)
    if (u) u.consentimentoLgpd = agoraIso()
    R.auditar(b, 'consentimento_lgpd', 'Termo de consentimento aceito', uid, uid)
  })
}

export function exportarMeusDados(uid: ID) {
  const b = getBanco()
  return {
    exportadoEm: agoraIso(),
    usuario: R.usuario(b, uid),
    familiares: b.familiares.filter((f) => f.usuarioId === uid),
    reportes: b.reportes.filter((r) => r.usuarioId === uid),
    comprovantes: b.comprovantes.filter((c) => b.reportes.some((r) => r.usuarioId === uid && r.comprovanteIds.includes(c.id))).map(({ dataUrl: _omitido, ...c }) => c),
    cartas: b.cartas.filter((c) => c.usuarioId === uid),
    eventos: b.eventos.filter((e) => e.usuarioId === uid),
    transacoesXp: b.transacoesXp.filter((t) => t.usuarioId === uid),
    transacoesPatinhas: b.transacoesPatinhas.filter((t) => t.usuarioId === uid),
    insignias: b.usuarioInsignias.filter((i) => i.usuarioId === uid),
    itens: b.usuarioItens.filter((i) => i.usuarioId === uid),
    pins: b.usuarioPins.filter((p) => p.usuarioId === uid),
    convites: b.convites.filter((c) => c.usuarioId === uid),
    resgates: b.resgates.filter((r) => r.usuarioId === uid),
    votos: b.votos.filter((v) => v.usuarioId === uid),
  }
}

export function excluirConta(uid: ID) {
  mutar((b) => {
    const u = R.usuario(b, uid)
    if (!u) return
    const comprovantesDoUsuario = new Set(b.reportes.filter((r) => r.usuarioId === uid).flatMap((r) => r.comprovanteIds))
    b.comprovantes = b.comprovantes.filter((c) => !comprovantesDoUsuario.has(c.id))
    b.familiares = b.familiares.filter((f) => f.usuarioId !== uid)
    b.reportes = b.reportes.filter((r) => r.usuarioId !== uid || r.status === 'validado')
    b.cartas = b.cartas.filter((c) => c.usuarioId !== uid)
    b.notificacoes = b.notificacoes.filter((n) => n.usuarioId !== uid)
    b.mural = b.mural.filter((p) => p.usuarioId !== uid)
    b.alcateiaMembros = b.alcateiaMembros.filter((m) => m.usuarioId !== uid)
    b.linksConvidado = b.linksConvidado.filter((l) => l.usuarioId !== uid)
    Object.assign(u, { nome: 'Conta excluída', email: `excluido-${uid}@anonimo`, cpf: undefined, endereco: undefined, telefone: undefined, anonimo: true, ocultarMural: true })
    R.auditar(b, 'exclusao_conta', `Conta ${uid} excluída a pedido do titular`, uid, uid)
  })
}

export function marcarLidas(uid: ID, ids?: ID[]) {
  mutar((b) => {
    for (const n of b.notificacoes) if (n.usuarioId === uid && (!ids || ids.includes(n.id))) n.lida = true
  })
}

// ------------------------------------------------------------------ carta de destinação

export function registrarCarta(uid: ID, entidadeId: ID, valor: number, dataDeposito: string, variante: 'pf' | 'pj' = 'pf', familiarId?: ID) {
  return mutar((b) => {
    const e = b.entidades.find((x) => x.id === entidadeId)
    if (!e) throw new ErroRegra('Entidade não encontrada.')
    const ano = new Date().getFullYear()
    const seqAno = b.cartas.filter((c) => c.emitidaEm.startsWith(String(ano))).length + 1
    const carta = {
      id: novoId('car'),
      codigo: `RS-${ano}-${String(seqAno).padStart(5, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      variante,
      usuarioId: uid,
      familiarId,
      entidadeId,
      fundoId: e.fundoId,
      valor,
      dataDeposito,
      emitidaEm: agoraIso(),
    }
    b.cartas.push(carta)
    R.auditar(b, 'emitir_carta', `Carta ${carta.codigo} (${variante.toUpperCase()}) emitida para ${e.razaoSocial}`, uid, carta.id)
    if (variante === 'pf') M.registrarEvento(b, uid, 'carta_gerada', { ref: carta.id, municipio: e.municipio }, { chave: carta.id })
    return carta
  })
}

export function captadoPelaEntidade(b: Banco, entidadeId: ID) {
  return R.reportesValidados(b, (r) => r.entidadeId === entidadeId).reduce((s, r) => s + r.valor, 0)
}

// ------------------------------------------------------------------ administração

export function atualizarConfiguracoes(fn: (c: Configuracoes, b: Banco) => void, adminId: ID, descricao: string) {
  mutar((b) => {
    fn(b.configuracoes, b)
    R.auditar(b, 'configuracao', descricao, adminId)
  })
}

type Colecao = 'fundos' | 'entidades' | 'projetos' | 'unidades' | 'missoes' | 'recompensas' | 'insignias' | 'niveis' | 'tiers' | 'temporadas' | 'ciclos' | 'pins' | 'itens' | 'alcateias' | 'mural'

export function salvarItem<K extends Colecao>(colecao: K, item: Banco[K][number], chave: string, adminId: ID) {
  mutar((b) => {
    const lista = b[colecao] as unknown as Record<string, unknown>[]
    const valor = (item as unknown as Record<string, unknown>)[chave]
    const i = lista.findIndex((x) => x[chave] === valor)
    if (i >= 0) lista[i] = item as unknown as Record<string, unknown>
    else lista.push(item as unknown as Record<string, unknown>)
    R.auditar(b, 'cadastro', `${colecao}: ${i >= 0 ? 'alterado' : 'incluído'} ${String(valor)}`, adminId)
  })
}

export function removerItem<K extends Colecao>(colecao: K, chave: string, valor: unknown, adminId: ID) {
  mutar((b) => {
    ;(b[colecao] as unknown) = (b[colecao] as unknown as Record<string, unknown>[]).filter((x) => x[chave] !== valor)
    R.auditar(b, 'cadastro', `${colecao}: removido ${String(valor)}`, adminId)
  })
}

export function importarProjetos(projetos: Projeto[], adminId: ID) {
  return mutar((b) => {
    let incluidos = 0
    let atualizados = 0
    for (const p of projetos) {
      const existente = b.projetos.find((x) => x.idExterno && x.idExterno === p.idExterno)
      if (existente) {
        Object.assign(existente, { ...p, id: existente.id, ods: existente.ods.length ? existente.ods : p.ods, origem: existente.origem })
        atualizados++
      } else {
        b.projetos.push(p)
        incluidos++
      }
    }
    R.auditar(b, 'importacao', `Planilha de projetos: ${incluidos} incluídos, ${atualizados} atualizados`, adminId)
    return { incluidos, atualizados }
  })
}

export function definirPerfil(uid: ID, perfil: Perfil, adminId: ID) {
  mutar((b) => {
    const u = R.usuario(b, uid)
    if (!u) return
    u.perfil = perfil
    R.auditar(b, 'perfil', `${u.nome} agora é ${perfil}`, adminId, uid)
    M.avaliarInsignias(b, uid)
  })
}

export function ajustarXp(uid: ID, xp: number, motivo: string, adminId: ID) {
  mutar((b) => M.creditarXp(b, uid, xp, 'ajuste', `Ajuste manual: ${motivo}`, { por: adminId }))
}

export function ajustarPatinhas(uid: ID, patinhas: number, motivo: string, adminId: ID) {
  mutar((b) => M.creditarPatinhas(b, uid, patinhas, 'ajuste', `Ajuste manual: ${motivo}`, { por: adminId }))
}

export function definirGenero(uid: ID, genero: Genero) {
  atualizarPerfil(uid, { genero })
}

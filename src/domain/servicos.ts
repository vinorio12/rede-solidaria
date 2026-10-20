import { agoraIso, getBanco, mutar, novoId } from '@/data/db'
import type {
  Banco,
  Comprovante,
  Configuracoes,
  Convite,
  Familiar,
  ID,
  Modalidade,
  Perfil,
  Projeto,
  Reporte,
  TipoFundo,
  Esfera,
  Usuario,
} from './types'
import * as R from './regras'

// Camada de serviços: é o "contrato de API" do app. Hoje grava no repositório
// local; na integração com o back-end, cada função vira uma chamada REST.

export class ErroRegra extends Error {}

export const DOMINIO_WEG = '@weg.net'
export const TAMANHO_MAX_COMPROVANTE = 10 * 1024 * 1024
const TAMANHO_MAX_GUARDADO = 1.5 * 1024 * 1024 // protótipo: arquivos maiores guardam só os metadados

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

export async function prepararComprovantes(arquivos: File[]): Promise<Comprovante[]> {
  const aceitos = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic']
  const out: Comprovante[] = []
  for (const a of arquivos) {
    if (a.size > TAMANHO_MAX_COMPROVANTE) throw new ErroRegra(`O arquivo ${a.name} passa de 10 MB.`)
    if (a.type && !aceitos.includes(a.type)) throw new ErroRegra(`O arquivo ${a.name} precisa ser PDF ou imagem.`)
    out.push({
      id: novoId('cmp'),
      nome: a.name,
      tipo: a.type || 'application/octet-stream',
      tamanho: a.size,
      hash: await hashArquivo(a),
      dataUrl: a.size <= TAMANHO_MAX_GUARDADO ? await lerDataUrl(a) : undefined,
    })
  }
  return out
}

export interface DadosReporte {
  familiarId?: ID
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

/** Monta um reporte sem gravar, para a prévia de XP. */
export function rascunhoReporte(uid: ID, d: DadosReporte): Reporte {
  const b = getBanco()
  return { id: 'rascunho', usuarioId: uid, ciclo: b.configuracoes.cicloAtivo, ...d, comprovanteIds: [], status: 'enviado', historico: [], criadoEm: agoraIso() }
}

export function enviarReporte(uid: ID, d: DadosReporte, comprovantes: Comprovante[]) {
  if (!comprovantes.length) throw new ErroRegra('Envie ao menos um comprovante.')
  if (!(d.valor > 0)) throw new ErroRegra('Informe um valor maior que zero.')
  return mutar((b) => {
    const u = R.usuario(b, uid)
    if (!u) throw new ErroRegra('Usuário não encontrado.')
    if (u.perfil === 'convidado' && !u.padrinhoEmail) throw new ErroRegra('Vincule um padrinho com e-mail @weg.net antes de reportar.')
    if (u.perfil === 'convidado' && d.familiarId) throw new ErroRegra('Convidados reportam apenas a própria destinação.')
    const convidado = u.perfil === 'convidado'
    const status = convidado ? 'aguardando_padrinho' : 'enviado'
    const r: Reporte = {
      ...rascunhoReporte(uid, d),
      id: novoId('rep'),
      comprovanteIds: comprovantes.map((c) => c.id),
      status,
      historico: [{ status, em: agoraIso(), por: uid }],
    }
    r.duplicidadeSuspeita = R.detectarDuplicidade(b, r, comprovantes.map((c) => c.hash))
    b.comprovantes.push(...comprovantes)
    b.reportes.push(r)
    R.auditar(b, 'enviar_reporte', `Reporte ${r.id} enviado${r.duplicidadeSuspeita ? ` (possível duplicidade: ${r.duplicidadeSuspeita})` : ''}`, uid, r.id)

    if (convidado) {
      const padrinho = b.usuarios.find((x) => x.email.toLowerCase() === u.padrinhoEmail!.toLowerCase())
      if (padrinho)
        R.notificar(b, padrinho.id, { titulo: 'Aprovação pendente', texto: `${u.nome} enviou um reporte e aguarda sua aprovação.`, tipo: 'padrinho', link: '/padrinho' })
      R.auditar(b, 'email_simulado', `E-mail para ${u.padrinhoEmail}: reporte de ${u.nome} aguardando aprovação`, uid)
    } else {
      for (const a of b.usuarios.filter((x) => x.perfil === 'admin'))
        R.notificar(b, a.id, { titulo: 'Novo reporte na fila', texto: `${u.nome} enviou um reporte para validação.`, tipo: 'reporte', link: '/admin/validacao' })
    }
    return r
  })
}

export function reenviarReporte(reporteId: ID, d: Partial<DadosReporte>, novos: Comprovante[]) {
  return mutar((b) => {
    const r = b.reportes.find((x) => x.id === reporteId)
    if (!r || r.status !== 'devolvido') throw new ErroRegra('Só é possível ajustar reportes devolvidos.')
    Object.assign(r, d)
    if (novos.length) {
      b.comprovantes.push(...novos)
      r.comprovanteIds = [...r.comprovanteIds, ...novos.map((c) => c.id)]
    }
    const u = R.usuario(b, r.usuarioId)
    r.status = u?.perfil === 'convidado' ? 'aguardando_padrinho' : 'enviado'
    r.motivoDevolucao = undefined
    r.historico.push({ status: r.status, em: agoraIso(), por: r.usuarioId, nota: 'Reenviado após ajuste' })
    R.auditar(b, 'reenviar_reporte', `Reporte ${r.id} reenviado após ajuste`, r.usuarioId, r.id)
  })
}

// ---------------------------------------------------------------- família

export function salvarFamiliar(f: Omit<Familiar, 'id'> & { id?: ID }) {
  return mutar((b) => {
    if (f.id) {
      const x = b.familiares.find((y) => y.id === f.id)
      if (x) Object.assign(x, f)
      return x!
    }
    const novo = { ...f, id: novoId('fam') }
    b.familiares.push(novo)
    return novo
  })
}

export function removerFamiliar(id: ID) {
  mutar((b) => {
    if (b.reportes.some((r) => r.familiarId === id)) throw new ErroRegra('Este familiar já tem reportes e não pode ser removido.')
    b.familiares = b.familiares.filter((f) => f.id !== id)
  })
}

// ---------------------------------------------------------------- convidado e padrinho

export function cadastrarConvidado(d: { nome: string; email: string; padrinhoEmail: string; municipio: string; codigo?: string }) {
  if (!emailWegValido(d.padrinhoEmail)) throw new ErroRegra('O e-mail do padrinho precisa terminar em @weg.net.')
  if (emailWegValido(d.email)) throw new ErroRegra('Colaboradores entram com o login WEG. Use o seu e-mail pessoal para o cadastro de convidado.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new ErroRegra('Informe um e-mail pessoal válido.')
  return mutar((b) => {
    if (b.usuarios.some((u) => u.email.toLowerCase() === d.email.toLowerCase())) throw new ErroRegra('Este e-mail já está cadastrado.')
    const quemConvidou = d.codigo ? b.usuarios.find((u) => u.codigoConvite === d.codigo!.trim().toUpperCase()) : undefined
    const u: Usuario = {
      id: novoId('u'),
      nome: d.nome.trim(),
      email: d.email.trim(),
      perfil: 'convidado',
      municipio: d.municipio,
      uf: 'SC',
      anonimo: false,
      consentimentoLgpd: agoraIso(),
      padrinhoEmail: d.padrinhoEmail.trim().toLowerCase(),
      vinculoStatus: 'pendente',
      codigoConvite: `RS${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      convidadoPor: quemConvidou?.id,
      ciclosAnteriores: [],
      notificacoes: { email: true, push: true, prazos: true },
      criadoEm: agoraIso(),
    }
    b.usuarios.push(u)
    const padrinho = b.usuarios.find((x) => x.email.toLowerCase() === u.padrinhoEmail)
    if (padrinho) R.notificar(b, padrinho.id, { titulo: 'Novo vínculo de convidado', texto: `${u.nome} indicou você como padrinho na Rede Solidária.`, tipo: 'padrinho', link: '/padrinho' })
    R.auditar(b, 'email_simulado', `E-mail para ${u.padrinhoEmail}: pedido de vínculo de ${u.nome}`)
    if (quemConvidou) aceitarConviteInterno(b, quemConvidou.id, u)
    return u
  })
}

function aceitarConviteInterno(b: Banco, anfitriaoId: ID, convidado: Usuario) {
  let c = b.convites.find((x) => x.usuarioId === anfitriaoId && x.status === 'enviado' && x.contato.toLowerCase() === convidado.email.toLowerCase())
  if (!c) {
    c = { id: novoId('cnv'), usuarioId: anfitriaoId, contato: convidado.email, canal: 'link', tipo: 'familiar', status: 'enviado', em: agoraIso() }
    b.convites.push(c)
  }
  c.status = 'aceito'
  c.convidadoId = convidado.id
  R.creditarXp(b, anfitriaoId, b.configuracoes.tabelaXp.conviteAceito, 'convite_aceito', `Convite aceito (${convidado.nome})`, { referencia: c.id })
  R.notificar(b, anfitriaoId, { titulo: 'Convite aceito', texto: `${convidado.nome} aceitou seu convite.`, tipo: 'convite', link: '/convidar' })
  R.registrarEvento(b, anfitriaoId, 'convites_aceitos', c.id)
  R.verificarInsignias(b, anfitriaoId)
}

export function decidirVinculo(padrinhoId: ID, convidadoId: ID, aprovar: boolean) {
  mutar((b) => {
    const p = R.usuario(b, padrinhoId)
    const c = R.usuario(b, convidadoId)
    if (!p || !c || c.padrinhoEmail?.toLowerCase() !== p.email.toLowerCase()) throw new ErroRegra('Vínculo não encontrado.')
    c.vinculoStatus = aprovar ? 'aprovado' : 'recusado'
    R.auditar(b, aprovar ? 'aprovar_vinculo' : 'recusar_vinculo', `${p.nome} ${aprovar ? 'aprovou' : 'recusou'} o vínculo de ${c.nome}`, padrinhoId, c.id)
    R.notificar(b, c.id, {
      titulo: aprovar ? 'Vínculo aprovado' : 'Vínculo recusado',
      texto: aprovar ? `${p.nome} confirmou ser seu padrinho na Rede Solidária.` : `${p.nome} não confirmou o vínculo. Você pode indicar outro padrinho no perfil.`,
      tipo: 'padrinho',
    })
    if (!aprovar) {
      for (const r of b.reportes.filter((x) => x.usuarioId === c.id && x.status === 'aguardando_padrinho')) {
        r.status = 'recusado_padrinho'
        r.historico.push({ status: 'recusado_padrinho', em: agoraIso(), por: padrinhoId })
      }
    }
  })
}

export function decidirReportePadrinho(padrinhoId: ID, reporteId: ID, aprovar: boolean, nota?: string) {
  mutar((b) => {
    const r = b.reportes.find((x) => x.id === reporteId)
    const c = r && R.usuario(b, r.usuarioId)
    const p = R.usuario(b, padrinhoId)
    if (!r || !c || !p || c.padrinhoEmail?.toLowerCase() !== p.email.toLowerCase()) throw new ErroRegra('Reporte não encontrado.')
    if (aprovar) {
      if (c.vinculoStatus !== 'aprovado') c.vinculoStatus = 'aprovado'
      r.status = 'enviado'
      r.historico.push({ status: 'enviado', em: agoraIso(), por: padrinhoId, nota: 'Aprovado pelo padrinho' })
      for (const a of b.usuarios.filter((x) => x.perfil === 'admin'))
        R.notificar(b, a.id, { titulo: 'Novo reporte na fila', texto: `Reporte de ${c.nome} aprovado pelo padrinho.`, tipo: 'reporte', link: '/admin/validacao' })
    } else {
      r.status = 'recusado_padrinho'
      r.historico.push({ status: 'recusado_padrinho', em: agoraIso(), por: padrinhoId, nota })
    }
    R.auditar(b, aprovar ? 'padrinho_aprova_reporte' : 'padrinho_recusa_reporte', `${p.nome}: reporte ${r.id} de ${c.nome}`, padrinhoId, r.id)
    R.notificar(b, c.id, {
      titulo: aprovar ? 'Seu padrinho aprovou o reporte' : 'Reporte não aprovado pelo padrinho',
      texto: aprovar ? 'Agora ele segue para a validação da Seção Desenvolvimento Social.' : nota || 'Fale com seu padrinho para entender o motivo.',
      tipo: 'reporte',
      link: `/reportes/${r.id}`,
    })
  })
}

export function trocarPadrinho(uid: ID, email: string) {
  if (!emailWegValido(email)) throw new ErroRegra('O e-mail do padrinho precisa terminar em @weg.net.')
  mutar((b) => {
    const u = R.usuario(b, uid)!
    u.padrinhoEmail = email.trim().toLowerCase()
    u.vinculoStatus = 'pendente'
    const p = b.usuarios.find((x) => x.email.toLowerCase() === u.padrinhoEmail)
    if (p) R.notificar(b, p.id, { titulo: 'Novo vínculo de convidado', texto: `${u.nome} indicou você como padrinho.`, tipo: 'padrinho', link: '/padrinho' })
  })
}

// ---------------------------------------------------------------- validação (Seção DS)

export function iniciarAnalise(reporteId: ID, adminId: ID) {
  mutar((b) => {
    const r = b.reportes.find((x) => x.id === reporteId)
    if (!r || r.status !== 'enviado') return
    r.status = 'em_validacao'
    r.historico.push({ status: 'em_validacao', em: agoraIso(), por: adminId })
    R.notificar(b, r.usuarioId, { titulo: 'Reporte em validação', texto: 'A Seção DS começou a analisar seu comprovante.', tipo: 'reporte', link: `/reportes/${r.id}` })
  })
}

export const validar = (reporteId: ID, adminId: ID) => mutar((b) => R.validarReporte(b, reporteId, adminId))
export const devolver = (reporteId: ID, motivo: string, adminId: ID) => mutar((b) => R.devolverReporte(b, reporteId, motivo, adminId))
export const estornar = (reporteId: ID, motivo: string, adminId: ID) => mutar((b) => R.estornarReporte(b, reporteId, motivo, adminId))

// ---------------------------------------------------------------- engajamento

export function registrarVisita(uid: ID, tipo: 'projeto' | 'entidade' | 'historia', ref: ID) {
  return mutar((b) => {
    const u = R.usuario(b, uid)
    if (!u) return []
    b.visitas.push({ usuarioId: uid, tipo, ref, em: agoraIso() })
    const concluidas = []
    if (tipo === 'historia') concluidas.push(...R.registrarEvento(b, uid, 'ler_historia'))
    if (tipo === 'projeto') {
      concluidas.push(...R.registrarEvento(b, uid, 'visitar_projeto'))
      const p = b.projetos.find((x) => x.id === ref)
      if (p && p.municipio === u.municipio) concluidas.push(...R.registrarEvento(b, uid, 'visitar_projetos_cidade', ref))
      R.verificarInsignias(b, uid)
    }
    if (tipo === 'entidade') {
      const e = b.entidades.find((x) => x.id === ref)
      if (e && e.municipio === u.municipio) concluidas.push(...R.registrarEvento(b, uid, 'visitar_entidade_cidade', ref))
    }
    return concluidas
  })
}

export const checkin = (uid: ID) => mutar((b) => R.registrarEvento(b, uid, 'checkin'))
export const responderPerguntaDia = (uid: ID) => mutar((b) => R.registrarEvento(b, uid, 'pergunta_dia'))
export const compartilharConquista = (uid: ID) => mutar((b) => R.registrarEvento(b, uid, 'compartilhar'))

/** Quiz do guia: 50 XP uma vez por ciclo, mais a missão semanal. */
export function concluirQuiz(uid: ID, acertos: number, total: number) {
  return mutar((b) => {
    const ciclo = b.configuracoes.cicloAtivo
    const jaGanhou = b.transacoesXp.some((t) => t.usuarioId === uid && t.origem === 'quiz' && t.ciclo === ciclo)
    const aprovado = acertos / total >= 0.6
    if (aprovado && !jaGanhou) R.creditarXp(b, uid, b.configuracoes.tabelaXp.quiz, 'quiz', 'Quiz do guia concluído')
    const missoes = aprovado ? R.registrarEvento(b, uid, 'quiz') : []
    R.verificarInsignias(b, uid)
    return { aprovado, ganhouXp: aprovado && !jaGanhou, missoes }
  })
}

export function enviarConvites(uid: ID, contatos: string[], canal: Convite['canal'], tipo: Convite['tipo']) {
  return mutar((b) => {
    const cfg = b.configuracoes
    const limpos = [...new Set(contatos.map((c) => c.trim()).filter(Boolean))]
    if (limpos.length > cfg.limiteLoteConvites) throw new ErroRegra(`Envie no máximo ${cfg.limiteLoteConvites} convites por vez.`)
    const hoje = new Date().toDateString()
    const enviadosHoje = b.convites.filter((c) => c.usuarioId === uid && new Date(c.em).toDateString() === hoje).length
    if (enviadosHoje + limpos.length > cfg.limiteConvitesDia)
      throw new ErroRegra(`Limite diário de ${cfg.limiteConvitesDia} convites. Restam ${Math.max(0, cfg.limiteConvitesDia - enviadosHoje)} hoje.`)
    for (const contato of limpos) {
      if (canal === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) throw new ErroRegra(`E-mail inválido: ${contato}`)
      b.convites.push({ id: novoId('cnv'), usuarioId: uid, contato, canal, tipo, status: 'enviado', em: agoraIso() })
      if (canal === 'email') R.auditar(b, 'email_simulado', `Convite enviado para ${contato}`, uid)
    }
    return limpos.length
  })
}

/** Protótipo: simula o aceite de um convite de colega (no app real, o aceite vem do primeiro login com o código). */
export function simularAceite(conviteId: ID) {
  mutar((b) => {
    const c = b.convites.find((x) => x.id === conviteId)
    if (!c || c.status !== 'enviado') return
    c.status = 'aceito'
    R.creditarXp(b, c.usuarioId, b.configuracoes.tabelaXp.conviteAceito, 'convite_aceito', `Convite aceito (${c.contato})`, { referencia: c.id })
    R.registrarEvento(b, c.usuarioId, 'convites_aceitos', c.id)
    R.verificarInsignias(b, c.usuarioId)
  })
}

export function resgatar(uid: ID, recompensaId: ID) {
  return mutar((b) => {
    const rc = b.recompensas.find((x) => x.id === recompensaId)
    if (!rc) throw new ErroRegra('Recompensa não encontrada.')
    const nivel = R.nivelDe(R.xpTotal(b, uid), b.niveis).atual.nivel
    if (nivel < rc.nivelMinimo) throw new ErroRegra(`Disponível a partir do nível ${rc.nivelMinimo}.`)
    if (rc.insigniaRequerida && !b.usuarioInsignias.some((i) => i.usuarioId === uid && i.insigniaId === rc.insigniaRequerida))
      throw new ErroRegra('Você ainda não tem a insígnia exigida.')
    if (rc.estoque !== null && rc.estoque <= 0) throw new ErroRegra('Estoque esgotado.')
    if (rc.validoAte && rc.validoAte < new Date().toISOString().slice(0, 10)) throw new ErroRegra('Recompensa fora do período de validade.')
    if (b.resgates.some((x) => x.usuarioId === uid && x.recompensaId === recompensaId && x.status !== 'recusado')) throw new ErroRegra('Você já resgatou este item.')
    const visual = rc.tipo === 'moldura' || rc.tipo === 'tema' || rc.tipo === 'insignia'
    if (rc.estoque !== null) rc.estoque -= 1
    b.resgates.push({ id: novoId('rsg'), usuarioId: uid, recompensaId, status: visual ? 'entregue' : 'solicitado', em: agoraIso() })
    const u = R.usuario(b, uid)!
    if (rc.tipo === 'moldura') u.molduraAtiva = rc.id
    if (rc.tipo === 'tema') u.temaAtivo = rc.id
    R.auditar(b, 'resgate', `${u.nome} resgatou ${rc.nome}`, uid, rc.id)
    if (!visual)
      for (const a of b.usuarios.filter((x) => x.perfil === 'admin'))
        R.notificar(b, a.id, { titulo: 'Nova solicitação de resgate', texto: `${u.nome}: ${rc.nome}`, tipo: 'recompensa', link: '/admin/gamificacao' })
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
    R.notificar(b, r.usuarioId, { titulo: `Resgate ${status}`, texto: rc?.nome ?? '', tipo: 'recompensa', link: '/recompensas' })
  })
}

// ---------------------------------------------------------------- perfil e LGPD

export function atualizarPerfil(uid: ID, dados: Partial<Pick<Usuario, 'nome' | 'municipio' | 'cpf' | 'endereco' | 'telefone' | 'anonimo' | 'notificacoes' | 'unidadeId' | 'avatar' | 'molduraAtiva' | 'temaAtivo'>>) {
  mutar((b) => {
    const u = R.usuario(b, uid)
    if (!u) return
    Object.assign(u, dados)
    const completo = !!(u.nome && u.municipio && u.cpf && u.endereco && u.telefone)
    if (completo && !b.transacoesXp.some((t) => t.usuarioId === uid && t.origem === 'perfil_completo'))
      R.creditarXp(b, uid, b.configuracoes.tabelaXp.perfilCompleto, 'perfil_completo', 'Perfil completo')
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
  const u = R.usuario(b, uid)
  return {
    exportadoEm: agoraIso(),
    usuario: u,
    familiares: b.familiares.filter((f) => f.usuarioId === uid),
    reportes: b.reportes.filter((r) => r.usuarioId === uid),
    comprovantes: b.comprovantes
      .filter((c) => b.reportes.some((r) => r.usuarioId === uid && r.comprovanteIds.includes(c.id)))
      .map(({ dataUrl: _omitido, ...c }) => c),
    cartas: b.cartas.filter((c) => c.usuarioId === uid),
    transacoesXp: b.transacoesXp.filter((t) => t.usuarioId === uid),
    insignias: b.usuarioInsignias.filter((i) => i.usuarioId === uid),
    pins: b.usuarioPins.filter((p) => p.usuarioId === uid),
    convites: b.convites.filter((c) => c.usuarioId === uid),
    resgates: b.resgates.filter((r) => r.usuarioId === uid),
  }
}

/** Exclusão de conta: remove dados pessoais e mantém reportes validados anonimizados para o total da meta. */
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
    Object.assign(u, {
      nome: 'Conta excluída',
      email: `excluido-${uid}@anonimo`,
      cpf: undefined,
      endereco: undefined,
      telefone: undefined,
      anonimo: true,
      padrinhoEmail: undefined,
    })
    R.auditar(b, 'exclusao_conta', `Conta ${uid} excluída a pedido do titular`, uid, uid)
  })
}

export function marcarLidas(uid: ID, ids?: ID[]) {
  mutar((b) => {
    for (const n of b.notificacoes) if (n.usuarioId === uid && (!ids || ids.includes(n.id))) n.lida = true
  })
}

// ---------------------------------------------------------------- carta de destinação

export function registrarCarta(uid: ID, entidadeId: ID, valor: number, dataDeposito: string) {
  return mutar((b) => {
    const e = b.entidades.find((x) => x.id === entidadeId)
    if (!e) throw new ErroRegra('Entidade não encontrada.')
    const seqAno = b.cartas.filter((c) => c.emitidaEm.startsWith(String(new Date().getFullYear()))).length + 1
    const carta = {
      id: novoId('car'),
      codigo: `RS-${new Date().getFullYear()}-${String(seqAno).padStart(5, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      usuarioId: uid,
      entidadeId,
      fundoId: e.fundoId,
      valor,
      dataDeposito,
      emitidaEm: agoraIso(),
    }
    b.cartas.push(carta)
    R.auditar(b, 'emitir_carta', `Carta ${carta.codigo} emitida para ${e.razaoSocial}`, uid, carta.id)
    return carta
  })
}

/** Valor já captado pelo app para a entidade (doações validadas que indicaram a entidade). */
export function captadoPelaEntidade(b: Banco, entidadeId: ID) {
  return R.reportesValidados(b, (r) => r.entidadeId === entidadeId).reduce((s, r) => s + r.valor, 0)
}

// ---------------------------------------------------------------- administração

export function atualizarConfiguracoes(fn: (c: Configuracoes, b: Banco) => void, adminId: ID, descricao: string) {
  mutar((b) => {
    fn(b.configuracoes, b)
    R.auditar(b, 'configuracao', descricao, adminId)
  })
}

type Colecao = 'fundos' | 'entidades' | 'projetos' | 'unidades' | 'missoes' | 'recompensas' | 'insignias' | 'niveis' | 'temporadas' | 'ciclos' | 'pins'

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
    R.verificarInsignias(b, uid)
  })
}

export function ajustarXp(uid: ID, xp: number, motivo: string, adminId: ID) {
  mutar((b) => R.creditarXp(b, uid, xp, 'ajuste', `Ajuste manual: ${motivo}`, { por: adminId }))
}

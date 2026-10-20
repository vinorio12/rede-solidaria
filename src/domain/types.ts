// Modelo de dados (seção 10 da especificação v1 e seção 9 do prompt de evolução v2).
// Cada tabela vira uma coleção no repositório local (src/data/db.ts), pronta para
// ser trocada por uma API REST.

export type ID = string
/** O app é exclusivo para colaboradores WEG: convidados não têm perfil nem login (v2). */
export type Perfil = 'colaborador' | 'embaixador' | 'admin'
export type Genero = 'm' | 'f' | 'n'
export type Flexao = { m: string; f: string; n: string }
export type TipoFundo = 'FIA' | 'IDOSO'
export type Esfera = 'municipal' | 'estadual' | 'nacional'
export type Modalidade = 'declaracao' | 'doacao_direta'
export type Raridade = 'comum' | 'incomum' | 'rara' | 'epica' | 'lendaria'
export type StatusReporte =
  | 'aguardando_colaborador' // reporte de convidado esperando o colaborador confirmar
  | 'enviado'
  | 'em_validacao'
  | 'validado'
  | 'devolvido'
  | 'recusado_colaborador'
  | 'estornado'

export interface Unidade {
  id: ID
  nome: string
  municipio: string
  uf: string
  colaboradores: number // usado no ranking proporcional
}

/** Peças do avatar equipadas (ids do catálogo de itens). */
export interface AvatarConfig {
  juba?: ID
  cabeca?: ID
  rosto?: ID
  pescoco?: ID
  pata?: ID
  fundo?: ID
  moldura?: ID
  banner?: ID
  tema?: ID
  efeito?: ID
  estilo_ranking?: ID
}

export interface Usuario {
  id: ID
  nome: string
  email: string
  perfil: Perfil
  genero: Genero
  unidadeId?: ID
  municipio: string
  uf: string
  cpf?: string // exibido apenas na carta de destinação
  endereco?: string
  telefone?: string
  anonimo: boolean // oculto do ranking
  ocultarMural: boolean
  sons: boolean // desligado por padrão
  usarFoto: boolean // foto virá do SSO; até lá, o leãozinho
  consentimentoLgpd?: string
  codigoConvite: string
  convidadoPor?: ID
  ciclosAnteriores: number[] // participação antes do app (Pioneiro)
  notificacoes: { email: boolean; push: boolean; prazos: boolean }
  avatar: AvatarConfig
  tituloEscolhido?: string // 'nivel' ou id de insígnia com título
  vitrine: ID[] // insígnias favoritas
  criadoEm: string
}

export interface Familiar {
  id: ID
  usuarioId: ID
  nome: string
  parentesco: 'conjuge' | 'filho' | 'pai_mae' | 'outro'
  municipio: string
}

export interface Ciclo {
  ano: number // edição do programa (ano do evento e do pin)
  rotulo: string
  inicio: string
  meta: number
  prazoDoacaoDireta: string
  prazoDeclaracao: string
  ativo: boolean
}

export interface DegrauRecompensa {
  degrau: number
  patinhas?: number
  itemId?: ID
}

export interface Temporada {
  id: ID
  nome: string
  tipo: 'doacao_direta' | 'declaracao' | 'impacto'
  intervalos: { inicio: string; fim: string }[] // MM-DD
  descricao: string
  /** Trilha gratuita da temporada (tabelas trilhas e trilha_degraus). */
  trilha: { degraus: number; pontosPorDegrau: number; recompensas: DegrauRecompensa[] }
}

export interface Fundo {
  id: ID
  tipo: TipoFundo
  nome: string
  conselho: string // sigla: CMDCA, CMDPI...
  conselhoNome?: string // nome completo para a carta
  esfera: Esfera
  municipio: string
  uf: string
  cnpj: string
  banco: string
  agencia: string
  conta: string
}

export interface Entidade {
  id: ID
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  municipio: string
  uf: string
  publico: TipoFundo
  descricao: string
  projetoChancelado: string
  resolucaoNumero: string // vazio = "Não se aplica" na carta
  resolucaoData: string
  validadeChancela: string
  valorAutorizado: number
  fundoId: ID
  contato: string
  exemplo: boolean
}

export interface Projeto {
  id: ID
  idExterno: string
  nome: string
  entidade: string
  cnpjEntidade: string
  municipio: string
  uf: string
  area: string
  publico: string
  valorRepassado: number
  fundo: TipoFundo
  ano: number
  mes: number
  objetivo: string
  descricao: string
  beneficiados: number
  ods: number[]
  status: 'em_execucao' | 'concluido'
  origem: 'empresa' | 'colaboradores' | 'ambos'
  lat?: number
  lng?: number
  indicadores: string[]
  entidadeId?: ID
}

export interface Comprovante {
  id: ID
  nome: string
  tipo: string
  tamanho: number
  hash: string
  dataUrl?: string
}

export type RelacaoConvidado = 'amigo' | 'familiar' | 'vizinho' | 'outro'

export interface Reporte {
  id: ID
  usuarioId: ID // quem recebe o XP (no reporte de convidado, o colaborador)
  familiarId?: ID
  /** Reporte de convidado (tabela reportes_convidado): o convidado não tem conta. */
  convidado?: { nome: string; relacao: RelacaoConvidado; linkId?: ID; lancadoPeloColaborador: boolean }
  ciclo: number
  modalidade: Modalidade
  fundoTipo: TipoFundo
  esfera: Esfera
  municipio: string
  uf: string
  entidadeId?: ID
  valor: number
  dataPagamento: string
  comprovanteIds: ID[]
  cartaId?: ID
  status: StatusReporte
  motivoDevolucao?: string
  duplicidadeSuspeita?: string
  historico: { status: StatusReporte; em: string; por?: ID; nota?: string }[]
  criadoEm: string
}

/** Link pessoal de "Reporte de convidado" (tabela links_convidado). */
export interface LinkConvidado {
  id: ID
  usuarioId: ID
  codigo: string
  criadoEm: string
  ativo: boolean
  envios: { em: string; dispositivo: string }[]
}

export interface CartaDestinacao {
  id: ID
  codigo: string
  variante: 'pf' | 'pj'
  usuarioId: ID
  familiarId?: ID
  entidadeId: ID
  fundoId: ID
  valor: number
  dataDeposito: string
  emitidaEm: string
}

// ------------------------------------------------------------------ eventos e economia

export type TipoEvento =
  | 'reporte_validado'
  | 'reporte_familiar_validado'
  | 'reporte_convidado_validado'
  | 'doacao_direta_validada'
  | 'multiplicacao_validada'
  | 'carta_gerada'
  | 'convite_enviado'
  | 'convite_aceito'
  | 'link_convidado_gerado'
  | 'projeto_visitado'
  | 'entidade_visitada'
  | 'entidade_favoritada'
  | 'licao_guia_concluida'
  | 'quiz_concluido'
  | 'pergunta_do_dia_respondida'
  | 'historia_lida'
  | 'checkin'
  | 'conquista_compartilhada'
  | 'reacao_enviada'
  | 'missao_concluida'
  | 'nivel_alcancado'
  | 'item_equipado'
  | 'alcateia_criada'
  | 'alcateia_entrou'
  | 'alcateia_meta_batida'
  | 'simulador_usado'
  | 'pin_visualizado'
  | 'perfil_completo'
  | 'familia_atualizada'
  | 'curiosidade_vista'
  | 'meta_conferida'
  | 'mascote_tocado'
  | 'glossario_termo_aberto'
  | 'apresentacao_registrada'
  | 'bau_aberto'

export type ValorEvento = string | number | boolean | number[] | undefined

export interface Evento {
  id: ID
  usuarioId: ID
  tipo: TipoEvento
  dados: Record<string, ValorEvento>
  /** Chave de idempotência: o mesmo evento (usuário + tipo + chave) nunca premia duas vezes. */
  chave?: string
  /** Evento de origem: prêmios derivados (missão, baú) apontam para quem os disparou. */
  raiz?: ID
  em: string
  dia: string // AAAA-MM-DD em America/Sao_Paulo
  estornado?: boolean
}

export type OrigemXp =
  | 'reporte'
  | 'reporte_familiar'
  | 'reporte_convidado'
  | 'doacao_carta'
  | 'convite_aceito'
  | 'missao'
  | 'bau'
  | 'quiz'
  | 'perfil_completo'
  | 'alcateia'
  | 'estorno'
  | 'ajuste'

export interface TransacaoXp {
  id: ID
  usuarioId: ID
  xp: number
  origem: OrigemXp
  eventoId?: ID
  referencia?: ID
  descricao: string
  ciclo: number
  em: string
}

/** Patinhas: moeda cosmética (tabela transacoes_patinhas). Nunca compra nada além de cosméticos. */
export interface TransacaoPatinhas {
  id: ID
  usuarioId: ID
  patinhas: number
  origem: 'missao' | 'bau' | 'nivel' | 'insignia' | 'destinacao' | 'trilha' | 'compra' | 'alcateia' | 'estorno' | 'ajuste'
  eventoId?: ID
  referencia?: string
  descricao: string
  em: string
}

// ------------------------------------------------------------------ níveis, títulos, itens

export interface Tier {
  numero: number
  nome: Flexao
  corJuba: ID
  tema: ID
  moldura: ID
}

export interface Nivel {
  nivel: number
  xpMinimo: number
  titulo: Flexao
  tier: number
}

export type CategoriaItem = 'juba' | 'cabeca' | 'rosto' | 'pescoco' | 'pata' | 'fundo' | 'moldura' | 'banner' | 'tema' | 'efeito' | 'estilo_ranking' | 'adesivo'

export interface Item {
  id: ID
  nome: string
  descricao: string
  categoria: CategoriaItem
  raridade: Raridade
  fonte: 'padrao' | 'nivel' | 'loja' | 'trilha' | 'insignia' | 'evento' | 'missao' | 'jornada'
  /** Arte procedural (forma + cor) até a chegada das artes oficiais; `url` substitui quando houver. */
  arte: { forma: string; cor: string; url?: string }
  requisito?: { nivel?: number; insignia?: ID }
  disponivelDe?: string
  disponivelAte?: string
  exclusivoEdicao?: number
}

export interface UsuarioItem {
  usuarioId: ID
  itemId: ID
  origem: Item['fonte'] | 'compra'
  eventoId?: ID // prêmio de missão ou trilha: some no estorno do evento
  em: string
}

// ------------------------------------------------------------------ missões

export type TipoMissao = 'diaria' | 'semanal' | 'jornada' | 'temporada' | 'relampago' | 'familia' | 'convidado' | 'alcateia' | 'embaixador'
export type JanelaMissao = 'dia' | 'semana' | 'temporada' | 'edicao' | 'sempre' | 'missao'

/** Critério avaliado pelo motor: evento-alvo, quantidade, janela e filtros. */
export interface CriterioMissao {
  evento: TipoEvento
  quantidade: number
  janela: JanelaMissao
  distinto?: boolean // conta referências diferentes (ex.: projetos distintos)
  agruparPorOds?: boolean // "3 projetos de um mesmo ODS"
  ref?: string // exige uma referência específica (ex.: lição 1)
  filtro?: { municipioDoUsuario?: boolean; ods?: number; fundo?: TipoFundo; tipoMissao?: TipoMissao }
  rotulo?: string
}

export interface Missao {
  id: ID
  tipo: TipoMissao
  titulo: string
  descricao: string
  narrativa?: string
  criterios: CriterioMissao[]
  xp: number
  patinhas: number
  publico: 'todos' | 'embaixadores'
  tierMinimo?: number
  temporadaId?: ID
  capitulo?: number
  inicio?: string // relâmpago
  fim?: string
  educativa?: boolean // recebe o multiplicador das campanhas relâmpago
  itemRecompensa?: ID
  ativa: boolean
}

export interface UsuarioMissao {
  usuarioId: ID
  missaoId: ID
  periodo: string
  /** Por critério, os eventos que contaram (distintos e ODS são calculados a partir deles). */
  contagem: ID[][]
  concluidaEm?: string
  eventoConclusao?: ID
}

/** Sorteio de diárias e semanais por pessoa (tabela usuario_missoes_diarias). */
export interface SorteioMissoes {
  usuarioId: ID
  tipo: 'dia' | 'semana'
  periodo: string
  missoes: ID[]
  trocou: boolean
  bauAberto: boolean
}

// ------------------------------------------------------------------ insígnias

export type CategoriaInsignia = 'participacao' | 'familia' | 'influencia' | 'constancia' | 'conexao' | 'conhecimento' | 'colecao' | 'equipe' | 'especial' | 'secreta'

export interface Insignia {
  id: ID
  nome: Flexao
  descricao: string
  categoria: CategoriaInsignia
  icone: string
  secreta: boolean
  /** Métrica calculada pelo motor; os graus definem os limites (I a IV). */
  metrica: string
  graus: { limite: number; raridade: Raridade }[]
  titulo?: Flexao
}

export interface UsuarioInsignia {
  usuarioId: ID
  insigniaId: ID
  grau: number // 1 a 4
  em: string
  ciclo: number
}

export interface UsuarioTrilha {
  usuarioId: ID
  chave: string // ocorrência da temporada
  resgatados: number[]
}

// ------------------------------------------------------------------ social

export interface Alcateia {
  id: ID
  nome: string
  emblema: string
  criadorId: ID
  metaSemanal: number // missões somadas da equipe
  criadaEm: string
  oculta: boolean // moderação
}

export interface AlcateiaMembro {
  alcateiaId: ID
  usuarioId: ID
  em: string
}

export interface MuralPost {
  id: ID
  usuarioId: ID
  tipo: 'tier' | 'insignia' | 'trilha' | 'nivel' | 'alcateia'
  texto: string
  icone: string
  raridade?: Raridade
  em: string
  oculto: boolean
}

export interface Reacao {
  postId: ID
  usuarioId: ID
  adesivo: ID
  em: string
}

export interface Voto {
  usuarioId: ID
  projetoId: ID
  edicao: number
  em: string
}

// ------------------------------------------------------------------ recompensas institucionais

export interface RecompensaInstitucional {
  id: ID
  nome: string
  descricao: string
  categoria: 'reconhecimento' | 'produto' | 'experiencia' | 'voucher'
  requisito: { nivel?: number; tier?: number; insignia?: ID; grau?: number }
  estoque: number | null
  validoAte?: string
  icone: string
}

export interface Resgate {
  id: ID
  usuarioId: ID
  recompensaId: ID
  edicao: number
  status: 'solicitado' | 'aprovado' | 'entregue' | 'recusado'
  em: string
}

export interface Convite {
  id: ID
  usuarioId: ID
  contato: string
  canal: 'email' | 'whatsapp' | 'teams' | 'link'
  tipo: 'colega' | 'familiar'
  status: 'enviado' | 'aceito' | 'reportou'
  convidadoId?: ID
  em: string
}

export interface Pin {
  ano: number
  titulo: string
  descricao: string
  arte?: string
  modeloGlb?: string
  corBase: string
  corRelevo: string
}

export interface UsuarioPin {
  usuarioId: ID
  ano: number
  em: string
}

export interface Notificacao {
  id: ID
  usuarioId: ID
  titulo: string
  texto: string
  tipo: 'reporte' | 'convidado' | 'missao' | 'nivel' | 'meta' | 'prazo' | 'convite' | 'recompensa' | 'insignia' | 'trilha' | 'alcateia'
  link?: string
  lida: boolean
  em: string
}

export interface TabelaXp {
  primeiraDestinacao: number
  bonusPrimeiraVida: number
  destinacaoAdicional: number
  destinacaoFamiliar: number
  reporteConvidado: number
  doacaoCarta: number
  conviteAceito: number
  limiteDiarioMissoes: number
  quiz: number
  perfilCompleto: number
  bonusConsecutivoPct: number
  bonusConsecutivoMaxPct: number
}

export interface Relampago {
  id: ID
  nome: string
  inicio: string
  fim: string
  multiplicadorEducativo: number
}

export interface Configuracoes {
  cicloAtivo: number
  tabelaXp: TabelaXp
  guia: { pctFia: number; pctIdoso: number; pctGlobalDoacaoDireta: number; revisadoFiscal: boolean }
  marcos: { pct: number; titulo: string; conteudo: string }[]
  limiteConvitesDia: number
  limiteLoteConvites: number
  patinhas: { destinacaoPropria: number; bauDia: number; bauSemana: number; porTier: number; insignia: Record<Raridade, number> }
  loja: { precos: Record<Exclude<Raridade, 'lendaria'>, number>; ofertasPorSemana: number; ofertaTemporada: Record<ID, ID> }
  lojaRotacaoSemente: string
  missoesConfig: { diariasPorDia: number; trocasPorDia: number; semanaisPorSemana: number }
  prestigio: { xpPorEstrela: number }
  alcateiaConfig: { maxMembros: number; metaSemanalPadrao: number; bonusXp: number; bonusPatinhas: number }
  convidados: { limitePorEdicao: number; limitePorDispositivoDia: number; limitePorLinkDia: number }
  votoLeao: { ativo: boolean; projetos: ID[]; votosPorTier: number; titulo: string }
  relampagos: Relampago[]
}

export interface LogAuditoria {
  id: ID
  em: string
  por?: ID
  acao: string
  alvo?: string
  detalhe: string
}

export interface Banco {
  versao: number
  usuarios: Usuario[]
  familiares: Familiar[]
  unidades: Unidade[]
  ciclos: Ciclo[]
  temporadas: Temporada[]
  fundos: Fundo[]
  entidades: Entidade[]
  projetos: Projeto[]
  reportes: Reporte[]
  linksConvidado: LinkConvidado[]
  comprovantes: Comprovante[]
  cartas: CartaDestinacao[]
  eventos: Evento[]
  transacoesXp: TransacaoXp[]
  transacoesPatinhas: TransacaoPatinhas[]
  tiers: Tier[]
  niveis: Nivel[]
  itens: Item[]
  usuarioItens: UsuarioItem[]
  insignias: Insignia[]
  usuarioInsignias: UsuarioInsignia[]
  missoes: Missao[]
  usuarioMissoes: UsuarioMissao[]
  sorteios: SorteioMissoes[]
  usuarioTrilhas: UsuarioTrilha[]
  recompensas: RecompensaInstitucional[]
  resgates: Resgate[]
  convites: Convite[]
  pins: Pin[]
  usuarioPins: UsuarioPin[]
  alcateias: Alcateia[]
  alcateiaMembros: AlcateiaMembro[]
  mural: MuralPost[]
  reacoes: Reacao[]
  votos: Voto[]
  notificacoes: Notificacao[]
  configuracoes: Configuracoes
  log: LogAuditoria[]
}

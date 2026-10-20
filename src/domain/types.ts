// Modelo de dados mínimo (seção 10 do prompt). Cada tabela vira uma coleção
// no repositório local (src/data/db.ts), pronto para ser trocado por uma API REST.

export type ID = string
export type Perfil = 'colaborador' | 'convidado' | 'embaixador' | 'admin'
export type TipoFundo = 'FIA' | 'IDOSO'
export type Esfera = 'municipal' | 'estadual' | 'nacional'
export type Modalidade = 'declaracao' | 'doacao_direta'
export type StatusReporte =
  | 'aguardando_padrinho'
  | 'enviado'
  | 'em_validacao'
  | 'validado'
  | 'devolvido'
  | 'recusado_padrinho'
  | 'estornado'

export interface Unidade {
  id: ID
  nome: string
  municipio: string
  uf: string
  colaboradores: number // usado no ranking proporcional
}

export interface Usuario {
  id: ID
  nome: string
  email: string
  perfil: Perfil
  unidadeId?: ID
  municipio: string
  uf: string
  avatar?: string // emoji ou iniciais
  cpf?: string // exibido apenas na carta de destinação
  endereco?: string
  telefone?: string
  anonimo: boolean
  consentimentoLgpd?: string // data ISO do aceite
  padrinhoEmail?: string // convidados
  vinculoStatus?: 'pendente' | 'aprovado' | 'recusado'
  codigoConvite: string
  convidadoPor?: ID
  ciclosAnteriores: number[] // participação antes do app (Pioneiro)
  notificacoes: { email: boolean; push: boolean; prazos: boolean }
  molduraAtiva?: ID
  temaAtivo?: ID
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
  inicio: string // ISO: início das destinações que contam para a edição
  meta: number
  prazoDoacaoDireta: string // ISO
  prazoDeclaracao: string // ISO
  ativo: boolean
}

export interface Temporada {
  id: ID
  nome: string
  tipo: 'doacao_direta' | 'declaracao' | 'impacto'
  intervalos: { inicio: string; fim: string }[] // MM-DD
  descricao: string
}

export interface Fundo {
  id: ID
  tipo: TipoFundo
  nome: string
  conselho: 'CMDCA' | 'CMDI' | 'CONANDA' | 'CNDI' | 'CEDCA' | 'CEI'
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
  resolucaoNumero: string
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
  hash: string // detecção de duplicidade
  dataUrl?: string // protótipo: arquivo guardado localmente
}

export interface Reporte {
  id: ID
  usuarioId: ID
  familiarId?: ID
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

export interface CartaDestinacao {
  id: ID
  codigo: string
  usuarioId: ID
  entidadeId: ID
  fundoId: ID
  valor: number
  dataDeposito: string
  emitidaEm: string
}

export type OrigemXp =
  | 'reporte'
  | 'reporte_familiar'
  | 'doacao_carta'
  | 'convite_aceito'
  | 'bonus_padrinho'
  | 'missao'
  | 'quiz'
  | 'perfil_completo'
  | 'estorno'
  | 'ajuste'

export interface TransacaoXp {
  id: ID
  usuarioId: ID
  xp: number
  origem: OrigemXp
  referencia?: ID
  descricao: string
  ciclo: number
  em: string
}

export interface Nivel {
  nivel: number
  nome: string
  xpMinimo: number
  desbloqueio: string
}

export interface Insignia {
  id: ID
  nome: string
  descricao: string
  icone: string
  secreta: boolean
}

export interface UsuarioInsignia {
  usuarioId: ID
  insigniaId: ID
  em: string
  ciclo: number
}

export type Recorrencia = 'diaria' | 'semanal' | 'sazonal' | 'unica'
export type CriterioMissao =
  | 'checkin'
  | 'ler_historia'
  | 'pergunta_dia'
  | 'visitar_projeto'
  | 'visitar_projetos_cidade'
  | 'visitar_entidade_cidade'
  | 'convites_aceitos'
  | 'compartilhar'
  | 'quiz'
  | 'reporte_familiar'
  | 'reporte_ate_prazo'

export interface Missao {
  id: ID
  titulo: string
  descricao: string
  xp: number
  recorrencia: Recorrencia
  criterio: CriterioMissao
  meta: number
  publico: 'todos' | 'colaboradores' | 'embaixadores'
  temporadaId?: ID
  ativa: boolean
}

export interface UsuarioMissao {
  usuarioId: ID
  missaoId: ID
  periodo: string // chave do período (dia, semana, temporada)
  progresso: number
  refs: ID[] // itens distintos já contados (ex.: projetos visitados)
  concluidaEm?: string
}

export interface Recompensa {
  id: ID
  nome: string
  descricao: string
  tipo: 'insignia' | 'moldura' | 'tema' | 'voucher' | 'experiencia' | 'premiacao'
  nivelMinimo: number
  insigniaRequerida?: ID
  estoque: number | null
  validoAte?: string
  icone: string
}

export interface Resgate {
  id: ID
  usuarioId: ID
  recompensaId: ID
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
  arte?: string // chave do asset da arte oficial; sem arte = modelo procedural
  modeloGlb?: string // URL de um modelo 3D .glb, quando a equipe fornecer
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
  tipo: 'reporte' | 'padrinho' | 'missao' | 'nivel' | 'meta' | 'prazo' | 'convite' | 'recompensa' | 'insignia'
  link?: string
  lida: boolean
  em: string
}

export interface TabelaXp {
  primeiraDestinacao: number
  bonusPrimeiraVida: number
  destinacaoAdicional: number
  destinacaoFamiliar: number
  doacaoCarta: number
  conviteAceito: number
  bonusPadrinho: number
  limiteDiarioMissoes: number
  quiz: number
  perfilCompleto: number
  bonusConsecutivoPct: number
  bonusConsecutivoMaxPct: number
}

export interface Configuracoes {
  cicloAtivo: number
  tabelaXp: TabelaXp
  guia: {
    pctFia: number
    pctIdoso: number
    pctGlobalDoacaoDireta: number
    revisadoFiscal: boolean
  }
  marcos: { pct: number; titulo: string; conteudo: string }[]
  limiteConvitesDia: number
  limiteLoteConvites: number
  conviteBaseUrl: string
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
  comprovantes: Comprovante[]
  cartas: CartaDestinacao[]
  transacoesXp: TransacaoXp[]
  niveis: Nivel[]
  insignias: Insignia[]
  usuarioInsignias: UsuarioInsignia[]
  missoes: Missao[]
  usuarioMissoes: UsuarioMissao[]
  recompensas: Recompensa[]
  resgates: Resgate[]
  convites: Convite[]
  pins: Pin[]
  usuarioPins: UsuarioPin[]
  notificacoes: Notificacao[]
  configuracoes: Configuracoes
  log: LogAuditoria[]
  visitas: { usuarioId: ID; tipo: 'projeto' | 'entidade' | 'historia'; ref: ID; em: string }[]
}

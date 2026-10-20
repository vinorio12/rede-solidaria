import { data, moeda, valorPorExtenso } from './datas'

// Modelo oficial da "Carta de direcionamento de destinação de Imposto de Renda"
// em duas variantes com a mesma estrutura e redação:
// - pf: pessoa física (padrão do app, colaborador e familiares)
// - pj: pessoa jurídica (somente no painel, destinações institucionais da WEG)

export type VarianteCarta = 'pf' | 'pj'

export interface DadosCarta {
  variante: VarianteCarta
  codigo: string
  urlVerificacao: string
  // conselho e fundo
  conselhoNome: string
  tipoFundo: 'FIA' | 'IDOSO'
  municipioFundo: string
  ufFundo: string
  // doador (pf: nome/CPF/endereço; pj: razão social/CNPJ/sede)
  doadorNome: string
  doadorDocumento: string
  doadorEndereco: string
  representante?: string // pj: quem assina pela empresa
  // depósito
  valor: number
  dataDeposito: string
  // entidade e projeto
  instituicao: string
  cnpjInstituicao: string
  projeto: string
  chancela?: string
  emitidaEm: string
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "20 de outubro de 2026" */
export function dataPorExtenso(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} de ${MESES[m - 1]} de ${a}`
}

export const NAO_SE_APLICA = 'Não se aplica'

export interface TextoCarta {
  titulo: string
  destinatario: string[]
  referencia: string
  saudacao: string
  paragrafos: string[]
  itens: [string, string][]
  pedido: string
  anexos: string
  local: string
  assinatura: string[]
}

export function textoCarta(d: DadosCarta): TextoCarta {
  const fundo = d.tipoFundo === 'FIA' ? 'FIA' : 'Fundo do Idoso'
  const pf = d.variante === 'pf'
  const abertura = pf
    ? `Eu, ${d.doadorNome}, inscrito(a) no CPF sob o nº ${d.doadorDocumento}, residente na ${d.doadorEndereco}, venho por meio desta informar a realização de destinação de recursos incentivados, com base nos benefícios fiscais do Imposto de Renda Pessoa Física (IRPF), conforme legislação vigente.`
    : `A empresa ${d.doadorNome}, inscrita no CNPJ sob o nº ${d.doadorDocumento}, com sede na ${d.doadorEndereco}, vem por meio desta informar a realização de destinação de recursos incentivados, com base nos benefícios fiscais do Imposto de Renda Pessoa Jurídica (IRPJ, Lucro Real), conforme legislação vigente.`
  const pedido = pf
    ? 'Solicito, outrossim, a emissão do respectivo Recibo de Destinação em meu nome, contendo nome completo, CPF, data e o valor depositado, para fins de comprovação junto à Secretaria da Receita Federal do Brasil.'
    : 'Solicitamos, outrossim, a emissão do respectivo Recibo de Destinação em nome da nossa empresa, contendo a razão social, CNPJ, data e o valor depositado, para fins de comprovação junto à Secretaria da Receita Federal do Brasil.'
  return {
    titulo: 'CARTA DE DIRECIONAMENTO DE DESTINAÇÃO DE IMPOSTO DE RENDA',
    destinatario: ['À', d.conselhoNome],
    referencia: `Ref.: Direcionamento de Recursos Incentivados (${fundo})`,
    saudacao: 'Prezado(a) Presidente do Conselho,',
    paragrafos: [
      abertura,
      `O depósito foi realizado na conta bancária deste Fundo no valor de ${moeda(d.valor)} (${valorPorExtenso(d.valor)}), em ${data(d.dataDeposito)}.`,
      `${pf ? 'Solicito' : 'Solicitamos'} formalmente que este recurso seja integralmente direcionado e aplicado no projeto social abaixo indicado:`,
    ],
    itens: [
      ['Instituição Beneficiária', d.instituicao],
      ['CNPJ da Instituição', d.cnpjInstituicao],
      ['Nome do Projeto', d.projeto],
      ['Número do Registro/Chancela', d.chancela?.trim() || NAO_SE_APLICA],
    ],
    pedido,
    anexos: 'Seguem anexos os comprovantes de depósito/transferência bancária.',
    local: `${d.municipioFundo} - ${d.ufFundo}, ${dataPorExtenso(d.emitidaEm)}.`,
    assinatura: pf ? [d.doadorNome] : [d.doadorNome, d.representante ? `${d.representante}, representante legal` : 'Representante legal'],
  }
}

/** Nome do conselho para o cabeçalho da carta, a partir do cadastro do fundo. */
export function nomeConselho(f: { conselhoNome?: string; tipo: 'FIA' | 'IDOSO'; municipio: string; conselho: string }) {
  if (f.conselhoNome?.trim()) return f.conselhoNome
  return f.tipo === 'FIA'
    ? `Conselho Municipal dos Direitos da Criança e do Adolescente de ${f.municipio} (${f.conselho})`
    : `Conselho Municipal dos Direitos da Pessoa Idosa de ${f.municipio} (${f.conselho})`
}

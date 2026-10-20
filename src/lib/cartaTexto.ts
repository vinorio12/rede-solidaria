import { data, moeda, valorPorExtenso } from './datas'

// Texto da carta de destinação, compartilhado entre a prévia na tela e o PDF.

export interface DadosCarta {
  codigo: string
  urlVerificacao: string
  conselho: 'CMDCA' | 'CMDI' | string
  publico: 'FIA' | 'IDOSO'
  municipio: string
  uf: string
  nome: string
  cpf: string
  endereco: string
  email: string
  telefone: string
  valor: number
  dataDeposito: string
  fundoNome: string
  fundoCnpj: string
  banco: string
  agencia: string
  conta: string
  projeto: string
  razaoSocial: string
  cnpjEntidade: string
  resolucaoNumero: string
  resolucaoData: string
  emitidaEm: string
}

/** Texto provisório da carta (substituir pelo modelo oficial quando a equipe enviar). */
export function textoCarta(d: DadosCarta) {
  const conselho = d.publico === 'FIA' ? 'da Criança e do Adolescente' : 'da Pessoa Idosa'
  return {
    destinatario: `Ao Conselho Municipal dos Direitos ${conselho} de ${d.municipio}/${d.uf}`,
    corpo:
      `Eu, ${d.nome}, inscrito(a) no CPF sob o nº ${d.cpf}, residente em ${d.endereco}, comunico que realizei, em ${data(d.dataDeposito)}, ` +
      `doação no valor de ${moeda(d.valor)} (${valorPorExtenso(d.valor)}) ao ${d.fundoNome}, CNPJ ${d.fundoCnpj}, por meio de depósito na conta ` +
      `${d.banco}, agência ${d.agencia}, conta ${d.conta}, e manifesto minha indicação para que o recurso seja direcionado ao projeto ${d.projeto}, ` +
      `da entidade ${d.razaoSocial}, CNPJ ${d.cnpjEntidade}, chancelado pela Resolução nº ${d.resolucaoNumero}, de ${data(d.resolucaoData)}.`,
    pedido: 'Solicito a emissão do recibo correspondente para fins de dedução na Declaração de Ajuste Anual do Imposto de Renda.',
    local: `${d.municipio}, ${data(d.emitidaEm)}.`,
  }
}

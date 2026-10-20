// Conteúdo do Guia prático do IR (lições, glossário, perguntas) e curiosidades do leãozinho.
// Os percentuais e prazos vêm da configuração; aqui fica só o texto.

export interface Licao {
  id: string
  titulo: string
  mascote: 'acenando' | 'pensando' | 'apontando' | 'comemorando' | 'neutro'
  /** Texto com marcadores {pctFia}, {pctIdoso}, {pctGlobal}, {prazoDeclaracao}, {prazoDoacao}. */
  texto: string
}

export const LICOES_GUIA: Licao[] = [
  { id: 'licao-1', titulo: 'O que é e por que destinar', mascote: 'acenando', texto: 'Uma parte do imposto que você já paga pode ir para os fundos da criança, do adolescente e da pessoa idosa. Não há custo adicional: você só escolhe que o recurso fique no seu município.' },
  { id: 'licao-2', titulo: 'Quem pode', mascote: 'pensando', texto: 'Pessoa física que faz a declaração no modelo completo. Quem tem imposto a restituir também pode destinar.' },
  { id: 'licao-3', titulo: 'Na declaração', mascote: 'apontando', texto: 'Até {pctFia}% do imposto devido para o Fundo da Criança e do Adolescente e até {pctIdoso}% para o Fundo do Idoso, na ficha "Doações diretamente na declaração". O programa gera o DARF, que deve ser pago até o prazo final da entrega ({prazoDeclaracao}).' },
  { id: 'licao-4', titulo: 'Durante o ano (até 31/12)', mascote: 'comemorando', texto: 'Doação direta aos fundos até {prazoDoacao}, observando o limite global de {pctGlobal}% do imposto devido. Conforme o fundo, dá para vincular a doação a uma entidade ou projeto chancelado. O valor é informado na declaração do ano seguinte.' },
  { id: 'licao-5', titulo: 'Carta, recibo e comprovantes', mascote: 'neutro', texto: 'Na doação direta, gere a carta de direcionamento no app, faça o depósito na conta do fundo e anexe o comprovante bancário à carta. O conselho emite o recibo de destinação, que é o documento que vale para a Receita Federal. Guarde tudo por pelo menos 5 anos.' },
]

export const GLOSSARIO_TERMOS: [string, string][] = [
  ['FIA', 'Fundo da Infância e Adolescência: fundo municipal, estadual ou nacional dos direitos da criança e do adolescente.'],
  ['CMDCA', 'Conselho Municipal dos Direitos da Criança e do Adolescente, gestor do FIA no município.'],
  ['CMDPI', 'Conselho Municipal dos Direitos da Pessoa Idosa, gestor do Fundo do Idoso no município.'],
  ['Chancela', 'Aprovação de um projeto pelo conselho, que autoriza a captação com indicação da entidade.'],
  ['DARF', 'Documento de Arrecadação de Receitas Federais, gerado pelo programa da declaração para pagar a doação.'],
  ['Imposto devido', 'Valor total do imposto calculado na declaração, antes de descontar o que já foi retido na fonte.'],
  ['Recibo de destinação', 'Documento emitido pelo conselho em nome de quem doou, com CPF, data e valor.'],
]

export const CURIOSIDADES = [
  'A Rede Solidária existe desde 2011.',
  'Destinar parte do IR não aumenta o imposto: você só escolhe para onde vai uma parte dele.',
  'Na declaração, dá para destinar até 3% do imposto devido ao FIA e até 3% ao Fundo do Idoso.',
  'Quem tem imposto a restituir também pode destinar.',
  'Os conselhos municipais (CMDCA e CMDPI) decidem quais projetos podem captar recursos.',
  'O recibo de destinação é o comprovante que vale para a Receita Federal.',
  'Na doação direta, conforme o fundo, você pode indicar um projeto chancelado.',
  'Em 2026, 211 colaboradores reportaram a destinação e receberam o pin da edição.',
]

export function curiosidadeDoDia(dia: string) {
  const n = Number(dia.replaceAll('-', ''))
  return CURIOSIDADES[n % CURIOSIDADES.length]
}

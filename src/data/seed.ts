import type { Banco, Fundo, Reporte, StatusReporte, TipoFundo, Usuario } from '@/domain/types'
import { validarReporte, devolverReporte, estornarReporte, verificarInsignias, creditarXp } from '@/domain/regras'

// Dados fictícios e identificados como exemplo (seção 14).
// Meta, prazos e percentuais ficam na configuração, não no código das telas.

export const VERSAO_SEED = 1

const MUNICIPIOS = [
  { nome: 'Jaraguá do Sul', lat: -26.4851, lng: -49.0713 },
  { nome: 'Guaramirim', lat: -26.4731, lng: -49.0026 },
  { nome: 'Joinville', lat: -26.3045, lng: -48.8487 },
  { nome: 'Itajaí', lat: -26.9101, lng: -48.6705 },
]

const NOMES = [
  'Ana Paula Schmitt', 'Bruno Kreutzfeld', 'Carla Demarchi', 'Diego Wolf', 'Eduarda Lenzi', 'Felipe Hornburg',
  'Gabriela Piazera', 'Henrique Bauer', 'Isabela Marquardt', 'João Pedro Voigt', 'Karina Stinghen', 'Lucas Ristow',
  'Mariana Krüger', 'Nicolas Hafemann', 'Olívia Schiochet', 'Paulo Ehlert', 'Queila Rux', 'Rafael Mahfud',
  'Sabrina Jung', 'Tiago Emmendoerfer', 'Ursula Fiedler', 'Vinícius Doubrawa', 'Wanessa Kuhn', 'Xavier Pradi',
  'Yasmin Lescowicz', 'Zeca Menegotti',
]

function fundosDe(municipio: string, i: number): Fundo[] {
  const base = 10 + i
  return [
    {
      id: `fundo_fia_${i}`,
      tipo: 'FIA',
      nome: `Fundo Municipal dos Direitos da Criança e do Adolescente de ${municipio}`,
      conselho: 'CMDCA',
      esfera: 'municipal',
      municipio,
      uf: 'SC',
      cnpj: `${base}.111.222/0001-${String(30 + i).padStart(2, '0')}`,
      banco: '001 - Banco do Brasil (exemplo)',
      agencia: `${1000 + i}-${i}`,
      conta: `${50000 + i * 7}-${i}`,
    },
    {
      id: `fundo_idoso_${i}`,
      tipo: 'IDOSO',
      nome: `Fundo Municipal dos Direitos da Pessoa Idosa de ${municipio}`,
      conselho: 'CMDI',
      esfera: 'municipal',
      municipio,
      uf: 'SC',
      cnpj: `${base}.333.444/0001-${String(40 + i).padStart(2, '0')}`,
      banco: '104 - Caixa Econômica Federal (exemplo)',
      agencia: `${2000 + i}`,
      conta: `${70000 + i * 11}-${i}`,
    },
  ]
}

const ENTIDADES: { nome: string; fantasia: string; m: number; publico: TipoFundo; projeto: string; desc: string; autorizado: number }[] = [
  { nome: 'Associação Crescer Juntos (exemplo)', fantasia: 'Crescer Juntos', m: 0, publico: 'FIA', projeto: 'Contraturno Esportivo e Cultural', desc: 'Atividades no contraturno escolar para crianças de 6 a 14 anos, com esporte, música e reforço escolar.', autorizado: 180000 },
  { nome: 'Instituto Raízes do Amanhã (exemplo)', fantasia: 'Raízes do Amanhã', m: 0, publico: 'IDOSO', projeto: 'Envelhecer Ativo', desc: 'Oficinas de convivência, atividade física e inclusão digital para pessoas idosas.', autorizado: 120000 },
  { nome: 'Lar Esperança (exemplo)', fantasia: 'Lar Esperança', m: 1, publico: 'FIA', projeto: 'Acolher com Afeto', desc: 'Acolhimento institucional e fortalecimento de vínculos familiares.', autorizado: 150000 },
  { nome: 'Centro de Convivência Bem Viver (exemplo)', fantasia: 'Bem Viver', m: 1, publico: 'IDOSO', projeto: 'Memória Viva', desc: 'Estimulação cognitiva e rodas de memória com pessoas idosas da comunidade.', autorizado: 90000 },
  { nome: 'Associação Aprender e Brincar (exemplo)', fantasia: 'Aprender e Brincar', m: 2, publico: 'FIA', projeto: 'Primeira Infância em Foco', desc: 'Apoio ao desenvolvimento infantil de 0 a 6 anos e orientação às famílias.', autorizado: 200000 },
  { nome: 'Casa do Avô Feliz (exemplo)', fantasia: 'Avô Feliz', m: 2, publico: 'IDOSO', projeto: 'Cuidar de Quem Cuidou', desc: 'Atendimento multiprofissional e apoio a cuidadores familiares.', autorizado: 110000 },
  { nome: 'Instituto Maré Jovem (exemplo)', fantasia: 'Maré Jovem', m: 3, publico: 'FIA', projeto: 'Jovem Aprendiz do Mar', desc: 'Qualificação profissional para adolescentes de 14 a 17 anos.', autorizado: 160000 },
  { nome: 'Associação Melhor Idade Litoral (exemplo)', fantasia: 'Melhor Idade Litoral', m: 3, publico: 'IDOSO', projeto: 'Movimento e Saúde', desc: 'Hidroginástica, caminhadas orientadas e acompanhamento de saúde.', autorizado: 80000 },
]

const PROJETOS = [
  { e: 0, area: 'Esporte e cultura', publico: 'Crianças de 6 a 14 anos', valor: 85000, ano: 2025, mes: 6, ods: [3, 4, 10], ben: 240, status: 'em_execucao', origem: 'ambos', ind: ['240 crianças atendidas', '92% de frequência escolar', '12 oficinas por semana'] },
  { e: 1, area: 'Saúde e convivência', publico: 'Pessoas idosas', valor: 60000, ano: 2025, mes: 8, ods: [3, 10], ben: 130, status: 'em_execucao', origem: 'colaboradores', ind: ['130 pessoas idosas', '3 turmas de inclusão digital'] },
  { e: 2, area: 'Assistência social', publico: 'Crianças e adolescentes acolhidos', valor: 70000, ano: 2025, mes: 4, ods: [1, 10, 16], ben: 45, status: 'concluido', origem: 'empresa', ind: ['45 crianças acolhidas', '18 famílias reintegradas'] },
  { e: 4, area: 'Educação', publico: 'Primeira infância (0 a 6 anos)', valor: 95000, ano: 2026, mes: 3, ods: [4, 5], ben: 310, status: 'em_execucao', origem: 'ambos', ind: ['310 crianças', '200 famílias orientadas'] },
  { e: 5, area: 'Saúde', publico: 'Pessoas idosas e cuidadores', valor: 55000, ano: 2026, mes: 5, ods: [3], ben: 90, status: 'em_execucao', origem: 'empresa', ind: ['90 atendimentos mensais', '40 cuidadores capacitados'] },
  { e: 6, area: 'Qualificação profissional', publico: 'Adolescentes de 14 a 17 anos', valor: 78000, ano: 2026, mes: 2, ods: [4, 8], ben: 60, status: 'em_execucao', origem: 'colaboradores', ind: ['60 jovens em formação', '35% já contratados'] },
] as const

const PALETA: [string, string][] = [
  ['#095BA7', '#00BEDF'], ['#0063A7', '#9BD3F0'], ['#00325C', '#00BEDF'], ['#1C6E8C', '#C9E7F2'],
  ['#2A4D8F', '#A8C8F0'], ['#00577A', '#7FDBEA'], ['#123E6B', '#58B9E0'], ['#0B4F8A', '#E2B33B'],
]

export function criarSeed(): Banco {
  const unidades = [
    { id: 'un_a', nome: 'Unidade A (exemplo)', municipio: 'Jaraguá do Sul', uf: 'SC', colaboradores: 1200 },
    { id: 'un_b', nome: 'Unidade B (exemplo)', municipio: 'Guaramirim', uf: 'SC', colaboradores: 450 },
    { id: 'un_c', nome: 'Unidade C (exemplo)', municipio: 'Itajaí', uf: 'SC', colaboradores: 300 },
  ]
  const fundos = MUNICIPIOS.flatMap((m, i) => fundosDe(m.nome, i))
  const entidades = ENTIDADES.map((e, i) => ({
    id: `ent_${i + 1}`,
    razaoSocial: e.nome,
    nomeFantasia: e.fantasia,
    cnpj: `${20 + i}.${100 + i * 3}.${200 + i * 5}/0001-${String(10 + i).padStart(2, '0')}`,
    municipio: MUNICIPIOS[e.m].nome,
    uf: 'SC',
    publico: e.publico,
    descricao: e.desc,
    projetoChancelado: e.projeto,
    resolucaoNumero: `${String(i + 3).padStart(3, '0')}/2026`,
    resolucaoData: `2026-0${(i % 6) + 2}-15`,
    validadeChancela: i === 7 ? '2026-11-30' : '2027-12-31',
    valorAutorizado: e.autorizado,
    fundoId: `fundo_${e.publico === 'FIA' ? 'fia' : 'idoso'}_${e.m}`,
    contato: `contato@entidade${i + 1}.exemplo.org.br`,
    exemplo: true,
  }))
  const projetos = PROJETOS.map((p, i) => {
    const e = entidades[p.e]
    const m = MUNICIPIOS[ENTIDADES[p.e].m]
    return {
      id: `prj_${i + 1}`,
      idExterno: `EX-${2025 + (i > 2 ? 1 : 0)}-${String(i + 101)}`,
      nome: e.projetoChancelado,
      entidade: e.razaoSocial,
      cnpjEntidade: e.cnpj,
      municipio: e.municipio,
      uf: 'SC',
      area: p.area,
      publico: p.publico,
      valorRepassado: p.valor,
      fundo: e.publico,
      ano: p.ano,
      mes: p.mes,
      objetivo: e.descricao,
      descricao: `${e.descricao} Projeto de exemplo para demonstração do app.`,
      beneficiados: p.ben,
      ods: [...p.ods],
      status: p.status,
      origem: p.origem,
      lat: m.lat + (i % 2 ? 0.01 : -0.01),
      lng: m.lng + (i % 3 ? 0.012 : -0.008),
      indicadores: [...p.ind],
      entidadeId: e.id,
    }
  })

  const b: Banco = {
    versao: VERSAO_SEED,
    usuarios: [],
    familiares: [],
    unidades,
    ciclos: [
      { ano: 2025, rotulo: 'Edição 2025', inicio: '2024-10-01', meta: 200000, prazoDoacaoDireta: '2024-12-31', prazoDeclaracao: '2025-05-30', ativo: false },
      { ano: 2026, rotulo: 'Edição 2026', inicio: '2025-10-01', meta: 220000, prazoDoacaoDireta: '2025-12-31', prazoDeclaracao: '2026-05-29', ativo: false },
      { ano: 2027, rotulo: 'Edição 2027 (out/2026 a mai/2027)', inicio: '2026-10-01', meta: 250000, prazoDoacaoDireta: '2026-12-31', prazoDeclaracao: '2027-05-31', ativo: true },
    ],
    temporadas: [
      { id: 'tmp_doacao', nome: 'Temporada Doação Direta', tipo: 'doacao_direta', intervalos: [{ inicio: '10-01', fim: '12-31' }], descricao: 'Doe diretamente aos fundos até 31/12 e indique uma entidade chancelada.' },
      { id: 'tmp_declaracao', nome: 'Temporada Declaração', tipo: 'declaracao', intervalos: [{ inicio: '03-01', fim: '05-31' }], descricao: 'Destine na declaração do IRPF até o prazo final de entrega.' },
      { id: 'tmp_impacto', nome: 'Temporada Impacto', tipo: 'impacto', intervalos: [{ inicio: '01-01', fim: '02-28' }, { inicio: '06-01', fim: '09-30' }], descricao: 'Conheça os projetos, convide pessoas e aprenda com o guia.' },
    ],
    fundos,
    entidades,
    projetos,
    reportes: [],
    comprovantes: [],
    cartas: [],
    transacoesXp: [],
    niveis: [
      { nivel: 1, nome: 'Filhote', xpMinimo: 0, desbloqueio: 'Moldura azul básica e o leãozinho no seu perfil.' },
      { nivel: 2, nome: 'Jovem Leão', xpMinimo: 500, desbloqueio: 'Moldura Juba Ciano e tema Céu Claro.' },
      { nivel: 3, nome: 'Leão Protetor', xpMinimo: 1500, desbloqueio: 'Moldura Escudo e animação do leãozinho acenando.' },
      { nivel: 4, nome: 'Leão Guardião', xpMinimo: 3000, desbloqueio: 'Tema Noite Azul e convite especial para o evento.' },
      { nivel: 5, nome: 'Leão Embaixador', xpMinimo: 6000, desbloqueio: 'Moldura Metálica e visita guiada a uma entidade.' },
      { nivel: 6, nome: 'Lenda da Rede', xpMinimo: 10000, desbloqueio: 'Moldura Lendária e homenagem no evento de reconhecimento.' },
    ],
    insignias: [
      { id: 'primeira_destinacao', nome: 'Primeira Destinação', descricao: 'Teve a primeira destinação validada.', icone: '🌱', secreta: false },
      { id: 'familia_solidaria', nome: 'Família Solidária', descricao: 'Dois ou mais membros da família destinaram no mesmo ciclo.', icone: '👨‍👩‍👧', secreta: false },
      { id: 'guardiao_infancia', nome: 'Guardião da Infância', descricao: 'Destinou ao Fundo da Criança e do Adolescente (FIA).', icone: '🧒', secreta: false },
      { id: 'guardiao_idoso', nome: 'Guardião da Pessoa Idosa', descricao: 'Destinou ao Fundo do Idoso.', icone: '🧓', secreta: false },
      { id: 'dupla_protecao', nome: 'Dupla Proteção', descricao: 'Destinou aos dois fundos no mesmo ciclo.', icone: '🛡️', secreta: false },
      { id: 'multiplicador', nome: 'Multiplicador', descricao: 'Teve 5 convites aceitos.', icone: '📣', secreta: false },
      { id: 'veterano_3', nome: 'Veterano 3 ciclos', descricao: 'Participou de 3 ciclos.', icone: '🥉', secreta: false },
      { id: 'veterano_5', nome: 'Veterano 5 ciclos', descricao: 'Participou de 5 ciclos.', icone: '🥈', secreta: false },
      { id: 'veterano_10', nome: 'Veterano 10 ciclos', descricao: 'Participou de 10 ciclos.', icone: '🥇', secreta: false },
      { id: 'pioneiro', nome: 'Pioneiro', descricao: 'Participava da Rede Solidária antes do app.', icone: '🧭', secreta: false },
      { id: 'conhecedor_guia', nome: 'Conhecedor do Guia', descricao: 'Concluiu o quiz do guia do IR.', icone: '📘', secreta: false },
      { id: 'explorador_projetos', nome: 'Explorador de Projetos', descricao: 'Conheceu 5 projetos apoiados.', icone: '🔭', secreta: false },
      { id: 'antecipado', nome: 'Antecipado', descricao: 'Destinou por doação direta até 31/12.', icone: '⏰', secreta: false },
      { id: 'embaixador', nome: 'Embaixador', descricao: 'Embaixador da Rede Solidária na sua unidade.', icone: '🎖️', secreta: false },
      { id: 'coracao_de_leao', nome: 'Coração de Leão', descricao: 'Família Solidária e Dupla Proteção no mesmo ciclo.', icone: '💙', secreta: true },
      { id: 'lenda_da_rede', nome: 'Rugido Lendário', descricao: 'Alcançou o nível máximo.', icone: '👑', secreta: true },
    ],
    usuarioInsignias: [],
    missoes: [
      { id: 'm_checkin', titulo: 'Fazer check-in', descricao: 'Passe pelo app e registre sua presença do dia.', xp: 10, recorrencia: 'diaria', criterio: 'checkin', meta: 1, publico: 'todos', ativa: true },
      { id: 'm_historia', titulo: 'Ler uma história de impacto', descricao: 'Abra o destaque de um projeto apoiado na página inicial.', xp: 15, recorrencia: 'diaria', criterio: 'ler_historia', meta: 1, publico: 'todos', ativa: true },
      { id: 'm_pergunta', titulo: 'Pergunta do dia', descricao: 'Responda a pergunta do dia do guia do IR.', xp: 20, recorrencia: 'diaria', criterio: 'pergunta_dia', meta: 1, publico: 'todos', ativa: true },
      { id: 'm_visitar', titulo: 'Visitar um projeto', descricao: 'Conheça a página de um projeto apoiado.', xp: 15, recorrencia: 'diaria', criterio: 'visitar_projeto', meta: 1, publico: 'todos', ativa: true },
      { id: 'm_convidar2', titulo: 'Convidar 2 colegas', descricao: 'Tenha 2 convites aceitos nesta semana.', xp: 120, recorrencia: 'semanal', criterio: 'convites_aceitos', meta: 2, publico: 'colaboradores', ativa: true },
      { id: 'm_compartilhar', titulo: 'Compartilhar uma conquista', descricao: 'Gere e compartilhe o card da sua conquista.', xp: 50, recorrencia: 'semanal', criterio: 'compartilhar', meta: 1, publico: 'todos', ativa: true },
      { id: 'm_quiz', titulo: 'Completar o quiz do guia', descricao: 'Responda o quiz do guia prático do IR.', xp: 80, recorrencia: 'semanal', criterio: 'quiz', meta: 1, publico: 'todos', ativa: true },
      { id: 'm_entidade', titulo: 'Conhecer uma entidade da sua cidade', descricao: 'Abra a página de uma entidade chancelada do seu município.', xp: 60, recorrencia: 'semanal', criterio: 'visitar_entidade_cidade', meta: 1, publico: 'todos', ativa: true },
      { id: 'm_familiar', titulo: 'Reportar destinação familiar', descricao: 'Envie o reporte de um familiar.', xp: 150, recorrencia: 'semanal', criterio: 'reporte_familiar', meta: 1, publico: 'colaboradores', ativa: true },
      { id: 'm_projetos_cidade', titulo: 'Conheça 3 projetos da sua cidade', descricao: 'Visite 3 projetos apoiados no seu município ou região.', xp: 100, recorrencia: 'sazonal', criterio: 'visitar_projetos_cidade', meta: 3, publico: 'todos', ativa: true },
      { id: 'm_antes_3112', titulo: 'Destine antes de 31/12', descricao: 'Envie o reporte de uma doação direta durante a Temporada Doação Direta.', xp: 150, recorrencia: 'sazonal', criterio: 'reporte_ate_prazo', meta: 1, publico: 'todos', temporadaId: 'tmp_doacao', ativa: true },
      { id: 'm_embaixador', titulo: 'Mobilizar a unidade', descricao: 'Exclusiva para embaixadores: tenha 5 convites aceitos na temporada.', xp: 150, recorrencia: 'sazonal', criterio: 'convites_aceitos', meta: 5, publico: 'embaixadores', ativa: true },
    ],
    usuarioMissoes: [],
    recompensas: [
      { id: 'rc_moldura_ciano', nome: 'Moldura Juba Ciano', descricao: 'Moldura de avatar em tons de ciano.', tipo: 'moldura', nivelMinimo: 2, estoque: null, icone: '🟦' },
      { id: 'rc_tema_ceu', nome: 'Tema Céu Claro', descricao: 'Tema claro com detalhes em ciano.', tipo: 'tema', nivelMinimo: 2, estoque: null, icone: '🎨' },
      { id: 'rc_moldura_escudo', nome: 'Moldura Escudo', descricao: 'Moldura com escudo de proteção.', tipo: 'moldura', nivelMinimo: 3, estoque: null, icone: '🛡️' },
      { id: 'rc_tema_noite', nome: 'Tema Noite Azul', descricao: 'Tema escuro em azul WEG.', tipo: 'tema', nivelMinimo: 4, estoque: null, icone: '🌙' },
      { id: 'rc_voucher_cafe', nome: 'Voucher café com a equipe DS (exemplo)', descricao: 'Um café com a equipe da Seção Desenvolvimento Social.', tipo: 'voucher', nivelMinimo: 3, estoque: 20, validoAte: '2027-05-31', icone: '☕' },
      { id: 'rc_visita', nome: 'Visita guiada a uma entidade apoiada', descricao: 'Conheça de perto um projeto que recebeu recursos.', tipo: 'experiencia', nivelMinimo: 5, estoque: 10, validoAte: '2027-06-30', icone: '🚌' },
      { id: 'rc_evento', nome: 'Convite especial para o evento de reconhecimento', descricao: 'Lugar reservado no evento anual da Rede Solidária.', tipo: 'experiencia', nivelMinimo: 4, estoque: 30, validoAte: '2027-07-31', icone: '🎟️' },
      { id: 'rc_voluntariado', nome: 'Ação do Coração Voluntário', descricao: 'Participação em uma ação de voluntariado.', tipo: 'experiencia', nivelMinimo: 2, insigniaRequerida: 'primeira_destinacao', estoque: 40, validoAte: '2027-05-31', icone: '🤝' },
      { id: 'rc_premiacao', nome: 'Homenagem Lenda da Rede', descricao: 'Reconhecimento no palco do evento anual.', tipo: 'premiacao', nivelMinimo: 6, estoque: 5, icone: '🏆' },
    ],
    resgates: [],
    convites: [],
    pins: [],
    usuarioPins: [],
    notificacoes: [],
    configuracoes: {
      cicloAtivo: 2027,
      tabelaXp: {
        primeiraDestinacao: 500,
        bonusPrimeiraVida: 250,
        destinacaoAdicional: 200,
        destinacaoFamiliar: 300,
        doacaoCarta: 400,
        conviteAceito: 100,
        bonusPadrinho: 200,
        limiteDiarioMissoes: 50,
        quiz: 50,
        perfilCompleto: 50,
        bonusConsecutivoPct: 10,
        bonusConsecutivoMaxPct: 50,
      },
      guia: { pctFia: 3, pctIdoso: 3, pctGlobalDoacaoDireta: 6, revisadoFiscal: false },
      marcos: [
        { pct: 25, titulo: 'Primeiro quarto da meta', conteudo: 'Vídeo de agradecimento da Associação Crescer Juntos liberado.' },
        { pct: 50, titulo: 'Metade do caminho', conteudo: 'Bastidores de um projeto apoiado liberados para todos.' },
        { pct: 75, titulo: 'Reta final', conteudo: 'Tema exclusivo do app liberado para todos os participantes.' },
        { pct: 100, titulo: 'Meta WEG alcançada', conteudo: 'Mensagem especial do leãozinho e moldura comemorativa para todos.' },
      ],
      limiteConvitesDia: 20,
      limiteLoteConvites: 10,
      conviteBaseUrl: 'https://rede-solidaria.weg.net/convite',
    },
    log: [],
    visitas: [],
  }

  // Pins: um por edição desde 2011. Só 2026 tem arte oficial; os demais são modelos procedurais.
  for (let ano = 2011; ano <= 2027; ano++) {
    const [base, relevo] = PALETA[ano % PALETA.length]
    b.pins.push({
      ano,
      titulo: `Pin ${ano}`,
      descricao:
        ano === 2026
          ? 'Pin entregue em 2026 aos 211 colaboradores que reportaram a destinação. Leãozinho azul e selo WEG 65 anos.'
          : ano === 2027
            ? 'Pin da edição em andamento. Arte oficial a definir; desbloqueie com a sua primeira destinação validada no ciclo.'
            : `Pin da edição ${ano} da Rede Solidária (modelo ilustrativo até o envio da arte original).`,
      arte: ano === 2026 ? 'pin-2026' : undefined,
      corBase: base,
      corRelevo: relevo,
    })
  }

  // Usuários de teste dos perfis + 26 colaboradores e convidados de exemplo
  const fixos: Partial<Usuario>[] = [
    { id: 'u_colab', nome: 'Camila Rodrigues', email: 'camila.rodrigues@weg.net', perfil: 'colaborador', unidadeId: 'un_a', municipio: 'Jaraguá do Sul', ciclosAnteriores: [2024, 2025, 2026], cpf: '123.456.789-09', endereco: 'Rua Exemplo, 100, Centro, Jaraguá do Sul/SC', telefone: '(47) 99999-0001' },
    { id: 'u_emb', nome: 'Rafael Tomaselli', email: 'rafael.tomaselli@weg.net', perfil: 'embaixador', unidadeId: 'un_b', municipio: 'Guaramirim', ciclosAnteriores: [2022, 2023, 2024, 2025, 2026] },
    { id: 'u_admin', nome: 'Equipe Desenvolvimento Social', email: 'ds@weg.net', perfil: 'admin', unidadeId: 'un_a', municipio: 'Jaraguá do Sul', ciclosAnteriores: [] },
    { id: 'u_conv', nome: 'Helena Rodrigues', email: 'helena.exemplo@gmail.com', perfil: 'convidado', municipio: 'Jaraguá do Sul', padrinhoEmail: 'camila.rodrigues@weg.net', vinculoStatus: 'aprovado', convidadoPor: 'u_colab', ciclosAnteriores: [] },
  ]
  const usuarios: Usuario[] = fixos.map((f) => completarUsuario(f))
  NOMES.forEach((nome, i) => {
    const convidado = i >= 22
    const m = MUNICIPIOS[i % 4].nome
    const unidade = unidades[i % 3]
    const anteriores = i % 5 === 0 ? [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] : i % 3 === 0 ? [2025, 2026] : i % 4 === 1 ? [2026] : []
    usuarios.push(
      completarUsuario({
        id: `u_${i + 1}`,
        nome,
        email: convidado ? `${slug(nome)}@exemplo.com` : `${slug(nome)}@weg.net`,
        perfil: convidado ? 'convidado' : i === 6 ? 'embaixador' : 'colaborador',
        unidadeId: convidado ? undefined : unidade.id,
        municipio: m,
        ciclosAnteriores: convidado ? [] : anteriores,
        padrinhoEmail: convidado ? (i % 2 ? 'rafael.tomaselli@weg.net' : 'camila.rodrigues@weg.net') : undefined,
        vinculoStatus: convidado ? (i === 25 ? 'pendente' : 'aprovado') : undefined,
        anonimo: i === 9,
      }),
    )
  })
  b.usuarios = usuarios

  // Pins físicos já recebidos antes do app viram pins digitais da coleção
  for (const u of usuarios) for (const ano of u.ciclosAnteriores) b.usuarioPins.push({ usuarioId: u.id, ano, em: `${ano}-07-15T12:00:00.000Z` })

  b.familiares.push(
    { id: 'fam_1', usuarioId: 'u_colab', nome: 'Marcelo Rodrigues', parentesco: 'conjuge', municipio: 'Jaraguá do Sul' },
    { id: 'fam_2', usuarioId: 'u_colab', nome: 'Sônia Rodrigues', parentesco: 'pai_mae', municipio: 'Guaramirim' },
    { id: 'fam_3', usuarioId: 'u_emb', nome: 'Patrícia Tomaselli', parentesco: 'conjuge', municipio: 'Guaramirim' },
  )

  // Reportes da edição ativa (2027) em todos os status
  let n = 0
  const novoReporte = (
    uid: string,
    valor: number,
    fundoTipo: TipoFundo,
    dia: number,
    status: StatusReporte,
    extra: Partial<Reporte> = {},
  ) => {
    const u = usuarios.find((x) => x.id === uid)!
    const municipio = extra.municipio ?? u.municipio
    const r: Reporte = {
      id: `rep_${++n}`,
      usuarioId: uid,
      ciclo: 2027,
      modalidade: 'doacao_direta',
      fundoTipo,
      esfera: 'municipal',
      municipio,
      uf: 'SC',
      valor,
      dataPagamento: `2026-10-${String(dia).padStart(2, '0')}`,
      comprovanteIds: [],
      status: status === 'validado' || status === 'devolvido' || status === 'estornado' ? 'em_validacao' : status,
      historico: [{ status: 'enviado', em: `2026-10-${String(dia).padStart(2, '0')}T13:00:00.000Z` }],
      criadoEm: `2026-10-${String(dia).padStart(2, '0')}T13:00:00.000Z`,
      ...extra,
    }
    const comp = { id: `cmp_${n}`, nome: `comprovante-exemplo-${n}.pdf`, tipo: 'application/pdf', tamanho: 120000 + n * 1000, hash: `seed-${n}` }
    b.comprovantes.push(comp)
    r.comprovanteIds = [comp.id]
    b.reportes.push(r)
    return { r, final: status }
  }

  const lote = [
    novoReporte('u_colab', 450, 'FIA', 2, 'validado', { entidadeId: 'ent_1' }),
    novoReporte('u_colab', 300, 'IDOSO', 6, 'validado', { familiarId: 'fam_1' }),
    novoReporte('u_colab', 250, 'IDOSO', 14, 'em_validacao', { familiarId: 'fam_2', municipio: 'Guaramirim' }),
    novoReporte('u_emb', 600, 'FIA', 3, 'validado', { municipio: 'Guaramirim', entidadeId: 'ent_3' }),
    novoReporte('u_emb', 350, 'IDOSO', 9, 'validado', { municipio: 'Guaramirim' }),
    novoReporte('u_conv', 150, 'FIA', 16, 'aguardando_padrinho'),
    novoReporte('u_1', 1200, 'FIA', 1, 'validado'),
    novoReporte('u_2', 380, 'IDOSO', 2, 'validado', { municipio: 'Guaramirim' }),
    novoReporte('u_3', 520, 'FIA', 4, 'validado', { municipio: 'Joinville', entidadeId: 'ent_5' }),
    novoReporte('u_4', 290, 'IDOSO', 5, 'validado', { municipio: 'Itajaí' }),
    novoReporte('u_5', 800, 'FIA', 6, 'validado'),
    novoReporte('u_6', 210, 'FIA', 7, 'devolvido', { municipio: 'Guaramirim' }),
    novoReporte('u_7', 640, 'IDOSO', 8, 'validado', { municipio: 'Joinville' }),
    novoReporte('u_8', 330, 'FIA', 9, 'validado', { municipio: 'Itajaí', entidadeId: 'ent_7' }),
    novoReporte('u_9', 470, 'FIA', 10, 'em_validacao'),
    novoReporte('u_10', 900, 'IDOSO', 11, 'validado', { municipio: 'Guaramirim' }),
    novoReporte('u_11', 260, 'FIA', 12, 'enviado', { municipio: 'Joinville' }),
    novoReporte('u_12', 410, 'FIA', 13, 'validado', { municipio: 'Itajaí' }),
    novoReporte('u_13', 350, 'IDOSO', 13, 'estornado'),
    novoReporte('u_14', 720, 'FIA', 14, 'validado', { municipio: 'Guaramirim' }),
    novoReporte('u_15', 180, 'IDOSO', 15, 'enviado', { municipio: 'Joinville' }),
    novoReporte('u_16', 560, 'FIA', 15, 'validado', { municipio: 'Itajaí' }),
    novoReporte('u_17', 230, 'FIA', 16, 'em_validacao'),
    novoReporte('u_19', 610, 'IDOSO', 17, 'validado', { municipio: 'Joinville' }),
    novoReporte('u_21', 440, 'FIA', 17, 'em_validacao'),
    novoReporte('u_23', 130, 'IDOSO', 17, 'aguardando_padrinho', { municipio: 'Itajaí' }),
    novoReporte('u_25', 120, 'FIA', 18, 'validado'),
    novoReporte('u_26', 100, 'IDOSO', 18, 'aguardando_padrinho', { municipio: 'Guaramirim' }),
  ]
  for (const { r, final } of lote) {
    const em = r.criadoEm.replace('T13', 'T18')
    if (final === 'validado' || final === 'estornado') {
      r.historico.push({ status: 'em_validacao', em, por: 'u_admin' })
      validarReporte(b, r.id, 'u_admin', em)
      if (final === 'estornado') estornarReporte(b, r.id, 'Comprovante de outro exercício enviado por engano (exemplo).', 'u_admin')
    } else if (final === 'devolvido') {
      devolverReporte(b, r.id, 'O DARF enviado está ilegível. Envie uma nova imagem do comprovante.', 'u_admin')
    } else if (final === 'em_validacao') {
      r.historico.push({ status: 'em_validacao', em, por: 'u_admin' })
    } else if (final === 'aguardando_padrinho') {
      r.historico = [{ status: 'aguardando_padrinho', em: r.criadoEm }]
    }
  }

  // Convites, visitas e missões já feitas pelo usuário de teste
  const convites: [string, string, 'enviado' | 'aceito' | 'reportou', string?][] = [
    ['u_colab', 'helena.exemplo@gmail.com', 'reportou', 'u_conv'],
    ['u_colab', 'colega1@weg.net', 'aceito'],
    ['u_colab', 'colega2@weg.net', 'enviado'],
    ['u_emb', 'colega3@weg.net', 'aceito'],
    ['u_emb', 'colega4@weg.net', 'aceito'],
    ['u_emb', 'colega5@weg.net', 'aceito'],
    ['u_emb', 'colega6@weg.net', 'enviado'],
  ]
  convites.forEach(([uid, contato, status, convidadoId], i) => {
    b.convites.push({ id: `cnv_${i + 1}`, usuarioId: uid, contato, canal: 'email', tipo: contato.includes('gmail') ? 'familiar' : 'colega', status, convidadoId, em: `2026-10-0${(i % 9) + 1}T12:00:00.000Z` })
    if (status !== 'enviado') creditarXp(b, uid, b.configuracoes.tabelaXp.conviteAceito, 'convite_aceito', `Convite aceito (${contato})`, { em: `2026-10-0${(i % 9) + 1}T15:00:00.000Z` })
  })
  b.convites[0].status = 'reportou'

  for (const u of usuarios) verificarInsignias(b, u.id, 2027)

  // Notificações do seed: começam limpas, com alguns avisos de exemplo
  b.notificacoes = []
  b.notificacoes.push(
    { id: 'ntf_s1', usuarioId: 'u_colab', titulo: 'Reporte validado', texto: 'Sua destinação ao FIA de Jaraguá do Sul foi validada.', tipo: 'reporte', link: '/reportes/rep_1', lida: false, em: '2026-10-02T18:00:00.000Z' },
    { id: 'ntf_s2', usuarioId: 'u_colab', titulo: 'Faltam 72 dias para 31/12', texto: 'Doações diretas aos fundos podem ser feitas até 31/12.', tipo: 'prazo', link: '/guia', lida: false, em: '2026-10-20T09:00:00.000Z' },
    { id: 'ntf_s3', usuarioId: 'u_colab', titulo: 'Aprovação pendente', texto: 'Helena Rodrigues enviou um reporte e aguarda sua aprovação como madrinha/padrinho.', tipo: 'padrinho', link: '/padrinho', lida: false, em: '2026-10-16T13:05:00.000Z' },
    { id: 'ntf_s4', usuarioId: 'u_emb', titulo: 'Nova missão de embaixador', texto: 'Mobilize sua unidade: 5 convites aceitos nesta temporada.', tipo: 'missao', link: '/missoes', lida: false, em: '2026-10-01T09:00:00.000Z' },
    { id: 'ntf_s5', usuarioId: 'u_admin', titulo: 'Fila de validação', texto: 'Há reportes aguardando análise.', tipo: 'reporte', link: '/admin/validacao', lida: false, em: '2026-10-19T09:00:00.000Z' },
  )
  b.log = b.log.slice(0, 200)
  return b
}

function slug(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim()
    .replace(/\s+/g, '.')
}

function completarUsuario(f: Partial<Usuario>): Usuario {
  return {
    id: f.id!,
    nome: f.nome!,
    email: f.email!,
    perfil: f.perfil ?? 'colaborador',
    unidadeId: f.unidadeId,
    municipio: f.municipio ?? 'Jaraguá do Sul',
    uf: 'SC',
    avatar: undefined,
    cpf: f.cpf,
    endereco: f.endereco,
    telefone: f.telefone,
    anonimo: f.anonimo ?? false,
    consentimentoLgpd: '2026-10-01T12:00:00.000Z',
    padrinhoEmail: f.padrinhoEmail,
    vinculoStatus: f.vinculoStatus,
    codigoConvite: (f.id ?? 'x').replace('u_', 'RS').toUpperCase() + '26',
    convidadoPor: f.convidadoPor,
    ciclosAnteriores: f.ciclosAnteriores ?? [],
    notificacoes: { email: true, push: true, prazos: true },
    criadoEm: '2026-10-01T12:00:00.000Z',
  }
}

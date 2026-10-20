import type { Banco, Fundo, Genero, Reporte, StatusReporte, TipoFundo, Usuario } from '@/domain/types'
import { validarReporte, devolverReporte, estornarReporte } from '@/domain/regras'
import { creditarXp, registrarEvento, avaliarInsignias, publicarNoMural } from '@/domain/motor'
import { ECONOMIA, INSIGNIAS, ITENS, MISSOES, NIVEIS, RECOMPENSAS, TEMPORADAS, TIERS } from '@/domain/catalogo'
import { LICOES_GUIA } from '@/domain/conteudo'

// Dados fictícios e identificados como exemplo. Cobrem usuários em todos os tiers
// (inclusive com estrelas de prestígio), 3 alcateias, trilha em andamento, itens
// de todas as raridades e reportes de convidado em todos os status.

export const VERSAO_SEED = 3

const MUNICIPIOS = [
  { nome: 'Jaraguá do Sul', lat: -26.4851, lng: -49.0713 },
  { nome: 'Guaramirim', lat: -26.4731, lng: -49.0026 },
  { nome: 'Joinville', lat: -26.3045, lng: -48.8487 },
  { nome: 'Itajaí', lat: -26.9101, lng: -48.6705 },
]

function fundosDe(municipio: string, i: number): Fundo[] {
  const base = 10 + i
  return [
    {
      id: `fundo_fia_${i}`,
      tipo: 'FIA',
      nome: `Fundo Municipal dos Direitos da Criança e do Adolescente de ${municipio}`,
      conselho: 'CMDCA',
      conselhoNome: `Conselho Municipal dos Direitos da Criança e do Adolescente de ${municipio} (CMDCA)`,
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
      conselho: 'CMDPI',
      conselhoNome: `Conselho Municipal dos Direitos da Pessoa Idosa de ${municipio} (CMDPI)`,
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

const ENTIDADES: { nome: string; fantasia: string; m: number; publico: TipoFundo; projeto: string; desc: string; autorizado: number; semChancela?: boolean }[] = [
  { nome: 'Associação Crescer Juntos (exemplo)', fantasia: 'Crescer Juntos', m: 0, publico: 'FIA', projeto: 'Contraturno Esportivo e Cultural', desc: 'Atividades no contraturno escolar para crianças de 6 a 14 anos, com esporte, música e reforço escolar.', autorizado: 180000 },
  { nome: 'Instituto Raízes do Amanhã (exemplo)', fantasia: 'Raízes do Amanhã', m: 0, publico: 'IDOSO', projeto: 'Envelhecer Ativo', desc: 'Oficinas de convivência, atividade física e inclusão digital para pessoas idosas.', autorizado: 120000 },
  { nome: 'Lar Esperança (exemplo)', fantasia: 'Lar Esperança', m: 1, publico: 'FIA', projeto: 'Acolher com Afeto', desc: 'Acolhimento institucional e fortalecimento de vínculos familiares.', autorizado: 150000 },
  { nome: 'Centro de Convivência Bem Viver (exemplo)', fantasia: 'Bem Viver', m: 1, publico: 'IDOSO', projeto: 'Memória Viva', desc: 'Estimulação cognitiva e rodas de memória com pessoas idosas da comunidade.', autorizado: 90000 },
  { nome: 'Associação Aprender e Brincar (exemplo)', fantasia: 'Aprender e Brincar', m: 2, publico: 'FIA', projeto: 'Primeira Infância em Foco', desc: 'Apoio ao desenvolvimento infantil de 0 a 6 anos e orientação às famílias.', autorizado: 200000 },
  { nome: 'Casa do Avô Feliz (exemplo)', fantasia: 'Avô Feliz', m: 2, publico: 'IDOSO', projeto: 'Cuidar de Quem Cuidou', desc: 'Atendimento multiprofissional e apoio a cuidadores familiares.', autorizado: 110000 },
  { nome: 'Instituto Maré Jovem (exemplo)', fantasia: 'Maré Jovem', m: 3, publico: 'FIA', projeto: 'Jovem Aprendiz do Mar', desc: 'Qualificação profissional para adolescentes de 14 a 17 anos.', autorizado: 160000 },
  { nome: 'Associação Melhor Idade Litoral (exemplo)', fantasia: 'Melhor Idade Litoral', m: 3, publico: 'IDOSO', projeto: 'Movimento e Saúde', desc: 'Hidroginástica, caminhadas orientadas e acompanhamento de saúde.', autorizado: 80000 },
  { nome: 'Escola de Música Pequenos Acordes (exemplo)', fantasia: 'Pequenos Acordes', m: 0, publico: 'FIA', projeto: 'Orquestra na Comunidade', desc: 'Iniciação musical gratuita para crianças e adolescentes.', autorizado: 95000, semChancela: true },
  { nome: 'Associação Mãos que Cuidam (exemplo)', fantasia: 'Mãos que Cuidam', m: 1, publico: 'IDOSO', projeto: 'Cuidado em Casa', desc: 'Visitas domiciliares de apoio a pessoas idosas que vivem sozinhas.', autorizado: 70000 },
  { nome: 'Instituto Futuro em Rede (exemplo)', fantasia: 'Futuro em Rede', m: 2, publico: 'FIA', projeto: 'Robótica nas Escolas', desc: 'Oficinas de robótica e programação em escolas públicas.', autorizado: 130000 },
  { nome: 'Casa Ancoradouro (exemplo)', fantasia: 'Ancoradouro', m: 3, publico: 'FIA', projeto: 'Porto Seguro', desc: 'Convivência e fortalecimento de vínculos para adolescentes.', autorizado: 85000 },
]

const PROJETOS: { e: number; area: string; publico: string; valor: number; ano: number; mes: number; ods: number[]; ben: number; status: 'em_execucao' | 'concluido'; origem: 'empresa' | 'colaboradores' | 'ambos'; ind: string[]; nome?: string }[] = [
  { e: 0, area: 'Esporte e cultura', publico: 'Crianças de 6 a 14 anos', valor: 85000, ano: 2025, mes: 6, ods: [3, 4, 10], ben: 240, status: 'em_execucao', origem: 'ambos', ind: ['240 crianças atendidas', '92% de frequência escolar', '12 oficinas por semana'] },
  { e: 1, area: 'Saúde e convivência', publico: 'Pessoas idosas', valor: 60000, ano: 2025, mes: 8, ods: [3, 10], ben: 130, status: 'em_execucao', origem: 'colaboradores', ind: ['130 pessoas idosas', '3 turmas de inclusão digital'] },
  { e: 2, area: 'Assistência social', publico: 'Crianças e adolescentes acolhidos', valor: 70000, ano: 2025, mes: 4, ods: [1, 10, 16], ben: 45, status: 'concluido', origem: 'empresa', ind: ['45 crianças acolhidas', '18 famílias reintegradas'] },
  { e: 4, area: 'Educação', publico: 'Primeira infância (0 a 6 anos)', valor: 95000, ano: 2026, mes: 3, ods: [4, 5], ben: 310, status: 'em_execucao', origem: 'ambos', ind: ['310 crianças', '200 famílias orientadas'] },
  { e: 5, area: 'Saúde', publico: 'Pessoas idosas e cuidadores', valor: 55000, ano: 2026, mes: 5, ods: [3], ben: 90, status: 'em_execucao', origem: 'empresa', ind: ['90 atendimentos mensais', '40 cuidadores capacitados'] },
  { e: 6, area: 'Qualificação profissional', publico: 'Adolescentes de 14 a 17 anos', valor: 78000, ano: 2026, mes: 2, ods: [4, 8], ben: 60, status: 'em_execucao', origem: 'colaboradores', ind: ['60 jovens em formação', '35% já contratados'] },
  { e: 8, area: 'Cultura', publico: 'Crianças de 7 a 15 anos', valor: 40000, ano: 2026, mes: 4, ods: [4, 10], ben: 80, status: 'em_execucao', origem: 'colaboradores', ind: ['80 alunos', '2 apresentações por semestre'] },
  { e: 0, area: 'Esporte', publico: 'Adolescentes', valor: 52000, ano: 2026, mes: 7, ods: [3, 4], ben: 150, status: 'em_execucao', origem: 'empresa', ind: ['150 adolescentes', '4 modalidades'], nome: 'Atletas do Futuro' },
  { e: 1, area: 'Inclusão digital', publico: 'Pessoas idosas', valor: 30000, ano: 2026, mes: 6, ods: [4, 10], ben: 70, status: 'em_execucao', origem: 'colaboradores', ind: ['70 pessoas idosas conectadas'], nome: 'Vovô Conectado' },
  { e: 9, area: 'Saúde', publico: 'Pessoas idosas que vivem sozinhas', valor: 35000, ano: 2025, mes: 9, ods: [3, 10], ben: 55, status: 'concluido', origem: 'ambos', ind: ['55 famílias visitadas', '1.200 visitas no ano'] },
  { e: 10, area: 'Educação', publico: 'Estudantes de 10 a 16 anos', valor: 64000, ano: 2026, mes: 3, ods: [4, 9], ben: 220, status: 'em_execucao', origem: 'empresa', ind: ['220 estudantes', '8 escolas'] },
  { e: 11, area: 'Assistência social', publico: 'Adolescentes', valor: 38000, ano: 2025, mes: 11, ods: [1, 10, 16], ben: 40, status: 'concluido', origem: 'colaboradores', ind: ['40 adolescentes acompanhados'] },
  { e: 3, area: 'Saúde', publico: 'Pessoas idosas', valor: 28000, ano: 2026, mes: 8, ods: [3], ben: 65, status: 'em_execucao', origem: 'empresa', ind: ['65 participantes', 'Rodas semanais'], nome: 'Memória em Movimento' },
  { e: 7, area: 'Esporte e saúde', publico: 'Pessoas idosas', valor: 33000, ano: 2026, mes: 1, ods: [3, 14], ben: 120, status: 'em_execucao', origem: 'ambos', ind: ['120 participantes', '3 praias atendidas'], nome: 'Caminhada à Beira-Mar' },
]

const PALETA: [string, string][] = [
  ['#095BA7', '#00BEDF'], ['#0063A7', '#9BD3F0'], ['#00325C', '#00BEDF'], ['#1C6E8C', '#C9E7F2'],
  ['#2A4D8F', '#A8C8F0'], ['#00577A', '#7FDBEA'], ['#123E6B', '#58B9E0'], ['#0B4F8A', '#E2B33B'],
]

// Pessoas de exemplo: nome, gênero do título escolhido no perfil, município, unidade, edições anteriores e XP histórico.
const PESSOAS: [string, Genero, number, number, number[], number][] = [
  ['Ana Paula Schmitt', 'f', 0, 0, [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026], 32000], // Lenda com prestígio
  ['Bruno Kreutzfeld', 'm', 1, 1, [2021, 2022, 2023, 2024, 2025, 2026], 19500], // Lenda
  ['Carla Demarchi', 'f', 2, 2, [2020, 2022, 2023, 2024, 2025, 2026], 13800], // Guardiã
  ['Diego Wolf', 'm', 3, 0, [2023, 2024, 2025, 2026], 9200], // Protetor
  ['Eduarda Lenzi', 'f', 0, 1, [2024, 2025, 2026], 6100], // Protetora
  ['Felipe Hornburg', 'n', 1, 2, [2025, 2026], 3400], // Jovem
  ['Gabriela Piazera', 'f', 2, 0, [2024, 2025, 2026], 2600], // Jovem (embaixadora)
  ['Henrique Bauer', 'm', 3, 1, [2026], 1900],
  ['Isabela Marquardt', 'f', 0, 2, [2025, 2026], 1200],
  ['João Pedro Voigt', 'm', 1, 0, [], 0],
  ['Karina Stinghen', 'f', 2, 1, [2026], 800],
  ['Lucas Ristow', 'm', 3, 2, [], 0],
  ['Mariana Krüger', 'f', 0, 0, [2025, 2026], 1500],
  ['Nicolas Hafemann', 'm', 1, 1, [], 0],
  ['Olívia Schiochet', 'f', 2, 2, [2026], 650],
  ['Paulo Ehlert', 'm', 3, 0, [2023, 2024, 2025, 2026], 7400],
  ['Queila Rux', 'f', 0, 1, [], 0],
  ['Rafael Mahfud', 'm', 1, 2, [2026], 900],
  ['Sabrina Jung', 'f', 2, 0, [2024, 2025, 2026], 4100],
  ['Tiago Emmendoerfer', 'm', 3, 1, [], 0],
  ['Ursula Fiedler', 'f', 0, 2, [2022, 2023, 2024, 2025, 2026], 11900],
  ['Vinícius Doubrawa', 'm', 1, 0, [2025, 2026], 2100],
  ['Wanessa Kuhn', 'f', 2, 1, [], 0],
  ['Xavier Pradi', 'n', 3, 2, [2026], 450],
  ['Yasmin Lescowicz', 'f', 0, 0, [2025], 300],
  ['Zeca Menegotti', 'm', 1, 1, [], 0],
]

// d >= 1: dia de outubro de 2026; d <= 0: dias de setembro contados a partir de 30/09 (0 = 30/09)
const DATA = (d: number) => (d >= 1 ? `2026-10-${String(d).padStart(2, '0')}` : `2026-09-${String(30 + d).padStart(2, '0')}`)
const DIA = (d: number, h = 13) => `${DATA(d)}T${String(h).padStart(2, '0')}:00:00.000-03:00`

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
    resolucaoNumero: e.semChancela ? '' : `${String(i + 3).padStart(3, '0')}/2026`,
    resolucaoData: e.semChancela ? '' : `2026-0${(i % 6) + 2}-15`,
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
      idExterno: `EX-${p.ano}-${String(i + 101)}`,
      nome: p.nome ?? e.projetoChancelado,
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
      lat: m.lat + ((i % 3) - 1) * 0.012,
      lng: m.lng + ((i % 4) - 1.5) * 0.01,
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
    temporadas: structuredClone(TEMPORADAS),
    fundos,
    entidades,
    projetos,
    reportes: [],
    linksConvidado: [],
    comprovantes: [],
    cartas: [],
    eventos: [],
    transacoesXp: [],
    transacoesPatinhas: [],
    tiers: structuredClone(TIERS),
    niveis: structuredClone(NIVEIS),
    itens: structuredClone(ITENS),
    usuarioItens: [],
    insignias: structuredClone(INSIGNIAS),
    usuarioInsignias: [],
    missoes: structuredClone(MISSOES),
    usuarioMissoes: [],
    sorteios: [],
    usuarioTrilhas: [],
    recompensas: structuredClone(RECOMPENSAS),
    resgates: [],
    convites: [],
    pins: [],
    usuarioPins: [],
    alcateias: [],
    alcateiaMembros: [],
    mural: [],
    reacoes: [],
    votos: [],
    notificacoes: [],
    configuracoes: {
      cicloAtivo: 2027,
      tabelaXp: {
        primeiraDestinacao: 500,
        bonusPrimeiraVida: 250,
        destinacaoAdicional: 200,
        destinacaoFamiliar: 300,
        reporteConvidado: 200,
        doacaoCarta: 400,
        conviteAceito: 100,
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
      ...structuredClone(ECONOMIA),
      relampagos: [
        { id: 'rel_reta_final', nome: 'Reta final do ano: XP em dobro nas missões educativas', inicio: '2026-12-17T00:00:00-03:00', fim: '2026-12-31T23:59:59-03:00', multiplicadorEducativo: 2 },
        { id: 'rel_voluntariado', nome: 'Dia Internacional do Voluntariado', inicio: '2026-12-05T00:00:00-03:00', fim: '2026-12-05T23:59:59-03:00', multiplicadorEducativo: 2 },
      ],
    },
    log: [],
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

  // ---------------------------------------------------------------- pessoas
  const fixos: Partial<Usuario>[] = [
    { id: 'u_colab', nome: 'Camila Rodrigues', genero: 'f', email: 'camila.rodrigues@weg.net', perfil: 'colaborador', unidadeId: 'un_a', municipio: 'Jaraguá do Sul', ciclosAnteriores: [2024, 2025, 2026], cpf: '123.456.789-09', endereco: 'Rua Exemplo, 100, Centro, Jaraguá do Sul/SC', telefone: '(47) 99999-0001' },
    { id: 'u_emb', nome: 'Rafael Tomaselli', genero: 'm', email: 'rafael.tomaselli@weg.net', perfil: 'embaixador', unidadeId: 'un_b', municipio: 'Guaramirim', ciclosAnteriores: [2022, 2023, 2024, 2025, 2026] },
    { id: 'u_admin', nome: 'Equipe Desenvolvimento Social', genero: 'n', email: 'ds@weg.net', perfil: 'admin', unidadeId: 'un_a', municipio: 'Jaraguá do Sul', ciclosAnteriores: [] },
  ]
  const usuarios: Usuario[] = fixos.map(completarUsuario)
  PESSOAS.forEach(([nome, genero, m, un, anteriores], i) => {
    usuarios.push(
      completarUsuario({
        id: `u_${i + 1}`,
        nome,
        genero,
        email: `${slug(nome)}@weg.net`,
        perfil: i === 6 ? 'embaixador' : 'colaborador',
        unidadeId: unidades[un].id,
        municipio: MUNICIPIOS[m].nome,
        ciclosAnteriores: anteriores,
        anonimo: i === 9,
        ocultarMural: i === 13,
      }),
    )
  })
  b.usuarios = usuarios

  // Pins físicos já recebidos antes do app viram pins digitais da coleção
  for (const u of usuarios) for (const ano of u.ciclosAnteriores) b.usuarioPins.push({ usuarioId: u.id, ano, em: `${ano}-07-15T12:00:00.000Z` })

  // XP histórico das edições anteriores (participações antes do app), distribuído por edição
  const historico: Record<string, number> = { u_colab: 900, u_emb: 4800 }
  PESSOAS.forEach(([, , , , , xp], i) => (historico[`u_${i + 1}`] = xp))
  for (const u of usuarios) {
    const total = historico[u.id] ?? 0
    if (!total || !u.ciclosAnteriores.length) continue
    const porEdicao = Math.round(total / u.ciclosAnteriores.length)
    for (const ano of u.ciclosAnteriores) creditarXp(b, u.id, porEdicao, 'ajuste', `Participação na edição ${ano} (histórico anterior ao app, exemplo)`, { ciclo: ano, em: `${ano}-06-30T12:00:00.000Z` })
  }

  b.familiares.push(
    { id: 'fam_1', usuarioId: 'u_colab', nome: 'Marcelo Rodrigues', parentesco: 'conjuge', municipio: 'Jaraguá do Sul' },
    { id: 'fam_2', usuarioId: 'u_colab', nome: 'Sônia Rodrigues', parentesco: 'pai_mae', municipio: 'Guaramirim' },
    { id: 'fam_3', usuarioId: 'u_emb', nome: 'Patrícia Tomaselli', parentesco: 'conjuge', municipio: 'Guaramirim' },
    { id: 'fam_4', usuarioId: 'u_1', nome: 'Roberto Schmitt', parentesco: 'conjuge', municipio: 'Jaraguá do Sul' },
    { id: 'fam_5', usuarioId: 'u_1', nome: 'Lia Schmitt', parentesco: 'filho', municipio: 'Jaraguá do Sul' },
  )

  // ---------------------------------------------------------------- alcateias
  b.alcateias.push(
    { id: 'alc_1', nome: 'Leões do Parque Fabril', emblema: '🦁', criadorId: 'u_1', metaSemanal: 30, criadaEm: DIA(1, 9), oculta: false },
    { id: 'alc_2', nome: 'Turno da Manhã', emblema: '🌅', criadorId: 'u_emb', metaSemanal: 25, criadaEm: DIA(2, 9), oculta: false },
    { id: 'alc_3', nome: 'Alcateia do Litoral', emblema: '🌊', criadorId: 'u_4', metaSemanal: 20, criadaEm: DIA(3, 9), oculta: false },
  )
  const membros: [string, string][] = [
    ['alc_1', 'u_1'], ['alc_1', 'u_colab'], ['alc_1', 'u_5'], ['alc_1', 'u_13'], ['alc_1', 'u_9'], ['alc_1', 'u_17'],
    ['alc_2', 'u_emb'], ['alc_2', 'u_2'], ['alc_2', 'u_6'], ['alc_2', 'u_10'], ['alc_2', 'u_14'],
    ['alc_3', 'u_4'], ['alc_3', 'u_8'], ['alc_3', 'u_16'], ['alc_3', 'u_20'], ['alc_3', 'u_12'],
  ]
  for (const [alcateiaId, usuarioId] of membros) {
    b.alcateiaMembros.push({ alcateiaId, usuarioId, em: DIA(3, 10) })
    registrarEvento(b, usuarioId, 'alcateia_entrou', { ref: alcateiaId }, { chave: alcateiaId, em: DIA(3, 10) })
  }

  // ---------------------------------------------------------------- reportes da edição 2027 (todos os status)
  let n = 0
  const novoReporte = (uid: string, valor: number, fundoTipo: TipoFundo, dia: number, final: StatusReporte, extra: Partial<Reporte> = {}) => {
    const u = usuarios.find((x) => x.id === uid)!
    const r: Reporte = {
      id: `rep_${++n}`,
      usuarioId: uid,
      ciclo: 2027,
      modalidade: 'doacao_direta',
      fundoTipo,
      esfera: 'municipal',
      municipio: u.municipio,
      uf: 'SC',
      valor,
      dataPagamento: DATA(dia),
      comprovanteIds: [],
      status: 'enviado',
      historico: [{ status: 'enviado', em: DIA(dia) }],
      criadoEm: DIA(dia),
      ...extra,
    }
    const comp = { id: `cmp_${n}`, nome: `comprovante-exemplo-${n}.pdf`, tipo: 'application/pdf', tamanho: 120000 + n * 1000, hash: `seed-${n}` }
    b.comprovantes.push(comp)
    r.comprovanteIds = [comp.id]
    b.reportes.push(r)
    lote.push({ r, final })
  }
  const lote: { r: Reporte; final: StatusReporte }[] = []

  novoReporte('u_colab', 450, 'FIA', -18, 'validado', { entidadeId: 'ent_1' })
  novoReporte('u_colab', 300, 'IDOSO', -12, 'validado', { familiarId: 'fam_1' })
  novoReporte('u_colab', 250, 'IDOSO', 14, 'em_validacao', { familiarId: 'fam_2', municipio: 'Guaramirim' })
  novoReporte('u_emb', 600, 'FIA', 3, 'validado', { entidadeId: 'ent_3' })
  novoReporte('u_emb', 350, 'IDOSO', 9, 'validado', { familiarId: 'fam_3' })
  novoReporte('u_1', 1200, 'FIA', 1, 'validado')
  novoReporte('u_1', 400, 'IDOSO', 4, 'validado', { familiarId: 'fam_4' })
  novoReporte('u_1', 300, 'FIA', 5, 'validado', { familiarId: 'fam_5' })
  novoReporte('u_2', 380, 'IDOSO', 2, 'validado')
  novoReporte('u_3', 520, 'FIA', 4, 'validado', { entidadeId: 'ent_5' })
  novoReporte('u_4', 290, 'IDOSO', 5, 'validado')
  novoReporte('u_5', 800, 'FIA', 6, 'validado')
  novoReporte('u_6', 210, 'FIA', 7, 'devolvido')
  novoReporte('u_7', 640, 'IDOSO', 8, 'validado')
  novoReporte('u_8', 330, 'FIA', 9, 'validado', { entidadeId: 'ent_7' })
  novoReporte('u_9', 470, 'FIA', 10, 'em_validacao')
  novoReporte('u_10', 900, 'IDOSO', 11, 'validado')
  novoReporte('u_11', 260, 'FIA', 12, 'enviado')
  novoReporte('u_12', 410, 'FIA', 13, 'validado')
  novoReporte('u_13', 350, 'IDOSO', 13, 'estornado')
  novoReporte('u_14', 720, 'FIA', 14, 'validado')
  novoReporte('u_15', 180, 'IDOSO', 15, 'enviado')
  novoReporte('u_16', 560, 'FIA', 15, 'validado')
  novoReporte('u_17', 230, 'FIA', 16, 'em_validacao')
  novoReporte('u_19', 610, 'IDOSO', 17, 'validado')
  novoReporte('u_21', 440, 'FIA', 17, 'validado')

  // Reportes de convidado (sem conta): XP vai para o colaborador. Todos os status.
  const link = { id: 'lnk_camila', usuarioId: 'u_colab', codigo: 'CAMILA1', criadoEm: DIA(5, 9), ativo: true, envios: [] as { em: string; dispositivo: string }[] }
  const linkRafael = { id: 'lnk_rafael', usuarioId: 'u_emb', codigo: 'RAFAEL7', criadoEm: DIA(4, 9), ativo: true, envios: [] as { em: string; dispositivo: string }[] }
  b.linksConvidado.push(link, linkRafael)
  registrarEvento(b, 'u_colab', 'link_convidado_gerado', { ref: link.id }, { chave: link.id, em: DIA(5, 9) })
  registrarEvento(b, 'u_emb', 'link_convidado_gerado', { ref: linkRafael.id }, { chave: linkRafael.id, em: DIA(4, 9) })
  const conv = (nome: string, relacao: 'amigo' | 'familiar' | 'vizinho' | 'outro', l: typeof link, lancado = false) => ({ nome, relacao, linkId: lancado ? undefined : l.id, lancadoPeloColaborador: lancado })
  novoReporte('u_colab', 150, 'FIA', 16, 'aguardando_colaborador', { convidado: conv('Helena Rodrigues', 'familiar', link) })
  novoReporte('u_colab', 200, 'IDOSO', 10, 'validado', { convidado: conv('Jorge Almeida', 'vizinho', link) })
  novoReporte('u_colab', 120, 'FIA', 18, 'em_validacao', { convidado: conv('Paula Nunes', 'amigo', link) })
  novoReporte('u_colab', 90, 'FIA', 12, 'recusado_colaborador', { convidado: conv('Remetente desconhecido', 'outro', link) })
  novoReporte('u_emb', 180, 'FIA', 11, 'devolvido', { convidado: conv('Marta Silveira', 'amigo', linkRafael) })
  novoReporte('u_emb', 250, 'IDOSO', 8, 'validado', { convidado: conv('Ivo Tomaselli', 'familiar', linkRafael, true) })
  novoReporte('u_emb', 100, 'FIA', 17, 'enviado', { convidado: conv('Tânia Becker', 'vizinho', linkRafael) })
  novoReporte('u_1', 130, 'IDOSO', 9, 'estornado', { convidado: conv('Carlos Pires', 'amigo', link, true) })
  link.envios.push({ em: DIA(10), dispositivo: 'exemplo-1' }, { em: DIA(12), dispositivo: 'exemplo-2' }, { em: DIA(16), dispositivo: 'exemplo-3' }, { em: DIA(18), dispositivo: 'exemplo-4' })

  for (const { r, final } of lote) {
    const em = r.criadoEm.replace('T13', 'T18')
    if (r.convidado && !r.convidado.lancadoPeloColaborador) {
      r.status = 'aguardando_colaborador'
      r.historico = [{ status: 'aguardando_colaborador', em: r.criadoEm, nota: `Enviado por ${r.convidado.nome} pelo link de convidado` }]
      if (final === 'aguardando_colaborador') continue
      if (final === 'recusado_colaborador') {
        r.status = 'recusado_colaborador'
        r.historico.push({ status: 'recusado_colaborador', em, por: r.usuarioId, nota: 'Não conheço quem enviou' })
        continue
      }
      r.status = 'enviado'
      r.historico.push({ status: 'enviado', em, por: r.usuarioId, nota: 'Confirmado pelo colaborador' })
    }
    if (final === 'enviado') continue
    r.status = 'em_validacao'
    r.historico.push({ status: 'em_validacao', em, por: 'u_admin' })
    if (final === 'validado' || final === 'estornado') {
      validarReporte(b, r.id, 'u_admin', em)
      if (final === 'estornado') estornarReporte(b, r.id, 'Comprovante de outro exercício enviado por engano (exemplo).', 'u_admin')
    } else if (final === 'devolvido') {
      devolverReporte(b, r.id, 'O comprovante enviado está ilegível. Envie uma nova imagem.', 'u_admin')
    }
  }

  // ---------------------------------------------------------------- atividade recente (missões, trilha, insígnias)
  const atividade = (uid: string, d: number, municipio: string) => {
    registrarEvento(b, uid, 'checkin', {}, { chave: `checkin:2026-10-${String(d).padStart(2, '0')}`, em: DIA(d, 8) })
    for (const p of projetos.filter((_, i) => (i + d) % 3 === 0).slice(0, 2)) registrarEvento(b, uid, 'projeto_visitado', { ref: p.id, municipio: p.municipio, ods: p.ods, fundo: p.fundo }, { em: DIA(d, 9) })
    const e = entidades.find((x) => x.municipio === municipio)
    if (e) registrarEvento(b, uid, 'entidade_visitada', { ref: e.id, municipio }, { em: DIA(d, 10) })
    registrarEvento(b, uid, 'pergunta_do_dia_respondida', {}, { em: DIA(d, 11) })
    registrarEvento(b, uid, 'historia_lida', { ref: projetos[d % projetos.length].id }, { em: DIA(d, 12) })
  }
  const ativos = ['u_colab', 'u_1', 'u_2', 'u_3', 'u_5', 'u_emb', 'u_4', 'u_7', 'u_21', 'u_13']
  for (let d = 5; d <= 19; d++) for (const [i, uid] of ativos.entries()) if (uid === 'u_colab' ? d % 4 === 0 : (d + i) % 2 === 0 || uid === 'u_1') atividade(uid, d, usuarios.find((u) => u.id === uid)!.municipio)

  // lições do guia, quiz e compartilhamentos para quem está mais adiantado
  for (const uid of ['u_1', 'u_2', 'u_3']) {
    for (const [i, l] of LICOES_GUIA.entries()) registrarEvento(b, uid, 'licao_guia_concluida', { ref: l.id }, { chave: l.id, em: DIA(6 + i, 15) })
    registrarEvento(b, uid, 'quiz_concluido', { acertos: 6, total: 6, ciclo: 2027 }, { em: DIA(12, 16), premio: { xp: [{ xp: 50, origem: 'quiz', descricao: 'Quiz do guia concluído' }] } })
    for (let k = 0; k < 4; k++) registrarEvento(b, uid, 'conquista_compartilhada', {}, { em: DIA(8 + k, 17) })
  }
  registrarEvento(b, 'u_colab', 'licao_guia_concluida', { ref: 'licao-1' }, { chave: 'licao-1', em: DIA(7, 15) })
  registrarEvento(b, 'u_colab', 'licao_guia_concluida', { ref: 'licao-2' }, { chave: 'licao-2', em: DIA(9, 15) })
  registrarEvento(b, 'u_colab', 'perfil_completo', {}, { chave: 'perfil', em: DIA(2, 9), premio: { xp: [{ xp: 50, origem: 'perfil_completo', descricao: 'Perfil completo' }] } })

  // convites
  const convites: [string, string, 'enviado' | 'aceito'][] = [
    ['u_colab', 'colega1@weg.net', 'aceito'], ['u_colab', 'colega2@weg.net', 'enviado'], ['u_colab', 'colega3@weg.net', 'aceito'],
    ['u_emb', 'colega4@weg.net', 'aceito'], ['u_emb', 'colega5@weg.net', 'aceito'], ['u_emb', 'colega6@weg.net', 'aceito'], ['u_emb', 'colega7@weg.net', 'enviado'],
    ['u_1', 'colega8@weg.net', 'aceito'], ['u_1', 'colega9@weg.net', 'aceito'], ['u_1', 'colega10@weg.net', 'aceito'], ['u_1', 'colega11@weg.net', 'aceito'], ['u_1', 'colega12@weg.net', 'aceito'],
  ]
  convites.forEach(([uid, contato, status], i) => {
    const id = `cnv_${i + 1}`
    const em = DIA((i % 9) + 3, 14)
    b.convites.push({ id, usuarioId: uid, contato, canal: 'email', tipo: 'colega', status, em })
    registrarEvento(b, uid, 'convite_enviado', { ref: id }, { chave: id, em })
    if (status === 'aceito') {
      b.convites[b.convites.length - 1].status = 'aceito'
      registrarEvento(b, uid, 'convite_aceito', { ref: id }, { chave: id, em: em.replace('T14', 'T18'), premio: { xp: [{ xp: 100, origem: 'convite_aceito', descricao: `Convite aceito (${contato})` }] } })
    }
  })

  // compras na loja e itens de trilha (todas as raridades representadas)
  const dar = (uid: string, itemId: string, origem: 'compra' | 'trilha') => b.usuarioItens.push({ usuarioId: uid, itemId, origem, em: DIA(15) })
  dar('u_colab', 'cab_capacete', 'compra')
  dar('u_colab', 'pesc_cachecol', 'compra')
  dar('u_1', 'fundo_parque_fabril', 'compra')
  dar('u_1', 'estilo_epico', 'compra')
  dar('u_2', 'cab_fones', 'trilha')
  dar('u_3', 'rosto_oculos_protecao', 'compra')
  for (const [uid, itemId] of [['u_colab', 'cab_capacete'], ['u_colab', 'pesc_cachecol'], ['u_1', 'fundo_parque_fabril'], ['u_1', 'estilo_epico'], ['u_3', 'rosto_oculos_protecao']] as const) {
    const it = ITENS.find((x) => x.id === itemId)!
    const preco = it.raridade === 'lendaria' ? 0 : ECONOMIA.loja.precos[it.raridade]
    b.transacoesPatinhas.push({ id: `pt_seed_${uid}_${itemId}`, usuarioId: uid, patinhas: -preco, origem: 'compra', descricao: `Loja do Leão: ${it.nome}`, referencia: `compra:${itemId}`, em: DIA(15) })
  }
  const equipar = (uid: string, avatar: Usuario['avatar']) => (usuarios.find((u) => u.id === uid)!.avatar = { ...usuarios.find((u) => u.id === uid)!.avatar, ...avatar })
  equipar('u_colab', { cabeca: 'cab_capacete', pescoco: 'pesc_cachecol', juba: 'juba_ciano', moldura: 'moldura_filhote' })
  equipar('u_1', { cabeca: 'cab_coroa_folhas', juba: 'juba_dourada', moldura: 'moldura_lenda', fundo: 'fundo_parque_fabril', estilo_ranking: 'estilo_epico' })
  equipar('u_2', { juba: 'juba_dourada', cabeca: 'cab_fones', moldura: 'moldura_guardiao' })
  equipar('u_3', { juba: 'juba_prata', rosto: 'rosto_oculos_protecao', moldura: 'moldura_protetor' })
  for (const uid of ['u_colab', 'u_1', 'u_2', 'u_3']) registrarEvento(b, uid, 'item_equipado', { ref: 'avatar' }, { em: DIA(15, 18) })

  // trilha da temporada em andamento: degraus resgatados por quem já avançou
  b.usuarioTrilhas.push({ usuarioId: 'u_1', chave: 'tmp_doacao:2026:0', resgatados: [1, 2, 3, 4, 5, 6, 7, 8] }, { usuarioId: 'u_colab', chave: 'tmp_doacao:2026:0', resgatados: [1, 2, 3] })

  // títulos, vitrines e votos
  const perfilJogo = (uid: string, titulo: string, vitrine: string[]) => Object.assign(usuarios.find((u) => u.id === uid)!, { tituloEscolhido: titulo, vitrine })
  perfilJogo('u_1', 'veterano', ['veterano', 'multiplicador', 'familia_solidaria'])
  perfilJogo('u_colab', 'guardiao_infancia', ['primeira_destinacao', 'dupla_protecao', 'familia_solidaria'])
  perfilJogo('u_emb', 'embaixador', ['embaixador', 'multiplicador'])
  b.votos.push({ usuarioId: 'u_1', projetoId: 'prj_1', edicao: 2027, em: DIA(18) }, { usuarioId: 'u_2', projetoId: 'prj_4', edicao: 2027, em: DIA(18) }, { usuarioId: 'u_3', projetoId: 'prj_1', edicao: 2027, em: DIA(19) })
  b.resgates.push({ id: 'rsg_1', usuarioId: 'u_1', recompensaId: 'ri_pelucia', edicao: 2027, status: 'solicitado', em: DIA(19) })

  for (const u of usuarios) avaliarInsignias(b, u.id)

  // Mural e avisos de exemplo: começa com conquistas recentes e poucas notificações
  b.mural = []
  publicarNoMural(b, 'u_1', 'insignia', 'conquistou a insígnia Veterana III', '🏅', 'lendaria')
  publicarNoMural(b, 'u_2', 'tier', 'chegou ao tier Lenda', '🦁', 'epica')
  publicarNoMural(b, 'u_3', 'tier', 'chegou ao tier Leoa Guardiã', '🦁', 'epica')
  publicarNoMural(b, 'u_emb', 'insignia', 'conquistou a insígnia Multiplicador II', '📣', 'incomum')
  publicarNoMural(b, 'u_5', 'trilha', 'avançou 5 degraus na trilha da Temporada Doação Direta', '🏁', 'rara')
  b.mural.forEach((p, i) => (p.em = DIA(19 - i, 17)))
  b.reacoes.push({ postId: b.mural[0].id, usuarioId: 'u_2', adesivo: 'adesivo_aplauso', em: DIA(19, 18) }, { postId: b.mural[0].id, usuarioId: 'u_3', adesivo: 'adesivo_coracao', em: DIA(19, 19) })

  b.notificacoes = []
  b.notificacoes.push(
    { id: 'ntf_s1', usuarioId: 'u_colab', titulo: 'Reporte validado', texto: 'Sua destinação ao FIA de Jaraguá do Sul foi validada.', tipo: 'reporte', link: '/reportes/rep_1', lida: false, em: DIA(-18, 18) },
    { id: 'ntf_s2', usuarioId: 'u_colab', titulo: 'Faltam 72 dias para 31/12', texto: 'Doações diretas aos fundos podem ser feitas até 31/12.', tipo: 'prazo', link: '/guia', lida: false, em: DIA(20, 9) },
    { id: 'ntf_s3', usuarioId: 'u_colab', titulo: 'Reporte de convidado para confirmar', texto: 'Helena Rodrigues reportou uma destinação em seu nome.', tipo: 'convidado', link: '/convidados', lida: false, em: DIA(16, 13) },
    { id: 'ntf_s4', usuarioId: 'u_emb', titulo: 'Nova missão de embaixador', texto: 'Apresente a Rede Solidária à sua equipe.', tipo: 'missao', link: '/missoes', lida: false, em: DIA(1, 9) },
    { id: 'ntf_s5', usuarioId: 'u_admin', titulo: 'Fila de validação', texto: 'Há reportes aguardando análise.', tipo: 'reporte', link: '/admin/validacao', lida: false, em: DIA(19, 9) },
  )
  b.log = b.log.slice(0, 300)
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
    genero: f.genero ?? 'n',
    unidadeId: f.unidadeId,
    municipio: f.municipio ?? 'Jaraguá do Sul',
    uf: 'SC',
    cpf: f.cpf,
    endereco: f.endereco,
    telefone: f.telefone,
    anonimo: f.anonimo ?? false,
    ocultarMural: f.ocultarMural ?? false,
    sons: false,
    usarFoto: false,
    consentimentoLgpd: '2026-10-01T12:00:00.000Z',
    codigoConvite: (f.id ?? 'x').replace('u_', 'RS').toUpperCase() + '27',
    convidadoPor: f.convidadoPor,
    ciclosAnteriores: f.ciclosAnteriores ?? [],
    notificacoes: { email: true, push: true, prazos: true },
    avatar: { juba: 'juba_classica', fundo: 'fundo_gradiente', tema: 'tema_claro', efeito: 'efeito_confete' },
    tituloEscolhido: 'nivel',
    vitrine: [],
    criadoEm: '2026-10-01T12:00:00.000Z',
  }
}

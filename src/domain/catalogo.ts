import type {
  CategoriaItem,
  Configuracoes,
  Flexao,
  Insignia,
  Item,
  Missao,
  Nivel,
  Raridade,
  RecompensaInstitucional,
  Temporada,
  Tier,
} from './types'

// Catálogo inicial da gamificação v2 (seções 5 a 8 do prompt de evolução).
// Tudo aqui é dado de partida: o painel administrativo edita sem mexer em código.

const f = (m: string, fem = m, n = m): Flexao => ({ m, f: fem, n })

// ------------------------------------------------------------------ níveis e tiers (seção 6)

/** XP(n) = 100 × (n − 1)^1,75, arredondado a múltiplos de 50 (a tabela oficial ajusta alguns degraus). */
export function xpDaCurva(n: number) {
  return Math.round((100 * Math.pow(n - 1, 1.75)) / 50) * 50
}

export const TIERS: Tier[] = [
  { numero: 1, nome: f('Filhote', 'Filhote', 'Tier Filhote'), corJuba: 'juba_classica', tema: 'tema_claro', moldura: 'moldura_filhote' },
  { numero: 2, nome: f('Jovem Leão', 'Jovem Leoa', 'Tier Jovem'), corJuba: 'juba_ciano', tema: 'tema_ciano', moldura: 'moldura_jovem' },
  { numero: 3, nome: f('Leão Protetor', 'Leoa Protetora', 'Tier Protetor'), corJuba: 'juba_azul_noite', tema: 'tema_azul_noturno', moldura: 'moldura_protetor' },
  { numero: 4, nome: f('Leão Guardião', 'Leoa Guardiã', 'Tier Guardião'), corJuba: 'juba_prata', tema: 'tema_escuro', moldura: 'moldura_guardiao' },
  { numero: 5, nome: f('Lenda', 'Lenda', 'Tier Lenda'), corJuba: 'juba_dourada', tema: 'tema_escuro', moldura: 'moldura_lenda' },
]

const TABELA_NIVEIS: [number, Flexao][] = [
  [0, f('Recém-chegado à Rede', 'Recém-chegada à Rede', 'Nova presença na Rede')],
  [100, f('Primeiro Rugido')],
  [350, f('Pata Amiga')],
  [700, f('Coração Aberto')],
  [1150, f('Semente do Bem')],
  [1650, f('Jovem Leão', 'Jovem Leoa', 'Jovem da Alcateia')],
  [2300, f('Elo da Rede')],
  [3000, f('Voz da Comunidade')],
  [3800, f('Multiplicador do Bem', 'Multiplicadora do Bem', 'Força Multiplicadora do Bem')],
  [4700, f('Juba Dourada')],
  [5600, f('Leão Protetor', 'Leoa Protetora', 'Proteção da Rede')],
  [6650, f('Escudo da Infância')],
  [7750, f('Abraço da Pessoa Idosa')],
  [8900, f('Construtor de Pontes', 'Construtora de Pontes', 'Ponte entre Pessoas')],
  [10150, f('Farol da Cidade')],
  [11450, f('Leão Guardião', 'Leoa Guardiã', 'Guarda da Rede')],
  [12800, f('Guardião do Futuro', 'Guardiã do Futuro', 'Guarda do Futuro')],
  [14250, f('Pilar da Rede')],
  [15750, f('Coração de Leão')],
  [17300, f('Mestre da Solidariedade', 'Mestra da Solidariedade', 'Maestria da Solidariedade')],
  [18900, f('Lenda da Rede')],
  [20600, f('Lenda Viva')],
  [22350, f('Patrono da Comunidade', 'Patrona da Comunidade', 'Referência da Comunidade')],
  [24150, f('Grande Rugido')],
  [26000, f('Lenda Eterna')],
]

export const NIVEIS: Nivel[] = TABELA_NIVEIS.map(([xpMinimo, titulo], i) => ({
  nivel: i + 1,
  xpMinimo,
  titulo,
  tier: Math.floor(i / 5) + 1,
}))

// ------------------------------------------------------------------ itens cosméticos (seção 8.1)

const item = (
  id: string,
  nome: string,
  categoria: CategoriaItem,
  raridade: Raridade,
  fonte: Item['fonte'],
  forma: string,
  cor: string,
  extra: Partial<Item> = {},
): Item => ({ id, nome, descricao: '', categoria, raridade, fonte, arte: { forma, cor }, ...extra })

export const ITENS: Item[] = [
  // cor da juba (tiers e trilha)
  item('juba_classica', 'Juba clássica', 'juba', 'comum', 'padrao', 'juba', '#095BA7', { descricao: 'A cor original do leãozinho.' }),
  item('juba_ciano', 'Juba ciano', 'juba', 'incomum', 'nivel', 'juba', '#00BEDF', { requisito: { nivel: 6 } }),
  item('juba_azul_noite', 'Juba azul-noite', 'juba', 'rara', 'nivel', 'juba', '#00325C', { requisito: { nivel: 11 } }),
  item('juba_prata', 'Juba prata', 'juba', 'epica', 'nivel', 'juba', '#A9B6C3', { requisito: { nivel: 16 } }),
  item('juba_dourada', 'Juba dourada', 'juba', 'lendaria', 'nivel', 'juba', '#C9A227', { requisito: { nivel: 21 } }),
  // cabeça
  item('cab_capacete', 'Capacete de segurança azul', 'cabeca', 'comum', 'loja', 'capacete', '#0063A7'),
  item('cab_bone', 'Boné da Rede Solidária', 'cabeca', 'incomum', 'loja', 'bone', '#095BA7'),
  item('cab_fones', 'Fones de ouvido', 'cabeca', 'rara', 'trilha', 'fones', '#00325C'),
  item('cab_coroa_folhas', 'Coroa de folhas', 'cabeca', 'lendaria', 'nivel', 'coroa', '#C9A227', { requisito: { nivel: 25 }, descricao: 'Só para quem chega ao nível 25.' }),
  // rosto
  item('rosto_oculos_protecao', 'Óculos de proteção', 'rosto', 'comum', 'loja', 'oculos_protecao', '#00BEDF'),
  item('rosto_oculos_redondos', 'Óculos redondos', 'rosto', 'incomum', 'missao', 'oculos_redondos', '#00325C'),
  // pescoço
  item('pesc_cachecol', 'Cachecol azul e ciano', 'pescoco', 'incomum', 'loja', 'cachecol', '#095BA7'),
  item('pesc_cracha', 'Crachá', 'pescoco', 'comum', 'jornada', 'cracha', '#00BEDF'),
  item('pesc_medalha', 'Medalha', 'pescoco', 'rara', 'insignia', 'medalha', '#C9A227', { requisito: { insignia: 'multiplicador' } }),
  // pata
  item('pata_livro', 'Livro do conhecimento', 'pata', 'incomum', 'insignia', 'livro', '#0063A7', { requisito: { insignia: 'conhecedor_guia' } }),
  item('pata_coracao', 'Coração azul', 'pata', 'comum', 'loja', 'coracao', '#095BA7'),
  item('pata_chave', 'Chave inglesa', 'pata', 'rara', 'loja', 'chave', '#8A99A8'),
  item('pata_megafone', 'Megafone', 'pata', 'epica', 'insignia', 'megafone', '#6B4FBB', { requisito: { insignia: 'voz_da_rede' } }),
  // fundo
  item('fundo_gradiente', 'Gradiente azul', 'fundo', 'comum', 'padrao', 'gradiente', '#095BA7'),
  item('fundo_ceu_noturno', 'Céu noturno', 'fundo', 'incomum', 'loja', 'ceu', '#00325C'),
  item('fundo_serra', 'Serra de Jaraguá', 'fundo', 'rara', 'trilha', 'serra', '#0063A7'),
  item('fundo_parque_fabril', 'Parque Fabril', 'fundo', 'epica', 'loja', 'fabrica', '#00325C'),
  // molduras (tiers, edição, eventos, prestígio)
  item('moldura_filhote', 'Moldura Filhote', 'moldura', 'comum', 'nivel', 'anel', '#8A99A8', { requisito: { nivel: 5 } }),
  item('moldura_jovem', 'Moldura Jovem', 'moldura', 'incomum', 'nivel', 'anel', '#00BEDF', { requisito: { nivel: 10 } }),
  item('moldura_protetor', 'Moldura Protetor(a)', 'moldura', 'rara', 'nivel', 'escudo', '#0063A7', { requisito: { nivel: 15 } }),
  item('moldura_guardiao', 'Moldura Guardião(ã)', 'moldura', 'epica', 'nivel', 'escudo', '#6B4FBB', { requisito: { nivel: 20 } }),
  item('moldura_lenda', 'Moldura Lenda', 'moldura', 'lendaria', 'nivel', 'estrelas', '#C9A227', { requisito: { nivel: 25 } }),
  item('moldura_edicao_2027', 'Moldura Edição 2027', 'moldura', 'rara', 'trilha', 'anel', '#095BA7', { exclusivoEdicao: 2027 }),
  item('moldura_voluntariado', 'Moldura Dia do Voluntariado', 'moldura', 'epica', 'evento', 'anel', '#6B4FBB', { disponivelDe: '2026-12-05', disponivelAte: '2026-12-06' }),
  // banner
  item('banner_edicao_2027', 'Banner Edição 2027', 'banner', 'incomum', 'trilha', 'banner', '#095BA7', { exclusivoEdicao: 2027 }),
  item('banner_doacao_direta', 'Banner Doação Direta', 'banner', 'rara', 'loja', 'banner', '#00BEDF'),
  item('banner_impacto', 'Banner Impacto', 'banner', 'comum', 'loja', 'banner', '#0063A7'),
  // tema do app (tiers)
  item('tema_claro', 'Tema claro', 'tema', 'comum', 'padrao', 'tema', '#f3f7fb'),
  item('tema_ciano', 'Tema Ciano', 'tema', 'incomum', 'nivel', 'tema', '#e9f8fc', { requisito: { nivel: 6 } }),
  item('tema_azul_noturno', 'Tema Azul Noturno', 'tema', 'rara', 'nivel', 'tema', '#001a30', { requisito: { nivel: 11 } }),
  item('tema_escuro', 'Tema escuro', 'tema', 'epica', 'nivel', 'tema', '#0b1220', { requisito: { nivel: 16 } }),
  // efeito de subida de nível
  item('efeito_confete', 'Confete azul', 'efeito', 'comum', 'padrao', 'confete', '#095BA7'),
  item('efeito_patinhas', 'Chuva de patinhas', 'efeito', 'rara', 'loja', 'patinhas', '#00BEDF'),
  item('efeito_rugido', 'Rugido luminoso', 'efeito', 'epica', 'trilha', 'rugido', '#6B4FBB'),
  // estilo da linha no ranking
  item('estilo_incomum', 'Destaque ciano no ranking', 'estilo_ranking', 'incomum', 'loja', 'estilo', '#00BEDF'),
  item('estilo_epico', 'Destaque épico no ranking', 'estilo_ranking', 'epica', 'loja', 'estilo', '#6B4FBB'),
  // adesivos de reação
  item('adesivo_aplauso', 'Aplauso', 'adesivo', 'comum', 'padrao', 'adesivo', '👏'),
  item('adesivo_coracao', 'Coração azul', 'adesivo', 'comum', 'padrao', 'adesivo', '💙'),
  item('adesivo_rugido', 'Rugido', 'adesivo', 'incomum', 'missao', 'adesivo', '🦁'),
  item('adesivo_joinha', 'Leãozinho joinha', 'adesivo', 'rara', 'loja', 'adesivo', '👍'),
  // itens da Jornada do Leãozinho
  item('jornada_cap1', 'Crachá do Primeiro Rugido', 'pescoco', 'incomum', 'jornada', 'cracha', '#095BA7'),
  item('jornada_cap2', 'Mapa da cidade', 'pata', 'incomum', 'jornada', 'mapa', '#0063A7'),
  item('jornada_cap3', 'Bandana da Alcateia', 'pescoco', 'rara', 'jornada', 'cachecol', '#00BEDF'),
  item('jornada_cap4', 'Fundo A Grande Escolha', 'fundo', 'rara', 'jornada', 'ceu', '#095BA7'),
  item('jornada_cap5', 'Coroa do Multiplicador', 'cabeca', 'epica', 'jornada', 'coroa', '#6B4FBB'),
  // trilha da temporada (épico exclusivo)
  item('trilha_doacao_epico', 'Capa da Doação Direta', 'pescoco', 'epica', 'trilha', 'capa', '#6B4FBB', { descricao: 'Último degrau da trilha da Temporada Doação Direta.' }),
  item('trilha_declaracao_epico', 'Lupa do Declarante', 'pata', 'epica', 'trilha', 'lupa', '#6B4FBB'),
  item('trilha_impacto_epico', 'Coroa de Impacto', 'cabeca', 'epica', 'trilha', 'coroa', '#6B4FBB'),
]

// ------------------------------------------------------------------ missões (seção 8.3)

type M = Omit<Missao, 'ativa' | 'publico'> & Partial<Pick<Missao, 'ativa' | 'publico'>>
const missao = (m: M): Missao => ({ ativa: true, publico: 'todos', ...m })
const um = (evento: Missao['criterios'][number]['evento'], janela: Missao['criterios'][number]['janela'], extra: Partial<Missao['criterios'][number]> = {}) => [
  { evento, quantidade: 1, janela, ...extra },
]

export const MISSOES: Missao[] = [
  // diárias: 3 sorteadas por pessoa por dia
  missao({ id: 'd_checkin', tipo: 'diaria', titulo: 'Fazer check-in no app', descricao: 'Passe pelo app e registre sua presença.', xp: 10, patinhas: 5, criterios: um('checkin', 'dia') }),
  missao({ id: 'd_pergunta', tipo: 'diaria', titulo: 'Responder a pergunta do dia do guia', descricao: 'Uma pergunta rápida sobre o IR.', xp: 20, patinhas: 10, educativa: true, criterios: um('pergunta_do_dia_respondida', 'dia') }),
  missao({ id: 'd_historia', tipo: 'diaria', titulo: 'Ler uma história de impacto', descricao: 'Abra o destaque de um projeto na página inicial.', xp: 15, patinhas: 5, educativa: true, criterios: um('historia_lida', 'dia') }),
  missao({ id: 'd_projeto', tipo: 'diaria', titulo: 'Visitar a página de um projeto apoiado', descricao: 'Conheça onde o recurso chegou.', xp: 15, patinhas: 5, educativa: true, criterios: um('projeto_visitado', 'dia') }),
  missao({ id: 'd_entidade', tipo: 'diaria', titulo: 'Conhecer uma entidade chancelada da sua cidade', descricao: 'Abra a página de uma entidade do seu município.', xp: 20, patinhas: 10, educativa: true, criterios: um('entidade_visitada', 'dia', { filtro: { municipioDoUsuario: true } }) }),
  missao({ id: 'd_reagir', tipo: 'diaria', titulo: 'Reagir à conquista de um colega no mural', descricao: 'Mande um adesivo no Mural da Rede.', xp: 10, patinhas: 5, criterios: um('reacao_enviada', 'dia') }),
  missao({ id: 'd_curiosidade', tipo: 'diaria', titulo: 'Ver a curiosidade do leãozinho', descricao: 'Toque na curiosidade do dia na página inicial.', xp: 10, patinhas: 5, educativa: true, criterios: um('curiosidade_vista', 'dia') }),
  missao({ id: 'd_termometro', tipo: 'diaria', titulo: 'Conferir o termômetro da meta', descricao: 'Veja como está a meta WEG da edição.', xp: 10, patinhas: 5, criterios: um('meta_conferida', 'dia') }),
  // semanais: 5 sorteadas por pessoa por semana
  missao({ id: 's_convidar', tipo: 'semanal', titulo: 'Convidar 2 colegas', descricao: 'Tenha 2 convites aceitos nesta semana.', xp: 100, patinhas: 40, criterios: [{ evento: 'convite_aceito', quantidade: 2, janela: 'semana' }] }),
  missao({ id: 's_diarias', tipo: 'semanal', titulo: 'Concluir 10 missões diárias', descricao: 'Some 10 diárias ao longo da semana.', xp: 80, patinhas: 30, criterios: [{ evento: 'missao_concluida', quantidade: 10, janela: 'semana', filtro: { tipoMissao: 'diaria' } }] }),
  missao({ id: 's_compartilhar', tipo: 'semanal', titulo: 'Compartilhar um card de conquista', descricao: 'Gere e compartilhe seu card.', xp: 60, patinhas: 20, criterios: um('conquista_compartilhada', 'semana') }),
  missao({ id: 's_ods', tipo: 'semanal', titulo: 'Conhecer 3 projetos de um mesmo ODS', descricao: 'Escolha um ODS e conheça 3 projetos ligados a ele.', xp: 70, patinhas: 25, educativa: true, criterios: [{ evento: 'projeto_visitado', quantidade: 3, janela: 'semana', distinto: true, agruparPorOds: true }] }),
  missao({ id: 's_licao', tipo: 'semanal', titulo: 'Concluir uma lição do guia do IR', descricao: 'Leia e conclua uma lição do guia.', xp: 80, patinhas: 30, educativa: true, criterios: um('licao_guia_concluida', 'semana') }),
  missao({ id: 's_familia', tipo: 'semanal', titulo: 'Atualizar sua família no app', descricao: 'Cadastre ou atualize um familiar.', xp: 50, patinhas: 20, criterios: um('familia_atualizada', 'semana') }),
  missao({ id: 's_alcateia', tipo: 'semanal', titulo: 'Ajudar sua alcateia a bater a meta da semana', descricao: 'Missões concluídas contam para a meta coletiva.', xp: 100, patinhas: 40, criterios: um('alcateia_meta_batida', 'semana') }),
  // Jornada do Leãozinho
  missao({
    id: 'j1', tipo: 'jornada', capitulo: 1, titulo: 'O Primeiro Rugido', xp: 150, patinhas: 60, itemRecompensa: 'jornada_cap1',
    narrativa: 'O leãozinho acabou de chegar à Rede. Antes de sair pela cidade, ele arruma a juba e aprende o básico.',
    descricao: 'Complete o perfil, monte o avatar e conclua a lição 1 do guia.',
    criterios: [
      { evento: 'perfil_completo', quantidade: 1, janela: 'sempre', rotulo: 'Completar o perfil' },
      { evento: 'item_equipado', quantidade: 1, janela: 'sempre', rotulo: 'Montar o avatar' },
      { evento: 'licao_guia_concluida', quantidade: 1, janela: 'sempre', ref: 'licao-1', rotulo: 'Concluir a lição 1 do guia' },
    ],
  }),
  missao({
    id: 'j2', tipo: 'jornada', capitulo: 2, titulo: 'Conhecendo a Cidade', xp: 200, patinhas: 80, itemRecompensa: 'jornada_cap2',
    narrativa: 'Com o mapa na pata, o leãozinho descobre quem cuida das crianças e das pessoas idosas da cidade.',
    descricao: 'Visite 5 projetos e 3 entidades do seu município.',
    criterios: [
      { evento: 'projeto_visitado', quantidade: 5, janela: 'sempre', distinto: true, rotulo: 'Visitar 5 projetos' },
      { evento: 'entidade_visitada', quantidade: 3, janela: 'sempre', distinto: true, filtro: { municipioDoUsuario: true }, rotulo: 'Visitar 3 entidades do seu município' },
    ],
  }),
  missao({
    id: 'j3', tipo: 'jornada', capitulo: 3, titulo: 'A Alcateia', xp: 200, patinhas: 80, itemRecompensa: 'jornada_cap3',
    narrativa: 'Ninguém ruge sozinho. O leãozinho encontra a sua alcateia.',
    descricao: 'Entre em uma alcateia e convide 1 colega.',
    criterios: [
      { evento: 'alcateia_entrou', quantidade: 1, janela: 'sempre', rotulo: 'Entrar em uma alcateia' },
      { evento: 'convite_enviado', quantidade: 1, janela: 'sempre', rotulo: 'Convidar 1 colega' },
    ],
  }),
  missao({
    id: 'j4', tipo: 'jornada', capitulo: 4, titulo: 'A Grande Escolha', xp: 250, patinhas: 100, itemRecompensa: 'jornada_cap4',
    narrativa: 'Chegou a hora: o leãozinho decide que parte do imposto fica na cidade.',
    descricao: 'Reporte a sua destinação da edição.',
    criterios: [{ evento: 'reporte_validado', quantidade: 1, janela: 'edicao', rotulo: 'Ter a sua destinação validada nesta edição' }],
  }),
  missao({
    id: 'j5', tipo: 'jornada', capitulo: 5, titulo: 'Multiplicar', xp: 300, patinhas: 120, itemRecompensa: 'jornada_cap5',
    narrativa: 'O rugido ecoa: família e amigos entram na Rede junto com o leãozinho.',
    descricao: 'Tenha 1 familiar ou convidado com reporte validado.',
    criterios: [{ evento: 'multiplicacao_validada', quantidade: 1, janela: 'sempre', rotulo: 'Familiar ou convidado com reporte validado' }],
  }),
  // temporada (no máximo uma envolve a destinação)
  missao({ id: 't_doacao', tipo: 'temporada', temporadaId: 'tmp_doacao', titulo: 'Destinar antes de 31/12', descricao: 'Tenha uma doação direta validada nesta temporada.', xp: 200, patinhas: 80, criterios: um('doacao_direta_validada', 'temporada') }),
  missao({
    id: 't_declaracao', tipo: 'temporada', temporadaId: 'tmp_declaracao', titulo: 'Usar o simulador e concluir o quiz', descricao: 'Prepare-se para a declaração.', xp: 150, patinhas: 60, educativa: true,
    criterios: [
      { evento: 'simulador_usado', quantidade: 1, janela: 'temporada', rotulo: 'Usar o simulador' },
      { evento: 'quiz_concluido', quantidade: 1, janela: 'temporada', rotulo: 'Concluir o quiz' },
    ],
  }),
  missao({ id: 't_impacto', tipo: 'temporada', temporadaId: 'tmp_impacto', titulo: 'Conhecer 10 projetos', descricao: 'Explore os projetos apoiados.', xp: 150, patinhas: 60, educativa: true, criterios: [{ evento: 'projeto_visitado', quantidade: 10, janela: 'temporada', distinto: true }] }),
  missao({ id: 't_doacao_projetos', tipo: 'temporada', temporadaId: 'tmp_doacao', titulo: 'Conhecer 3 projetos da sua cidade', descricao: 'Antes de destinar, veja onde o recurso chega.', xp: 100, patinhas: 40, educativa: true, criterios: [{ evento: 'projeto_visitado', quantidade: 3, janela: 'temporada', distinto: true, filtro: { municipioDoUsuario: true } }] }),
  // relâmpago (24 a 72 horas)
  missao({ id: 'r_voluntariado', tipo: 'relampago', titulo: 'Dia Internacional do Voluntariado', descricao: 'Conheça uma entidade e reaja a uma conquista no mural hoje.', xp: 60, patinhas: 30, inicio: '2026-12-05T00:00:00-03:00', fim: '2026-12-06T23:59:59-03:00', criterios: [{ evento: 'entidade_visitada', quantidade: 1, janela: 'missao' }, { evento: 'reacao_enviada', quantidade: 1, janela: 'missao' }] }),
  missao({ id: 'r_reta_final', tipo: 'relampago', titulo: 'Reta final: aprenda antes de 31/12', descricao: 'Conclua 2 lições do guia nas últimas duas semanas do ano.', xp: 80, patinhas: 40, educativa: true, inicio: '2026-12-17T00:00:00-03:00', fim: '2026-12-31T23:59:59-03:00', criterios: [{ evento: 'licao_guia_concluida', quantidade: 2, janela: 'missao', distinto: true }] }),
  // família, convidado, embaixador
  missao({ id: 'f_primeiro', tipo: 'familia', titulo: 'Cadastrar o primeiro familiar', descricao: 'Adicione um familiar em Minha família.', xp: 50, patinhas: 20, criterios: um('familia_atualizada', 'sempre') }),
  missao({ id: 'c_link', tipo: 'convidado', titulo: 'Gerar seu link de convidado', descricao: 'Crie o link para amigos e vizinhos reportarem em seu nome.', xp: 30, patinhas: 10, criterios: um('link_convidado_gerado', 'sempre') }),
  missao({ id: 'e_equipe', tipo: 'embaixador', publico: 'embaixadores', titulo: 'Apresentar a Rede Solidária à sua equipe', descricao: 'Registre a apresentação com uma foto.', xp: 200, patinhas: 80, criterios: um('apresentacao_registrada', 'edicao') }),
  missao({ id: 'e_convites', tipo: 'embaixador', publico: 'embaixadores', titulo: 'Ter 3 convites aceitos na semana', descricao: 'Mobilize colegas da sua unidade.', xp: 150, patinhas: 60, criterios: [{ evento: 'convite_aceito', quantidade: 3, janela: 'semana' }] }),
]

// ------------------------------------------------------------------ insígnias (seção 8.4)

const g = (...graus: [number, Raridade][]) => graus.map(([limite, raridade]) => ({ limite, raridade }))

export const INSIGNIAS: Insignia[] = [
  { id: 'primeira_destinacao', nome: f('Primeira Destinação'), descricao: 'Primeira destinação validada na vida.', categoria: 'participacao', icone: '🌱', secreta: false, metrica: 'destinacoes_proprias', graus: g([1, 'comum']) },
  { id: 'dupla_protecao', nome: f('Dupla Proteção'), descricao: 'FIA e Fundo do Idoso na mesma edição.', categoria: 'participacao', icone: '🛡️', secreta: false, metrica: 'dupla_protecao', graus: g([1, 'incomum']) },
  { id: 'guardiao_infancia', nome: f('Guardião da Infância', 'Guardiã da Infância', 'Guarda da Infância'), descricao: 'Destinou ao Fundo da Criança e do Adolescente.', categoria: 'participacao', icone: '🧒', secreta: false, metrica: 'destinacoes_fia', graus: g([1, 'comum']), titulo: f('Guardião da Infância', 'Guardiã da Infância', 'Guarda da Infância') },
  { id: 'guardiao_idoso', nome: f('Guardião da Pessoa Idosa', 'Guardiã da Pessoa Idosa', 'Guarda da Pessoa Idosa'), descricao: 'Destinou ao Fundo do Idoso.', categoria: 'participacao', icone: '🧓', secreta: false, metrica: 'destinacoes_idoso', graus: g([1, 'comum']), titulo: f('Guardião da Pessoa Idosa', 'Guardiã da Pessoa Idosa', 'Guarda da Pessoa Idosa') },
  { id: 'familia_solidaria', nome: f('Família Solidária'), descricao: '2, 3 e 5 membros da família destinando na mesma edição.', categoria: 'familia', icone: '👨‍👩‍👧', secreta: false, metrica: 'familia_edicao', graus: g([2, 'incomum'], [3, 'rara'], [5, 'epica']) },
  { id: 'rede_ampliada', nome: f('Rede Ampliada'), descricao: '1, 3 e 10 reportes de convidados validados.', categoria: 'influencia', icone: '🕸️', secreta: false, metrica: 'convidados_validados', graus: g([1, 'comum'], [3, 'rara'], [10, 'epica']) },
  { id: 'multiplicador', nome: f('Multiplicador', 'Multiplicadora', 'Força Multiplicadora'), descricao: '1, 5, 15 e 30 convites aceitos.', categoria: 'influencia', icone: '📣', secreta: false, metrica: 'convites_aceitos', graus: g([1, 'comum'], [5, 'incomum'], [15, 'rara'], [30, 'epica']), titulo: f('Multiplicador', 'Multiplicadora', 'Força Multiplicadora') },
  { id: 'voz_da_rede', nome: f('Voz da Rede'), descricao: '10 conquistas compartilhadas.', categoria: 'influencia', icone: '🎙️', secreta: false, metrica: 'compartilhamentos', graus: g([10, 'rara']) },
  { id: 'veterano', nome: f('Veterano', 'Veterana', 'Veterania'), descricao: '3, 5, 10 e 15 edições.', categoria: 'constancia', icone: '🏅', secreta: false, metrica: 'edicoes', graus: g([3, 'incomum'], [5, 'rara'], [10, 'epica'], [15, 'lendaria']), titulo: f('Veterano da Rede', 'Veterana da Rede', 'Veterania da Rede') },
  { id: 'pioneiro', nome: f('Pioneiro', 'Pioneira', 'Pioneirismo'), descricao: 'Participação anterior ao app.', categoria: 'constancia', icone: '🧭', secreta: false, metrica: 'pioneiro', graus: g([1, 'rara']), titulo: f('Pioneiro', 'Pioneira', 'Pioneirismo') },
  { id: 'antecipado', nome: f('Antecipado', 'Antecipada', 'Antecipação'), descricao: 'Doação direta até 31/12.', categoria: 'participacao', icone: '⏰', secreta: false, metrica: 'doacoes_diretas', graus: g([1, 'incomum']) },
  { id: 'madrugador', nome: f('Madrugador da Temporada', 'Madrugadora da Temporada', 'Madrugada da Temporada'), descricao: 'Missão da temporada concluída na primeira semana.', categoria: 'constancia', icone: '🌅', secreta: false, metrica: 'madrugador', graus: g([1, 'rara']) },
  { id: 'explorador', nome: f('Explorador de Projetos', 'Exploradora de Projetos', 'Exploração de Projetos'), descricao: '5, 15 e 40 projetos visitados.', categoria: 'conexao', icone: '🔭', secreta: false, metrica: 'projetos_visitados', graus: g([5, 'comum'], [15, 'rara'], [40, 'epica']) },
  { id: 'guardiao_municipio', nome: f('Guardião do Município', 'Guardiã do Município', 'Guarda do Município'), descricao: 'Todas as entidades do seu município visitadas.', categoria: 'conexao', icone: '🏙️', secreta: false, metrica: 'entidades_municipio', graus: g([1, 'rara']) },
  { id: 'conhecedor_guia', nome: f('Conhecedor do Guia', 'Conhecedora do Guia', 'Conhecimento do Guia'), descricao: 'Todas as lições do guia concluídas.', categoria: 'conhecimento', icone: '📘', secreta: false, metrica: 'licoes_todas', graus: g([1, 'rara']) },
  { id: 'mestre_quiz', nome: f('Mestre do Quiz', 'Mestra do Quiz', 'Maestria do Quiz'), descricao: 'Quiz com 100% em 3 edições.', categoria: 'conhecimento', icone: '🧠', secreta: false, metrica: 'quiz_perfeito_edicoes', graus: g([3, 'epica']) },
  { id: 'missionario', nome: f('Missionário', 'Missionária', 'Missão Cumprida'), descricao: '50, 150, 400 e 1.000 missões.', categoria: 'constancia', icone: '🎯', secreta: false, metrica: 'missoes', graus: g([50, 'comum'], [150, 'incomum'], [400, 'rara'], [1000, 'epica']) },
  { id: 'semana_perfeita', nome: f('Semana Perfeita'), descricao: 'Todas as semanais de uma semana.', categoria: 'constancia', icone: '🗓️', secreta: false, metrica: 'semanas_perfeitas', graus: g([1, 'rara']) },
  { id: 'temporada_completa', nome: f('Temporada Completa'), descricao: 'Trilha da temporada concluída.', categoria: 'constancia', icone: '🏁', secreta: false, metrica: 'trilhas_completas', graus: g([1, 'epica']) },
  { id: 'colecionador_pins', nome: f('Colecionador de Pins', 'Colecionadora de Pins', 'Coleção de Pins'), descricao: '5, 10 pins e a coleção completa.', categoria: 'colecao', icone: '📌', secreta: false, metrica: 'pins', graus: g([5, 'incomum'], [10, 'rara'], [-1, 'lendaria']) },
  { id: 'alcateia_unida', nome: f('Alcateia Unida'), descricao: 'Alcateia bateu 4 metas semanais seguidas.', categoria: 'equipe', icone: '🐾', secreta: false, metrica: 'alcateia_metas_seguidas', graus: g([4, 'epica']) },
  { id: 'embaixador', nome: f('Embaixador', 'Embaixadora', 'Embaixada'), descricao: 'Atribuída pelo administrador.', categoria: 'especial', icone: '🎖️', secreta: false, metrica: 'embaixador', graus: g([1, 'epica']), titulo: f('Embaixador', 'Embaixadora', 'Embaixada da Rede') },
  { id: 'secreta_carinho', nome: f('Carinho de Leão'), descricao: 'Tocou 5 vezes no leãozinho da página inicial.', categoria: 'secreta', icone: '🫶', secreta: true, metrica: 'mascote_tocado', graus: g([5, 'lendaria']) },
  { id: 'secreta_glossario', nome: f('Dicionário Vivo'), descricao: 'Abriu todos os termos do glossário.', categoria: 'secreta', icone: '📖', secreta: true, metrica: 'glossario_completo', graus: g([1, 'lendaria']) },
  { id: 'secreta_voluntariado', nome: f('Coração Voluntário'), descricao: 'Acessou o app no Dia Internacional do Voluntariado (5/12).', categoria: 'secreta', icone: '💙', secreta: true, metrica: 'dia_voluntariado', graus: g([1, 'lendaria']) },
]

// ------------------------------------------------------------------ temporadas e trilhas (seção 8.5)

function trilhaPadrao(epico: string, cosmeticos: string[]) {
  const recompensas: Temporada['trilha']['recompensas'] = []
  for (let d = 1; d <= 25; d++) {
    if (d === 25) recompensas.push({ degrau: d, itemId: epico })
    else if (d % 6 === 0 && cosmeticos.length) recompensas.push({ degrau: d, itemId: cosmeticos[(d / 6 - 1) % cosmeticos.length] })
    else recompensas.push({ degrau: d, patinhas: d % 5 === 0 ? 40 : 15 })
  }
  return { degraus: 25, pontosPorDegrau: 80, recompensas }
}

export const TEMPORADAS: Temporada[] = [
  { id: 'tmp_doacao', nome: 'Temporada Doação Direta', tipo: 'doacao_direta', intervalos: [{ inicio: '10-01', fim: '12-31' }], descricao: 'Doe diretamente aos fundos até 31/12 e indique uma entidade chancelada.', trilha: trilhaPadrao('trilha_doacao_epico', ['banner_edicao_2027', 'cab_fones', 'moldura_edicao_2027', 'efeito_rugido']) },
  { id: 'tmp_declaracao', nome: 'Temporada Declaração', tipo: 'declaracao', intervalos: [{ inicio: '03-01', fim: '05-31' }], descricao: 'Destine na declaração do IRPF até o prazo final de entrega.', trilha: trilhaPadrao('trilha_declaracao_epico', ['fundo_serra', 'banner_edicao_2027']) },
  { id: 'tmp_impacto', nome: 'Temporada Impacto', tipo: 'impacto', intervalos: [{ inicio: '01-01', fim: '02-28' }, { inicio: '06-01', fim: '09-30' }], descricao: 'Conheça os projetos, convide pessoas e aprenda com o guia.', trilha: trilhaPadrao('trilha_impacto_epico', ['fundo_serra', 'cab_fones']) },
]

// ------------------------------------------------------------------ recompensas institucionais (seção 8.7) [A CONFIRMAR]

export const RECOMPENSAS: RecompensaInstitucional[] = [
  { id: 'ri_cert_tier', nome: 'Certificado especial do tier', descricao: 'Certificado digital comemorativo ao chegar a um novo tier.', categoria: 'reconhecimento', requisito: { tier: 2 }, estoque: null, icone: '📜' },
  { id: 'ri_mencao', nome: 'Menção no evento de reconhecimento', descricao: 'Seu nome lembrado no palco do evento anual.', categoria: 'reconhecimento', requisito: { tier: 5 }, estoque: 20, icone: '🎤' },
  { id: 'ri_pelucia', nome: 'Pelúcia do leãozinho', descricao: 'O leãozinho da Rede para levar para casa.', categoria: 'produto', requisito: { nivel: 10 }, estoque: 40, icone: '🧸' },
  { id: 'ri_kit', nome: 'Kit Rede Solidária', descricao: 'Caneca, adesivos e boné.', categoria: 'produto', requisito: { nivel: 15 }, estoque: 30, icone: '🎁' },
  { id: 'ri_visita', nome: 'Visita guiada a uma entidade apoiada', descricao: 'Conheça de perto um projeto que recebeu recursos.', categoria: 'experiencia', requisito: { nivel: 10 }, estoque: 15, validoAte: '2027-06-30', icone: '🚌' },
  { id: 'ri_evento', nome: 'Convite para o evento de reconhecimento com acompanhante', descricao: 'Dois lugares reservados no evento anual.', categoria: 'experiencia', requisito: { nivel: 20 }, estoque: 10, validoAte: '2027-07-31', icone: '🎟️' },
  { id: 'ri_cafe', nome: 'Café com a equipe da Seção Desenvolvimento Social', descricao: 'Uma conversa sobre os bastidores da Rede.', categoria: 'experiencia', requisito: { insignia: 'multiplicador', grau: 3 }, estoque: 10, icone: '☕' },
  { id: 'ri_voluntariado', nome: 'Ação do Coração Voluntário', descricao: 'Participação em uma ação de voluntariado.', categoria: 'experiencia', requisito: { insignia: 'guardiao_municipio', grau: 1 }, estoque: 25, icone: '🤝' },
  { id: 'ri_voucher', nome: 'Voucher (a definir)', descricao: 'A definir com a área responsável.', categoria: 'voucher', requisito: { nivel: 12 }, estoque: 0, icone: '🎫' },
]

// ------------------------------------------------------------------ configuração inicial da economia (seção 5)

export const ECONOMIA: Pick<Configuracoes, 'patinhas' | 'loja' | 'missoesConfig' | 'prestigio' | 'alcateiaConfig' | 'convidados' | 'votoLeao' | 'lojaRotacaoSemente'> = {
  patinhas: {
    destinacaoPropria: 100,
    bauDia: 15,
    bauSemana: 60,
    porTier: 30,
    insignia: { comum: 25, incomum: 50, rara: 90, epica: 120, lendaria: 150 },
  },
  loja: {
    precos: { comum: 50, incomum: 120, rara: 250, epica: 500 },
    ofertasPorSemana: 6,
    ofertaTemporada: { tmp_doacao: 'fundo_parque_fabril', tmp_declaracao: 'pata_chave', tmp_impacto: 'banner_impacto' },
  },
  missoesConfig: { diariasPorDia: 3, trocasPorDia: 1, semanaisPorSemana: 5 },
  prestigio: { xpPorEstrela: 4000 },
  alcateiaConfig: { maxMembros: 15, metaSemanalPadrao: 30, bonusXp: 50, bonusPatinhas: 30 },
  convidados: { limitePorEdicao: 10, limitePorDispositivoDia: 3, limitePorLinkDia: 5 },
  votoLeao: { ativo: true, projetos: ['prj_1', 'prj_4', 'prj_6'], votosPorTier: 1, titulo: 'Qual projeto recebe o apoio extra da WEG nesta edição? [A CONFIRMAR]' },
  lojaRotacaoSemente: 'rede-solidaria',
}

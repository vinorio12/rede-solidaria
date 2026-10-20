import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { novoId } from '@/data/db'
import { atualizarConfiguracoes, atualizarResgate, removerItem, salvarItem } from '@/domain/servicos'
import { metricas } from '@/domain/motor'
import type { Configuracoes, Insignia, Item, Missao, Nivel, RecompensaInstitucional, Temporada, Tier, Alcateia, TipoEvento } from '@/domain/types'
import { Campo } from '@/components/ui'
import { avisar } from '@/components/Feedback'
import { EditorColecao, type CampoDef } from './EditorColecao'
import { data, dataHora, numero } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

type Aba = 'economia' | 'niveis' | 'missoes' | 'insignias' | 'trilhas' | 'itens' | 'recompensas' | 'alcateias' | 'mural' | 'voto'

const ABAS: [Aba, string][] = [
  ['economia', 'Economia e XP'],
  ['niveis', 'Níveis e títulos'],
  ['missoes', 'Construtor de missões'],
  ['insignias', 'Insígnias'],
  ['trilhas', 'Temporadas e trilhas'],
  ['itens', 'Catálogo de itens'],
  ['recompensas', 'Recompensas e resgates'],
  ['alcateias', 'Alcateias'],
  ['mural', 'Mural'],
  ['voto', 'Voto do Leão'],
]

const EVENTOS: TipoEvento[] = [
  'reporte_validado', 'reporte_familiar_validado', 'reporte_convidado_validado', 'doacao_direta_validada', 'multiplicacao_validada', 'carta_gerada',
  'convite_enviado', 'convite_aceito', 'link_convidado_gerado', 'projeto_visitado', 'entidade_visitada', 'entidade_favoritada', 'licao_guia_concluida',
  'quiz_concluido', 'pergunta_do_dia_respondida', 'historia_lida', 'checkin', 'conquista_compartilhada', 'reacao_enviada', 'missao_concluida', 'nivel_alcancado',
  'item_equipado', 'alcateia_criada', 'alcateia_entrou', 'alcateia_meta_batida', 'simulador_usado', 'pin_visualizado', 'perfil_completo', 'familia_atualizada',
  'curiosidade_vista', 'meta_conferida', 'mascote_tocado', 'glossario_termo_aberto', 'apresentacao_registrada', 'bau_aberto',
]
const ROTULO_XP: Record<keyof Configuracoes['tabelaXp'], string> = {
  primeiraDestinacao: 'Primeira destinação da edição',
  bonusPrimeiraVida: 'Bônus da primeira destinação da vida',
  destinacaoAdicional: 'Destinação adicional',
  destinacaoFamiliar: 'Destinação de familiar',
  reporteConvidado: 'Reporte de convidado validado',
  doacaoCarta: 'Doação com carta de direcionamento',
  conviteAceito: 'Convite aceito',
  limiteDiarioMissoes: 'Limite diário das missões diárias',
  quiz: 'Quiz do guia',
  perfilCompleto: 'Perfil completo',
  bonusConsecutivoPct: 'Bônus por edição consecutiva (%)',
  bonusConsecutivoMaxPct: 'Bônus consecutivo máximo (%)',
}

const op = (o: Record<string, string>) => Object.entries(o).map(([valor, nome]) => ({ valor, nome }))
const RARIDADES = op(t.raridade)
const flexao = (base: string, rotulo: string): CampoDef[] => [
  { chave: `${base}.m`, rotulo: `${rotulo} (masculino)` },
  { chave: `${base}.f`, rotulo: `${rotulo} (feminino)` },
  { chave: `${base}.n`, rotulo: `${rotulo} (neutro)` },
]

export function Gamificacao() {
  const admin = useUsuario()
  const b = useBanco()
  const [aba, setAba] = useState<Aba>('economia')
  const [cfg, setCfg] = useState<Configuracoes>(() => structuredClone(b.configuracoes))
  const pendentes = b.resgates.filter((r) => r.status === 'solicitado' || r.status === 'aprovado')
  const itensOp = b.itens.map((i) => ({ valor: i.id, nome: `${i.nome} (${t.raridade[i.raridade]})` }))
  const insigniasOp = b.insignias.map((i) => ({ valor: i.id, nome: i.nome.m }))
  const metricasOp = Object.keys(metricas(b, b.usuarios[0].id)).map((m) => ({ valor: m, nome: m }))

  const salvarCfg = (descricao: string) => {
    atualizarConfiguracoes((c) => Object.assign(c, structuredClone(cfg)), admin.id, descricao)
    avisar('Configurações salvas.')
  }
  const num = (v: number, aoMudar: (n: number) => void, rotulo: string) => (
    <Campo key={rotulo} rotulo={rotulo}>
      <input className="campo" type="number" value={v} onChange={(e) => aoMudar(Number(e.target.value))} />
    </Campo>
  )

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Gamificação">
        {ABAS.map(([id, nome]) => (
          <button key={id} role="tab" aria-selected={aba === id} onClick={() => setAba(id)} className={`min-h-11 whitespace-nowrap rounded-xl px-3 font-titulo text-sm font-bold ${aba === id ? 'bg-weg-900 text-white' : 'bg-superficie text-weg-900 ring-1 ring-borda'}`}>
            {nome}
            {id === 'recompensas' && pendentes.length > 0 && ` (${pendentes.length})`}
          </button>
        ))}
      </div>

      {aba === 'economia' && (
        <div className="space-y-4">
          <section className="cartao space-y-3">
            <h2 className="font-titulo font-bold text-weg-900">Tabela de XP (participação, nunca valor)</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(cfg.tabelaXp) as (keyof Configuracoes['tabelaXp'])[]).map((k) => num(cfg.tabelaXp[k], (n) => setCfg({ ...cfg, tabelaXp: { ...cfg.tabelaXp, [k]: n } }), ROTULO_XP[k]))}
            </div>
          </section>
          <section className="cartao space-y-3">
            <h2 className="font-titulo font-bold text-weg-900">Patinhas</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {num(cfg.patinhas.destinacaoPropria, (n) => setCfg({ ...cfg, patinhas: { ...cfg.patinhas, destinacaoPropria: n } }), 'Destinação própria validada')}
              {num(cfg.patinhas.bauDia, (n) => setCfg({ ...cfg, patinhas: { ...cfg.patinhas, bauDia: n } }), 'Baú do Dia')}
              {num(cfg.patinhas.bauSemana, (n) => setCfg({ ...cfg, patinhas: { ...cfg.patinhas, bauSemana: n } }), 'Baú da Semana')}
              {num(cfg.patinhas.porTier, (n) => setCfg({ ...cfg, patinhas: { ...cfg.patinhas, porTier: n } }), 'Subida de nível (× tier)')}
              {(Object.keys(cfg.patinhas.insignia) as (keyof Configuracoes['patinhas']['insignia'])[]).map((r) => num(cfg.patinhas.insignia[r], (n) => setCfg({ ...cfg, patinhas: { ...cfg.patinhas, insignia: { ...cfg.patinhas.insignia, [r]: n } } }), `Insígnia ${t.raridade[r].toLowerCase()}`))}
            </div>
          </section>
          <section className="cartao space-y-3">
            <h2 className="font-titulo font-bold text-weg-900">Loja do Leão</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(cfg.loja.precos) as (keyof Configuracoes['loja']['precos'])[]).map((r) => num(cfg.loja.precos[r], (n) => setCfg({ ...cfg, loja: { ...cfg.loja, precos: { ...cfg.loja.precos, [r]: n } } }), `Preço ${t.raridade[r].toLowerCase()}`))}
              {num(cfg.loja.ofertasPorSemana, (n) => setCfg({ ...cfg, loja: { ...cfg.loja, ofertasPorSemana: n } }), 'Ofertas por semana')}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {b.temporadas.map((tp) => (
                <Campo key={tp.id} rotulo={`Oferta da ${tp.nome}`}>
                  <select className="campo" value={cfg.loja.ofertaTemporada[tp.id] ?? ''} onChange={(e) => setCfg({ ...cfg, loja: { ...cfg.loja, ofertaTemporada: { ...cfg.loja.ofertaTemporada, [tp.id]: e.target.value } } })}>
                    <option value="">(nenhuma)</option>
                    {b.itens.filter((i) => i.raridade !== 'lendaria').map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nome}
                      </option>
                    ))}
                  </select>
                </Campo>
              ))}
            </div>
            <p className="text-xs text-suave">Itens lendários nunca entram na loja. A rotação semanal escolhe entre os itens de fonte “loja”.</p>
          </section>
          <section className="cartao grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {num(cfg.missoesConfig.diariasPorDia, (n) => setCfg({ ...cfg, missoesConfig: { ...cfg.missoesConfig, diariasPorDia: n } }), 'Diárias por dia')}
            {num(cfg.missoesConfig.semanaisPorSemana, (n) => setCfg({ ...cfg, missoesConfig: { ...cfg.missoesConfig, semanaisPorSemana: n } }), 'Semanais por semana')}
            {num(cfg.prestigio.xpPorEstrela, (n) => setCfg({ ...cfg, prestigio: { xpPorEstrela: n } }), 'XP por Estrela de Lenda')}
            {num(cfg.alcateiaConfig.maxMembros, (n) => setCfg({ ...cfg, alcateiaConfig: { ...cfg.alcateiaConfig, maxMembros: n } }), 'Máximo por alcateia')}
            {num(cfg.alcateiaConfig.metaSemanalPadrao, (n) => setCfg({ ...cfg, alcateiaConfig: { ...cfg.alcateiaConfig, metaSemanalPadrao: n } }), 'Meta semanal padrão')}
            {num(cfg.alcateiaConfig.bonusXp, (n) => setCfg({ ...cfg, alcateiaConfig: { ...cfg.alcateiaConfig, bonusXp: n } }), 'Bônus de meta (XP)')}
            {num(cfg.alcateiaConfig.bonusPatinhas, (n) => setCfg({ ...cfg, alcateiaConfig: { ...cfg.alcateiaConfig, bonusPatinhas: n } }), 'Bônus de meta (Patinhas)')}
            {num(cfg.convidados.limitePorEdicao, (n) => setCfg({ ...cfg, convidados: { ...cfg.convidados, limitePorEdicao: n } }), 'Reportes de convidado por edição')}
            {num(cfg.convidados.limitePorLinkDia, (n) => setCfg({ ...cfg, convidados: { ...cfg.convidados, limitePorLinkDia: n } }), 'Envios por link por dia')}
            {num(cfg.convidados.limitePorDispositivoDia, (n) => setCfg({ ...cfg, convidados: { ...cfg.convidados, limitePorDispositivoDia: n } }), 'Envios por aparelho por dia')}
          </section>
          <section className="cartao space-y-2">
            <h2 className="font-titulo font-bold text-weg-900">Campanhas relâmpago (XP multiplicado nas missões educativas)</h2>
            {cfg.relampagos.map((r, i) => (
              <div key={r.id} className="grid gap-2 rounded-xl bg-fundo p-2 sm:grid-cols-4">
                <Campo rotulo="Nome">
                  <input className="campo" value={r.nome} onChange={(e) => setCfg({ ...cfg, relampagos: cfg.relampagos.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} />
                </Campo>
                <Campo rotulo="Início (ISO)">
                  <input className="campo" value={r.inicio} onChange={(e) => setCfg({ ...cfg, relampagos: cfg.relampagos.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)) })} />
                </Campo>
                <Campo rotulo="Fim (ISO)">
                  <input className="campo" value={r.fim} onChange={(e) => setCfg({ ...cfg, relampagos: cfg.relampagos.map((x, j) => (j === i ? { ...x, fim: e.target.value } : x)) })} />
                </Campo>
                {num(r.multiplicadorEducativo, (n) => setCfg({ ...cfg, relampagos: cfg.relampagos.map((x, j) => (j === i ? { ...x, multiplicadorEducativo: n } : x)) }), 'Multiplicador')}
              </div>
            ))}
            <button className="botao-secundario" onClick={() => setCfg({ ...cfg, relampagos: [...cfg.relampagos, { id: novoId('rel'), nome: 'Nova campanha', inicio: new Date().toISOString(), fim: new Date(Date.now() + 2 * 86400000).toISOString(), multiplicadorEducativo: 2 }] })}>
              Adicionar campanha
            </button>
          </section>
          <button className="botao-primario" onClick={() => salvarCfg('Economia da gamificação atualizada')}>
            Salvar economia
          </button>
        </div>
      )}

      {aba === 'niveis' && (
        <div className="space-y-6">
          <EditorColecao<Nivel>
            titulo="nível"
            itens={b.niveis}
            chave="nivel"
            colunas={[
              { rotulo: 'Nível', valor: (n) => String(n.nivel) },
              { rotulo: 'XP acumulado', valor: (n) => numero(n.xpMinimo) },
              { rotulo: 'Título (m / f / n)', valor: (n) => `${n.titulo.m} / ${n.titulo.f} / ${n.titulo.n}` },
              { rotulo: 'Tier', valor: (n) => String(n.tier) },
            ]}
            campos={[{ chave: 'nivel', rotulo: 'Nível', tipo: 'numero' }, { chave: 'xpMinimo', rotulo: 'XP acumulado', tipo: 'numero' }, { chave: 'tier', rotulo: 'Tier', tipo: 'numero' }, ...flexao('titulo', 'Título')]}
            novo={() => ({ nivel: b.niveis.length + 1, xpMinimo: 0, tier: 5, titulo: { m: '', f: '', n: '' } })}
            aoSalvar={(n) => salvarItem('niveis', n, 'nivel', admin.id)}
          />
          <EditorColecao<Tier>
            titulo="tier"
            itens={b.tiers}
            chave="numero"
            colunas={[
              { rotulo: 'Tier', valor: (x) => String(x.numero) },
              { rotulo: 'Nome (m / f / n)', valor: (x) => `${x.nome.m} / ${x.nome.f} / ${x.nome.n}` },
            ]}
            campos={[
              ...flexao('nome', 'Nome'),
              { chave: 'corJuba', rotulo: 'Cor da juba liberada', tipo: 'select', opcoes: itensOp.filter((o) => o.valor.startsWith('juba')) },
              { chave: 'tema', rotulo: 'Tema liberado', tipo: 'select', opcoes: itensOp.filter((o) => o.valor.startsWith('tema')) },
              { chave: 'moldura', rotulo: 'Moldura do tier', tipo: 'select', opcoes: itensOp.filter((o) => o.valor.startsWith('moldura')) },
            ]}
            aoSalvar={(x) => salvarItem('tiers', x, 'numero', admin.id)}
          />
        </div>
      )}

      {aba === 'missoes' && (
        <EditorColecao<Missao>
          titulo="missão"
          itens={b.missoes}
          chave="id"
          colunas={[
            { rotulo: 'Missão', valor: (m) => m.titulo },
            { rotulo: 'Tipo', valor: (m) => t.tipoMissao[m.tipo] },
            { rotulo: 'Critério', valor: (m) => m.criterios.map((c) => `${c.quantidade}× ${c.evento}`).join(' + ') },
            { rotulo: 'XP / Patinhas', valor: (m) => `${m.xp} / ${m.patinhas}` },
            { rotulo: 'Ativa', valor: (m) => (m.ativa ? 'Sim' : 'Não') },
          ]}
          campos={[
            { chave: 'titulo', rotulo: 'Título' },
            { chave: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: op(t.tipoMissao) },
            { chave: 'xp', rotulo: 'XP', tipo: 'numero' },
            { chave: 'patinhas', rotulo: 'Patinhas', tipo: 'numero' },
            { chave: 'publico', rotulo: 'Público', tipo: 'select', opcoes: [{ valor: 'todos', nome: 'Todos' }, { valor: 'embaixadores', nome: 'Embaixadores' }] },
            { chave: 'tierMinimo', rotulo: 'Tier mínimo', tipo: 'numero', opcional: true },
            { chave: 'temporadaId', rotulo: 'Temporada', tipo: 'select', opcoes: b.temporadas.map((x) => ({ valor: x.id, nome: x.nome })), opcional: true },
            { chave: 'capitulo', rotulo: 'Capítulo (jornada)', tipo: 'numero', opcional: true },
            { chave: 'inicio', rotulo: 'Início (relâmpago, ISO)', opcional: true },
            { chave: 'fim', rotulo: 'Fim (relâmpago, ISO)', opcional: true },
            { chave: 'itemRecompensa', rotulo: 'Item de recompensa', tipo: 'select', opcoes: itensOp, opcional: true },
            { chave: 'educativa', rotulo: 'Educativa (recebe multiplicador relâmpago)', tipo: 'booleano' },
            { chave: 'ativa', rotulo: 'Ativa', tipo: 'booleano' },
            { chave: 'descricao', rotulo: 'Descrição', tipo: 'area' },
            { chave: 'narrativa', rotulo: 'Narrativa (jornada)', tipo: 'area', opcional: true },
            {
              chave: 'criterios',
              rotulo: 'Critérios de conclusão (todos precisam ser cumpridos)',
              tipo: 'lista',
              ajuda: 'Evento-alvo, quantidade, janela e filtros. O motor avalia automaticamente.',
              novoItem: () => ({ evento: 'checkin', quantidade: 1, janela: 'dia' }),
              subcampos: [
                { chave: 'evento', rotulo: 'Evento-alvo', tipo: 'select', opcoes: EVENTOS.map((e) => ({ valor: e, nome: e })) },
                { chave: 'quantidade', rotulo: 'Quantidade', tipo: 'numero' },
                { chave: 'janela', rotulo: 'Janela', tipo: 'select', opcoes: op(t.janela) },
                { chave: 'rotulo', rotulo: 'Rótulo para o usuário', opcional: true },
                { chave: 'distinto', rotulo: 'Contar itens distintos', tipo: 'booleano' },
                { chave: 'agruparPorOds', rotulo: 'Do mesmo ODS', tipo: 'booleano' },
                { chave: 'ref', rotulo: 'Referência exigida (ex.: licao-1)', opcional: true },
                { chave: 'filtro.municipioDoUsuario', rotulo: 'Só no município do usuário', tipo: 'booleano' },
                { chave: 'filtro.ods', rotulo: 'Filtro: ODS', tipo: 'numero', opcional: true },
                { chave: 'filtro.fundo', rotulo: 'Filtro: fundo', tipo: 'select', opcoes: [{ valor: 'FIA', nome: 'FIA' }, { valor: 'IDOSO', nome: 'Idoso' }], opcional: true },
                { chave: 'filtro.tipoMissao', rotulo: 'Filtro: tipo de missão', tipo: 'select', opcoes: op(t.tipoMissao), opcional: true },
              ],
            },
          ]}
          novo={() => ({ id: novoId('m'), tipo: 'diaria', titulo: '', descricao: '', xp: 10, patinhas: 5, publico: 'todos', ativa: true, criterios: [{ evento: 'checkin', quantidade: 1, janela: 'dia' }] })}
          aoSalvar={(m) => salvarItem('missoes', m, 'id', admin.id)}
          aoRemover={(m) => removerItem('missoes', 'id', m.id, admin.id)}
        />
      )}

      {aba === 'insignias' && (
        <EditorColecao<Insignia>
          titulo="insígnia"
          itens={b.insignias}
          chave="id"
          colunas={[
            { rotulo: '', valor: (i) => i.icone },
            { rotulo: 'Nome', valor: (i) => i.nome.m },
            { rotulo: 'Categoria', valor: (i) => t.categoriaInsignia[i.categoria] },
            { rotulo: 'Graus', valor: (i) => i.graus.map((g) => `${g.limite === -1 ? 'todos' : g.limite} (${t.raridade[g.raridade]})`).join(' · ') },
            { rotulo: 'Conquistas', valor: (i) => String(new Set(b.usuarioInsignias.filter((x) => x.insigniaId === i.id).map((x) => x.usuarioId)).size) },
          ]}
          campos={[
            ...flexao('nome', 'Nome'),
            { chave: 'icone', rotulo: 'Ícone (emoji)' },
            { chave: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: op(t.categoriaInsignia) },
            { chave: 'metrica', rotulo: 'Critério (métrica)', tipo: 'select', opcoes: metricasOp },
            { chave: 'secreta', rotulo: 'Secreta (revelada só ao conquistar)', tipo: 'booleano' },
            { chave: 'descricao', rotulo: 'Descrição', tipo: 'area' },
            { chave: 'graus', rotulo: 'Graus (I a IV)', tipo: 'lista', ajuda: 'Limite da métrica para cada grau. Use -1 para "coleção completa".', novoItem: () => ({ limite: 1, raridade: 'comum' }), subcampos: [{ chave: 'limite', rotulo: 'Limite', tipo: 'numero' }, { chave: 'raridade', rotulo: 'Raridade', tipo: 'select', opcoes: RARIDADES }] },
            { chave: 'titulo.m', rotulo: 'Título especial (masculino)', opcional: true },
            { chave: 'titulo.f', rotulo: 'Título especial (feminino)', opcional: true },
            { chave: 'titulo.n', rotulo: 'Título especial (neutro)', opcional: true },
          ]}
          novo={() => ({ id: novoId('ins'), nome: { m: '', f: '', n: '' }, descricao: '', categoria: 'participacao', icone: '⭐', secreta: false, metrica: 'missoes', graus: [{ limite: 1, raridade: 'comum' }] })}
          aoSalvar={(i) => salvarItem('insignias', i, 'id', admin.id)}
        />
      )}

      {aba === 'trilhas' && (
        <EditorColecao<Temporada>
          titulo="temporada e trilha"
          itens={b.temporadas}
          chave="id"
          colunas={[
            { rotulo: 'Temporada', valor: (x) => x.nome },
            { rotulo: 'Períodos', valor: (x) => x.intervalos.map((i) => `${i.inicio} a ${i.fim}`).join(' e ') },
            { rotulo: 'Trilha', valor: (x) => `${x.trilha.degraus} degraus × ${x.trilha.pontosPorDegrau} pts` },
          ]}
          campos={[
            { chave: 'nome', rotulo: 'Nome' },
            { chave: 'descricao', rotulo: 'Descrição', tipo: 'area' },
            { chave: 'intervalos', rotulo: 'Períodos (MM-DD)', tipo: 'lista', novoItem: () => ({ inicio: '01-01', fim: '01-31' }), subcampos: [{ chave: 'inicio', rotulo: 'Início' }, { chave: 'fim', rotulo: 'Fim' }] },
            { chave: 'trilha.degraus', rotulo: 'Degraus da trilha', tipo: 'numero' },
            { chave: 'trilha.pontosPorDegrau', rotulo: 'Pontos por degrau', tipo: 'numero' },
            {
              chave: 'trilha.recompensas',
              rotulo: 'Recompensas por degrau',
              tipo: 'lista',
              novoItem: () => ({ degrau: 1, patinhas: 15 }),
              subcampos: [
                { chave: 'degrau', rotulo: 'Degrau', tipo: 'numero' },
                { chave: 'patinhas', rotulo: 'Patinhas', tipo: 'numero', opcional: true },
                { chave: 'itemId', rotulo: 'Item', tipo: 'select', opcoes: itensOp, opcional: true },
              ],
            },
          ]}
          aoSalvar={(x) => salvarItem('temporadas', x, 'id', admin.id)}
        />
      )}

      {aba === 'itens' && (
        <EditorColecao<Item>
          titulo="item cosmético"
          itens={b.itens}
          chave="id"
          colunas={[
            { rotulo: 'Item', valor: (i) => i.nome },
            { rotulo: 'Categoria', valor: (i) => t.categoriaItem[i.categoria] },
            { rotulo: 'Raridade', valor: (i) => t.raridade[i.raridade] },
            { rotulo: 'Fonte', valor: (i) => i.fonte },
            { rotulo: 'Arte', valor: (i) => (i.arte.url ? 'Enviada' : `Procedural (${i.arte.forma})`) },
            { rotulo: 'Pessoas', valor: (i) => String(b.usuarioItens.filter((x) => x.itemId === i.id).length) },
          ]}
          campos={[
            { chave: 'nome', rotulo: 'Nome' },
            { chave: 'categoria', rotulo: 'Categoria (camada)', tipo: 'select', opcoes: op(t.categoriaItem) },
            { chave: 'raridade', rotulo: 'Raridade', tipo: 'select', opcoes: RARIDADES },
            { chave: 'fonte', rotulo: 'Fonte', tipo: 'select', opcoes: ['padrao', 'nivel', 'loja', 'trilha', 'insignia', 'evento', 'missao', 'jornada'].map((v) => ({ valor: v, nome: v })) },
            { chave: 'arte.forma', rotulo: 'Forma procedural', ajuda: 'capacete, bone, fones, coroa, oculos_protecao, oculos_redondos, cachecol, cracha, medalha, capa, livro, coracao, chave, megafone, mapa, lupa, gradiente, ceu, serra, fabrica, anel, escudo, estrelas, juba, tema' },
            { chave: 'arte.cor', rotulo: 'Cor (ou emoji, para adesivos)' },
            { chave: 'arte.url', rotulo: 'Arte oficial (PNG/SVG, substitui o desenho)', tipo: 'arquivo', opcional: true },
            { chave: 'requisito.nivel', rotulo: 'Requisito: nível', tipo: 'numero', opcional: true },
            { chave: 'requisito.insignia', rotulo: 'Requisito: insígnia', tipo: 'select', opcoes: insigniasOp, opcional: true },
            { chave: 'disponivelDe', rotulo: 'Disponível de', tipo: 'data', opcional: true },
            { chave: 'disponivelAte', rotulo: 'Disponível até', tipo: 'data', opcional: true },
            { chave: 'exclusivoEdicao', rotulo: 'Exclusivo da edição', tipo: 'numero', opcional: true },
            { chave: 'descricao', rotulo: 'Descrição', tipo: 'area', opcional: true },
          ]}
          novo={() => ({ id: novoId('item'), nome: '', descricao: '', categoria: 'cabeca', raridade: 'comum', fonte: 'loja', arte: { forma: 'bone', cor: '#095BA7' } })}
          aoSalvar={(i) => salvarItem('itens', i, 'id', admin.id)}
          aoRemover={(i) => removerItem('itens', 'id', i.id, admin.id)}
        />
      )}

      {aba === 'recompensas' && (
        <div className="space-y-6">
          <EditorColecao<RecompensaInstitucional>
            titulo="recompensa institucional"
            itens={b.recompensas}
            chave="id"
            colunas={[
              { rotulo: 'Recompensa', valor: (r) => `${r.icone} ${r.nome}` },
              { rotulo: 'Requisito', valor: (r) => (r.requisito.nivel ? `Nível ${r.requisito.nivel}` : r.requisito.tier ? `Tier ${r.requisito.tier}` : r.requisito.insignia ? `Insígnia ${r.requisito.insignia} ${r.requisito.grau ?? 1}` : '-') },
              { rotulo: 'Estoque', valor: (r) => (r.estoque === null ? 'ilimitado' : String(r.estoque)) },
              { rotulo: 'Validade', valor: (r) => (r.validoAte ? data(r.validoAte) : '-') },
            ]}
            campos={[
              { chave: 'nome', rotulo: 'Nome' },
              { chave: 'icone', rotulo: 'Ícone (emoji)' },
              { chave: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: op({ reconhecimento: 'Reconhecimento', produto: 'Produto', experiencia: 'Experiência', voucher: 'Voucher' }) },
              { chave: 'requisito.nivel', rotulo: 'Requisito: nível', tipo: 'numero', opcional: true },
              { chave: 'requisito.tier', rotulo: 'Requisito: tier', tipo: 'numero', opcional: true },
              { chave: 'requisito.insignia', rotulo: 'Requisito: insígnia', tipo: 'select', opcoes: insigniasOp, opcional: true },
              { chave: 'requisito.grau', rotulo: 'Requisito: grau da insígnia', tipo: 'numero', opcional: true },
              { chave: 'estoque', rotulo: 'Estoque (vazio = ilimitado)', tipo: 'numero', opcional: true },
              { chave: 'validoAte', rotulo: 'Válido até', tipo: 'data', opcional: true },
              { chave: 'descricao', rotulo: 'Descrição', tipo: 'area' },
            ]}
            novo={() => ({ id: novoId('ri'), nome: '', descricao: '', categoria: 'experiencia', requisito: { nivel: 1 }, estoque: 10, icone: '🎁' })}
            aoSalvar={(r) => salvarItem('recompensas', { ...r, estoque: r.estoque ?? null }, 'id', admin.id)}
            aoRemover={(r) => removerItem('recompensas', 'id', r.id, admin.id)}
          />
          <section>
            <h2 className="mb-2 font-titulo font-bold text-weg-900">Resgates</h2>
            <ul className="space-y-2">
              {!b.resgates.length && <li className="text-sm text-suave">Nenhum resgate ainda.</li>}
              {b.resgates.map((r) => (
                <li key={r.id} className="cartao flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{b.recompensas.find((x) => x.id === r.recompensaId)?.nome}</p>
                    <p className="text-sm text-suave">
                      {b.usuarios.find((u) => u.id === r.usuarioId)?.nome} · edição {r.edicao} · {data(r.em)} · {r.status}
                    </p>
                  </div>
                  {r.status === 'solicitado' && (
                    <button className="botao-primario min-h-9" onClick={() => atualizarResgate(r.id, 'aprovado', admin.id)}>
                      Aprovar
                    </button>
                  )}
                  {r.status === 'aprovado' && (
                    <button className="botao-primario min-h-9" onClick={() => atualizarResgate(r.id, 'entregue', admin.id)}>
                      Marcar entregue
                    </button>
                  )}
                  {(r.status === 'solicitado' || r.status === 'aprovado') && (
                    <button className="botao-secundario min-h-9" onClick={() => atualizarResgate(r.id, 'recusado', admin.id)}>
                      Recusar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {aba === 'alcateias' && (
        <EditorColecao<Alcateia>
          titulo="alcateia"
          itens={b.alcateias}
          chave="id"
          colunas={[
            { rotulo: '', valor: (a) => a.emblema },
            { rotulo: 'Nome', valor: (a) => a.nome },
            { rotulo: 'Membros', valor: (a) => String(b.alcateiaMembros.filter((m) => m.alcateiaId === a.id).length) },
            { rotulo: 'Meta semanal', valor: (a) => String(a.metaSemanal) },
            { rotulo: 'Visível', valor: (a) => (a.oculta ? 'Oculta' : 'Sim') },
          ]}
          campos={[
            { chave: 'nome', rotulo: 'Nome (moderação)' },
            { chave: 'emblema', rotulo: 'Emblema' },
            { chave: 'metaSemanal', rotulo: 'Meta semanal (missões)', tipo: 'numero' },
            { chave: 'oculta', rotulo: 'Ocultar (nome inadequado)', tipo: 'booleano' },
          ]}
          aoSalvar={(a) => salvarItem('alcateias', a, 'id', admin.id)}
          aoRemover={(a) => removerItem('alcateias', 'id', a.id, admin.id)}
        />
      )}

      {aba === 'mural' && (
        <ul className="space-y-2">
          {b.mural.map((p) => (
            <li key={p.id} className={`cartao flex flex-wrap items-center gap-2 ${p.oculto ? 'opacity-60' : ''}`}>
              <span aria-hidden>{p.icone}</span>
              <p className="min-w-0 flex-1 text-sm">
                <strong>{b.usuarios.find((u) => u.id === p.usuarioId)?.nome}</strong> {p.texto}
                <span className="block text-xs text-suave">{dataHora(p.em)}</span>
              </p>
              <button className="botao-secundario min-h-9" onClick={() => salvarItem('mural', { ...p, oculto: !p.oculto }, 'id', admin.id)}>
                {p.oculto ? 'Mostrar' : 'Ocultar'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {aba === 'voto' && (
        <section className="cartao space-y-3">
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-rs-azul" checked={cfg.votoLeao.ativo} onChange={(e) => setCfg({ ...cfg, votoLeao: { ...cfg.votoLeao, ativo: e.target.checked } })} />
            Votação aberta
          </label>
          <Campo rotulo="Pergunta da votação">
            <input className="campo" value={cfg.votoLeao.titulo} onChange={(e) => setCfg({ ...cfg, votoLeao: { ...cfg.votoLeao, titulo: e.target.value } })} />
          </Campo>
          {num(cfg.votoLeao.votosPorTier, (n) => setCfg({ ...cfg, votoLeao: { ...cfg.votoLeao, votosPorTier: n } }), 'Votos por tier')}
          <fieldset>
            <legend className="rotulo">Projetos chancelados na votação</legend>
            {b.projetos.map((p) => (
              <label key={p.id} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-rs-azul"
                  checked={cfg.votoLeao.projetos.includes(p.id)}
                  onChange={(e) => setCfg({ ...cfg, votoLeao: { ...cfg.votoLeao, projetos: e.target.checked ? [...cfg.votoLeao.projetos, p.id] : cfg.votoLeao.projetos.filter((x) => x !== p.id) } })}
                />
                {p.nome} · {p.municipio} <span className="text-suave">({b.votos.filter((v) => v.projetoId === p.id && v.edicao === b.configuracoes.cicloAtivo).length} votos)</span>
              </label>
            ))}
          </fieldset>
          <button className="botao-primario" onClick={() => salvarCfg('Voto do Leão atualizado')}>
            Salvar votação
          </button>
        </section>
      )}
    </div>
  )
}

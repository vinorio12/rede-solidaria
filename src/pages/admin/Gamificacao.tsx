import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { novoId } from '@/data/db'
import { atualizarConfiguracoes, atualizarResgate, removerItem, salvarItem } from '@/domain/servicos'
import type { Insignia, Missao, Nivel, Recompensa, TabelaXp } from '@/domain/types'
import { Abas, Campo } from '@/components/ui'
import { avisar } from '@/components/Feedback'
import { EditorColecao } from './EditorColecao'
import { data, numero } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

type Aba = 'xp' | 'niveis' | 'insignias' | 'missoes' | 'recompensas' | 'resgates'

const ROTULOS_XP: Record<keyof TabelaXp, string> = {
  primeiraDestinacao: 'Primeira destinação validada no ciclo',
  bonusPrimeiraVida: 'Bônus de primeira participação na vida',
  destinacaoAdicional: 'Destinação adicional no mesmo ciclo',
  destinacaoFamiliar: 'Destinação de familiar (por familiar)',
  doacaoCarta: 'Doação direta via carta, validada',
  conviteAceito: 'Convite aceito',
  bonusPadrinho: 'Bônus do padrinho (convidado validado)',
  limiteDiarioMissoes: 'Limite diário de XP em missões',
  quiz: 'Quiz do guia (uma vez por ciclo)',
  perfilCompleto: 'Perfil completo (uma vez)',
  bonusConsecutivoPct: 'Bônus por ciclo consecutivo (%)',
  bonusConsecutivoMaxPct: 'Teto do bônus consecutivo (%)',
}

const CRITERIOS = ['checkin', 'ler_historia', 'pergunta_dia', 'visitar_projeto', 'visitar_projetos_cidade', 'visitar_entidade_cidade', 'convites_aceitos', 'compartilhar', 'quiz', 'reporte_familiar', 'reporte_ate_prazo']

export function Gamificacao() {
  const admin = useUsuario()
  const b = useBanco()
  const [aba, setAba] = useState<Aba>('xp')
  const [xp, setXp] = useState<TabelaXp>(() => ({ ...b.configuracoes.tabelaXp }))
  const pendentes = b.resgates.filter((r) => r.status === 'solicitado' || r.status === 'aprovado')

  return (
    <div className="space-y-4">
      <Abas
        rotulo="Gamificação"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'xp', nome: 'Tabela de XP' },
          { id: 'niveis', nome: 'Níveis' },
          { id: 'insignias', nome: 'Insígnias' },
          { id: 'missoes', nome: 'Missões' },
          { id: 'recompensas', nome: 'Recompensas' },
          { id: 'resgates', nome: `Resgates (${pendentes.length})` },
        ]}
      />

      {aba === 'xp' && (
        <section className="cartao space-y-3">
          <p className="text-sm text-suave">O XP recompensa a ação de participar, nunca o tamanho da doação. Alterações valem para os próximos créditos.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(ROTULOS_XP) as (keyof TabelaXp)[]).map((k) => (
              <Campo key={k} rotulo={ROTULOS_XP[k]}>
                <input className="campo" type="number" value={xp[k]} onChange={(e) => setXp({ ...xp, [k]: Number(e.target.value) })} />
              </Campo>
            ))}
          </div>
          <button
            className="botao-primario"
            onClick={() => {
              atualizarConfiguracoes((c) => (c.tabelaXp = xp), admin.id, 'Tabela de XP atualizada')
              avisar('Tabela de XP salva.')
            }}
          >
            Salvar tabela
          </button>
        </section>
      )}

      {aba === 'niveis' && (
        <EditorColecao<Nivel>
          titulo="nível"
          itens={b.niveis}
          chave="nivel"
          colunas={[
            { rotulo: 'Nível', valor: (n) => String(n.nivel) },
            { rotulo: 'Nome', valor: (n) => n.nome },
            { rotulo: 'XP acumulado', valor: (n) => numero(n.xpMinimo) },
            { rotulo: 'Desbloqueia', valor: (n) => n.desbloqueio },
          ]}
          campos={[
            { chave: 'nivel', rotulo: 'Nível', tipo: 'numero' },
            { chave: 'nome', rotulo: 'Nome' },
            { chave: 'xpMinimo', rotulo: 'XP acumulado mínimo', tipo: 'numero' },
            { chave: 'desbloqueio', rotulo: 'O que desbloqueia', tipo: 'area' },
          ]}
          novo={() => ({ nivel: b.niveis.length + 1, nome: '', xpMinimo: 0, desbloqueio: '' })}
          aoSalvar={(n) => salvarItem('niveis', n, 'nivel', admin.id)}
        />
      )}

      {aba === 'insignias' && (
        <EditorColecao<Insignia>
          titulo="insígnia"
          itens={b.insignias}
          chave="id"
          colunas={[
            { rotulo: '', valor: (i) => i.icone },
            { rotulo: 'Nome', valor: (i) => i.nome },
            { rotulo: 'Descrição', valor: (i) => i.descricao },
            { rotulo: 'Conquistas', valor: (i) => String(b.usuarioInsignias.filter((x) => x.insigniaId === i.id).length) },
          ]}
          campos={[
            { chave: 'nome', rotulo: 'Nome' },
            { chave: 'icone', rotulo: 'Ícone (emoji)' },
            { chave: 'secreta', rotulo: 'Conquista secreta', tipo: 'booleano' },
            { chave: 'descricao', rotulo: 'Descrição', tipo: 'area' },
          ]}
          novo={() => ({ id: novoId('ins'), nome: '', descricao: '', icone: '⭐', secreta: false })}
          aoSalvar={(i) => salvarItem('insignias', i, 'id', admin.id)}
        />
      )}

      {aba === 'missoes' && (
        <EditorColecao<Missao>
          titulo="missão"
          itens={b.missoes}
          chave="id"
          colunas={[
            { rotulo: 'Missão', valor: (m) => m.titulo },
            { rotulo: 'Recorrência', valor: (m) => t.recorrencia[m.recorrencia] },
            { rotulo: 'XP', valor: (m) => String(m.xp) },
            { rotulo: 'Ativa', valor: (m) => (m.ativa ? 'Sim' : 'Não') },
          ]}
          campos={[
            { chave: 'titulo', rotulo: 'Título' },
            { chave: 'xp', rotulo: 'XP', tipo: 'numero' },
            { chave: 'recorrencia', rotulo: 'Recorrência', tipo: 'select', opcoes: Object.entries(t.recorrencia).map(([valor, nome]) => ({ valor, nome })) },
            { chave: 'criterio', rotulo: 'Critério de conclusão', tipo: 'select', opcoes: CRITERIOS.map((c) => ({ valor: c, nome: c })) },
            { chave: 'meta', rotulo: 'Quantidade para concluir', tipo: 'numero' },
            {
              chave: 'publico',
              rotulo: 'Público-alvo',
              tipo: 'select',
              opcoes: [
                { valor: 'todos', nome: 'Todos' },
                { valor: 'colaboradores', nome: 'Colaboradores' },
                { valor: 'embaixadores', nome: 'Embaixadores' },
              ],
            },
            { chave: 'temporadaId', rotulo: 'Temporada', tipo: 'select', opcoes: b.temporadas.map((x) => ({ valor: x.id, nome: x.nome })), opcional: true },
            { chave: 'ativa', rotulo: 'Ativa', tipo: 'booleano' },
            { chave: 'descricao', rotulo: 'Descrição', tipo: 'area' },
          ]}
          novo={() => ({ id: novoId('m'), titulo: '', descricao: '', xp: 20, recorrencia: 'diaria', criterio: 'checkin', meta: 1, publico: 'todos', ativa: true })}
          aoSalvar={(m) => salvarItem('missoes', m, 'id', admin.id)}
          aoRemover={(m) => removerItem('missoes', 'id', m.id, admin.id)}
        />
      )}

      {aba === 'recompensas' && (
        <EditorColecao<Recompensa>
          titulo="recompensa"
          itens={b.recompensas}
          chave="id"
          colunas={[
            { rotulo: 'Recompensa', valor: (r) => `${r.icone} ${r.nome}` },
            { rotulo: 'Nível mínimo', valor: (r) => String(r.nivelMinimo) },
            { rotulo: 'Estoque', valor: (r) => (r.estoque === null ? 'ilimitado' : String(r.estoque)) },
            { rotulo: 'Validade', valor: (r) => (r.validoAte ? data(r.validoAte) : '-') },
          ]}
          campos={[
            { chave: 'nome', rotulo: 'Nome' },
            { chave: 'icone', rotulo: 'Ícone (emoji)' },
            {
              chave: 'tipo',
              rotulo: 'Tipo',
              tipo: 'select',
              opcoes: ['insignia', 'moldura', 'tema', 'voucher', 'experiencia', 'premiacao'].map((v) => ({ valor: v, nome: v })),
            },
            { chave: 'nivelMinimo', rotulo: 'Nível mínimo', tipo: 'numero' },
            { chave: 'insigniaRequerida', rotulo: 'Insígnia exigida', tipo: 'select', opcoes: b.insignias.map((i) => ({ valor: i.id, nome: i.nome })), opcional: true },
            { chave: 'estoque', rotulo: 'Estoque (vazio = ilimitado)', tipo: 'numero', opcional: true },
            { chave: 'validoAte', rotulo: 'Válido até', tipo: 'data', opcional: true },
            { chave: 'descricao', rotulo: 'Descrição', tipo: 'area' },
          ]}
          novo={() => ({ id: novoId('rc'), nome: '', descricao: '', tipo: 'experiencia', nivelMinimo: 1, estoque: 10, icone: '🎁' })}
          aoSalvar={(r) => salvarItem('recompensas', r, 'id', admin.id)}
          aoRemover={(r) => removerItem('recompensas', 'id', r.id, admin.id)}
        />
      )}

      {aba === 'resgates' && (
        <ul className="space-y-2">
          {!b.resgates.length && <li className="text-sm text-suave">Nenhum resgate ainda.</li>}
          {b.resgates.map((r) => (
            <li key={r.id} className="cartao flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{b.recompensas.find((x) => x.id === r.recompensaId)?.nome}</p>
                <p className="text-sm text-suave">
                  {b.usuarios.find((u) => u.id === r.usuarioId)?.nome} · {data(r.em)} · {r.status}
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
      )}
    </div>
  )
}

import { useState } from 'react'
import { useBanco } from '@/data/useBanco'
import * as C from '@/domain/consultas'
import { estadoTrilha } from '@/domain/jogo'
import type { Banco } from '@/domain/types'
import { BarrasHorizontais, Tabela, type Ponto } from '@/components/Graficos'
import { Campo } from '@/components/ui'
import { numero } from '@/lib/datas'
import { diaSP, segundaSP, somarDias } from '@/lib/tempo'
import { t } from '@/i18n/pt-BR'

// Analytics de gamificação (seção 9): atividade, missões, trilha, níveis, itens,
// links de convidado e simulador de economia para ajustar a curva antes de publicar.

interface Perfil {
  nome: string
  diariasPorSemana: number
  semanaisPorSemana: number
  destinacoesProprias: number
  familiares: number
  convidados: number
  convitesAceitos: number
  quiz: boolean
  bausDia: number // por semana
  bausSemana: number // por mês
}

const PERFIS: Perfil[] = [
  { nome: 'Casual', diariasPorSemana: 3, semanaisPorSemana: 0.5, destinacoesProprias: 1, familiares: 0, convidados: 0, convitesAceitos: 1, quiz: false, bausDia: 0, bausSemana: 0 },
  { nome: 'Regular', diariasPorSemana: 10, semanaisPorSemana: 2, destinacoesProprias: 1, familiares: 1, convidados: 1, convitesAceitos: 3, quiz: true, bausDia: 2, bausSemana: 1 },
  { nome: 'Engajado', diariasPorSemana: 18, semanaisPorSemana: 4.5, destinacoesProprias: 2, familiares: 2, convidados: 4, convitesAceitos: 8, quiz: true, bausDia: 6, bausSemana: 3 },
]

/** Projeta XP e Patinhas por edição (52 semanas) com a configuração atual. */
export function simularEconomia(b: Banco, p: Perfil) {
  const cfg = b.configuracoes
  const tx = cfg.tabelaXp
  const media = (tipo: string, campo: 'xp' | 'patinhas') => {
    const ms = b.missoes.filter((m) => m.tipo === tipo && m.ativa)
    return ms.length ? ms.reduce((s, m) => s + m[campo], 0) / ms.length : 0
  }
  const diariaXp = Math.min(media('diaria', 'xp'), tx.limiteDiarioMissoes)
  const xpMissoes = 52 * (p.diariasPorSemana * diariaXp + p.semanaisPorSemana * media('semanal', 'xp'))
  const xpReportes = (p.destinacoesProprias > 0 ? tx.primeiraDestinacao + (p.destinacoesProprias - 1) * tx.destinacaoAdicional : 0) + p.familiares * tx.destinacaoFamiliar + p.convidados * tx.reporteConvidado
  const xpOutros = p.convitesAceitos * tx.conviteAceito + (p.quiz ? tx.quiz : 0)
  const jornadaETemporada = b.missoes.filter((m) => (m.tipo === 'jornada' || m.tipo === 'temporada') && m.ativa).reduce((s, m) => s + m.xp, 0) * (p.nome === 'Casual' ? 0.3 : p.nome === 'Regular' ? 0.7 : 1)
  const xpEdicao = Math.round(xpMissoes + xpReportes + xpOutros + jornadaETemporada)
  const patinhasMissoes = 52 * (p.diariasPorSemana * media('diaria', 'patinhas') + p.semanaisPorSemana * media('semanal', 'patinhas'))
  const patinhasBaus = 52 * p.bausDia * cfg.patinhas.bauDia + 12 * p.bausSemana * cfg.patinhas.bauSemana
  const patinhasDest = p.destinacoesProprias > 0 ? cfg.patinhas.destinacaoPropria : 0
  const evolucao = [1, 2, 3].map((n) => {
    const xp = xpEdicao * n
    const nv = C.nivelDe(xp, b.niveis).atual
    const patinhasNivel = b.niveis.filter((x) => x.nivel > 1 && x.nivel <= nv.nivel).reduce((s, x) => s + cfg.patinhas.porTier * x.tier, 0)
    return { edicoes: n, xp, nivel: nv.nivel, tier: C.flexionar(C.tierDe(b, nv).nome, 'n'), patinhas: Math.round((patinhasMissoes + patinhasBaus + patinhasDest) * n + patinhasNivel) }
  })
  return { xpEdicao, evolucao }
}

function atividade(b: Banco) {
  const hoje = diaSP()
  const dias: Ponto[] = []
  for (let k = 13; k >= 0; k--) {
    const d = somarDias(hoje, -k)
    dias.push({ rotulo: d.slice(8, 10) + '/' + d.slice(5, 7), valor: new Set(b.eventos.filter((e) => e.dia === d && !e.estornado).map((e) => e.usuarioId)).size })
  }
  const semanas: Ponto[] = []
  for (let k = 5; k >= 0; k--) {
    const s = somarDias(segundaSP(), -7 * k)
    const fim = somarDias(s, 6)
    semanas.push({ rotulo: `Semana de ${s.slice(8, 10)}/${s.slice(5, 7)}`, valor: new Set(b.eventos.filter((e) => e.dia >= s && e.dia <= fim && !e.estornado).map((e) => e.usuarioId)).size })
  }
  return { dias, semanas }
}

export function Analytics() {
  const b = useBanco()
  const [perfis, setPerfis] = useState(PERFIS)
  const pessoas = b.usuarios.filter((u) => u.perfil !== 'admin')
  const { dias, semanas } = atividade(b)

  const conclusao = b.missoes
    .filter((m) => m.ativa)
    .map((m) => {
      const atribuidas = m.tipo === 'diaria' || m.tipo === 'semanal' ? b.sorteios.filter((s) => s.missoes.includes(m.id)).length : b.usuarioMissoes.filter((x) => x.missaoId === m.id).length
      const feitas = b.usuarioMissoes.filter((x) => x.missaoId === m.id && x.concluidaEm).length
      return { m, atribuidas, feitas, taxa: atribuidas ? Math.round((feitas / atribuidas) * 100) : 0 }
    })
    .sort((a, c) => c.taxa - a.taxa)

  const trilhas = pessoas.map((u) => estadoTrilha(b, u.id)?.alcancado ?? 0)
  const mediaTrilha = trilhas.length ? trilhas.reduce((s, x) => s + x, 0) / trilhas.length : 0
  const porTier: Ponto[] = b.tiers.map((tr) => ({ rotulo: C.flexionar(tr.nome, 'n'), valor: pessoas.filter((u) => C.statusJogador(b, u.id).tier.numero === tr.numero).length }))
  const porNivel = new Map<number, number>()
  for (const u of pessoas) {
    const n = C.statusJogador(b, u.id).atual.nivel
    porNivel.set(n, (porNivel.get(n) ?? 0) + 1)
  }
  const usoItens = new Map<string, number>()
  for (const u of pessoas) for (const id of Object.values(u.avatar)) if (id) usoItens.set(id, (usoItens.get(id) ?? 0) + 1)
  const topItens: Ponto[] = [...usoItens.entries()]
    .sort((a, c) => c[1] - a[1])
    .slice(0, 8)
    .map(([id, n]) => ({ rotulo: b.itens.find((i) => i.id === id)?.nome ?? id, valor: n }))
  const conv = b.reportes.filter((r) => r.convidado && !r.convidado.lancadoPeloColaborador)
  const funilLinks: Ponto[] = [
    { rotulo: 'Links de convidado gerados', valor: b.linksConvidado.length },
    { rotulo: 'Envios pelos links', valor: b.linksConvidado.reduce((s, l) => s + l.envios.length, 0) },
    { rotulo: 'Reportes recebidos', valor: conv.length },
    { rotulo: 'Confirmados pelo colaborador', valor: conv.filter((r) => !['aguardando_colaborador', 'recusado_colaborador'].includes(r.status)).length },
    { rotulo: 'Validados', valor: conv.filter((r) => r.status === 'validado').length },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cartao space-y-2">
          <h2 className="font-titulo font-bold text-weg-900">Usuários ativos por dia (14 dias)</h2>
          <BarrasHorizontais titulo="Usuários ativos por dia" pontos={dias} formatar={(v) => `${v} pessoas`} />
        </section>
        <section className="cartao space-y-2">
          <h2 className="font-titulo font-bold text-weg-900">Usuários ativos por semana</h2>
          <BarrasHorizontais titulo="Usuários ativos por semana" pontos={semanas} formatar={(v) => `${v} pessoas`} />
          <h2 className="pt-3 font-titulo font-bold text-weg-900">Distribuição por tier</h2>
          <BarrasHorizontais titulo="Pessoas por tier" pontos={porTier} formatar={(v) => `${v} pessoas`} />
          <p className="text-xs text-suave">
            Por nível: {[...porNivel.entries()].sort((a, c) => a[0] - c[0]).map(([n, q]) => `${n}: ${q}`).join(' · ')}. Avanço médio na trilha: {mediaTrilha.toFixed(1)} degraus.
          </p>
        </section>
      </div>
      <section className="cartao space-y-2">
        <h2 className="font-titulo font-bold text-weg-900">Taxa de conclusão por missão</h2>
        <Tabela colunas={['Missão', 'Tipo', 'Atribuídas', 'Concluídas', 'Conclusão']} linhas={conclusao.map((x) => [x.m.titulo, t.tipoMissao[x.m.tipo], x.atribuidas, x.feitas, `${x.taxa}%`])} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cartao space-y-2">
          <h2 className="font-titulo font-bold text-weg-900">Itens mais usados</h2>
          <BarrasHorizontais titulo="Itens equipados" pontos={topItens} formatar={(v) => `${v} pessoas`} />
        </section>
        <section className="cartao space-y-2">
          <h2 className="font-titulo font-bold text-weg-900">Conversão dos links de convidado</h2>
          <BarrasHorizontais titulo="Funil dos links de convidado" pontos={funilLinks} formatar={numero} />
        </section>
      </div>

      <section className="cartao space-y-3">
        <h2 className="font-titulo text-lg font-bold text-weg-900">Simulador de economia</h2>
        <p className="text-sm text-suave">Projeta XP e Patinhas por perfil com a configuração atual (tabela de XP, missões, baús e níveis). Ajuste as premissas e veja onde cada perfil chega antes de publicar mudanças.</p>
        <div className="grid gap-4 lg:grid-cols-3">
          {perfis.map((p, i) => {
            const r = simularEconomia(b, p)
            const set = (k: keyof Perfil, v: number) => setPerfis(perfis.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
            return (
              <div key={p.nome} className="space-y-2 rounded-2xl border border-borda p-3">
                <h3 className="font-titulo font-bold text-rs-azul">{p.nome}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['diariasPorSemana', 'Diárias/semana'],
                      ['semanaisPorSemana', 'Semanais/semana'],
                      ['destinacoesProprias', 'Destinações próprias'],
                      ['familiares', 'Familiares'],
                      ['convidados', 'Convidados'],
                      ['convitesAceitos', 'Convites aceitos'],
                    ] as [keyof Perfil, string][]
                  ).map(([k, rotulo]) => (
                    <Campo key={k} rotulo={rotulo}>
                      <input className="campo min-h-9 py-1" type="number" step="0.5" value={p[k] as number} onChange={(e) => set(k, Number(e.target.value))} />
                    </Campo>
                  ))}
                </div>
                <p className="text-sm">
                  <strong>{numero(r.xpEdicao)} XP</strong> por edição
                </p>
                <Tabela colunas={['Edições', 'XP', 'Nível', 'Tier', 'Patinhas']} linhas={r.evolucao.map((e) => [e.edicoes, numero(e.xp), e.nivel, e.tier, numero(e.patinhas)])} />
              </div>
            )
          })}
        </div>
        <p className="text-xs text-suave">Meta de desenho (seção 6): um participante casual chega ao tier 2 no primeiro ano; um muito engajado leva cerca de três edições até o nível 25.</p>
      </section>
    </div>
  )
}

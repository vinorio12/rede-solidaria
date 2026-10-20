import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { missaoDisponivel, periodoMissao, temporadaAtual, xpMissoesHoje } from '@/domain/regras'
import { checkin } from '@/domain/servicos'
import type { CriterioMissao, Recorrencia } from '@/domain/types'
import { Mascote } from '@/components/Mascote'
import { Icone } from '@/components/Icone'
import { Abas, BarraProgresso, CabecalhoPagina, Vazio } from '@/components/ui'
import { avisar, confete } from '@/components/Feedback'

const ACAO: Record<CriterioMissao, { para: string; rotulo: string }> = {
  checkin: { para: '', rotulo: 'Fazer check-in' },
  ler_historia: { para: '/', rotulo: 'Ver destaque' },
  pergunta_dia: { para: '/guia#pergunta', rotulo: 'Responder' },
  visitar_projeto: { para: '/projetos', rotulo: 'Ver projetos' },
  visitar_projetos_cidade: { para: '/projetos', rotulo: 'Ver projetos' },
  visitar_entidade_cidade: { para: '/entidades', rotulo: 'Ver entidades' },
  convites_aceitos: { para: '/convidar', rotulo: 'Convidar' },
  compartilhar: { para: '/perfil#card', rotulo: 'Gerar card' },
  quiz: { para: '/guia#quiz', rotulo: 'Fazer o quiz' },
  reporte_familiar: { para: '/reportar', rotulo: 'Reportar' },
  reporte_ate_prazo: { para: '/reportar', rotulo: 'Reportar' },
}

export function Missoes() {
  const u = useUsuario()
  const b = useBanco()
  const [aba, setAba] = useState<Recorrencia>('diaria')
  const temporada = temporadaAtual(b)
  const usadoHoje = xpMissoesHoje(b, u.id)
  const limite = b.configuracoes.tabelaXp.limiteDiarioMissoes
  const missoes = b.missoes.filter((m) => m.recorrencia === aba && missaoDisponivel(m, u, b))

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CabecalhoPagina titulo="Missões" subtitulo="Opcionais e sem pressa: a sequência conta temporadas e ciclos, não dias." />
      {temporada && (
        <section className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-weg-900 to-rs-azul p-4 text-white">
          <Mascote variante="apontando" tamanho={64} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-rs-ciano">Temporada atual</p>
            <h2 className="font-titulo text-lg font-bold">{temporada.nome}</h2>
            <p className="text-sm text-white/85">{temporada.descricao}</p>
          </div>
        </section>
      )}
      <Abas
        rotulo="Tipo de missão"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'diaria', nome: 'Diárias' },
          { id: 'semanal', nome: 'Semanais' },
          { id: 'sazonal', nome: 'Da temporada' },
        ]}
      />
      {aba === 'diaria' && (
        <div className="cartao">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold">XP de missões diárias hoje</span>
            <span>
              {usadoHoje}/{limite} XP
            </span>
          </div>
          <BarraProgresso valor={usadoHoje} max={limite} rotulo="Limite diário de XP em missões" />
        </div>
      )}
      {!missoes.length && <Vazio texto="Nenhuma missão deste tipo disponível agora." variante="dormindo" />}
      <ul className="space-y-2">
        {missoes.map((m) => {
          const um = b.usuarioMissoes.find((x) => x.usuarioId === u.id && x.missaoId === m.id && x.periodo === periodoMissao(m, b))
          const progresso = Math.min(um?.progresso ?? 0, m.meta)
          const feita = !!um?.concluidaEm
          const acao = ACAO[m.criterio]
          return (
            <li key={m.id} className={`cartao flex items-center gap-3 ${feita ? 'border-sucesso/40 bg-sucesso-claro/60' : ''}`}>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${feita ? 'bg-sucesso text-white' : 'bg-rs-ciano-claro text-rs-azul'}`}>
                <Icone nome={feita ? 'check' : 'missoes'} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{m.titulo}</h3>
                  {m.publico === 'embaixadores' && <span className="chip bg-weg-900 text-white">Embaixador</span>}
                </div>
                <p className="text-sm text-suave">{m.descricao}</p>
                {m.meta > 1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <BarraProgresso valor={progresso} max={m.meta} rotulo={`Progresso da missão ${m.titulo}`} />
                    <span className="text-xs font-bold">
                      {progresso}/{m.meta}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-titulo text-sm font-bold text-rs-azul">+{m.xp} XP</span>
                {!feita &&
                  (m.criterio === 'checkin' ? (
                    <button
                      className="botao-secundario min-h-9 px-3 py-1 text-xs"
                      onClick={() => {
                        if (checkin(u.id).length) {
                          confete()
                          avisar('Check-in feito')
                        }
                      }}
                    >
                      {acao.rotulo}
                    </button>
                  ) : (
                    <Link to={acao.para} className="botao-secundario min-h-9 px-3 py-1 text-xs">
                      {acao.rotulo}
                    </Link>
                  ))}
                {feita && <span className="text-xs font-bold text-sucesso">Concluída</span>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

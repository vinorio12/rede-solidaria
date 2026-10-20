import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { ocorrenciaTemporada, relampagoAtivo } from '@/domain/consultas'
import { bauDisponivel, xpDiariasNoDia } from '@/domain/motor'
import { missoesDoUsuario } from '@/domain/jogo'
import { abrirBau, checkin, registrar, trocarDiaria } from '@/domain/servicos'
import type { CriterioMissao, Missao, TipoEvento } from '@/domain/types'
import { Mascote } from '@/components/Mascote'
import { Icone } from '@/components/Icone'
import { AnelProgresso, IconePatinha } from '@/components/Jogo'
import { Abas, BarraProgresso, CabecalhoPagina, Vazio } from '@/components/ui'
import { avisar, confete, tentar } from '@/components/Feedback'
import { data, dataHora } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

const ACAO: Partial<Record<TipoEvento, { para: string; rotulo: string }>> = {
  checkin: { para: '', rotulo: 'Fazer check-in' },
  historia_lida: { para: '/', rotulo: 'Ver destaque' },
  pergunta_do_dia_respondida: { para: '/guia#pergunta', rotulo: 'Responder' },
  projeto_visitado: { para: '/projetos', rotulo: 'Ver projetos' },
  entidade_visitada: { para: '/entidades', rotulo: 'Ver entidades' },
  reacao_enviada: { para: '/mural', rotulo: 'Ir ao mural' },
  curiosidade_vista: { para: '/', rotulo: 'Ver curiosidade' },
  meta_conferida: { para: '/', rotulo: 'Ver a meta' },
  convite_aceito: { para: '/convidar', rotulo: 'Convidar' },
  convite_enviado: { para: '/convidar', rotulo: 'Convidar' },
  missao_concluida: { para: '/missoes', rotulo: 'Ver diárias' },
  conquista_compartilhada: { para: '/perfil#card', rotulo: 'Gerar card' },
  licao_guia_concluida: { para: '/guia', rotulo: 'Abrir o guia' },
  quiz_concluido: { para: '/guia#quiz', rotulo: 'Fazer o quiz' },
  simulador_usado: { para: '/guia#simulador', rotulo: 'Usar o simulador' },
  familia_atualizada: { para: '/familia', rotulo: 'Minha família' },
  alcateia_meta_batida: { para: '/alcateia', rotulo: 'Minha alcateia' },
  alcateia_entrou: { para: '/alcateia', rotulo: 'Alcateias' },
  perfil_completo: { para: '/perfil', rotulo: 'Completar perfil' },
  item_equipado: { para: '/personalizar', rotulo: 'Personalizar' },
  reporte_validado: { para: '/reportar', rotulo: 'Reportar' },
  doacao_direta_validada: { para: '/reportar', rotulo: 'Reportar' },
  multiplicacao_validada: { para: '/convidados', rotulo: 'Convidados' },
  link_convidado_gerado: { para: '/convidar#link-convidado', rotulo: 'Gerar link' },
}

type Estado = ReturnType<typeof missoesDoUsuario>['diarias'][number]

export function Missoes() {
  const u = useUsuario()
  const b = useBanco()
  const [aba, setAba] = useState<'diaria' | 'semanal' | 'jornada' | 'temporada'>('diaria')
  const ms = missoesDoUsuario(b, u.id)
  const oc = ocorrenciaTemporada(b)
  const rel = relampagoAtivo(b)
  const usadoHoje = xpDiariasNoDia(b, u.id, ms.dia)
  const limite = b.configuracoes.tabelaXp.limiteDiarioMissoes
  const bauDia = bauDisponivel(b, u.id, 'dia', ms.dia)
  const bauSemana = bauDisponivel(b, u.id, 'semana', ms.semana)

  const abrir = (tipo: 'dia' | 'semana') => {
    const n = abrirBau(u.id, tipo, tipo === 'dia' ? ms.dia : ms.semana)
    if (n) {
      confete()
      avisar(`${tipo === 'dia' ? 'Baú do Dia' : 'Baú da Semana'} aberto: +${n} Patinhas`)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CabecalhoPagina titulo="Missões" subtitulo="Opcionais e sem pressa: a sequência conta temporadas e edições, não dias." />
      {oc && (
        <section className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-weg-900 to-rs-azul p-4 text-white">
          <Mascote variante="apontando" tamanho={64} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-rs-ciano">Temporada atual · até {data(oc.fim)}</p>
            <h2 className="font-titulo text-lg font-bold">{oc.temporada.nome}</h2>
            <p className="text-sm text-white/85">{oc.temporada.descricao}</p>
          </div>
          <Link to="/trilha" className="botao hidden bg-white text-weg-900 sm:inline-flex">
            Trilha
          </Link>
        </section>
      )}
      {rel && (
        <p className="rounded-2xl border-2 border-dashed border-[#6B4FBB] bg-[#6B4FBB]/10 p-3 text-sm font-semibold text-[#4a3590]">
          ⚡ {rel.nome}: XP ×{rel.multiplicadorEducativo} nas missões educativas até {dataHora(rel.fim)}.
        </p>
      )}
      <Abas
        rotulo="Tipo de missão"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'diaria', nome: 'Diárias' },
          { id: 'semanal', nome: 'Semanais' },
          { id: 'jornada', nome: 'Jornada' },
          { id: 'temporada', nome: 'Temporada e mais' },
        ]}
      />

      {aba === 'diaria' && (
        <>
          <div className="cartao space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">XP de diárias hoje</span>
              <span>
                {usadoHoje}/{limite} XP
              </span>
            </div>
            <BarraProgresso valor={usadoHoje} max={limite} rotulo="Limite diário de XP em missões" />
            <p className="text-xs text-suave">3 missões sorteadas para você, renovadas à meia-noite (horário de Brasília). Uma troca gratuita por dia.</p>
          </div>
          <Bau titulo="Baú do Dia" patinhas={b.configuracoes.patinhas.bauDia} disponivel={bauDia} aberto={!!ms.sorteioDia?.bauAberto} aoAbrir={() => abrir('dia')} />
          <Lista
            itens={ms.diarias}
            uid={u.id}
            podeTrocar={!ms.sorteioDia?.trocou}
            aoTrocar={(m) => {
              if (trocarDiaria(u.id, ms.dia, m.id)) avisar('Missão trocada.', 'info')
            }}
          />
        </>
      )}

      {aba === 'semanal' && (
        <>
          <Bau titulo="Baú da Semana" patinhas={b.configuracoes.patinhas.bauSemana} disponivel={bauSemana} aberto={!!ms.sorteioSemana?.bauAberto} aoAbrir={() => abrir('semana')} />
          <Lista itens={ms.semanais} uid={u.id} />
        </>
      )}

      {aba === 'jornada' && (
        <ol className="space-y-3">
          {ms.jornada.map((x, i) => {
            const anterior = i === 0 || ms.jornada[i - 1].concluida
            const item = b.itens.find((it) => it.id === x.missao.itemRecompensa)
            return (
              <li key={x.missao.id} className={`cartao space-y-2 ${!anterior && !x.concluida ? 'opacity-70' : ''} ${x.concluida ? 'border-sucesso/40 bg-sucesso-claro/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <AnelProgresso fracao={x.fracao} tamanho={56} rotulo={`Progresso do capítulo ${x.missao.capitulo}`}>
                    <span className="font-titulo text-sm font-bold">{x.missao.capitulo}</span>
                  </AnelProgresso>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-rs-azul">Capítulo {x.missao.capitulo}</p>
                    <h3 className="font-titulo text-lg font-bold text-weg-900">{x.missao.titulo}</h3>
                    {x.missao.narrativa && <p className="text-sm italic text-suave">{x.missao.narrativa}</p>}
                  </div>
                  <Premio m={x.missao} />
                </div>
                <ul className="space-y-1 pl-1">
                  {x.missao.criterios.map((c, ci) => (
                    <PassoCriterio key={ci} c={c} feito={x.progresso[ci]} />
                  ))}
                </ul>
                {item && (
                  <p className="text-xs text-suave">
                    Recompensa exclusiva: <strong>{item.nome}</strong>
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {aba === 'temporada' && (
        <div className="space-y-4">
          {[
            ['Da temporada', ms.temporada],
            ['Relâmpago', ms.relampago],
            ['Família, convidados, alcateia e embaixador', ms.outras],
          ].map(([titulo, lista]) => (
            <section key={titulo as string}>
              <h2 className="mb-2 font-titulo font-bold text-weg-900">{titulo as string}</h2>
              {(lista as Estado[]).length ? <Lista itens={lista as Estado[]} uid={u.id} /> : <p className="text-sm text-suave">Nenhuma disponível agora.</p>}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function Bau({ titulo, patinhas, disponivel, aberto, aoAbrir }: { titulo: string; patinhas: number; disponivel: boolean; aberto: boolean; aoAbrir: () => void }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3 ${disponivel ? 'border-[#C9A227] bg-[#C9A227]/10' : 'border-borda bg-superficie'}`}>
      <span className="text-3xl" aria-hidden>
        {aberto ? '🎉' : '🧰'}
      </span>
      <div className="flex-1 text-sm">
        <p className="font-titulo font-bold text-weg-900">{titulo}</p>
        <p className="text-suave">{aberto ? 'Já aberto neste período.' : disponivel ? 'Todas concluídas: pode abrir!' : 'Conclua todas as missões do período para abrir.'}</p>
      </div>
      <button className="botao-primario" disabled={!disponivel} onClick={aoAbrir}>
        +{patinhas} <IconePatinha tamanho={14} />
      </button>
    </div>
  )
}

function Premio({ m }: { m: Missao }) {
  return (
    <div className="flex shrink-0 flex-col items-end text-xs font-bold">
      <span className="font-titulo text-sm text-rs-azul">+{m.xp} XP</span>
      <span className="inline-flex items-center gap-0.5 text-[#9a7a12]">
        +{m.patinhas} <IconePatinha tamanho={12} />
      </span>
    </div>
  )
}

function PassoCriterio({ c, feito }: { c: CriterioMissao; feito: number }) {
  const ok = feito >= c.quantidade
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={ok ? 'text-sucesso' : 'text-suave'}>
        <Icone nome={ok ? 'check' : 'relogio'} tamanho={16} />
      </span>
      <span className={ok ? 'line-through opacity-70' : ''}>{c.rotulo ?? `${t.janela[c.janela]}: ${c.evento}`}</span>
      {c.quantidade > 1 && (
        <span className="text-xs text-suave">
          ({Math.min(feito, c.quantidade)}/{c.quantidade})
        </span>
      )}
    </li>
  )
}

function Lista({ itens, uid, podeTrocar, aoTrocar }: { itens: Estado[]; uid: string; podeTrocar?: boolean; aoTrocar?: (m: Missao) => void }) {
  if (!itens.length) return <Vazio texto="Nenhuma missão por aqui agora." variante="dormindo" />
  return (
    <ul className="space-y-2">
      {itens.map((x) => {
        const m = x.missao
        const acao = ACAO[m.criterios[0]?.evento]
        const total = m.criterios.reduce((s, c) => s + c.quantidade, 0)
        const feito = x.progresso.reduce((s, p) => s + p, 0)
        return (
          <li key={m.id} className={`cartao flex items-center gap-3 ${x.concluida ? 'border-sucesso/40 bg-sucesso-claro/60' : ''}`}>
            <AnelProgresso fracao={x.concluida ? 1 : x.fracao} tamanho={48} cor={x.concluida ? '#0F7B4F' : '#00BEDF'} rotulo={`Progresso de ${m.titulo}`}>
              {x.concluida ? <Icone nome="check" tamanho={18} className="text-sucesso" /> : <span className="text-[11px] font-bold">{total > 1 ? `${feito}/${total}` : ''}</span>}
            </AnelProgresso>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{m.titulo}</h3>
                {m.publico === 'embaixadores' && <span className="chip bg-weg-900 text-white">Embaixador</span>}
                {m.educativa && <span className="chip bg-rs-ciano-claro text-weg-900">Educativa</span>}
              </div>
              <p className="text-sm text-suave">{m.descricao}</p>
              {m.fim && <p className="text-xs text-suave">Até {dataHora(m.fim)}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Premio m={m} />
              {!x.concluida && m.criterios[0]?.evento === 'checkin' && (
                <button
                  className="botao-secundario min-h-9 px-3 py-1 text-xs"
                  onClick={() => {
                    if (checkin(uid).length) confete()
                  }}
                >
                  Check-in
                </button>
              )}
              {!x.concluida && m.criterios[0]?.evento === 'apresentacao_registrada' && <RegistrarApresentacao uid={uid} />}
              {!x.concluida && acao?.para && (
                <Link to={acao.para} className="botao-secundario min-h-9 px-3 py-1 text-xs">
                  {acao.rotulo}
                </Link>
              )}
              {!x.concluida && podeTrocar && aoTrocar && (
                <button className="text-xs font-semibold text-rs-azul underline" onClick={() => aoTrocar(m)}>
                  Trocar
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Missão de embaixador: registro da apresentação com foto (a foto fica só no aparelho, como comprovação simulada). */
function RegistrarApresentacao({ uid }: { uid: string }) {
  return (
    <label className="botao-secundario min-h-9 cursor-pointer px-3 py-1 text-xs">
      Enviar foto
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) tentar(() => registrar(uid, 'apresentacao_registrada', { ref: f.name }), 'Apresentação registrada. Obrigado por espalhar a Rede!')
        }}
      />
    </label>
  )
}

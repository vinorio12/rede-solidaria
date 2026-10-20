import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import * as R from '@/domain/regras'
import { rankingUnidades } from '@/domain/ranking'
import { estadoTrilha, proximaConquista } from '@/domain/jogo'
import { checkin, registrar, registrarConsentimento } from '@/domain/servicos'
import { curiosidadeDoDia } from '@/domain/conteudo'
import { Mascote } from '@/components/Mascote'
import { Icone } from '@/components/Icone'
import { AvatarLeao } from '@/components/AvatarLeao'
import { AnelProgresso, Patinhas } from '@/components/Jogo'
import { BarraProgresso, Modal } from '@/components/ui'
import { avisar, confete } from '@/components/Feedback'
import { TermoLgpd } from '@/components/TermoLgpd'
import { data, diasAte, moeda, numero } from '@/lib/datas'
import { diaSP } from '@/lib/tempo'
import { t } from '@/i18n/pt-BR'

const CHAVE_ONBOARDING = 'rede-solidaria:onboarding'

function avisarMissoes(feitas: { titulo: string }[]) {
  if (!feitas.length) return
  confete()
  avisar(`Missão concluída: ${feitas.map((m) => m.titulo).join(', ')}`)
}

export function Inicio() {
  const u = useUsuario()
  const b = useBanco()
  const ciclo = R.cicloAtivo(b)
  const st = R.statusJogador(b, u.id)
  const total = R.totalArrecadado(b, ciclo.ano)
  const emValidacao = R.totalEmValidacao(b, ciclo.ano)
  const ind = R.indicadoresCiclo(b, ciclo.ano)
  const pct = ciclo.meta ? (total / ciclo.meta) * 100 : 0
  const sequencia = R.sequenciaCiclos(b, u.id, ciclo.ano)
  const hoje = diaSP()
  const checkinFeito = b.eventos.some((e) => e.usuarioId === u.id && e.tipo === 'checkin' && e.dia === hoje && !e.estornado)
  const curiosidadeVista = b.eventos.some((e) => e.usuarioId === u.id && e.tipo === 'curiosidade_vista' && e.dia === hoje)
  const liderUnidade = rankingUnidades(b, 'edicao')[0]
  const trilha = estadoTrilha(b, u.id)
  const proxima = u.perfil !== 'admin' ? proximaConquista(b, u.id) : null
  const voto = b.configuracoes.votoLeao
  const votos = voto.projetos.map((id) => ({ projeto: b.projetos.find((p) => p.id === id), votos: b.votos.filter((v) => v.projetoId === id && v.edicao === ciclo.ano).length })).filter((x) => x.projeto)
  const totalVotos = votos.reduce((s, v) => s + v.votos, 0)

  const projetos = b.projetos
  const [destaque, setDestaque] = useState(0)
  useEffect(() => {
    if (projetos.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setDestaque((d) => (d + 1) % projetos.length), 9000)
    return () => clearInterval(id)
  }, [projetos.length])
  const p = projetos[destaque % Math.max(1, projetos.length)]

  const [mostrarCuriosidade, setMostrarCuriosidade] = useState(false)
  const [metaAberta, setMetaAberta] = useState(false)
  const [onboarding, setOnboarding] = useState(() => {
    try {
      return !localStorage.getItem(`${CHAVE_ONBOARDING}:${u.id}`)
    } catch {
      return false
    }
  })
  const [aceite, setAceite] = useState(false)

  const fecharOnboarding = () => {
    try {
      localStorage.setItem(`${CHAVE_ONBOARDING}:${u.id}`, '1')
    } catch {
      /* sem armazenamento */
    }
    setOnboarding(false)
  }

  return (
    <div className="space-y-5">
      {/* Cartão do jogador: nível, título, tier, prestígio, XP e Patinhas */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-weg-900 via-weg-900 to-rs-azul p-5 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <button
            className="-mb-1 rounded-full focus-visible:outline-white"
            aria-label="Leãozinho"
            onClick={() => registrar(u.id, 'mascote_tocado')} // conquista secreta: toque 5 vezes
          >
            <AvatarLeao avatar={u.avatar} tamanho={92} estrelas={st.prestigio.estrelas} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-white/80">{t.inicio.ola},</p>
            <h1 className="truncate font-titulo text-2xl font-bold">{u.nome.split(' ')[0]}</h1>
            <p className="text-sm text-white/90">
              {u.perfil === 'admin' ? t.perfil.admin : `${st.titulo} · Nível ${st.atual.nivel}`}
              {st.prestigio.estrelas > 0 && <span className="ml-1 text-[#F5D67A]">{'★'.repeat(Math.min(10, st.prestigio.estrelas))}</span>}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-rs-ciano">{st.tierNome}</p>
          </div>
          <Link to="/loja" className="hidden flex-col items-end rounded-xl bg-white/10 px-3 py-2 sm:flex">
            <Patinhas valor={st.patinhas} className="text-lg text-[#F5D67A]" />
            <span className="text-xs text-white/70">Loja do Leão</span>
          </Link>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-bold text-white/85">
            <span>{numero(st.xp)} XP</span>
            <span>{st.proximo ? `${numero(st.proximo.xpMinimo - st.xp)} XP para o nível ${st.proximo.nivel}` : `${numero(st.prestigio.faltam)} XP para a próxima Estrela de Lenda`}</span>
          </div>
          <BarraProgresso valor={st.proximo ? st.progresso : st.prestigio.progresso} rotulo="Progresso até o próximo nível" cor="branca" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="chip bg-white/15 py-1 text-white">
            <Icone nome="chama" tamanho={16} /> {t.inicio.sequencia}: {sequencia} {sequencia === 1 ? 'edição' : 'edições'} seguidas
          </span>
          {trilha && (
            <Link to="/trilha" className="chip bg-rs-ciano py-1 text-weg-900">
              {trilha.ocorrencia.temporada.nome} · degrau {trilha.alcancado}/{trilha.trilha.degraus}
            </Link>
          )}
          <button className="chip ml-auto min-h-9 bg-white py-1 text-weg-900 disabled:opacity-60" onClick={() => avisarMissoes(checkin(u.id))} disabled={checkinFeito}>
            <Icone nome="check" tamanho={16} /> {checkinFeito ? 'Check-in feito hoje' : 'Fazer check-in'}
          </button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Sua próxima conquista */}
        {proxima && (
          <Link to={proxima.link} className="cartao flex items-center gap-4 transition hover:border-rs-azul" aria-label={`${t.inicio.proximaConquista}: ${proxima.titulo}`}>
            <AnelProgresso fracao={proxima.fracao} tamanho={64} espessura={7} rotulo="Progresso da próxima conquista">
              <span className="font-titulo text-sm font-bold text-rs-azul">{Math.round(proxima.fracao * 100)}%</span>
            </AnelProgresso>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-rs-azul">{t.inicio.proximaConquista}</p>
              <p className="font-titulo font-bold text-weg-900">{proxima.titulo}</p>
              <p className="text-sm text-suave">{proxima.detalhe}</p>
            </div>
          </Link>
        )}
        {/* Curiosidade do leãozinho */}
        <section className="cartao flex items-center gap-3" aria-labelledby="curiosidade">
          <Mascote variante="pensando" tamanho={64} />
          <div className="min-w-0 flex-1">
            <h2 id="curiosidade" className="text-xs font-bold uppercase tracking-wide text-rs-azul">
              {t.inicio.curiosidade}
            </h2>
            {mostrarCuriosidade || curiosidadeVista ? (
              <p className="text-sm">{curiosidadeDoDia(hoje)}</p>
            ) : (
              <button
                className="mt-1 font-semibold text-rs-azul underline"
                onClick={() => {
                  setMostrarCuriosidade(true)
                  avisarMissoes(registrar(u.id, 'curiosidade_vista', {}, `curiosidade:${hoje}`))
                }}
              >
                Ver a curiosidade de hoje
              </button>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Termômetro da meta */}
        <section className="cartao" aria-labelledby="meta-titulo">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 id="meta-titulo" className="font-titulo text-lg font-bold text-weg-900">
                {t.inicio.termometro}
              </h2>
              <p className="text-sm text-suave">{ciclo.rotulo}</p>
            </div>
            <span className="font-titulo text-3xl font-bold text-rs-azul">{Math.floor(pct)}%</span>
          </div>
          <div className="relative mt-4">
            <BarraProgresso valor={total} max={ciclo.meta} rotulo="Percentual da meta arrecadado e validado" altura="h-5" />
            {b.configuracoes.marcos.map((m) => (
              <span key={m.pct} aria-hidden className="absolute top-0 h-5 w-0.5 bg-white/80" style={{ left: `${Math.min(m.pct, 99.6)}%` }} />
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-suave">{t.inicio.arrecadado}</dt>
              <dd className="font-titulo text-lg font-bold text-weg-900">{moeda(total)}</dd>
            </div>
            <div>
              <dt className="text-suave">{t.inicio.emValidacao}</dt>
              <dd className="font-titulo text-lg font-bold text-weg-700">{moeda(emValidacao)}</dd>
            </div>
            <div>
              <dt className="text-suave">Meta</dt>
              <dd className="font-titulo text-lg font-bold text-weg-900">{moeda(ciclo.meta)}</dd>
            </div>
          </dl>
          {metaAberta ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {b.configuracoes.marcos.map((m) => {
                const ok = pct >= m.pct
                return (
                  <li key={m.pct} className={`flex items-start gap-2 rounded-xl p-2 text-sm ${ok ? 'bg-sucesso-claro' : 'bg-fundo'}`}>
                    <span className={`mt-0.5 ${ok ? 'text-sucesso' : 'text-suave'}`}>
                      <Icone nome={ok ? 'check' : 'cadeado'} tamanho={18} />
                    </span>
                    <span>
                      <strong>{m.pct}%</strong> · {ok ? m.conteudo : `Desbloqueia: ${m.titulo.toLowerCase()}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <button
              className="botao-secundario mt-4 w-full"
              onClick={() => {
                setMetaAberta(true)
                avisarMissoes(registrar(u.id, 'meta_conferida', {}, `meta:${hoje}`))
              }}
            >
              Conferir os marcos coletivos
            </button>
          )}
        </section>

        <div className="space-y-5">
          <section className="grid grid-cols-3 gap-2" aria-label="Números do ciclo">
            {[
              [ind.participantes, t.inicio.participantes],
              [ind.municipios, t.inicio.municipios],
              [ind.entidades, t.inicio.entidades],
            ].map(([n, r]) => (
              <div key={r} className="cartao p-3 text-center">
                <p className="font-titulo text-2xl font-bold text-rs-azul">{n}</p>
                <p className="text-xs leading-tight text-suave">{r}</p>
              </div>
            ))}
          </section>

          <section className="cartao" aria-labelledby="prazos-titulo">
            <h2 id="prazos-titulo" className="mb-2 font-titulo text-lg font-bold text-weg-900">
              {t.inicio.prazos}
            </h2>
            <ul className="space-y-2">
              {[
                ['Doação direta aos fundos', ciclo.prazoDoacaoDireta],
                ['Prazo final da declaração', ciclo.prazoDeclaracao],
              ].map(([nome, dt]) => {
                const d = diasAte(dt)
                return (
                  <li key={nome} className="flex items-center gap-3">
                    <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-rs-ciano-claro font-titulo text-weg-900">
                      <span className="text-xl font-bold leading-none">{Math.max(0, d)}</span>
                      <span className="text-[10px] font-bold">{d === 1 ? 'dia' : 'dias'}</span>
                    </span>
                    <span className="text-sm">
                      <strong className="block">{nome}</strong>
                      <span className="text-suave">
                        {d < 0 ? 'Encerrado em' : 'Até'} {data(dt)}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>

      <section aria-labelledby="atalhos-titulo">
        <h2 id="atalhos-titulo" className="sr-only">
          {t.inicio.atalhos}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { para: '/reportar', nome: 'Reportar destinação', icone: 'reportar', destaque: true },
            { para: '/missoes', nome: 'Missões do dia', icone: 'missoes' },
            { para: '/convidar', nome: 'Convidar', icone: 'convidar' },
            { para: '/guia', nome: 'Guia do IR', icone: 'guia' },
          ].map((a) => (
            <Link
              key={a.para}
              to={a.para}
              className={`flex min-h-20 flex-col justify-between rounded-2xl p-3 font-titulo text-sm font-bold shadow-sm transition hover:-translate-y-0.5 ${a.destaque ? 'bg-rs-azul text-white' : 'border border-borda bg-superficie text-weg-900'}`}
            >
              <Icone nome={a.icone} />
              {a.nome}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {p && (
          <section className="cartao overflow-hidden p-0" aria-labelledby="destaque-titulo" aria-live="polite">
            <div className="flex items-center justify-between bg-rs-ciano-claro px-4 py-2">
              <h2 id="destaque-titulo" className="font-titulo text-sm font-bold text-weg-900">
                {t.inicio.destaque}
              </h2>
              <div className="flex flex-wrap gap-0.5">
                {projetos.slice(0, 8).map((x, i) => (
                  <button key={x.id} onClick={() => setDestaque(i)} className="flex h-6 w-6 items-center justify-center" aria-label={`Ver projeto ${i + 1}`} aria-current={i === destaque}>
                    <span className={`block h-2 w-2 rounded-full ${i === destaque ? 'bg-rs-azul' : 'bg-rs-azul/30'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 p-4">
              <Mascote variante="apontando" tamanho={72} className="hidden sm:inline-block" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-rs-azul">
                  {p.municipio}/{p.uf} · {t.fundoCurto[p.fundo]}
                </p>
                <h3 className="font-titulo text-lg font-bold text-weg-900">{p.nome}</h3>
                <p className="text-sm text-suave">{p.entidade}</p>
                <p className="mt-2 line-clamp-3 text-sm">{p.objetivo}</p>
                <p className="mt-2 text-sm font-semibold text-weg-700">{numero(p.beneficiados)} pessoas beneficiadas</p>
                <Link to={`/projetos/${p.id}`} onClick={() => avisarMissoes(registrar(u.id, 'historia_lida', { ref: p.id }))} className="botao-secundario mt-3">
                  Ler a história
                </Link>
              </div>
            </div>
          </section>
        )}

        <div className="space-y-5">
          {voto.ativo && votos.length > 0 && (
            <Link to="/recompensas#voto" className="cartao block transition hover:border-rs-azul">
              <p className="text-xs font-bold uppercase tracking-wide text-rs-azul">Voto do Leão</p>
              <p className="font-titulo font-bold text-weg-900">{voto.titulo}</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {votos.map((v) => (
                  <li key={v.projeto!.id}>
                    <div className="flex justify-between">
                      <span className="truncate">{v.projeto!.nome}</span>
                      <span className="font-semibold">{totalVotos ? Math.round((v.votos / totalVotos) * 100) : 0}%</span>
                    </div>
                    <BarraProgresso valor={v.votos} max={Math.max(1, totalVotos)} rotulo={`Votos em ${v.projeto!.nome}`} altura="h-2" />
                  </li>
                ))}
              </ul>
            </Link>
          )}
          {liderUnidade && (
            <section className="cartao flex items-center gap-4" aria-labelledby="desafio-titulo">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rs-ciano to-rs-azul text-white">
                <Icone nome="ranking" tamanho={32} />
              </span>
              <div>
                <h2 id="desafio-titulo" className="font-titulo text-base font-bold text-weg-900">
                  Desafio entre unidades
                </h2>
                <p className="text-sm text-suave">Líder da edição, proporcional ao número de colaboradores:</p>
                <p className="font-titulo font-bold text-rs-azul">{liderUnidade.nome}</p>
                <Link to="/ranking?aba=unidades" className="text-sm font-semibold text-rs-azul underline">
                  Ver ranking de unidades
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>

      <Modal aberto={!u.consentimentoLgpd} aoFechar={() => undefined} titulo="Antes de começar">
        <div className="space-y-3">
          <p className="text-sm">Para usar o app, precisamos do seu consentimento para o tratamento de dados.</p>
          <TermoLgpd aceite={aceite} aoMudar={setAceite} />
          <button className="botao-primario w-full" disabled={!aceite} onClick={() => registrarConsentimento(u.id)}>
            Concordar e continuar
          </button>
        </div>
      </Modal>

      <Modal aberto={onboarding && !!u.consentimentoLgpd} aoFechar={fecharOnboarding} titulo="Bem-vindo à Rede Solidária">
        <div className="flex flex-col items-center gap-3 text-center">
          <Mascote variante="acenando" tamanho={130} />
          <p>Oi! Eu sou o leãozinho da Rede Solidária. Aqui você:</p>
          <ul className="space-y-1 text-left text-sm">
            <li>• reporta a destinação do seu IR (e da sua família) em poucos passos;</li>
            <li>• cumpre missões, sobe de nível e ganha Patinhas para personalizar o seu leãozinho;</li>
            <li>• acompanha a meta WEG e vê onde o recurso foi aplicado.</li>
          </ul>
          <p className="text-xs text-suave">O XP recompensa a participação, nunca o valor doado.</p>
          <button className="botao-primario w-full" onClick={fecharOnboarding}>
            Vamos lá
          </button>
        </div>
      </Modal>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSessao, useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import * as C from '@/domain/consultas'
import { estatisticas, linhaDoTempo, radarImpacto } from '@/domain/jogo'
import { rankingPessoas } from '@/domain/ranking'
import { grauAtual, romano } from '@/domain/motor'
import { atualizarPerfil, excluirConta, exportarMeusDados, registrar, vagasVitrine } from '@/domain/servicos'
import type { Genero } from '@/domain/types'
import { Icone } from '@/components/Icone'
import { Mascote } from '@/components/Mascote'
import { AvatarLeao } from '@/components/AvatarLeao'
import { Patinhas, Radar, SeloRaridade } from '@/components/Jogo'
import { BarraProgresso, CabecalhoPagina, Campo, Modal } from '@/components/ui'
import { avisar, confete, tentar } from '@/components/Feedback'
import { baixar } from '@/lib/baixar'
import { gerarCard } from '@/lib/cardConquista'
import { arteDoPin, urlFace } from '@/lib/pinArte'
import { data, dataHora, numero } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

export function Perfil() {
  const u = useUsuario()
  const b = useBanco()
  const { sair } = useSessao()
  const loc = useLocation()
  const st = C.statusJogador(b, u.id)
  const ranking = rankingPessoas(b, { periodo: 'edicao' })
  const minha = ranking.find((l) => l.usuarioId === u.id)
  const est = estatisticas(b, u.id, minha ? { posicao: minha.posicao, total: ranking.length } : undefined)
  const radar = radarImpacto(b, u.id)
  const tempo = linhaDoTempo(b, u.id)
  const minhas = b.usuarioInsignias.filter((i) => i.usuarioId === u.id)
  const insigniasTenho = b.insignias.filter((ins) => grauAtual(b, u.id, ins.id) > 0)
  const comTitulo = insigniasTenho.filter((ins) => ins.titulo)
  const vagas = vagasVitrine(b, u.id)
  const transacoes = [...b.transacoesXp.filter((x) => x.usuarioId === u.id).map((x) => ({ ...x, tipo: 'XP' as const, valor: x.xp })), ...b.transacoesPatinhas.filter((x) => x.usuarioId === u.id).map((x) => ({ ...x, tipo: 'Patinhas' as const, valor: x.patinhas }))]
    .sort((a, c) => c.em.localeCompare(a.em))
    .slice(0, 60)
  const ciclosValidados = [...new Set(b.reportes.filter((r) => r.usuarioId === u.id && r.status === 'validado' && !r.convidado).map((r) => r.ciclo))].sort((a, c) => c - a)
  const ultimoPin = b.usuarioPins.filter((p) => p.usuarioId === u.id).sort((a, c) => c.ano - a.ano)[0]
  const banner = b.itens.find((i) => i.id === u.avatar.banner)
  const [form, setForm] = useState({ nome: u.nome, municipio: u.municipio, unidadeId: u.unidadeId ?? '', cpf: u.cpf ?? '', endereco: u.endereco ?? '', telefone: u.telefone ?? '' })
  const [excluir, setExcluir] = useState(false)
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [cardBlob, setCardBlob] = useState<Blob | null>(null)

  useEffect(() => {
    if (loc.hash) setTimeout(() => document.querySelector(loc.hash)?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [loc.hash])
  useEffect(() => () => void (cardUrl && URL.revokeObjectURL(cardUrl)), [cardUrl])

  const alternarVitrine = (id: string) => {
    const atual = u.vitrine.includes(id) ? u.vitrine.filter((x) => x !== id) : [...u.vitrine, id]
    if (atual.length > vagas) return avisar(`Sua vitrine tem ${vagas} espaços. Remova uma insígnia antes.`, 'info')
    atualizarPerfil(u.id, { vitrine: atual })
  }

  const certificado = async (ano: number) => {
    const ciclo = b.ciclos.find((c) => c.ano === ano)
    const { gerarCertificadoPdf } = await import('@/lib/pdf')
    const pin = b.pins.find((p) => p.ano === ano)
    const bytes = await gerarCertificadoPdf({
      pinUrl: pin ? await urlFace(pin) : undefined,
      nome: u.nome,
      ciclo: ciclo?.rotulo.split(' (')[0] ?? `Edição ${ano}`,
      nivel: `${st.atual.nivel} · ${st.titulo} (${st.tierNome})`,
      insignias: minhas.filter((i) => i.ciclo === ano).map((i) => C.flexionar(b.insignias.find((x) => x.id === i.insigniaId)?.nome ?? { m: '', f: '', n: '' }, u.genero)).filter(Boolean),
      codigo: `CERT-${ano}-${u.id.toUpperCase()}`,
    })
    baixar(bytes, `certificado-rede-solidaria-${ano}.pdf`)
  }

  const criarCard = async () => {
    const pin = ultimoPin && b.pins.find((p) => p.ano === ultimoPin.ano)
    const blob = await gerarCard({
      nome: u.anonimo ? 'Participante da Rede' : u.nome,
      nivel: `${st.titulo} · ${st.tierNome}`,
      nivelNumero: st.atual.nivel,
      pinUrl: pin ? (arteDoPin(pin)?.frente ?? (await urlFace(pin))) : undefined,
      pinAno: pin?.ano,
      insignias: insigniasTenho.length,
    })
    setCardBlob(blob)
    setCardUrl(URL.createObjectURL(blob))
  }

  const compartilhar = async () => {
    if (!cardBlob) return
    const arquivo = new File([cardBlob], 'conquista-rede-solidaria.png', { type: 'image/png' })
    try {
      if (navigator.canShare?.({ files: [arquivo] })) await navigator.share({ files: [arquivo], title: 'Rede Solidária WEG', text: 'Faço parte da Rede Solidária WEG.' })
      else baixar(cardBlob, arquivo.name, 'image/png')
    } catch {
      return
    }
    const feitas = registrar(u.id, 'conquista_compartilhada')
    if (feitas.length) {
      confete()
      avisar(`Missão concluída: ${feitas[0].titulo}`)
    }
  }

  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo={t.nav.perfil} acao={<Link to="/personalizar" className="botao-secundario">Personalizar</Link>} />

      {/* Cartão de jogador (sem valores) */}
      <section className="overflow-hidden rounded-3xl text-white shadow-lg" aria-label="Cartão de jogador">
        <div className="h-16 sm:h-20" style={{ background: banner ? `linear-gradient(120deg, ${banner.arte.cor}, #00325C)` : 'linear-gradient(120deg, #095BA7, #00325C)' }} />
        <div className="flex flex-col gap-4 bg-gradient-to-br from-weg-900 to-rs-azul p-5 pt-0 sm:flex-row sm:items-end">
          <AvatarLeao avatar={u.avatar} tamanho={112} estrelas={st.prestigio.estrelas} className="-mt-12 rounded-full ring-4 ring-weg-900" rotulo="Seu avatar" />
          <div className="min-w-0 flex-1">
            <h2 className="font-titulo text-2xl font-bold">
              {u.nome}
              {st.prestigio.estrelas > 0 && <span className="ml-2 align-middle text-base text-[#F5D67A]" aria-label={`${st.prestigio.estrelas} Estrelas de Lenda`}>{'★'.repeat(Math.min(10, st.prestigio.estrelas))}</span>}
            </h2>
            <p className="text-white/90">{st.titulo}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-rs-ciano">
              Nível {st.atual.nivel} · {st.tierNome}
            </p>
            <div className="mt-2">
              <BarraProgresso valor={st.proximo ? st.progresso : st.prestigio.progresso} rotulo="Progresso de nível" cor="branca" />
              <p className="mt-1 text-xs text-white/80">
                {numero(st.xp)} XP · {st.proximo ? `próximo nível em ${numero(st.proximo.xpMinimo - st.xp)} XP` : `próxima Estrela de Lenda em ${numero(st.prestigio.faltam)} XP`}
              </p>
            </div>
          </div>
          <Patinhas valor={st.patinhas} className="text-xl text-[#F5D67A]" />
        </div>
        <div className="flex flex-wrap gap-2 bg-weg-900 px-5 py-3" aria-label="Vitrine de insígnias">
          {Array.from({ length: vagas }, (_, i) => {
            const ins = b.insignias.find((x) => x.id === u.vitrine[i])
            const grau = ins ? grauAtual(b, u.id, ins.id) : 0
            return (
              <span key={i} className="flex min-h-11 items-center gap-1 rounded-xl bg-white/10 px-3 py-1 text-sm" title={ins?.descricao}>
                {ins ? (
                  <>
                    <span aria-hidden>{ins.icone}</span> {C.flexionar(ins.nome, u.genero)}
                    {ins.graus.length > 1 && ` ${romano(grau)}`}
                  </>
                ) : (
                  <span className="text-white/50">Espaço livre</span>
                )}
              </span>
            )
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="cartao" aria-labelledby="radar">
          <h2 id="radar" className="mb-1 font-titulo text-lg font-bold text-weg-900">
            Radar de impacto
          </h2>
          <p className="text-xs text-suave">De 0 a 100, por faixas de quantidade de ações. Nunca pelo valor doado.</p>
          <div className="text-weg-900">
            <Radar dados={radar} />
          </div>
        </section>
        <section className="cartao" aria-labelledby="estat">
          <h2 id="estat" className="mb-3 font-titulo text-lg font-bold text-weg-900">
            Estatísticas
          </h2>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {[
              ['XP total', numero(est.xpTotal)],
              ['XP da edição', numero(est.xpEdicao)],
              ['Posição na edição', est.posicao ? `${est.posicao}º (top ${est.percentil}%)` : '—'],
              ['Edições', est.edicoes],
              ['Sequência', `${est.sequencia} seguidas`],
              ['Destinações reportadas', est.destinacoes],
              ['Familiares engajados', est.familiares],
              ['Convidados engajados', est.convidados],
              ['Convites aceitos', est.convitesAceitos],
              ['Missões concluídas', est.missoes],
              ['Projetos conhecidos', est.projetos],
              ['Insígnias', `${est.insignias} de ${est.insigniasTotal}`],
              ['Pins', `${est.pins} de ${est.pinsTotal}`],
              ['Alcateia', est.alcateia ?? '—'],
            ].map(([r, v]) => (
              <div key={r as string} className="rounded-xl bg-fundo px-3 py-2">
                <dt className="text-xs text-suave">{r}</dt>
                <dd className="font-titulo font-bold text-weg-900">{v}</dd>
              </div>
            ))}
          </dl>
          {est.itensPorCategoria.length > 0 && (
            <p className="mt-3 text-xs text-suave">Coleção: {est.itensPorCategoria.map(([c, n]) => `${t.categoriaItem[c as keyof typeof t.categoriaItem]} ${n}`).join(' · ')}</p>
          )}
        </section>
      </div>

      <section className="cartao" aria-labelledby="linha">
        <h2 id="linha" className="mb-3 font-titulo text-lg font-bold text-weg-900">
          Linha do tempo
        </h2>
        <ol className="flex gap-3 overflow-x-auto pb-2">
          {tempo.map((e) => {
            const pin = b.pins.find((p) => p.ano === e.ano)
            return (
              <li key={e.ano} className={`min-w-40 rounded-2xl border p-3 text-sm ${e.ano === b.configuracoes.cicloAtivo ? 'border-rs-azul bg-rs-ciano-claro' : 'border-borda'}`}>
                <p className="font-titulo text-lg font-bold text-weg-900">{e.ano}</p>
                <p className="text-xs text-suave">{e.anterior ? 'Antes do app' : e.ano === b.configuracoes.cicloAtivo ? 'Edição atual' : 'No app'}</p>
                <p className="mt-1">{e.pin ? `📌 ${pin?.titulo ?? `Pin ${e.ano}`}` : 'Sem pin'}</p>
                <p>Nível {e.nivel.nivel}</p>
                <p className="text-xs text-suave">{e.insignias.length} insígnia(s)</p>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="cartao space-y-3" aria-labelledby="identidade">
          <h2 id="identidade" className="font-titulo text-lg font-bold text-weg-900">
            Título e vitrine
          </h2>
          <Campo rotulo="Forma dos títulos">
            <select className="campo" value={u.genero} onChange={(e) => atualizarPerfil(u.id, { genero: e.target.value as Genero })}>
              {(Object.keys(t.genero) as Genero[]).map((g) => (
                <option key={g} value={g}>
                  {t.genero[g]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Título exibido sob o nome">
            <select className="campo" value={u.tituloEscolhido ?? 'nivel'} onChange={(e) => atualizarPerfil(u.id, { tituloEscolhido: e.target.value })}>
              <option value="nivel">Título do nível: {st.tituloNivel}</option>
              {comTitulo.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {C.flexionar(ins.titulo!, u.genero)}
                </option>
              ))}
            </select>
          </Campo>
          <div>
            <p className="rotulo">
              Vitrine ({u.vitrine.length}/{vagas}) {vagas < 5 && <span className="font-normal text-suave">· mais espaços nos tiers Guardião e Lenda</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {insigniasTenho.map((ins) => {
                const ativa = u.vitrine.includes(ins.id)
                const grau = grauAtual(b, u.id, ins.id)
                return (
                  <button key={ins.id} aria-pressed={ativa} onClick={() => alternarVitrine(ins.id)} className={`flex min-h-11 items-center gap-1 rounded-xl border px-3 text-sm ${ativa ? 'border-rs-azul bg-rs-ciano-claro font-semibold' : 'border-borda'}`}>
                    <span aria-hidden>{ins.icone}</span> {C.flexionar(ins.nome, u.genero)}
                    {ins.graus.length > 1 && ` ${romano(grau)}`}
                    <SeloRaridade raridade={ins.graus[grau - 1].raridade} className="ml-1" />
                  </button>
                )
              })}
              {!insigniasTenho.length && <p className="text-sm text-suave">Conquiste insígnias para montar a vitrine.</p>}
            </div>
          </div>
        </section>

        <section className="cartao space-y-3" id="card" aria-labelledby="card-titulo">
          <h2 id="card-titulo" className="font-titulo text-lg font-bold text-weg-900">
            Card da conquista e certificado
          </h2>
          <p className="text-sm text-suave">O card mostra nome, nível e pin do ano. Nunca mostra valores.</p>
          {cardUrl ? (
            <div className="space-y-2">
              <img src={cardUrl} alt="Card da sua conquista na Rede Solidária" className="mx-auto max-h-80 rounded-xl shadow" />
              <div className="flex gap-2">
                <button className="botao-primario flex-1" onClick={compartilhar}>
                  <Icone nome="compartilhar" /> Compartilhar
                </button>
                <button className="botao-secundario" onClick={() => cardBlob && baixar(cardBlob, 'conquista-rede-solidaria.png', 'image/png')} aria-label="Baixar card">
                  <Icone nome="download" />
                </button>
              </div>
            </div>
          ) : (
            <button className="botao-secundario w-full" onClick={criarCard}>
              Gerar card da conquista
            </button>
          )}
          <div className="border-t border-borda pt-3">
            <p className="mb-2 text-sm font-semibold">Certificados de participação</p>
            {ciclosValidados.length ? (
              <div className="flex flex-wrap gap-2">
                {ciclosValidados.map((c) => (
                  <button key={c} className="botao-secundario" onClick={() => certificado(c)}>
                    <Icone nome="download" /> Edição {c}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-suave">O certificado é liberado quando uma destinação sua é validada.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="cartao space-y-3" aria-labelledby="dados">
          <h2 id="dados" className="font-titulo text-lg font-bold text-weg-900">
            Dados básicos
          </h2>
          <Campo rotulo="Nome">
            <input className="campo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Município">
              <input className="campo" value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
            </Campo>
            <Campo rotulo="Unidade">
              <select className="campo" value={form.unidadeId} onChange={(e) => setForm({ ...form, unidadeId: e.target.value })}>
                {b.unidades.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <p className="text-xs text-suave">CPF, endereço e telefone são usados só na carta de destinação.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="CPF">
              <input className="campo" inputMode="numeric" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </Campo>
            <Campo rotulo="Telefone">
              <input className="campo" inputMode="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </Campo>
          </div>
          <Campo rotulo="Endereço">
            <input className="campo" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </Campo>
          <button className="botao-primario w-full" onClick={() => tentar(() => atualizarPerfil(u.id, { ...form, unidadeId: form.unidadeId || undefined }), 'Perfil atualizado.')}>
            {t.acoes.salvar}
          </button>
        </section>

        <section className="cartao space-y-3" aria-labelledby="privacidade">
          <h2 id="privacidade" className="font-titulo text-lg font-bold text-weg-900">
            Privacidade, sons e notificações
          </h2>
          <Alternar rotulo="Aparecer como “Participante anônimo” no ranking" valor={u.anonimo} aoMudar={(v) => atualizarPerfil(u.id, { anonimo: v })} />
          <Alternar rotulo="Ocultar minhas conquistas do Mural da Rede" valor={u.ocultarMural} aoMudar={(v) => atualizarPerfil(u.id, { ocultarMural: v })} />
          <Alternar rotulo="Sons nas conquistas" valor={u.sons} aoMudar={(v) => atualizarPerfil(u.id, { sons: v })} />
          <Alternar rotulo="Receber avisos por e-mail" valor={u.notificacoes.email} aoMudar={(v) => atualizarPerfil(u.id, { notificacoes: { ...u.notificacoes, email: v } })} />
          <Alternar
            rotulo="Notificações no celular"
            valor={u.notificacoes.push}
            aoMudar={async (v) => {
              if (v && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
              atualizarPerfil(u.id, { notificacoes: { ...u.notificacoes, push: v } })
            }}
          />
          <Alternar rotulo="Lembretes de prazo (30, 7 e 1 dia antes)" valor={u.notificacoes.prazos} aoMudar={(v) => atualizarPerfil(u.id, { notificacoes: { ...u.notificacoes, prazos: v } })} />
          <div className="flex flex-col gap-2 border-t border-borda pt-3 sm:flex-row">
            <button className="botao-secundario flex-1" onClick={() => baixar(new Blob([JSON.stringify(exportarMeusDados(u.id), null, 2)], { type: 'application/json' }), 'meus-dados-rede-solidaria.json', 'application/json')}>
              <Icone nome="download" /> Exportar meus dados
            </button>
            <button className="botao flex-1 border border-alerta text-alerta hover:bg-alerta-claro" onClick={() => setExcluir(true)}>
              <Icone nome="lixo" /> Excluir conta
            </button>
          </div>
        </section>
      </div>

      <section className="cartao" aria-labelledby="historico">
        <h2 id="historico" className="mb-2 font-titulo text-lg font-bold text-weg-900">
          Histórico de XP e Patinhas
        </h2>
        <ul className="max-h-80 divide-y divide-borda overflow-y-auto text-sm">
          {transacoes.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                {x.descricao}
                <span className="block text-xs text-suave">{dataHora(x.em)}</span>
              </span>
              <span className={`shrink-0 font-titulo font-bold ${x.valor < 0 ? 'text-alerta' : x.tipo === 'XP' ? 'text-rs-azul' : 'text-[#9a7a12]'}`}>
                {x.valor > 0 ? '+' : ''}
                {numero(x.valor)} {x.tipo}
              </span>
            </li>
          ))}
          {!transacoes.length && <li className="py-2 text-suave">Nada ainda.</li>}
        </ul>
        <p className="mt-2 text-xs text-suave">Pins conquistados: {b.usuarioPins.filter((p) => p.usuarioId === u.id).map((p) => p.ano).join(', ') || 'nenhum'} · desde {data(u.criadoEm)}</p>
      </section>

      <Modal aberto={excluir} aoFechar={() => setExcluir(false)} titulo="Excluir conta">
        <div className="space-y-3 text-sm">
          <Mascote variante="pensando" tamanho={80} className="mx-auto block" />
          <p>Seus dados pessoais, familiares, comprovantes, cartas, alcateia e publicações no mural serão apagados. Reportes já validados continuam no total da meta, sem identificação.</p>
          <div className="flex gap-2">
            <button className="botao-secundario flex-1" onClick={() => setExcluir(false)}>
              {t.acoes.cancelar}
            </button>
            <button
              className="botao flex-1 bg-alerta text-white"
              onClick={async () => {
                excluirConta(u.id)
                await sair()
              }}
            >
              Excluir definitivamente
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Alternar({ rotulo, valor, aoMudar }: { rotulo: string; valor: boolean; aoMudar: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
      <span className="text-sm">{rotulo}</span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={valor} onChange={(e) => aoMudar(e.target.checked)} />
      <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-rs-azul peer-focus-visible:ring-2 peer-focus-visible:ring-rs-ciano after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  )
}

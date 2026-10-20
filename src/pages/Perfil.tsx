import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSessao, useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import * as R from '@/domain/regras'
import { atualizarPerfil, compartilharConquista, excluirConta, exportarMeusDados, trocarPadrinho } from '@/domain/servicos'
import { Icone } from '@/components/Icone'
import { Mascote } from '@/components/Mascote'
import { Avatar, BarraProgresso, CabecalhoPagina, Campo, Modal } from '@/components/ui'
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
  const xp = R.xpTotal(b, u.id)
  const { atual, proximo, progresso } = R.nivelDe(xp, b.niveis)
  const minhas = b.usuarioInsignias.filter((i) => i.usuarioId === u.id)
  const transacoes = b.transacoesXp.filter((x) => x.usuarioId === u.id).sort((a, c) => c.em.localeCompare(a.em))
  const ciclosValidados = [...new Set(b.reportes.filter((r) => r.usuarioId === u.id && r.status === 'validado').map((r) => r.ciclo))].sort((a, c) => c - a)
  const ultimoPin = b.usuarioPins.filter((p) => p.usuarioId === u.id).sort((a, c) => c.ano - a.ano)[0]
  const resgates = b.resgates.filter((r) => r.usuarioId === u.id)
  const convidado = u.perfil === 'convidado'
  const [form, setForm] = useState({ nome: u.nome, municipio: u.municipio, unidadeId: u.unidadeId ?? '', cpf: u.cpf ?? '', endereco: u.endereco ?? '', telefone: u.telefone ?? '' })
  const [excluir, setExcluir] = useState(false)
  const [novoPadrinho, setNovoPadrinho] = useState('')
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [cardBlob, setCardBlob] = useState<Blob | null>(null)

  useEffect(() => {
    if (loc.hash) setTimeout(() => document.querySelector(loc.hash)?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [loc.hash])
  useEffect(() => () => void (cardUrl && URL.revokeObjectURL(cardUrl)), [cardUrl])

  const certificado = async (ano: number) => {
    const ciclo = b.ciclos.find((c) => c.ano === ano)
    const { gerarCertificadoPdf } = await import('@/lib/pdf')
    const pin = b.pins.find((p) => p.ano === ano)
    const bytes = await gerarCertificadoPdf({
      pinUrl: pin ? await urlFace(pin) : undefined,
      nome: u.nome,
      ciclo: ciclo?.rotulo.split(' (')[0] ?? `Edição ${ano}`,
      nivel: `${atual.nivel} · ${atual.nome}`,
      insignias: minhas.map((i) => b.insignias.find((x) => x.id === i.insigniaId)?.nome ?? '').filter(Boolean),
      codigo: `CERT-${ano}-${u.id.toUpperCase()}`,
    })
    baixar(bytes, `certificado-rede-solidaria-${ano}.pdf`)
  }

  const criarCard = async () => {
    const pin = ultimoPin && b.pins.find((p) => p.ano === ultimoPin.ano)
    const blob = await gerarCard({
      nome: u.anonimo ? 'Participante da Rede' : u.nome,
      nivel: atual.nome,
      nivelNumero: atual.nivel,
      pinUrl: pin ? (arteDoPin(pin)?.frente ?? (await urlFace(pin))) : undefined,
      pinAno: pin?.ano,
      insignias: minhas.length,
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
    const feitas = compartilharConquista(u.id)
    if (feitas.length) {
      confete()
      avisar(`Missão concluída: +${feitas[0].xp} XP`)
    }
  }

  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo={t.nav.perfil} />
      <section className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-weg-900 to-rs-azul p-5 text-white sm:flex-row sm:items-center">
        <Avatar nome={u.nome} moldura={u.molduraAtiva} tamanho={80} />
        <div className="min-w-0 flex-1">
          <h2 className="font-titulo text-2xl font-bold">{u.nome}</h2>
          <p className="text-white/85">
            {t.perfil[u.perfil]} · {b.unidades.find((x) => x.id === u.unidadeId)?.nome ?? u.municipio}
          </p>
          {!convidado && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs font-bold">
                <span>
                  Nível {atual.nivel} · {atual.nome}
                </span>
                <span>{numero(xp)} XP</span>
              </div>
              <BarraProgresso valor={progresso} rotulo="Progresso de nível" cor="branca" />
              <p className="mt-1 text-xs text-white/80">{proximo ? `Próximo: ${proximo.nome} (${numero(proximo.xpMinimo)} XP). ${proximo.desbloqueio}` : 'Você chegou ao topo.'}</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="cartao" aria-labelledby="insignias">
          <h2 id="insignias" className="mb-3 font-titulo text-lg font-bold text-weg-900">
            Insígnias ({minhas.length})
          </h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {b.insignias.map((ins) => {
              const tem = minhas.find((m) => m.insigniaId === ins.id)
              if (ins.secreta && !tem)
                return (
                  <li key={ins.id} className="flex flex-col items-center gap-1 rounded-xl bg-fundo p-2 text-center" title="Conquista secreta">
                    <span className="text-3xl opacity-40" aria-hidden>
                      ❔
                    </span>
                    <span className="text-[11px] font-semibold text-suave">Secreta</span>
                  </li>
                )
              return (
                <li key={ins.id} className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center ${tem ? 'bg-rs-ciano-claro' : 'bg-fundo opacity-50 grayscale'}`} title={ins.descricao}>
                  <span className="text-3xl" aria-hidden>
                    {ins.icone}
                  </span>
                  <span className="text-[11px] font-semibold leading-tight">{ins.nome}</span>
                  <span className="sr-only">{tem ? 'conquistada' : 'não conquistada'}</span>
                </li>
              )
            })}
          </ul>
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
                <button className="botao-secundario" onClick={() => cardBlob && baixar(cardBlob, 'conquista-rede-solidaria.png', 'image/png')}>
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
            {!convidado && (
              <Campo rotulo="Unidade">
                <select className="campo" value={form.unidadeId} onChange={(e) => setForm({ ...form, unidadeId: e.target.value })}>
                  {b.unidades.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
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
          {!b.transacoesXp.some((x) => x.usuarioId === u.id && x.origem === 'perfil_completo') && (
            <p className="text-center text-xs text-rs-azul">Complete o perfil e ganhe {b.configuracoes.tabelaXp.perfilCompleto} XP.</p>
          )}
        </section>

        <section className="cartao space-y-3" aria-labelledby="privacidade">
          <h2 id="privacidade" className="font-titulo text-lg font-bold text-weg-900">
            Privacidade e notificações
          </h2>
          <Alternar rotulo="Aparecer como “Participante anônimo” no ranking" valor={u.anonimo} aoMudar={(v) => atualizarPerfil(u.id, { anonimo: v })} />
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
          {convidado && (
            <div className="space-y-2 border-t border-borda pt-3 text-sm">
              <p>
                Padrinho: <strong>{u.padrinhoEmail}</strong> ({u.vinculoStatus === 'aprovado' ? 'vínculo aprovado' : u.vinculoStatus === 'recusado' ? 'vínculo recusado' : 'aguardando aprovação'})
              </p>
              <div className="flex gap-2">
                <input className="campo" placeholder="novo.padrinho@weg.net" value={novoPadrinho} onChange={(e) => setNovoPadrinho(e.target.value)} aria-label="Novo e-mail de padrinho" />
                <button className="botao-secundario" onClick={() => tentar(() => trocarPadrinho(u.id, novoPadrinho), 'Pedido de vínculo enviado.')}>
                  Trocar
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-borda pt-3 sm:flex-row">
            <button
              className="botao-secundario flex-1"
              onClick={() => baixar(new Blob([JSON.stringify(exportarMeusDados(u.id), null, 2)], { type: 'application/json' }), 'meus-dados-rede-solidaria.json', 'application/json')}
            >
              <Icone nome="download" /> Exportar meus dados
            </button>
            <button className="botao flex-1 border border-alerta text-alerta hover:bg-alerta-claro" onClick={() => setExcluir(true)}>
              <Icone nome="lixo" /> Excluir conta
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="cartao" aria-labelledby="historico">
          <h2 id="historico" className="mb-2 font-titulo text-lg font-bold text-weg-900">
            Histórico de XP
          </h2>
          <ul className="max-h-80 divide-y divide-borda overflow-y-auto text-sm">
            {transacoes.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {x.descricao}
                  <span className="block text-xs text-suave">{dataHora(x.em)}</span>
                </span>
                <span className={`font-titulo font-bold ${x.xp < 0 ? 'text-alerta' : 'text-rs-azul'}`}>
                  {x.xp > 0 ? '+' : ''}
                  {x.xp}
                </span>
              </li>
            ))}
            {!transacoes.length && <li className="py-2 text-suave">Nenhum XP ainda.</li>}
          </ul>
        </section>
        <section className="cartao space-y-2" aria-labelledby="atalhos-perfil">
          <h2 id="atalhos-perfil" className="font-titulo text-lg font-bold text-weg-900">
            Atalhos
          </h2>
          {[
            ['/reportes', t.nav.meusReportes, 'documento'],
            ...(!convidado
              ? [
                  ['/familia', t.nav.familia, 'familia'],
                  ['/pins', t.nav.pins, 'pins'],
                  ['/recompensas', `Minhas recompensas (${resgates.length})`, 'recompensas'],
                ]
              : []),
            ['/notificacoes', t.nav.notificacoes, 'sino'],
          ].map(([para, nome, icone]) => (
            <Link key={para} to={para} className="flex min-h-11 items-center gap-3 rounded-xl px-2 font-semibold hover:bg-rs-ciano-claro">
              <Icone nome={icone} className="text-rs-azul" /> {nome}
            </Link>
          ))}
          {resgates.length > 0 && (
            <ul className="border-t border-borda pt-2 text-sm">
              {resgates.map((r) => (
                <li key={r.id} className="flex justify-between py-1">
                  <span>{b.recompensas.find((x) => x.id === r.recompensaId)?.nome}</span>
                  <span className="text-suave">
                    {r.status} · {data(r.em)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal aberto={excluir} aoFechar={() => setExcluir(false)} titulo="Excluir conta">
        <div className="space-y-3 text-sm">
          <Mascote variante="pensando" tamanho={80} className="mx-auto block" />
          <p>Seus dados pessoais, familiares, comprovantes e cartas serão apagados. Reportes já validados continuam no total da meta, sem identificação.</p>
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

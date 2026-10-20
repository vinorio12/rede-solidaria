import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { prepararComprovantes, reenviarReporte } from '@/domain/servicos'
import { Icone } from '@/components/Icone'
import { Aviso, CabecalhoPagina, Campo, ChipStatus, Vazio } from '@/components/ui'
import { avisar, tentar } from '@/components/Feedback'
import { data, dataHora, moeda } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

export function MeusReportes() {
  const u = useUsuario()
  const b = useBanco()
  const meus = b.reportes.filter((r) => r.usuarioId === u.id).sort((a, c) => c.criadoEm.localeCompare(a.criadoEm))
  const ciclos = [...new Set(meus.map((r) => r.ciclo))].sort((a, c) => c - a)

  return (
    <div className="mx-auto max-w-3xl">
      <CabecalhoPagina
        titulo={t.nav.meusReportes}
        subtitulo="Enviado, em validação, validado ou devolvido para ajuste: acompanhe cada destinação."
        acao={
          <Link to="/reportar" className="botao-primario">
            <Icone nome="mais" /> <span className="hidden sm:inline">Novo reporte</span>
          </Link>
        }
      />
      {!meus.length && (
        <Vazio texto={t.vazio.reportes}>
          <Link to="/reportar" className="botao-primario">
            Reportar destinação
          </Link>
        </Vazio>
      )}
      {ciclos.map((c) => (
        <section key={c} className="mb-6">
          <h2 className="mb-2 font-titulo text-sm font-bold uppercase tracking-wide text-suave">{b.ciclos.find((x) => x.ano === c)?.rotulo ?? `Ciclo ${c}`}</h2>
          <ul className="space-y-2">
            {meus
              .filter((r) => r.ciclo === c)
              .map((r) => {
                const fam = b.familiares.find((f) => f.id === r.familiarId)
                return (
                  <li key={r.id}>
                    <Link to={`/reportes/${r.id}`} className="cartao flex items-center gap-3 transition hover:border-rs-azul">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rs-ciano-claro text-rs-azul">
                        <Icone nome={fam ? 'familia' : 'documento'} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">
                          {t.fundoCurto[r.fundoTipo]} · {r.municipio}/{r.uf}
                        </span>
                        <span className="block text-sm text-suave">
                          {fam ? `${fam.nome} · ` : ''}
                          {t.modalidade[r.modalidade]} · {data(r.dataPagamento)}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="font-titulo font-bold text-weg-900">{moeda(r.valor)}</span>
                        <ChipStatus status={r.status} />
                      </span>
                    </Link>
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function DetalheReporte() {
  const { id } = useParams()
  const u = useUsuario()
  const b = useBanco()
  const r = b.reportes.find((x) => x.id === id)
  const [ajuste, setAjuste] = useState<{ valor: number; dataPagamento: string } | null>(null)
  const [arquivos, setArquivos] = useState<File[]>([])

  if (!r || (r.usuarioId !== u.id && u.perfil !== 'admin')) return <Vazio texto="Reporte não encontrado." />
  const fam = b.familiares.find((f) => f.id === r.familiarId)
  const ent = b.entidades.find((e) => e.id === r.entidadeId)
  const comps = b.comprovantes.filter((c) => r.comprovanteIds.includes(c.id))
  const xp = b.transacoesXp.filter((x) => x.referencia === r.id && x.usuarioId === r.usuarioId).reduce((s, x) => s + x.xp, 0)

  const reenviar = async () => {
    const novos = await prepararComprovantes(arquivos).catch((e: Error) => {
      avisar(e.message, 'alerta')
      return null
    })
    if (!novos) return
    if (tentar(() => reenviarReporte(r.id, ajuste ?? {}, novos), 'Reporte reenviado para validação.') !== undefined) {
      setAjuste(null)
      setArquivos([])
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <CabecalhoPagina titulo="Detalhe do reporte" voltar="/reportes" subtitulo={<ChipStatus status={r.status} />} />
      {r.status === 'devolvido' && r.motivoDevolucao && (
        <Aviso tipo="alerta">
          <strong>Motivo da devolução:</strong> {r.motivoDevolucao}
        </Aviso>
      )}
      <dl className="cartao grid gap-3 text-sm sm:grid-cols-2">
        <Linha r="Em nome de" v={fam ? `${fam.nome} (${t.parentesco[fam.parentesco]})` : 'Próprio colaborador'} />
        <Linha r="Modalidade" v={t.modalidade[r.modalidade]} />
        <Linha r="Fundo" v={`${t.fundo[r.fundoTipo]} · ${t.esfera[r.esfera]}`} />
        <Linha r="Município" v={`${r.municipio}/${r.uf}`} />
        {ent && <Linha r="Entidade indicada" v={ent.nomeFantasia} />}
        <Linha r="Valor" v={moeda(r.valor)} />
        <Linha r="Data do pagamento" v={data(r.dataPagamento)} />
        {r.status === 'validado' && <Linha r="XP recebido" v={`+${xp} XP`} />}
      </dl>
      <section className="cartao">
        <h2 className="mb-2 font-titulo font-bold text-weg-900">Comprovantes</h2>
        <ul className="space-y-1 text-sm">
          {comps.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <Icone nome="documento" tamanho={18} />
              {c.dataUrl ? (
                <a href={c.dataUrl} download={c.nome} className="text-rs-azul underline">
                  {c.nome}
                </a>
              ) : (
                <span>{c.nome}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="cartao">
        <h2 className="mb-2 font-titulo font-bold text-weg-900">Histórico</h2>
        <ol className="relative space-y-3 border-l-2 border-rs-ciano-claro pl-4">
          {r.historico.map((h, i) => (
            <li key={i} className="text-sm">
              <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-rs-azul" aria-hidden />
              <strong>{t.status[h.status]}</strong> <span className="text-suave">· {dataHora(h.em)}</span>
              {h.nota && <p className="text-suave">{h.nota}</p>}
            </li>
          ))}
        </ol>
      </section>
      {r.status === 'devolvido' && r.usuarioId === u.id && (
        <section className="cartao space-y-3">
          <h2 className="font-titulo font-bold text-weg-900">Ajustar e reenviar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Valor (R$)">
              <input className="campo" type="number" step="0.01" value={ajuste?.valor ?? r.valor} onChange={(e) => setAjuste({ valor: Number(e.target.value), dataPagamento: ajuste?.dataPagamento ?? r.dataPagamento })} />
            </Campo>
            <Campo rotulo="Data do pagamento">
              <input className="campo" type="date" value={ajuste?.dataPagamento ?? r.dataPagamento} onChange={(e) => setAjuste({ valor: ajuste?.valor ?? r.valor, dataPagamento: e.target.value })} />
            </Campo>
          </div>
          <Campo rotulo="Novo comprovante">
            <input className="campo" type="file" multiple accept="application/pdf,image/*" onChange={(e) => setArquivos([...(e.target.files ?? [])])} />
          </Campo>
          <button className="botao-primario w-full" onClick={reenviar} disabled={!arquivos.length && !ajuste}>
            Reenviar para validação
          </button>
        </section>
      )}
    </div>
  )
}

function Linha({ r, v }: { r: string; v: string }) {
  return (
    <div>
      <dt className="text-suave">{r}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  )
}

import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { devolver, estornar, iniciarAnalise, validar } from '@/domain/servicos'
import { previaXp } from '@/domain/regras'
import type { Reporte, StatusReporte } from '@/domain/types'
import { Icone } from '@/components/Icone'
import { Abas, Aviso, ChipStatus, Vazio } from '@/components/ui'
import { avisar, tentar } from '@/components/Feedback'
import { data, dataHora, moeda } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

type Filtro = 'fila' | 'validado' | 'devolvido' | 'convidados' | 'todos'
const FILTROS: Record<Filtro, StatusReporte[] | null> = {
  fila: ['enviado', 'em_validacao'],
  validado: ['validado'],
  devolvido: ['devolvido', 'estornado', 'recusado_colaborador'],
  convidados: null,
  todos: null,
}

export function Validacao() {
  const admin = useUsuario()
  const b = useBanco()
  const [filtro, setFiltro] = useState<Filtro>('fila')
  const [selId, setSelId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const lista = b.reportes.filter((r) => (filtro === 'convidados' ? !!r.convidado : !FILTROS[filtro] || FILTROS[filtro]!.includes(r.status))).sort((a, c) => a.criadoEm.localeCompare(c.criadoEm))
  const sel = b.reportes.find((r) => r.id === selId) ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <section className="space-y-3">
        <Abas
          rotulo="Filtro da fila"
          ativa={filtro}
          aoMudar={(f) => {
            setFiltro(f)
            setSelId(null)
          }}
          abas={[
            { id: 'fila', nome: 'Na fila' },
            { id: 'convidados', nome: 'De convidados' },
            { id: 'validado', nome: 'Validados' },
            { id: 'devolvido', nome: 'Devolvidos' },
            { id: 'todos', nome: 'Todos' },
          ]}
        />
        {!lista.length && <Vazio texto="Nada por aqui. Fila em dia." variante="comemorando" />}
        <ul className="space-y-2">
          {lista.map((r) => {
            const u = b.usuarios.find((x) => x.id === r.usuarioId)
            return (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setSelId(r.id)
                    setMotivo('')
                  }}
                  className={`cartao flex w-full items-center gap-3 text-left transition ${selId === r.id ? 'border-2 border-rs-azul' : 'hover:border-rs-azul/60'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {r.convidado ? `${r.convidado.nome} → ${u?.nome}` : u?.nome} {r.convidado && <span className="chip bg-fundo text-suave">convidado</span>}
                    </p>
                    <p className="text-xs text-suave">
                      {t.fundoCurto[r.fundoTipo]} · {r.municipio} · enviado em {dataHora(r.criadoEm)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-titulo text-sm font-bold">{moeda(r.valor)}</span>
                    <ChipStatus status={r.status} />
                    {r.duplicidadeSuspeita && (
                      <span className="chip bg-alerta-claro text-alerta">
                        <Icone nome="alerta" tamanho={12} /> duplicado?
                      </span>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="lg:sticky lg:top-20 lg:self-start">
        {sel ? detalhe(sel, admin.id) : <Vazio texto="Selecione um reporte para ver o comprovante e decidir." variante="apontando" />}
      </section>
    </div>
  )

  // função de renderização (não componente) para o textarea não perder o foco a cada tecla
  function detalhe(r: Reporte, adminId: string) {
    const u = b.usuarios.find((x) => x.id === r.usuarioId)
    const fam = b.familiares.find((f) => f.id === r.familiarId)
    const ent = b.entidades.find((e) => e.id === r.entidadeId)
    const comps = b.comprovantes.filter((c) => r.comprovanteIds.includes(c.id))
    const naFila = r.status === 'enviado' || r.status === 'em_validacao'
    return (
      <div className="cartao space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-titulo text-lg font-bold text-weg-900">{u?.nome}</h2>
            <p className="text-sm text-suave">
              {u?.email} · {b.unidades.find((x) => x.id === u?.unidadeId)?.nome ?? 'sem unidade'}
            </p>
          </div>
          <ChipStatus status={r.status} />
        </div>
        {r.duplicidadeSuspeita && <Aviso tipo="alerta">Possível duplicidade: {r.duplicidadeSuspeita}</Aviso>}
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Info r="Em nome de" v={r.convidado ? `${r.convidado.nome} (${t.relacaoConvidado[r.convidado.relacao]}, convidado; XP para o colaborador)` : fam ? `${fam.nome} (${t.parentesco[fam.parentesco]})` : 'Próprio'} />
          <Info r="Modalidade" v={t.modalidade[r.modalidade]} />
          <Info r="Fundo" v={`${t.fundo[r.fundoTipo]} · ${t.esfera[r.esfera]}`} />
          <Info r="Município" v={`${r.municipio}/${r.uf}`} />
          <Info r="Valor" v={moeda(r.valor)} />
          <Info r="Pagamento" v={data(r.dataPagamento)} />
          {ent && <Info r="Entidade indicada" v={ent.nomeFantasia} />}
          {r.cartaId && <Info r="Carta" v={b.cartas.find((c) => c.id === r.cartaId)?.codigo ?? ''} />}
          {naFila && <Info r="XP a creditar" v={`${previaXp(b, r)} XP`} />}
        </dl>
        <div>
          <p className="mb-1 text-sm font-semibold">Comprovantes</p>
          {comps.map((c) =>
            c.dataUrl?.startsWith('data:image') ? (
              <img key={c.id} src={c.dataUrl} alt={`Comprovante ${c.nome}`} className="mb-2 max-h-72 w-full rounded-xl border border-borda object-contain" />
            ) : c.dataUrl?.startsWith('data:application/pdf') ? (
              <object key={c.id} data={c.dataUrl} type="application/pdf" className="mb-2 h-72 w-full rounded-xl border border-borda" aria-label={`Comprovante ${c.nome}`}>
                <a href={c.dataUrl} download={c.nome} className="text-rs-azul underline">
                  Baixar {c.nome}
                </a>
              </object>
            ) : (
              <p key={c.id} className="flex items-center gap-2 rounded-xl bg-fundo px-3 py-2 text-sm">
                <Icone nome="documento" tamanho={18} /> {c.nome} <span className="text-suave">(arquivo de exemplo, sem prévia)</span>
              </p>
            ),
          )}
        </div>
        {naFila && (
          <div className="space-y-2 border-t border-borda pt-3">
            {r.status === 'enviado' && (
              <button className="botao-secundario w-full" onClick={() => iniciarAnalise(r.id, adminId)}>
                Iniciar análise
              </button>
            )}
            <button
              className="botao-primario w-full"
              onClick={() => {
                validar(r.id, adminId)
                avisar('Reporte validado: XP creditado, pin desbloqueado e meta recalculada.')
              }}
            >
              <Icone nome="check" /> Validar
            </button>
            <textarea className="campo min-h-20" placeholder="Motivo da devolução (obrigatório para devolver)" value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Motivo da devolução" />
            <button className="botao w-full border border-alerta text-alerta hover:bg-alerta-claro" disabled={!motivo.trim()} onClick={() => tentar(() => devolver(r.id, motivo.trim(), adminId), 'Reporte devolvido para ajuste.')}>
              Devolver para ajuste
            </button>
          </div>
        )}
        {r.status === 'validado' && (
          <div className="space-y-2 border-t border-borda pt-3">
            <textarea className="campo min-h-20" placeholder="Motivo do estorno" value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Motivo do estorno" />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="botao flex-1 border border-alerta text-alerta hover:bg-alerta-claro" disabled={!motivo.trim()} onClick={() => tentar(() => devolver(r.id, motivo.trim(), adminId), 'Reporte devolvido para ajuste; XP, Patinhas e insígnias derivadas foram estornados.')}>
                Devolver para ajuste
              </button>
              <button className="botao flex-1 border border-alerta text-alerta hover:bg-alerta-claro" disabled={!motivo.trim()} onClick={() => tentar(() => estornar(r.id, motivo.trim(), adminId), 'Reporte estornado e prêmios removidos.')}>
                Estornar
              </button>
            </div>
            <p className="text-xs text-suave">As duas opções desfazem XP, Patinhas, pontos de temporada, insígnias derivadas e o pin (se não houver outra destinação na edição).</p>
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">Histórico</summary>
          <ul className="mt-2 space-y-1">
            {r.historico.map((h, i) => (
              <li key={i}>
                {t.status[h.status]} · {dataHora(h.em)} {h.nota && <span className="text-suave">· {h.nota}</span>}
              </li>
            ))}
          </ul>
        </details>
      </div>
    )
  }
}

function Info({ r, v }: { r: string; v: string }) {
  return (
    <div className="rounded-lg bg-fundo px-2 py-1">
      <dt className="text-xs text-suave">{r}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  )
}

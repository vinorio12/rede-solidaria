import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { decidirReportePadrinho, decidirVinculo } from '@/domain/servicos'
import { CabecalhoPagina, ChipStatus, Vazio } from '@/components/ui'
import { tentar } from '@/components/Feedback'
import { data, moeda } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

export function Padrinho() {
  const u = useUsuario()
  const b = useBanco()
  const afilhados = b.usuarios.filter((x) => x.perfil === 'convidado' && x.padrinhoEmail?.toLowerCase() === u.email.toLowerCase())
  const vinculosPendentes = afilhados.filter((x) => x.vinculoStatus === 'pendente')
  const reportesPendentes = b.reportes.filter((r) => r.status === 'aguardando_padrinho' && afilhados.some((a) => a.id === r.usuarioId))

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <CabecalhoPagina titulo={t.nav.padrinho} subtitulo="Aprove o vínculo dos seus convidados e cada reporte deles. Depois disso, a Seção DS valida o comprovante." />

      <section>
        <h2 className="mb-2 font-titulo font-bold text-weg-900">Vínculos pendentes</h2>
        {!vinculosPendentes.length ? (
          <p className="text-sm text-suave">Nenhum vínculo aguardando sua resposta.</p>
        ) : (
          <ul className="space-y-2">
            {vinculosPendentes.map((c) => (
              <li key={c.id} className="cartao flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.nome}</p>
                  <p className="text-sm text-suave">
                    {c.email} · {c.municipio}
                  </p>
                </div>
                <button className="botao-primario" onClick={() => tentar(() => decidirVinculo(u.id, c.id, true), 'Vínculo aprovado.')}>
                  Aprovar
                </button>
                <button className="botao-secundario" onClick={() => tentar(() => decidirVinculo(u.id, c.id, false), 'Vínculo recusado.')}>
                  Recusar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-titulo font-bold text-weg-900">Reportes aguardando sua aprovação</h2>
        {!reportesPendentes.length ? (
          <Vazio texto="Nenhum reporte de convidado aguardando aprovação." variante="dormindo" />
        ) : (
          <ul className="space-y-2">
            {reportesPendentes.map((r) => {
              const c = afilhados.find((a) => a.id === r.usuarioId)!
              return (
                <li key={r.id} className="cartao space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{c.nome}</p>
                      <p className="text-sm text-suave">
                        {t.fundo[r.fundoTipo]} · {r.municipio}/{r.uf} · {data(r.dataPagamento)}
                      </p>
                    </div>
                    <span className="font-titulo font-bold">{moeda(r.valor)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ChipStatus status={r.status} />
                    {c.vinculoStatus !== 'aprovado' && <span className="text-xs text-suave">Aprovar o reporte também confirma o vínculo.</span>}
                    <span className="flex-1" />
                    <button className="botao-primario" onClick={() => tentar(() => decidirReportePadrinho(u.id, r.id, true), 'Reporte aprovado e enviado para validação.')}>
                      Aprovar
                    </button>
                    <button className="botao-secundario" onClick={() => tentar(() => decidirReportePadrinho(u.id, r.id, false, 'Não reconheço este reporte.'), 'Reporte recusado.')}>
                      Recusar
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-titulo font-bold text-weg-900">Seus convidados</h2>
        {!afilhados.length ? (
          <p className="text-sm text-suave">Ninguém indicou você como padrinho ainda.</p>
        ) : (
          <ul className="cartao divide-y divide-borda p-0">
            {afilhados.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{c.nome}</span>
                <span className="text-suave">{c.vinculoStatus === 'aprovado' ? 'Vínculo aprovado' : c.vinculoStatus === 'recusado' ? 'Vínculo recusado' : 'Aguardando'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

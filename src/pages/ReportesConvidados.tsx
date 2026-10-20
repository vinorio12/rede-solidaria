import { Link } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { decidirReporteConvidado } from '@/domain/servicos'
import { CabecalhoPagina, ChipStatus, Vazio } from '@/components/ui'
import { tentar } from '@/components/Feedback'
import { data, dataHora, moeda } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

export function ReportesConvidados() {
  const u = useUsuario()
  const b = useBanco()
  const meus = b.reportes.filter((r) => r.usuarioId === u.id && r.convidado).sort((a, c) => c.criadoEm.localeCompare(a.criadoEm))
  const pendentes = meus.filter((r) => r.status === 'aguardando_colaborador')
  const usados = meus.filter((r) => r.ciclo === b.configuracoes.cicloAtivo && r.status !== 'recusado_colaborador').length
  const limite = b.configuracoes.convidados.limitePorEdicao

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <CabecalhoPagina
        titulo={t.nav.convidados}
        subtitulo={`Amigos e familiares não cadastrados reportam pelo seu link. Você confirma, a Seção DS valida e o XP vem para você. ${usados}/${limite} nesta edição.`}
        acao={
          <Link to="/convidar#link-convidado" className="botao-secundario">
            Meu link
          </Link>
        }
      />

      <section>
        <h2 className="mb-2 font-titulo font-bold text-weg-900">Para confirmar ({pendentes.length})</h2>
        {!pendentes.length ? (
          <p className="text-sm text-suave">Nenhum reporte aguardando sua confirmação.</p>
        ) : (
          <ul className="space-y-2">
            {pendentes.map((r) => (
              <li key={r.id} className="cartao space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.convidado!.nome}</p>
                    <p className="text-sm text-suave">
                      {t.relacaoConvidado[r.convidado!.relacao]} · {t.fundo[r.fundoTipo]} · {r.municipio}/{r.uf} · {data(r.dataPagamento)}
                    </p>
                    <p className="text-xs text-suave">Recebido em {dataHora(r.criadoEm)}</p>
                  </div>
                  <span className="font-titulo font-bold">{moeda(r.valor)}</span>
                </div>
                {r.duplicidadeSuspeita && <p className="text-sm text-alerta">Atenção: parece repetido ({r.duplicidadeSuspeita}).</p>}
                <div className="flex flex-wrap gap-2">
                  <button className="botao-primario" onClick={() => tentar(() => decidirReporteConvidado(u.id, r.id, true), 'Confirmado. O reporte seguiu para a validação da Seção DS.')}>
                    Confirmar
                  </button>
                  <button className="botao-secundario" onClick={() => tentar(() => decidirReporteConvidado(u.id, r.id, false, 'Não reconheço este reporte'), 'Reporte recusado e descartado.')}>
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-titulo font-bold text-weg-900">Histórico</h2>
        {!meus.length ? (
          <Vazio texto={t.vazio.convidados} variante="apontando" />
        ) : (
          <ul className="cartao divide-y divide-borda p-0">
            {meus
              .filter((r) => r.status !== 'aguardando_colaborador')
              .map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                  <Link to={`/reportes/${r.id}`} className="min-w-0 flex-1 font-semibold hover:underline">
                    {r.convidado!.nome}
                    <span className="block text-xs font-normal text-suave">
                      {r.convidado!.lancadoPeloColaborador ? 'Lançado por você' : 'Pelo link'} · {data(r.dataPagamento)}
                    </span>
                  </Link>
                  <ChipStatus status={r.status} />
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}

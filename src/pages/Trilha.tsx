import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { estadoTrilha, trilhaEmProrrogacao, COR_RARIDADE } from '@/domain/jogo'
import { resgatarDegrau } from '@/domain/servicos'
import { Mascote } from '@/components/Mascote'
import { IconePatinha, SeloRaridade } from '@/components/Jogo'
import { BarraProgresso, CabecalhoPagina, Vazio } from '@/components/ui'
import { confete, tentar } from '@/components/Feedback'
import { data, numero } from '@/lib/datas'

export function Trilha() {
  const u = useUsuario()
  const b = useBanco()
  const est = estadoTrilha(b, u.id)
  const anterior = trilhaEmProrrogacao(b, u.id)
  if (!est) return <Vazio texto="Nenhuma temporada ativa agora." variante="dormindo" />
  const { trilha, ocorrencia, pontos, alcancado, resgatados } = est
  const pendentes = Array.from({ length: alcancado }, (_, i) => i + 1).filter((d) => !resgatados.includes(d))

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <CabecalhoPagina
        titulo="Trilha da Temporada"
        subtitulo={`${ocorrencia.temporada.nome}, de ${data(ocorrencia.inicio)} a ${data(ocorrencia.fim)}. Gratuita: cada ${trilha.pontosPorDegrau} pontos de temporada (o XP ganho na temporada) sobem um degrau.`}
      />
      {anterior && (
        <section className="cartao flex flex-wrap items-center gap-3 border-[#C9A227] bg-[#C9A227]/10">
          <p className="flex-1 text-sm">
            <strong>{anterior.ocorrencia.temporada.nome}</strong> terminou, mas você ainda pode resgatar os prêmios alcançados até {data(anterior.prazo)}.
          </p>
          <button
            className="botao-primario"
            onClick={() => {
              for (let d = 1; d <= anterior.alcancado; d++) if (!anterior.resgatados.includes(d)) tentar(() => resgatarDegrau(u.id, d, anterior.ocorrencia.chave))
              confete()
            }}
          >
            Resgatar prêmios pendentes
          </button>
        </section>
      )}
      <section className="cartao space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-titulo text-lg font-bold text-weg-900">
            Degrau {alcancado} de {trilha.degraus}
          </p>
          <p className="text-sm text-suave">
            {numero(pontos)} pontos {alcancado < trilha.degraus && `· faltam ${numero(est.proximoEm)} para o próximo`}
          </p>
        </div>
        <BarraProgresso valor={pontos} max={trilha.degraus * trilha.pontosPorDegrau} rotulo="Avanço na trilha" altura="h-4" />
        {pendentes.length > 1 && (
          <button
            className="botao-primario"
            onClick={() => {
              for (const d of pendentes) tentar(() => resgatarDegrau(u.id, d))
              confete()
            }}
          >
            Resgatar {pendentes.length} degraus
          </button>
        )}
        <p className="text-xs text-suave">Ao fim da temporada, os prêmios não resgatados ficam disponíveis por mais 7 dias.</p>
      </section>

      {/* caminho ilustrado com o leãozinho avançando */}
      <ol className="relative grid grid-cols-5 gap-3 sm:grid-cols-5" aria-label="Degraus da trilha">
        {Array.from({ length: trilha.degraus }, (_, i) => {
          const d = i + 1
          const rec = trilha.recompensas.find((r) => r.degrau === d)
          const item = rec?.itemId ? b.itens.find((x) => x.id === rec.itemId) : undefined
          const atingido = d <= alcancado
          const resgatado = resgatados.includes(d)
          const aqui = d === Math.min(trilha.degraus, alcancado + 1) || (alcancado === trilha.degraus && d === trilha.degraus)
          return (
            <li
              key={d}
              className={`relative flex min-h-28 flex-col items-center justify-between rounded-2xl border p-2 text-center text-xs ${resgatado ? 'border-sucesso/50 bg-sucesso-claro' : atingido ? 'border-rs-azul bg-rs-ciano-claro' : 'border-borda bg-superficie opacity-80'}`}
              style={item ? { borderColor: COR_RARIDADE[item.raridade], borderWidth: 2 } : undefined}
            >
              <span className="font-titulo font-bold text-weg-900">{d}</span>
              {aqui && <Mascote variante={alcancado === trilha.degraus ? 'comemorando' : 'acenando'} tamanho={40} className="absolute -top-5 right-0" decorativo />}
              {item ? (
                <span className="flex flex-col items-center gap-1">
                  <span className="line-clamp-2 font-semibold">{item.nome}</span>
                  <SeloRaridade raridade={item.raridade} />
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 font-bold text-[#9a7a12]">
                  +{rec?.patinhas ?? 0} <IconePatinha tamanho={12} />
                </span>
              )}
              {resgatado ? (
                <span className="font-semibold text-sucesso">Resgatado</span>
              ) : atingido ? (
                <button
                  className="rounded-lg bg-rs-azul px-2 py-1 font-bold text-white"
                  onClick={() => {
                    if (tentar(() => resgatarDegrau(u.id, d), d === trilha.degraus ? 'Trilha completa! Insígnia Temporada Completa liberada.' : 'Prêmio resgatado.') !== undefined) confete()
                  }}
                >
                  Resgatar
                </button>
              ) : (
                <span className="text-suave">{d * trilha.pontosPorDegrau} pts</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { statusJogador, flexionar } from '@/domain/consultas'
import { requisitoAtendido, resgatar, votar, votosDisponiveis } from '@/domain/servicos'
import { romano } from '@/domain/motor'
import type { RecompensaInstitucional } from '@/domain/types'
import { Icone } from '@/components/Icone'
import { BarraProgresso, CabecalhoPagina } from '@/components/ui'
import { confete, tentar } from '@/components/Feedback'
import { data } from '@/lib/datas'

const CATEGORIAS: Record<RecompensaInstitucional['categoria'], string> = { reconhecimento: 'Reconhecimento', produto: 'Produto', experiencia: 'Experiência', voucher: 'Voucher' }
const STATUS: Record<string, string> = { solicitado: 'Solicitado à Seção DS', aprovado: 'Aprovado', entregue: 'Entregue', recusado: 'Recusado' }

export function Recompensas() {
  const u = useUsuario()
  const b = useBanco()
  const st = statusJogador(b, u.id)
  const edicao = b.configuracoes.cicloAtivo
  const hoje = new Date().toISOString().slice(0, 10)
  const meus = b.resgates.filter((r) => r.usuarioId === u.id)
  const voto = b.configuracoes.votoLeao
  const votos = votosDisponiveis(b, u.id)
  const placar = voto.projetos.map((id) => ({ p: b.projetos.find((x) => x.id === id)!, n: b.votos.filter((v) => v.projetoId === id && v.edicao === edicao).length, meus: b.votos.filter((v) => v.projetoId === id && v.edicao === edicao && v.usuarioId === u.id).length })).filter((x) => x.p)
  const total = placar.reduce((s, x) => s + x.n, 0)

  const requisitoTexto = (r: RecompensaInstitucional) => {
    const q = r.requisito
    if (q.nivel) return `Nível ${q.nivel}`
    if (q.tier) return `Tier ${flexionar(b.tiers.find((t) => t.numero === q.tier)!.nome, u.genero)}`
    if (q.insignia) {
      const ins = b.insignias.find((i) => i.id === q.insignia)
      return `Insígnia ${ins ? flexionar(ins.nome, u.genero) : q.insignia}${q.grau && ins && ins.graus.length > 1 ? ` ${romano(q.grau)}` : ''}`
    }
    return 'Sem requisito'
  }

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Recompensas" subtitulo={`Recompensas institucionais da WEG, separadas dos cosméticos. Você está no nível ${st.atual.nivel} (${st.tierNome}).`} />
      <p className="text-xs text-suave">Oferecidas exclusivamente pela WEG, de valor simbólico, nunca vinculadas ao valor destinado. Limite de 1 por pessoa por edição. Catálogo sujeito à validação de Compliance e Jurídico [A CONFIRMAR].</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {b.recompensas.map((rc) => {
          const liberado = requisitoAtendido(b, u.id, rc.requisito)
          const esgotado = rc.estoque !== null && rc.estoque <= 0
          const vencido = !!rc.validoAte && rc.validoAte < hoje
          const resgate = meus.find((r) => r.recompensaId === rc.id && r.edicao === edicao && r.status !== 'recusado')
          return (
            <li key={rc.id} className={`cartao flex flex-col gap-2 ${!liberado ? 'opacity-80' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-4xl" aria-hidden>
                  {rc.icone}
                </span>
                <span className="chip bg-rs-ciano-claro text-weg-900">{CATEGORIAS[rc.categoria]}</span>
              </div>
              <h2 className="font-titulo font-bold text-weg-900">{rc.nome}</h2>
              <p className="text-sm text-suave">{rc.descricao}</p>
              <ul className="space-y-0.5 text-xs text-suave">
                <li>Requisito: {requisitoTexto(rc)}</li>
                {rc.estoque !== null && <li>Estoque: {rc.estoque}</li>}
                {rc.validoAte && <li>Válido até {data(rc.validoAte)}</li>}
              </ul>
              <div className="mt-auto pt-2">
                {resgate ? (
                  <p className="rounded-xl bg-sucesso-claro px-3 py-2 text-center text-sm font-semibold text-sucesso">{STATUS[resgate.status]}</p>
                ) : (
                  <button
                    className="botao-primario w-full"
                    disabled={!liberado || esgotado || vencido}
                    onClick={() => {
                      if (tentar(() => resgatar(u.id, rc.id), 'Solicitação enviada para a Seção DS.') !== undefined) confete()
                    }}
                  >
                    {!liberado ? (
                      <>
                        <Icone nome="cadeado" tamanho={18} /> Bloqueado
                      </>
                    ) : esgotado ? (
                      'Esgotado'
                    ) : vencido ? (
                      'Encerrado'
                    ) : (
                      'Solicitar'
                    )}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {voto.ativo && (
        <section id="voto" className="cartao scroll-mt-24 space-y-3" aria-labelledby="voto-titulo">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-rs-azul">Voto do Leão [A CONFIRMAR]</p>
              <h2 id="voto-titulo" className="font-titulo text-lg font-bold text-weg-900">
                {voto.titulo}
              </h2>
              <p className="text-sm text-suave">
                A cada tier você ganha {voto.votosPorTier} voto(s). A Seção DS selecionou os projetos chancelados; o mais votado recebe um apoio adicional da WEG com recursos próprios ao fim da edição.
              </p>
            </div>
            <span className="chip bg-rs-ciano-claro py-1 text-weg-900">
              {votos.restantes} de {votos.total} voto(s) disponíveis
            </span>
          </div>
          <ul className="space-y-3">
            {placar.map(({ p, n, meus: meusVotos }) => (
              <li key={p.id} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 font-semibold">
                    {p.nome} <span className="text-sm font-normal text-suave">· {p.municipio}</span>
                  </span>
                  <span className="text-sm text-suave">
                    {total ? Math.round((n / total) * 100) : 0}% {meusVotos > 0 && `· ${meusVotos} seu(s)`}
                  </span>
                  <button className="botao-secundario min-h-9 px-3 py-1 text-xs" disabled={!votos.restantes} onClick={() => tentar(() => votar(u.id, p.id), 'Voto registrado.')}>
                    Votar
                  </button>
                </div>
                <BarraProgresso valor={n} max={Math.max(1, total)} rotulo={`Votos em ${p.nome}`} altura="h-2.5" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { nivelDe, xpTotal } from '@/domain/regras'
import { atualizarPerfil, resgatar } from '@/domain/servicos'
import { Icone } from '@/components/Icone'
import { CabecalhoPagina } from '@/components/ui'
import { confete, tentar } from '@/components/Feedback'
import { data } from '@/lib/datas'

const TIPOS: Record<string, string> = {
  insignia: 'Insígnia',
  moldura: 'Moldura de avatar',
  tema: 'Tema do app',
  voucher: 'Voucher',
  experiencia: 'Experiência',
  premiacao: 'Premiação',
}

const STATUS: Record<string, string> = { solicitado: 'Solicitado à Seção DS', aprovado: 'Aprovado', entregue: 'Entregue', recusado: 'Recusado' }

export function Recompensas() {
  const u = useUsuario()
  const b = useBanco()
  const nivel = nivelDe(xpTotal(b, u.id), b.niveis).atual
  const hoje = new Date().toISOString().slice(0, 10)
  const meus = b.resgates.filter((r) => r.usuarioId === u.id)

  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Recompensas" subtitulo={`O que o seu XP e os níveis desbloqueiam. Você está no nível ${nivel.nivel} (${nivel.nome}).`} />
      <p className="text-xs text-suave">Recompensas oferecidas exclusivamente pela WEG, de valor simbólico. Catálogo de exemplo, sujeito a validação de Compliance.</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {b.recompensas.map((rc) => {
          const insigniaOk = !rc.insigniaRequerida || b.usuarioInsignias.some((i) => i.usuarioId === u.id && i.insigniaId === rc.insigniaRequerida)
          const liberado = nivel.nivel >= rc.nivelMinimo && insigniaOk
          const esgotado = rc.estoque !== null && rc.estoque <= 0
          const vencido = !!rc.validoAte && rc.validoAte < hoje
          const resgate = meus.find((r) => r.recompensaId === rc.id && r.status !== 'recusado')
          const ativo = (rc.tipo === 'moldura' && u.molduraAtiva === rc.id) || (rc.tipo === 'tema' && u.temaAtivo === rc.id)
          return (
            <li key={rc.id} className={`cartao flex flex-col gap-2 ${!liberado ? 'opacity-75' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-4xl" aria-hidden>
                  {rc.icone}
                </span>
                <span className="chip bg-rs-ciano-claro text-weg-900">{TIPOS[rc.tipo]}</span>
              </div>
              <h2 className="font-titulo font-bold text-weg-900">{rc.nome}</h2>
              <p className="text-sm text-suave">{rc.descricao}</p>
              <ul className="space-y-0.5 text-xs text-suave">
                <li>Nível mínimo: {rc.nivelMinimo} ({b.niveis.find((n) => n.nivel === rc.nivelMinimo)?.nome})</li>
                {rc.insigniaRequerida && <li>Requer a insígnia {b.insignias.find((i) => i.id === rc.insigniaRequerida)?.nome}</li>}
                {rc.estoque !== null && <li>Estoque: {rc.estoque}</li>}
                {rc.validoAte && <li>Válido até {data(rc.validoAte)}</li>}
              </ul>
              <div className="mt-auto pt-2">
                {resgate ? (
                  rc.tipo === 'moldura' || rc.tipo === 'tema' ? (
                    <button
                      className={ativo ? 'botao-secundario w-full' : 'botao-primario w-full'}
                      onClick={() => atualizarPerfil(u.id, rc.tipo === 'moldura' ? { molduraAtiva: ativo ? undefined : rc.id } : { temaAtivo: ativo ? undefined : rc.id })}
                    >
                      {ativo ? 'Remover' : 'Usar'}
                    </button>
                  ) : (
                    <p className="rounded-xl bg-sucesso-claro px-3 py-2 text-center text-sm font-semibold text-sucesso">{STATUS[resgate.status]}</p>
                  )
                ) : (
                  <button
                    className="botao-primario w-full"
                    disabled={!liberado || esgotado || vencido}
                    onClick={() => {
                      if (tentar(() => resgatar(u.id, rc.id), rc.tipo === 'moldura' || rc.tipo === 'tema' ? 'Desbloqueado e aplicado.' : 'Solicitação enviada para a Seção DS.') !== undefined) confete()
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
                      'Resgatar'
                    )}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { marcarLidas } from '@/domain/servicos'
import { Icone } from '@/components/Icone'
import { CabecalhoPagina, Vazio } from '@/components/ui'
import { dataHora } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

const ICONES: Record<string, string> = {
  reporte: 'documento',
  padrinho: 'usuarios',
  missao: 'missoes',
  nivel: 'estrela',
  meta: 'grafico',
  prazo: 'calendario',
  convite: 'convidar',
  recompensa: 'recompensas',
  insignia: 'pins',
}

export function Notificacoes() {
  const u = useUsuario()
  const b = useBanco()
  const lista = b.notificacoes.filter((n) => n.usuarioId === u.id)
  const naoLidas = lista.filter((n) => !n.lida).length

  return (
    <div className="mx-auto max-w-2xl">
      <CabecalhoPagina
        titulo={t.nav.notificacoes}
        subtitulo={naoLidas ? `${naoLidas} não lidas` : undefined}
        acao={
          naoLidas > 0 && (
            <button className="botao-secundario" onClick={() => marcarLidas(u.id)}>
              Marcar todas como lidas
            </button>
          )
        }
      />
      {!lista.length && <Vazio texto={t.vazio.notificacoes} variante="dormindo" />}
      <ul className="space-y-2">
        {lista.map((n) => {
          const conteudo = (
            <>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${n.lida ? 'bg-fundo text-suave' : 'bg-rs-ciano-claro text-rs-azul'}`}>
                <Icone nome={ICONES[n.tipo] ?? 'sino'} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${n.lida ? 'font-semibold' : 'font-bold'}`}>{n.titulo}</span>
                <span className="block text-sm text-suave">{n.texto}</span>
                <span className="block text-xs text-suave">{dataHora(n.em)}</span>
              </span>
              {!n.lida && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-rs-ciano" aria-label="Não lida" />}
            </>
          )
          return (
            <li key={n.id}>
              {n.link ? (
                <Link to={n.link} onClick={() => marcarLidas(u.id, [n.id])} className="cartao flex items-start gap-3 transition hover:border-rs-azul">
                  {conteudo}
                </Link>
              ) : (
                <button onClick={() => marcarLidas(u.id, [n.id])} className="cartao flex w-full items-start gap-3 text-left">
                  {conteudo}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { flexionar } from '@/domain/consultas'
import { progressoInsignias, COR_RARIDADE } from '@/domain/jogo'
import { romano } from '@/domain/motor'
import type { CategoriaInsignia } from '@/domain/types'
import { AnelProgresso, SeloRaridade } from '@/components/Jogo'
import { CabecalhoPagina } from '@/components/ui'
import { t } from '@/i18n/pt-BR'

export function Conquistas() {
  const u = useUsuario()
  const b = useBanco()
  const [filtro, setFiltro] = useState<CategoriaInsignia | ''>('')
  const lista = progressoInsignias(b, u.id).filter((p) => !filtro || p.insignia.categoria === filtro)
  const conquistadas = progressoInsignias(b, u.id).filter((p) => p.grau > 0).length
  const categorias = [...new Set(b.insignias.map((i) => i.categoria))]

  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo="Conquistas" subtitulo={`${conquistadas} de ${b.insignias.length} insígnias. As secretas só se revelam quando conquistadas.`} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
        <button className={`chip min-h-9 px-3 ${!filtro ? 'bg-rs-azul text-white' : 'bg-superficie text-weg-900 ring-1 ring-borda'}`} onClick={() => setFiltro('')} aria-pressed={!filtro}>
          Todas
        </button>
        {categorias.map((c) => (
          <button key={c} className={`chip min-h-9 px-3 ${filtro === c ? 'bg-rs-azul text-white' : 'bg-superficie text-weg-900 ring-1 ring-borda'}`} onClick={() => setFiltro(c)} aria-pressed={filtro === c}>
            {t.categoriaInsignia[c]}
          </button>
        ))}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map(({ insignia: ins, grau, valor, limite, fracao, proximo }) => {
          const escondida = ins.secreta && grau === 0
          const raridade = ins.graus[Math.max(0, grau - 1)].raridade
          const cor = grau ? COR_RARIDADE[raridade] : '#8A99A8'
          return (
            <li key={ins.id} className={`cartao flex gap-3 ${grau ? '' : 'opacity-80'}`} style={grau ? { borderColor: cor } : undefined}>
              <AnelProgresso fracao={escondida ? 0 : grau && !proximo ? 1 : fracao} tamanho={60} espessura={5} cor={cor} rotulo={escondida ? 'Conquista secreta' : `Progresso de ${flexionar(ins.nome, u.genero)}`}>
                <span className={`text-2xl ${grau ? '' : 'grayscale'}`} aria-hidden>
                  {escondida ? '❔' : ins.icone}
                </span>
              </AnelProgresso>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  <h2 className="font-titulo font-bold text-weg-900">
                    {escondida ? 'Conquista secreta' : flexionar(ins.nome, u.genero)}
                    {grau > 0 && ins.graus.length > 1 && ` ${romano(grau)}`}
                  </h2>
                  {grau > 0 && <SeloRaridade raridade={raridade} />}
                </div>
                <p className="text-sm text-suave">{escondida ? 'Continue explorando o app.' : ins.descricao}</p>
                {!escondida && ins.graus.length > 1 && (
                  <p className="mt-1 flex flex-wrap gap-1 text-xs">
                    {ins.graus.map((gr, i) => (
                      <span key={i} className={`rounded-full px-2 py-0.5 ${i < grau ? 'text-white' : 'bg-fundo text-suave'}`} style={i < grau ? { background: COR_RARIDADE[gr.raridade] } : undefined}>
                        {romano(i + 1)}
                      </span>
                    ))}
                  </p>
                )}
                {!escondida && proximo && (
                  <p className="mt-1 text-xs font-semibold text-rs-azul">
                    {ins.metrica === 'embaixador' ? 'Atribuída pela Seção DS' : `${Math.min(valor, limite)}/${limite} para ${ins.graus.length > 1 ? `o grau ${romano(proximo)}` : 'conquistar'}`}
                  </p>
                )}
                {ins.titulo && grau > 0 && <p className="mt-1 text-xs text-suave">Título liberado: {flexionar(ins.titulo, u.genero)}</p>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

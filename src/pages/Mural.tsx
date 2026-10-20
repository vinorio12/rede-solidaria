import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { possuiItem } from '@/domain/jogo'
import { alcateiaDo } from '@/domain/motor'
import { atualizarPerfil, reagir } from '@/domain/servicos'
import { AvatarLeao } from '@/components/AvatarLeao'
import { SeloRaridade } from '@/components/Jogo'
import { Abas, CabecalhoPagina, Vazio } from '@/components/ui'
import { avisar, confete, tentar } from '@/components/Feedback'
import { dataHora } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

// Mural da Rede (seção 8.6): conquistas da unidade e das alcateias, com reações
// por adesivos e sem comentários abertos. Valores nunca aparecem.

export function Mural() {
  const u = useUsuario()
  const b = useBanco()
  const [recorte, setRecorte] = useState<'unidade' | 'alcateia' | 'todos'>('unidade')
  const alc = alcateiaDo(b, u.id)
  const membrosAlc = new Set(b.alcateiaMembros.filter((m) => m.alcateiaId === alc?.id).map((m) => m.usuarioId))
  const adesivos = b.itens.filter((i) => i.categoria === 'adesivo')
  const posts = b.mural
    .filter((p) => !p.oculto)
    .filter((p) => {
      const autor = b.usuarios.find((x) => x.id === p.usuarioId)
      if (!autor || autor.ocultarMural) return false
      if (recorte === 'unidade') return autor.unidadeId === u.unidadeId
      if (recorte === 'alcateia') return membrosAlc.has(autor.id)
      return true
    })
    .sort((a, c) => c.em.localeCompare(a.em))

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <CabecalhoPagina titulo="Mural da Rede" subtitulo="Subidas de tier, insígnias raras e trilhas concluídas. Reaja com adesivos; aqui não há comentários nem valores." />
      <Abas
        rotulo="Recorte"
        ativa={recorte}
        aoMudar={setRecorte}
        abas={[
          { id: 'unidade', nome: 'Minha unidade' },
          ...(alc ? [{ id: 'alcateia' as const, nome: 'Minha alcateia' }] : []),
          { id: 'todos', nome: 'Toda a Rede' },
        ]}
      />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-rs-azul" checked={u.ocultarMural} onChange={(e) => atualizarPerfil(u.id, { ocultarMural: e.target.checked })} />
        Ocultar minhas conquistas do mural
      </label>
      {!posts.length && <Vazio texto={t.vazio.mural} variante="dormindo" />}
      <ul className="space-y-3">
        {posts.map((p) => {
          const autor = b.usuarios.find((x) => x.id === p.usuarioId)!
          const reacoes = b.reacoes.filter((r) => r.postId === p.id)
          const minha = reacoes.find((r) => r.usuarioId === u.id)
          const anonimo = autor.anonimo && autor.id !== u.id
          return (
            <li key={p.id} className="cartao space-y-2">
              <div className="flex items-center gap-3">
                {anonimo ? <span className="flex h-11 w-11 items-center justify-center rounded-full bg-borda font-bold text-suave">?</span> : <AvatarLeao avatar={autor.avatar} tamanho={44} />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <strong>{anonimo ? 'Participante anônimo' : autor.nome}</strong> {p.texto} <span aria-hidden>{p.icone}</span>
                  </p>
                  <p className="text-xs text-suave">{dataHora(p.em)}</p>
                </div>
                {p.raridade && <SeloRaridade raridade={p.raridade} />}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {adesivos.map((a) => {
                  const n = reacoes.filter((r) => r.adesivo === a.id).length
                  const tem = possuiItem(b, u.id, a)
                  const ativo = minha?.adesivo === a.id
                  return (
                    <button
                      key={a.id}
                      disabled={!tem || autor.id === u.id}
                      aria-pressed={ativo}
                      title={tem ? a.nome : `${a.nome} (bloqueado)`}
                      onClick={() => {
                        const r = tentar(() => reagir(u.id, p.id, a.id))
                        if (r) {
                          confete()
                          avisar('Missão concluída: Reagir à conquista de um colega')
                        }
                      }}
                      className={`inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-sm ${ativo ? 'bg-rs-ciano-claro ring-2 ring-rs-azul' : 'bg-fundo'} ${!tem ? 'opacity-40' : ''}`}
                    >
                      <span aria-hidden>{a.arte.cor}</span>
                      <span className="sr-only">{a.nome}</span>
                      {n > 0 && <span className="text-xs font-bold">{n}</span>}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

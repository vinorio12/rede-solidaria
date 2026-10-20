import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { comoObter, possuiItem } from '@/domain/jogo'
import { salvarAvatar } from '@/domain/servicos'
import { statusJogador } from '@/domain/consultas'
import type { AvatarConfig, CategoriaItem } from '@/domain/types'
import { AvatarLeao } from '@/components/AvatarLeao'
import { SeloRaridade } from '@/components/Jogo'
import { Icone } from '@/components/Icone'
import { Abas, CabecalhoPagina } from '@/components/ui'
import { confete, tentar } from '@/components/Feedback'
import { t } from '@/i18n/pt-BR'

type Cat = Exclude<CategoriaItem, 'adesivo'>
const CATEGORIAS: Cat[] = ['juba', 'cabeca', 'rosto', 'pescoco', 'pata', 'fundo', 'moldura', 'banner', 'tema', 'efeito', 'estilo_ranking']
const OPCIONAIS: Cat[] = ['cabeca', 'rosto', 'pescoco', 'pata', 'moldura', 'banner', 'estilo_ranking']

export function Personalizar() {
  const u = useUsuario()
  const b = useBanco()
  const st = statusJogador(b, u.id)
  const [previa, setPrevia] = useState<AvatarConfig>(u.avatar)
  const [cat, setCat] = useState<Cat>('juba')
  const [filtro, setFiltro] = useState<'todos' | 'tenho' | 'bloqueados'>('todos')
  useEffect(() => setPrevia(u.avatar), [u.avatar])

  const itens = b.itens.filter((i) => i.categoria === cat).filter((i) => (filtro === 'todos' ? true : filtro === 'tenho' ? possuiItem(b, u.id, i) : !possuiItem(b, u.id, i)))
  const mudou = JSON.stringify(previa) !== JSON.stringify(u.avatar)
  const temas = b.itens.find((i) => i.id === previa.tema)

  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo="Personalizar" subtitulo="Monte o seu leãozinho com o que você conquistou. Itens bloqueados mostram como obtê-los." />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="cartao flex flex-col items-center gap-3 lg:sticky lg:top-20 lg:self-start" aria-label="Prévia">
          <AvatarLeao avatar={previa} tamanho={220} estrelas={st.prestigio.estrelas} rotulo="Prévia do seu avatar" />
          {temas && <p className="text-xs text-suave">Tema do app: {temas.nome}</p>}
          <div className="flex w-full gap-2">
            <button className="botao-secundario flex-1" disabled={!mudou} onClick={() => setPrevia(u.avatar)}>
              Desfazer
            </button>
            <button
              className="botao-primario flex-1"
              disabled={!mudou}
              onClick={() => {
                if (tentar(() => salvarAvatar(u.id, previa), 'Avatar salvo.') !== undefined) confete()
              }}
            >
              Salvar
            </button>
          </div>
          <Link to="/loja" className="text-sm font-semibold text-rs-azul underline">
            Ver a Loja do Leão
          </Link>
        </section>

        <section className="min-w-0 space-y-3">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Categoria">
            {CATEGORIAS.map((c) => (
              <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={`min-h-11 whitespace-nowrap rounded-xl px-3 font-titulo text-sm font-bold ${cat === c ? 'bg-rs-azul text-white' : 'bg-superficie text-weg-900 ring-1 ring-borda'}`}>
                {t.categoriaItem[c]}
              </button>
            ))}
          </div>
          <Abas
            rotulo="Filtro"
            ativa={filtro}
            aoMudar={setFiltro}
            abas={[
              { id: 'todos', nome: 'Todos' },
              { id: 'tenho', nome: 'Tenho' },
              { id: 'bloqueados', nome: 'Bloqueados' },
            ]}
          />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {OPCIONAIS.includes(cat) && filtro !== 'bloqueados' && (
              <li>
                <button onClick={() => setPrevia({ ...previa, [cat]: undefined })} aria-pressed={!previa[cat]} className={`cartao flex h-full w-full flex-col items-center justify-center gap-2 text-sm ${!previa[cat] ? 'border-2 border-rs-azul' : ''}`}>
                  <Icone nome="fechar" />
                  Sem {t.categoriaItem[cat].toLowerCase()}
                </button>
              </li>
            )}
            {itens.map((i) => {
              const tem = possuiItem(b, u.id, i)
              const equipado = previa[cat] === i.id
              return (
                <li key={i.id}>
                  <button
                    onClick={() => tem && setPrevia({ ...previa, [cat]: i.id })}
                    aria-pressed={equipado}
                    aria-disabled={!tem}
                    className={`cartao flex h-full w-full flex-col items-center gap-2 p-3 text-center text-sm ${equipado ? 'border-2 border-rs-azul' : ''} ${tem ? 'hover:border-rs-azul' : 'cursor-not-allowed opacity-70'}`}
                  >
                    <span className="relative">
                      <AvatarLeao avatar={{ ...previa, [cat]: i.id }} tamanho={72} />
                      {!tem && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-weg-900/55 text-white">
                          <Icone nome="cadeado" />
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">{i.nome}</span>
                    <SeloRaridade raridade={i.raridade} />
                    {!tem && <span className="text-xs text-suave">{comoObter(b, i)}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

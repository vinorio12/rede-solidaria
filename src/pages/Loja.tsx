import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { ofertasLoja, possuiItem, precoItem } from '@/domain/jogo'
import { saldoPatinhas, statusJogador } from '@/domain/consultas'
import { comprarItem, equipar } from '@/domain/servicos'
import type { Item } from '@/domain/types'
import { AvatarLeao } from '@/components/AvatarLeao'
import { IconePatinha, Patinhas, SeloRaridade } from '@/components/Jogo'
import { CabecalhoPagina, Modal } from '@/components/ui'
import { confete, tentar } from '@/components/Feedback'
import { data } from '@/lib/datas'
import { somarDias } from '@/lib/tempo'
import { t } from '@/i18n/pt-BR'

export function Loja() {
  const u = useUsuario()
  const b = useBanco()
  const { semana, ofertas, temporada, temporadaNome } = ofertasLoja(b)
  const saldo = saldoPatinhas(b, u.id)
  const st = statusJogador(b, u.id)
  const [previa, setPrevia] = useState<Item | null>(null)

  const Cartao = ({ item, destaque }: { item: Item; destaque?: boolean }) => {
    const tem = possuiItem(b, u.id, item)
    const preco = precoItem(b, item) ?? 0
    return (
      <li className={`cartao flex flex-col items-center gap-2 text-center ${destaque ? 'border-2 border-[#6B4FBB]' : ''}`}>
        <AvatarLeao avatar={{ ...u.avatar, [item.categoria]: item.id }} tamanho={96} />
        <p className="font-semibold">{item.nome}</p>
        <div className="flex flex-wrap justify-center gap-1">
          <SeloRaridade raridade={item.raridade} />
          <span className="chip bg-fundo text-suave">{t.categoriaItem[item.categoria]}</span>
        </div>
        <span className="inline-flex items-center gap-1 font-titulo font-bold text-[#9a7a12]">
          {preco} <IconePatinha />
        </span>
        <div className="mt-auto flex w-full gap-2">
          <button className="botao-secundario flex-1 px-2" onClick={() => setPrevia(item)}>
            Prévia
          </button>
          {tem ? (
            <span className="flex flex-1 items-center justify-center rounded-xl bg-sucesso-claro text-sm font-semibold text-sucesso">Na coleção</span>
          ) : (
            <button
              className="botao-primario flex-1 px-2"
              disabled={saldo < preco}
              onClick={() => {
                if (tentar(() => comprarItem(u.id, item.id), `${item.nome} é seu!`) !== undefined) confete()
              }}
            >
              {t.acoes.comprar}
            </button>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo="Loja do Leão"
        subtitulo={`Só cosméticos, comprados com Patinhas. Nada aqui custa dinheiro ou tem valor monetário. Ofertas renovadas toda segunda-feira (próxima em ${data(somarDias(semana, 7))}).`}
        acao={<Patinhas valor={saldo} className="rounded-xl bg-[#C9A227]/15 px-3 py-2 text-lg text-[#7A5E0F]" />}
      />
      {temporada && (
        <section aria-labelledby="oferta-temporada">
          <h2 id="oferta-temporada" className="mb-2 font-titulo font-bold text-weg-900">
            Oferta da temporada · {temporadaNome}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Cartao item={temporada} destaque />
          </ul>
        </section>
      )}
      <section aria-labelledby="ofertas">
        <h2 id="ofertas" className="mb-2 font-titulo font-bold text-weg-900">
          Ofertas da semana
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ofertas.map((i) => (
            <Cartao key={i.id} item={i} />
          ))}
        </ul>
      </section>
      <p className="text-xs text-suave">Itens lendários nunca são vendidos: só podem ser conquistados. Itens de edição saem da loja no fim da edição e viram colecionáveis.</p>

      <Modal aberto={!!previa} aoFechar={() => setPrevia(null)} titulo={previa ? `Prévia: ${previa.nome}` : ''}>
        {previa && (
          <div className="flex flex-col items-center gap-3">
            <AvatarLeao avatar={{ ...u.avatar, [previa.categoria]: previa.id }} tamanho={200} estrelas={st.prestigio.estrelas} rotulo="Prévia no seu avatar" />
            <SeloRaridade raridade={previa.raridade} />
            {possuiItem(b, u.id, previa) ? (
              <button
                className="botao-primario w-full"
                onClick={() => {
                  if (previa.categoria !== 'adesivo') tentar(() => equipar(u.id, previa.categoria as Exclude<typeof previa.categoria, 'adesivo'>, previa.id), 'Equipado.')
                  setPrevia(null)
                }}
              >
                {t.acoes.equipar}
              </button>
            ) : (
              <button
                className="botao-primario w-full"
                disabled={saldo < (precoItem(b, previa) ?? Infinity)}
                onClick={() => {
                  if (tentar(() => comprarItem(u.id, previa.id), `${previa.nome} é seu!`) !== undefined) {
                    confete()
                    if (previa.categoria !== 'adesivo') tentar(() => equipar(u.id, previa.categoria as Exclude<typeof previa.categoria, 'adesivo'>, previa.id))
                    setPrevia(null)
                  }
                }}
              >
                Comprar e equipar · {precoItem(b, previa)} Patinhas
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

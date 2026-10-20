import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { rankingAlcateias, rankingCidades, rankingPessoas, rankingUnidades, type LinhaGrupo, type LinhaRanking, type PeriodoRanking } from '@/domain/ranking'
import { statusJogador } from '@/domain/consultas'
import { alcateiaDo } from '@/domain/motor'
import { AvatarLeao } from '@/components/AvatarLeao'
import { Abas, CabecalhoPagina, Vazio } from '@/components/ui'
import { numero } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

type Aba = 'pessoas' | 'alcateias' | 'unidades' | 'cidades'
const MEDALHA = ['🥇', '🥈', '🥉']

export function Ranking() {
  const u = useUsuario()
  const b = useBanco()
  const [params] = useSearchParams()
  const [aba, setAba] = useState<Aba>((params.get('aba') as Aba) || 'pessoas')
  const [periodo, setPeriodo] = useState<PeriodoRanking>('edicao')
  const [top, setTop] = useState<'5' | '10' | '100'>('10')
  const [recorte, setRecorte] = useState('')
  const minhaAlcateia = alcateiaDo(b, u.id)
  const filtroUnidade = recorte.startsWith('un:') ? recorte.slice(3) : undefined
  const filtroAlcateia = recorte === 'alcateia' ? minhaAlcateia?.id : undefined

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CabecalhoPagina titulo="Ranking" subtitulo="Baseado em XP, nunca em valor doado. Quem preferir aparece como participante anônimo." />
      <Abas
        rotulo="Tipo de ranking"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'pessoas', nome: 'Pessoas' },
          { id: 'alcateias', nome: 'Alcateias' },
          { id: 'unidades', nome: 'Unidades' },
          { id: 'cidades', nome: 'Cidades' },
        ]}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <select className="campo" aria-label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoRanking)}>
          {(Object.keys(t.periodoRanking) as PeriodoRanking[]).map((p) => (
            <option key={p} value={p}>
              {t.periodoRanking[p]}
            </option>
          ))}
        </select>
        {aba === 'pessoas' && (
          <select className="campo" aria-label="Recorte" value={recorte} onChange={(e) => setRecorte(e.target.value)}>
            <option value="">Geral</option>
            {minhaAlcateia && <option value="alcateia">Minha alcateia ({minhaAlcateia.nome})</option>}
            {b.unidades.map((x) => (
              <option key={x.id} value={`un:${x.id}`}>
                {x.nome}
              </option>
            ))}
          </select>
        )}
        {aba === 'pessoas' && (
          <div className="col-span-2 sm:col-span-1">
            <Abas
              rotulo="Quantidade"
              ativa={top}
              aoMudar={setTop}
              abas={[
                { id: '5', nome: 'Top 5' },
                { id: '10', nome: 'Top 10' },
                { id: '100', nome: 'Top 100' },
              ]}
            />
          </div>
        )}
      </div>

      {aba === 'pessoas' && <ListaPessoas linhas={rankingPessoas(b, { periodo, unidadeId: filtroUnidade, alcateiaId: filtroAlcateia })} limite={Number(top)} meuId={u.id} />}
      {aba !== 'pessoas' && <ListaGrupos aba={aba} linhas={aba === 'alcateias' ? rankingAlcateias(b, periodo) : aba === 'unidades' ? rankingUnidades(b, periodo) : rankingCidades(b, periodo)} destaque={aba === 'alcateias' ? minhaAlcateia?.id : aba === 'unidades' ? u.unidadeId : u.municipio} />}
    </div>
  )
}

function Variacao({ v }: { v?: number }) {
  if (v === undefined) return <span className="text-xs font-bold text-rs-azul" title="Novo no ranking">novo</span>
  if (v === 0) return <span className="text-xs text-suave" aria-label="Mesma posição da semana anterior">–</span>
  return (
    <span className={`text-xs font-bold ${v > 0 ? 'text-sucesso' : 'text-alerta'}`} aria-label={`${v > 0 ? 'Subiu' : 'Caiu'} ${Math.abs(v)} posições desde a semana anterior`}>
      {v > 0 ? '▲' : '▼'}
      {Math.abs(v)}
    </span>
  )
}

function ListaPessoas({ linhas, limite, meuId }: { linhas: LinhaRanking[]; limite: number; meuId: string }) {
  const b = useBanco()
  if (!linhas.length) return <Vazio texto="Ainda não há XP neste recorte." variante="dormindo" />
  const podio = linhas.slice(0, 3)
  const visiveis = linhas.slice(0, limite)
  const eu = linhas.find((l) => l.usuarioId === meuId)
  const euFora = eu && !visiveis.includes(eu)
  const nomeDe = (l: LinhaRanking) => (l.anonimo && l.usuarioId !== meuId ? 'Participante anônimo' : l.nome)
  const avatarDe = (id: string) => b.usuarios.find((x) => x.id === id)!

  return (
    <>
      {/* pódio ilustrado */}
      <ol className="grid grid-cols-3 items-end gap-2 pt-4" aria-label="Pódio">
        {[1, 0, 2].map((i) => {
          const l = podio[i]
          if (!l) return <li key={i} />
          const pessoa = avatarDe(l.usuarioId)
          const st = statusJogador(b, l.usuarioId)
          const anonimo = l.anonimo && l.usuarioId !== meuId
          return (
            <li key={l.usuarioId} className="flex flex-col items-center text-center">
              {anonimo ? (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-borda font-titulo text-2xl font-bold text-suave">?</span>
              ) : (
                <AvatarLeao avatar={pessoa.avatar} tamanho={i === 0 ? 84 : 66} estrelas={st.prestigio.estrelas} />
              )}
              <p className="mt-1 line-clamp-2 text-sm font-semibold">{nomeDe(l)}</p>
              <p className="text-xs text-suave">{numero(l.xp)} XP</p>
              <div className={`mt-1 flex w-full items-start justify-center rounded-t-xl pt-2 font-titulo text-2xl font-bold text-white ${i === 0 ? 'h-24 bg-gradient-to-b from-[#C9A227] to-[#9a7a12]' : i === 1 ? 'h-16 bg-gradient-to-b from-[#A9B6C3] to-[#7f8b97]' : 'h-12 bg-gradient-to-b from-[#c08a52] to-[#8f6234]'}`}>
                {i + 1}
              </div>
            </li>
          )
        })}
      </ol>
      <ol className="space-y-2" aria-label="Classificação">
        {visiveis.map((l) => (
          <Linha key={l.usuarioId} l={l} eu={l.usuarioId === meuId} nome={nomeDe(l)} />
        ))}
        {euFora && (
          <>
            <li aria-hidden className="text-center text-suave">
              ⋯
            </li>
            <Linha l={eu} eu nome={nomeDe(eu)} />
          </>
        )}
        {!eu && <li className="text-center text-sm text-suave">Você ainda não pontuou neste recorte.</li>}
      </ol>
    </>
  )
}

function Linha({ l, eu, nome }: { l: LinhaRanking; eu: boolean; nome: string }) {
  const b = useBanco()
  const pessoa = b.usuarios.find((x) => x.id === l.usuarioId)!
  const estilo = b.itens.find((i) => i.id === pessoa.avatar.estilo_ranking)
  const anonimo = l.anonimo && !eu
  return (
    <li
      className={`cartao flex items-center gap-3 py-3 ${eu ? 'border-2 border-rs-azul bg-rs-ciano-claro' : ''}`}
      style={estilo && !anonimo ? { borderColor: estilo.arte.cor, boxShadow: `inset 4px 0 0 ${estilo.arte.cor}` } : undefined}
      aria-current={eu || undefined}
    >
      <span className="w-9 text-center font-titulo text-lg font-bold text-rs-azul">{MEDALHA[l.posicao - 1] ?? `${l.posicao}º`}</span>
      {anonimo ? <span className="flex h-10 w-10 items-center justify-center rounded-full bg-borda font-bold text-suave">?</span> : <AvatarLeao avatar={pessoa.avatar} tamanho={40} />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {nome}
          {eu && <span className="ml-1 text-sm font-bold text-rs-azul">(você{l.anonimo ? ', anônimo para os outros' : ''})</span>}
        </p>
        <p className="truncate text-xs text-suave">{anonimo ? '' : (l.unidade ?? l.municipio)}</p>
      </div>
      <Variacao v={l.variacao} />
      <span className="font-titulo font-bold text-weg-900">{numero(l.xp)} XP</span>
    </li>
  )
}

function ListaGrupos({ aba, linhas, destaque }: { aba: Aba; linhas: LinhaGrupo[]; destaque?: string }) {
  if (!linhas.length) return <Vazio texto="Nada por aqui ainda." variante="dormindo" />
  return (
    <>
      <p className="text-sm text-suave">
        {aba === 'unidades'
          ? 'Pontuação = XP da unidade a cada 100 colaboradores, para não favorecer as maiores.'
          : aba === 'cidades'
            ? 'Pontuação = XP médio por pessoa cadastrada que mora no município.'
            : 'Pontuação = XP médio por membro, para equipes de tamanhos diferentes competirem de igual para igual.'}
      </p>
      <ol className="space-y-2">
        {linhas.map((l) => (
          <li key={l.id} className={`cartao flex items-center gap-3 ${l.id === destaque ? 'border-2 border-rs-azul bg-rs-ciano-claro' : l.posicao === 1 ? 'border-rs-ciano' : ''}`}>
            <span className="w-8 text-center font-titulo text-lg font-bold text-rs-azul">{MEDALHA[l.posicao - 1] ?? `${l.posicao}º`}</span>
            {l.emblema && (
              <span className="text-2xl" aria-hidden>
                {l.emblema}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {l.nome}
                {l.id === destaque && <span className="ml-1 text-sm font-bold text-rs-azul">(sua)</span>}
              </p>
              <p className="text-xs text-suave">
                {l.participantes} {l.participantes === 1 ? 'pessoa pontuou' : 'pessoas pontuaram'} · {numero(l.xp)} XP
              </p>
            </div>
            <span className="font-titulo font-bold text-weg-900">{numero(l.pontuacao)} pts</span>
          </li>
        ))}
      </ol>
    </>
  )
}

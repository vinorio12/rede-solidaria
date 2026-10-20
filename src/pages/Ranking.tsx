import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { rankingCidades, rankingPessoas, rankingUnidades, type LinhaRanking } from '@/domain/ranking'
import { Abas, Avatar, CabecalhoPagina, Vazio } from '@/components/ui'
import { numero } from '@/lib/datas'

type Aba = 'pessoas' | 'unidades' | 'cidades' | 'convidados'

const MEDALHA = ['🥇', '🥈', '🥉']

export function Ranking() {
  const u = useUsuario()
  const b = useBanco()
  const [params] = useSearchParams()
  const [aba, setAba] = useState<Aba>((params.get('aba') as Aba) || 'pessoas')
  const [top, setTop] = useState<'5' | '10' | '100'>('10')
  const [ciclo, setCiclo] = useState<string>(String(b.configuracoes.cicloAtivo))
  const [unidade, setUnidade] = useState('')
  const c = ciclo === 'todos' ? 'todos' : Number(ciclo)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CabecalhoPagina titulo="Ranking" subtitulo="Baseado em XP, nunca em valor doado. Valores individuais não aparecem para ninguém." />
      <Abas
        rotulo="Tipo de ranking"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'pessoas', nome: 'Colaboradores' },
          { id: 'unidades', nome: 'Unidades' },
          { id: 'cidades', nome: 'Cidades' },
          { id: 'convidados', nome: 'Família e Amigos' },
        ]}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <select className="campo" aria-label="Ciclo" value={ciclo} onChange={(e) => setCiclo(e.target.value)}>
          {[...b.ciclos].reverse().map((x) => (
            <option key={x.ano} value={x.ano}>
              {x.rotulo.split(' (')[0]}
            </option>
          ))}
          <option value="todos">Todos os tempos</option>
        </select>
        {aba === 'pessoas' && (
          <select className="campo" aria-label="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)}>
            <option value="">Geral (todas as unidades)</option>
            {b.unidades.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </select>
        )}
        {(aba === 'pessoas' || aba === 'convidados') && (
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

      {(aba === 'pessoas' || aba === 'convidados') && (
        <ListaPessoas linhas={rankingPessoas(b, { ciclo: c, unidadeId: aba === 'pessoas' ? unidade || undefined : undefined, publico: aba === 'convidados' ? 'convidados' : 'colaboradores' })} limite={Number(top)} meuId={u.id} />
      )}

      {(aba === 'unidades' || aba === 'cidades') && (
        <>
          <p className="text-sm text-suave">
            {aba === 'unidades' ? 'Pontuação = XP somado da unidade a cada 100 colaboradores, para não favorecer as unidades maiores.' : 'Pontuação = XP médio por pessoa cadastrada que mora no município.'}
          </p>
          <ol className="space-y-2">
            {(aba === 'unidades' ? rankingUnidades(b, c) : rankingCidades(b, c)).map((l) => (
              <li key={l.id} className={`cartao flex items-center gap-3 ${l.posicao === 1 ? 'border-rs-ciano bg-rs-ciano-claro/50' : ''}`}>
                <span className="w-8 text-center font-titulo text-lg font-bold text-rs-azul">{MEDALHA[l.posicao - 1] ?? `${l.posicao}º`}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{l.nome}</p>
                  <p className="text-xs text-suave">
                    {l.participantes} participantes · {numero(l.xp)} XP
                  </p>
                </div>
                <span className="font-titulo font-bold text-weg-900">{numero(l.pontuacao)} pts</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

function ListaPessoas({ linhas, limite, meuId }: { linhas: LinhaRanking[]; limite: number; meuId: string }) {
  const visiveis = linhas.slice(0, limite)
  const eu = linhas.find((l) => l.usuarioId === meuId)
  const euFora = eu && !visiveis.includes(eu)
  if (!linhas.length) return <Vazio texto="Ainda não há XP neste recorte." variante="dormindo" />
  return (
    <ol className="space-y-2" aria-label="Classificação">
      {visiveis.map((l) => (
        <Linha key={l.usuarioId} l={l} eu={l.usuarioId === meuId} />
      ))}
      {euFora && (
        <>
          <li aria-hidden className="text-center text-suave">
            ⋯
          </li>
          <Linha l={eu} eu />
        </>
      )}
      {!eu && <li className="text-center text-sm text-suave">Você ainda não pontuou neste recorte.</li>}
    </ol>
  )
}

function Linha({ l, eu }: { l: LinhaRanking; eu: boolean }) {
  const nome = l.anonimo && !eu ? 'Participante anônimo' : l.nome
  return (
    <li className={`cartao flex items-center gap-3 py-3 ${eu ? 'border-2 border-rs-azul bg-rs-ciano-claro' : ''}`} aria-current={eu || undefined}>
      <span className="w-9 text-center font-titulo text-lg font-bold text-rs-azul">{MEDALHA[l.posicao - 1] ?? `${l.posicao}º`}</span>
      <Avatar nome={nome} anonimo={l.anonimo && !eu} tamanho={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {nome}
          {eu && <span className="ml-1 text-sm font-bold text-rs-azul">(você{l.anonimo ? ', anônimo para os outros' : ''})</span>}
        </p>
        <p className="truncate text-xs text-suave">{l.anonimo && !eu ? '' : (l.unidade ?? l.municipio)}</p>
      </div>
      <span className="font-titulo font-bold text-weg-900">{numero(l.xp)} XP</span>
    </li>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { registrarVisita } from '@/domain/servicos'
import type { Projeto } from '@/domain/types'
import { Icone } from '@/components/Icone'
import { Abas, CabecalhoPagina, Vazio } from '@/components/ui'
import { avisar, confete } from '@/components/Feedback'
import { moeda, numero } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

export const ODS: Record<number, string> = {
  1: 'Erradicação da pobreza',
  2: 'Fome zero',
  3: 'Saúde e bem-estar',
  4: 'Educação de qualidade',
  5: 'Igualdade de gênero',
  8: 'Trabalho decente',
  10: 'Redução das desigualdades',
  16: 'Paz e justiça',
}

const ORIGEM: Record<Projeto['origem'], { nome: string; cls: string }> = {
  empresa: { nome: 'Recursos da WEG', cls: 'bg-weg-900 text-white' },
  colaboradores: { nome: 'Destinações de colaboradores', cls: 'bg-rs-ciano text-weg-900' },
  ambos: { nome: 'WEG e colaboradores', cls: 'bg-rs-azul text-white' },
}

export function SeloOrigem({ origem }: { origem: Projeto['origem'] }) {
  return <span className={`chip ${ORIGEM[origem].cls}`}>{ORIGEM[origem].nome}</span>
}

export function Projetos() {
  const b = useBanco()
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista')
  const [f, setF] = useState({ municipio: '', fundo: '', ods: '', ano: '' })
  const filtrados = b.projetos.filter(
    (p) =>
      (!f.municipio || p.municipio === f.municipio) &&
      (!f.fundo || p.fundo === f.fundo) &&
      (!f.ods || p.ods.includes(Number(f.ods))) &&
      (!f.ano || p.ano === Number(f.ano)),
  )
  const municipios = [...new Set(b.projetos.map((p) => p.municipio))].sort()
  const anos = [...new Set(b.projetos.map((p) => p.ano))].sort((a, c) => c - a)
  const odsUsados = [...new Set(b.projetos.flatMap((p) => p.ods))].sort((a, c) => a - c)

  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo="Onde o recurso foi aplicado" subtitulo="Projetos que receberam recursos da WEG e destinações de colaboradores reportadas no app." />
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(ORIGEM).map(([k, v]) => (
          <span key={k} className={`chip ${v.cls}`}>
            {v.nome}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <select className="campo" aria-label="Filtrar por município" value={f.municipio} onChange={(e) => setF({ ...f, municipio: e.target.value })}>
          <option value="">Todos os municípios</option>
          {municipios.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select className="campo" aria-label="Filtrar por fundo" value={f.fundo} onChange={(e) => setF({ ...f, fundo: e.target.value })}>
          <option value="">Todos os fundos</option>
          <option value="FIA">{t.fundoCurto.FIA}</option>
          <option value="IDOSO">{t.fundoCurto.IDOSO}</option>
        </select>
        <select className="campo" aria-label="Filtrar por ODS" value={f.ods} onChange={(e) => setF({ ...f, ods: e.target.value })}>
          <option value="">Todos os ODS</option>
          {odsUsados.map((o) => (
            <option key={o} value={o}>
              ODS {o} · {ODS[o] ?? ''}
            </option>
          ))}
        </select>
        <select className="campo" aria-label="Filtrar por ano" value={f.ano} onChange={(e) => setF({ ...f, ano: e.target.value })}>
          <option value="">Todos os anos</option>
          {anos.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <div className="col-span-2 md:col-span-1">
          <Abas
            rotulo="Visualização"
            ativa={vista}
            aoMudar={setVista}
            abas={[
              { id: 'lista', nome: 'Lista' },
              { id: 'mapa', nome: 'Mapa' },
            ]}
          />
        </div>
      </div>

      {!filtrados.length && <Vazio texto={t.vazio.resultados} />}
      {vista === 'lista' ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => (
            <li key={p.id}>
              <CartaoProjeto p={p} />
            </li>
          ))}
        </ul>
      ) : (
        <MapaProjetos projetos={filtrados} />
      )}
    </div>
  )
}

function CartaoProjeto({ p }: { p: Projeto }) {
  return (
    <Link to={`/projetos/${p.id}`} className="cartao flex h-full flex-col gap-2 transition hover:-translate-y-0.5 hover:border-rs-azul">
      <div className="flex flex-wrap items-center gap-1">
        <span className="chip bg-rs-ciano-claro text-weg-900">{t.fundoCurto[p.fundo]}</span>
        <span className="chip bg-fundo text-suave">{p.status === 'concluido' ? 'Concluído' : 'Em execução'}</span>
      </div>
      <h2 className="font-titulo text-lg font-bold text-weg-900">{p.nome}</h2>
      <p className="text-sm text-suave">
        {p.entidade} · {p.municipio}/{p.uf}
      </p>
      <p className="line-clamp-2 text-sm">{p.objetivo}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-sm">
        <span className="font-semibold text-weg-700">{numero(p.beneficiados)} beneficiados</span>
        <SeloOrigem origem={p.origem} />
      </div>
    </Link>
  )
}

/** Mapa esquemático (sem dependência de serviço de mapas): posiciona os projetos pela latitude/longitude. */
function MapaProjetos({ projetos }: { projetos: Projeto[] }) {
  const pts = projetos.filter((p) => p.lat !== undefined && p.lng !== undefined)
  const [sel, setSel] = useState<Projeto | null>(null)
  const limites = useMemo(() => {
    const lats = pts.map((p) => p.lat!)
    const lngs = pts.map((p) => p.lng!)
    return { minLat: Math.min(...lats, -27.1) - 0.05, maxLat: Math.max(...lats, -26.2) + 0.05, minLng: Math.min(...lngs, -49.2) - 0.05, maxLng: Math.max(...lngs, -48.5) + 0.05 }
  }, [pts])
  const W = 600
  const H = 420
  const x = (lng: number) => ((lng - limites.minLng) / (limites.maxLng - limites.minLng)) * W
  const y = (lat: number) => ((limites.maxLat - lat) / (limites.maxLat - limites.minLat)) * H
  const cidades = [...new Map(pts.map((p) => [p.municipio, p])).values()]

  return (
    <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
      <figure className="cartao overflow-hidden p-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full bg-gradient-to-br from-rs-ciano-claro to-white" role="img" aria-label="Mapa esquemático dos projetos no norte de Santa Catarina">
          <path d={`M${W * 0.78} 0 C ${W * 0.74} ${H * 0.3}, ${W * 0.86} ${H * 0.55}, ${W * 0.8} ${H} L ${W} ${H} L ${W} 0 Z`} fill="#00BEDF" opacity="0.18" />
          <text x={W * 0.9} y={H * 0.5} fontSize="14" fill="#095BA7" textAnchor="middle" opacity="0.7">
            Oceano
          </text>
          {cidades.map((c) => (
            <text key={c.municipio} x={x(c.lng!) + 12} y={y(c.lat!) - 14} fontSize="13" fontWeight="700" fill="#00325C">
              {c.municipio}
            </text>
          ))}
          {pts.map((p) => (
            <g key={p.id} transform={`translate(${x(p.lng!)} ${y(p.lat!)})`} className="cursor-pointer" onClick={() => setSel(p)} role="button" aria-label={p.nome} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(p)}>
              <circle r="16" fill="transparent" />
              <path d="M0 0 C -9 -12 -9 -22 0 -22 C 9 -22 9 -12 0 0 Z" fill={p.fundo === 'FIA' ? '#095BA7' : '#00BEDF'} stroke={sel?.id === p.id ? '#00325C' : '#fff'} strokeWidth={sel?.id === p.id ? 3 : 2} />
              <circle cy="-15" r="3.5" fill="#fff" />
            </g>
          ))}
        </svg>
        <figcaption className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs text-suave">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-rs-azul" /> {t.fundoCurto.FIA}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-rs-ciano" /> {t.fundoCurto.IDOSO}
          </span>
          <span>Mapa esquemático. Toque em um marcador para ver o projeto.</span>
        </figcaption>
      </figure>
      <div>
        {sel ? (
          <CartaoProjeto p={sel} />
        ) : (
          <ul className="space-y-2">
            {pts.map((p) => (
              <li key={p.id}>
                <button className="cartao w-full text-left text-sm hover:border-rs-azul" onClick={() => setSel(p)}>
                  <strong>{p.nome}</strong>
                  <span className="block text-suave">{p.municipio}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function DetalheProjeto() {
  const { id } = useParams()
  const u = useUsuario()
  const b = useBanco()
  const p = b.projetos.find((x) => x.id === id)
  const registrado = useRef(false)

  useEffect(() => {
    if (!p || registrado.current) return
    registrado.current = true
    const feitas = registrarVisita(u.id, 'projeto', p.id)
    if (feitas.length) {
      confete()
      avisar(`Missão concluída: ${feitas.map((m) => m.titulo).join(', ')}`)
    }
  }, [p, u.id])

  if (!p) return <Vazio texto="Projeto não encontrado." />
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <CabecalhoPagina titulo={p.nome} voltar="/projetos" subtitulo={`${p.entidade} · ${p.municipio}/${p.uf}`} />
      <div className="flex flex-wrap gap-2">
        <SeloOrigem origem={p.origem} />
        <span className="chip bg-rs-ciano-claro text-weg-900">{t.fundo[p.fundo]}</span>
        <span className="chip bg-fundo text-suave">{p.status === 'concluido' ? 'Concluído' : 'Em execução'}</span>
        <span className="chip bg-fundo text-suave">Nº {p.idExterno}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Numero r="Valor repassado" v={moeda(p.valorRepassado)} />
        <Numero r="Beneficiados" v={numero(p.beneficiados)} />
        <Numero r="Ano do repasse" v={`${String(p.mes).padStart(2, '0')}/${p.ano}`} />
      </div>
      <section className="cartao space-y-2">
        <h2 className="font-titulo font-bold text-weg-900">Objetivo</h2>
        <p>{p.objetivo}</p>
        <h2 className="pt-2 font-titulo font-bold text-weg-900">Descrição</h2>
        <p>{p.descricao}</p>
        <p className="text-sm text-suave">
          Área: {p.area} · Público: {p.publico}
        </p>
      </section>
      <section className="cartao">
        <h2 className="mb-2 font-titulo font-bold text-weg-900">Indicadores de impacto</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {p.indicadores.map((i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl bg-sucesso-claro px-3 py-2 text-sm text-sucesso">
              <Icone nome="check" tamanho={18} /> {i}
            </li>
          ))}
        </ul>
      </section>
      <section className="cartao">
        <h2 className="mb-2 font-titulo font-bold text-weg-900">Objetivos de Desenvolvimento Sustentável</h2>
        <div className="flex flex-wrap gap-2">
          {p.ods.map((o) => (
            <span key={o} className="chip bg-rs-azul py-1 text-white">
              ODS {o} · {ODS[o] ?? ''}
            </span>
          ))}
        </div>
      </section>
      {p.entidadeId && (
        <Link to={`/entidades/${p.entidadeId}`} className="botao-primario w-full sm:w-auto">
          Conhecer a entidade e doar
        </Link>
      )}
    </article>
  )
}

function Numero({ r, v }: { r: string; v: string }) {
  return (
    <div className="cartao p-3">
      <p className="text-xs text-suave">{r}</p>
      <p className="font-titulo text-xl font-bold text-weg-900">{v}</p>
    </div>
  )
}

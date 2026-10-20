import { useId, type ReactNode } from 'react'
import { ARTES_MASCOTE } from '@/assets/mascote'
import type { AvatarConfig, Item } from '@/domain/types'
import { useBanco } from '@/data/useBanco'

// Avatar = leãozinho oficial + camadas de personalização (seção 8.1).
// Cada camada tem um ponto de ancoragem sobre a arte (grade 0–100):
//   cabeca (41,16) · rosto: olhos em (30,32) e (49,34) · pescoco (40,57) · pata (13,74)
// Até a chegada das artes, os acessórios são SVG procedurais nas cores do catálogo.
// Para usar uma arte oficial, preencha `arte.url` do item: ela substitui o desenho.

export const ANCORAS = {
  cabeca: { x: 41, y: 16 },
  rosto: { x: 39.5, y: 33 },
  pescoco: { x: 40, y: 57 },
  pata: { x: 13, y: 74 },
} as const

/** Cor da juba: filtro sobre a arte até existirem camadas separadas da juba. */
const FILTRO_JUBA: Record<string, string> = {
  juba: '',
  '#095BA7': '',
  '#00BEDF': 'hue-rotate(-18deg) saturate(1.5) brightness(1.12)',
  '#00325C': 'brightness(0.62) saturate(1.3)',
  '#A9B6C3': 'grayscale(1) brightness(1.25) contrast(1.05)',
  '#C9A227': 'sepia(1) saturate(2.6) hue-rotate(-12deg) brightness(1.02)',
}

function Fundo({ item, idGrad }: { item?: Item; idGrad: string }) {
  const forma = item?.arte.forma ?? 'gradiente'
  const cor = item?.arte.cor ?? '#095BA7'
  return (
    <g>
      <defs>
        <linearGradient id={idGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D9F6FB" />
          <stop offset="1" stopColor={forma === 'gradiente' ? '#9BD3F0' : cor} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={forma === 'ceu' ? cor : `url(#${idGrad})`} />
      {forma === 'ceu' && [12, 30, 55, 78, 88, 20, 66].map((x, i) => <circle key={i} cx={x} cy={8 + ((i * 17) % 40)} r={0.9} fill="#fff" opacity={0.85} />)}
      {forma === 'serra' && <path d="M0 78 L18 58 L30 68 L48 46 L64 64 L80 52 L100 70 L100 100 L0 100 Z" fill={cor} opacity={0.55} />}
      {forma === 'fabrica' && (
        <g fill={cor} opacity={0.5}>
          <rect x="60" y="62" width="40" height="38" />
          <rect x="66" y="48" width="6" height="16" />
          <rect x="80" y="44" width="6" height="20" />
          <path d="M60 62 L70 56 L70 62 L80 56 L80 62 L90 56 L90 62 Z" />
        </g>
      )}
    </g>
  )
}

/** Desenhos procedurais de cada acessório, posicionados no próprio ponto de ancoragem. */
function Acessorio({ item }: { item: Item }) {
  const c = item.arte.cor
  if (item.arte.url) {
    const a = ANCORAS[item.categoria as keyof typeof ANCORAS] ?? { x: 50, y: 50 }
    return <image href={item.arte.url} x={a.x - 18} y={a.y - 18} width="36" height="36" />
  }
  const { x: cx, y: cy } = ANCORAS.cabeca
  const r = ANCORAS.rosto
  const p = ANCORAS.pescoco
  const pa = ANCORAS.pata
  switch (item.arte.forma) {
    case 'capacete':
      return (
        <g>
          <path d={`M${cx - 17} ${cy + 3} Q${cx} ${cy - 20} ${cx + 17} ${cy + 3} Z`} fill={c} stroke="#00325C" strokeWidth="0.8" />
          <rect x={cx - 21} y={cy + 1.5} width="42" height="4" rx="2" fill={c} stroke="#00325C" strokeWidth="0.8" />
          <rect x={cx - 2} y={cy - 13} width="4" height="15" rx="1.5" fill="#fff" opacity="0.35" />
        </g>
      )
    case 'bone':
      return (
        <g>
          <path d={`M${cx - 15} ${cy + 4} Q${cx - 2} ${cy - 15} ${cx + 15} ${cy + 3} Z`} fill={c} stroke="#00325C" strokeWidth="0.8" />
          <path d={`M${cx - 18} ${cy + 4} Q${cx - 30} ${cy + 6} ${cx - 27} ${cy + 9} L${cx - 10} ${cy + 6} Z`} fill="#00BEDF" stroke="#00325C" strokeWidth="0.8" />
          <text x={cx} y={cy} fontSize="5" fontWeight="bold" fill="#fff" textAnchor="middle" fontFamily="Arial">RS</text>
        </g>
      )
    case 'fones':
      return (
        <g fill="none" stroke={c} strokeWidth="2.6">
          <path d={`M${cx - 19} ${cy + 8} Q${cx} ${cy - 18} ${cx + 23} ${cy + 10}`} />
          <rect x={cx - 23} y={cy + 6} width="7" height="10" rx="3" fill={c} />
          <rect x={cx + 20} y={cy + 8} width="7" height="10" rx="3" fill={c} />
        </g>
      )
    case 'coroa':
      return (
        <g>
          {Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI * (0.15 + (i / 8) * 0.7)
            const x = cx - Math.cos(a) * 18
            const y = cy + 4 - Math.sin(a) * 9
            return <ellipse key={i} cx={x} cy={y} rx="3.4" ry="1.7" transform={`rotate(${(a * 180) / Math.PI - 90} ${x} ${y})`} fill={i % 2 ? c : '#0F7B4F'} stroke="#00325C" strokeWidth="0.4" />
          })}
        </g>
      )
    case 'oculos_protecao':
      return (
        <g>
          <rect x={r.x - 16} y={r.y - 5} width="32" height="10" rx="5" fill={c} opacity="0.55" stroke="#00325C" strokeWidth="1" />
          <path d={`M${r.x - 16} ${r.y} L${r.x - 22} ${r.y - 2} M${r.x + 16} ${r.y + 1} L${r.x + 22} ${r.y - 1}`} stroke="#00325C" strokeWidth="1.4" />
        </g>
      )
    case 'oculos_redondos':
      return (
        <g fill="#ffffff" fillOpacity="0.2" stroke={c} strokeWidth="1.3">
          <circle cx={r.x - 9.5} cy={r.y - 1} r="5.5" />
          <circle cx={r.x + 9.5} cy={r.y + 1} r="5.5" />
          <path d={`M${r.x - 4} ${r.y - 0.5} Q${r.x} ${r.y - 3} ${r.x + 4} ${r.y + 0.5}`} fill="none" />
        </g>
      )
    case 'cachecol':
      return (
        <g>
          <path d={`M${p.x - 15} ${p.y - 3} Q${p.x} ${p.y + 5} ${p.x + 15} ${p.y - 3} L${p.x + 15} ${p.y + 2} Q${p.x} ${p.y + 10} ${p.x - 15} ${p.y + 2} Z`} fill={c} stroke="#00325C" strokeWidth="0.6" />
          <rect x={p.x + 6} y={p.y + 2} width="6" height="14" rx="1.5" fill="#00BEDF" stroke="#00325C" strokeWidth="0.6" />
          <path d={`M${p.x - 12} ${p.y} L${p.x + 12} ${p.y}`} stroke="#00BEDF" strokeWidth="1.2" />
        </g>
      )
    case 'cracha':
      return (
        <g>
          <path d={`M${p.x - 9} ${p.y - 5} L${p.x} ${p.y + 6} L${p.x + 9} ${p.y - 5}`} fill="none" stroke={c} strokeWidth="1.4" />
          <rect x={p.x - 5} y={p.y + 5} width="10" height="12" rx="1.5" fill="#fff" stroke="#00325C" strokeWidth="0.8" />
          <rect x={p.x - 3.5} y={p.y + 7} width="7" height="3" fill={c} />
        </g>
      )
    case 'medalha':
      return (
        <g>
          <path d={`M${p.x - 7} ${p.y - 4} L${p.x - 2} ${p.y + 6} M${p.x + 7} ${p.y - 4} L${p.x + 2} ${p.y + 6}`} stroke="#095BA7" strokeWidth="2.4" />
          <circle cx={p.x} cy={p.y + 10} r="5" fill={c} stroke="#00325C" strokeWidth="0.8" />
          <path d={`M${p.x} ${p.y + 7} l1 2 2 .3 -1.5 1.4 .4 2 -1.9 -1 -1.9 1 .4 -2 -1.5 -1.4 2 -.3z`} fill="#fff" />
        </g>
      )
    case 'capa':
      return <path d={`M${p.x - 18} ${p.y - 2} Q${p.x} ${p.y + 6} ${p.x + 18} ${p.y - 2} L${p.x + 26} ${p.y + 30} L${p.x - 26} ${p.y + 30} Z`} fill={c} opacity="0.85" stroke="#00325C" strokeWidth="0.6" />
    case 'livro':
      return (
        <g transform={`rotate(-12 ${pa.x} ${pa.y})`}>
          <rect x={pa.x - 7} y={pa.y - 13} width="14" height="10" rx="1" fill={c} stroke="#00325C" strokeWidth="0.8" />
          <path d={`M${pa.x} ${pa.y - 13} L${pa.x} ${pa.y - 3}`} stroke="#fff" strokeWidth="0.8" />
        </g>
      )
    case 'coracao':
      return <path d={`M${pa.x} ${pa.y - 4} C${pa.x - 9} ${pa.y - 11} ${pa.x - 6} ${pa.y - 18} ${pa.x} ${pa.y - 13} C${pa.x + 6} ${pa.y - 18} ${pa.x + 9} ${pa.y - 11} ${pa.x} ${pa.y - 4} Z`} fill={c} stroke="#00325C" strokeWidth="0.8" />
    case 'chave':
      return (
        <g transform={`rotate(-35 ${pa.x} ${pa.y - 8})`}>
          <rect x={pa.x - 1.6} y={pa.y - 14} width="3.2" height="14" rx="1" fill={c} stroke="#00325C" strokeWidth="0.6" />
          <path d={`M${pa.x - 4} ${pa.y - 16} a4 4 0 1 0 8 0 l-2 0 l0 2 l-4 0 l0 -2 z`} fill={c} stroke="#00325C" strokeWidth="0.6" />
        </g>
      )
    case 'megafone':
      return (
        <g transform={`rotate(-20 ${pa.x} ${pa.y})`}>
          <path d={`M${pa.x - 4} ${pa.y - 11} L${pa.x + 9} ${pa.y - 17} L${pa.x + 9} ${pa.y - 3} L${pa.x - 4} ${pa.y - 7} Z`} fill={c} stroke="#00325C" strokeWidth="0.7" />
          <rect x={pa.x - 7} y={pa.y - 11} width="3" height="4" fill="#00325C" />
        </g>
      )
    case 'mapa':
      return <path d={`M${pa.x - 8} ${pa.y - 15} l5 -2 5 2 5 -2 v11 l-5 2 -5 -2 -5 2 z`} fill="#D9F6FB" stroke={c} strokeWidth="1" />
    case 'lupa':
      return (
        <g>
          <circle cx={pa.x + 2} cy={pa.y - 12} r="5" fill="#fff" fillOpacity="0.3" stroke={c} strokeWidth="1.6" />
          <path d={`M${pa.x - 1.5} ${pa.y - 8.5} L${pa.x - 5} ${pa.y - 4}`} stroke={c} strokeWidth="2.2" />
        </g>
      )
    default:
      return null
  }
}

function Moldura({ item, estrelas }: { item?: Item; estrelas: number }) {
  if (!item && !estrelas) return null
  const cor = item?.arte.cor ?? '#C9A227'
  const forma = item?.arte.forma ?? 'estrelas'
  return (
    <g pointerEvents="none">
      <circle cx="50" cy="50" r="48" fill="none" stroke={cor} strokeWidth={forma === 'anel' ? 3 : 4} />
      {forma === 'escudo' && <circle cx="50" cy="50" r="44" fill="none" stroke={cor} strokeWidth="1" strokeDasharray="3 2" />}
      {(forma === 'estrelas' || estrelas > 0) &&
        Array.from({ length: Math.max(1, Math.min(10, estrelas || 5)) }).map((_, i, arr) => {
          const a = Math.PI * (1.15 + (i / Math.max(1, arr.length - 1)) * 0.7)
          const x = 50 + Math.cos(a) * 48
          const y = 50 - Math.sin(a) * -48
          return <path key={i} transform={`translate(${x} ${y}) scale(0.9)`} d="M0 -4 L1.2 -1.2 4 -1.2 1.8 0.6 2.6 3.6 0 1.8 -2.6 3.6 -1.8 0.6 -4 -1.2 -1.2 -1.2Z" fill="#C9A227" stroke="#7A5E0F" strokeWidth="0.4" />
        })}
    </g>
  )
}

export function AvatarLeao({
  avatar,
  tamanho = 96,
  estrelas = 0,
  rotulo,
  className = '',
  extra,
}: {
  avatar: AvatarConfig
  tamanho?: number
  estrelas?: number
  rotulo?: string
  className?: string
  extra?: ReactNode
}) {
  const b = useBanco()
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const item = (id?: string) => (id ? b.itens.find((i) => i.id === id) : undefined)
  const juba = item(avatar.juba)
  const camadas = (['pescoco', 'cabeca', 'rosto', 'pata'] as const).map((c) => item(avatar[c])).filter((i): i is Item => !!i)
  const capa = camadas.find((i) => i.arte.forma === 'capa')
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: tamanho, height: tamanho }} role={rotulo ? 'img' : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : true}>
      <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} className="absolute inset-0">
        <defs>
          <clipPath id={`circ-${id}`}>
            <circle cx="50" cy="50" r="48" />
          </clipPath>
        </defs>
        <g clipPath={`url(#circ-${id})`}>
          <Fundo item={item(avatar.fundo)} idGrad={`grad-${id}`} />
          {capa && <Acessorio item={capa} />}
          <image href={ARTES_MASCOTE.neutro} x="4" y="6" width="92" height="92" style={{ filter: FILTRO_JUBA[juba?.arte.cor ?? 'juba'] || undefined }} />
          <g transform="translate(4 6) scale(0.92)">
            {camadas.filter((i) => i !== capa).map((i) => (
              <Acessorio key={i.id} item={i} />
            ))}
          </g>
        </g>
        <Moldura item={item(avatar.moldura)} estrelas={estrelas} />
      </svg>
      {extra}
    </span>
  )
}

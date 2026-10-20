import { useState } from 'react'

// Gráficos simples em SVG/HTML para o painel administrativo: uma série por gráfico,
// sem legenda (o título nomeia a série), rótulos diretos e tooltip ao passar o mouse.

export interface Ponto {
  rotulo: string
  valor: number
  detalhe?: string
}

export function BarrasHorizontais({ titulo, pontos, formatar = String }: { titulo: string; pontos: Ponto[]; formatar?: (v: number) => string }) {
  const max = Math.max(1, ...pontos.map((p) => p.valor))
  return (
    <figure className="space-y-2" aria-label={titulo}>
      <ul className="space-y-2">
        {pontos.map((p) => (
          <li key={p.rotulo} className="group" title={`${p.rotulo}: ${formatar(p.valor)}${p.detalhe ? ` · ${p.detalhe}` : ''}`}>
            <div className="mb-0.5 flex justify-between gap-2 text-sm">
              <span className="truncate text-texto">{p.rotulo}</span>
              <span className="shrink-0 font-semibold text-texto">{formatar(p.valor)}</span>
            </div>
            <div className="h-3 w-full rounded-r bg-rs-ciano-claro/60">
              <div className="h-full rounded-r-[4px] bg-rs-azul transition group-hover:bg-weg-700" style={{ width: `${(p.valor / max) * 100}%` }} />
            </div>
            {p.detalhe && <p className="text-xs text-suave">{p.detalhe}</p>}
          </li>
        ))}
      </ul>
    </figure>
  )
}

/** Linha acumulada com meta de referência e cursor que mostra o valor da semana. */
export function LinhaAcumulada({ pontos, meta, formatar }: { pontos: Ponto[]; meta: number; formatar: (v: number) => string }) {
  const [ativo, setAtivo] = useState<number | null>(null)
  const W = 640
  const H = 240
  const m = { t: 16, r: 16, b: 28, l: 16 }
  const max = Math.max(meta, ...pontos.map((p) => p.valor)) * 1.05 || 1
  const x = (i: number) => m.l + (pontos.length <= 1 ? 0 : (i / (pontos.length - 1)) * (W - m.l - m.r))
  const y = (v: number) => H - m.b - (v / max) * (H - m.t - m.b)
  const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.valor)}`).join(' ')
  const area = `${d} L${x(pontos.length - 1)} ${H - m.b} L${x(0)} ${H - m.b} Z`
  const p = ativo !== null ? pontos[ativo] : pontos[pontos.length - 1]
  const ia = ativo ?? pontos.length - 1

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Evolução acumulada: ${p ? formatar(p.valor) : ''} de ${formatar(meta)}`}
        onMouseLeave={() => setAtivo(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const rel = ((e.clientX - r.left) / r.width) * W
          const i = Math.round(((rel - m.l) / (W - m.l - m.r)) * (pontos.length - 1))
          setAtivo(Math.max(0, Math.min(pontos.length - 1, i)))
        }}
      >
        <line x1={m.l} x2={W - m.r} y1={y(meta)} y2={y(meta)} stroke="#4a5d73" strokeDasharray="4 4" strokeWidth="1" />
        <text x={W - m.r} y={y(meta) - 6} textAnchor="end" fontSize="12" fill="#4a5d73">
          Meta {formatar(meta)}
        </text>
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="#d6e2ee" />
        <path d={area} fill="#095BA7" opacity="0.1" />
        <path d={d} fill="none" stroke="#095BA7" strokeWidth="2" strokeLinejoin="round" />
        {p && (
          <>
            <line x1={x(ia)} x2={x(ia)} y1={m.t} y2={H - m.b} stroke="#4a5d73" strokeWidth="1" opacity="0.4" />
            <circle cx={x(ia)} cy={y(p.valor)} r="5" fill="#095BA7" stroke="#fff" strokeWidth="2" />
          </>
        )}
        {pontos.map((pt, i) =>
          i === 0 || i === pontos.length - 1 ? (
            <text key={pt.rotulo} x={x(i)} y={H - 8} fontSize="12" fill="#4a5d73" textAnchor={i === 0 ? 'start' : 'end'}>
              {pt.rotulo}
            </text>
          ) : null,
        )}
      </svg>
      {p && (
        <figcaption className="mt-1 text-sm text-texto">
          <strong>{p.rotulo}</strong>: {formatar(p.valor)} acumulados
        </figcaption>
      )}
    </figure>
  )
}

export function Tabela({ colunas, linhas }: { colunas: string[]; linhas: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-borda text-suave">
            {colunas.map((c) => (
              <th key={c} className="px-2 py-2 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-b border-borda/60 last:border-0">
              {l.map((c, j) => (
                <td key={j} className="px-2 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

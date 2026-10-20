import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSessao } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import * as C from '@/domain/consultas'
import { COR_RARIDADE } from '@/domain/jogo'
import type { Raridade } from '@/domain/types'
import { t } from '@/i18n/pt-BR'
import { numero } from '@/lib/datas'
import { AvatarLeao } from './AvatarLeao'
import { Mascote } from './Mascote'
import { confete } from './Feedback'

// Elementos de "sensação de jogo" (seção 8.8).

export function SeloRaridade({ raridade, className = '' }: { raridade: Raridade; className?: string }) {
  const cor = COR_RARIDADE[raridade]
  return (
    <span className={`chip border ${className}`} style={{ borderColor: cor, color: raridade === 'comum' ? '#4a5d73' : cor, background: `${cor}1A` }}>
      {t.raridade[raridade]}
    </span>
  )
}

/** Anel de progresso (missões, trilha, insígnias). */
export function AnelProgresso({ fracao, tamanho = 48, espessura = 5, cor = '#00BEDF', children, rotulo }: { fracao: number; tamanho?: number; espessura?: number; cor?: string; children?: ReactNode; rotulo?: string }) {
  const r = (tamanho - espessura) / 2
  const circ = 2 * Math.PI * r
  const f = Math.max(0, Math.min(1, fracao))
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: tamanho, height: tamanho }} role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f * 100)}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth={espessura} />
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - f)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  )
}

export function IconePatinha({ tamanho = 16, className = '' }: { tamanho?: number; className?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <ellipse cx="12" cy="16" rx="5.5" ry="4.5" />
      <ellipse cx="5.5" cy="10" rx="2.2" ry="2.8" />
      <ellipse cx="9.5" cy="6" rx="2.2" ry="2.8" />
      <ellipse cx="14.5" cy="6" rx="2.2" ry="2.8" />
      <ellipse cx="18.5" cy="10" rx="2.2" ry="2.8" />
    </svg>
  )
}

export function Patinhas({ valor, className = '' }: { valor: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-titulo font-bold ${className}`}>
      <IconePatinha /> {numero(valor)}
      <span className="sr-only">Patinhas</span>
    </span>
  )
}

/** Radar de impacto (5 atributos de 0 a 100), com tabela acessível. */
const MARGEM = 48 // espaço lateral para os rótulos não serem cortados

export function Radar({ dados, tamanho = 240 }: { dados: { atributo: string; valor: number }[]; tamanho?: number }) {
  const c = tamanho / 2
  const R = c - 34
  const ponto = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / dados.length
    return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)] as const
  }
  const poligono = dados.map((d, i) => ponto(i, d.valor).join(',')).join(' ')
  return (
    <figure>
      <svg viewBox={`${-MARGEM} 0 ${tamanho + 2 * MARGEM} ${tamanho}`} width="100%" style={{ maxWidth: tamanho + 2 * MARGEM }} role="img" aria-label={`Radar de impacto: ${dados.map((d) => `${d.atributo} ${d.valor}`).join(', ')}`} className="mx-auto block">
        {[25, 50, 75, 100].map((n) => (
          <polygon key={n} points={dados.map((_, i) => ponto(i, n).join(',')).join(' ')} fill="none" stroke="currentColor" strokeOpacity="0.15" />
        ))}
        {dados.map((_, i) => {
          const [x, y] = ponto(i, 100)
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="currentColor" strokeOpacity="0.15" />
        })}
        <polygon points={poligono} fill="#00BEDF" fillOpacity="0.3" stroke="#095BA7" strokeWidth="2" />
        {dados.map((d, i) => {
          const [x, y] = ponto(i, d.valor)
          const [lx, ly] = ponto(i, 118)
          const ancora = Math.abs(lx - c) < 4 ? 'middle' : lx > c ? 'start' : 'end'
          return (
            <g key={d.atributo}>
              <circle cx={x} cy={y} r="4" fill="#095BA7" stroke="#fff" strokeWidth="2" />
              <text x={lx} y={ly} textAnchor={ancora} dominantBaseline="middle" fontSize="11" fontWeight="700" fill="currentColor">
                {d.atributo}
              </text>
            </g>
          )
        })}
      </svg>
      <table className="sr-only">
        <tbody>
          {dados.map((d) => (
            <tr key={d.atributo}>
              <th>{d.atributo}</th>
              <td>{d.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function vibrar() {
  try {
    navigator.vibrate?.(35)
  } catch {
    /* sem suporte */
  }
}

let audio: AudioContext | null = null
function tocar(frequencia = 660) {
  try {
    audio ??= new AudioContext()
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.frequency.value = frequencia
    g.gain.setValueAtTime(0.06, audio.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.25)
    o.connect(g).connect(audio.destination)
    o.start()
    o.stop(audio.currentTime + 0.26)
  } catch {
    /* sem áudio */
  }
}

/**
 * Observa XP e Patinhas do usuário logado e mostra "+20 XP · +10 Patinhas"
 * após cada ação; na subida de nível, abre a celebração em tela cheia.
 */
export function CamadaJogo() {
  const { usuario } = useSessao()
  const b = useBanco()
  const uid = usuario?.id
  const xp = uid ? C.xpTotal(b, uid) : 0
  const pt = uid ? C.saldoPatinhas(b, uid) : 0
  const nivel = uid ? C.nivelDe(xp, b.niveis).atual.nivel : 0
  const anterior = useRef<{ uid?: string; xp: number; pt: number; nivel: number } | null>(null)
  const [ganhos, setGanhos] = useState<{ id: number; xp: number; pt: number }[]>([])
  const [subiu, setSubiu] = useState<number | null>(null)

  useEffect(() => {
    const a = anterior.current
    anterior.current = { uid, xp, pt, nivel }
    if (!a || a.uid !== uid || !uid) return
    const dXp = xp - a.xp
    const dPt = pt - a.pt
    if (dXp > 0 || dPt > 0) {
      const id = Date.now()
      setGanhos((g) => [...g.slice(-2), { id, xp: Math.max(0, dXp), pt: Math.max(0, dPt) }])
      setTimeout(() => setGanhos((g) => g.filter((x) => x.id !== id)), 2600)
      vibrar()
      if (usuario?.sons) tocar(dXp >= 100 ? 880 : 660)
    }
    if (nivel > a.nivel) {
      setSubiu(nivel)
      if (usuario?.sons) tocar(990)
    }
  }, [uid, xp, pt, nivel, usuario?.sons])

  useEffect(() => {
    if (subiu) confete()
  }, [subiu])

  if (!usuario) return null
  const st = subiu ? C.statusJogador(b, usuario.id) : null
  const nivelObj = subiu ? b.niveis.find((n) => n.nivel === subiu) : null
  const desbloqueados = subiu ? b.itens.filter((i) => i.requisito?.nivel === subiu) : []
  return (
    <>
      <div aria-live="polite" className="pointer-events-none fixed bottom-24 right-4 z-[58] flex flex-col items-end gap-2 md:bottom-6">
        {ganhos.map((g) => (
          <div key={g.id} className="animate-[subir_2.6s_ease-out_forwards] rounded-full bg-weg-900/95 px-4 py-2 font-titulo text-sm font-bold text-white shadow-lg">
            {g.xp > 0 && <span className="text-rs-ciano">+{numero(g.xp)} XP</span>}
            {g.xp > 0 && g.pt > 0 && <span className="mx-1 opacity-60">·</span>}
            {g.pt > 0 && (
              <span className="inline-flex items-center gap-1 text-[#F5D67A]">
                +{numero(g.pt)} <IconePatinha tamanho={14} /> Patinhas
              </span>
            )}
          </div>
        ))}
      </div>
      {subiu && st && nivelObj && (
        <div role="dialog" aria-modal="true" aria-label={`Você chegou ao nível ${subiu}`} className="fixed inset-0 z-[65] flex items-center justify-center bg-gradient-to-b from-weg-900/95 to-rs-azul/95 p-6 text-center text-white">
          <div className="flex max-w-md flex-col items-center gap-3">
            <p className="font-titulo text-sm font-bold uppercase tracking-[0.3em] text-rs-ciano">Subiu de nível</p>
            <AvatarLeao avatar={usuario.avatar} tamanho={150} estrelas={st.prestigio.estrelas} rotulo="Seu avatar" />
            <p className="font-titulo text-6xl font-bold">{subiu}</p>
            <h2 className="font-titulo text-2xl font-bold">{C.flexionar(nivelObj.titulo, usuario.genero)}</h2>
            <p className="text-white/85">{st.tierNome}</p>
            <p className="rounded-full bg-white/10 px-4 py-1 text-sm">+{b.configuracoes.patinhas.porTier * nivelObj.tier} Patinhas</p>
            {desbloqueados.length > 0 && <p className="text-sm text-white/85">Desbloqueou: {desbloqueados.map((i) => i.nome).join(', ')}</p>}
            <div className="flex gap-2 pt-2">
              <button className="botao bg-white text-weg-900" onClick={() => setSubiu(null)} autoFocus>
                Continuar
              </button>
            </div>
          </div>
          <Mascote variante="comemorando" tamanho={90} className="absolute bottom-6 left-6 hidden sm:inline-block" decorativo />
        </div>
      )}
    </>
  )
}

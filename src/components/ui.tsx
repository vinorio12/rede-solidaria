import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Mascote } from './Mascote'
import { Icone } from './Icone'
import type { VarianteMascote } from '@/assets/mascote'
import type { StatusReporte } from '@/domain/types'
import { t } from '@/i18n/pt-BR'

export function BarraProgresso({ valor, max = 1, rotulo, cor = 'ciano', altura = 'h-3' }: { valor: number; max?: number; rotulo: string; cor?: 'ciano' | 'azul' | 'branca'; altura?: string }) {
  const pct = Math.max(0, Math.min(100, max ? (valor / max) * 100 : 0))
  const fundo = cor === 'branca' ? 'bg-white/25' : 'bg-rs-ciano-claro'
  const barra = cor === 'azul' ? 'bg-rs-azul' : cor === 'branca' ? 'bg-rs-ciano' : 'bg-gradient-to-r from-rs-azul to-rs-ciano'
  return (
    <div role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} className={`w-full overflow-hidden rounded-full ${fundo} ${altura}`}>
      <div className={`h-full rounded-full ${barra} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
    </div>
  )
}

const CORES_STATUS: Record<StatusReporte, string> = {
  aguardando_padrinho: 'bg-alerta-claro text-alerta',
  enviado: 'bg-rs-ciano-claro text-weg-900',
  em_validacao: 'bg-rs-ciano-claro text-weg-700',
  validado: 'bg-sucesso-claro text-sucesso',
  devolvido: 'bg-alerta-claro text-alerta',
  recusado_padrinho: 'bg-alerta-claro text-alerta',
  estornado: 'bg-slate-200 text-slate-700',
}

export function ChipStatus({ status }: { status: StatusReporte }) {
  return <span className={`chip ${CORES_STATUS[status]}`}>{t.status[status]}</span>
}

export function CabecalhoPagina({ titulo, subtitulo, voltar, acao }: { titulo: string; subtitulo?: ReactNode; voltar?: string; acao?: ReactNode }) {
  return (
    <header className="mb-4 flex items-start gap-3">
      {voltar && (
        <Link to={voltar} className="botao-fantasma -ml-2 px-2" aria-label={t.acoes.voltar}>
          <Icone nome="voltar" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="titulo-pagina">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-suave">{subtitulo}</p>}
      </div>
      {acao}
    </header>
  )
}

export function Vazio({ texto, variante = 'pensando', children }: { texto: string; variante?: VarianteMascote; children?: ReactNode }) {
  return (
    <div className="cartao flex flex-col items-center gap-3 py-8 text-center">
      <Mascote variante={variante} tamanho={110} />
      <p className="max-w-sm text-suave">{texto}</p>
      {children}
    </div>
  )
}

export function Modal({ aberto, aoFechar, titulo, children, largura = 'max-w-lg' }: { aberto: boolean; aoFechar: () => void; titulo: string; children: ReactNode; largura?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (aberto && !d.open) d.showModal?.()
    if (!aberto && d.open) d.close?.()
  }, [aberto])
  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      className={`m-auto w-[calc(100%-1.5rem)] ${largura} rounded-2xl border border-borda bg-superficie p-0 text-texto shadow-2xl backdrop:bg-weg-900/50`}
      aria-label={titulo}
    >
      {aberto && (
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="font-titulo text-xl font-bold text-weg-900">{titulo}</h2>
            <button className="botao-fantasma -mr-2 -mt-1 px-2" onClick={aoFechar} aria-label={t.acoes.fechar}>
              <Icone nome="fechar" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'alerta' | 'sucesso'; children: ReactNode }) {
  const cls = { info: 'bg-rs-ciano-claro text-weg-900', alerta: 'bg-alerta-claro text-alerta', sucesso: 'bg-sucesso-claro text-sucesso' }[tipo]
  return (
    <div role={tipo === 'alerta' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${cls}`}>
      <Icone nome={tipo === 'alerta' ? 'alerta' : tipo === 'sucesso' ? 'check' : 'info'} tamanho={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function Abas<T extends string>({ abas, ativa, aoMudar, rotulo }: { abas: { id: T; nome: string }[]; ativa: T; aoMudar: (id: T) => void; rotulo: string }) {
  return (
    <div role="tablist" aria-label={rotulo} className="flex gap-1 overflow-x-auto rounded-xl bg-rs-ciano-claro p-1">
      {abas.map((a) => (
        <button
          key={a.id}
          role="tab"
          aria-selected={ativa === a.id}
          onClick={() => aoMudar(a.id)}
          className={`min-h-11 flex-1 whitespace-nowrap rounded-lg px-3 font-titulo text-sm font-bold transition ${ativa === a.id ? 'bg-superficie text-rs-azul shadow' : 'text-weg-900/70 hover:text-weg-900'}`}
        >
          {a.nome}
        </button>
      ))}
    </div>
  )
}

export function Avatar({ nome, moldura, tamanho = 44, anonimo = false }: { nome: string; moldura?: string; tamanho?: number; anonimo?: boolean }) {
  const iniciais = anonimo
    ? '?'
    : nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
  const anel =
    moldura === 'rc_moldura_ciano'
      ? 'ring-4 ring-rs-ciano'
      : moldura === 'rc_moldura_escudo'
        ? 'ring-4 ring-weg-700 ring-offset-2'
        : 'ring-2 ring-white/60'
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rs-azul to-weg-900 font-titulo font-bold text-white ${anel}`}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.36 }}
    >
      {iniciais}
    </span>
  )
}

export function Campo({ rotulo, children, ajuda, id }: { rotulo: string; children: ReactNode; ajuda?: string; id?: string }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="rotulo">{rotulo}</span>
      {children}
      {ajuda && <span className="mt-1 block text-xs text-suave">{ajuda}</span>}
    </label>
  )
}

import { ARTES_MASCOTE, type VarianteMascote } from '@/assets/mascote'

// Componente único do mascote (seção 4): toda a interface usa <Mascote />,
// então trocar a arte é feito só em src/assets/mascote/.

const DESCRICOES: Record<VarianteMascote, string> = {
  neutro: 'Leãozinho azul da Rede Solidária',
  comemorando: 'Leãozinho azul da Rede Solidária comemorando',
  apontando: 'Leãozinho azul da Rede Solidária apontando para o conteúdo',
  pensando: 'Leãozinho azul da Rede Solidária pensativo',
  acenando: 'Leãozinho azul da Rede Solidária acenando',
  dormindo: 'Leãozinho azul da Rede Solidária descansando',
}

const ANIMACAO: Partial<Record<VarianteMascote, string>> = {
  comemorando: 'anima-pulo',
  acenando: 'anima-aceno',
}

export function Mascote({
  variante = 'neutro',
  tamanho = 120,
  className = '',
  decorativo = false,
}: {
  variante?: VarianteMascote
  tamanho?: number
  className?: string
  decorativo?: boolean
}) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: tamanho, height: tamanho }}>
      <img
        src={ARTES_MASCOTE[variante]}
        alt={decorativo ? '' : DESCRICOES[variante]}
        aria-hidden={decorativo || undefined}
        width={tamanho}
        height={tamanho}
        className={`h-full w-full select-none object-contain ${ANIMACAO[variante] ?? ''} ${variante === 'apontando' ? '-scale-x-100' : ''} ${variante === 'dormindo' ? 'opacity-80 grayscale-[30%]' : ''}`}
        draggable={false}
      />
      {variante === 'pensando' && (
        <span aria-hidden className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white font-titulo text-lg font-bold text-rs-azul shadow">
          ?
        </span>
      )}
      {variante === 'comemorando' && (
        <span aria-hidden className="absolute -right-1 top-0 text-xl">
          ✨
        </span>
      )}
      {variante === 'dormindo' && (
        <span aria-hidden className="absolute right-0 top-0 font-titulo text-sm font-bold text-rs-azul">
          z z
        </span>
      )}
    </span>
  )
}

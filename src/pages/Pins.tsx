import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco, useEstavel } from '@/data/useBanco'
import type { Pin } from '@/domain/types'
import { CabecalhoPagina } from '@/components/ui'
import { LimiteErro } from '@/components/LimiteErro'
import { Mascote } from '@/components/Mascote'
import { Icone } from '@/components/Icone'
import { confete } from '@/components/Feedback'
import { registrar } from '@/domain/servicos'
import { arteDoPin, suportaWebGL, urlFace } from '@/lib/pinArte'
import { data } from '@/lib/datas'
import { lazyComNovaTentativa } from '@/lib/carregar'

const PinViewer3D = lazyComNovaTentativa(() => import('@/components/PinViewer3D').then((m) => m.default))
const CHAVE_VISTOS = 'rede-solidaria:pins-vistos'

function lerVistos(uid: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(`${CHAVE_VISTOS}:${uid}`) ?? '[]')
  } catch {
    return []
  }
}

function useFace(pin: Pin) {
  const [url, setUrl] = useState<string>(() => arteDoPin(pin)?.frente ?? '')
  useEffect(() => {
    let vivo = true
    urlFace(pin).then((u) => vivo && setUrl(u))
    return () => {
      vivo = false
    }
  }, [pin])
  return url
}

export function Pins() {
  const u = useUsuario()
  const b = useBanco()
  const [params, setParams] = useSearchParams()
  const meus = b.usuarioPins.filter((p) => p.usuarioId === u.id)
  const pins = [...b.pins].sort((a, c) => c.ano - a.ano)
  const anoSel = Number(params.get('ano')) || pins.find((p) => p.arte)?.ano || pins[0]?.ano
  const pin = useEstavel(pins.find((p) => p.ano === anoSel) ?? pins[0])
  const conquistado = useEstavel(meus.find((p) => p.ano === pin?.ano))
  const [webgl, setWebgl] = useState(suportaWebGL)

  const anoVisto = pin && conquistado ? pin.ano : null
  useEffect(() => {
    if (anoVisto) registrar(u.id, 'pin_visualizado', { ref: String(anoVisto) }, `pin:${anoVisto}`)
  }, [anoVisto, u.id])

  // brilho na primeira vez que o usuário vê um pin recém-desbloqueado
  const [brilho, setBrilho] = useState(false)
  useEffect(() => {
    if (!pin || !conquistado) return
    const vistos = lerVistos(u.id)
    if (vistos.includes(pin.ano)) return
    const recente = Date.now() - new Date(conquistado.em).getTime() < 1000 * 60 * 60 * 24 * 30
    try {
      localStorage.setItem(`${CHAVE_VISTOS}:${u.id}`, JSON.stringify([...vistos, pin.ano]))
    } catch {
      /* sem armazenamento: o brilho aparece de novo na próxima visita */
    }
    if (recente) {
      setBrilho(true)
      confete()
      const t = setTimeout(() => setBrilho(false), 2500)
      return () => clearTimeout(t)
    }
  }, [pin, conquistado, u.id])

  if (!pin) return null

  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Coleção de pins" subtitulo={`Um pin por edição desde 2011. Você tem ${meus.length} de ${pins.length}.`} />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-weg-900 to-[#04213d] text-white" aria-labelledby="pin-titulo">
          <div className="aspect-square max-h-[460px] w-full">
            {webgl ? (
              // qualquer falha do 3D (WebGL, download do módulo) cai para a imagem 2D, sem derrubar a página
              <LimiteErro chave={String(pin.ano)} alternativa={<PinFallback pin={pin} bloqueado={!conquistado} />}>
                <Suspense fallback={<PinFallback pin={pin} bloqueado={!conquistado} />}>
                  <PinViewer3D pin={pin} bloqueado={!conquistado} brilho={brilho} modeloGlb={pin.modeloGlb} aoFalhar={() => setWebgl(false)} />
                </Suspense>
              </LimiteErro>
            ) : (
              <PinFallback pin={pin} bloqueado={!conquistado} />
            )}
          </div>
          <div className="space-y-2 p-5 pt-0">
            <div className="flex items-center gap-2">
              <h2 id="pin-titulo" className="font-titulo text-2xl font-bold">
                {pin.titulo}
              </h2>
              {conquistado ? <span className="chip bg-rs-ciano text-weg-900">Conquistado</span> : <span className="chip bg-white/15 text-white">Não conquistado</span>}
              {pin.arte && <span className="chip bg-white text-weg-900">Arte oficial</span>}
            </div>
            <p className="text-white/85">{pin.descricao}</p>
            <p className="text-sm text-white/70">
              {conquistado
                ? `Na sua coleção desde ${data(conquistado.em)}.`
                : pin.ano === b.configuracoes.cicloAtivo
                  ? 'Desbloqueie com a sua primeira destinação validada nesta edição.'
                  : 'Este pin é de uma edição encerrada.'}
            </p>
            {webgl && <p className="text-xs text-white/60">Arraste para girar o pin.</p>}
          </div>
        </section>

        <section aria-label="Pins por ano">
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {pins.map((p) => {
              const tem = meus.some((m) => m.ano === p.ano)
              return (
                <li key={p.ano}>
                  <button
                    onClick={() => setParams({ ano: String(p.ano) })}
                    aria-pressed={p.ano === pin.ano}
                    aria-label={`Pin ${p.ano}${tem ? ', conquistado' : ', não conquistado'}`}
                    className={`flex w-full flex-col items-center gap-1 rounded-2xl border p-2 transition ${p.ano === pin.ano ? 'border-rs-azul bg-rs-ciano-claro' : 'border-borda bg-superficie hover:border-rs-azul/60'}`}
                  >
                    <Miniatura pin={p} bloqueado={!tem} />
                    <span className="font-titulo text-sm font-bold">{p.ano}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {meus.length === 0 && (
            <div className="mt-4 flex items-center gap-3 text-sm text-suave">
              <Mascote variante="apontando" tamanho={56} />
              Reporte sua destinação para conquistar o primeiro pin.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Miniatura({ pin, bloqueado }: { pin: Pin; bloqueado: boolean }) {
  const url = useFace(pin)
  return (
    <span className="relative block aspect-square w-full">
      {url && (
        <img
          src={url}
          alt=""
          loading="lazy"
          className={`h-full w-full rounded-full object-cover shadow ${bloqueado ? '[filter:brightness(0.35)_grayscale(1)]' : ''}`}
        />
      )}
      {bloqueado && (
        <span className="absolute inset-0 flex items-center justify-center text-white/80">
          <Icone nome="cadeado" tamanho={20} />
        </span>
      )}
    </span>
  )
}

/** Fallback 2D sem WebGL: imagem com giro e brilho em CSS. */
function PinFallback({ pin, bloqueado }: { pin: Pin; bloqueado: boolean }) {
  const url = useFace(pin)
  return (
    <div className="flex h-full w-full items-center justify-center [perspective:900px]">
      <div className="relative aspect-square w-3/5 [animation:girar-pin_9s_linear_infinite] [transform-style:preserve-3d]">
        {url && <img src={url} alt={`Pin ${pin.ano}`} className={`h-full w-full rounded-full object-cover shadow-2xl ring-4 ring-slate-300 ${bloqueado ? '[filter:brightness(0.3)_grayscale(1)]' : ''}`} />}
        {!bloqueado && (
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute -inset-y-4 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent [animation:brilho_3s_ease-in-out_infinite]" />
          </span>
        )}
      </div>
    </div>
  )
}

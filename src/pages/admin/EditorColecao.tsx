import { useState } from 'react'
import { Icone } from '@/components/Icone'
import { Campo, Modal } from '@/components/ui'

// Editor genérico de cadastros do painel (lista + formulário em modal).

export interface CampoDef {
  chave: string
  rotulo: string
  tipo?: 'texto' | 'numero' | 'data' | 'select' | 'booleano' | 'lista-numeros' | 'lista-texto' | 'area'
  opcoes?: { valor: string; nome: string }[]
  opcional?: boolean
}

type Item = Record<string, unknown>

export function EditorColecao<T extends object>({
  itens,
  campos,
  chave,
  colunas,
  novo,
  aoSalvar,
  aoRemover,
  titulo,
}: {
  itens: T[]
  campos: CampoDef[]
  chave: string
  colunas: { rotulo: string; valor: (i: T) => string }[]
  novo: () => T
  aoSalvar: (i: T) => void
  aoRemover?: (i: T) => void
  titulo: string
}) {
  const [edicao, setEdicao] = useState<Item | null>(null)
  const [nova, setNova] = useState(false)
  const [busca, setBusca] = useState('')
  const filtrados = itens.filter((i) => !busca || colunas.some((c) => c.valor(i).toLowerCase().includes(busca.toLowerCase())))

  const valorCampo = (c: CampoDef, v: unknown) => {
    if (c.tipo === 'lista-numeros' || c.tipo === 'lista-texto') return Array.isArray(v) ? v.join(c.tipo === 'lista-texto' ? '\n' : ', ') : ''
    return v === undefined || v === null ? '' : String(v)
  }
  const converter = (c: CampoDef, v: string | boolean): unknown => {
    if (c.tipo === 'booleano') return v
    if (c.tipo === 'numero') return v === '' && c.opcional ? null : Number(v)
    if (c.tipo === 'lista-numeros') return String(v).split(/[,\s]+/).filter(Boolean).map(Number)
    if (c.tipo === 'lista-texto') return String(v).split('\n').map((x) => x.trim()).filter(Boolean)
    return v === '' && c.opcional ? undefined : v
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className="campo max-w-xs" placeholder="Buscar" aria-label={`Buscar em ${titulo}`} value={busca} onChange={(e) => setBusca(e.target.value)} />
        <span className="flex-1 text-sm text-suave">{filtrados.length} registros</span>
        <button
          className="botao-primario"
          onClick={() => {
            setEdicao(novo() as Item)
            setNova(true)
          }}
        >
          <Icone nome="mais" /> Novo
        </button>
      </div>
      <div className="cartao overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-borda text-suave">
              {colunas.map((c) => (
                <th key={c.rotulo} className="px-3 py-2 font-semibold">
                  {c.rotulo}
                </th>
              ))}
              <th className="px-3 py-2">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((i) => (
              <tr key={String((i as Item)[chave])} className="border-b border-borda/60 last:border-0">
                {colunas.map((c) => (
                  <td key={c.rotulo} className="px-3 py-2">
                    {c.valor(i)}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-1 text-right">
                  <button
                    className="botao-fantasma px-2"
                    onClick={() => {
                      setEdicao(structuredClone(i) as Item)
                      setNova(false)
                    }}
                    aria-label="Editar"
                  >
                    <Icone nome="editar" tamanho={18} />
                  </button>
                  {aoRemover && (
                    <button className="botao-fantasma px-2" onClick={() => confirm('Remover este registro?') && aoRemover(i)} aria-label="Remover">
                      <Icone nome="lixo" tamanho={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal aberto={!!edicao} aoFechar={() => setEdicao(null)} titulo={`${nova ? 'Novo' : 'Editar'}: ${titulo}`} largura="max-w-2xl">
        {edicao && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              aoSalvar(edicao as T)
              setEdicao(null)
            }}
          >
            {campos.map((c) => {
              const v = edicao[c.chave]
              const set = (nv: string | boolean) => setEdicao({ ...edicao, [c.chave]: converter(c, nv) })
              const largo = c.tipo === 'area' || c.tipo === 'lista-texto'
              return (
                <div key={c.chave} className={largo ? 'sm:col-span-2' : ''}>
                  {c.tipo === 'booleano' ? (
                    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" className="h-5 w-5 accent-rs-azul" checked={!!v} onChange={(e) => set(e.target.checked)} />
                      {c.rotulo}
                    </label>
                  ) : (
                    <Campo rotulo={c.rotulo}>
                      {c.tipo === 'select' ? (
                        <select className="campo" value={valorCampo(c, v)} onChange={(e) => set(e.target.value)}>
                          {c.opcional && <option value="">(nenhum)</option>}
                          {c.opcoes?.map((o) => (
                            <option key={o.valor} value={o.valor}>
                              {o.nome}
                            </option>
                          ))}
                        </select>
                      ) : largo ? (
                        <textarea className="campo min-h-24" value={valorCampo(c, v)} onChange={(e) => set(e.target.value)} />
                      ) : (
                        <input
                          className="campo"
                          type={c.tipo === 'numero' ? 'number' : c.tipo === 'data' ? 'date' : 'text'}
                          step={c.tipo === 'numero' ? 'any' : undefined}
                          required={!c.opcional && c.tipo !== 'lista-numeros'}
                          value={valorCampo(c, v)}
                          onChange={(e) => set(e.target.value)}
                        />
                      )}
                    </Campo>
                  )}
                </div>
              )
            })}
            <button className="botao-primario sm:col-span-2">Salvar</button>
          </form>
        )}
      </Modal>
    </section>
  )
}

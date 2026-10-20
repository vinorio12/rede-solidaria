import { useState } from 'react'
import { Icone } from '@/components/Icone'
import { Campo, Modal } from '@/components/ui'

// Editor genérico de cadastros do painel (lista + formulário em modal).
// Aceita campos aninhados por caminho ("titulo.f", "arte.cor"), listas de
// sub-itens (critérios, graus, degraus) e envio de arte (imagem em data URL).

export interface CampoDef {
  chave: string
  rotulo: string
  tipo?: 'texto' | 'numero' | 'data' | 'select' | 'booleano' | 'lista-numeros' | 'lista-texto' | 'area' | 'lista' | 'arquivo' | 'cor'
  opcoes?: { valor: string; nome: string }[]
  opcional?: boolean
  subcampos?: CampoDef[]
  novoItem?: () => Record<string, unknown>
  ajuda?: string
}

type Item = Record<string, unknown>

function ler(obj: Item, caminho: string): unknown {
  return caminho.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Item)[k] : undefined), obj)
}

function gravar(obj: Item, caminho: string, valor: unknown): Item {
  const [k, ...resto] = caminho.split('.')
  if (!resto.length) {
    const novo = { ...obj }
    if (valor === undefined) delete novo[k]
    else novo[k] = valor
    return novo
  }
  return { ...obj, [k]: gravar(((obj[k] as Item) ?? {}) as Item, resto.join('.'), valor) }
}

function valorCampo(c: CampoDef, v: unknown) {
  if (c.tipo === 'lista-numeros' || c.tipo === 'lista-texto') return Array.isArray(v) ? v.join(c.tipo === 'lista-texto' ? '\n' : ', ') : ''
  return v === undefined || v === null ? '' : String(v)
}

function converter(c: CampoDef, v: string | boolean): unknown {
  if (c.tipo === 'booleano') return v
  if (c.tipo === 'numero') return v === '' && c.opcional ? undefined : Number(v)
  if (c.tipo === 'lista-numeros') return String(v).split(/[,\s]+/).filter(Boolean).map(Number)
  if (c.tipo === 'lista-texto') return String(v).split('\n').map((x) => x.trim()).filter(Boolean)
  return v === '' && c.opcional ? undefined : v
}

function lerArquivo(arquivo: File) {
  return new Promise<string>((ok, erro) => {
    const fr = new FileReader()
    fr.onload = () => ok(String(fr.result))
    fr.onerror = () => erro(fr.error)
    fr.readAsDataURL(arquivo)
  })
}

/** Formulário de campos (reutilizado nas listas de sub-itens). */
function Campos({ campos, valor, aoMudar }: { campos: CampoDef[]; valor: Item; aoMudar: (v: Item) => void }) {
  return (
    <>
      {campos.map((c) => {
        const v = ler(valor, c.chave)
        const set = (nv: unknown) => aoMudar(gravar(valor, c.chave, nv))
        const largo = c.tipo === 'area' || c.tipo === 'lista-texto' || c.tipo === 'lista'
        if (c.tipo === 'lista') {
          const itens = (Array.isArray(v) ? v : []) as Item[]
          return (
            <fieldset key={c.chave} className="space-y-2 rounded-xl border border-borda p-3 sm:col-span-2">
              <legend className="px-1 text-sm font-semibold">{c.rotulo}</legend>
              {c.ajuda && <p className="text-xs text-suave">{c.ajuda}</p>}
              {itens.map((it, i) => (
                <div key={i} className="grid gap-2 rounded-lg bg-fundo p-2 sm:grid-cols-2">
                  <Campos campos={c.subcampos ?? []} valor={it} aoMudar={(nv) => set(itens.map((x, j) => (j === i ? nv : x)))} />
                  <button type="button" className="botao-fantasma justify-self-start px-2 text-xs sm:col-span-2" onClick={() => set(itens.filter((_, j) => j !== i))}>
                    <Icone nome="lixo" tamanho={16} /> Remover
                  </button>
                </div>
              ))}
              <button type="button" className="botao-secundario min-h-9 px-3 py-1 text-xs" onClick={() => set([...itens, c.novoItem?.() ?? {}])}>
                <Icone nome="mais" tamanho={16} /> Adicionar
              </button>
            </fieldset>
          )
        }
        return (
          <div key={c.chave} className={largo ? 'sm:col-span-2' : ''}>
            {c.tipo === 'booleano' ? (
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="h-5 w-5 accent-rs-azul" checked={!!v} onChange={(e) => set(converter(c, e.target.checked))} />
                {c.rotulo}
              </label>
            ) : (
              <Campo rotulo={c.rotulo} ajuda={c.ajuda}>
                {c.tipo === 'select' ? (
                  <select className="campo" value={valorCampo(c, v)} onChange={(e) => set(converter(c, e.target.value))}>
                    {c.opcional && <option value="">(nenhum)</option>}
                    {c.opcoes?.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.nome}
                      </option>
                    ))}
                  </select>
                ) : c.tipo === 'arquivo' ? (
                  <span className="flex items-center gap-2">
                    {typeof v === 'string' && v.startsWith('data:image') && <img src={v} alt="" className="h-11 w-11 rounded-lg border border-borda object-contain" />}
                    <input className="campo" type="file" accept="image/png,image/svg+xml,image/webp" onChange={async (e) => e.target.files?.[0] && set(await lerArquivo(e.target.files[0]))} />
                    {!!v && (
                      <button type="button" className="botao-fantasma px-2 text-xs" onClick={() => set(undefined)}>
                        Remover
                      </button>
                    )}
                  </span>
                ) : c.tipo === 'area' || c.tipo === 'lista-texto' ? (
                  <textarea className="campo min-h-24" value={valorCampo(c, v)} onChange={(e) => set(converter(c, e.target.value))} />
                ) : (
                  <input
                    className="campo"
                    type={c.tipo === 'numero' ? 'number' : c.tipo === 'data' ? 'date' : c.tipo === 'cor' ? 'color' : 'text'}
                    step={c.tipo === 'numero' ? 'any' : undefined}
                    required={!c.opcional && c.tipo !== 'lista-numeros'}
                    value={valorCampo(c, v)}
                    onChange={(e) => set(converter(c, e.target.value))}
                  />
                )}
              </Campo>
            )}
          </div>
        )
      })}
    </>
  )
}

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
  novo?: () => T
  aoSalvar: (i: T) => void
  aoRemover?: (i: T) => void
  titulo: string
}) {
  const [edicao, setEdicao] = useState<Item | null>(null)
  const [nova, setNova] = useState(false)
  const [busca, setBusca] = useState('')
  const filtrados = itens.filter((i) => !busca || colunas.some((c) => c.valor(i).toLowerCase().includes(busca.toLowerCase())))

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className="campo max-w-xs" placeholder="Buscar" aria-label={`Buscar em ${titulo}`} value={busca} onChange={(e) => setBusca(e.target.value)} />
        <span className="flex-1 text-sm text-suave">{filtrados.length} registros</span>
        {novo && (
          <button
            className="botao-primario"
            onClick={() => {
              setEdicao(novo() as Item)
              setNova(true)
            }}
          >
            <Icone nome="mais" /> Novo
          </button>
        )}
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

      <Modal aberto={!!edicao} aoFechar={() => setEdicao(null)} titulo={`${nova ? 'Novo' : 'Editar'}: ${titulo}`} largura="max-w-3xl">
        {edicao && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              aoSalvar(edicao as T)
              setEdicao(null)
            }}
          >
            <Campos campos={campos} valor={edicao} aoMudar={setEdicao} />
            <button className="botao-primario sm:col-span-2">Salvar</button>
          </form>
        )}
      </Modal>
    </section>
  )
}

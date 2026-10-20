import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { cicloAtivo, previaXp } from '@/domain/regras'
import { enviarReporte, ErroRegra, prepararComprovantes, rascunhoReporte, salvarFamiliar, TAMANHO_MAX_COMPROVANTE, type DadosReporte } from '@/domain/servicos'
import type { Comprovante, Familiar, RelacaoConvidado, Reporte } from '@/domain/types'
import { Mascote } from '@/components/Mascote'
import { Icone } from '@/components/Icone'
import { Aviso, BarraProgresso, CabecalhoPagina, Campo, ChipStatus } from '@/components/ui'
import { confete } from '@/components/Feedback'
import { data, moeda, numero } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

const ETAPAS = ['Em nome de quem', 'Modalidade', 'Destino', 'Valor e data', 'Comprovante', 'Consentimento', 'Confirmação']

export function Reportar() {
  const u = useUsuario()
  const b = useBanco()
  const [params] = useSearchParams()
  const entidadeInicial = b.entidades.find((e) => e.id === params.get('entidade'))
  const carta = b.cartas.find((c) => c.id === params.get('carta'))

  const [etapa, setEtapa] = useState(0)
  const [d, setD] = useState<DadosReporte>(() => ({
    familiarId: b.familiares.find((f) => f.id === params.get('familiar') && f.usuarioId === u.id)?.id,
    modalidade: entidadeInicial ? 'doacao_direta' : 'declaracao',
    fundoTipo: entidadeInicial?.publico ?? 'FIA',
    esfera: 'municipal',
    municipio: entidadeInicial?.municipio ?? u.municipio,
    uf: entidadeInicial?.uf ?? u.uf,
    entidadeId: entidadeInicial?.id,
    valor: carta?.valor ?? 0,
    dataPagamento: carta?.dataDeposito ?? new Date().toISOString().slice(0, 10),
    cartaId: carta?.id,
  }))
  const [arquivos, setArquivos] = useState<File[]>([])
  const [lgpd, setLgpd] = useState(false)
  const [veracidade, setVeracidade] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState<Reporte | null>(null)
  const [novoFamiliar, setNovoFamiliar] = useState<Omit<Familiar, 'id' | 'usuarioId'> | null>(null)

  const familiares = b.familiares.filter((f) => f.usuarioId === u.id)
  const municipios = useMemo(() => [...new Set([...b.fundos.map((f) => f.municipio), u.municipio])].sort(), [b.fundos, u.municipio])
  const entidadesFiltradas = b.entidades.filter((e) => e.publico === d.fundoTipo && (d.esfera !== 'municipal' || e.municipio === d.municipio))
  const xpPrevisto = previaXp(b, rascunhoReporte(u.id, d))
  const ciclo = cicloAtivo(b)

  const set = <K extends keyof DadosReporte>(k: K, v: DadosReporte[K]) => setD((x) => ({ ...x, [k]: v }))

  const podeAvancar = [
    !d.convidado || d.convidado.nome.trim().length >= 3,
    true,
    !!d.municipio,
    d.valor > 0 && !!d.dataPagamento,
    arquivos.length > 0,
    lgpd && veracidade,
    true,
  ][etapa]

  const adicionarArquivos = (lista: FileList | null) => {
    if (!lista) return
    const novos = [...lista]
    const grande = novos.find((f) => f.size > TAMANHO_MAX_COMPROVANTE)
    if (grande) {
      setErro(`O arquivo ${grande.name} passa de 10 MB.`)
      return
    }
    setErro('')
    setArquivos((a) => [...a, ...novos])
  }

  const enviar = async () => {
    setErro('')
    setEnviando(true)
    try {
      const comps: Comprovante[] = await prepararComprovantes(arquivos)
      const r = enviarReporte(u.id, d, comps)
      setEnviado(r)
      confete()
    } catch (e) {
      setErro(e instanceof ErroRegra ? e.message : 'Não foi possível enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <Mascote variante="comemorando" tamanho={150} className="mx-auto" />
        <h1 className="titulo-pagina">Reporte enviado</h1>
        <p className="text-suave">
          {enviado.convidado
            ? `O reporte em nome de ${enviado.convidado.nome} segue para a validação da Seção Desenvolvimento Social. O XP vem para você.`
            : 'Agora a Seção Desenvolvimento Social vai validar o comprovante. Você acompanha tudo em Meus reportes.'}
        </p>
        <div className="cartao space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm text-suave">Status</span>
            <ChipStatus status={enviado.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-suave">XP previsto após a validação</span>
            <span className="font-titulo font-bold text-rs-azul">+{numero(xpPrevisto)} XP</span>
          </div>
          {enviado.duplicidadeSuspeita && <Aviso tipo="alerta">Este reporte parece repetido e será conferido com atenção pela equipe.</Aviso>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to={`/reportes/${enviado.id}`} className="botao-primario">
            Acompanhar reporte
          </Link>
          <button
            className="botao-secundario"
            onClick={() => {
              setEnviado(null)
              setEtapa(0)
              setArquivos([])
              setLgpd(false)
              setVeracidade(false)
              setD((x) => ({ ...x, familiarId: undefined, convidado: undefined, valor: 0, cartaId: undefined }))
            }}
          >
            Reportar outra destinação
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <CabecalhoPagina titulo="Reportar destinação" subtitulo={`${ciclo.rotulo}. O XP é o mesmo para qualquer valor.`} />
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs font-bold text-suave">
          <span>
            Etapa {etapa + 1} de {ETAPAS.length}
          </span>
          <span>{ETAPAS[etapa]}</span>
        </div>
        <BarraProgresso valor={etapa + 1} max={ETAPAS.length} rotulo="Progresso do reporte" cor="azul" />
      </div>

      <section className="cartao space-y-4" aria-labelledby="etapa-titulo">
        <h2 id="etapa-titulo" className="font-titulo text-lg font-bold text-weg-900">
          {ETAPAS[etapa]}
        </h2>

        {etapa === 0 && (
          <fieldset className="space-y-2">
            <legend className="sr-only">Em nome de quem</legend>
            <Opcao nome="quem" marcado={!d.familiarId && !d.convidado} aoMarcar={() => setD((x) => ({ ...x, familiarId: undefined, convidado: undefined }))} titulo="Eu mesmo" texto={u.nome} />
            {familiares.map((f) => (
              <Opcao key={f.id} nome="quem" marcado={d.familiarId === f.id} aoMarcar={() => setD((x) => ({ ...x, familiarId: f.id, convidado: undefined }))} titulo={f.nome} texto={`${t.parentesco[f.parentesco]} · ${f.municipio}`} />
            ))}
            <Opcao
              nome="quem"
              marcado={!!d.convidado}
              aoMarcar={() => setD((x) => ({ ...x, familiarId: undefined, convidado: x.convidado ?? { nome: '', relacao: 'amigo' } }))}
              titulo="Por um convidado"
              texto="Amigo, vizinho ou familiar não cadastrado que te enviou o comprovante. O XP vem para você."
            />
            {d.convidado && (
              <div className="grid gap-2 rounded-xl border border-dashed border-rs-azul p-3 sm:grid-cols-2">
                <Campo rotulo="Nome do convidado">
                  <input className="campo" value={d.convidado.nome} onChange={(e) => set('convidado', { ...d.convidado!, nome: e.target.value })} />
                </Campo>
                <Campo rotulo="Relação com você">
                  <select className="campo" value={d.convidado.relacao} onChange={(e) => set('convidado', { ...d.convidado!, relacao: e.target.value as RelacaoConvidado })}>
                    {Object.entries(t.relacaoConvidado).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Campo>
                <p className="text-xs text-suave sm:col-span-2">Prefere que a pessoa mesma envie? Compartilhe o seu link de convidado na tela Convidar.</p>
              </div>
            )}
            {novoFamiliar ? (
              <div className="space-y-2 rounded-xl border border-dashed border-rs-azul p-3">
                <Campo rotulo="Nome do familiar">
                  <input className="campo" value={novoFamiliar.nome} onChange={(e) => setNovoFamiliar({ ...novoFamiliar, nome: e.target.value })} />
                </Campo>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Campo rotulo="Parentesco">
                    <select className="campo" value={novoFamiliar.parentesco} onChange={(e) => setNovoFamiliar({ ...novoFamiliar, parentesco: e.target.value as Familiar['parentesco'] })}>
                      {Object.entries(t.parentesco).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo rotulo="Município">
                    <input className="campo" value={novoFamiliar.municipio} onChange={(e) => setNovoFamiliar({ ...novoFamiliar, municipio: e.target.value })} />
                  </Campo>
                </div>
                <div className="flex gap-2">
                  <button
                    className="botao-primario"
                    disabled={!novoFamiliar.nome.trim()}
                    onClick={() => {
                      const f = salvarFamiliar({ ...novoFamiliar, usuarioId: u.id })
                      set('familiarId', f.id)
                      setNovoFamiliar(null)
                    }}
                  >
                    Salvar familiar
                  </button>
                  <button className="botao-fantasma" onClick={() => setNovoFamiliar(null)}>
                    {t.acoes.cancelar}
                  </button>
                </div>
              </div>
            ) : (
              <button className="botao-secundario w-full" onClick={() => setNovoFamiliar({ nome: '', parentesco: 'conjuge', municipio: u.municipio })}>
                <Icone nome="mais" /> Cadastrar novo familiar
              </button>
            )}
          </fieldset>
        )}

        {etapa === 1 && (
          <fieldset className="space-y-2">
            <legend className="sr-only">Modalidade</legend>
            <Opcao nome="mod" marcado={d.modalidade === 'declaracao'} aoMarcar={() => set('modalidade', 'declaracao')} titulo={t.modalidade.declaracao} texto="Até 3% do imposto devido para cada fundo, na ficha Doações diretamente na declaração. O DARF é pago até o prazo final da entrega." />
            <Opcao nome="mod" marcado={d.modalidade === 'doacao_direta'} aoMarcar={() => set('modalidade', 'doacao_direta')} titulo={t.modalidade.doacao_direta} texto="Depósito direto na conta do fundo durante o ano. Pode indicar uma entidade ou projeto chancelado." />
          </fieldset>
        )}

        {etapa === 2 && (
          <div className="space-y-3">
            <fieldset>
              <legend className="rotulo">Tipo de fundo</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['FIA', 'IDOSO'] as const).map((f) => (
                  <Opcao key={f} nome="fundo" marcado={d.fundoTipo === f} aoMarcar={() => setD((x) => ({ ...x, fundoTipo: f, entidadeId: undefined }))} titulo={t.fundo[f]} />
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo rotulo="Esfera">
                <select className="campo" value={d.esfera} onChange={(e) => set('esfera', e.target.value as DadosReporte['esfera'])}>
                  {Object.entries(t.esfera).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Município">
                <input className="campo" list="municipios" value={d.municipio} onChange={(e) => setD((x) => ({ ...x, municipio: e.target.value, entidadeId: undefined }))} />
                <datalist id="municipios">
                  {municipios.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Campo>
              <Campo rotulo="UF">
                <input className="campo uppercase" maxLength={2} value={d.uf} onChange={(e) => set('uf', e.target.value.toUpperCase())} />
              </Campo>
            </div>
            <Campo rotulo="Entidade ou projeto chancelado de preferência (opcional)">
              <select className="campo" value={d.entidadeId ?? ''} onChange={(e) => set('entidadeId', e.target.value || undefined)}>
                <option value="">Sem preferência</option>
                {entidadesFiltradas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nomeFantasia} · {e.projetoChancelado}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        )}

        {etapa === 3 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Valor pago (R$)" ajuda="O valor fica visível só para você, seu padrinho e a Seção DS.">
              <input className="campo" type="number" inputMode="decimal" min={0} step="0.01" value={d.valor || ''} onChange={(e) => set('valor', Number(e.target.value))} />
            </Campo>
            <Campo rotulo="Data do pagamento">
              <input className="campo" type="date" value={d.dataPagamento} onChange={(e) => set('dataPagamento', e.target.value)} />
            </Campo>
          </div>
        )}

        {etapa === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-suave">
              {d.modalidade === 'declaracao' ? 'Envie o DARF e o comprovante de pagamento.' : 'Envie o comprovante do depósito ou o recibo emitido pelo fundo.'} PDF ou imagem, até 10 MB cada.
            </p>
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rs-azul/50 bg-rs-ciano-claro/50 p-4 text-center hover:bg-rs-ciano-claro">
              <Icone nome="upload" tamanho={28} className="text-rs-azul" />
              <span className="font-semibold text-rs-azul">Escolher arquivos</span>
              <input type="file" className="sr-only" multiple accept="application/pdf,image/*" onChange={(e) => adicionarArquivos(e.target.files)} />
            </label>
            <ul className="space-y-1">
              {arquivos.map((a, i) => (
                <li key={`${a.name}-${i}`} className="flex items-center justify-between gap-2 rounded-xl bg-fundo px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Icone nome="documento" tamanho={18} />
                    <span className="truncate">{a.name}</span>
                    <span className="shrink-0 text-suave">{(a.size / 1024 / 1024).toFixed(1)} MB</span>
                  </span>
                  <button className="botao-fantasma px-2" onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))} aria-label={`Remover ${a.name}`}>
                    <Icone nome="lixo" tamanho={18} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {etapa === 5 && (
          <div className="space-y-2 text-sm">
            <label className="flex min-h-11 items-start gap-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-rs-azul" checked={lgpd} onChange={(e) => setLgpd(e.target.checked)} />
              <span>Autorizo o tratamento dos dados e do comprovante para validação da destinação pela Seção Desenvolvimento Social (LGPD).</span>
            </label>
            <label className="flex min-h-11 items-start gap-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-rs-azul" checked={veracidade} onChange={(e) => setVeracidade(e.target.checked)} />
              <span>Declaro que as informações são verdadeiras e que o comprovante corresponde ao pagamento informado.</span>
            </label>
          </div>
        )}

        {etapa === 6 && (
          <div className="space-y-3">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Item r="Em nome de" v={d.convidado ? `${d.convidado.nome} (convidado)` : d.familiarId ? familiares.find((f) => f.id === d.familiarId)?.nome : u.nome} />
              <Item r="Modalidade" v={t.modalidade[d.modalidade]} />
              <Item r="Fundo" v={`${t.fundo[d.fundoTipo]} (${t.esfera[d.esfera].toLowerCase()})`} />
              <Item r="Município" v={`${d.municipio}/${d.uf}`} />
              {d.entidadeId && <Item r="Entidade" v={b.entidades.find((e) => e.id === d.entidadeId)?.nomeFantasia} />}
              <Item r="Valor" v={moeda(d.valor)} />
              <Item r="Data do pagamento" v={data(d.dataPagamento)} />
              <Item r="Comprovantes" v={`${arquivos.length} arquivo(s)`} />
            </dl>
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rs-azul to-rs-ciano p-4 text-white">
              <Mascote variante="comemorando" tamanho={64} />
              <div>
                <p className="text-sm">Prévia do XP após a validação</p>
                <p className="font-titulo text-2xl font-bold">+{numero(xpPrevisto)} XP</p>
                <p className="text-xs text-white/90">O status inicial será “{t.status.enviado}”, seguido de “{t.status.em_validacao}”. O XP não depende do valor.</p>
              </div>
            </div>
          </div>
        )}

        {erro && <Aviso tipo="alerta">{erro}</Aviso>}

        <div className="flex justify-between gap-2 border-t border-borda pt-4">
          <button className="botao-secundario" onClick={() => setEtapa((e) => e - 1)} disabled={etapa === 0}>
            <Icone nome="voltar" /> {t.acoes.voltar}
          </button>
          {etapa < ETAPAS.length - 1 ? (
            <button className="botao-primario" onClick={() => setEtapa((e) => e + 1)} disabled={!podeAvancar}>
              {t.acoes.continuar} <Icone nome="avancar" />
            </button>
          ) : (
            <button className="botao-primario" onClick={enviar} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar reporte'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function Opcao({ nome, marcado, aoMarcar, titulo, texto }: { nome: string; marcado: boolean; aoMarcar: () => void; titulo: string; texto?: string }) {
  return (
    <label className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${marcado ? 'border-rs-azul bg-rs-ciano-claro' : 'border-borda hover:border-rs-azul/60'}`}>
      <input type="radio" name={nome} checked={marcado} onChange={aoMarcar} className="mt-1 h-5 w-5 accent-rs-azul" />
      <span>
        <span className="block font-semibold">{titulo}</span>
        {texto && <span className="block text-sm text-suave">{texto}</span>}
      </span>
    </label>
  )
}

function Item({ r, v }: { r: string; v?: string }) {
  return (
    <div className="rounded-xl bg-fundo px-3 py-2">
      <dt className="text-xs text-suave">{r}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  )
}

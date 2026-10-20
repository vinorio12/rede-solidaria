import { useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useBanco } from '@/data/useBanco'
import { enviarReporteConvidado, ErroRegra, infoLinkPublico, prepararComprovantes, TAMANHO_MAX_COMPROVANTE } from '@/domain/servicos'
import type { Modalidade, RelacaoConvidado, TipoFundo } from '@/domain/types'
import { Mascote } from '@/components/Mascote'
import { Aviso, Campo } from '@/components/ui'
import { t } from '@/i18n/pt-BR'

// Página isolada e única rota sem login (seção 2 do prompt v2): só o formulário.
// Sem menu, ranking ou qualquer outro conteúdo do app.

function idDispositivo() {
  try {
    let id = localStorage.getItem('rede-solidaria:dispositivo')
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('rede-solidaria:dispositivo', id)
    }
    return id
  } catch {
    return 'sem-armazenamento'
  }
}

export function FormularioConvidado() {
  const { codigo = '' } = useParams()
  useBanco() // reage se o link for desativado
  const info = infoLinkPublico(codigo)
  const abertoEm = useMemo(() => Date.now(), [])
  const [f, setF] = useState({
    nome: '',
    relacao: 'amigo' as RelacaoConvidado,
    modalidade: 'doacao_direta' as Modalidade,
    fundoTipo: 'FIA' as TipoFundo,
    municipio: '',
    uf: 'SC',
    valor: 0,
    dataPagamento: new Date().toISOString().slice(0, 10),
    site: '',
  })
  const [arquivos, setArquivos] = useState<File[]>([])
  const [consentimento, setConsentimento] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  if (!info) {
    return (
      <Pagina>
        <Mascote variante="pensando" tamanho={110} className="mx-auto" />
        <h1 className="titulo-pagina text-center">Link indisponível</h1>
        <p className="text-center text-suave">Este link de convidado não existe ou foi desativado. Peça um novo link ao colaborador que te convidou.</p>
      </Pagina>
    )
  }

  if (enviado) {
    return (
      <Pagina>
        <Mascote variante="comemorando" tamanho={130} className="mx-auto" />
        <h1 className="titulo-pagina text-center">Obrigado!</h1>
        <p className="text-center text-suave">
          Seu reporte foi enviado para {info.primeiroNome}, que vai confirmá-lo. Depois, a Seção Desenvolvimento Social da WEG valida o comprovante. Você não precisa fazer mais nada.
        </p>
      </Pagina>
    )
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const comps = await prepararComprovantes(arquivos)
      enviarReporteConvidado(codigo, { ...f, consentimento, dispositivo: idDispositivo(), abertoEm }, comps)
      setEnviado(true)
    } catch (x) {
      setErro(x instanceof ErroRegra ? x.message : 'Não foi possível enviar agora. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  return (
    <Pagina>
      <div className="flex items-center gap-3">
        <Mascote variante="acenando" tamanho={80} />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-rs-azul">Rede Solidária WEG</p>
          <h1 className="titulo-pagina">Reporte de convidado</h1>
          <p className="text-sm text-suave">Você está reportando uma destinação em nome de {info.primeiroNome}.</p>
        </div>
      </div>
      {info.esgotado && <Aviso tipo="alerta">{info.primeiroNome} já atingiu o limite de reportes de convidados desta edição.</Aviso>}
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo rotulo="Seu nome">
          <input className="campo" required value={f.nome} onChange={(e) => set('nome', e.target.value)} autoComplete="name" />
        </Campo>
        <Campo rotulo={`Relação com ${info.primeiroNome}`}>
          <select className="campo" value={f.relacao} onChange={(e) => set('relacao', e.target.value as RelacaoConvidado)}>
            {Object.entries(t.relacaoConvidado).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Modalidade">
            <select className="campo" value={f.modalidade} onChange={(e) => set('modalidade', e.target.value as Modalidade)}>
              {Object.entries(t.modalidade).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Fundo">
            <select className="campo" value={f.fundoTipo} onChange={(e) => set('fundoTipo', e.target.value as TipoFundo)}>
              {Object.entries(t.fundo).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Município do fundo">
            <input className="campo" required value={f.municipio} onChange={(e) => set('municipio', e.target.value)} />
          </Campo>
          <Campo rotulo="UF">
            <input className="campo uppercase" maxLength={2} value={f.uf} onChange={(e) => set('uf', e.target.value.toUpperCase())} />
          </Campo>
          <Campo rotulo="Valor pago (R$)" ajuda="Visível só para o colaborador e para a Seção DS.">
            <input className="campo" type="number" inputMode="decimal" min={0} step="0.01" value={f.valor || ''} onChange={(e) => set('valor', Number(e.target.value))} />
          </Campo>
          <Campo rotulo="Data do pagamento">
            <input className="campo" type="date" value={f.dataPagamento} onChange={(e) => set('dataPagamento', e.target.value)} />
          </Campo>
        </div>
        <Campo rotulo="Comprovante (PDF ou imagem, até 10 MB)">
          <input
            className="campo"
            type="file"
            accept="application/pdf,image/*"
            multiple
            onChange={(e) => {
              const lista = [...(e.target.files ?? [])]
              const grande = lista.find((a) => a.size > TAMANHO_MAX_COMPROVANTE)
              setErro(grande ? `O arquivo ${grande.name} passa de 10 MB.` : '')
              setArquivos(grande ? [] : lista)
            }}
          />
        </Campo>
        {/* campo-armadilha para robôs: invisível para pessoas */}
        <label className="absolute -left-[9999px]" aria-hidden="true">
          Site
          <input tabIndex={-1} autoComplete="off" value={f.site} onChange={(e) => set('site', e.target.value)} />
        </label>
        <label className="flex min-h-11 items-start gap-2 rounded-xl border border-borda p-3 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-rs-azul" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} />
          <span>
            Autorizo o tratamento do meu nome, do valor e do comprovante somente para a validação desta destinação pela Seção Desenvolvimento Social da WEG (LGPD). Não crio conta e não acumulo pontos; os dados ficam visíveis apenas para {info.primeiroNome} e para a Seção DS.
          </span>
        </label>
        {erro && <Aviso tipo="alerta">{erro}</Aviso>}
        <button className="botao-primario w-full" disabled={enviando || info.esgotado || !consentimento || !f.nome.trim() || !(f.valor > 0) || !arquivos.length}>
          {enviando ? 'Enviando…' : 'Enviar reporte'}
        </button>
      </form>
    </Pagina>
  )
}

function Pagina({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-fundo px-4 py-6">
      <div className="cartao mx-auto max-w-lg space-y-4 p-5">{children}</div>
    </main>
  )
}

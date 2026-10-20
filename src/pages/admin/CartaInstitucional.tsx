import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { registrarCarta } from '@/domain/servicos'
import { Icone } from '@/components/Icone'
import { Aviso, Campo } from '@/components/ui'
import { avisar } from '@/components/Feedback'
import { baixar } from '@/lib/baixar'
import { nomeConselho, textoCarta, type DadosCarta } from '@/lib/cartaOficial'
import { data } from '@/lib/datas'
import { urlInterna } from '@/lib/ambiente'

// Variante pessoa jurídica da carta oficial (seção 3): só no painel, para
// destinações institucionais da WEG (IRPJ, Lucro Real).

export function CartaInstitucional() {
  const admin = useUsuario()
  const b = useBanco()
  const [f, setF] = useState({ entidadeId: b.entidades[0]?.id ?? '', razaoSocial: '', cnpj: '', sede: '', representante: '', valor: 0, dataDeposito: new Date().toISOString().slice(0, 10) })
  const [gerando, setGerando] = useState(false)
  const e = b.entidades.find((x) => x.id === f.entidadeId)
  const fundo = e && b.fundos.find((x) => x.id === e.fundoId)

  const dados: DadosCarta | null =
    e && fundo
      ? {
          variante: 'pj',
          codigo: 'prévia',
          urlVerificacao: '',
          conselhoNome: nomeConselho(fundo),
          tipoFundo: e.publico,
          municipioFundo: fundo.municipio,
          ufFundo: fundo.uf,
          doadorNome: f.razaoSocial || '{Razão Social}',
          doadorDocumento: f.cnpj || '00.000.000/0000-00',
          doadorEndereco: f.sede || '{endereço da sede}',
          representante: f.representante,
          valor: f.valor,
          dataDeposito: f.dataDeposito,
          instituicao: e.razaoSocial,
          cnpjInstituicao: e.cnpj,
          projeto: e.projetoChancelado,
          chancela: e.resolucaoNumero ? `Resolução nº ${e.resolucaoNumero}${e.resolucaoData ? `, de ${data(e.resolucaoData)}` : ''}` : '',
          emitidaEm: new Date().toISOString(),
        }
      : null
  const tx = dados && textoCarta(dados)
  const valido = dados && f.razaoSocial && /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(f.cnpj) && f.sede && f.valor > 0

  const gerar = async () => {
    if (!dados || !e) return
    setGerando(true)
    try {
      const carta = registrarCarta(admin.id, e.id, f.valor, f.dataDeposito, 'pj')
      const url = urlInterna(`/verificar/${carta.codigo}`)
      const { gerarCartaPdf } = await import('@/lib/pdf')
      baixar(await gerarCartaPdf({ ...dados, codigo: carta.codigo, urlVerificacao: url, emitidaEm: carta.emitidaEm }), `carta-direcionamento-pj-${carta.codigo}.pdf`)
      avisar('Carta institucional gerada.')
    } finally {
      setGerando(false)
    }
  }

  const set = (k: keyof typeof f) => (ev: { target: { value: string } }) => setF({ ...f, [k]: k === 'valor' ? Number(ev.target.value) : ev.target.value })

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="cartao space-y-3">
        <h2 className="font-titulo text-lg font-bold text-weg-900">Carta de direcionamento · pessoa jurídica</h2>
        <Aviso>Para destinações institucionais da WEG (IRPJ, Lucro Real). Colaboradores usam a variante pessoa física, na página da entidade.</Aviso>
        <Campo rotulo="Entidade chancelada">
          <select className="campo" value={f.entidadeId} onChange={set('entidadeId')}>
            {b.entidades.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nomeFantasia} · {x.projetoChancelado}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Razão social da empresa">
          <input className="campo" value={f.razaoSocial} onChange={set('razaoSocial')} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="CNPJ">
            <input className="campo" value={f.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0000-00" />
          </Campo>
          <Campo rotulo="Representante legal (assina)">
            <input className="campo" value={f.representante} onChange={set('representante')} />
          </Campo>
        </div>
        <Campo rotulo="Endereço da sede">
          <input className="campo" value={f.sede} onChange={set('sede')} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Valor (R$)">
            <input className="campo" type="number" step="0.01" value={f.valor || ''} onChange={set('valor')} />
          </Campo>
          <Campo rotulo="Data do depósito">
            <input className="campo" type="date" value={f.dataDeposito} onChange={set('dataDeposito')} />
          </Campo>
        </div>
        <button className="botao-primario w-full" disabled={!valido || gerando} onClick={gerar}>
          <Icone nome="download" /> {gerando ? 'Gerando…' : 'Baixar carta PJ em PDF'}
        </button>
      </section>
      {tx && (
        <section className="cartao bg-white text-[14px] leading-relaxed text-[#10233a]" aria-label="Prévia da carta PJ">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-rs-azul">Prévia · modelo oficial (pessoa jurídica)</p>
          <p className="text-center font-bold">{tx.titulo}</p>
          <p className="mt-3">
            {tx.destinatario[0]}
            <br />
            <strong>{tx.destinatario[1]}</strong>
          </p>
          <p className="mt-2 font-bold">{tx.referencia}</p>
          <p className="mt-2">{tx.saudacao}</p>
          {tx.paragrafos.map((p) => (
            <p key={p.slice(0, 24)} className="mt-2">
              {p}
            </p>
          ))}
          <ul className="mt-1 list-disc pl-5">
            {tx.itens.map(([k, v]) => (
              <li key={k}>
                <strong>{k}:</strong> {v}
              </li>
            ))}
          </ul>
          <p className="mt-2">{tx.pedido}</p>
          <p className="mt-2">{tx.anexos}</p>
          <p className="mt-3">{tx.local}</p>
          <p className="mt-8 border-t border-slate-400 pt-1 font-semibold">{tx.assinatura.join(' · ')}</p>
        </section>
      )}
    </div>
  )
}

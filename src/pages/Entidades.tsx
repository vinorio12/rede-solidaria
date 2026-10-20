import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { atualizarPerfil, captadoPelaEntidade, registrar, registrarCarta } from '@/domain/servicos'
import { Icone } from '@/components/Icone'
import { Mascote } from '@/components/Mascote'
import { Aviso, BarraProgresso, CabecalhoPagina, Campo, Vazio } from '@/components/ui'
import { avisar, confete } from '@/components/Feedback'
import { baixar } from '@/lib/baixar'
import { nomeConselho, textoCarta, type DadosCarta } from '@/lib/cartaOficial'
import { data, diasAte, moeda } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'
import { urlInterna } from '@/lib/ambiente'

export function Entidades() {
  const b = useBanco()
  const [f, setF] = useState({ municipio: '', fundo: '', busca: '' })
  const municipios = [...new Set(b.entidades.map((e) => e.municipio))].sort()
  const lista = b.entidades.filter(
    (e) =>
      (!f.municipio || e.municipio === f.municipio) &&
      (!f.fundo || e.publico === f.fundo) &&
      (!f.busca || `${e.nomeFantasia} ${e.projetoChancelado}`.toLowerCase().includes(f.busca.toLowerCase())),
  )
  return (
    <div className="space-y-4">
      <CabecalhoPagina titulo={t.nav.entidades} subtitulo="Entidades com projetos chancelados pelos conselhos (FIA e Fundo do Idoso). Na doação direta, você pode indicar uma delas." />
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="campo" placeholder="Buscar entidade ou projeto" aria-label="Buscar" value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} />
        <select className="campo" aria-label="Município" value={f.municipio} onChange={(e) => setF({ ...f, municipio: e.target.value })}>
          <option value="">Todos os municípios</option>
          {municipios.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select className="campo" aria-label="Fundo e público" value={f.fundo} onChange={(e) => setF({ ...f, fundo: e.target.value })}>
          <option value="">Todos os públicos</option>
          <option value="FIA">Crianças e adolescentes (FIA)</option>
          <option value="IDOSO">Pessoas idosas (Fundo do Idoso)</option>
        </select>
      </div>
      {!lista.length && <Vazio texto={t.vazio.resultados} />}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((e) => {
          const captado = captadoPelaEntidade(b, e.id)
          return (
            <li key={e.id}>
              <Link to={`/entidades/${e.id}`} className="cartao flex h-full flex-col gap-2 transition hover:-translate-y-0.5 hover:border-rs-azul">
                <span className="chip w-fit bg-rs-ciano-claro text-weg-900">{e.publico === 'FIA' ? 'Crianças e adolescentes' : 'Pessoas idosas'}</span>
                <h2 className="font-titulo text-lg font-bold text-weg-900">{e.nomeFantasia}</h2>
                <p className="text-sm text-suave">
                  {e.projetoChancelado} · {e.municipio}/{e.uf}
                </p>
                <div className="mt-auto pt-2">
                  <BarraProgresso valor={captado} max={e.valorAutorizado} rotulo={`Captado pelo app para ${e.nomeFantasia}`} />
                  <p className="mt-1 text-xs text-suave">
                    {moeda(captado)} captados pelo app de {moeda(e.valorAutorizado)} autorizados
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function DetalheEntidade() {
  const { id } = useParams()
  const u = useUsuario()
  const b = useBanco()
  const e = b.entidades.find((x) => x.id === id)
  const registrado = useRef(false)

  useEffect(() => {
    if (!e || registrado.current) return
    registrado.current = true
    const feitas = registrar(u.id, 'entidade_visitada', { ref: e.id, municipio: e.municipio, fundo: e.publico })
    if (feitas.length) {
      confete()
      avisar(`Missão concluída: ${feitas[0].titulo}`)
    }
  }, [e, u.id])
  const favorita = b.eventos.some((x) => x.usuarioId === u.id && x.tipo === 'entidade_favoritada' && x.dados.ref === id && !x.estornado)

  if (!e) return <Vazio texto="Entidade não encontrada." />
  const fundo = b.fundos.find((f) => f.id === e.fundoId)
  const captado = captadoPelaEntidade(b, e.id)
  const dias = diasAte(e.validadeChancela)
  const projetos = b.projetos.filter((p) => p.entidadeId === e.id)

  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <CabecalhoPagina
        titulo={e.nomeFantasia}
        voltar="/entidades"
        subtitulo={`${e.razaoSocial} · CNPJ ${e.cnpj}`}
        acao={
          <button className={favorita ? 'botao-primario' : 'botao-secundario'} aria-pressed={favorita} disabled={favorita} onClick={() => registrar(u.id, 'entidade_favoritada', { ref: e.id }, e.id)}>
            {favorita ? '★ Favorita' : '☆ Favoritar'}
          </button>
        }
      />
      {dias < 0 ? (
        <Aviso tipo="alerta">A chancela venceu em {data(e.validadeChancela)}. Doações com indicação a este projeto estão suspensas.</Aviso>
      ) : dias <= 60 ? (
        <Aviso tipo="alerta">A chancela vence em {data(e.validadeChancela)} ({dias} dias).</Aviso>
      ) : null}
      <section className="cartao space-y-2">
        <p>{e.descricao}</p>
        <dl className="grid gap-3 pt-2 text-sm sm:grid-cols-2">
          <Dado r="Projeto chancelado" v={e.projetoChancelado} />
          <Dado r="Ato de chancela" v={`Resolução nº ${e.resolucaoNumero}, de ${data(e.resolucaoData)}`} />
          <Dado r="Validade da chancela" v={data(e.validadeChancela)} />
          <Dado r="Município" v={`${e.municipio}/${e.uf}`} />
        </dl>
      </section>
      <section className="cartao">
        <h2 className="font-titulo font-bold text-weg-900">Captação</h2>
        <div className="mt-3">
          <BarraProgresso valor={captado} max={e.valorAutorizado} rotulo="Valor captado pelo app em relação ao autorizado" altura="h-4" />
        </div>
        <p className="mt-2 text-sm">
          <strong>{moeda(captado)}</strong> captados pelo app · <span className="text-suave">valor autorizado para captação: {moeda(e.valorAutorizado)}</span>
        </p>
      </section>
      {fundo && (
        <section className="cartao">
          <h2 className="mb-2 font-titulo font-bold text-weg-900">Dados bancários do fundo</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Dado r="Fundo" v={fundo.nome} />
            <Dado r="CNPJ" v={fundo.cnpj} />
            <Dado r="Banco" v={fundo.banco} />
            <Dado r="Agência e conta" v={`${fundo.agencia} · ${fundo.conta}`} />
            <Dado r="Conselho gestor" v={fundo.conselho} />
            <Dado r="Contato da entidade" v={e.contato} />
          </dl>
        </section>
      )}
      {projetos.length > 0 && (
        <p className="text-sm">
          Projetos apoiados desta entidade:{' '}
          {projetos.map((p) => (
            <Link key={p.id} to={`/projetos/${p.id}`} className="font-semibold text-rs-azul underline">
              {p.nome}
            </Link>
          ))}
        </p>
      )}
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-r from-weg-900 to-rs-azul p-4 text-white sm:flex-row">
        <Mascote variante="apontando" tamanho={72} />
        <p className="flex-1 text-sm">A carta de destinação já sai preenchida com seus dados, os do fundo e os da entidade. Depois do depósito, é só enviar o comprovante.</p>
        {dias >= 0 && (
          <Link to={`/entidades/${e.id}/carta`} className="botao w-full bg-white text-weg-900 hover:bg-rs-ciano-claro sm:w-auto">
            Quero doar para este projeto
          </Link>
        )}
      </div>
    </article>
  )
}

function Dado({ r, v }: { r: string; v: string }) {
  return (
    <div>
      <dt className="text-suave">{r}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  )
}

export function CartaDestinacao() {
  const { id } = useParams()
  const u = useUsuario()
  const b = useBanco()
  const e = b.entidades.find((x) => x.id === id)
  const fundo = e && b.fundos.find((f) => f.id === e.fundoId)
  const familiares = b.familiares.filter((f) => f.usuarioId === u.id)
  const [doador, setDoador] = useState<string>('eu')
  const [f, setF] = useState({
    nome: u.nome,
    cpf: u.cpf ?? '',
    endereco: u.endereco ?? '',
    valor: 0,
    dataDeposito: new Date().toISOString().slice(0, 10),
    salvarPerfil: true,
  })
  const [cartaId, setCartaId] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)

  if (!e || !fundo) return <Vazio texto="Entidade não encontrada." />
  const familiar = familiares.find((x) => x.id === doador)

  const trocarDoador = (valor: string) => {
    setDoador(valor)
    const fam = familiares.find((x) => x.id === valor)
    // CPF e endereço de familiar são digitados na hora e não ficam salvos
    setF((x) => (fam ? { ...x, nome: fam.nome, cpf: '', endereco: '', salvarPerfil: false } : { ...x, nome: u.nome, cpf: u.cpf ?? '', endereco: u.endereco ?? '', salvarPerfil: true }))
  }

  const dados: DadosCarta = {
    variante: 'pf',
    codigo: 'prévia',
    urlVerificacao: '',
    conselhoNome: nomeConselho(fundo),
    tipoFundo: e.publico,
    municipioFundo: fundo.municipio,
    ufFundo: fundo.uf,
    doadorNome: f.nome,
    doadorDocumento: f.cpf || '000.000.000-00',
    doadorEndereco: f.endereco || '{endereço completo}',
    valor: f.valor,
    dataDeposito: f.dataDeposito,
    instituicao: e.razaoSocial,
    cnpjInstituicao: e.cnpj,
    projeto: e.projetoChancelado,
    chancela: e.resolucaoNumero ? `Resolução nº ${e.resolucaoNumero}${e.resolucaoData ? `, de ${data(e.resolucaoData)}` : ''}` : '',
    emitidaEm: new Date().toISOString(),
  }
  const tx = textoCarta(dados)
  const valido = f.nome && /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(f.cpf) && f.endereco && f.valor > 0 && f.dataDeposito

  const gerar = async () => {
    setGerando(true)
    try {
      if (!familiar && f.salvarPerfil) atualizarPerfil(u.id, { cpf: f.cpf, endereco: f.endereco })
      const carta = registrarCarta(u.id, e.id, f.valor, f.dataDeposito, 'pf', familiar?.id)
      const url = urlInterna(`/verificar/${carta.codigo}`)
      const { gerarCartaPdf } = await import('@/lib/pdf')
      baixar(await gerarCartaPdf({ ...dados, codigo: carta.codigo, urlVerificacao: url, emitidaEm: carta.emitidaEm }), `carta-direcionamento-${carta.codigo}.pdf`)
      setCartaId(carta.id)
      if (familiar) setF((x) => ({ ...x, cpf: '', endereco: '' })) // não guardar o CPF do familiar
      avisar('Carta gerada. Faça o depósito e anexe o comprovante bancário à carta.')
    } catch {
      avisar('Não foi possível gerar o PDF.', 'alerta')
    } finally {
      setGerando(false)
    }
  }

  const set = (k: keyof typeof f) => (ev: { target: { value: string } }) => setF({ ...f, [k]: k === 'valor' ? Number(ev.target.value) : ev.target.value })

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <CabecalhoPagina titulo="Carta de direcionamento" voltar={`/entidades/${e.id}`} subtitulo={`${e.nomeFantasia} · ${fundo.nome}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cartao space-y-3">
          <h2 className="font-titulo font-bold text-weg-900">1. Quem está doando</h2>
          <Campo rotulo="Doador">
            <select className="campo" value={doador} onChange={(ev) => trocarDoador(ev.target.value)}>
              <option value="eu">Eu ({u.nome})</option>
              {familiares.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome} (familiar)
                </option>
              ))}
            </select>
          </Campo>
          <p className="text-xs text-suave">{familiar ? 'O CPF e o endereço do familiar servem só para esta carta e não ficam salvos no app.' : 'O CPF aparece somente na carta e nunca em telas públicas.'}</p>
          <Campo rotulo="Nome completo">
            <input className="campo" value={f.nome} onChange={set('nome')} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="CPF">
              <input className="campo" inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={set('cpf')} autoComplete="off" />
            </Campo>
            <Campo rotulo="Endereço completo">
              <input className="campo" value={f.endereco} onChange={set('endereco')} />
            </Campo>
          </div>
          <h2 className="pt-2 font-titulo font-bold text-weg-900">2. Valor e data do depósito</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Valor (R$)">
              <input className="campo" type="number" step="0.01" min={0} value={f.valor || ''} onChange={set('valor')} />
            </Campo>
            <Campo rotulo="Data do depósito">
              <input className="campo" type="date" value={f.dataDeposito} onChange={set('dataDeposito')} />
            </Campo>
          </div>
          {!familiar && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-rs-azul" checked={f.salvarPerfil} onChange={(ev) => setF({ ...f, salvarPerfil: ev.target.checked })} />
              Salvar CPF e endereço no meu perfil
            </label>
          )}
          <button className="botao-primario w-full" disabled={!valido || gerando} onClick={gerar}>
            <Icone nome="download" /> {gerando ? 'Gerando…' : 'Baixar carta em PDF'}
          </button>
          {!valido && <p className="text-xs text-suave">Preencha nome, CPF válido, endereço e valor para gerar a carta.</p>}
        </section>

        <section className="cartao bg-white text-[14px] leading-relaxed text-[#10233a]" aria-label="Prévia da carta">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-rs-azul">Prévia · modelo oficial (pessoa física)</p>
          <p className="text-center font-bold">{tx.titulo}</p>
          <p className="mt-3">
            {tx.destinatario[0]}
            <br />
            <strong>{tx.destinatario[1]}</strong>
          </p>
          <p className="mt-2 font-bold">{tx.referencia}</p>
          <p className="mt-2">{tx.saudacao}</p>
          {tx.paragrafos.map((p) => (
            <p key={p.slice(0, 20)} className="mt-2">
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
          <p className="mt-8 border-t border-slate-400 pt-1 font-semibold">{tx.assinatura[0]}</p>
        </section>
      </div>
      {cartaId && (
        <section className="cartao flex flex-col items-center gap-3 border-sucesso/40 bg-sucesso-claro sm:flex-row">
          <Mascote variante="comemorando" tamanho={64} />
          <p className="flex-1 text-sm text-sucesso">
            <strong>3. Lembrete:</strong> faça o depósito na conta do fundo e <strong>anexe o comprovante bancário à carta</strong> antes de entregá-la ao conselho. Depois, reporte a doação no app.
          </p>
          <Link to={`/reportar?entidade=${e.id}&carta=${cartaId}${familiar ? `&familiar=${familiar.id}` : ''}`} className="botao-primario">
            Reportar a doação
          </Link>
        </section>
      )}
    </div>
  )
}

export function VerificarCarta() {
  const { codigo } = useParams()
  const b = useBanco()
  const c = b.cartas.find((x) => x.codigo === codigo)
  const e = c && b.entidades.find((x) => x.id === c.entidadeId)
  return (
    <div className="flex min-h-dvh items-center justify-center bg-fundo p-4">
      <div className="cartao max-w-md space-y-3 text-center">
        <Mascote variante={c ? 'comemorando' : 'pensando'} tamanho={100} className="mx-auto" />
        <h1 className="titulo-pagina">{c ? 'Carta autêntica' : 'Carta não encontrada'}</h1>
        {c && e ? (
          <p className="text-sm text-suave">
            Código {c.codigo}, emitida em {data(c.emitidaEm)} pelo app Rede Solidária WEG, com indicação ao projeto {e.projetoChancelado} ({e.razaoSocial}).
          </p>
        ) : (
          <p className="text-sm text-suave">Confira o código impresso na carta. No protótipo, a verificação consulta os dados deste navegador.</p>
        )}
      </div>
    </div>
  )
}

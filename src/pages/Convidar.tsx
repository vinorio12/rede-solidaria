import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Link } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { enviarConvites, gerarLinkConvidado, linkConvidadoDe, renovarLinkConvidado, simularAceite } from '@/domain/servicos'
import { Icone } from '@/components/Icone'
import { Abas, CabecalhoPagina, Campo } from '@/components/ui'
import { avisar, confete, tentar } from '@/components/Feedback'
import { data } from '@/lib/datas'
import { urlInterna } from '@/lib/ambiente'

const MENSAGENS = {
  colega: (link: string) =>
    `Oi! Eu participo da Rede Solidária WEG: destino parte do meu Imposto de Renda para os fundos da criança e do idoso, sem custo adicional, e o recurso fica na nossa cidade. Entre pelo app e faça parte também: ${link}`,
  familiar: (link: string) =>
    `Oi! Lembra que dá para destinar parte do Imposto de Renda para projetos da nossa cidade, sem pagar nada a mais? Eu participo pela Rede Solidária da WEG e você pode participar como meu convidado: ${link}`,
}

export function Convidar() {
  const u = useUsuario()
  const b = useBanco()
  const link = `${location.origin}/convite/${u.codigoConvite}`
  const [qr, setQr] = useState('')
  const [tipo, setTipo] = useState<'colega' | 'familiar'>('colega')
  const [msg, setMsg] = useState(MENSAGENS.colega(link))
  const [lote, setLote] = useState('')
  const convites = b.convites.filter((c) => c.usuarioId === u.id).sort((a, c) => c.em.localeCompare(a.em))
  const cfg = b.configuracoes
  const xpAceite = cfg.tabelaXp.conviteAceito
  const xpConvidado = cfg.tabelaXp.reporteConvidado
  const linkConv = linkConvidadoDe(b, u.id)
  const urlConvidado = linkConv ? urlInterna(`/r/${linkConv.codigo}`) : ''
  const [qrConvidado, setQrConvidado] = useState('')
  const usadosConvidado = b.reportes.filter((r) => r.usuarioId === u.id && r.convidado && r.ciclo === cfg.cicloAtivo && r.status !== 'recusado_colaborador').length

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: '#00325C', light: '#FFFFFF' } }).then(setQr)
  }, [link])
  useEffect(() => setMsg(MENSAGENS[tipo](link)), [tipo, link])
  useEffect(() => {
    if (urlConvidado) QRCode.toDataURL(urlConvidado, { margin: 1, width: 360, color: { dark: '#00325C', light: '#FFFFFF' } }).then(setQrConvidado)
  }, [urlConvidado])

  const copiar = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt)
      avisar('Copiado.')
    } catch {
      avisar('Não foi possível copiar. Selecione e copie o texto manualmente.', 'alerta')
    }
  }

  const contatos = lote.split(/[\s,;]+/).filter(Boolean)
  const totais = { enviados: convites.length, aceitos: convites.filter((c) => c.status !== 'enviado').length, reportaram: convites.filter((c) => c.status === 'reportou').length }

  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Convidar" subtitulo={`+${xpAceite} XP por colega que aceita o convite e +${xpConvidado} XP por reporte de convidado validado.`} />

      <section id="link-convidado" className="cartao scroll-mt-24 space-y-3 border-rs-azul/40">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-titulo text-lg font-bold text-weg-900">Link de reporte de convidado</h2>
            <p className="text-sm text-suave">
              Amigos, vizinhos e familiares não cadastrados reportam a destinação em seu nome, sem criar conta. Você confirma e o XP vem para você. {usadosConvidado}/{cfg.convidados.limitePorEdicao} nesta edição.
            </p>
          </div>
          <Link to="/convidados" className="botao-secundario">
            Ver reportes de convidados
          </Link>
        </div>
        {linkConv ? (
          <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
            {qrConvidado && <img src={qrConvidado} alt="QR Code do seu link de convidado" width={150} height={150} className="mx-auto rounded-xl border border-borda" />}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="campo text-sm" readOnly value={urlConvidado} aria-label="Link de convidado" onFocus={(e) => e.target.select()} />
                <button className="botao-secundario" onClick={() => copiar(urlConvidado)} aria-label="Copiar link de convidado">
                  <Icone nome="copiar" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="botao-primario" href={`https://wa.me/?text=${encodeURIComponent(`Oi! Se você destinou parte do IR aos fundos da criança ou do idoso, reporte por este link para eu registrar na Rede Solidária WEG (leva 2 minutos, sem cadastro): ${urlConvidado}`)}`} target="_blank" rel="noreferrer">
                  <Icone nome="mensagem" /> Enviar por WhatsApp
                </a>
                <button className="botao-fantasma" onClick={() => tentar(() => renovarLinkConvidado(u.id), 'Link renovado. O anterior deixou de funcionar.')}>
                  Gerar novo link
                </button>
              </div>
              <p className="text-xs text-suave">Proteções: limite de envios por link e por aparelho por dia, validação do arquivo e confirmação sua antes da Seção DS.</p>
            </div>
          </div>
        ) : (
          <button className="botao-primario" onClick={() => tentar(() => gerarLinkConvidado(u.id), 'Link de convidado criado.')}>
            Gerar meu link de convidado
          </button>
        )}
      </section>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <section className="cartao flex flex-col items-center gap-3 text-center">
          <h2 className="font-titulo font-bold text-weg-900">Seu link e QR Code</h2>
          {qr && <img src={qr} alt="QR Code do seu convite" width={180} height={180} className="rounded-xl border border-borda" />}
          <p className="text-sm">
            Código: <strong className="font-titulo text-rs-azul">{u.codigoConvite}</strong>
          </p>
          <div className="flex w-full gap-2">
            <input className="campo text-sm" readOnly value={link} aria-label="Link de convite" onFocus={(e) => e.target.select()} />
            <button className="botao-secundario" onClick={() => copiar(link)} aria-label="Copiar link">
              <Icone nome="copiar" />
            </button>
          </div>
        </section>

        <section className="cartao space-y-3">
          <h2 className="font-titulo font-bold text-weg-900">Mensagem pronta</h2>
          <Abas
            rotulo="Para quem"
            ativa={tipo}
            aoMudar={setTipo}
            abas={[
              { id: 'colega', nome: 'Para colega' },
              { id: 'familiar', nome: 'Para familiar' },
            ]}
          />
          <textarea className="campo min-h-32" value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Texto do convite" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <a className="botao-primario" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
              <Icone nome="mensagem" /> WhatsApp
            </a>
            <a className="botao-primario" href={`https://teams.microsoft.com/l/chat/0/0?message=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
              <Icone nome="mensagem" /> Teams
            </a>
            <a className="botao-primario" href={`mailto:?subject=${encodeURIComponent('Convite: Rede Solidária WEG')}&body=${encodeURIComponent(msg)}`}>
              <Icone nome="email" /> E-mail
            </a>
            <button className="botao-secundario" onClick={() => copiar(msg)}>
              <Icone nome="copiar" /> Copiar
            </button>
          </div>
        </section>
      </div>

      <section className="cartao space-y-3">
        <h2 className="font-titulo font-bold text-weg-900">Envio em lote por e-mail</h2>
        <Campo rotulo={`Até ${cfg.limiteLoteConvites} e-mails por vez, separados por vírgula ou linha`} ajuda={`Limite de ${cfg.limiteConvitesDia} convites por dia para evitar spam.`}>
          <textarea className="campo min-h-24" value={lote} onChange={(e) => setLote(e.target.value)} placeholder="colega@weg.net, familiar@email.com" />
        </Campo>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm ${contatos.length > cfg.limiteLoteConvites ? 'font-bold text-alerta' : 'text-suave'}`}>
            {contatos.length}/{cfg.limiteLoteConvites} contatos
          </span>
          <button
            className="botao-primario"
            disabled={!contatos.length || contatos.length > cfg.limiteLoteConvites}
            onClick={() => {
              const n = tentar(() => enviarConvites(u.id, contatos, 'email', tipo))
              if (n) {
                avisar(`${n} convite(s) enviado(s).`)
                setLote('')
              }
            }}
          >
            Enviar convites
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-titulo text-lg font-bold text-weg-900">Meus convites</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Enviados', totais.enviados],
            ['Aceitos', totais.aceitos],
            ['Reportaram', totais.reportaram],
          ].map(([r, n]) => (
            <div key={r} className="cartao p-3 text-center">
              <p className="font-titulo text-2xl font-bold text-rs-azul">{n}</p>
              <p className="text-xs text-suave">{r}</p>
            </div>
          ))}
        </div>
        <ul className="cartao divide-y divide-borda p-0">
          {convites.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{c.contato}</span>
              <span className="text-suave">{data(c.em)}</span>
              <span className={`chip ${c.status === 'reportou' ? 'bg-sucesso-claro text-sucesso' : c.status === 'aceito' ? 'bg-rs-ciano-claro text-weg-900' : 'bg-fundo text-suave'}`}>
                {c.status === 'reportou' ? 'Reportou' : c.status === 'aceito' ? 'Aceito' : 'Enviado'}
              </span>
              {c.status === 'enviado' && (
                <button
                  className="text-xs font-semibold text-rs-azul underline"
                  onClick={() => {
                    simularAceite(c.id)
                    confete()
                    avisar(`Convite aceito: +${xpAceite} XP`)
                  }}
                  title="No protótipo, simula o primeiro acesso do convidado"
                >
                  Simular aceite
                </button>
              )}
            </li>
          ))}
          {!convites.length && <li className="px-4 py-3 text-sm text-suave">Você ainda não enviou convites.</li>}
        </ul>
      </section>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSessao } from '@/auth/AuthContext'
import { cadastrarConvidado, emailWegValido, ErroRegra } from '@/domain/servicos'
import { Mascote } from '@/components/Mascote'
import { Aviso, Campo } from '@/components/ui'
import { avisar } from '@/components/Feedback'
import { TermoLgpd } from '@/components/TermoLgpd'
import { useBanco } from '@/data/useBanco'

export function CadastroConvidado() {
  const { codigo = '' } = useParams()
  const banco = useBanco()
  const { entrar } = useSessao()
  const nav = useNavigate()
  const anfitriao = banco.usuarios.find((u) => u.codigoConvite === codigo.toUpperCase())
  const [f, setF] = useState({ nome: '', email: '', padrinhoEmail: anfitriao?.email.endsWith('@weg.net') ? anfitriao.email : '', municipio: 'Jaraguá do Sul', codigo })
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState('')
  const padrinhoInvalido = f.padrinhoEmail.length > 3 && !emailWegValido(f.padrinhoEmail)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro('')
    try {
      const u = cadastrarConvidado(f)
      await entrar(u.id)
      avisar('Cadastro criado. Seu padrinho foi avisado para aprovar o vínculo.')
      nav('/')
    } catch (x) {
      setErro(x instanceof ErroRegra ? x.message : 'Não foi possível concluir o cadastro.')
    }
  }

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="min-h-dvh bg-fundo px-4 py-6">
      <form onSubmit={enviar} className="cartao mx-auto max-w-lg space-y-4 p-5" noValidate>
        <div className="flex items-center gap-3">
          <Mascote variante="acenando" tamanho={84} />
          <div>
            <h1 className="titulo-pagina">Cadastro de convidado</h1>
            <p className="text-sm text-suave">Familiares e amigos de colaboradores WEG também podem participar.</p>
          </div>
        </div>
        {anfitriao && <Aviso>Você foi convidado(a) por {anfitriao.nome}.</Aviso>}
        <Campo rotulo="Nome completo">
          <input className="campo" required value={f.nome} onChange={set('nome')} autoComplete="name" />
        </Campo>
        <Campo rotulo="Seu e-mail pessoal">
          <input className="campo" type="email" required value={f.email} onChange={set('email')} autoComplete="email" />
        </Campo>
        <Campo rotulo="E-mail do padrinho (colaborador WEG)" ajuda="Precisa terminar em @weg.net. O padrinho aprova o seu cadastro e cada reporte.">
          <input
            className="campo"
            type="email"
            required
            value={f.padrinhoEmail}
            onChange={set('padrinhoEmail')}
            aria-invalid={padrinhoInvalido}
            placeholder="nome.sobrenome@weg.net"
          />
        </Campo>
        {padrinhoInvalido && <Aviso tipo="alerta">O e-mail do padrinho precisa ser @weg.net.</Aviso>}
        <Campo rotulo="Município onde mora">
          <input className="campo" required value={f.municipio} onChange={set('municipio')} />
        </Campo>
        <Campo rotulo="Código de convite (opcional)">
          <input className="campo uppercase" value={f.codigo} onChange={set('codigo')} />
        </Campo>
        <TermoLgpd aceite={aceite} aoMudar={setAceite} />
        {erro && <Aviso tipo="alerta">{erro}</Aviso>}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button className="botao-primario flex-1" disabled={!aceite || !f.nome || !f.email || !emailWegValido(f.padrinhoEmail)}>
            Criar cadastro
          </button>
          <Link to="/login" className="botao-secundario">
            Voltar
          </Link>
        </div>
      </form>
    </div>
  )
}

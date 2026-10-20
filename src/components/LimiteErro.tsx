import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Mascote } from './Mascote'
import { arquivoLocal } from '@/lib/ambiente'

// Limite de erro (ErrorBoundary): um erro em uma tela mostra uma mensagem
// amigável em vez de derrubar o app inteiro e deixar a tela branca.

interface Props {
  children: ReactNode
  /** Muda a cada navegação: o limite é reiniciado ao trocar de página. */
  chave?: string
  /** Substitui a tela padrão (ex.: o visualizador 3D cai para a imagem 2D). */
  alternativa?: ReactNode
  local?: boolean
}

interface Estado {
  erro: Error | null
  chave?: string
}

export class LimiteErro extends Component<Props, Estado> {
  state: Estado = { erro: null, chave: this.props.chave }

  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }

  static getDerivedStateFromProps(props: Props, estado: Estado) {
    return props.chave !== estado.chave ? { erro: null, chave: props.chave } : null
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.warn('[Rede Solidária] erro capturado na interface:', erro.message, info.componentStack?.split('\n').slice(0, 4).join(' '))
  }

  render() {
    if (!this.state.erro) return this.props.children
    if (this.props.alternativa !== undefined) return this.props.alternativa
    return (
      <div role="alert" className={`flex flex-col items-center gap-3 p-6 text-center ${this.props.local ? '' : 'min-h-[50vh] justify-center'}`}>
        <Mascote variante="pensando" tamanho={110} />
        <h1 className="font-titulo text-xl font-bold text-weg-900">Ops, esta tela não carregou</h1>
        <p className="max-w-sm text-suave">O leãozinho tropeçou em algo por aqui. Tente de novo; o restante do app continua funcionando.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="botao-primario" onClick={() => this.setState({ erro: null })}>
            Tentar novamente
          </button>
          {!this.props.local && (
            <a className="botao-secundario" href={arquivoLocal ? '#/' : '/'}>
              Ir para o início
            </a>
          )}
        </div>
      </div>
    )
  }
}

/** Limite por rota: reinicia sozinho quando o usuário navega para outra página. */
export function LimiteRota({ children }: { children: ReactNode }) {
  const loc = useLocation()
  return <LimiteErro chave={loc.pathname}>{children}</LimiteErro>
}

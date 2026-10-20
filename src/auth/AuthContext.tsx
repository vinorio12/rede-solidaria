import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useBanco } from '@/data/useBanco'
import type { Usuario } from '@/domain/types'
import { prepararMissoes } from '@/domain/servicos'

// Camada de autenticação abstrata. Nesta versão o login é simulado por um
// seletor de perfis de teste; o SSO corporativo WEG entra implementando
// `ProvedorAutenticacao` e trocando `provedorSimulado` em `AuthProvider`.

export interface ProvedorAutenticacao {
  nome: string
  sessaoAtual(): string | null
  entrar(usuarioId: string): Promise<string>
  sair(): Promise<void>
}

const CHAVE_SESSAO = 'rede-solidaria:sessao'

export const provedorSimulado: ProvedorAutenticacao = {
  nome: 'Login simulado (protótipo)',
  sessaoAtual: () => {
    try {
      return localStorage.getItem(CHAVE_SESSAO)
    } catch {
      return null
    }
  },
  async entrar(usuarioId) {
    try {
      localStorage.setItem(CHAVE_SESSAO, usuarioId)
    } catch {
      /* sessão só em memória */
    }
    return usuarioId
  },
  async sair() {
    try {
      localStorage.removeItem(CHAVE_SESSAO)
    } catch {
      /* nada a limpar */
    }
  },
}

interface Sessao {
  usuario: Usuario | null
  provedor: ProvedorAutenticacao
  entrar(usuarioId: string): Promise<void>
  sair(): Promise<void>
}

const Ctx = createContext<Sessao | null>(null)

export function AuthProvider({ children, provedor = provedorSimulado }: { children: ReactNode; provedor?: ProvedorAutenticacao }) {
  const banco = useBanco()
  const [uid, setUid] = useState<string | null>(() => provedor.sessaoAtual())
  const usuario = useMemo(() => banco.usuarios.find((u) => u.id === uid) ?? null, [banco, uid])

  const entrar = useCallback(async (id: string) => setUid(await provedor.entrar(id)), [provedor])
  const sair = useCallback(async () => {
    await provedor.sair()
    setUid(null)
  }, [provedor])

  useEffect(() => {
    document.documentElement.dataset.tema = usuario?.avatar.tema ?? ''
  }, [usuario?.avatar.tema])

  // diárias e semanais são sorteadas no primeiro acesso do dia/semana
  useEffect(() => {
    if (usuario && usuario.perfil !== 'admin') prepararMissoes(usuario.id)
  }, [usuario?.id, usuario?.perfil])

  return <Ctx.Provider value={{ usuario, provedor, entrar, sair }}>{children}</Ctx.Provider>
}

export function useSessao() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useSessao fora do AuthProvider')
  return s
}

/** Usuário logado (as rotas protegidas garantem que existe). */
export function useUsuario() {
  const { usuario } = useSessao()
  if (!usuario) throw new Error('Sem usuário na sessão')
  return usuario
}

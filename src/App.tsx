import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useSessao } from '@/auth/AuthContext'
import { Layout } from '@/components/Layout'
import { CamadaFeedback } from '@/components/Feedback'
import { Mascote } from '@/components/Mascote'
import type { Perfil } from '@/domain/types'
import { Login } from '@/pages/Login'
import { CadastroConvidado } from '@/pages/CadastroConvidado'
import { Inicio } from '@/pages/Inicio'
import { Reportar } from '@/pages/Reportar'
import { DetalheReporte, MeusReportes } from '@/pages/MeusReportes'
import { Familia } from '@/pages/Familia'
import { Padrinho } from '@/pages/Padrinho'
import { Notificacoes } from '@/pages/Notificacoes'
import { DetalheProjeto, Projetos } from '@/pages/Projetos'
import { CartaDestinacao, DetalheEntidade, Entidades, VerificarCarta } from '@/pages/Entidades'
import { Missoes } from '@/pages/Missoes'
import { Ranking } from '@/pages/Ranking'
import { Recompensas } from '@/pages/Recompensas'
import { Pins } from '@/pages/Pins'
import { Convidar } from '@/pages/Convidar'
import { Guia } from '@/pages/Guia'
import { Perfil as PaginaPerfil } from '@/pages/Perfil'

// Painel administrativo carregado sob demanda
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard').then((m) => ({ default: m.Dashboard })))
const Validacao = lazy(() => import('@/pages/admin/Validacao').then((m) => ({ default: m.Validacao })))
const MetaCiclo = lazy(() => import('@/pages/admin/MetaCiclo').then((m) => ({ default: m.MetaCiclo })))
const Cadastros = lazy(() => import('@/pages/admin/Cadastros').then((m) => ({ default: m.Cadastros })))
const Importacao = lazy(() => import('@/pages/admin/Importacao').then((m) => ({ default: m.Importacao })))
const Gamificacao = lazy(() => import('@/pages/admin/Gamificacao').then((m) => ({ default: m.Gamificacao })))
const Usuarios = lazy(() => import('@/pages/admin/Usuarios').then((m) => ({ default: m.Usuarios })))
const Relatorios = lazy(() => import('@/pages/admin/Relatorios').then((m) => ({ default: m.Relatorios })))
const Auditoria = lazy(() => import('@/pages/admin/Auditoria').then((m) => ({ default: m.Auditoria })))

const INTERNOS: Perfil[] = ['colaborador', 'embaixador', 'admin']

/** Controle de acesso por perfil em todas as rotas. */
function Protegida({ children, perfis }: { children: ReactNode; perfis?: Perfil[] }) {
  const { usuario } = useSessao()
  const loc = useLocation()
  if (!usuario) return <Navigate to="/login" replace state={{ de: loc.pathname }} />
  if (perfis && !perfis.includes(usuario.perfil)) return <Navigate to="/" replace />
  return <>{children}</>
}

function Carregando() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <Mascote variante="pensando" tamanho={90} />
      <span className="sr-only">Carregando</span>
    </div>
  )
}

function Rotas() {
  const { usuario } = useSessao()
  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/cadastro-convidado" element={<CadastroConvidado />} />
      <Route path="/convite/:codigo" element={usuario ? <Navigate to="/" replace /> : <CadastroConvidado />} />
      <Route path="/verificar/:codigo" element={<VerificarCarta />} />
      <Route
        element={
          <Protegida>
            <Layout />
          </Protegida>
        }
      >
        <Route index element={<Inicio />} />
        <Route path="reportar" element={<Reportar />} />
        <Route path="reportes" element={<MeusReportes />} />
        <Route path="reportes/:id" element={<DetalheReporte />} />
        <Route path="projetos" element={<Projetos />} />
        <Route path="projetos/:id" element={<DetalheProjeto />} />
        <Route path="entidades" element={<Entidades />} />
        <Route path="entidades/:id" element={<DetalheEntidade />} />
        <Route path="entidades/:id/carta" element={<CartaDestinacao />} />
        <Route path="missoes" element={<Missoes />} />
        <Route path="guia" element={<Guia />} />
        <Route path="perfil" element={<PaginaPerfil />} />
        <Route path="notificacoes" element={<Notificacoes />} />
        <Route path="ranking" element={<Protegida perfis={INTERNOS}><Ranking /></Protegida>} />
        <Route path="recompensas" element={<Protegida perfis={INTERNOS}><Recompensas /></Protegida>} />
        <Route path="pins" element={<Protegida perfis={INTERNOS}><Pins /></Protegida>} />
        <Route path="convidar" element={<Protegida perfis={INTERNOS}><Convidar /></Protegida>} />
        <Route path="familia" element={<Protegida perfis={INTERNOS}><Familia /></Protegida>} />
        <Route path="padrinho" element={<Protegida perfis={INTERNOS}><Padrinho /></Protegida>} />
        <Route
          path="admin"
          element={
            <Protegida perfis={['admin']}>
              <Suspense fallback={<Carregando />}>
                <AdminLayout />
              </Suspense>
            </Protegida>
          }
        >
          {[
            ['', Dashboard],
            ['validacao', Validacao],
            ['ciclo', MetaCiclo],
            ['cadastros', Cadastros],
            ['importacao', Importacao],
            ['gamificacao', Gamificacao],
            ['usuarios', Usuarios],
            ['relatorios', Relatorios],
            ['auditoria', Auditoria],
          ].map(([caminho, C]) => {
            const Pagina = C as typeof Dashboard
            const el = (
              <Suspense fallback={<Carregando />}>
                <Pagina />
              </Suspense>
            )
            return caminho ? <Route key={caminho as string} path={caminho as string} element={el} /> : <Route key="index" index element={el} />
          })}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

// Aberto direto do disco (file://) não há servidor para as rotas: usa rotas com #.
const Roteador = location.protocol === 'file:' ? HashRouter : BrowserRouter

export function App() {
  return (
    <Roteador>
      <AuthProvider>
        <Rotas />
        <CamadaFeedback />
      </AuthProvider>
    </Roteador>
  )
}

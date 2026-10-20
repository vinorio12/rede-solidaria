import { Suspense, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useSessao } from '@/auth/AuthContext'
import { Layout } from '@/components/Layout'
import { CamadaFeedback } from '@/components/Feedback'
import { CamadaJogo } from '@/components/Jogo'
import { Mascote } from '@/components/Mascote'
import { LimiteErro, LimiteRota } from '@/components/LimiteErro'
import { lazyComNovaTentativa } from '@/lib/carregar'
import type { Perfil } from '@/domain/types'
import { Login } from '@/pages/Login'
import { Inicio } from '@/pages/Inicio'
import { Reportar } from '@/pages/Reportar'
import { DetalheReporte, MeusReportes } from '@/pages/MeusReportes'
import { Familia } from '@/pages/Familia'
import { Notificacoes } from '@/pages/Notificacoes'
import { DetalheProjeto, Projetos } from '@/pages/Projetos'
import { CartaDestinacao, DetalheEntidade, Entidades, VerificarCarta } from '@/pages/Entidades'
import { Missoes } from '@/pages/Missoes'
import { Ranking } from '@/pages/Ranking'
import { Guia } from '@/pages/Guia'
import { Perfil as PaginaPerfil } from '@/pages/Perfil'
import { FormularioConvidado } from '@/pages/FormularioConvidado'
import { arquivoLocal } from '@/lib/ambiente'

// Telas carregadas sob demanda (com nova tentativa se o download falhar)
const Recompensas = lazyComNovaTentativa(() => import('@/pages/Recompensas').then((m) => m.Recompensas))
const Pins = lazyComNovaTentativa(() => import('@/pages/Pins').then((m) => m.Pins))
const Convidar = lazyComNovaTentativa(() => import('@/pages/Convidar').then((m) => m.Convidar))
const ReportesConvidados = lazyComNovaTentativa(() => import('@/pages/ReportesConvidados').then((m) => m.ReportesConvidados))
const Conquistas = lazyComNovaTentativa(() => import('@/pages/Conquistas').then((m) => m.Conquistas))
const Trilha = lazyComNovaTentativa(() => import('@/pages/Trilha').then((m) => m.Trilha))
const Loja = lazyComNovaTentativa(() => import('@/pages/Loja').then((m) => m.Loja))
const Personalizar = lazyComNovaTentativa(() => import('@/pages/Personalizar').then((m) => m.Personalizar))
const Alcateia = lazyComNovaTentativa(() => import('@/pages/Alcateia').then((m) => m.Alcateia))
const Mural = lazyComNovaTentativa(() => import('@/pages/Mural').then((m) => m.Mural))

const AdminLayout = lazyComNovaTentativa(() => import('@/pages/admin/AdminLayout').then((m) => m.AdminLayout))
const Dashboard = lazyComNovaTentativa(() => import('@/pages/admin/Dashboard').then((m) => m.Dashboard))
const Validacao = lazyComNovaTentativa(() => import('@/pages/admin/Validacao').then((m) => m.Validacao))
const MetaCiclo = lazyComNovaTentativa(() => import('@/pages/admin/MetaCiclo').then((m) => m.MetaCiclo))
const Cadastros = lazyComNovaTentativa(() => import('@/pages/admin/Cadastros').then((m) => m.Cadastros))
const Importacao = lazyComNovaTentativa(() => import('@/pages/admin/Importacao').then((m) => m.Importacao))
const Gamificacao = lazyComNovaTentativa(() => import('@/pages/admin/Gamificacao').then((m) => m.Gamificacao))
const Analytics = lazyComNovaTentativa(() => import('@/pages/admin/Analytics').then((m) => m.Analytics))
const CartaInstitucional = lazyComNovaTentativa(() => import('@/pages/admin/CartaInstitucional').then((m) => m.CartaInstitucional))
const Usuarios = lazyComNovaTentativa(() => import('@/pages/admin/Usuarios').then((m) => m.Usuarios))
const Relatorios = lazyComNovaTentativa(() => import('@/pages/admin/Relatorios').then((m) => m.Relatorios))
const Auditoria = lazyComNovaTentativa(() => import('@/pages/admin/Auditoria').then((m) => m.Auditoria))

/** Controle de acesso por perfil em todas as rotas. O app é exclusivo para colaboradores WEG. */
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

const ADMIN: [string, React.ComponentType][] = [
  ['', Dashboard],
  ['validacao', Validacao],
  ['ciclo', MetaCiclo],
  ['cadastros', Cadastros],
  ['importacao', Importacao],
  ['gamificacao', Gamificacao],
  ['analytics', Analytics],
  ['carta', CartaInstitucional],
  ['usuarios', Usuarios],
  ['relatorios', Relatorios],
  ['auditoria', Auditoria],
]

function Rotas() {
  const { usuario } = useSessao()
  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      {/* única rota sem login: o formulário de reporte de convidado (seção 2 do prompt v2) */}
      <Route path="/r/:codigo" element={<LimiteRota><FormularioConvidado /></LimiteRota>} />
      <Route path="/verificar/:codigo" element={<VerificarCarta />} />
      <Route path="/convite/:codigo" element={<Navigate to="/login" replace />} />
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
        <Route path="convidados" element={<ReportesConvidados />} />
        <Route path="projetos" element={<Projetos />} />
        <Route path="projetos/:id" element={<DetalheProjeto />} />
        <Route path="entidades" element={<Entidades />} />
        <Route path="entidades/:id" element={<DetalheEntidade />} />
        <Route path="entidades/:id/carta" element={<CartaDestinacao />} />
        <Route path="missoes" element={<Missoes />} />
        <Route path="guia" element={<Guia />} />
        <Route path="perfil" element={<PaginaPerfil />} />
        <Route path="notificacoes" element={<Notificacoes />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="recompensas" element={<Recompensas />} />
        <Route path="pins" element={<Pins />} />
        <Route path="convidar" element={<Convidar />} />
        <Route path="familia" element={<Familia />} />
        <Route path="conquistas" element={<Conquistas />} />
        <Route path="trilha" element={<Trilha />} />
        <Route path="loja" element={<Loja />} />
        <Route path="personalizar" element={<Personalizar />} />
        <Route path="alcateia" element={<Alcateia />} />
        <Route path="mural" element={<Mural />} />
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
          {ADMIN.map(([caminho, Pagina]) => {
            const el = (
              <Suspense fallback={<Carregando />}>
                <Pagina />
              </Suspense>
            )
            return caminho ? <Route key={caminho} path={caminho} element={el} /> : <Route key="index" index element={el} />
          })}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

// Aberto direto do disco (file://) não há servidor para as rotas: usa rotas com #.
const Roteador = arquivoLocal ? HashRouter : BrowserRouter

export function App() {
  return (
    <Roteador>
      <LimiteErro>
        <AuthProvider>
          <Rotas />
          <CamadaFeedback />
          <CamadaJogo />
        </AuthProvider>
      </LimiteErro>
    </Roteador>
  )
}

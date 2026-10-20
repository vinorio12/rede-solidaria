import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { Icone } from '@/components/Icone'

const ABAS = [
  { para: '/admin', nome: 'Dashboard', icone: 'grafico', fim: true },
  { para: '/admin/validacao', nome: 'Fila de validação', icone: 'check' },
  { para: '/admin/ciclo', nome: 'Meta e ciclo', icone: 'calendario' },
  { para: '/admin/cadastros', nome: 'Cadastros', icone: 'entidades' },
  { para: '/admin/importacao', nome: 'Importação', icone: 'upload' },
  { para: '/admin/gamificacao', nome: 'Gamificação', icone: 'estrela' },
  { para: '/admin/analytics', nome: 'Analytics', icone: 'grafico' },
  { para: '/admin/carta', nome: 'Carta institucional', icone: 'documento' },
  { para: '/admin/usuarios', nome: 'Usuários', icone: 'usuarios' },
  { para: '/admin/relatorios', nome: 'Relatórios', icone: 'tabela' },
  { para: '/admin/auditoria', nome: 'Auditoria', icone: 'documento' },
]

export function AdminLayout() {
  const u = useUsuario()
  const b = useBanco()
  if (u.perfil !== 'admin') return <Navigate to="/" replace />
  const fila = b.reportes.filter((r) => r.status === 'enviado' || r.status === 'em_validacao').length
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-rs-azul">Seção Desenvolvimento Social</p>
        <h1 className="titulo-pagina">Painel administrativo</h1>
      </div>
      <nav aria-label="Seções do painel" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex gap-1">
          {ABAS.map((a) => (
            <li key={a.para}>
              <NavLink
                to={a.para}
                end={a.fim}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-3 font-titulo text-sm font-bold ${isActive ? 'bg-rs-azul text-white' : 'bg-superficie text-weg-900 hover:bg-rs-ciano-claro'}`
                }
              >
                <Icone nome={a.icone} tamanho={18} />
                {a.nome}
                {a.para === '/admin/validacao' && fila > 0 && <span className="rounded-full bg-rs-ciano px-1.5 text-xs text-weg-900">{fila}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}

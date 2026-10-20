import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSessao, useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { t } from '@/i18n/pt-BR'
import type { Perfil } from '@/domain/types'
import { Icone } from './Icone'
import { Mascote } from './Mascote'
import { Esqueleto } from './ui'
import { LimiteRota } from './LimiteErro'
import { statusJogador } from '@/domain/consultas'
import { AvatarLeao } from './AvatarLeao'
import { Patinhas } from './Jogo'

interface ItemNav {
  para: string
  nome: string
  icone: string
  secao: 'principal' | 'jogo' | 'rede' | 'conta'
  perfis?: Perfil[]
}

export const ITENS: ItemNav[] = [
  { para: '/', nome: t.nav.inicio, icone: 'inicio', secao: 'principal' },
  { para: '/reportar', nome: t.nav.reportar, icone: 'reportar', secao: 'principal' },
  { para: '/missoes', nome: t.nav.missoes, icone: 'missoes', secao: 'principal' },
  { para: '/ranking', nome: t.nav.ranking, icone: 'ranking', secao: 'principal' },
  { para: '/perfil', nome: t.nav.perfil, icone: 'perfil', secao: 'principal' },
  { para: '/conquistas', nome: t.nav.conquistas, icone: 'estrela', secao: 'jogo' },
  { para: '/trilha', nome: t.nav.trilha, icone: 'grafico', secao: 'jogo' },
  { para: '/loja', nome: t.nav.loja, icone: 'recompensas', secao: 'jogo' },
  { para: '/personalizar', nome: t.nav.personalizar, icone: 'editar', secao: 'jogo' },
  { para: '/alcateia', nome: t.nav.alcateia, icone: 'usuarios', secao: 'jogo' },
  { para: '/mural', nome: t.nav.mural, icone: 'mensagem', secao: 'jogo' },
  { para: '/recompensas', nome: t.nav.recompensas, icone: 'pins', secao: 'jogo' },
  { para: '/pins', nome: t.nav.pins, icone: 'pins', secao: 'jogo' },
  { para: '/reportes', nome: t.nav.meusReportes, icone: 'documento', secao: 'rede' },
  { para: '/convidados', nome: t.nav.convidados, icone: 'convidar', secao: 'rede' },
  { para: '/convidar', nome: t.nav.convidar, icone: 'compartilhar', secao: 'rede' },
  { para: '/familia', nome: t.nav.familia, icone: 'familia', secao: 'rede' },
  { para: '/projetos', nome: t.nav.projetos, icone: 'projetos', secao: 'rede' },
  { para: '/entidades', nome: t.nav.entidades, icone: 'entidades', secao: 'rede' },
  { para: '/guia', nome: t.nav.guia, icone: 'guia', secao: 'rede' },
  { para: '/admin', nome: t.nav.admin, icone: 'admin', secao: 'conta', perfis: ['admin'] },
]

const SECOES: { id: ItemNav['secao']; nome?: string }[] = [
  { id: 'principal' },
  { id: 'jogo', nome: t.nav.secaoJogo },
  { id: 'rede', nome: t.nav.secaoRede },
  { id: 'conta', nome: t.nav.secaoConta },
]

const INFERIOR = ['/', '/reportar', '/missoes', '/ranking', '/perfil']

export function itensDoPerfil(perfil: Perfil) {
  return ITENS.filter((i) => !i.perfis || i.perfis.includes(perfil))
}

function MenuSecoes({ itens, aoClicar }: { itens: ItemNav[]; aoClicar?: () => void }) {
  return (
    <>
      {SECOES.map((s) => {
        const doGrupo = itens.filter((i) => i.secao === s.id)
        if (!doGrupo.length) return null
        return (
          <div key={s.id} className="flex flex-col gap-1">
            {s.nome && <p className="mt-2 px-3 text-[11px] font-bold uppercase tracking-widest text-white/50">{s.nome}</p>}
            {doGrupo.map((i) => (
              <NavLink key={i.para} to={i.para} end={i.para === '/'} className={linkCls} onClick={aoClicar}>
                <Icone nome={i.icone} />
                {i.nome}
              </NavLink>
            ))}
          </div>
        )
      })}
    </>
  )
}

function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Rede Solidária WEG, página inicial">
      <Mascote tamanho={40} decorativo />
      <span className={`font-titulo leading-tight ${claro ? 'text-white' : 'text-weg-900'}`}>
        <span className="block text-base font-bold">Rede Solidária</span>
        <span className="block text-[11px] font-bold tracking-[0.2em] opacity-80">WEG</span>
      </span>
    </Link>
  )
}

function Sino() {
  const banco = useBanco()
  const u = useUsuario()
  const n = banco.notificacoes.filter((x) => x.usuarioId === u.id && !x.lida).length
  return (
    <Link to="/notificacoes" className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10" aria-label={`${t.nav.notificacoes}${n ? `, ${n} não lidas` : ''}`}>
      <Icone nome="sino" />
      {n > 0 && <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rs-ciano px-1 text-[11px] font-bold text-weg-900">{n > 9 ? '9+' : n}</span>}
    </Link>
  )
}

function linkCls({ isActive }: { isActive: boolean }) {
  return `flex min-h-11 items-center gap-3 rounded-xl px-3 font-titulo text-sm font-bold transition ${isActive ? 'bg-white text-weg-900' : 'text-white/85 hover:bg-white/10 hover:text-white'}`
}

export function Layout() {
  const u = useUsuario()
  const banco = useBanco()
  const { sair } = useSessao()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const itens = itensDoPerfil(u.perfil)
  const inferior = INFERIOR.map((p) => ITENS.find((i) => i.para === p)!)
  const st = statusJogador(banco, u.id)

  useEffect(() => setMenu(false), [loc.pathname])
  useEffect(() => window.scrollTo({ top: 0 }), [loc.pathname])

  return (
    <div className="min-h-dvh md:flex">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded-lg focus:bg-white focus:p-2">
        Pular para o conteúdo
      </a>

      {/* Menu lateral (computador) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 overflow-y-auto bg-weg-900 p-4 md:flex" aria-label="Menu principal">
        <div className="rounded-xl bg-white p-2">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1" aria-label="Seções do app">
          <MenuSecoes itens={itens} />
        </nav>
        <div className="mt-auto flex items-center gap-2 rounded-xl bg-white/10 p-2 text-white">
          <AvatarLeao avatar={u.avatar} tamanho={40} estrelas={st.prestigio.estrelas} />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-bold">{u.nome}</p>
            <p className="truncate text-white/70">{u.perfil === 'admin' ? t.perfil.admin : `Nível ${st.atual.nivel} · ${st.titulo}`}</p>
          </div>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10" onClick={() => sair()} aria-label={t.nav.sair}>
            <Icone nome="sair" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-2 bg-weg-900 px-3 py-2 md:justify-end md:px-6" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
          <div className="rounded-xl bg-white px-2 py-1 md:hidden">
            <Logo />
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-2 hidden rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white lg:inline">{t.app.exemplo}</span>
            {u.perfil !== 'admin' && (
              <Link to="/loja" className="mr-1 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-white hover:bg-white/10" aria-label={`${st.patinhas} Patinhas e ${st.xp} XP`}>
                <Patinhas valor={st.patinhas} className="text-[#F5D67A]" />
                <span className="hidden font-titulo text-sm font-bold text-rs-ciano sm:inline">Nv {st.atual.nivel}</span>
              </Link>
            )}
            <Sino />
            <button className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10 md:hidden" onClick={() => setMenu(true)} aria-label={t.nav.menu} aria-expanded={menu}>
              <Icone nome="menu" />
            </button>
          </div>
        </header>

        <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-6">
          <LimiteRota>
            <Suspense fallback={<Esqueleto />}>
              <Outlet />
            </Suspense>
          </LimiteRota>
        </main>
      </div>

      {/* Navegação inferior fixa (celular) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-superficie md:hidden" aria-label="Navegação principal">
        <ul className="grid grid-cols-5">
          {inferior.map((i) => (
            <li key={i.para}>
              <NavLink
                to={i.para}
                end={i.para === '/'}
                className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${isActive ? 'text-rs-azul' : 'text-suave'}`}
              >
                {({ isActive }) => (
                  <>
                    <span className={`rounded-full px-3 py-0.5 ${isActive ? 'bg-rs-ciano-claro' : ''}`}>
                      <Icone nome={i.icone} />
                    </span>
                    {i.nome}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Menu completo (celular) */}
      {menu && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t.nav.menu}>
          <button className="absolute inset-0 bg-weg-900/60" aria-label={t.acoes.fechar} onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col gap-3 overflow-y-auto bg-weg-900 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <AvatarLeao avatar={u.avatar} tamanho={44} estrelas={st.prestigio.estrelas} />
                <div className="text-sm">
                  <p className="font-bold">{u.nome}</p>
                  <p className="text-white/70">{t.perfil[u.perfil]}</p>
                </div>
              </div>
              <button className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10" onClick={() => setMenu(false)} aria-label={t.acoes.fechar}>
                <Icone nome="fechar" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              <MenuSecoes itens={itens} aoClicar={() => setMenu(false)} />
              <button className={linkCls({ isActive: false })} onClick={() => sair()}>
                <Icone nome="sair" />
                {t.nav.sair}
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}

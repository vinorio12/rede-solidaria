import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSessao } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { restaurarExemplo } from '@/data/db'
import { Mascote } from '@/components/Mascote'
import { Icone } from '@/components/Icone'
import { t } from '@/i18n/pt-BR'
import { avisar } from '@/components/Feedback'
import fotoPin from '@/assets/pins/2026/foto-pin.png'

const PERFIS_TESTE = [
  { id: 'u_colab', titulo: 'Colaborador', texto: 'Acesso completo: reportes, família, missões, ranking e coleção de pins.' },
  { id: 'u_emb', titulo: 'Embaixador', texto: 'Tudo do colaborador, com selo e missões exclusivas.' },
  { id: 'u_admin', titulo: 'Administrador', texto: 'Painel da Seção Desenvolvimento Social.' },
]

export function Login() {
  const { entrar, provedor } = useSessao()
  const banco = useBanco()
  const nav = useNavigate()
  const [outro, setOutro] = useState('')

  const ir = async (id: string) => {
    await entrar(id)
    nav('/')
  }

  return (
    <div className="min-h-dvh bg-weg-900 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-[1fr_1.1fr] md:items-center md:py-16">
        <section className="text-center md:text-left">
          <div className="mx-auto inline-flex items-end gap-2 md:mx-0">
            <Mascote variante="acenando" tamanho={150} />
            <img src={fotoPin} alt="Pin Rede Solidária 2026, com o leãozinho azul" width={110} height={110} className="-ml-6 mb-2 drop-shadow-xl" />
          </div>
          <h1 className="mt-4 font-titulo text-3xl font-bold md:text-4xl">Rede Solidária</h1>
          <p className="mt-1 font-titulo text-sm font-bold tracking-[0.25em] text-rs-ciano">WEG · DESDE 2011</p>
          <p className="mt-4 max-w-md text-white/85 md:text-lg">
            Destine parte do seu Imposto de Renda aos fundos da criança, do adolescente e da pessoa idosa. Sem custo adicional, o recurso fica no seu município.
          </p>
        </section>

        <section className="rounded-3xl bg-superficie p-5 text-texto shadow-2xl md:p-6" aria-labelledby="entrar-titulo">
          <h2 id="entrar-titulo" className="font-titulo text-xl font-bold text-weg-900">
            Entrar
          </h2>
          <p className="mt-1 text-sm text-suave">
            {provedor.nome}. O login corporativo WEG será integrado em uma próxima etapa. Escolha um perfil de teste:
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {PERFIS_TESTE.map((p) => {
              const u = banco.usuarios.find((x) => x.id === p.id)
              return (
                <button key={p.id} onClick={() => ir(p.id)} className="cartao flex flex-col items-start gap-1 text-left transition hover:border-rs-azul hover:shadow-md" disabled={!u}>
                  <span className="font-titulo font-bold text-rs-azul">{p.titulo}</span>
                  <span className="text-sm font-semibold">{u?.nome}</span>
                  <span className="text-xs text-suave">{p.texto}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="rotulo">Ou entre como outro usuário de exemplo</span>
              <select className="campo" value={outro} onChange={(e) => setOutro(e.target.value)}>
                <option value="">Selecione</option>
                {banco.usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({t.perfil[u.perfil]})
                  </option>
                ))}
              </select>
            </label>
            <button className="botao-primario" disabled={!outro} onClick={() => ir(outro)}>
              Entrar
            </button>
          </div>

          <div className="mt-5 border-t border-borda pt-4 text-sm text-suave">
            <p className="font-semibold text-texto">Não é colaborador WEG?</p>
            <p className="mt-1">O app é exclusivo para colaboradores. Familiares e amigos reportam pelo link de convidado que o colaborador compartilha, sem precisar de cadastro.</p>
            <Link to="/r/CAMILA1" className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-rs-azul underline">
              <Icone nome="convidar" tamanho={18} /> Ver o formulário de convidado (exemplo)
            </Link>
          </div>
          <button
            className="botao-fantasma mt-3 w-full text-xs"
            onClick={() => {
              restaurarExemplo()
              avisar('Dados de exemplo restaurados.', 'info')
            }}
          >
            Restaurar dados de exemplo
          </button>
        </section>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { alcateiaDo, missoesDaAlcateiaNaSemana } from '@/domain/motor'
import { rankingPessoas } from '@/domain/ranking'
import { criarAlcateia, entrarAlcateia, sairAlcateia } from '@/domain/servicos'
import { AvatarLeao } from '@/components/AvatarLeao'
import { Mascote } from '@/components/Mascote'
import { BarraProgresso, CabecalhoPagina, Campo, Modal } from '@/components/ui'
import { confete, tentar } from '@/components/Feedback'
import { numero } from '@/lib/datas'
import { segundaSP } from '@/lib/tempo'

const EMBLEMAS = ['🦁', '🐾', '🌅', '🌊', '⚙️', '💙', '🌱', '⭐', '🛡️', '🔭']

export function Alcateia() {
  const u = useUsuario()
  const b = useBanco()
  const minha = alcateiaDo(b, u.id)
  const semana = segundaSP()
  const cfg = b.configuracoes.alcateiaConfig
  const [criar, setCriar] = useState(false)
  const [nome, setNome] = useState('')
  const [emblema, setEmblema] = useState(EMBLEMAS[0])

  if (minha) {
    const membros = b.alcateiaMembros.filter((m) => m.alcateiaId === minha.id)
    const feitas = missoesDaAlcateiaNaSemana(b, minha.id, semana)
    const ranking = rankingPessoas(b, { periodo: 'semana', alcateiaId: minha.id })
    const metasBatidas = new Set(b.eventos.filter((e) => e.tipo === 'alcateia_meta_batida' && e.dados.alcateiaId === minha.id && !e.estornado).map((e) => e.dados.semana)).size
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <CabecalhoPagina titulo={`${minha.emblema} ${minha.nome}`} subtitulo={`${membros.length}/${cfg.maxMembros} membros · ${metasBatidas} meta(s) semanal(is) batida(s)`} />
        <section className="cartao space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Meta coletiva da semana</span>
            <span>
              {feitas}/{minha.metaSemanal} missões
            </span>
          </div>
          <BarraProgresso valor={feitas} max={minha.metaSemanal} rotulo="Meta semanal da alcateia" altura="h-4" />
          <p className="text-xs text-suave">
            Toda missão concluída por um membro conta. Bateu a meta: +{cfg.bonusXp} XP e +{cfg.bonusPatinhas} Patinhas para todos. 4 semanas seguidas liberam a insígnia Alcateia Unida.
          </p>
        </section>
        <section className="cartao">
          <h2 className="mb-2 font-titulo font-bold text-weg-900">Ranking da alcateia nesta semana</h2>
          <ol className="divide-y divide-borda">
            {membros
              .map((m) => b.usuarios.find((x) => x.id === m.usuarioId)!)
              .map((p) => ({ p, linha: ranking.find((l) => l.usuarioId === p.id) }))
              .sort((a, c) => (c.linha?.xp ?? 0) - (a.linha?.xp ?? 0))
              .map(({ p, linha }, i) => (
                <li key={p.id} className={`flex items-center gap-3 py-2 ${p.id === u.id ? 'font-semibold' : ''}`}>
                  <span className="w-6 text-center font-titulo font-bold text-rs-azul">{i + 1}</span>
                  <AvatarLeao avatar={p.avatar} tamanho={36} />
                  <span className="min-w-0 flex-1 truncate">
                    {p.anonimo && p.id !== u.id ? 'Participante anônimo' : p.nome}
                    {p.id === minha.criadorId && <span className="ml-1 text-xs text-suave">(criou)</span>}
                  </span>
                  <span className="font-titulo font-bold">{numero(linha?.xp ?? 0)} XP</span>
                </li>
              ))}
          </ol>
        </section>
        <button className="botao-fantasma" onClick={() => confirm('Sair da alcateia?') && sairAlcateia(u.id)}>
          Sair da alcateia
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CabecalhoPagina
        titulo="Alcateias"
        subtitulo={`Equipes de até ${cfg.maxMembros} pessoas (setor, turno, turma) com meta semanal coletiva e ranking próprio.`}
        acao={
          <button className="botao-primario" onClick={() => setCriar(true)}>
            Criar alcateia
          </button>
        }
      />
      <div className="flex items-center gap-3 text-sm text-suave">
        <Mascote variante="apontando" tamanho={64} />
        Ninguém ruge sozinho. Entre em uma alcateia ou crie a sua.
      </div>
      <ul className="space-y-2">
        {b.alcateias
          .filter((a) => !a.oculta)
          .map((a) => {
            const n = b.alcateiaMembros.filter((m) => m.alcateiaId === a.id).length
            return (
              <li key={a.id} className="cartao flex items-center gap-3">
                <span className="text-3xl" aria-hidden>
                  {a.emblema}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.nome}</p>
                  <p className="text-sm text-suave">
                    {n}/{cfg.maxMembros} membros · meta de {a.metaSemanal} missões por semana
                  </p>
                </div>
                <button
                  className="botao-secundario"
                  disabled={n >= cfg.maxMembros}
                  onClick={() => {
                    if (tentar(() => entrarAlcateia(u.id, a.id), `Bem-vindo(a) à ${a.nome}!`) !== undefined) confete()
                  }}
                >
                  {n >= cfg.maxMembros ? 'Completa' : 'Entrar'}
                </button>
              </li>
            )
          })}
      </ul>
      <Modal aberto={criar} aoFechar={() => setCriar(false)} titulo="Nova alcateia">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (tentar(() => criarAlcateia(u.id, nome, emblema), 'Alcateia criada.') !== undefined) {
              confete()
              setCriar(false)
            }
          }}
        >
          <Campo rotulo="Nome (setor, turno ou turma)" ajuda="Nomes passam por moderação da Seção DS.">
            <input className="campo" required minLength={3} maxLength={30} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <fieldset>
            <legend className="rotulo">Emblema</legend>
            <div className="flex flex-wrap gap-2">
              {EMBLEMAS.map((e) => (
                <button key={e} type="button" aria-pressed={emblema === e} onClick={() => setEmblema(e)} className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${emblema === e ? 'bg-rs-ciano-claro ring-2 ring-rs-azul' : 'bg-fundo'}`}>
                  {e}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="botao-primario w-full">Criar</button>
        </form>
      </Modal>
    </div>
  )
}

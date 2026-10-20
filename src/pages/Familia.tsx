import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { removerFamiliar, salvarFamiliar } from '@/domain/servicos'
import type { Familiar } from '@/domain/types'
import { Mascote } from '@/components/Mascote'
import { Icone } from '@/components/Icone'
import { CabecalhoPagina, Campo, ChipStatus, Modal, Vazio } from '@/components/ui'
import { tentar } from '@/components/Feedback'
import { t } from '@/i18n/pt-BR'

type Edicao = Omit<Familiar, 'usuarioId' | 'id'> & { id?: string }

export function Familia() {
  const u = useUsuario()
  const b = useBanco()
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const familiares = b.familiares.filter((f) => f.usuarioId === u.id)
  const ciclo = b.configuracoes.cicloAtivo
  const temInsignia = b.usuarioInsignias.some((i) => i.usuarioId === u.id && i.insigniaId === 'familia_solidaria')

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CabecalhoPagina
        titulo={t.nav.familia}
        subtitulo="Reporte em nome de familiares. Cada destinação familiar validada soma XP para você e entra no total da WEG."
        acao={
          <button className="botao-primario" onClick={() => setEdicao({ nome: '', parentesco: 'conjuge', municipio: u.municipio })}>
            <Icone nome="mais" /> <span className="hidden sm:inline">Adicionar</span>
          </button>
        }
      />
      <div className="cartao flex items-center gap-3">
        <Mascote variante={temInsignia ? 'comemorando' : 'apontando'} tamanho={64} />
        <p className="text-sm">
          <strong>Insígnia Família Solidária:</strong>{' '}
          {temInsignia ? 'conquistada. Obrigado por levar a Rede para casa.' : 'conquiste quando 2 ou mais membros da família destinarem no mesmo ciclo.'}
        </p>
      </div>
      {!familiares.length && <Vazio texto="Nenhum familiar cadastrado ainda." variante="apontando" />}
      <ul className="space-y-2">
        {familiares.map((f) => {
          const reps = b.reportes.filter((r) => r.familiarId === f.id && r.ciclo === ciclo)
          return (
            <li key={f.id} className="cartao">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rs-ciano-claro text-rs-azul">
                  <Icone nome="perfil" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{f.nome}</p>
                  <p className="text-sm text-suave">
                    {t.parentesco[f.parentesco]} · {f.municipio}
                  </p>
                </div>
                <button className="botao-fantasma px-2" onClick={() => setEdicao(f)} aria-label={`Editar ${f.nome}`}>
                  <Icone nome="editar" />
                </button>
                <button className="botao-fantasma px-2" onClick={() => tentar(() => removerFamiliar(f.id), 'Familiar removido.')} aria-label={`Remover ${f.nome}`}>
                  <Icone nome="lixo" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {reps.length ? reps.map((r) => <ChipStatus key={r.id} status={r.status} />) : <span className="text-suave">Sem reporte neste ciclo.</span>}
                <Link to="/reportar" className="ml-auto font-semibold text-rs-azul underline">
                  Reportar
                </Link>
              </div>
            </li>
          )
        })}
      </ul>

      <Modal aberto={!!edicao} aoFechar={() => setEdicao(null)} titulo={edicao?.id ? 'Editar familiar' : 'Novo familiar'}>
        {edicao && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (tentar(() => salvarFamiliar({ ...edicao, usuarioId: u.id }), 'Familiar salvo.')) setEdicao(null)
            }}
          >
            <Campo rotulo="Nome">
              <input className="campo" required value={edicao.nome} onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })} />
            </Campo>
            <Campo rotulo="Parentesco">
              <select className="campo" value={edicao.parentesco} onChange={(e) => setEdicao({ ...edicao, parentesco: e.target.value as Familiar['parentesco'] })}>
                {Object.entries(t.parentesco).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Município">
              <input className="campo" required value={edicao.municipio} onChange={(e) => setEdicao({ ...edicao, municipio: e.target.value })} />
            </Campo>
            <button className="botao-primario w-full">{t.acoes.salvar}</button>
          </form>
        )}
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { atualizarConfiguracoes, salvarItem } from '@/domain/servicos'
import type { Ciclo, Configuracoes, Temporada } from '@/domain/types'
import { Aviso, Campo } from '@/components/ui'
import { avisar } from '@/components/Feedback'

export function MetaCiclo() {
  const admin = useUsuario()
  const b = useBanco()
  const [ciclos, setCiclos] = useState<Ciclo[]>(() => structuredClone(b.ciclos))
  const [temporadas, setTemporadas] = useState<Temporada[]>(() => structuredClone(b.temporadas))
  const [cfg, setCfg] = useState<Configuracoes>(() => structuredClone(b.configuracoes))

  const salvar = () => {
    for (const c of ciclos) salvarItem('ciclos', { ...c, ativo: c.ano === cfg.cicloAtivo }, 'ano', admin.id)
    for (const t of temporadas) salvarItem('temporadas', t, 'id', admin.id)
    atualizarConfiguracoes(
      (c) => {
        c.cicloAtivo = cfg.cicloAtivo
        c.guia = cfg.guia
        c.marcos = cfg.marcos
        c.limiteConvitesDia = cfg.limiteConvitesDia
        c.limiteLoteConvites = cfg.limiteLoteConvites
      },
      admin.id,
      'Meta, ciclo, temporadas e guia atualizados',
    )
    avisar('Configurações salvas.')
  }

  const setCiclo = (ano: number, k: keyof Ciclo, v: string) => setCiclos(ciclos.map((c) => (c.ano === ano ? { ...c, [k]: k === 'meta' ? Number(v) : v } : c)))

  return (
    <div className="space-y-4">
      <Aviso>A meta e os prazos aparecem no termômetro e nas contagens regressivas da página inicial. O total arrecadado é sempre calculado pelos reportes validados.</Aviso>
      <section className="cartao space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-titulo text-lg font-bold text-weg-900">Ciclos (edições)</h2>
          <Campo rotulo="Ciclo ativo">
            <select className="campo" value={cfg.cicloAtivo} onChange={(e) => setCfg({ ...cfg, cicloAtivo: Number(e.target.value) })}>
              {ciclos.map((c) => (
                <option key={c.ano} value={c.ano}>
                  {c.ano}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        {ciclos.map((c) => (
          <div key={c.ano} className={`grid gap-2 rounded-xl p-3 sm:grid-cols-2 lg:grid-cols-5 ${c.ano === cfg.cicloAtivo ? 'bg-rs-ciano-claro' : 'bg-fundo'}`}>
            <Campo rotulo={`Rótulo (${c.ano})`}>
              <input className="campo" value={c.rotulo} onChange={(e) => setCiclo(c.ano, 'rotulo', e.target.value)} />
            </Campo>
            <Campo rotulo="Início das destinações">
              <input className="campo" type="date" value={c.inicio} onChange={(e) => setCiclo(c.ano, 'inicio', e.target.value)} />
            </Campo>
            <Campo rotulo="Meta de arrecadação (R$)">
              <input className="campo" type="number" value={c.meta} onChange={(e) => setCiclo(c.ano, 'meta', e.target.value)} />
            </Campo>
            <Campo rotulo="Prazo doação direta">
              <input className="campo" type="date" value={c.prazoDoacaoDireta} onChange={(e) => setCiclo(c.ano, 'prazoDoacaoDireta', e.target.value)} />
            </Campo>
            <Campo rotulo="Prazo final da declaração">
              <input className="campo" type="date" value={c.prazoDeclaracao} onChange={(e) => setCiclo(c.ano, 'prazoDeclaracao', e.target.value)} />
            </Campo>
          </div>
        ))}
        <button
          className="botao-secundario"
          onClick={() => {
            const ano = Math.max(...ciclos.map((c) => c.ano)) + 1
            setCiclos([...ciclos, { ano, rotulo: `Edição ${ano}`, inicio: `${ano - 1}-10-01`, meta: 0, prazoDoacaoDireta: `${ano - 1}-12-31`, prazoDeclaracao: `${ano}-05-31`, ativo: false }])
          }}
        >
          Adicionar ciclo
        </button>
      </section>

      <section className="cartao space-y-3">
        <h2 className="font-titulo text-lg font-bold text-weg-900">Temporadas</h2>
        {temporadas.map((t, i) => (
          <div key={t.id} className="grid gap-2 rounded-xl bg-fundo p-3 sm:grid-cols-[1fr_2fr]">
            <Campo rotulo="Nome">
              <input className="campo" value={t.nome} onChange={(e) => setTemporadas(temporadas.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
            </Campo>
            <div className="space-y-2">
              {t.intervalos.map((iv, k) => (
                <div key={k} className="grid grid-cols-2 gap-2">
                  {(['inicio', 'fim'] as const).map((campo) => (
                    <Campo key={campo} rotulo={`${campo === 'inicio' ? 'Início' : 'Fim'} (MM-DD)`}>
                      <input
                        className="campo"
                        pattern="\d{2}-\d{2}"
                        value={iv[campo]}
                        onChange={(e) =>
                          setTemporadas(temporadas.map((x, j) => (j === i ? { ...x, intervalos: x.intervalos.map((y, l) => (l === k ? { ...y, [campo]: e.target.value } : y)) } : x)))
                        }
                      />
                    </Campo>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cartao space-y-3">
          <h2 className="font-titulo text-lg font-bold text-weg-900">Percentuais do guia do IR</h2>
          <div className="grid grid-cols-3 gap-2">
            <Campo rotulo="FIA (%)">
              <input className="campo" type="number" step="0.1" value={cfg.guia.pctFia} onChange={(e) => setCfg({ ...cfg, guia: { ...cfg.guia, pctFia: Number(e.target.value) } })} />
            </Campo>
            <Campo rotulo="Idoso (%)">
              <input className="campo" type="number" step="0.1" value={cfg.guia.pctIdoso} onChange={(e) => setCfg({ ...cfg, guia: { ...cfg.guia, pctIdoso: Number(e.target.value) } })} />
            </Campo>
            <Campo rotulo="Global doação direta (%)">
              <input className="campo" type="number" step="0.1" value={cfg.guia.pctGlobalDoacaoDireta} onChange={(e) => setCfg({ ...cfg, guia: { ...cfg.guia, pctGlobalDoacaoDireta: Number(e.target.value) } })} />
            </Campo>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-rs-azul" checked={cfg.guia.revisadoFiscal} onChange={(e) => setCfg({ ...cfg, guia: { ...cfg.guia, revisadoFiscal: e.target.checked } })} />
            Conteúdo revisado pela área fiscal/jurídica (remove o aviso do guia)
          </label>
          <h3 className="pt-2 font-titulo font-bold text-weg-900">Limites de convites</h3>
          <div className="grid grid-cols-2 gap-2">
            <Campo rotulo="Por dia">
              <input className="campo" type="number" value={cfg.limiteConvitesDia} onChange={(e) => setCfg({ ...cfg, limiteConvitesDia: Number(e.target.value) })} />
            </Campo>
            <Campo rotulo="Por envio em lote">
              <input className="campo" type="number" value={cfg.limiteLoteConvites} onChange={(e) => setCfg({ ...cfg, limiteLoteConvites: Number(e.target.value) })} />
            </Campo>
          </div>
        </section>
        <section className="cartao space-y-3">
          <h2 className="font-titulo text-lg font-bold text-weg-900">Marcos coletivos da meta</h2>
          {cfg.marcos.map((m, i) => (
            <div key={m.pct} className="space-y-2 rounded-xl bg-fundo p-3">
              <p className="font-titulo font-bold text-rs-azul">{m.pct}%</p>
              <Campo rotulo="Título">
                <input className="campo" value={m.titulo} onChange={(e) => setCfg({ ...cfg, marcos: cfg.marcos.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} />
              </Campo>
              <Campo rotulo="Conteúdo desbloqueado para todos">
                <input className="campo" value={m.conteudo} onChange={(e) => setCfg({ ...cfg, marcos: cfg.marcos.map((x, j) => (j === i ? { ...x, conteudo: e.target.value } : x)) })} />
              </Campo>
            </div>
          ))}
        </section>
      </div>
      <button className="botao-primario w-full sm:w-auto" onClick={salvar}>
        Salvar configurações
      </button>
    </div>
  )
}

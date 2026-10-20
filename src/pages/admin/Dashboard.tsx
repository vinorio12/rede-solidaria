import { useState } from 'react'
import { useBanco } from '@/data/useBanco'
import * as R from '@/domain/regras'
import { BarrasHorizontais, LinhaAcumulada, Tabela, type Ponto } from '@/components/Graficos'
import { Abas } from '@/components/ui'
import { data, diaLocal, moeda, numero } from '@/lib/datas'
import type { Banco } from '@/domain/types'

/** Total validado acumulado por semana, desde o início do ciclo até hoje. */
export function evolucaoSemanal(b: Banco, ano: number): Ponto[] {
  const ciclo = b.ciclos.find((c) => c.ano === ano)
  if (!ciclo) return []
  const validacoes = R.reportesValidados(b, (r) => r.ciclo === ano).map((r) => ({
    em: [...r.historico].reverse().find((h) => h.status === 'validado')?.em ?? r.criadoEm,
    valor: r.valor,
  }))
  const inicio = new Date(`${ciclo.inicio}T00:00:00`)
  const fim = new Date()
  const pontos: Ponto[] = []
  for (let d = new Date(inicio); d <= fim || pontos.length < 2; d.setDate(d.getDate() + 7)) {
    const limite = new Date(d)
    limite.setDate(limite.getDate() + 6)
    const ate = diaLocal(limite)
    pontos.push({ rotulo: data(diaLocal(d)), valor: validacoes.filter((v) => v.em.slice(0, 10) <= ate).reduce((s, v) => s + v.valor, 0) })
    if (pontos.length > 60) break
  }
  return pontos
}

export function Dashboard() {
  const b = useBanco()
  const ciclo = R.cicloAtivo(b)
  const [vista, setVista] = useState<'grafico' | 'tabela'>('grafico')
  const total = R.totalArrecadado(b, ciclo.ano)
  const ind = R.indicadoresCiclo(b, ciclo.ano)
  const fila = b.reportes.filter((r) => r.status === 'enviado' || r.status === 'em_validacao')
  const evolucao = evolucaoSemanal(b, ciclo.ano)

  const porUnidade: Ponto[] = b.unidades.map((un) => {
    const participantes = new Set(R.reportesValidados(b, (r) => r.ciclo === ciclo.ano && b.usuarios.find((u) => u.id === r.usuarioId)?.unidadeId === un.id).map((r) => r.usuarioId)).size
    return { rotulo: un.nome, valor: participantes, detalhe: `${((participantes / un.colaboradores) * 100).toFixed(1)}% dos ${numero(un.colaboradores)} colaboradores` }
  })

  const doCiclo = b.reportes.filter((r) => r.ciclo === ciclo.ano)
  // funil: convidados (cadastrados + convites ainda não aceitos) → cadastrados → reportaram → validados
  const cadastrados = b.usuarios.filter((u) => u.perfil !== 'admin').length
  const funil: Ponto[] = [
    { rotulo: 'Convidados', valor: cadastrados + b.convites.filter((c) => c.status === 'enviado').length },
    { rotulo: 'Cadastrados no app', valor: cadastrados },
    { rotulo: 'Reportaram no ciclo', valor: new Set(doCiclo.map((r) => r.usuarioId)).size },
    { rotulo: 'Com reporte validado', valor: new Set(doCiclo.filter((r) => r.status === 'validado').map((r) => r.usuarioId)).size },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi r="Arrecadado e validado" v={moeda(total)} d={`${((total / ciclo.meta) * 100).toFixed(1)}% da meta de ${moeda(ciclo.meta)}`} />
        <Kpi r="Em validação" v={moeda(R.totalEmValidacao(b, ciclo.ano))} d={`${fila.length} reportes na fila`} />
        <Kpi r="Participantes" v={numero(ind.participantes)} d={`${ind.municipios} municípios`} />
        <Kpi r="Entidades apoiadas" v={numero(ind.entidades)} d="com indicação no reporte" />
      </div>

      <section className="cartao space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-titulo text-lg font-bold text-weg-900">Evolução da meta · {ciclo.rotulo}</h2>
          <div className="w-56">
            <Abas
              rotulo="Visualização"
              ativa={vista}
              aoMudar={setVista}
              abas={[
                { id: 'grafico', nome: 'Gráfico' },
                { id: 'tabela', nome: 'Tabela' },
              ]}
            />
          </div>
        </div>
        {vista === 'grafico' ? (
          <div className="max-w-3xl"><LinhaAcumulada pontos={evolucao} meta={ciclo.meta} formatar={moeda} /></div>
        ) : (
          <Tabela colunas={['Semana iniciada em', 'Total validado acumulado']} linhas={evolucao.map((p) => [p.rotulo, moeda(p.valor)])} />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cartao space-y-3">
          <h2 className="font-titulo text-lg font-bold text-weg-900">Participação por unidade</h2>
          <BarrasHorizontais titulo="Participantes validados por unidade" pontos={porUnidade} formatar={(v) => `${v} pessoas`} />
        </section>
        <section className="cartao space-y-3">
          <h2 className="font-titulo text-lg font-bold text-weg-900">Funil de engajamento</h2>
          <BarrasHorizontais titulo="Funil: convidados, cadastrados, reportaram e validados" pontos={funil} formatar={numero} />
        </section>
      </div>
    </div>
  )
}

function Kpi({ r, v, d }: { r: string; v: string; d: string }) {
  return (
    <div className="cartao p-3">
      <p className="text-xs text-suave">{r}</p>
      <p className="font-titulo text-xl font-bold text-weg-900">{v}</p>
      <p className="text-xs text-suave">{d}</p>
    </div>
  )
}

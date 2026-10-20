import { useState } from 'react'
import { useBanco } from '@/data/useBanco'
import * as R from '@/domain/regras'
import type { Banco } from '@/domain/types'
import { Icone } from '@/components/Icone'
import { avisar } from '@/components/Feedback'
import { exportarXlsx, type Celula } from '@/lib/planilhas'
import { data } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'
import { evolucaoSemanal } from './Dashboard'

type Relatorio = { nome: string; colunas: string[]; linhas: Celula[][] }

function agrupar(b: Banco, ano: number, chave: (r: Banco['reportes'][number]) => string, titulo: string): Relatorio {
  const m = new Map<string, { qtd: number; pessoas: Set<string>; total: number }>()
  for (const r of R.reportesValidados(b, (x) => x.ciclo === ano)) {
    const k = chave(r)
    const g = m.get(k) ?? { qtd: 0, pessoas: new Set(), total: 0 }
    g.qtd++
    g.pessoas.add(r.usuarioId)
    g.total += r.valor
    m.set(k, g)
  }
  return { nome: titulo, colunas: [titulo, 'Participantes', 'Reportes validados', 'Total (R$)'], linhas: [...m].map(([k, g]) => [k, g.pessoas.size, g.qtd, g.total]) }
}

/** Participantes validados do ciclo (critério de aceite 7). */
export function participantesValidados(b: Banco, ano: number): Relatorio {
  const ids = [...new Set(R.reportesValidados(b, (r) => r.ciclo === ano).map((r) => r.usuarioId))]
  return {
    nome: 'Participantes validados',
    colunas: ['Nome', 'E-mail', 'Perfil', 'Unidade', 'Município', 'Reportes validados', 'Familiares', 'Total validado (R$)', 'XP no ciclo', 'Nível'],
    linhas: ids.map((id) => {
      const u = b.usuarios.find((x) => x.id === id)!
      const reps = R.reportesValidados(b, (r) => r.ciclo === ano && r.usuarioId === id)
      return [
        u.nome,
        u.email,
        t.perfil[u.perfil],
        b.unidades.find((x) => x.id === u.unidadeId)?.nome ?? '',
        u.municipio,
        reps.length,
        new Set(reps.filter((r) => r.familiarId).map((r) => r.familiarId)).size,
        reps.reduce((s, r) => s + r.valor, 0),
        R.xpCiclo(b, id, ano),
        R.nivelDe(R.xpTotal(b, id), b.niveis).atual.nome,
      ]
    }),
  }
}

export function Relatorios() {
  const b = useBanco()
  const [ano, setAno] = useState(b.configuracoes.cicloAtivo)

  const relatorios: { titulo: string; descricao: string; gerar: () => Relatorio[] }[] = [
    { titulo: 'Participantes validados do ciclo', descricao: 'Lista nominal com unidade, município, reportes e XP.', gerar: () => [participantesValidados(b, ano)] },
    {
      titulo: 'Participação por recorte',
      descricao: 'Por unidade, município, fundo e modalidade, com o total arrecadado.',
      gerar: () => [
        agrupar(b, ano, (r) => b.unidades.find((x) => x.id === b.usuarios.find((u) => u.id === r.usuarioId)?.unidadeId)?.nome ?? 'Convidados', 'Unidade'),
        agrupar(b, ano, (r) => `${r.municipio}/${r.uf}`, 'Município'),
        agrupar(b, ano, (r) => t.fundo[r.fundoTipo], 'Fundo'),
        agrupar(b, ano, (r) => t.modalidade[r.modalidade], 'Modalidade'),
        { nome: 'Total', colunas: ['Ciclo', 'Meta (R$)', 'Total validado (R$)', 'Em validação (R$)'], linhas: [[ano, b.ciclos.find((c) => c.ano === ano)?.meta ?? 0, R.totalArrecadado(b, ano), R.totalEmValidacao(b, ano)]] },
      ],
    },
    { titulo: 'Evolução semanal', descricao: 'Total validado acumulado por semana.', gerar: () => [{ nome: 'Evolução semanal', colunas: ['Semana', 'Total acumulado (R$)'], linhas: evolucaoSemanal(b, ano).map((p) => [p.rotulo, p.valor]) }] },
    {
      titulo: 'Convites e conversão',
      descricao: 'Convites por pessoa: enviados, aceitos e que reportaram.',
      gerar: () => {
        const porUsuario = new Map<string, { e: number; a: number; r: number }>()
        for (const c of b.convites) {
          const g = porUsuario.get(c.usuarioId) ?? { e: 0, a: 0, r: 0 }
          g.e++
          if (c.status !== 'enviado') g.a++
          if (c.status === 'reportou') g.r++
          porUsuario.set(c.usuarioId, g)
        }
        return [
          {
            nome: 'Convites',
            colunas: ['Quem convidou', 'Enviados', 'Aceitos', 'Reportaram', 'Conversão (%)'],
            linhas: [...porUsuario].map(([id, g]) => [b.usuarios.find((u) => u.id === id)?.nome ?? id, g.e, g.a, g.r, g.e ? Math.round((g.r / g.e) * 100) : 0]),
          },
        ]
      },
    },
    {
      titulo: 'Homenageados do evento',
      descricao: 'Participantes validados com nível, insígnias e pin, para o evento de reconhecimento.',
      gerar: () => {
        const p = participantesValidados(b, ano)
        return [
          {
            nome: 'Homenageados',
            colunas: ['Nome', 'Unidade', 'Nível', 'Insígnias', 'Ciclos de participação', 'Pin da edição'],
            linhas: [...new Set(R.reportesValidados(b, (r) => r.ciclo === ano).map((r) => r.usuarioId))].map((id) => {
              const u = b.usuarios.find((x) => x.id === id)!
              return [
                u.nome,
                b.unidades.find((x) => x.id === u.unidadeId)?.nome ?? 'Convidado',
                R.nivelDe(R.xpTotal(b, id), b.niveis).atual.nome,
                b.usuarioInsignias.filter((i) => i.usuarioId === id).length,
                R.ciclosParticipados(b, id).length,
                b.usuarioPins.some((x) => x.usuarioId === id && x.ano === ano) ? 'Sim' : 'Não',
              ]
            }),
          },
          p,
        ]
      },
    },
    {
      titulo: 'Certificados e cartas de agradecimento',
      descricao: 'Dados para mala direta: nome, e-mail, edição e código do certificado.',
      gerar: () => [
        {
          nome: 'Certificados',
          colunas: ['Nome', 'E-mail', 'Edição', 'Código do certificado', 'Data da validação'],
          linhas: [...new Set(R.reportesValidados(b, (r) => r.ciclo === ano).map((r) => r.usuarioId))].map((id) => {
            const u = b.usuarios.find((x) => x.id === id)!
            const ultima = R.reportesValidados(b, (r) => r.ciclo === ano && r.usuarioId === id)
              .flatMap((r) => r.historico.filter((h) => h.status === 'validado').map((h) => h.em))
              .sort()
              .pop()
            return [u.nome, u.email, ano, `CERT-${ano}-${id.toUpperCase()}`, data(ultima)]
          }),
        },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      <label className="flex max-w-xs flex-col">
        <span className="rotulo">Ciclo</span>
        <select className="campo" value={ano} onChange={(e) => setAno(Number(e.target.value))}>
          {b.ciclos.map((c) => (
            <option key={c.ano} value={c.ano}>
              {c.rotulo}
            </option>
          ))}
        </select>
      </label>
      <ul className="grid gap-3 sm:grid-cols-2">
        {relatorios.map((r) => (
          <li key={r.titulo} className="cartao flex flex-col gap-2">
            <h2 className="font-titulo font-bold text-weg-900">{r.titulo}</h2>
            <p className="flex-1 text-sm text-suave">{r.descricao}</p>
            <button
              className="botao-primario"
              onClick={async () => {
                await exportarXlsx(r.gerar(), `rede-solidaria-${ano}-${r.titulo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}.xlsx`)
                avisar('Planilha gerada.')
              }}
            >
              <Icone nome="download" /> Exportar XLSX
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

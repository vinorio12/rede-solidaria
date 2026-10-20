import { useState } from 'react'
import { useBanco } from '@/data/useBanco'
import { Tabela } from '@/components/Graficos'
import { dataHora } from '@/lib/datas'

export function Auditoria() {
  const b = useBanco()
  const [acao, setAcao] = useState('')
  const [busca, setBusca] = useState('')
  const acoes = [...new Set(b.log.map((l) => l.acao))].sort()
  const nome = (id?: string) => (id ? (b.usuarios.find((u) => u.id === id)?.nome ?? id) : 'Sistema')
  const linhas = b.log.filter((l) => (!acao || l.acao === acao) && (!busca || `${l.detalhe} ${nome(l.por)} ${nome(l.alvo)}`.toLowerCase().includes(busca.toLowerCase()))).slice(0, 300)
  return (
    <section className="cartao space-y-3">
      <p className="text-sm text-suave">Todo crédito e estorno de XP, validação, cadastro e importação fica registrado aqui. E-mails do protótipo aparecem como “email_simulado”.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="campo" aria-label="Ação" value={acao} onChange={(e) => setAcao(e.target.value)}>
          <option value="">Todas as ações</option>
          {acoes.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <input className="campo" placeholder="Buscar" aria-label="Buscar no log" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <Tabela colunas={['Quando', 'Ação', 'Por', 'Detalhe']} linhas={linhas.map((l) => [dataHora(l.em), l.acao, nome(l.por), l.detalhe])} />
    </section>
  )
}

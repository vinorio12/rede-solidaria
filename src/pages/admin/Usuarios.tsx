import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { nivelDe, xpTotal } from '@/domain/regras'
import { ajustarXp, definirPerfil } from '@/domain/servicos'
import type { Perfil } from '@/domain/types'
import { Abas, Modal, Campo } from '@/components/ui'
import { tentar } from '@/components/Feedback'
import { numero } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

export function Usuarios() {
  const admin = useUsuario()
  const b = useBanco()
  const [aba, setAba] = useState<'todos' | 'convidados'>('todos')
  const [busca, setBusca] = useState('')
  const [ajuste, setAjuste] = useState<{ uid: string; xp: number; motivo: string } | null>(null)
  const lista = b.usuarios.filter((u) => (aba === 'todos' || u.perfil === 'convidado') && (!busca || `${u.nome} ${u.email}`.toLowerCase().includes(busca.toLowerCase())))

  return (
    <div className="space-y-3">
      <Abas
        rotulo="Usuários"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'todos', nome: 'Todos os perfis' },
          { id: 'convidados', nome: 'Convidados e padrinhos' },
        ]}
      />
      <input className="campo max-w-sm" placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuário" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="cartao overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-borda text-suave">
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">{aba === 'convidados' ? 'Padrinho' : 'Unidade'}</th>
              <th className="px-3 py-2">{aba === 'convidados' ? 'Vínculo' : 'Nível'}</th>
              <th className="px-3 py-2">XP</th>
              <th className="px-3 py-2">Perfil</th>
              <th className="px-3 py-2">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => {
              const xp = xpTotal(b, u.id)
              return (
                <tr key={u.id} className="border-b border-borda/60 last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-semibold">{u.nome}</p>
                    <p className="text-xs text-suave">{u.email}</p>
                  </td>
                  <td className="px-3 py-2">{aba === 'convidados' ? u.padrinhoEmail : (b.unidades.find((x) => x.id === u.unidadeId)?.nome ?? '-')}</td>
                  <td className="px-3 py-2">{aba === 'convidados' ? (u.vinculoStatus ?? '-') : nivelDe(xp, b.niveis).atual.nome}</td>
                  <td className="px-3 py-2">{numero(xp)}</td>
                  <td className="px-3 py-2">
                    <select
                      className="campo min-h-9 py-1"
                      aria-label={`Perfil de ${u.nome}`}
                      value={u.perfil}
                      disabled={u.id === admin.id}
                      onChange={(e) => definirPerfil(u.id, e.target.value as Perfil, admin.id)}
                    >
                      {(Object.keys(t.perfil) as Perfil[]).map((p) => (
                        <option key={p} value={p}>
                          {t.perfil[p]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button className="botao-fantasma min-h-9 px-2 text-xs" onClick={() => setAjuste({ uid: u.id, xp: 0, motivo: '' })}>
                      Ajustar XP
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Modal aberto={!!ajuste} aoFechar={() => setAjuste(null)} titulo="Ajuste manual de XP">
        {ajuste && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              tentar(() => ajustarXp(ajuste.uid, ajuste.xp, ajuste.motivo, admin.id), 'Ajuste registrado no log de auditoria.')
              setAjuste(null)
            }}
          >
            <Campo rotulo="XP (use negativo para estornar)">
              <input className="campo" type="number" required value={ajuste.xp || ''} onChange={(e) => setAjuste({ ...ajuste, xp: Number(e.target.value) })} />
            </Campo>
            <Campo rotulo="Motivo">
              <input className="campo" required value={ajuste.motivo} onChange={(e) => setAjuste({ ...ajuste, motivo: e.target.value })} />
            </Campo>
            <button className="botao-primario w-full" disabled={!ajuste.xp || !ajuste.motivo.trim()}>
              Registrar ajuste
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}

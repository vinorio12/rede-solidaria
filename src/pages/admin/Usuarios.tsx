import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { statusJogador } from '@/domain/consultas'
import { ajustarPatinhas, ajustarXp, definirPerfil } from '@/domain/servicos'
import type { Perfil } from '@/domain/types'
import { Modal, Campo } from '@/components/ui'
import { tentar } from '@/components/Feedback'
import { numero } from '@/lib/datas'
import { t } from '@/i18n/pt-BR'

export function Usuarios() {
  const admin = useUsuario()
  const b = useBanco()
  const [busca, setBusca] = useState('')
  const [ajuste, setAjuste] = useState<{ uid: string; tipo: 'xp' | 'patinhas'; valor: number; motivo: string } | null>(null)
  const lista = b.usuarios.filter((u) => !busca || `${u.nome} ${u.email}`.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="space-y-3">
      <p className="text-sm text-suave">O app é exclusivo para colaboradores. Convidados não têm conta: os reportes deles aparecem na fila de validação, ligados ao colaborador.</p>
      <input className="campo max-w-sm" placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuário" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="cartao overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-borda text-suave">
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Unidade</th>
              <th className="px-3 py-2">Nível e tier</th>
              <th className="px-3 py-2">XP</th>
              <th className="px-3 py-2">Patinhas</th>
              <th className="px-3 py-2">Perfil</th>
              <th className="px-3 py-2">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => {
              const st = statusJogador(b, u.id)
              return (
                <tr key={u.id} className="border-b border-borda/60 last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-semibold">{u.nome}</p>
                    <p className="text-xs text-suave">{u.email}</p>
                  </td>
                  <td className="px-3 py-2">{b.unidades.find((x) => x.id === u.unidadeId)?.nome ?? '-'}</td>
                  <td className="px-3 py-2">
                    {st.atual.nivel} · {st.tierNome}
                    {st.prestigio.estrelas > 0 && <span className="ml-1 text-[#9a7a12]">★{st.prestigio.estrelas}</span>}
                  </td>
                  <td className="px-3 py-2">{numero(st.xp)}</td>
                  <td className="px-3 py-2">{numero(st.patinhas)}</td>
                  <td className="px-3 py-2">
                    <select className="campo min-h-9 py-1" aria-label={`Perfil de ${u.nome}`} value={u.perfil} disabled={u.id === admin.id} onChange={(e) => definirPerfil(u.id, e.target.value as Perfil, admin.id)}>
                      {(Object.keys(t.perfil) as Perfil[]).map((p) => (
                        <option key={p} value={p}>
                          {t.perfil[p]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button className="botao-fantasma min-h-9 px-2 text-xs" onClick={() => setAjuste({ uid: u.id, tipo: 'xp', valor: 0, motivo: '' })}>
                      Ajustar XP
                    </button>
                    <button className="botao-fantasma min-h-9 px-2 text-xs" onClick={() => setAjuste({ uid: u.id, tipo: 'patinhas', valor: 0, motivo: '' })}>
                      Ajustar Patinhas
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Modal aberto={!!ajuste} aoFechar={() => setAjuste(null)} titulo={ajuste?.tipo === 'patinhas' ? 'Ajuste manual de Patinhas' : 'Ajuste manual de XP'}>
        {ajuste && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              tentar(() => (ajuste.tipo === 'xp' ? ajustarXp : ajustarPatinhas)(ajuste.uid, ajuste.valor, ajuste.motivo, admin.id), 'Ajuste registrado no log de auditoria.')
              setAjuste(null)
            }}
          >
            <Campo rotulo="Quantidade (use negativo para estornar)">
              <input className="campo" type="number" required value={ajuste.valor || ''} onChange={(e) => setAjuste({ ...ajuste, valor: Number(e.target.value) })} />
            </Campo>
            <Campo rotulo="Motivo">
              <input className="campo" required value={ajuste.motivo} onChange={(e) => setAjuste({ ...ajuste, motivo: e.target.value })} />
            </Campo>
            <button className="botao-primario w-full" disabled={!ajuste.valor || !ajuste.motivo.trim()}>
              Registrar ajuste
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}

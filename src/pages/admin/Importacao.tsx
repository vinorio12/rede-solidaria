import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { novoId } from '@/data/db'
import { useBanco } from '@/data/useBanco'
import { importarProjetos, salvarItem } from '@/domain/servicos'
import type { Entidade, Projeto } from '@/domain/types'
import { Abas, Aviso } from '@/components/ui'
import { Tabela } from '@/components/Graficos'
import { avisar } from '@/components/Feedback'
import { exportarXlsx, lerPlanilha, mapearRepasses, type Celula } from '@/lib/planilhas'
import { moeda } from '@/lib/datas'

const COLUNAS_ENTIDADES = ['Razão social', 'Nome fantasia', 'CNPJ', 'Município', 'UF', 'Público (FIA ou IDOSO)', 'Projeto chancelado', 'Nº resolução', 'Data resolução', 'Validade chancela', 'Valor autorizado', 'CNPJ do fundo', 'Contato', 'Descrição']

export function Importacao() {
  const admin = useUsuario()
  const b = useBanco()
  const [aba, setAba] = useState<'repasses' | 'entidades'>('repasses')
  const [previa, setPrevia] = useState<{ projetos: Projeto[]; ignorados: number; aba: string } | null>(null)
  const [entidades, setEntidades] = useState<Entidade[] | null>(null)
  const [erro, setErro] = useState('')

  const lerRepasses = async (f: File) => {
    setErro('')
    try {
      const r = mapearRepasses(await lerPlanilha(f))
      if (r.colunasFaltando.length) setErro(`Não encontrei as colunas obrigatórias: ${r.colunasFaltando.join(', ')}. Confira a aba REALIZADO.`)
      else setPrevia(r)
    } catch {
      setErro('Não foi possível ler o arquivo. Use XLSX ou CSV.')
    }
  }

  const lerEntidades = async (f: File) => {
    setErro('')
    try {
      const [aba1] = await lerPlanilha(f)
      const linhas = aba1.linhas.slice(1).filter((l) => l[0])
      const txt = (v: Celula) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').trim())
      setEntidades(
        linhas.map((l) => {
          const fundo = b.fundos.find((x) => x.cnpj === txt(l[11]))
          const publico = txt(l[5]).toUpperCase().includes('IDOSO') ? 'IDOSO' : 'FIA'
          return {
            id: novoId('ent'),
            razaoSocial: txt(l[0]),
            nomeFantasia: txt(l[1]) || txt(l[0]),
            cnpj: txt(l[2]),
            municipio: txt(l[3]),
            uf: txt(l[4]).toUpperCase() || 'SC',
            publico,
            projetoChancelado: txt(l[6]),
            resolucaoNumero: txt(l[7]),
            resolucaoData: txt(l[8]),
            validadeChancela: txt(l[9]),
            valorAutorizado: Number(String(l[10] ?? 0).replace(/\./g, '').replace(',', '.')) || 0,
            fundoId: fundo?.id ?? b.fundos.find((x) => x.municipio === txt(l[3]) && x.tipo === publico)?.id ?? '',
            contato: txt(l[12]),
            descricao: txt(l[13]),
            exemplo: false,
          }
        }),
      )
    } catch {
      setErro('Não foi possível ler o arquivo.')
    }
  }

  return (
    <div className="space-y-4">
      <Abas
        rotulo="Tipo de importação"
        ativa={aba}
        aoMudar={(a) => {
          setAba(a)
          setErro('')
        }}
        abas={[
          { id: 'repasses', nome: 'Projetos e repasses' },
          { id: 'entidades', nome: 'Entidades chanceladas' },
        ]}
      />

      {aba === 'repasses' && (
        <section className="cartao space-y-3">
          <h2 className="font-titulo text-lg font-bold text-weg-900">Relatório Geral de repasses</h2>
          <p className="text-sm text-suave">
            Lê a aba <strong>REALIZADO</strong> e importa apenas as linhas com “RP/Lei de Incentivo” igual a <em>Fundo da Infância e Adolescência</em> ou <em>Fundo do Idoso</em>. Campos de contato (responsável, e-mail, telefones) são ignorados. Projetos com o mesmo número são atualizados.
          </p>
          <input className="campo" type="file" accept=".xlsx,.csv" aria-label="Planilha de repasses" onChange={(e) => e.target.files?.[0] && lerRepasses(e.target.files[0])} />
          {erro && <Aviso tipo="alerta">{erro}</Aviso>}
          {previa && (
            <>
              <Aviso>
                Aba “{previa.aba}”: {previa.projetos.length} projetos de FIA/Fundo do Idoso encontrados, {previa.ignorados} linhas de outras leis ignoradas.
              </Aviso>
              <Tabela colunas={['Número', 'Projeto', 'Entidade', 'Cidade', 'Fundo', 'Valor', 'Ano']} linhas={previa.projetos.slice(0, 50).map((p) => [p.idExterno, p.nome, p.entidade, `${p.municipio}/${p.uf}`, p.fundo, moeda(p.valorRepassado), p.ano])} />
              <button
                className="botao-primario"
                onClick={() => {
                  const r = importarProjetos(previa.projetos, admin.id)
                  avisar(`${r.incluidos} projetos incluídos e ${r.atualizados} atualizados.`)
                  setPrevia(null)
                }}
              >
                Confirmar importação
              </button>
            </>
          )}
        </section>
      )}

      {aba === 'entidades' && (
        <section className="cartao space-y-3">
          <h2 className="font-titulo text-lg font-bold text-weg-900">Entidades chanceladas</h2>
          <p className="text-sm text-suave">A planilha de repasses não traz os dados de chancela. Use o modelo abaixo, uma entidade por linha.</p>
          <button className="botao-secundario" onClick={() => exportarXlsx([{ nome: 'Entidades', colunas: COLUNAS_ENTIDADES, linhas: [] }], 'modelo-entidades-chanceladas.xlsx')}>
            Baixar modelo XLSX
          </button>
          <input className="campo" type="file" accept=".xlsx,.csv" aria-label="Planilha de entidades" onChange={(e) => e.target.files?.[0] && lerEntidades(e.target.files[0])} />
          {erro && <Aviso tipo="alerta">{erro}</Aviso>}
          {entidades && (
            <>
              <Tabela colunas={['Entidade', 'Município', 'Público', 'Validade', 'Fundo vinculado']} linhas={entidades.map((e) => [e.nomeFantasia, e.municipio, e.publico, e.validadeChancela, b.fundos.find((f) => f.id === e.fundoId)?.nome ?? 'não encontrado'])} />
              <button
                className="botao-primario"
                onClick={() => {
                  entidades.forEach((e) => salvarItem('entidades', e, 'id', admin.id))
                  avisar(`${entidades.length} entidades importadas.`)
                  setEntidades(null)
                }}
              >
                Confirmar importação
              </button>
            </>
          )}
        </section>
      )}
    </div>
  )
}

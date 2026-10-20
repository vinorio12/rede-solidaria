import { useState } from 'react'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { novoId } from '@/data/db'
import { removerItem, salvarItem } from '@/domain/servicos'
import type { Entidade, Fundo, Pin, Projeto, Unidade } from '@/domain/types'
import { Abas } from '@/components/ui'
import { EditorColecao } from './EditorColecao'
import { data, moeda } from '@/lib/datas'
import { ARTES_PINS } from '@/lib/pinArte'

type Aba = 'fundos' | 'entidades' | 'projetos' | 'unidades' | 'pins'

const FUNDO_TIPO = [
  { valor: 'FIA', nome: 'Criança e Adolescente (FIA)' },
  { valor: 'IDOSO', nome: 'Idoso' },
]

export function Cadastros() {
  const admin = useUsuario()
  const b = useBanco()
  const [aba, setAba] = useState<Aba>('entidades')
  const fundosOpcoes = b.fundos.map((f) => ({ valor: f.id, nome: `${f.nome}` }))
  const entidadesOpcoes = b.entidades.map((e) => ({ valor: e.id, nome: e.nomeFantasia }))

  return (
    <div className="space-y-4">
      <Abas
        rotulo="Cadastro"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { id: 'entidades', nome: 'Entidades' },
          { id: 'fundos', nome: 'Fundos' },
          { id: 'projetos', nome: 'Projetos' },
          { id: 'unidades', nome: 'Unidades' },
          { id: 'pins', nome: 'Pins' },
        ]}
      />

      {aba === 'fundos' && (
        <EditorColecao<Fundo>
          titulo="fundo"
          itens={b.fundos}
          chave="id"
          colunas={[
            { rotulo: 'Fundo', valor: (f) => f.nome },
            { rotulo: 'Conselho', valor: (f) => f.conselho },
            { rotulo: 'Município', valor: (f) => `${f.municipio}/${f.uf}` },
          ]}
          campos={[
            { chave: 'nome', rotulo: 'Nome do fundo' },
            { chave: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: FUNDO_TIPO },
            { chave: 'conselho', rotulo: 'Sigla do conselho', tipo: 'select', opcoes: ['CMDCA', 'CMDPI', 'CEDCA', 'CEI', 'CONANDA', 'CNDI'].map((v) => ({ valor: v, nome: v })) },
            { chave: 'conselhoNome', rotulo: 'Nome do conselho (aparece na carta)', opcional: true },
            { chave: 'esfera', rotulo: 'Esfera', tipo: 'select', opcoes: ['municipal', 'estadual', 'nacional'].map((v) => ({ valor: v, nome: v })) },
            { chave: 'municipio', rotulo: 'Município' },
            { chave: 'uf', rotulo: 'UF' },
            { chave: 'cnpj', rotulo: 'CNPJ' },
            { chave: 'banco', rotulo: 'Banco' },
            { chave: 'agencia', rotulo: 'Agência' },
            { chave: 'conta', rotulo: 'Conta' },
          ]}
          novo={() => ({ id: novoId('fundo'), tipo: 'FIA', nome: '', conselho: 'CMDCA', esfera: 'municipal', municipio: '', uf: 'SC', cnpj: '', banco: '', agencia: '', conta: '' })}
          aoSalvar={(f) => salvarItem('fundos', f, 'id', admin.id)}
          aoRemover={(f) => removerItem('fundos', 'id', f.id, admin.id)}
        />
      )}

      {aba === 'entidades' && (
        <EditorColecao<Entidade>
          titulo="entidade chancelada"
          itens={b.entidades}
          chave="id"
          colunas={[
            { rotulo: 'Entidade', valor: (e) => e.nomeFantasia },
            { rotulo: 'Projeto', valor: (e) => e.projetoChancelado },
            { rotulo: 'Validade da chancela', valor: (e) => data(e.validadeChancela) },
            { rotulo: 'Autorizado', valor: (e) => moeda(e.valorAutorizado) },
          ]}
          campos={[
            { chave: 'razaoSocial', rotulo: 'Razão social' },
            { chave: 'nomeFantasia', rotulo: 'Nome fantasia' },
            { chave: 'cnpj', rotulo: 'CNPJ' },
            { chave: 'publico', rotulo: 'Público', tipo: 'select', opcoes: FUNDO_TIPO },
            { chave: 'municipio', rotulo: 'Município' },
            { chave: 'uf', rotulo: 'UF' },
            { chave: 'fundoId', rotulo: 'Fundo', tipo: 'select', opcoes: fundosOpcoes },
            { chave: 'projetoChancelado', rotulo: 'Projeto chancelado' },
            { chave: 'resolucaoNumero', rotulo: 'Nº da resolução' },
            { chave: 'resolucaoData', rotulo: 'Data da resolução', tipo: 'data' },
            { chave: 'validadeChancela', rotulo: 'Validade da chancela', tipo: 'data' },
            { chave: 'valorAutorizado', rotulo: 'Valor autorizado (R$)', tipo: 'numero' },
            { chave: 'contato', rotulo: 'Contato' },
            { chave: 'exemplo', rotulo: 'Registro de exemplo', tipo: 'booleano' },
            { chave: 'descricao', rotulo: 'Descrição', tipo: 'area' },
          ]}
          novo={() => ({
            id: novoId('ent'),
            razaoSocial: '',
            nomeFantasia: '',
            cnpj: '',
            municipio: '',
            uf: 'SC',
            publico: 'FIA',
            descricao: '',
            projetoChancelado: '',
            resolucaoNumero: '',
            resolucaoData: '',
            validadeChancela: '',
            valorAutorizado: 0,
            fundoId: b.fundos[0]?.id ?? '',
            contato: '',
            exemplo: false,
          })}
          aoSalvar={(e) => salvarItem('entidades', e, 'id', admin.id)}
          aoRemover={(e) => removerItem('entidades', 'id', e.id, admin.id)}
        />
      )}

      {aba === 'projetos' && (
        <EditorColecao<Projeto>
          titulo="projeto apoiado"
          itens={b.projetos}
          chave="id"
          colunas={[
            { rotulo: 'Projeto', valor: (p) => p.nome },
            { rotulo: 'Município', valor: (p) => p.municipio },
            { rotulo: 'Origem', valor: (p) => ({ empresa: 'WEG', colaboradores: 'Colaboradores', ambos: 'Ambos' })[p.origem] },
            { rotulo: 'Valor', valor: (p) => moeda(p.valorRepassado) },
          ]}
          campos={[
            { chave: 'idExterno', rotulo: 'Número do projeto' },
            { chave: 'nome', rotulo: 'Nome do projeto' },
            { chave: 'entidade', rotulo: 'Proponente / mantenedora' },
            { chave: 'cnpjEntidade', rotulo: 'CNPJ' },
            { chave: 'entidadeId', rotulo: 'Entidade chancelada vinculada', tipo: 'select', opcoes: entidadesOpcoes, opcional: true },
            { chave: 'municipio', rotulo: 'Cidade' },
            { chave: 'uf', rotulo: 'Estado' },
            { chave: 'area', rotulo: 'Área' },
            { chave: 'publico', rotulo: 'Público' },
            { chave: 'fundo', rotulo: 'Fundo', tipo: 'select', opcoes: FUNDO_TIPO },
            { chave: 'valorRepassado', rotulo: 'Valor apoiado (R$)', tipo: 'numero' },
            { chave: 'ano', rotulo: 'Ano', tipo: 'numero' },
            { chave: 'mes', rotulo: 'Mês de pagamento', tipo: 'numero' },
            { chave: 'beneficiados', rotulo: 'Nº beneficiados', tipo: 'numero' },
            { chave: 'ods', rotulo: 'ODS (números separados por vírgula)', tipo: 'lista-numeros' },
            {
              chave: 'origem',
              rotulo: 'Origem dos recursos',
              tipo: 'select',
              opcoes: [
                { valor: 'empresa', nome: 'Recursos da WEG' },
                { valor: 'colaboradores', nome: 'Destinações de colaboradores' },
                { valor: 'ambos', nome: 'WEG e colaboradores' },
              ],
            },
            {
              chave: 'status',
              rotulo: 'Status',
              tipo: 'select',
              opcoes: [
                { valor: 'em_execucao', nome: 'Em execução' },
                { valor: 'concluido', nome: 'Concluído' },
              ],
            },
            { chave: 'lat', rotulo: 'Latitude', tipo: 'numero', opcional: true },
            { chave: 'lng', rotulo: 'Longitude', tipo: 'numero', opcional: true },
            { chave: 'objetivo', rotulo: 'Objetivo', tipo: 'area' },
            { chave: 'descricao', rotulo: 'Descrição do projeto', tipo: 'area' },
            { chave: 'indicadores', rotulo: 'Indicadores de impacto (um por linha)', tipo: 'lista-texto' },
          ]}
          novo={() => ({
            id: novoId('prj'),
            idExterno: '',
            nome: '',
            entidade: '',
            cnpjEntidade: '',
            municipio: '',
            uf: 'SC',
            area: '',
            publico: '',
            valorRepassado: 0,
            fundo: 'FIA',
            ano: new Date().getFullYear(),
            mes: 1,
            objetivo: '',
            descricao: '',
            beneficiados: 0,
            ods: [],
            status: 'em_execucao',
            origem: 'empresa',
            indicadores: [],
          })}
          aoSalvar={(p) => salvarItem('projetos', p, 'id', admin.id)}
          aoRemover={(p) => removerItem('projetos', 'id', p.id, admin.id)}
        />
      )}

      {aba === 'unidades' && (
        <EditorColecao<Unidade>
          titulo="unidade WEG"
          itens={b.unidades}
          chave="id"
          colunas={[
            { rotulo: 'Unidade', valor: (u) => u.nome },
            { rotulo: 'Município', valor: (u) => `${u.municipio}/${u.uf}` },
            { rotulo: 'Colaboradores', valor: (u) => String(u.colaboradores) },
          ]}
          campos={[
            { chave: 'nome', rotulo: 'Nome' },
            { chave: 'municipio', rotulo: 'Município' },
            { chave: 'uf', rotulo: 'UF' },
            { chave: 'colaboradores', rotulo: 'Nº de colaboradores (base do ranking proporcional)', tipo: 'numero' },
          ]}
          novo={() => ({ id: novoId('un'), nome: '', municipio: '', uf: 'SC', colaboradores: 0 })}
          aoSalvar={(u) => salvarItem('unidades', u, 'id', admin.id)}
          aoRemover={(u) => removerItem('unidades', 'id', u.id, admin.id)}
        />
      )}

      {aba === 'pins' && (
        <EditorColecao<Pin>
          titulo="pin anual"
          itens={[...b.pins].sort((a, c) => c.ano - a.ano)}
          chave="ano"
          colunas={[
            { rotulo: 'Ano', valor: (p) => String(p.ano) },
            { rotulo: 'Título', valor: (p) => p.titulo },
            { rotulo: 'Arte', valor: (p) => (p.arte ? 'Oficial' : p.modeloGlb ? 'Modelo .glb' : 'Procedural') },
          ]}
          campos={[
            { chave: 'ano', rotulo: 'Ano', tipo: 'numero' },
            { chave: 'titulo', rotulo: 'Título' },
            { chave: 'arte', rotulo: 'Arte oficial', tipo: 'select', opcoes: Object.keys(ARTES_PINS).map((k) => ({ valor: k, nome: k })), opcional: true },
            { chave: 'modeloGlb', rotulo: 'URL do modelo 3D (.glb)', opcional: true },
            { chave: 'corBase', rotulo: 'Cor base (modelo procedural)' },
            { chave: 'corRelevo', rotulo: 'Cor do relevo (modelo procedural)' },
            { chave: 'descricao', rotulo: 'Descrição', tipo: 'area' },
          ]}
          novo={() => ({ ano: Math.max(...b.pins.map((p) => p.ano)) + 1, titulo: '', descricao: '', corBase: '#095BA7', corRelevo: '#00BEDF' })}
          aoSalvar={(p) => salvarItem('pins', { ...p, ano: Number(p.ano) }, 'ano', admin.id)}
        />
      )}
    </div>
  )
}

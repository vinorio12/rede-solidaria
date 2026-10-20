import { describe, expect, it } from 'vitest'
import { mapearRepasses, parseCsv } from '@/lib/planilhas'

const CSV = [
  'Relatório Geral de repasses;;;;;;;;;;;;;;;;;',
  'Número do Projeto;Nome do Projeto;Proponente;Mantenedora/Gestora;CNPJ;Cidade;Estado;Área;Público;Valor Apoiado;RP/Lei de Incentivo;Ano;Mês de pagamento;Objetivo;Descrição do Projeto;Nº beneficiados;Responsável;E-mail;Telefone',
  '101;Projeto A;Entidade A;;11.111.111/0001-11;Jaraguá do Sul;SC;Educação;Crianças;"R$ 12.500,00";Fundo da Infância e Adolescência;2026;Março;Obj A;Desc A;120;Fulano;fulano@x.com;(47) 9999',
  '102;Projeto B;;Gestora B;22.222.222/0001-22;Joinville;SC;Saúde;Idosos;8000;Fundo do Idoso;2026;5;Obj B;Desc B;60;Ciclano;c@x.com;(47) 8888',
  '103;Projeto C;Entidade C;;33.333.333/0001-33;Itajaí;SC;Cultura;Todos;5000;Lei Rouanet;2026;6;Obj C;Desc C;300;Beltrano;b@x.com;(47) 7777',
].join('\n')

describe('importação do Relatório Geral de repasses', () => {
  it('filtra FIA e Fundo do Idoso, mapeia colunas e ignora contatos', () => {
    const r = mapearRepasses([{ nome: 'REALIZADO', linhas: parseCsv(CSV) }])
    expect(r.colunasFaltando).toEqual([])
    expect(r.projetos).toHaveLength(2)
    expect(r.ignorados).toBe(1)
    const [a, b] = r.projetos
    expect(a).toMatchObject({ idExterno: '101', nome: 'Projeto A', entidade: 'Entidade A', fundo: 'FIA', valorRepassado: 12500, mes: 3, beneficiados: 120, municipio: 'Jaraguá do Sul' })
    expect(b).toMatchObject({ entidade: 'Gestora B', fundo: 'IDOSO', mes: 5 })
    expect(JSON.stringify(r.projetos)).not.toMatch(/fulano|9999/)
  })
})

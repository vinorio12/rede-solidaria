import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { getBanco, restaurarExemplo } from '@/data/db'
import * as R from '@/domain/regras'
import * as S from '@/domain/servicos'
import type { Comprovante } from '@/domain/types'
import { valorPorExtenso } from '@/lib/datas'

const comp = (hash: string): Comprovante => ({ id: `c_${hash}`, nome: `${hash}.pdf`, tipo: 'application/pdf', tamanho: 1000, hash })
const dados = (extra: Partial<S.DadosReporte> = {}): S.DadosReporte => ({
  modalidade: 'doacao_direta',
  fundoTipo: 'FIA',
  esfera: 'municipal',
  municipio: 'Jaraguá do Sul',
  uf: 'SC',
  valor: 200,
  dataPagamento: '2026-10-19',
  ...extra,
})

beforeEach(() => restaurarExemplo())

describe('dados de exemplo', () => {
  it('tem o volume pedido e total vindo dos reportes validados', () => {
    const b = getBanco()
    expect(b.usuarios.length).toBe(30)
    expect(b.unidades.length).toBe(3)
    expect(b.entidades.length).toBe(8)
    expect(b.projetos.length).toBe(6)
    expect(new Set(b.fundos.map((f) => f.municipio)).size).toBe(4)
    const status = new Set(b.reportes.map((r) => r.status))
    for (const s of ['enviado', 'em_validacao', 'validado', 'devolvido', 'aguardando_padrinho', 'estornado']) expect(status).toContain(s)
    const soma = b.reportes.filter((r) => r.status === 'validado' && r.ciclo === 2027).reduce((s, r) => s + r.valor, 0)
    expect(R.totalArrecadado(b, 2027)).toBe(soma)
  })

  it('o pin 2026 usa a arte oficial', () => {
    expect(getBanco().pins.find((p) => p.ano === 2026)?.arte).toBe('pin-2026')
  })
})

describe('critério 1 e 3: reportar, validar e creditar', () => {
  it('colaborador reporta para si e para familiar e os reportes vão para a fila', () => {
    const r1 = S.enviarReporte('u_3', dados({ municipio: 'Joinville' }), [comp('a1')])
    const fam = S.salvarFamiliar({ usuarioId: 'u_3', nome: 'Fulana', parentesco: 'conjuge', municipio: 'Joinville' })
    const r2 = S.enviarReporte('u_3', dados({ familiarId: fam.id, valor: 150 }), [comp('a2')])
    const fila = getBanco().reportes.filter((r) => ['enviado', 'em_validacao'].includes(r.status)).map((r) => r.id)
    expect(fila).toContain(r1.id)
    expect(fila).toContain(r2.id)
  })

  it('validação credita XP, atualiza nível e insígnias, desbloqueia o pin e recalcula a meta', () => {
    const uid = 'u_20' // sem participação anterior nem reporte no ciclo
    const b0 = getBanco()
    const totalAntes = R.totalArrecadado(b0, 2027)
    expect(R.xpTotal(b0, uid)).toBe(0)
    const r = S.enviarReporte(uid, dados({ valor: 321 }), [comp('b1')])
    S.validar(r.id, 'u_admin')
    const b = getBanco()
    // 500 + 250 de primeira participação + 150 da missão sazonal "Destine antes de 31/12" (se a temporada estiver ativa)
    const missao = b.transacoesXp.filter((t) => t.usuarioId === uid && t.origem === 'missao').reduce((s, t) => s + t.xp, 0)
    expect(R.xpTotal(b, uid) - missao).toBe(750)
    expect(R.nivelDe(750, b.niveis).atual.nome).toBe('Jovem Leão')
    expect(b.usuarioInsignias.some((i) => i.usuarioId === uid && i.insigniaId === 'primeira_destinacao')).toBe(true)
    expect(b.usuarioPins.some((p) => p.usuarioId === uid && p.ano === 2027)).toBe(true)
    expect(R.totalArrecadado(b, 2027)).toBe(totalAntes + 321)
    expect(b.log.some((l) => l.acao === 'credito_xp' && l.alvo === uid)).toBe(true)
  })

  it('o XP não depende do valor doado', () => {
    const b = getBanco()
    for (const uid of ['u_18', 'u_20', 'u_colab'])
      expect(R.previaXp(b, S.rascunhoReporte(uid, dados({ valor: 50 })))).toBe(R.previaXp(b, S.rascunhoReporte(uid, dados({ valor: 5000 }))))
  })

  it('aplica bônus de ciclos consecutivos com teto de 50%', () => {
    const b = getBanco()
    expect(R.bonusConsecutivoPct(b, 'u_1', 2027)).toBe(50) // participou de 2019 a 2026
    expect(R.bonusConsecutivoPct(b, 'u_colab', 2027)).toBe(30)
  })

  it('estorno remove o XP creditado e mantém log', () => {
    const r = S.enviarReporte('u_20', dados(), [comp('e1')])
    S.validar(r.id, 'u_admin')
    expect(R.xpTotal(getBanco(), 'u_20')).toBeGreaterThan(0)
    S.estornar(r.id, 'teste', 'u_admin')
    expect(R.xpTotal(getBanco(), 'u_20')).toBe(0)
    expect(getBanco().log.some((l) => l.acao === 'estornar_reporte')).toBe(true)
  })

  it('sinaliza comprovante duplicado', () => {
    S.enviarReporte('u_18', dados(), [comp('dup')])
    const r = S.enviarReporte('u_20', dados({ valor: 999 }), [comp('dup')])
    expect(r.duplicidadeSuspeita).toMatch(/Mesmo comprovante/)
  })
})

describe('critério 2: convidado e padrinho', () => {
  it('exige padrinho @weg.net', () => {
    expect(() => S.cadastrarConvidado({ nome: 'X', email: 'x@gmail.com', padrinhoEmail: 'alguem@gmail.com', municipio: 'Joinville' })).toThrow(/@weg.net/)
  })

  it('reporte do convidado só chega à fila após o padrinho aprovar, e o padrinho ganha bônus', () => {
    const c = S.cadastrarConvidado({ nome: 'Convidada Teste', email: 'conv@gmail.com', padrinhoEmail: 'camila.rodrigues@weg.net', municipio: 'Joinville' })
    const r = S.enviarReporte(c.id, dados({ municipio: 'Joinville' }), [comp('cv')])
    expect(r.status).toBe('aguardando_padrinho')
    S.decidirReportePadrinho('u_colab', r.id, true)
    expect(getBanco().reportes.find((x) => x.id === r.id)?.status).toBe('enviado')
    const xpPadrinho = R.xpTotal(getBanco(), 'u_colab')
    S.validar(r.id, 'u_admin')
    expect(R.xpTotal(getBanco(), 'u_colab')).toBe(xpPadrinho + 200)
  })
})

describe('missões', () => {
  it('respeita o limite diário de 50 XP', () => {
    const uid = 'u_18'
    S.checkin(uid) // 10
    S.responderPerguntaDia(uid) // 20
    S.registrarVisita(uid, 'historia', 'prj_1') // 15
    S.registrarVisita(uid, 'projeto', 'prj_2') // 15, limitado a 5
    expect(R.xpMissoesHoje(getBanco(), uid)).toBe(50)
  })
})

describe('critério 6: sem o vermelho proibido', () => {
  it('nenhum arquivo do app usa #C8102E', () => {
    const proibido = ['C8102E', '200, 16, 46', '200,16,46'].map((s) => s.toLowerCase())
    const varrer = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f)
        return statSync(p).isDirectory() ? varrer(p) : /\.(tsx?|css|html|json)$/.test(f) ? [p] : []
      })
    const arquivos = [...varrer('src'), 'index.html', 'vite.config.ts']
    const ofensores = arquivos.filter((a) => {
      const txt = readFileSync(a, 'utf8').toLowerCase()
      return proibido.some((p) => txt.includes(p))
    })
    expect(ofensores).toEqual([])
  })
})

describe('valor por extenso', () => {
  it.each([
    [1, 'um real'],
    [100, 'cem reais'],
    [150.5, 'cento e cinquenta reais e cinquenta centavos'],
    [1001, 'mil e um reais'],
    [2350, 'dois mil trezentos e cinquenta reais'],
    [1000000, 'um milhão de reais'],
    [0.01, 'um centavo'],
  ])('%s → %s', (v, txt) => expect(valorPorExtenso(v)).toBe(txt))
})

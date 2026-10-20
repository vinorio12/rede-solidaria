import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { getBanco, mutar, restaurarExemplo } from '@/data/db'
import * as R from '@/domain/regras'
import * as M from '@/domain/motor'
import * as J from '@/domain/jogo'
import * as S from '@/domain/servicos'
import { NIVEIS, xpDaCurva } from '@/domain/catalogo'
import type { Comprovante } from '@/domain/types'
import { valorPorExtenso } from '@/lib/datas'
import { diaSP, segundaSP } from '@/lib/tempo'
import { NAO_SE_APLICA, textoCarta, type DadosCarta } from '@/lib/cartaOficial'

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
const formConvidado = (extra: Partial<S.DadosFormularioConvidado> = {}): S.DadosFormularioConvidado => ({
  nome: 'Vizinha Teste',
  relacao: 'vizinho',
  modalidade: 'doacao_direta',
  fundoTipo: 'IDOSO',
  municipio: 'Joinville',
  uf: 'SC',
  valor: 80,
  dataPagamento: '2026-10-18',
  consentimento: true,
  dispositivo: `disp-${Math.random()}`,
  abertoEm: Date.now() - 10_000,
  ...extra,
})
const xp = (uid: string) => R.xpTotal(getBanco(), uid)
const patinhas = (uid: string) => R.saldoPatinhas(getBanco(), uid)

beforeEach(() => restaurarExemplo())

describe('dados de exemplo v2', () => {
  it('cobre todos os tiers, prestígio, alcateias, trilha, raridades e convidados em todos os status', () => {
    const b = getBanco()
    expect(b.usuarios.length).toBe(29)
    expect(b.usuarios.some((u) => (u.perfil as string) === 'convidado')).toBe(false)
    const tiers = new Set(b.usuarios.filter((u) => u.perfil !== 'admin').map((u) => R.statusJogador(b, u.id).tier.numero))
    for (const t of [1, 2, 3, 4, 5]) expect(tiers).toContain(t)
    expect(b.usuarios.some((u) => R.statusJogador(b, u.id).prestigio.estrelas > 0)).toBe(true)
    expect(b.alcateias.length).toBe(3)
    expect(b.usuarioTrilhas.some((t) => t.resgatados.length > 0)).toBe(true)
    for (const r of J.RARIDADES) expect(b.itens.some((i) => i.raridade === r)).toBe(true)
    const statusConvidado = new Set(b.reportes.filter((r) => r.convidado).map((r) => r.status))
    for (const s of ['aguardando_colaborador', 'enviado', 'em_validacao', 'validado', 'devolvido', 'recusado_colaborador', 'estornado']) expect(statusConvidado).toContain(s)
    expect(b.reportes.find((r) => r.convidado?.nome === 'Helena Rodrigues')?.usuarioId).toBe('u_colab')
    expect(R.totalArrecadado(b, 2027)).toBe(b.reportes.filter((r) => r.status === 'validado' && r.ciclo === 2027).reduce((s, r) => s + r.valor, 0))
  })

  it('o pin 2026 usa a arte oficial', () => {
    expect(getBanco().pins.find((p) => p.ano === 2026)?.arte).toBe('pin-2026')
  })
})

describe('reporte, validação e XP (v1 mantida)', () => {
  it('colaborador reporta para si e para familiar e os reportes vão para a fila', () => {
    const r1 = S.enviarReporte('u_11', dados({ municipio: 'Joinville' }), [comp('a1')])
    const fam = S.salvarFamiliar({ usuarioId: 'u_11', nome: 'Fulana', parentesco: 'conjuge', municipio: 'Joinville' })
    const r2 = S.enviarReporte('u_11', dados({ familiarId: fam.id, valor: 150 }), [comp('a2')])
    const fila = getBanco().reportes.filter((r) => ['enviado', 'em_validacao'].includes(r.status)).map((r) => r.id)
    expect(fila).toEqual(expect.arrayContaining([r1.id, r2.id]))
  })

  it('validação credita XP e Patinhas, desbloqueia o pin e recalcula a meta', () => {
    const uid = 'u_20' // sem histórico
    const totalAntes = R.totalArrecadado(getBanco(), 2027)
    const r = S.enviarReporte(uid, dados({ valor: 321 }), [comp('b1')])
    S.validar(r.id, 'u_admin')
    const b = getBanco()
    const doReporte = b.transacoesXp.filter((t) => t.usuarioId === uid && (t.origem === 'reporte')).reduce((s, t) => s + t.xp, 0)
    expect(doReporte).toBe(750)
    expect(patinhas(uid)).toBeGreaterThanOrEqual(100)
    expect(b.usuarioPins.some((p) => p.usuarioId === uid && p.ano === 2027)).toBe(true)
    expect(R.totalArrecadado(b, 2027)).toBe(totalAntes + 321)
  })

  it('o XP não depende do valor doado', () => {
    const b = getBanco()
    for (const uid of ['u_18', 'u_20', 'u_colab']) expect(R.previaXp(b, S.rascunhoReporte(uid, dados({ valor: 50 })))).toBe(R.previaXp(b, S.rascunhoReporte(uid, dados({ valor: 5000 }))))
  })

  it('sinaliza comprovante duplicado', () => {
    S.enviarReporte('u_18', dados(), [comp('dup')])
    expect(S.enviarReporte('u_20', dados({ valor: 999 }), [comp('dup')]).duplicidadeSuspeita).toMatch(/Mesmo comprovante/)
  })
})

describe('critério 2: convidado sem cadastro', () => {
  it('o link abre só o formulário, o colaborador confirma e o XP vai para ele', () => {
    const link = S.gerarLinkConvidado('u_11')
    expect(S.infoLinkPublico(link.codigo)?.primeiroNome).toBe('Karina')
    const id = S.enviarReporteConvidado(link.codigo, formConvidado(), [comp('cv1')])
    let r = getBanco().reportes.find((x) => x.id === id)!
    expect(r.status).toBe('aguardando_colaborador')
    expect(r.usuarioId).toBe('u_11')
    const usuariosAntes = getBanco().usuarios.length
    S.decidirReporteConvidado('u_11', id, true)
    r = getBanco().reportes.find((x) => x.id === id)!
    expect(r.status).toBe('enviado')
    const antes = xp('u_11')
    S.validar(id, 'u_admin')
    expect(xp('u_11') - antes).toBeGreaterThanOrEqual(getBanco().configuracoes.tabelaXp.reporteConvidado)
    expect(getBanco().usuarios.length).toBe(usuariosAntes) // convidado não vira usuário
  })

  it('reporte recusado pelo colaborador não chega à fila', () => {
    const link = S.gerarLinkConvidado('u_11')
    const id = S.enviarReporteConvidado(link.codigo, formConvidado(), [comp('cv2')])
    S.decidirReporteConvidado('u_11', id, false)
    expect(getBanco().reportes.find((x) => x.id === id)!.status).toBe('recusado_colaborador')
    S.validar(id, 'u_admin')
    expect(getBanco().reportes.find((x) => x.id === id)!.status).toBe('recusado_colaborador')
  })

  it('protege contra abuso: campo-armadilha, envio instantâneo e limite por edição', () => {
    const link = S.gerarLinkConvidado('u_11')
    expect(() => S.enviarReporteConvidado(link.codigo, formConvidado({ site: 'spam' }), [comp('x1')])).toThrow()
    expect(() => S.enviarReporteConvidado(link.codigo, formConvidado({ abertoEm: Date.now() }), [comp('x2')])).toThrow()
    mutar((b) => (b.configuracoes.convidados.limitePorEdicao = 1))
    S.enviarReporteConvidado(link.codigo, formConvidado(), [comp('x3')])
    expect(() => S.enviarReporteConvidado(link.codigo, formConvidado(), [comp('x4')])).toThrow(/limite/i)
  })
})

describe('critério 4: idempotência e estorno', () => {
  it('evento idempotente repetido não grava nem notifica (evita laço de atualização na tela)', () => {
    S.registrar('u_11', 'pin_visualizado', { ref: '2026' }, 'pin:2026')
    const antes = getBanco()
    expect(S.registrar('u_11', 'pin_visualizado', { ref: '2026' }, 'pin:2026')).toEqual([])
    expect(getBanco()).toBe(antes)
  })
  it('o mesmo evento nunca premia duas vezes', () => {
    mutar((b) => {
      const um = M.registrarEvento(b, 'u_11', 'perfil_completo', {}, { chave: 'perfil', premio: { xp: [{ xp: 50, origem: 'perfil_completo', descricao: 'teste' }] } })
      const dois = M.registrarEvento(b, 'u_11', 'perfil_completo', {}, { chave: 'perfil', premio: { xp: [{ xp: 50, origem: 'perfil_completo', descricao: 'teste' }] } })
      expect(um).not.toBeNull()
      expect(dois).toBeNull()
    })
    const r = S.enviarReporte('u_20', dados(), [comp('idem')])
    S.validar(r.id, 'u_admin')
    const depois = xp('u_20')
    mutar((b) => R.validarReporte(b, r.id, 'u_admin'))
    expect(xp('u_20')).toBe(depois)
  })

  it('a devolução de um reporte validado estorna XP, Patinhas, pontos de temporada e insígnias', () => {
    const uid = 'u_20'
    const b0 = getBanco()
    const antes = { xp: xp(uid), pt: patinhas(uid), temporada: R.pontosTemporada(b0, uid), insignias: b0.usuarioInsignias.filter((i) => i.usuarioId === uid).length }
    const r = S.enviarReporte(uid, dados(), [comp('est1')])
    S.validar(r.id, 'u_admin')
    const b1 = getBanco()
    expect(xp(uid)).toBeGreaterThan(antes.xp)
    expect(b1.usuarioInsignias.some((i) => i.usuarioId === uid && i.insigniaId === 'primeira_destinacao')).toBe(true)
    S.devolver(r.id, 'teste de estorno', 'u_admin')
    const b2 = getBanco()
    expect(xp(uid)).toBe(antes.xp)
    expect(patinhas(uid)).toBe(antes.pt)
    expect(R.pontosTemporada(b2, uid)).toBe(antes.temporada)
    expect(b2.usuarioInsignias.filter((i) => i.usuarioId === uid).length).toBe(antes.insignias)
    expect(b2.usuarioPins.some((p) => p.usuarioId === uid && p.ano === 2027)).toBe(false)
  })
})

describe('critério 5: 25 níveis, tiers e títulos', () => {
  it('a curva segue a tabela da seção 6', () => {
    const esperado = [0, 100, 350, 700, 1150, 1650, 2300, 3000, 3800, 4700, 5600, 6650, 7750, 8900, 10150, 11450, 12800, 14250, 15750, 17300, 18900, 20600, 22350, 24150, 26000]
    expect(NIVEIS.map((n) => n.xpMinimo)).toEqual(esperado)
    expect(NIVEIS.map((n) => n.tier)).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5])
    // a tabela oficial fica a até 3% da fórmula 100 × (n − 1)^1,75
    for (const n of NIVEIS.slice(1)) expect(Math.abs(n.xpMinimo - xpDaCurva(n.nivel)) / n.xpMinimo).toBeLessThan(0.03)
  })

  it('títulos e tiers respeitam a forma de gênero escolhida', () => {
    const uid = 'u_4' // Diego, nível 11+
    S.atualizarPerfil(uid, { genero: 'm' })
    const m = R.statusJogador(getBanco(), uid)
    S.atualizarPerfil(uid, { genero: 'f' })
    const f = R.statusJogador(getBanco(), uid)
    S.atualizarPerfil(uid, { genero: 'n' })
    const n = R.statusJogador(getBanco(), uid)
    expect(m.tier.numero).toBe(3)
    expect([m.tierNome, f.tierNome, n.tierNome]).toEqual(['Leão Protetor', 'Leoa Protetora', 'Tier Protetor'])
    expect(new Set([m.tituloNivel, f.tituloNivel]).size).toBeGreaterThanOrEqual(1)
  })

  it('prestígio: uma Estrela de Lenda a cada 4.000 XP depois do nível 25', () => {
    const b = getBanco()
    expect(R.estrelasPrestigio(b, 26000 + 3999).estrelas).toBe(0)
    expect(R.estrelasPrestigio(b, 26000 + 4000).estrelas).toBe(1)
    expect(R.estrelasPrestigio(b, 26000 + 20000).estrelas).toBe(5)
  })

  it('subida de nível paga 30 Patinhas × tier', () => {
    const uid = 'u_20'
    const antes = patinhas(uid)
    mutar((b) => M.creditarXp(b, uid, 100, 'ajuste', 'teste'))
    expect(patinhas(uid) - antes).toBe(30) // nível 2, tier 1
  })
})

describe('critério 6: Loja do Leão e avatar', () => {
  it('lendários não estão à venda e não aparecem nas ofertas', () => {
    const b = getBanco()
    const lendario = b.itens.find((i) => i.raridade === 'lendaria')!
    expect(J.precoItem(b, lendario)).toBeNull()
    expect(J.ofertasLoja(b).ofertas.every((i) => i.raridade !== 'lendaria')).toBe(true)
    expect(() => S.comprarItem('u_1', lendario.id)).toThrow(/lendários/)
  })

  it('item comprado aparece na coleção e pode ser equipado no avatar', () => {
    const uid = 'u_1'
    const b = getBanco()
    const oferta = J.ofertasLoja(b).ofertas.find((i) => !J.possuiItem(b, uid, i))!
    mutar((bb) => M.creditarPatinhas(bb, uid, 1000, 'ajuste', 'teste'))
    S.comprarItem(uid, oferta.id)
    expect(J.possuiItem(getBanco(), uid, oferta)).toBe(true)
    S.equipar(uid, oferta.categoria as never, oferta.id)
    expect(getBanco().usuarios.find((u) => u.id === uid)!.avatar[oferta.categoria as 'cabeca']).toBe(oferta.id)
  })

  it('não equipa item que a pessoa não tem', () => {
    expect(() => S.equipar('u_20', 'cabeca', 'cab_coroa_folhas')).toThrow()
  })
})

describe('critério 7: diárias', () => {
  it('são sorteadas por usuário e o dia vira à meia-noite de Brasília', () => {
    expect(diaSP('2026-10-20T02:59:00Z')).toBe('2026-10-19') // 23:59 em Brasília
    expect(diaSP('2026-10-20T03:00:00Z')).toBe('2026-10-20') // 00:00 em Brasília
    expect(segundaSP('2026-10-25T12:00:00-03:00')).toBe('2026-10-19')
    const sorteios = mutar((b) => ['u_4', 'u_5', 'u_6', 'u_7', 'u_8', 'u_9'].map((u) => M.sorteioDe(b, u, 'dia', '2026-10-21').missoes.join(',')))
    expect(new Set(sorteios).size).toBeGreaterThan(1)
    expect(sorteios.every((s) => s.split(',').length === 3)).toBe(true)
  })

  it('respeitam o limite de 50 XP por dia', () => {
    const uid = 'u_22'
    mutar((b) => {
      const s = M.sorteioDe(b, uid, 'dia', diaSP())
      s.missoes = ['d_pergunta', 'd_entidade', 'd_historia']
    })
    S.registrar(uid, 'pergunta_do_dia_respondida') // 20
    S.registrar(uid, 'entidade_visitada', { ref: 'ent_3', municipio: 'Guaramirim' }) // 20 (município do usuário)
    S.registrar(uid, 'historia_lida', { ref: 'prj_1' }) // 15, limitado a 10
    expect(M.xpDiariasNoDia(getBanco(), uid, diaSP())).toBe(50)
    expect(M.bauDisponivel(getBanco(), uid, 'dia', diaSP())).toBe(true)
    const antes = patinhas(uid)
    S.abrirBau(uid, 'dia', diaSP())
    expect(patinhas(uid) - antes).toBe(getBanco().configuracoes.patinhas.bauDia)
    expect(S.abrirBau(uid, 'dia', diaSP())).toBe(0)
  })

  it('a troca gratuita vale uma vez por dia', () => {
    const uid = 'u_22'
    const dia = diaSP()
    const s = mutar((b) => M.sorteioDe(b, uid, 'dia', dia))
    expect(S.trocarDiaria(uid, dia, s.missoes[0])).toBe(true)
    expect(S.trocarDiaria(uid, dia, getBanco().sorteios.find((x) => x.usuarioId === uid && x.periodo === dia)!.missoes[1])).toBe(false)
  })
})

describe('critério 9: regras configuráveis sem código', () => {
  it('alterar o XP de uma missão no painel muda o prêmio', () => {
    const uid = 'u_22'
    mutar((b) => {
      b.missoes.find((m) => m.id === 'f_primeiro')!.xp = 77
    })
    const antes = xp(uid)
    S.salvarFamiliar({ usuarioId: uid, nome: 'Teste', parentesco: 'filho', municipio: 'Joinville' })
    expect(xp(uid) - antes).toBeGreaterThanOrEqual(77)
  })

  it('jornada: capítulo concluído entrega o item exclusivo', () => {
    const uid = 'u_22'
    S.atualizarPerfil(uid, { cpf: '1', endereco: 'x', telefone: '1' })
    S.equipar(uid, 'juba', 'juba_classica')
    S.registrar(uid, 'licao_guia_concluida', { ref: 'licao-1' }, 'licao-1')
    expect(getBanco().usuarioItens.some((i) => i.usuarioId === uid && i.itemId === 'jornada_cap1')).toBe(true)
  })
})

describe('carta oficial (pessoa física e jurídica)', () => {
  const base: DadosCarta = {
    variante: 'pf',
    codigo: 'X',
    urlVerificacao: '',
    conselhoNome: 'Conselho Municipal dos Direitos da Criança e do Adolescente de Jaraguá do Sul (CMDCA)',
    tipoFundo: 'FIA',
    municipioFundo: 'Jaraguá do Sul',
    ufFundo: 'SC',
    doadorNome: 'Fulana de Tal',
    doadorDocumento: '123.456.789-09',
    doadorEndereco: 'Rua A, 1',
    valor: 150,
    dataDeposito: '2026-10-20',
    instituicao: 'Entidade',
    cnpjInstituicao: '00.000.000/0001-00',
    projeto: 'Projeto',
    chancela: '',
    emitidaEm: '2026-10-20T12:00:00Z',
  }
  it('pessoa física usa IRPF, CPF e "Não se aplica" sem chancela', () => {
    const t = textoCarta(base)
    expect(t.titulo).toBe('CARTA DE DIRECIONAMENTO DE DESTINAÇÃO DE IMPOSTO DE RENDA')
    expect(t.paragrafos[0]).toMatch(/Eu, Fulana de Tal, inscrito\(a\) no CPF.*IRPF/)
    expect(t.paragrafos[1]).toContain('cento e cinquenta reais')
    expect(t.itens.find(([k]) => k.startsWith('Número'))![1]).toBe(NAO_SE_APLICA)
    expect(t.local).toBe('Jaraguá do Sul - SC, 20 de outubro de 2026.')
    expect(t.referencia).toBe('Ref.: Direcionamento de Recursos Incentivados (FIA)')
  })
  it('pessoa jurídica usa IRPJ (Lucro Real) e CNPJ', () => {
    const t = textoCarta({ ...base, variante: 'pj', doadorNome: 'Empresa S.A.', doadorDocumento: '11.111.111/0001-11', chancela: '012/2026' })
    expect(t.paragrafos[0]).toMatch(/A empresa Empresa S.A., inscrita no CNPJ.*IRPJ, Lucro Real/)
    expect(t.pedido).toMatch(/em nome da nossa empresa, contendo a razão social, CNPJ/)
    expect(t.itens.find(([k]) => k.startsWith('Número'))![1]).toBe('012/2026')
  })
})

describe('critério 10: sem o vermelho proibido', () => {
  it('nenhum arquivo do app usa #C8102E', () => {
    const proibido = ['C8102E', '200, 16, 46', '200,16,46'].map((s) => s.toLowerCase())
    const varrer = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f)
        return statSync(p).isDirectory() ? varrer(p) : /\.(tsx?|css|html|json)$/.test(f) ? [p] : []
      })
    const ofensores = [...varrer('src'), 'index.html', 'vite.config.ts'].filter((a) => proibido.some((p) => readFileSync(a, 'utf8').toLowerCase().includes(p)))
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

import type { Projeto, TipoFundo } from '@/domain/types'

// Importação (XLSX/CSV) e exportação (XLSX) do painel. As bibliotecas são
// carregadas sob demanda para não pesar no app do colaborador.

export type Celula = string | number | boolean | Date | null
export interface Aba {
  nome: string
  linhas: Celula[][]
}

export async function lerPlanilha(arquivo: File): Promise<Aba[]> {
  if (/\.csv$/i.test(arquivo.name) || arquivo.type === 'text/csv') {
    return [{ nome: arquivo.name.replace(/\.csv$/i, ''), linhas: parseCsv(await arquivo.text()) }]
  }
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const abas = await readXlsxFile(arquivo)
  return abas.map((a) => ({ nome: a.sheet, linhas: a.data as unknown as Celula[][] }))
}

/** CSV com separador ; ou , e aspas, como sai do Excel em pt-BR. */
export function parseCsv(texto: string): Celula[][] {
  const limpo = texto.replace(/^﻿/, '')
  const primeira = limpo.split(/\r?\n/)[0] ?? ''
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ';' : ','
  const linhas: Celula[][] = []
  let linha: string[] = []
  let campo = ''
  let aspas = false
  for (let i = 0; i < limpo.length; i++) {
    const ch = limpo[i]
    if (aspas) {
      if (ch === '"' && limpo[i + 1] === '"') {
        campo += '"'
        i++
      } else if (ch === '"') aspas = false
      else campo += ch
    } else if (ch === '"') aspas = true
    else if (ch === sep) {
      linha.push(campo)
      campo = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && limpo[i + 1] === '\n') i++
      linha.push(campo)
      if (linha.some((c) => c.trim())) linhas.push(linha)
      linha = []
      campo = ''
    } else campo += ch
  }
  linha.push(campo)
  if (linha.some((c) => c.trim())) linhas.push(linha)
  return linhas
}

export async function exportarXlsx(abas: { nome: string; colunas: string[]; linhas: Celula[][] }[], arquivo: string) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const sheets = abas.map((a) => ({
    sheet: a.nome.slice(0, 31),
    data: [
      a.colunas.map((c) => ({ value: c, fontWeight: 'bold' as const })),
      ...a.linhas.map((l) => l.map((v) => (v === null || v === undefined ? null : { value: v as string | number | boolean | Date }))),
    ],
    columns: a.colunas.map((c) => ({ width: Math.max(12, Math.min(40, c.length + 4)) })),
    stickyRowsCount: 1,
  }))
  await writeXlsxFile(sheets as never).toFile(arquivo)
}

// ------------------------------------------------ "Relatório Geral de repasses" (seção 6.5)

const normalizar = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Colunas da aba REALIZADO (sem os campos de contato, que não são importados). */
export const COLUNAS_REPASSES: Record<string, string[]> = {
  idExterno: ['numero do projeto', 'n do projeto', 'no do projeto'],
  nome: ['nome do projeto'],
  proponente: ['proponente'],
  mantenedora: ['mantenedora/gestora', 'mantenedora gestora', 'mantenedora'],
  cnpj: ['cnpj'],
  cidade: ['cidade'],
  estado: ['estado', 'uf'],
  area: ['area'],
  publico: ['publico'],
  valor: ['valor apoiado'],
  fundo: ['rp/lei de incentivo', 'rp / lei de incentivo', 'lei de incentivo'],
  ano: ['ano'],
  mes: ['mes de pagamento', 'mes'],
  objetivo: ['objetivo'],
  descricao: ['descricao do projeto', 'descricao'],
  beneficiados: ['n beneficiados', 'no beneficiados', 'numero de beneficiados', 'beneficiados'],
}

export const FUNDOS_ACEITOS: Record<string, TipoFundo> = {
  'fundo da infancia e adolescencia': 'FIA',
  'fundo do idoso': 'IDOSO',
}

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function numeroBr(v: Celula) {
  if (typeof v === 'number') return v
  const s = String(v ?? '')
    .replace(/[R$\s]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export interface ResultadoImportacao {
  aba: string
  projetos: Projeto[]
  ignorados: number
  colunasFaltando: string[]
}

export function mapearRepasses(abas: Aba[]): ResultadoImportacao {
  const aba = abas.find((a) => normalizar(a.nome) === 'realizado') ?? abas[0]
  if (!aba) return { aba: '', projetos: [], ignorados: 0, colunasFaltando: Object.keys(COLUNAS_REPASSES) }
  // a linha de cabeçalho é a primeira que contém "nome do projeto"
  const iCab = aba.linhas.findIndex((l) => l.some((c) => normalizar(c) === 'nome do projeto'))
  const cab = (aba.linhas[iCab] ?? []).map(normalizar)
  const idx: Record<string, number> = {}
  for (const [campo, nomes] of Object.entries(COLUNAS_REPASSES)) idx[campo] = cab.findIndex((c) => nomes.includes(c))
  const colunasFaltando = ['nome', 'fundo', 'valor'].filter((c) => idx[c] < 0)
  if (iCab < 0 || colunasFaltando.length) return { aba: aba.nome, projetos: [], ignorados: 0, colunasFaltando }

  const get = (l: Celula[], campo: string) => (idx[campo] >= 0 ? l[idx[campo]] : null)
  let ignorados = 0
  const projetos: Projeto[] = []
  aba.linhas.slice(iCab + 1).forEach((l, i) => {
    const fundo = FUNDOS_ACEITOS[normalizar(get(l, 'fundo'))]
    if (!fundo || !get(l, 'nome')) {
      ignorados++
      return
    }
    const mesBruto = get(l, 'mes')
    const mes = typeof mesBruto === 'number' ? mesBruto : MESES.indexOf(normalizar(mesBruto)) + 1 || Number(mesBruto) || 1
    const proponente = String(get(l, 'proponente') ?? '').trim()
    const mantenedora = String(get(l, 'mantenedora') ?? '').trim()
    projetos.push({
      id: `prj_imp_${Date.now().toString(36)}_${i}`,
      idExterno: String(get(l, 'idExterno') ?? '').trim(),
      nome: String(get(l, 'nome')).trim(),
      entidade: proponente || mantenedora,
      cnpjEntidade: String(get(l, 'cnpj') ?? '').trim(),
      municipio: String(get(l, 'cidade') ?? '').trim(),
      uf: String(get(l, 'estado') ?? '').trim().toUpperCase().slice(0, 2),
      area: String(get(l, 'area') ?? '').trim(),
      publico: String(get(l, 'publico') ?? '').trim(),
      valorRepassado: numeroBr(get(l, 'valor')),
      fundo,
      ano: Number(get(l, 'ano')) || new Date().getFullYear(),
      mes,
      objetivo: String(get(l, 'objetivo') ?? '').trim(),
      descricao: String(get(l, 'descricao') ?? '').trim(),
      beneficiados: numeroBr(get(l, 'beneficiados')),
      ods: [],
      status: 'em_execucao',
      origem: 'empresa', // repasses institucionais da WEG
      indicadores: [],
    })
  })
  return { aba: aba.nome, projetos, ignorados, colunasFaltando: [] }
}

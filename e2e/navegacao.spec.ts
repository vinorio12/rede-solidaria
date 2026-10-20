import { expect, test, type Page } from '@playwright/test'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Percorre todas as rotas do menu e do painel com cada perfil de teste, navegando
// por cliques (como o usuário faz). Falha se #root ficar vazia, se a tela de erro
// aparecer ou se houver erro no console.

const ARQUIVO = pathToFileURL(resolve('dist-arquivo/rede-solidaria.html')).href

function inicio(baseURL: string | undefined) {
  return baseURL === 'arquivo' ? ARQUIVO : baseURL!
}

function vigiarErros(page: Page) {
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`)
  })
  return erros
}

async function conferirTela(page: Page, onde: string, erros: string[]) {
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('main#conteudo, #root > *').first(), `#root vazia em ${onde}`).toBeVisible()
  const tamanho = await page.evaluate(() => document.getElementById('root')?.innerHTML.length ?? 0)
  expect(tamanho, `tela branca em ${onde}`).toBeGreaterThan(200)
  await expect(page.getByText('Ops, esta tela não carregou'), `tela de erro em ${onde}`).toHaveCount(0)
  expect(erros, `erros no console em ${onde}`).toEqual([])
}

async function entrar(page: Page, url: string, perfil: string) {
  await page.goto(url)
  await page.evaluate(() => localStorage.clear())
  await page.goto(url)
  await page.getByRole('button', { name: new RegExp(perfil) }).first().click()
  // onboarding do primeiro acesso
  await page.getByRole('button', { name: 'Vamos lá' }).click({ timeout: 5000 }).catch(() => undefined)
}

async function percorrer(page: Page, seletor: string, erros: string[], voltas = 2) {
  for (let v = 0; v < voltas; v++) {
    const links = page.locator(seletor)
    const total = await links.count()
    expect(total).toBeGreaterThan(2)
    for (let i = 0; i < total; i++) {
      const link = page.locator(seletor).nth(i)
      const destino = (await link.getAttribute('href')) ?? `#${i}`
      await link.click()
      await page.waitForTimeout(destino.includes('pins') ? 1500 : 250)
      await conferirTela(page, destino, erros)
    }
  }
}

for (const perfil of ['Colaborador', 'Embaixador', 'Administrador']) {
  test(`${perfil}: navega por todo o menu sem tela branca`, async ({ page, baseURL }) => {
    const erros = vigiarErros(page)
    await entrar(page, inicio(baseURL), perfil)
    await conferirTela(page, 'início', erros)
    await percorrer(page, 'aside nav a', erros)
    if (perfil === 'Administrador') {
      await page.locator('aside nav a', { hasText: 'Painel administrativo' }).click()
      await percorrer(page, 'nav[aria-label="Seções do painel"] a', erros)
    }
  })
}

test('Celular: navegação inferior e menu completo', async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const erros = vigiarErros(page)
  await entrar(page, inicio(baseURL), 'Colaborador')
  await percorrer(page, 'nav[aria-label="Navegação principal"] a', erros, 1)
  await page.getByRole('button', { name: 'Menu' }).click()
  const total = await page.locator('[role="dialog"] nav a').count()
  await page.locator('[role="dialog"]').getByRole('button', { name: 'Fechar' }).last().click()
  for (let i = 0; i < total; i++) {
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.locator('[role="dialog"] nav a').nth(i).click()
    await page.waitForTimeout(250)
    await conferirTela(page, `menu ${i}`, erros)
  }
})

test('Sem WebGL 2 a coleção de pins mostra a imagem 2D e o app continua navegável', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, tipo: string, ...resto: unknown[]) {
      return tipo === 'webgl2' ? null : (original as (...a: unknown[]) => unknown).call(this, tipo, ...resto)
    } as typeof original
  })
  const erros = vigiarErros(page)
  await entrar(page, inicio(baseURL), 'Colaborador')
  await page.locator('aside nav a', { hasText: 'Coleção de pins' }).click()
  await expect(page.getByRole('img', { name: /Pin 20\d\d/ }).first()).toBeVisible()
  await conferirTela(page, 'pins sem WebGL 2', erros)
  await page.locator('aside nav a', { hasText: 'Ranking' }).click()
  await conferirTela(page, 'ranking depois dos pins', erros)
})

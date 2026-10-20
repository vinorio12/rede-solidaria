import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

// Teste de navegação ponta a ponta nos três ambientes do app:
// dev (vite), preview (build com service worker) e arquivo único aberto por file://.
// Se o Chromium não estiver instalado: npx playwright install chromium

const chromiumLocal = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const executavel = process.env.CHROMIUM_PATH ?? (existsSync(chromiumLocal) ? chromiumLocal : undefined)

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './e2e/preparar.ts',
  use: {
    ...devices['Desktop Chrome'],
    launchOptions: {
      executablePath: executavel,
      args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    { name: 'dev', use: { baseURL: 'http://localhost:5174/' } },
    { name: 'preview', use: { baseURL: 'http://localhost:4174/' } },
    { name: 'arquivo', use: { baseURL: 'arquivo' } },
  ],
  webServer: [
    { command: 'npx vite --port 5174 --strictPort', url: 'http://localhost:5174/', reuseExistingServer: false, timeout: 60_000 },
    { command: 'npx vite preview --port 4174 --strictPort', url: 'http://localhost:4174/', reuseExistingServer: false, timeout: 60_000 },
  ],
})

/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath, URL } from 'node:url'

// `npm run build:arquivo` gera dist-arquivo/rede-solidaria.html: o app inteiro num
// único HTML que abre com duplo clique, sem servidor (para testar sem instalar nada).
export default defineConfig(({ mode }) => {
  const arquivo = mode === 'arquivo'
  return {
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    plugins: [
      react(),
      tailwindcss(),
      ...(arquivo ? [viteSingleFile()] : []),
      VitePWA({
        disable: arquivo,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Rede Solidária WEG',
          short_name: 'Rede Solidária',
          description: 'Reporte sua destinação do IR, acompanhe a meta e conheça os projetos apoiados.',
          lang: 'pt-BR',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#ffffff',
          theme_color: '#00325C',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}'],
        // remove caches de versões anteriores: um index.html antigo nunca aponta para arquivos que sumiram
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/verificar\//],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
      }),
    ],
    build: arquivo ? { outDir: 'dist-arquivo', chunkSizeWarningLimit: 6000 } : { chunkSizeWarningLimit: 1000 },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
      exclude: ['e2e/**', 'node_modules/**'],
    },
  }
})

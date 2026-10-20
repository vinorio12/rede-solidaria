import { execSync } from 'node:child_process'

// Gera os dois builds usados pelos projetos "preview" e "arquivo" antes dos testes.
export default function preparar() {
  execSync('npx vite build', { stdio: 'ignore' })
  execSync('npx vite build --mode arquivo && node scripts/renomear-arquivo.mjs', { stdio: 'ignore' })
}

import { renameSync } from 'node:fs'

// Dá ao HTML único um nome que faça sentido para quem recebe o arquivo.
renameSync('dist-arquivo/index.html', 'dist-arquivo/rede-solidaria.html')
console.log('Gerado: dist-arquivo/rede-solidaria.html')

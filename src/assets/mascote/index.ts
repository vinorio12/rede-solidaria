import neutro from './leao-neutro.png'

// Arte oficial do leãozinho (extraída do arquivo MASCOTE.pdf da equipe).
// Quando chegarem as poses dedicadas (comemorando, apontando, pensando),
// basta salvar os PNG nesta pasta e apontar cada variante para o arquivo novo.
export const ARTES_MASCOTE = {
  neutro,
  comemorando: neutro,
  apontando: neutro,
  pensando: neutro,
  acenando: neutro,
  dormindo: neutro,
} as const

export type VarianteMascote = keyof typeof ARTES_MASCOTE

# Rede Solidária WEG — app (protótipo)

App interno da Rede Solidária (Seção Desenvolvimento Social): reporte das destinações de Imposto de Renda, termômetro da meta, projetos apoiados, entidades chanceladas com carta de destinação, gamificação (XP, níveis, insígnias, missões, ranking, recompensas) e coleção de pins anuais em 3D.

Uma única base de código para **web e celular**: React + TypeScript + Vite + Tailwind, mobile-first, instalável como **PWA** e pronta para empacotar com **Capacitor**. Especificação completa em [`docs/prompt_app_rede_solidaria.md`](docs/prompt_app_rede_solidaria.md).

> Todos os dados são fictícios e marcados como exemplo. O login é simulado.

## Como rodar

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm test           # regras de negócio e critérios de aceite
npm run build      # build de produção (PWA) em dist/
npm run preview    # serve o build
```

Na tela de entrada, escolha um perfil de teste:

| Perfil | Usuário | O que testar |
|---|---|---|
| Colaborador | Camila Rodrigues | Reportar (para si e familiares), missões, ranking, pins, convites, carta, aprovação de padrinho (é madrinha da Helena) |
| Embaixador | Rafael Tomaselli | Selo e missão exclusiva de embaixador |
| Convidado | Helena Rodrigues | Acesso limitado; reporte vai primeiro para o padrinho |
| Administrador | Equipe Desenvolvimento Social | Painel em `/admin` |

O botão “Restaurar dados de exemplo” na tela de entrada recria a base local.

## Mascote e pins

- **Leãozinho**: arte oficial extraída do arquivo `MASCOTE.pdf`, em `src/assets/mascote/`. Toda a interface usa o componente único `<Mascote variante="..." />` (`src/components/Mascote.tsx`). Quando chegarem as poses dedicadas (comemorando, apontando, pensando), basta salvar os PNG na pasta e apontar cada variante em `src/assets/mascote/index.ts`.
- **Pin 2026** (entregue em 2026 aos 211 colaboradores): a face frontal foi recortada da foto e é usada como textura no visualizador 3D, nas miniaturas, no card compartilhável e no certificado. Arquivos em `src/assets/pins/2026/`.
- **Demais anos** (2011–2025 e 2027): modelo procedural (disco esmaltado com relevo, ano e leãozinho) até a equipe enviar as artes. Para cadastrar a arte de um ano, salve `src/assets/pins/<ano>/frente.png` (círculo 512×512, fundo transparente), registre a chave em `src/lib/pinArte.ts` e selecione-a em **Painel › Cadastros › Pins**. Um modelo `.glb` também pode ser informado por URL.
- As artes circulares alternativas enviadas estão em `docs/referencias/` para consulta.

O visualizador 3D (`src/components/PinViewer3D.tsx`) usa Three.js + React Three Fiber, com reflexo metálico, verniz na face, fecho borboleta no verso, rotação por toque/mouse e brilho ao desbloquear. Sem WebGL, cai para imagem 2D com giro em CSS.

## Modelo de ciclos

O ciclo é a **edição** do programa (ano do evento e do pin). A edição 2026 já foi entregue; a edição ativa é a **2027**, com doações diretas até 31/12/2026 e declaração até o prazo final de 2027. Tudo isso é configurável em **Painel › Meta e ciclo**. A participação anterior ao app (pins físicos já recebidos) entra como histórico e conta para insígnias de veterano, pioneiro e bônus de ciclos consecutivos.

## Estrutura

```
src/
  domain/      types.ts (modelo de dados), regras.ts (XP, níveis, insígnias, missões, validação, estorno),
               servicos.ts (contrato de API), ranking.ts
  data/        db.ts (repositório local), seed.ts (dados de exemplo), useBanco.ts
  auth/        AuthContext.tsx (camada abstrata; login simulado, pronta para o SSO WEG)
  pages/       telas do app; pages/admin/ painel da Seção DS
  components/  Mascote, Layout (navegação inferior no celular, menu lateral no computador), PinViewer3D, gráficos
  lib/         datas e moeda, valor por extenso, PDF (carta e certificado), planilhas XLSX/CSV, card da conquista
  i18n/        pt-BR.ts (textos centralizados para futuras versões em inglês e espanhol)
tests/         testes das regras e dos critérios de aceite
```

### Back-end

Nesta versão os dados ficam no navegador (`localStorage`), atrás de `src/data/db.ts` e `src/domain/servicos.ts`. Cada função de serviço corresponde a um endpoint REST; a integração com o back-end definido pela TI troca só essas duas camadas. O total arrecadado é sempre calculado a partir dos reportes validados.

### Capacitor (etapa futura)

`capacitor.config.json` já aponta para `dist/`. Para gerar os apps nativos:

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm run build && npx cap add android && npx cap add ios && npx cap sync
```

## Critérios de aceite

| # | Critério | Onde |
|---|---|---|
| 1 | Reporte para si e familiar chega à fila | `/reportar`, `/admin/validacao`; teste em `tests/regras.test.ts` |
| 2 | Convidado exige padrinho @weg.net e aprovação antes da Seção DS | `/cadastro-convidado`, `/padrinho`; teste |
| 3 | Validação credita XP, atualiza nível e insígnias, desbloqueia o pin e recalcula a meta | `regras.validarReporte`; teste |
| 4 | Carta de destinação em PDF com campos automáticos, valor por extenso e QR Code | `/entidades/:id/carta` |
| 5 | Ranking Top 5/10/100 sem valores | `/ranking` |
| 6 | Nenhum uso de `#C8102E` | teste automatizado varre `src/` |
| 7 | Exportação XLSX dos participantes validados | `/admin/relatorios` |
| 8 | Funciona a partir de 360 px e instala como PWA | manifesto e service worker gerados no build |
| 9 | Mascote em componente único | `src/components/Mascote.tsx` |

## Pontos a confirmar

Seguem os itens **[A CONFIRMAR]** do prompt; os valores atuais são de exemplo e editáveis no painel:

- Meta da edição (exemplo: R$ 250.000) e histórico de anos anteriores.
- Modelo oficial da carta (o texto atual é o provisório do prompt).
- Lista real de entidades chanceladas (importável em **Painel › Importação**).
- Catálogo de recompensas, validação por Compliance e regras do guia pela área fiscal/jurídica.
- Artes dos pins de 2011 a 2025 e da edição 2027; poses adicionais do leãozinho.
- Se convidados entram no ranking principal (hoje ficam em “Família e Amigos”).
- Forma de identificar projetos que receberam recursos de colaboradores (hoje: campo “Origem dos recursos” no cadastro do projeto).

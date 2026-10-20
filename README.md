# Rede Solidária WEG — app (protótipo)

App interno da Rede Solidária (Seção Desenvolvimento Social), exclusivo para colaboradores WEG: reporte das destinações de Imposto de Renda (próprias, de familiares e de convidados), termômetro da meta, projetos apoiados, entidades chanceladas com a carta oficial de direcionamento, gamificação completa (25 níveis, tiers, Patinhas, avatar personalizável, Loja do Leão, missões, insígnias com graus, Trilha da Temporada, alcateias, mural, ranking, recompensas, Voto do Leão) e coleção de pins anuais em 3D.

Uma única base de código para **web e celular**: React + TypeScript + Vite + Tailwind, mobile-first, instalável como **PWA** e pronta para empacotar com **Capacitor**. Especificação: [`docs/prompt_app_rede_solidaria.md`](docs/prompt_app_rede_solidaria.md) (base) e [`docs/prompt_evolucao_v2_gamificacao.md`](docs/prompt_evolucao_v2_gamificacao.md) (evolução v2, com notas de implementação no fim). Regras permanentes para quem desenvolve: [`CLAUDE.md`](CLAUDE.md).

> Todos os dados são fictícios e marcados como exemplo. O login é simulado.

## Como rodar

Requer Node.js 20.19 ou mais recente.

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm run celular    # mesmo servidor, acessível pelo celular na mesma rede Wi-Fi (use o endereço "Network")
npm test           # regras (vitest) + navegação ponta a ponta sem tela branca (Playwright)
npm run test:unit  # só as regras
npm run test:e2e   # só a navegação, em dev, preview e arquivo único
npm run build      # build de produção (PWA) em dist/
npm run preview    # serve o build
```

### Testar sem instalar nada

`demo/rede-solidaria.html` é o app inteiro num único arquivo: baixe e abra com duplo clique no Chrome ou no Edge. Não precisa de Node nem de servidor; os dados ficam no próprio navegador. Para regenerar depois de mudanças no código: `npm run build:arquivo` (sai em `dist-arquivo/`).

**No celular (Android):** mande o arquivo para o celular (e-mail, WhatsApp, Drive ou Teams), baixe, abra o app **Arquivos** › **Downloads**, toque no arquivo e escolha **Chrome**. No iPhone, o Safari não executa arquivos HTML locais; para testar nele, o app precisa estar publicado num endereço `https://`.

Na tela de entrada, escolha um perfil de teste:

| Perfil | Usuário | O que testar |
|---|---|---|
| Colaborador | Camila Rodrigues (tier 2, trilha em andamento) | Reportar para si e familiares, missões do dia e baús, Personalizar, Loja do Leão, Trilha, alcateia, mural, carta oficial, link de convidado e **Reportes de convidados** (a Helena Rodrigues aguarda confirmação) |
| Embaixador | Rafael Tomaselli | Selo e missões de embaixador |
| Administrador | Equipe Desenvolvimento Social | Painel em `/admin`: fila de validação, gamificação editável, analytics, simulador de economia, carta PJ |

Convidados não têm login: o colaborador gera o link em **Convidar** (ex.: `/r/CAMILA1` nos dados de exemplo), e o convidado preenche o formulário público. O reporte vai para a Camila confirmar e depois para a Seção DS; o XP fica com a colaboradora.

O botão “Restaurar dados de exemplo” na tela de entrada recria a base local.

## Mascote e pins

- **Leãozinho**: arte oficial extraída do arquivo `MASCOTE.pdf`, em `src/assets/mascote/`. Toda a interface usa o componente único `<Mascote variante="..." />` (`src/components/Mascote.tsx`). Quando chegarem as poses dedicadas (comemorando, apontando, pensando), basta salvar os PNG na pasta e apontar cada variante em `src/assets/mascote/index.ts`.
- **Pin 2026** (entregue em 2026 aos 211 colaboradores): a face frontal foi recortada da foto e é usada como textura no visualizador 3D, nas miniaturas, no card compartilhável e no certificado. Arquivos em `src/assets/pins/2026/`.
- **Demais anos** (2011–2025 e 2027): modelo procedural (disco esmaltado com relevo, ano e leãozinho) até a equipe enviar as artes. Para cadastrar a arte de um ano, salve `src/assets/pins/<ano>/frente.png` (círculo 512×512, fundo transparente), registre a chave em `src/lib/pinArte.ts` e selecione-a em **Painel › Cadastros › Pins**. Um modelo `.glb` também pode ser informado por URL.
- As artes circulares alternativas enviadas estão em `docs/referencias/` para consulta.

O visualizador 3D (`src/components/PinViewer3D.tsx`) usa Three.js + React Three Fiber, com reflexo metálico, verniz na face, fecho borboleta no verso, rotação por toque/mouse e brilho ao desbloquear. Sem WebGL, cai para imagem 2D com giro em CSS.

## Gamificação (v2)

Tudo é movido por **eventos** (`src/domain/motor.ts`): cada ação grava um evento com chave de idempotência, e o motor avalia missões, insígnias, níveis e a meta da alcateia. Devolver ou estornar um reporte desfaz em cascata XP, Patinhas, missões, insígnias e pontos de temporada que vieram dele.

- **Moedas**: XP (nunca diminui, salvo estorno), XP da edição, pontos de temporada (XP dentro da temporada) e Patinhas (gastas na Loja). Nada depende do valor doado.
- **Níveis**: 25 níveis em 5 tiers, títulos em forma masculina, feminina ou neutra (o usuário escolhe no Perfil) e estrelas de prestígio a cada 4.000 XP depois do nível 25.
- **Avatar**: leãozinho em camadas (juba, cabeça, rosto, pescoço, pata, fundo, moldura) a partir do catálogo em `src/domain/catalogo.ts`; lendários não são vendidos.
- **Missões**: 3 diárias sorteadas por pessoa (com 1 troca grátis e Baú do Dia), 5 semanais com Baú da Semana, Jornada do Leãozinho em 5 capítulos, temporada, relâmpago, família, convidado, alcateia e embaixador. Virada à meia-noite de Brasília.
- **Painel › Gamificação** edita economia, níveis e tiers, missões (construtor), insígnias, trilhas, itens, recompensas, alcateias, mural e Voto do Leão sem mexer no código. **Painel › Analytics** traz atividade, conclusão de missões, distribuição por tier e o simulador de economia.

## Modelo de ciclos

O ciclo é a **edição** do programa (ano do evento e do pin). A edição 2026 já foi entregue; a edição ativa é a **2027**, com doações diretas até 31/12/2026 e declaração até o prazo final de 2027. Tudo isso é configurável em **Painel › Meta e ciclo**. A participação anterior ao app (pins físicos já recebidos) entra como histórico e conta para insígnias de veterano, pioneiro e bônus de ciclos consecutivos.

## Estrutura

```
src/
  domain/      types.ts (modelo de dados), motor.ts (eventos, missões, insígnias, níveis, estorno),
               consultas.ts, jogo.ts (loja, trilha, perfil), regras.ts (validação de reportes),
               catalogo.ts (níveis, itens, missões, insígnias, temporadas), servicos.ts (contrato de API), ranking.ts
  data/        db.ts (repositório local), seed.ts (dados de exemplo), useBanco.ts
  auth/        AuthContext.tsx (camada abstrata; login simulado, pronta para o SSO WEG)
  pages/       telas do app; pages/admin/ painel da Seção DS
  components/  Mascote, Layout (navegação inferior no celular, menu lateral no computador), PinViewer3D, gráficos
  lib/         datas, fuso de Brasília (tempo.ts), moeda, valor por extenso, carta oficial PF/PJ (cartaOficial.ts),
               PDF (carta e certificado), planilhas XLSX/CSV, card da conquista
  i18n/        pt-BR.ts (textos centralizados para futuras versões em inglês e espanhol)
tests/         testes das regras e dos critérios de aceite
e2e/           navegação por todas as rotas e perfis (dev, preview e arquivo único)
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

Critérios da evolução v2 (seção 11), todos cobertos por teste:

| # | Critério | Onde |
|---|---|---|
| 1 | Nenhuma tela branca em dev, preview e arquivo único | `e2e/navegacao.spec.ts` (todas as rotas, três perfis, celular, sem WebGL 2) |
| 2 | Sem perfil Convidado; convidado reporta pelo link, colaborador confirma, Seção DS valida, XP vai ao colaborador | `/r/:codigo`, `/convidados`; testes unitário e E2E |
| 3 | Carta oficial PF (colaborador) e PJ (painel), campos automáticos e "Não se aplica" sem chancela | `/entidades/:id/carta`, `/admin/carta`; teste |
| 4 | Eventos idempotentes; devolução estorna XP, Patinhas, pontos e insígnias | `motor.registrarEvento`, `motor.estornarEventos`; teste |
| 5 | Curva de 25 níveis e títulos com gênero | `catalogo.NIVEIS`; teste |
| 6 | Item comprado aparece na prévia e no avatar; lendários fora da Loja | `/loja`, `/personalizar`; teste |
| 7 | Diárias por pessoa, virada à meia-noite de Brasília, limite de 50 XP/dia | `jogo.missoesDoUsuario`; teste |
| 8 | Nenhum valor em ranking, card ou mural | teste E2E varre ranking e mural |
| 9 | Missões, insígnias, níveis, itens, preços e trilhas editáveis no painel | `/admin/gamificacao`; teste de configuração |
| 10 | Nenhum uso de `#C8102E` | teste automatizado varre `src/` |

Os critérios da versão 1 que continuam valendo (fila de validação, exportação XLSX, 360 px e PWA, mascote em componente único) seguem nos mesmos testes.

## Pontos a confirmar

Seguem os itens **[A CONFIRMAR]** do prompt; os valores atuais são de exemplo e editáveis no painel:

- Meta da edição (exemplo: R$ 250.000) e histórico de anos anteriores.
- Texto oficial integral da carta pessoa jurídica (a variante PJ foi montada a partir da PF com as substituições indicadas no prompt v2).
- Recompensas institucionais, nomes dos tiers e o Voto do Leão.
- Se a página pública de verificação da carta (`/verificar/:codigo`, aberta pelo QR Code) deve exigir login; hoje ela mostra só código, data e projeto.
- Lista real de entidades chanceladas (importável em **Painel › Importação**).
- Catálogo de recompensas, validação por Compliance e regras do guia pela área fiscal/jurídica.
- Artes dos pins de 2011 a 2025 e da edição 2027; poses adicionais do leãozinho.
- Forma de identificar projetos que receberam recursos de colaboradores (hoje: campo “Origem dos recursos” no cadastro do projeto).

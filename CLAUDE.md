# Rede Solidária WEG: regras permanentes do projeto

Toda sessão de desenvolvimento segue estas regras. A especificação está em `docs/prompt_app_rede_solidaria.md` (base) e `docs/prompt_evolucao_v2_gamificacao.md` (evolução v2); o `README.md` resume como rodar e testar.

- Nunca usar o vermelho `#C8102E`. Paleta: `#00325C`, `#0063A7`, `#095BA7`, `#00BEDF` e as cores de raridade (comum `#8A99A8`, incomum `#00BEDF`, rara `#0063A7`, épica `#6B4FBB`, lendária `#C9A227`).
- O mascote aparece sempre pelo componente `<Mascote />`, e os acessórios do avatar seguem o catálogo central (`src/domain/catalogo.ts`, desenhados por `src/components/AvatarLeao.tsx`).
- XP, Patinhas e recompensas nunca dependem do valor doado, e valores nunca aparecem fora da área pessoal do usuário e do painel.
- O app é exclusivo para colaboradores WEG. A única rota sem login é o formulário de convidado.
- Toda regra de jogo vive em `src/domain/`, é configurável no painel e tem teste.
- Textos em `src/i18n/pt-BR.ts`, datas DD/MM/AAAA, moeda R$, fuso America/Sao_Paulo.
- Antes de concluir qualquer tarefa: `npm test` e `npm run build` sem erros, e o teste de navegação sem tela branca.

## Onde fica cada coisa

- `src/domain/motor.ts`: motor de eventos (`registrarEvento` idempotente por `chave`, missões, insígnias, níveis, alcateia, estorno em cascata).
- `src/domain/consultas.ts`, `jogo.ts`, `regras.ts`, `ranking.ts`: leituras e regras; `servicos.ts` é o contrato de API usado pelas telas.
- `src/data/db.ts`: repositório local. Toda escrita passa por `mutar`, que gera um banco novo e notifica as telas; não registre eventos em `useEffect` dependendo de objetos do banco (use valores primitivos ou `useEstavel`).
- `src/lib/tempo.ts`: dia, semana e meia-noite no fuso America/Sao_Paulo.
- `e2e/navegacao.spec.ts`: navegação por todas as rotas e perfis em dev, preview e arquivo único (`npm run test:e2e`).

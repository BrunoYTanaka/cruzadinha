# Implementation Plan: Escolha da fonte mais visível

**Branch**: `feat/015-escolha-fonte` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-escolha-fonte/spec.md`

## Summary

Redesenhar a escolha da fonte no site (alternativa A do [mockup](https://claude.ai/artifact/F4cAndr5GyavzEUiTdYb9B)), sem mudar a API nem `shared`.

- **Biblioteca**:
  - Uma seção "Hoje" com um cartão por fonte, com a situação do jogador e um único link para jogar.
  - Abas de fonte acessíveis no lugar dos botões da feature 014, com a contagem de concluídas no mês.
  - O botão "Jogar a de hoje" sai.
- **Dados**: um hook com `useQueries` pede a biblioteca de cada fonte em paralelo, com as mesmas chaves de cache de hoje. Cada fonte carrega e falha sozinha.
- **Regras puras**: o estado de um dia sai de `calendar.ts` como `dayState`. `today-cards.ts` deriva o cartão, a contagem do mês e o atalho de conclusão.
- **Jogo**: o nome da fonte aparece no `h1`. O diálogo de conclusão oferece a cruzada da próxima fonte do mesmo dia, quando ela existe e não está concluída.
- **Lista de fontes**: tudo sai de `puzzleSourceIdSchema.options` e `puzzleSourceNames`. A fonte padrão é a primeira da lista. O layout vale para 1 a 3 fontes.

## Technical Context

**Language/Version**: TypeScript 6 estrito; navegador moderno (o mesmo da feature 013)

**Primary Dependencies**: React 19, React Router 7 (7.18.4), TanStack Query 5 (5.104.2; `useQueries` conferido no Context7 `/tanstack/query`). Nenhuma dependência nova.

**Storage**: nenhuma mudança. Postgres e IndexedDB intactos. `localStorage` `cruzadinha:source` e as marcas por fonte da feature 014 seguem com o mesmo formato (data-model §6).

**Testing**:

- Vitest 5 em jsdom:
  - Funções puras: `dayState`, `todayCard`, `completedInMonth`, `otherSourceShortcut`.
  - Componentes: `SourceTabs`, `TodayCards`, `LibraryPage`, `CompletionDialog` e `GamePage`, com `vitest-axe` e os helpers `src/test/` (`http`, `fixtures`, `render`).
- Playwright: atualizar os specs que usam o botão "Jogar a de hoje", o `h1` antigo ou o seletor (R7). O `fontes.spec.ts` passa a cobrir cartões, abas e atalho.

**Target Platform**: Cloudflare Pages (site estático) contra a API em produção (feature 012)

**Project Type**: aplicação web em monorepo npm workspaces; só `apps/web` muda

**Performance Goals**: os pedidos de biblioteca (2 hoje, até 3) saem em paralelo, sem espera extra em relação a hoje (SC-005). Trocar de aba não faz pedido novo. Na tela do jogo, as bibliotecas só são pedidas ao concluir a cruzada (para o atalho), em geral já em cache.

**Constraints**:

- A API não muda e o site precisa continuar funcionando com uma API anterior à feature 014, que ignora a fonte (R11, `docs/versionamento.md`).
- FR-032 da feature 010: nada bloqueia o jogo depois de carregado. O atalho de conclusão é opcional e nunca espera rede.
- Componentes só leem tokens de tema.
- Página sem rolagem horizontal a partir de 360 px.
- `any` proibido.

**Scale/Scope**: de 1 a 3 fontes (FR-016). Cerca de 6 componentes ou módulos novos ou alterados em `features/library` e `features/game`, mais os testes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
| --- | --- |
| I. TypeScript estrito | OK: nenhum tipo novo em `shared`. Os tipos derivados (`TodayCard`, `OtherSourceShortcut`) ficam no site e as respostas seguem validadas por Zod em `src/api/`. |
| II. Qualidade automatizada | OK: lint, typecheck, testes e CI sem mudança. |
| III. Camadas no back | N/A: a API não muda. |
| IV. Adaptadores | N/A: nenhuma fonte nova. A lista de fontes vem de `shared`. |
| V. Lógica pura e TanStack Query | OK: as regras novas são funções puras testadas (R3) e o estado de servidor vem de `useQueries`. Nenhuma regra de tabuleiro muda. |
| VI. Segurança e privacidade | OK: o progresso do visitante continua só no navegador (`mergeGuestLibrary`) e nada novo é enviado ao servidor. |
| VII. Testes determinísticos | OK: testes com `fetch` simulado. O e2e usa a API local com seed. |
| VIII. Conteúdo de terceiros | OK: o jogo continua com a linha de atribuição e passa a mostrar o nome da fonte no topo. Nenhuma marca ou logo das fontes é usada. |
| IX. Migrações | N/A: o banco não muda. |
| Context7 | OK: `useQueries` conferido em `/tanstack/query`. O padrão de abas segue o WAI-ARIA APG, que não é uma biblioteca. |

Resultado: passa, sem violações. **Pós-design**: reavaliado depois de data-model e contracts, sem mudanças.

## Project Structure

### Documentation (this feature)

```text
specs/015-escolha-fonte/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── features/library/
│   ├── calendar.ts               # exporta dayState (antes stateFor, privada)
│   ├── today-cards.ts            # novo: todayCard, completedInMonth, otherSourceShortcut
│   ├── today-cards.test.ts       # novo
│   ├── useSourceLibraries.ts     # novo: useQueries, uma consulta por fonte (libraryFor sai de LibraryPage)
│   ├── TodayCards.tsx            # novo: seção "Hoje" (+ .module.css, .test.tsx)
│   ├── SourceTabs.tsx            # novo: abas WAI-ARIA (+ .module.css, .test.tsx)
│   ├── SourcePicker.tsx          # removido (com .module.css e .test.tsx)
│   ├── source-choice.ts          # DEFAULT_SOURCE = primeira da lista
│   ├── Calendar.tsx              # vira tabpanel (id, role, aria-labelledby)
│   └── LibraryPage.tsx           # nova ordem: Hoje → abas → calendário; sem "Jogar a de hoje"
├── features/game/
│   ├── GamePage.tsx              # fonte no h1 e no título; calcula o atalho
│   └── CompletionDialog.tsx      # prop otherSource
└── api/query-keys.ts             # sem mudança (mesmas chaves)

apps/web/e2e/
├── support.ts                    # helpers usam o novo h1 e os cartões
├── fontes.spec.ts                # cartões, abas, atalho de conclusão
└── fluxo-principal / visitante / tamanhos / espera-servidor .spec.ts   # trocar "Jogar a de hoje" pelo cartão
```

**Structure Decision**: só `apps/web`. As regras ficam ao lado de `calendar.ts` em `features/library`, que já guarda a lógica pura do calendário. O hook de dados é compartilhado pela biblioteca e pelo jogo, como já acontece com `queryKeys`.

## Complexity Tracking

Sem violações a justificar.

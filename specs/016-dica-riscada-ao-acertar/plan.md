# Implementation Plan: Dica riscada só ao acertar a palavra

**Branch**: `feat/016-dica-riscada-ao-acertar` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-dica-riscada-ao-acertar/spec.md`

## Summary

A lista de dicas passa a riscar uma dica só quando a palavra está certa, e não mais quando está apenas preenchida. Só `apps/web` muda; a API, `shared` e os dados salvos ficam iguais.

- **Regra pura**: um módulo novo `game-logic/clue-strike.ts` decide quais dicas ficam riscadas a partir das letras do jogador, da solução e de um modo (`StrikeMode`). Nesta feature o modo é só `'solved'` (R1, R2).
- **Comparação**: letra a letra com `plainLetter`, a mesma usada por `isSolved` na conclusão (R3).
- **Onde calcula**: `useGame` já tem a solução; ele devolve o conjunto `struck`, memorizado por `state.cells` (R4).
- **Telas**: `ClueList` e `ClueSheet` trocam a prop `filled` por `struck`. O texto oculto passa de ", preenchida" para ", resolvida". O estilo `.done` da feature 011 não muda (R5).
- **`wordKey`** sai de `ClueList.tsx` para `game-logic`, porque a regra pura precisa dele (R6).

## Technical Context

**Language/Version**: TypeScript 6 estrito; navegador moderno (o mesmo da feature 013)

**Primary Dependencies**: React 19 (`useMemo`, já usado no cálculo atual). Nenhuma dependência nova e nenhuma API de biblioteca nova, então o Context7 não se aplica (regra própria do jogo).

**Storage**: nenhuma mudança. O risco é derivado e nunca guardado: Postgres, IndexedDB do visitante e `localStorage` intactos.

**Testing**:

- Vitest 5:
  - Regra pura `struckWords` em `game-logic/clue-strike.test.ts`: palavra certa, errada, incompleta, acentuada, revelada, cruzamento, modo.
  - Componentes: `ClueList.test.tsx`, `ClueSheet.test.tsx`, `GamePage.test.tsx` (digitar, apagar, corrigir, "revelar palavra", "verificar", barra ativa sem risco, layout de computador e de celular), `GuestGame.test.tsx` (visitante retomando) e `ReadMode.test.tsx`, com `vitest-axe`.
- Playwright: helpers em `e2e/support.ts` (`todayPuzzle`, reaproveitado por `todaySolution`; `typeWord`; `solveFirstAcrossWord`) e um caso em `e2e/ajudas-e-retomada.spec.ts` que preenche uma palavra certa e outra errada, confere os nomes acessíveis das dicas e roda o axe nos temas claro e escuro (SC-003).

**Target Platform**: Cloudflare Pages (site estático) contra a API em produção (feature 012)

**Project Type**: aplicação web em monorepo npm workspaces; só `apps/web` muda

**Performance Goals**: o cálculo percorre cada célula de cada palavra uma vez por mudança de letra (no maior tabuleiro, poucas centenas de comparações), dentro do mesmo render que já atualiza a grade (SC-002).

**Constraints**:

- FR-032 da feature 010: nada bloqueia o jogo; o cálculo é síncrono e local.
- O risco não conta como ajuda nem muda relógio, conclusão ou recorde (FR-007): ele é só leitura do estado.
- Componentes só leem tokens de tema; o estilo do risco é o da feature 011.
- Compatível com a versão anterior da API (nada muda no contrato).
- `any` proibido.

**Scale/Scope**: 1 módulo puro novo, 1 helper de e2e, notas nas specs 010 e 011, 3 componentes ou hooks alterados (`useGame`, `GamePage`, `ClueList`/`ClueSheet`), testes e docs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
| --- | --- |
| I. TypeScript estrito | OK: tipos novos (`StrikeMode`) ficam no site; nada em `shared`. |
| II. Qualidade automatizada | OK: lint, typecheck, testes e CI sem mudança. |
| III. Camadas no back | N/A: a API não muda. |
| IV. Adaptadores | N/A. |
| V. Lógica de jogo pura e testada | OK: a regra fica em `game-logic/clue-strike.ts`, sem React, com teste unitário de cada caso da spec. |
| VI. Segurança e privacidade | OK: usa a solução que já está no navegador (emendas 3.0.0 e 4.0.0); nada novo é enviado ou salvo; o progresso do visitante continua só no aparelho. |
| VII. Testes determinísticos | OK: unitários sem rede; o e2e usa a fixture local do seed. |
| VIII. Conteúdo de terceiros | OK: nada muda na atribuição nem no cache. |
| IX. Migrações | N/A: sem mudança de schema. |
| Restrições técnicas (tokens, celular, temas) | OK: mesmo estilo `.done`; a lista do celular (`ClueSheet`) usa o mesmo componente. |

Resultado: aprovado, sem violações. Reavaliado depois da Fase 1: continua aprovado.

## Project Structure

### Documentation (this feature)

```text
specs/016-dica-riscada-ao-acertar/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── ui.md            # Phase 1 output: lista de dicas e regra pura
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── game-logic/
│   │   ├── clue-strike.ts          # novo: StrikeMode, wordKey, isWordSolved, struckWords
│   │   └── clue-strike.test.ts     # novo
│   └── features/game/
│       ├── useGame.ts              # devolve `struck` (memorizado por state.cells)
│       ├── GamePage.tsx            # sai o cálculo `filled`; passa `struck` às listas
│       ├── ClueList.tsx            # prop `struck`; texto oculto ", resolvida"; importa wordKey
│       ├── ClueSheet.tsx           # prop `struck`
│       ├── ClueList.test.tsx       # prop renomeada; caso riscada/não riscada
│       ├── ClueSheet.test.tsx      # "resolvida" no lugar de "preenchida"
│       ├── GamePage.test.tsx       # casos da US1 no computador e no celular, barra ativa sem risco
│       ├── GuestGame.test.tsx      # visitante retomando com riscos certos
│       └── ReadMode.test.tsx       # tudo riscado no modo leitura
└── e2e/
    ├── support.ts                  # todayPuzzle, typeWord, solveFirstAcrossWord
    └── ajudas-e-retomada.spec.ts   # caso de dica riscada + axe claro/escuro
specs/010-front-basico/spec.md      # nota em FR-012 apontando para a 016
specs/011-calendario-e-tamanho-tabuleiro/spec.md  # nota em FR-023
docs/design.md                      # regra do risco da lista de dicas
CLAUDE.md                           # resumo da feature 016
```

**Structure Decision**: só `apps/web`. A regra vai para `game-logic` (princípio V) e as telas recebem um conjunto pronto, como hoje recebem `filled`.

## Complexity Tracking

Nenhuma violação a justificar.

# Implementation Plan: Diálogo com atalhos de teclado

**Branch**: `feat/046-dialogo-atalhos` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/046-dialogo-atalhos/spec.md`

## Summary

Um botão "Atalhos de teclado" na faixa de ferramentas e a tecla `?` abrem um `Dialog` (o componente existente) que lista, agrupados, os atalhos que o tabuleiro aceita. A lista e o tabuleiro leem a mesma tabela (`features/game/helpers/shortcuts.ts`): o `onKeyDown` do `Board` passa a traduzir a tecla por essa tabela, então um atalho não pode existir num lado só (FR-009, SC-002). O diálogo aberto suspende o relógio pelo mesmo `suspended` do `useClock` que os ajustes usam. Tudo só aparece quando `useOnScreenKeyboard()` é falso. Só site; sem API, sem armazenamento, sem ajuste novo.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: as já instaladas (React, Vite 8, Testing Library, `vitest-axe`); nenhuma nova

**Storage**: N/A (nada é gravado)

**Testing**: Vitest 5 + jsdom + Testing Library (`src/test/render`, `game-harness`), `vitest-axe`; um cenário Playwright em `apps/web/e2e/`

**Target Platform**: navegadores com teclado físico (`useOnScreenKeyboard()` falso)

**Project Type**: web app (só `apps/web`)

**Performance Goals**: N/A (diálogo estático)

**Constraints**: nenhum salto de layout ao abrir (`Dialog` em portal, botão sempre presente na faixa quando há teclado físico); a faixa não pode quebrar de linha por causa do botão novo (botão de ícone)

**Scale/Scope**: 1 diálogo, 1 botão, 1 tabela de ~11 atalhos em 4 grupos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. TypeScript estrito | OK: a tabela é tipada (`Shortcut`, `BoardKey`), sem `any`; não entra dado externo. |
| II. Qualidade automatizada | OK: testes unitários da tabela, do `Board`, do diálogo (axe nos dois temas) e um e2e; lint, `check:deps` e typecheck seguem no hook. |
| III. Camadas no back | N/A (sem API). |
| IV. Adaptadores externos | N/A. |
| V. Lógica de jogo pura | OK: o reducer não muda; a tradução tecla → `BoardKey` é uma função pura testada. Fica em `features/game/helpers` e não em `domain/game` porque `BoardKey` é tipo da camada de interface do tabuleiro, não do jogo (ver research R2). |
| VI. Segurança e privacidade | OK: sem rede, sem dados. |
| VII. Testes determinísticos | OK: sem internet; relógio testado com o `Clock` falso já usado. |
| VIII. Conteúdo de terceiros | N/A. |
| IX. Migrações | N/A. |
| Fluxo: Context7 | OK: o comportamento de biblioteca de que a feature depende (evento de portal do React que borbulha pela árvore React, prop booleana `inert` do React 19, APIs do Testing Library e do Playwright) é conferido na Context7 no T001 e o resultado vai para research R3/R4; o resto reaproveita padrões já usados no repositório (`Dialog`, `SettingsButton`). |

Fronteiras de `check:deps`: tudo fica dentro de `features/game` (mais `shared/components/Dialog` e `Tooltip`); `features/game/index.ts` não exporta nada novo. Sem ciclo: `BoardKey` passa a morar em `shortcuts.ts` e `Board.tsx` o reexporta (`tsPreCompilationDeps: true` conta import de tipo).

**Resultado**: passa, sem violações. Recheck após a Fase 1: passa (o design não acrescentou camada, dependência nem armazenamento).

## Project Structure

### Documentation (this feature)

```text
specs/046-dialogo-atalhos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── shortcuts-dialog.md
├── checklists/
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/features/game/
├── helpers/
│   ├── shortcuts.ts               # NOVO: BoardKey, SHORTCUT_GROUPS, resolveBoardKey, isShortcutsKey
│   ├── shortcuts.test.ts          # NOVO: tabela ↔ resolveBoardKey (SC-002)
│   └── board-keys.ts              # passa a importar BoardKey de shortcuts.ts
├── components/
│   ├── board/Board/Board.tsx      # onKeyDown usa resolveBoardKey; reexporta BoardKey
│   ├── controls/
│   │   ├── Toolbar/Toolbar.tsx    # nova prop `shortcuts?: ReactNode` (como `sizeReset`)
│   │   └── ShortcutsButton/       # NOVO: botão de ícone com Tooltip
│   ├── dialogs/ShortcutsDialog/   # NOVO: Dialog com a lista (.tsx, .module.css, .test.tsx)
│   └── GameScreen/GameScreen.tsx  # estado `shortcutsOpen`, `?` num `keydown` no `document` (só com a tela montada e sem teclado na tela)
└── hooks/useGame.ts               # aceita `dialogOpen` e soma ao `suspended` do useClock

apps/web/e2e/atalhos.spec.ts       # NOVO: abrir com `?`, fechar com Esc, tabuleiro intacto
```

**Structure Decision**: só `apps/web/src/features/game`, seguindo a organização da feature 037 (cada componente na sua pasta com `.module.css` e teste; helpers da feature em arquivo solto, como `board-keys.ts`).

## Complexity Tracking

Sem violações; nada a justificar.

# Implementation Plan: Dica no meio da altura da barra, balão acima da barra e dica resolvida riscada

**Branch**: `feat/019-dica-centralizada` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/019-dica-centralizada/spec.md`

## Summary

A feature faz três ajustes no jogo, todos em `apps/web`.

1. **Texto da barra no computador**: sobe até o meio das minúsculas ficar no meio da barra e na altura das setas (centro ótico, escolhido na sessão de esclarecimento). A medição no Chromium (R1) mostrou as minúsculas 0,75 px abaixo do meio e o número e a dica com linhas de base 0,5 px diferentes. A correção é CSS em `.navigable .live`: `align-items: baseline` e `translate: 0 -1px` (R2). O texto continua alinhado à esquerda.
2. **Balão da dica completa (feature 018)**: no computador (barra com anterior e próxima), passa a abrir acima da barra, por cima da barra de ferramentas, com recuo para baixo quando não cabe na janela. O recuo é medido num `useLayoutEffect` antes da pintura (R3).
3. **Dica resolvida nas colunas de dicas**: volta a ficar riscada (`line-through`), mantendo o fundo e o visto da feature 017 e o texto em `--ink` (R4).

Nenhuma prop, dado ou API muda.

## Technical Context

**Language/Version**: TypeScript 6 (strict), CSS Modules; Node.js 24

**Primary Dependencies**: React 19, Vite 8 (sem mudança); Playwright para as medições de layout

**Storage**: N/A (ver [data-model.md](data-model.md))

**Testing**:

- Playwright (Chromium) em `apps/web/e2e/sem-saltos.spec.ts`: posição vertical do texto, posição do balão e risco.
- Vitest + jsdom em `ClueBar.test.tsx` para o recuo do balão (geometria simulada), com temporizadores falsos e `fireEvent`, como na feature 018.

**Target Platform**: navegadores de computador no layout `useDesktopLayout` para a barra e o balão; todos os layouts para o risco nas colunas de dicas

**Project Type**: web app (monorepo: só `apps/web` muda)

**Performance Goals**: nenhum salto. O texto da barra varia 0 px entre palavras (SC-004). Abrir e fechar o balão move 0 px (SC-009). A medição do recuo acontece uma vez por abertura, antes da pintura.

**Constraints**: altura da barra (56 px), largura (feature 018) e tamanho do tabuleiro (feature 011) inalterados; contraste ≥ 4,5:1 nos dois temas; sem biblioteca nova

**Scale/Scope**: `ClueBar.module.css`, `ClueBar.tsx`, `ClueBar.test.tsx`, `ClueList.module.css`, `sem-saltos.spec.ts`, `docs/design.md`, `CLAUDE.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
| --- | --- |
| I. TypeScript estrito | Passa: `placement` tipado como união `'above' \| 'below'`, sem `any`. |
| II. Qualidade automatizada | Passa: lint, typecheck, unitários e e2e na CI, como hoje. |
| III. Camadas no back | N/A: a API não muda. |
| IV. Adaptadores | N/A: as fontes não mudam. |
| V. Lógica de jogo pura | Passa: a regra de dica resolvida (`clue-strike.ts`) não muda; risco, posição e balão são apresentação. |
| VI. Segurança e privacidade | Passa: nada é enviado nem guardado. |
| VII. Testes determinísticos | Passa: e2e contra API e banco locais com o seed; dicas longas inventadas por `lengthenClues`. |
| VIII. Conteúdo de terceiros | Passa: a atribuição continua visível. |
| IX. Migrações | N/A: sem schema. |
| Restrições técnicas | Passa: CSS com tokens (`--ink`, `--ok-tint`, `--surface`), sem cor fixa; funciona nos dois temas; o risco vale também no painel de dicas do celular. |
| Context7 | Feito: `useLayoutEffect` para medir e reposicionar um tooltip antes da pintura (`/websites/react_dev_reference`); `Locator.boundingBox()` e `mouse.move` com `steps` (`/microsoft/playwright`). |

**Pós-design**: o design não acrescenta dependências, dados nem camadas. Continua passando.

## Project Structure

### Documentation (this feature)

```text
specs/019-dica-centralizada/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # R1–R5 (medição, centro ótico, balão, risco)
├── data-model.md        # nada de dados; só valores de layout e o estado placement
├── quickstart.md
├── contracts/ui.md      # garantias e testes
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/features/game/
│   ├── ClueBar.module.css    # .navigable .live: align-items baseline + translate -1px;
│   │                         # .navigable .full acima (bottom) com ponte embaixo; .navigable .full.below = posição da 018
│   │                         # (a barra sem botões, abaixo do tabuleiro na janela estreita, fica com o .full da 018)
│   ├── ClueBar.tsx           # placement 'above' | 'below'; useLayoutEffect mede o balão ao abrir
│   ├── ClueBar.test.tsx      # recuo para baixo com geometria simulada
│   └── ClueList.module.css   # .done: line-through 1 px
└── e2e/
    └── sem-saltos.spec.ts    # xHeightCenter; balão acima, vão subindo, recuo; risco line-through
```

`ClueList.tsx`, `ClueSheet.tsx`, `GamePage.tsx`/`.module.css`, `Toolbar`, `game-logic/` e `packages/shared` não mudam.

**Structure Decision**: só `apps/web`, na feature `game`. Cada ajuste fica no componente que já é dono da aparência (R2, R3, R4).

## Ordem de implementação

1. **Testes primeiro (e2e)**: em `sem-saltos.spec.ts`, adicionar `xHeightCenter` e as asserções de US1 em `walkWords`; trocar as asserções do balão para "acima" e adicionar o caso de recuo; trocar `none` por `line-through` no teste de dica resolvida e no modo leitura, e conferir `none` na barra. Todos devem falhar com o código de hoje (R2: 0,75 px e 0,5 px; balão abaixo; sem risco).
2. **Unitários do balão**: em `ClueBar.test.tsx`, os casos de `placement` com `getBoundingClientRect` simulado. Devem falhar antes do código.
3. **CSS da barra** (`.navigable .live`), com comentário curto citando a feature 019 e a medição.
4. **Balão**: CSS acima só em `.navigable .full` e `.navigable .full.below`, `placement` e `useLayoutEffect` em `ClueBar.tsx`, seguindo o estilo de `useMeasuredSpace.ts`.
5. **Risco**: `.done` em `ClueList.module.css`, atualizando o comentário que hoje diz "sem risco".
6. **Conferência**: `npm run lint`, `typecheck`, `test`, e2e de `sem-saltos` e `tamanhos`, e o [quickstart.md](quickstart.md) manual (incluindo Firefox e os dois temas).
7. **Documentação**: `docs/design.md` (barra no centro ótico, balão acima, dica riscada) e a linha da feature 019 em `CLAUDE.md`.

## Riscos

- **Arredondamento de subpixel em outras escalas** (zoom 125%, telas com DPR 1,25): o `translate` de 1 px pode virar 1,25 px de dispositivo, ainda dentro da tolerância de 1 px CSS. A conferência manual no quickstart cobre isso.
- **Lint do `useLayoutEffect` com `setState`**: o padrão já existe em `useMeasuredSpace.ts` e passa no `eslint-plugin-react-hooks` 7. Se a regra reclamar no `ClueBar`, a troca usa a forma funcional (`setPlacement((current) => …)`), como lá.

## Complexity Tracking

Sem violações da constituição.

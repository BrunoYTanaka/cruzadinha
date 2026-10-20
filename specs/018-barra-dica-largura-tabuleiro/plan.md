# Implementation Plan: Barra da dica com a largura do tabuleiro e dica completa ao parar o mouse

**Branch**: `feat/018-barra-dica-largura-tabuleiro` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-barra-dica-largura-tabuleiro/spec.md`

## Summary

No computador, a barra da dica ativa (e a faixa de modo leitura que ocupa o lugar dela) passa a ter sempre a largura do tabuleiro, sem que o texto da dica alargue a coluna e empurre as dicas. A causa é a coluna do tabuleiro ter a largura `max-content` dos filhos (R1). A feature 017, ainda não commitada, já contém a barra (`contain: inline-size`). Esta feature leva a regra para a página: o primeiro filho da coluna no layout `.desktop` ganha contenção na inline e uma largura mínima de 320 px para tabuleiros estreitos (R2, R3). Os testes Playwright de `sem-saltos.spec.ts` passam a medir largura e posição (R4).

Além disso, com o mouse parado meio segundo sobre uma dica cortada, `ClueBar` mostra a dica completa num balão próprio. Ele fica logo abaixo da barra, por cima do tabuleiro, nas cores do tema, com `aria-hidden`. Fecha ao sair da barra, com Esc e ao trocar de palavra (R6). Tudo fica em `apps/web`: CSS da página, `ClueBar` (estado local e CSS), unitários e e2e. Nenhuma prop, dado ou API muda.

## Technical Context

**Language/Version**: TypeScript 6 (strict), CSS Modules; Node.js 24

**Primary Dependencies**: React 19, Vite 8 (sem mudança); Playwright para os testes de layout

**Storage**: N/A (nenhum dado novo; ver [data-model.md](data-model.md))

**Testing**: Playwright (Chromium) em `apps/web/e2e/sem-saltos.spec.ts` para largura, posição e balão no navegador real; Vitest + jsdom + user-event com temporizadores falsos em `ClueBar.test.tsx` para as regras do balão (corte simulado, porque o jsdom não faz layout)

**Target Platform**: navegadores de computador no layout `useDesktopLayout` (`min-width: 861px`, sem teclado na tela)

**Project Type**: web app (monorepo: `apps/web` muda; `apps/api` e `packages/shared` não)

**Performance Goals**: nenhum salto: largura da barra e posição das dicas variam 0 px entre palavras e ao abrir e fechar o balão (SC-001, SC-007); balão visível em até 1 s com o mouse parado (500 ms de espera, SC-006)

**Constraints**: tamanho padrão do tabuleiro, limites da alça (30 a 110 px por célula) e ausência de rolagem horizontal da feature 011 inalterados; layouts de celular e janela estreita inalterados

**Scale/Scope**: `GamePage.module.css`, `ClueBar.tsx`, `ClueBar.module.css`, `ClueBar.test.tsx` e `sem-saltos.spec.ts`; tabuleiros de 5 × 5 (amostra) a 15 × 15

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
| --- | --- |
| I. TypeScript estrito | Passa: só CSS e testes em TypeScript, sem `any`. |
| II. Qualidade automatizada | Passa: lint, typecheck, unitários e e2e na CI como hoje. |
| III. Camadas no back | N/A: a API não muda. |
| IV. Adaptadores | N/A: as fontes não mudam. |
| V. Lógica de jogo pura | Passa: nenhuma regra de jogo muda; a largura é layout, fora de `game-logic`. |
| VI. Segurança e privacidade | Passa: nada é enviado nem guardado. |
| VII. Testes determinísticos | Passa: e2e contra API e banco locais com o seed; dicas longas inventadas por `lengthenClues`, sem a fonte real. |
| VIII. Conteúdo de terceiros | Passa: a atribuição continua visível. |
| IX. Migrações | N/A: sem schema. |
| Restrições técnicas | Passa: CSS com variáveis, sem cor fixa; o balão é próprio, com tokens do tema, e não o `title` nativo, que não segue o tema escuro (R6). Sem biblioteca de UI nova. |
| Context7 | Feito: `Locator.boundingBox()` do Playwright (`/microsoft/playwright`), `onPointerEnter`/`onPointerLeave`/`pointerType` do React (`/websites/react_dev_reference`), `userEvent.setup({ advanceTimers })` com `hover`/`unhover` (`/testing-library/user-event`). |

**Pós-design**: o design não acrescenta dependências, dados nem camadas. Continua passando.

## Project Structure

### Documentation (this feature)

```text
specs/018-barra-dica-largura-tabuleiro/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # R1–R6
├── data-model.md        # nada de dados; só o token de layout e o tempo do balão
├── quickstart.md
├── contracts/ui.md      # garantias da coluna do tabuleiro, do balão e testes
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/features/game/
│   ├── GamePage.module.css   # .desktop: --clue-bar-min; .desktop .board > :first-child { contain: inline-size; min-width }
│   ├── ClueBar.tsx           # HOVER_DELAY_MS, temporizador, openFor, Esc, balão aria-hidden
│   ├── ClueBar.module.css    # .bar position: relative; .full (balão absoluto abaixo da barra)
│   └── ClueBar.test.tsx      # regras do balão com temporizadores falsos
└── e2e/
    └── sem-saltos.spec.ts    # walkWords mede largura/posição; tabuleiro mínimo, modo leitura e balão
```

`ClueBar.module.css` mantém o `contain: inline-size` da feature 017. `ReadModeBanner.tsx`, `board-size.ts` e `useMeasuredSpace.ts` não mudam.

**Structure Decision**: só `apps/web`, na feature `game`. A regra fica na página porque é ela que dispõe tabuleiro e dicas lado a lado (R2).

## Ordem de implementação

1. **Teste primeiro**: em `sem-saltos.spec.ts`, `walkWords` (computador) confere `x`/`width` da barra contra a grade e `x` do `aside` "Dicas" a cada palavra; novos casos para a grade no mínimo (5 × 5 do seed, alça com `Home`) e para a faixa de modo leitura. Com só a 017 aplicada, o caso do mínimo deve falhar (número vazando ou barra mais estreita que 320 px).
2. **CSS**: token e regra em `GamePage.module.css`, com comentário curto citando a feature 018, no estilo dos comentários vizinhos.
3. **Balão, teste primeiro**: unitários em `ClueBar.test.tsx` (R6) e casos e2e do balão (dica longa, dica curta, Esc, sem salto, toque no celular, `axe` com o balão aberto nos dois temas). Os casos devem falhar antes do código.
4. **Balão, código**: estado e temporizador em `ClueBar.tsx`, limpando o temporizador ao desmontar; CSS do balão em `ClueBar.module.css`.
5. **Conferência**: e2e de `sem-saltos` e `tamanhos`, auditoria de acessibilidade existente nos dois temas, conferência manual do [quickstart.md](quickstart.md).
6. **Documentação**: `docs/design.md` (largura da barra no computador e balão da dica) e a linha da feature 018 em `CLAUDE.md`.

## Dependência da feature 017

A 017 está no working tree e não foi commitada. A 018 parte dela (barra numa linha com reticências e `contain: inline-size` na barra). A 017 precisa ser commitada e entrar em `main` (ou a 018 ser feita na mesma branch, depois dela) antes de implementar esta.

## Complexity Tracking

Sem violações da constituição.

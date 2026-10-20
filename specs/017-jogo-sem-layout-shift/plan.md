# Implementation Plan: Tela de jogo sem saltos e dica resolvida mais visível

**Branch**: `feat/017-jogo-sem-layout-shift` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-jogo-sem-layout-shift/spec.md`

## Summary

A tela de jogo para de pular durante o jogo e o acerto de uma palavra fica fácil de notar. Só `apps/web` muda; a API, `shared` e os dados salvos ficam iguais.

- **Salvamento sem texto**: `SaveStatus` não mostra nada nos estados `saved` e `saving`. Os avisos (`offline`, `session-expired`, `completed-elsewhere`, `local-only`) e a região viva com "Sem conexão…"/"Conexão restabelecida" continuam como hoje (R1, R2).
- **Visitante**: no lugar de "Salvo neste aparelho", um texto fixo "Progresso só neste aparelho", sempre visível, ao lado do link "Entrar para salvar na sua conta" (R3).
- **Barra da dica ativa numa linha**: em `ClueBar.module.css`, o texto da dica fica numa linha (`white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`) e o número com a direção não encolhe (`flex: none`). A região viva continua com o texto inteiro no DOM, então o leitor de tela ouve a dica inteira (R4, R5).
- **Dica resolvida com fundo verde e visto** (opção B do mockup): `.done` em `ClueList.module.css` troca risco e texto apagado por `background: var(--ok-tint)`; a dica ativa e resolvida fica com o fundo da palavra ativa. Toda dica reserva à direita o espaço do visto, e o `<svg>` do visto (`aria-hidden`, cor `--ok`) entra em posição absoluta só quando a dica está resolvida, então o texto não quebra em outro ponto. O `ClueSheet` do celular usa o mesmo componente (R6, R7).
- **Testes**: unitários de `SaveStatus` reescritos, ajustes em `GamePage`/`GuestGame`, e um e2e novo que alonga dicas pela interceptação da resposta e confere que o tabuleiro não se move e que a dica longa termina em reticências (R8).

## Technical Context

**Language/Version**: TypeScript 6 estrito; CSS Modules; navegador moderno (o mesmo da feature 013)

**Primary Dependencies**: React 19, React Router 7 (`Link`, já usado em `SaveStatus`), Playwright (`locator.boundingBox`, `locator.evaluate`, `page.route` com `route.fetch`, confirmados no Context7 em `/websites/playwright_dev`). Nenhuma dependência nova.

**Storage**: nenhuma mudança. Postgres, IndexedDB do visitante e `localStorage` intactos.

**Testing**:

- Vitest 5 + Testing Library + `vitest-axe`:
  - `SaveStatus.test.tsx`: `saved` e `saving` não mostram texto; os quatro avisos aparecem; anúncios de queda e volta da conexão iguais; visitante com texto fixo em `saved` e `saving`, link para entrar, e "Não salvo: vale só nesta aba" quando não há armazenamento.
  - `ClueBar.test.tsx`: a região viva contém a dica inteira, sem reticências no texto.
  - `ClueList.test.tsx` e `ClueSheet.test.tsx`: a dica resolvida tem o visto (`aria-hidden`) e o nome acessível de hoje (", resolvida" uma vez só); a não resolvida não tem visto.
  - `GamePage.test.tsx` (linha 135 hoje espera "Salvo") e `GuestGame.test.tsx` (linha 110 espera "Salvo neste aparelho"): passam a conferir a ausência dos textos e o texto fixo do visitante.
- Playwright:
  - Ajustes onde os specs esperam "Salvo" (`ajudas-e-retomada.spec.ts:34`) ou "Salvo neste aparelho" (`visitante.spec.ts:24`, `fontes.spec.ts:39`).
  - Spec novo `e2e/sem-saltos.spec.ts`: alonga dicas alternadas com `page.route` em `/api/puzzles*`, percorre as palavras com Tab e confere o `y` do tabuleiro e a altura da barra, no computador (1280 x 800), no celular com teclado (360 x 740, `hasTouch`) e na janela estreita sem teclado na tela (800 x 900); confere `scrollWidth > clientWidth` no texto da dica longa; digita letras e confere que a faixa de ferramentas e o tabuleiro não se movem.
  - No mesmo spec novo: ao acertar uma palavra, a altura do botão da dica e da lista não muda, o fundo computado é o `--ok-tint` do tema e `text-decoration-line` é `none`.
  - As auditorias axe nos temas claro e escuro (`ajudas-e-retomada.spec.ts`) já têm uma dica resolvida e passam a medir o contraste do texto sobre o fundo de sucesso.

**Target Platform**: Cloudflare Pages (site estático) contra a API em produção (feature 012)

**Project Type**: aplicação web em monorepo npm workspaces; só `apps/web` muda

**Performance Goals**: nenhum custo novo; menos re-layout a cada letra, já que a faixa deixa de trocar de texto.

**Constraints**:

- FR-032 da feature 010: nada bloqueia o jogo; os avisos continuam não bloqueantes.
- FR-009: a barra mantém a altura de hoje (`min-height` 52 px no celular e 56 px no computador), então `useMeasuredSpace`/`board-size.ts` (feature 011) não mudam.
- Componentes só leem tokens de tema; `--ok` e `--ok-tint` já existem nos dois temas.
- FR-013: marcar ou desmarcar uma dica não muda a quebra de linha nem a altura da lista.
- Compatível com a versão anterior da API (nada muda no contrato).
- `any` proibido.

**Scale/Scope**: 3 componentes alterados (`SaveStatus`, `ClueBar` só no CSS, `ClueList` no CSS e no visto), 1 spec e2e novo, 3 specs e2e ajustados, testes unitários, notas nas specs 010, 013 e 016, `docs/design.md` e `CLAUDE.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
| --- | --- |
| I. TypeScript estrito | OK: nenhum tipo novo em `shared`; `SaveState` não muda. |
| II. Qualidade automatizada | OK: lint, typecheck, testes e CI sem mudança. |
| III. Camadas no back | N/A: a API não muda. |
| IV. Adaptadores | N/A. |
| V. Lógica de jogo pura e testada | OK: nenhuma regra de jogo muda; a regra de riscar continua em `game-logic/clue-strike.ts`. |
| VI. Segurança e privacidade | OK: nada novo é enviado ou salvo; o visitante continua sabendo que o progresso fica só no aparelho. |
| VII. Testes determinísticos | OK: unitários sem rede; o e2e usa o seed local e altera a resposta só dentro do navegador do teste, sem fonte real. |
| VIII. Conteúdo de terceiros | OK: a atribuição não muda; o e2e não grava dica alterada em lugar nenhum. |
| IX. Migrações | N/A: sem mudança de schema. |
| Restrições técnicas (tokens, celular, temas) | OK: `--ok` e `--ok-tint` vêm do tema; contraste do texto e do visto medido nos dois temas (R7); celular coberto no e2e. |
| Context7 | OK: APIs do Playwright usadas no e2e confirmadas; o resto é CSS e código próprio. |

Resultado: aprovado, sem violações. Reavaliado depois da Fase 1: continua aprovado.

## Project Structure

### Documentation (this feature)

```text
specs/017-jogo-sem-layout-shift/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── ui.md            # Phase 1 output: faixa de ferramentas, barra da dica, dica resolvida
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/features/game/
│   ├── SaveStatus.tsx           # sem texto em saved/saving; texto fixo do visitante
│   ├── SaveStatus.module.css    # classe do texto fixo do visitante (se precisar)
│   ├── SaveStatus.test.tsx      # reescrito para a nova tabela de estados
│   ├── ClueBar.module.css       # uma linha, reticências, número sem encolher
│   ├── ClueBar.test.tsx         # dica inteira na região viva
│   ├── ClueList.tsx             # visto decorativo nas dicas resolvidas
│   ├── ClueList.module.css      # .done com fundo --ok-tint, sem risco; espaço do visto
│   ├── ClueList.test.tsx        # visto e nome acessível
│   ├── ClueSheet.test.tsx       # visto no celular
│   ├── Toolbar.tsx              # só o comentário ("estado do salvamento" → "avisos")
│   ├── GamePage.test.tsx        # sem "Salvo" ao salvar
│   └── GuestGame.test.tsx       # texto fixo do visitante
└── e2e/
    ├── sem-saltos.spec.ts       # novo: tabuleiro parado, reticências, faixa parada
    ├── ajudas-e-retomada.spec.ts  # espera o salvamento por outro sinal que não "Salvo"
    ├── visitante.spec.ts        # texto fixo do visitante
    └── fontes.spec.ts           # texto fixo do visitante
specs/010-front-basico/spec.md   # nota apontando para a 017 (texto de salvamento)
specs/013-jogo-sem-login/spec.md # nota apontando para a 017 (texto do visitante)
specs/011-calendario-e-tamanho-tabuleiro/spec.md  # nota: aparência da dica resolvida
specs/016-dica-riscada-ao-acertar/spec.md  # nota: aparência da dica resolvida
docs/design.md                   # barra da dica numa linha, sem "Salvo", dica resolvida com fundo e visto
CLAUDE.md                        # resumo da feature 017
```

**Structure Decision**: só `apps/web`. As mudanças ficam nos componentes que já têm a responsabilidade (`SaveStatus`, `ClueBar`, `ClueList`); nenhum componente ou hook novo. A classe `.done` e o nome `struck` (feature 016) ficam como estão, embora a dica não seja mais riscada: renomear tocaria `useGame`, `clue-strike.ts` e testes sem mudar comportamento.

## Complexity Tracking

Nenhuma violação a justificar.

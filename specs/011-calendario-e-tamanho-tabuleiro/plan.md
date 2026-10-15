# Implementation Plan: Calendário mais largo e tamanho ajustável do tabuleiro

**Branch**: `feat/011-calendario-e-tamanho-tabuleiro` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-calendario-e-tamanho-tabuleiro/spec.md`

## Summary

A feature mexe só no `apps/web`. O layout muda só no computador; os ajustes de FR-023 a FR-027, visuais (texto das dicas, letra e números do tabuleiro, barra de rolagem) e de teclado (Tab, Delete, Home e End), valem em todas as telas (Phase 7 de `tasks.md`).

- **Tela de jogo**:
  - Vira um bloco centralizado, com a barra da dica ativa acima do tabuleiro, com anterior e próxima.
  - As dicas ficam limitadas a 560 px, com horizontais e verticais lado a lado, rolando por dentro, com a altura do tabuleiro.
  - O tamanho padrão da célula é o maior que deixa o tabuleiro inteiro visível, calculado em JS a partir do espaço medido.
- **Alça de redimensionar**: tabuleiro e calendário são redimensionados por uma alça de arrastar, como uma janela do Windows. É um componente genérico, `ResizeHandle`, um `slider` acessível com mouse, caneta e teclado.
  - **Tabuleiro**: a alça fica no canto inferior direito, de 30 a 110 px por célula, e a barra de ferramentas tem um botão "Tamanho padrão".
  - **Calendário**: a alça fica na borda direita e no canto inferior direito, de 720 a 1600 px de largura, e os dias acompanham por unidades de contêiner.
  - **Preferências**: as duas escolhas ficam no `localStorage`, validadas por Zod. As contas de limite e de conversão do arraste ficam em funções puras testadas.
- **Celular**: o layout não muda (mesmos tamanhos de célula, grade e calendário); recebe só os ajustes de FR-023 a FR-027.
- **Fora do front**: sem mudança na API, no banco nem em `shared`.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24; navegador moderno (últimas duas versões de Chrome, Firefox, Safari e Edge, todas com unidades de contêiner e Pointer Events)

**Primary Dependencies**: as já usadas em `apps/web`: React 19 (`useLayoutEffect`, eventos de ponteiro com `setPointerCapture`, confirmados no Context7), React Router 7, TanStack Query 5 e Zod. APIs do navegador: `ResizeObserver`, Pointer Events e `container-type: inline-size`. Nenhuma dependência nova.

**Storage**: `localStorage`, chaves novas `cruzadinha:board-size` e `cruzadinha:library-width` (ver [data-model.md](./data-model.md)); nada no servidor

**Testing**: Vitest 5 + Testing Library + jsdom 30 (que tem `PointerEvent`, mas não `setPointerCapture`) + `vitest-axe`; Playwright com `test.use({ viewport })`, `boundingBox()` e `page.mouse` para arrastar (confirmados no Context7)

**Target Platform**: site estático do Vite; o layout novo vale para o computador, e o celular mantém o layout da feature 010 com os ajustes de FR-023 a FR-027

**Project Type**: aplicação web (front) em monorepo npm workspaces

**Performance Goals**: o arraste acompanha o ponteiro sem atraso perceptível (atualizações agrupadas por `requestAnimationFrame`, gravação só ao soltar); o tabuleiro não "pula" ao abrir (medida antes da pintura)

**Constraints**: componentes só com tokens; `any` proibido; dados do `localStorage` entram como `unknown` e passam por Zod; nenhuma regra de jogo nova fora do `game-logic`; `jsx-a11y` exige `aria-value*` no `role="slider"`

**Scale/Scope**: cerca de 12 arquivos do `apps/web` alterados e 6 novos (`ResizeHandle`, `useDesktopLayout`, `board-size`, `useBoardSize`, `BoardSizeReset`, `library-width`), com seus testes; 1 spec Playwright nova. A Phase 7 de `tasks.md` acrescenta ajustes em `ClueList`, `Cell`, `Board`, `GamePage.module.css`, `global.css`, nos temas (`--scrollbar`) e no `game-logic/reducer.ts` (Delete, Home e End), sem arquivos novos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito | Passa. As duas preferências lidas do `localStorage` entram como `unknown` e passam por schemas Zod; sem `any`. |
| II. Qualidade automatizada | Passa. Lint (inclusive `jsx-a11y` para o `slider`), typecheck e testes de sempre; a spec Playwright nova roda no job `e2e` que já existe. |
| III. Camadas no back | Não afetado. |
| IV. Adaptadores | Não afetado. |
| V. Lógica de jogo pura e testada | Passa. Nenhuma regra de jogo muda. Anterior e próxima reaproveitam `previousWord`/`nextWord`. As contas de tamanho e de arraste são layout, não jogo, e ficam em funções puras testadas (`board-size.ts`, `library-width.ts`). Sem estado global novo. |
| VI. Segurança e privacidade | Passa. As chaves novas guardam só números de preferência. |
| VII. Testes determinísticos | Passa. O unitário não depende de layout nem de rede; o arraste real e as medidas ficam no Playwright, com o puzzle do seed. |
| VIII. Conteúdo de terceiros | Passa. A atribuição continua visível no computador e no celular. |
| IX. Migração de schema | Não se aplica. |
| Restrições técnicas | Passa. Tokens novos (`--clues-width`, `--library-max` e, na Phase 7, `--scrollbar`, com 3:1 testado); a alça e a barra de rolagem são desenhadas só com tokens; o layout do celular não muda; os dois temas são cobertos. |
| Context7 | Feito para React (`useLayoutEffect`, eventos de ponteiro) e Playwright (`viewport`, `boundingBox`, `mouse`). |

Resultado: sem violações; Complexity Tracking vazio. Reavaliado depois do design, já com as alças: sem mudança.

## Riscos e decisões

1. **Duas regras de "computador" no código atual (R1).** O plano une as duas em `useDesktopLayout`. Num tablet deitado com ponteiro grosseiro, a tela de jogo continua no layout da feature 010, com teclado na tela e sem alça, de propósito (FR-013). A biblioteca, que não tem teclado na tela, mostra a alça a partir de 861 px. Num tablet o arraste funciona com o dedo, porque a alça tem `touch-action: none`.
2. **Centralização e o ponteiro (R7, R10).** Com o bloco centralizado, a borda anda metade do crescimento, então a conversão dobra o deslocamento horizontal para a alça acompanhar o mouse. Se o bloco deixar de ser centralizado, por exemplo quando a largura máxima prende um dos lados, a alça pode andar mais devagar que o mouse perto do limite. Isso é aceito: o valor continua limitado e correto.
3. **Desempenho do arraste no tabuleiro.** Cada mudança renderiza 121 células ou mais. As atualizações são agrupadas por `requestAnimationFrame` e o `localStorage` só é gravado ao soltar. Se ainda houver engasgo, a saída é aplicar `--cell-size` direto no estilo durante o arraste e atualizar o estado React só ao soltar.
4. **Foco depois do arraste.** Depois de arrastar com o mouse, o foco volta ao tabuleiro, para a pessoa seguir digitando. Com o teclado, o foco fica na alça. Sem isso, letras digitadas depois do arraste iriam para a alça e se perderiam.
5. **Barra da dica com texto longo (R2).** O padrão considera uma linha; uma dica de duas linhas pode gerar uma rolagem pequena, como a spec aceita.
6. **Restaurar o calendário só por clique duplo.** É um gesto pouco visível. A spec decidiu assim (FR-021); se o uso mostrar que faz falta, um botão "Tamanho padrão" na biblioteca reaproveita `BoardSizeReset` como modelo.
7. **Altura do dia na biblioteca.** A fórmula supõe nenhum aviso visível. Com o aviso de "fonte fora do ar", um mês de seis semanas pode exigir uma rolagem pequena, o que é aceito.
8. **FR-010 da feature 010.** Atualizar `specs/010-front-basico/spec.md` com uma nota apontando para a 011 no computador. É uma tarefa de documentação deste ciclo.
9. **Mockup.** O canvas foi atualizado (versão 7) com a alça no tabuleiro, o botão "Tamanho padrão" e a alça do calendário, de acordo com a spec.
10. **Célula padrão menor que na feature 010.** Com a barra da dica ativa acima do tabuleiro, o padrão em 1920 × 1080 fica em cerca de 74 px, contra 80 px na feature 010. A spec aceita isso (SC-002: pelo menos 72 px), porque o mockup aprovado mostrou esse tamanho.

## Project Structure

### Documentation (this feature)

```text
specs/011-calendario-e-tamanho-tabuleiro/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contracts.md   # layout, chaves de armazenamento, contrato da alça, nomes acessíveis, medidas
├── checklists/
│   └── requirements.md
└── tasks.md              # /speckit-tasks (desatualizado: gerar de novo)
```

### Source Code (repository root)

```text
apps/web/
├── e2e/
│   └── tamanhos.spec.ts                 # novo: layout, arraste, teclado, limites, biblioteca, celular
└── src/
    ├── themes/tokens.css                # + --clues-width, --library-max
    ├── components/
    │   ├── ResizeHandle.tsx             # novo: slider acessível (ponteiro, teclado, clique duplo)
    │   ├── ResizeHandle.module.css      # novo: variantes corner e edge, só tokens
    │   └── ResizeHandle.test.tsx        # novo
    ├── features/game/
    │   ├── useDesktopLayout.ts (+ test) # novo: condição única de layout de computador
    │   ├── board-size.ts (+ test)       # novo: cellFor, fit, max, resolve, cellFromDrag, load/save/clear
    │   ├── useMeasuredSpace.ts          # novo: só a medida do espaço (useLayoutEffect + ResizeObserver)
    │   ├── useBoardSize.ts              # novo: fit/max a partir da medida e estado da escolha
    │   ├── BoardSizeReset.tsx           # novo: botão "Tamanho padrão"
    │   ├── GamePage.tsx / .module.css / .test.tsx   # layout .desktop, barra acima, alça, rolagem
    │   ├── Board.tsx                    # prop opcional cellSize → --cell-size inline
    │   ├── ClueBar.tsx / .module.css (+ test)       # onPrevious/onNext
    │   ├── ClueList.tsx / .module.css (+ test)      # colunas roláveis, dica ativa visível
    │   └── Toolbar.tsx                  # prop opcional sizeReset
    └── features/library/
        ├── library-width.ts (+ test)    # novo: widthFromDrag, limites, load/save/clear
        ├── LibraryPage.tsx / .module.css (+ test)   # --library-width, medida do espaço, alça
        └── Calendar.tsx / Calendar.module.css       # section relativa com a alça; dias em cqi
specs/010-front-basico/spec.md           # nota no FR-010 apontando para a 011
```

**Structure Decision**: tudo dentro de `apps/web`. A alça é genérica e fica em `components/`, junto de `Dialog` e `Notice`. As regras de tamanho ficam junto de cada tela (`features/game`, `features/library`), porque são layout e não regra de jogo. Nenhum pacote novo.

## Complexity Tracking

Sem violações a justificar.

# Implementation Plan: Imprimir a cruzada

**Branch**: `feat/055-imprimir-cruzada` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/055-imprimir-cruzada/spec.md`

## Summary

Só o site muda. A tela do jogo ganha um botão de ícone "Imprimir" na faixa de ferramentas que chama `window.print()`. A folha é um componente `PrintSheet` sempre presente na tela do jogo, oculto na tela e, em `@media print`, o único elemento visível da página (Ctrl/Cmd+P sem o botão sai igual). Ele recebe só o `Puzzle` público (grade, numeração, dicas, atribuição), nunca a solução nem o estado do jogo, e desenha a própria grade vazia em SVG/CSS grid em preto e branco. PDF é "Salvar como PDF" do navegador. API, `shared`, dados e contratos não mudam.

## Technical Context

**Language/Version**: TypeScript 6 estrito, React 19, Vite 8

**Primary Dependencies**: as que existem; nenhuma nova. `window.print()` e `@media print` são do navegador (sem consulta ao Context7).

**Storage**: N/A

**Testing**: Vitest + Testing Library + `vitest-axe` (marcação da folha sem letras, botão chama `print`), `readCss` para as regras de impressão; Playwright com `page.emulateMedia({ media: 'print' })` para conferir o que fica visível

**Target Platform**: navegador (site), com ou sem rede

**Project Type**: web (`apps/web`)

**Performance Goals**: N/A (a folha tem no máximo 30 × 30 casas)

**Constraints**: a folha não pode receber `Solution` nem `GameState`; fundo branco/texto preto em qualquer tema; casas pretas legíveis sem "imprimir cores de fundo"; nenhum deslocamento de layout ao aparecer o botão (`e2e/sem-saltos.spec.ts`)

**Scale/Scope**: 1 componente de folha, 1 botão, 1 slot na `Toolbar`, 1 helper (dicas por direção e data longa)

## Constitution Check

_GATE: passa antes e depois do desenho._

- I. TypeScript estrito: sem `any`. Passa.
- II. Qualidade automatizada: testes unitários, CSS e e2e; lint, `typecheck`, `check:deps`. Passa.
- III, IV, IX: sem mudança no back, nas fontes nem no schema. N/A.
- V. Lógica pura: o agrupamento das dicas é função pura em `features/game/helpers`; `domain/game` não é tocado. Passa.
- VI. Privacidade: nada sai do aparelho, sem requisição nem registro novo. Passa.
- VII. Testes determinísticos: `window.print` simulado; e2e usa mídia `print` emulada, sem impressora. Passa.
- VIII. Conteúdo de terceiros: **passa com a emenda 6.0.0 (feita, T000)**. Antes dela não passava. O princípio diz que o conteúdo "MUST NOT ser redistribuído fora do site (exportação, ...)" e imprimir leva a cruzada para fora do site. Não se reinterpreta o princípio: a tarefa T000 emendou a constituição (6.0.0, feita com `/speckit-constitution`, como a 5.0.0 fez para a landing) para permitir a impressão para uso pessoal, com atribuição da fonte na folha e sem arquivo, link ou endpoint gerado pelo site (FR-011, FR-012). A exceção da emenda cobre exatamente o que o plano faz: impressão do navegador, cruzada aberta, atribuição, sem solução, sem arquivo nem endpoint.
- Fluxo: comportamento novo, ciclo completo em `feat/055-imprimir-cruzada`.

## Project Structure

### Documentation (this feature)

```text
specs/055-imprimir-cruzada/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md             # /speckit-tasks
```

Sem `contracts/`: nenhuma interface externa muda.

### Source Code (repository root)

```text
apps/web/src/features/game/
├── components/
│   ├── controls/PrintButton/        # PrintButton.tsx + test (ícone, Tooltip, onPrint)
│   ├── print/PrintSheet/            # PrintSheet.tsx, PrintSheet.module.css, tests
│   ├── controls/Toolbar/Toolbar.tsx # novo slot `print`, após `shortcuts`
│   └── GameScreen/GameScreen.tsx    # monta <PrintButton/> e <PrintSheet puzzle/>
└── helpers/print-clues.ts           # printClues (dicas por direção) e printDate (data longa), + test
apps/web/e2e/imprimir.spec.ts        # mídia print: só a folha visível, sem letras, tema escuro
apps/web/e2e/sem-saltos.spec.ts      # inclui o botão novo
```

**Structure Decision**: tudo em `features/game` (único dono da tela do jogo); `index.ts` da feature não muda. Cada componente na própria pasta, como manda a regra do projeto.

## Design

- **Folha**: `PrintSheet({ puzzle })` renderizada por `createPortal` em `document.body` com a classe `.sheet`. Conteúdo: `h2` "Fonte · data completa" (`puzzleSourceNames`; `formatDate` não traz o ano, então `print-clues.ts` ganha `printDate`, com `Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' })`), grade (CSS grid `repeat(width, 1fr)`, casa quadrada, número no canto; bloqueio com `<svg>` preenchido de preto, que imprime mesmo sem cores de fundo), duas listas "Horizontais" e "Verticais" (`número. dica (tamanho)`), e `attributionLine(puzzle)` no rodapé. Sem `Board`, sem `GameState`, sem `Solution`: não há caminho para uma letra chegar lá.
- **Ocultar o resto**: `@media print { :global(body) > :not(.sheet) { display: none !important } }`, o que cobre `#root`, diálogos e avisos em portais. Fora de `print`, `.sheet { display: none }`. Fundo `#fff` e texto `#000` fixos, também em `html` e `body` (sem tokens de tema). `@page { size: auto; margin: 12mm }`.
- **Layout**: grade com largura `min(100%, width × 10mm)` (`--cols` inline vindo de `puzzle.grid.width`); dicas em `column-count: 2` com `break-inside: avoid` por item; título e grade com `break-after: avoid`.
- **Botão**: `PrintButton` de ícone (impressora) com `Tooltip`, `aria-label="Imprimir"`, na `Toolbar` junto a `shortcuts`, em todos os modos (com ou sem teclado na tela); chama `window.print()`. O botão só existe quando o `GameScreen` existe, ou seja, carregamento e erro de carregamento já ficam de fora (FR-001).
- **Jogo intacto**: `print()` não despacha ação nem mexe no relógio; a folha não lê estado. Atalho novo: nenhum (Ctrl+P do navegador já serve), então `SHORTCUT_GROUPS` não muda.

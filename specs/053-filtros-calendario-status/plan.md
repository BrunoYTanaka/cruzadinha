# Implementation Plan: Filtros no calendário por status

**Branch**: `feat/053-filtros-calendario-status` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/053-filtros-calendario-status/spec.md`

## Summary

Barra de filtros ("Todas", "Não iniciadas", "Em andamento", "Concluídas") acima da grade do calendário. O status de cada dia já existe em `DayState` (derivado de `GET /api/library` e do progresso do visitante); o filtro só lê esse estado. O dia fora do filtro vira texto inoperante (como `future`), com contagens por filtro e mensagem quando o filtro está vazio. O estado do filtro é um `useState` da `LibraryPage`: sobrevive a troca de mês e de fonte e some ao recarregar. Só site; nenhuma mudança em API, `shared` ou armazenamento.

## Technical Context

**Language/Version**: TypeScript 6 strict, React 19, Vite 8 (`apps/web`)

**Primary Dependencies**: nenhuma nova; usa `shared/components/Pill`, CSS Modules e `react-router` já presentes

**Storage**: N/A (o filtro não é guardado)

**Testing**: Vitest + Testing Library + `vitest-axe` (unitário)

**Target Platform**: navegadores modernos, PWA existente

**Project Type**: web-application (somente `apps/web`)

**Performance Goals**: filtrar até ~31 dias é derivação síncrona; sem requisição nova

**Constraints**: nada desloca o layout ao trocar de filtro (altura fixa da barra e da mensagem); estado por texto, nunca só por cor; compatível com a API anterior (nada muda nela)

**Scale/Scope**: 1 helper puro, 1 componente novo, 2 componentes alterados (`Calendar`, `DayCell`), 1 página (`LibraryPage`)

## Constitution Check

*GATE: passa antes e depois do design.*

| Princípio | Situação |
|---|---|
| I. TypeScript estrito | OK: união literal `StatusFilter`, sem `any`. |
| II. Qualidade automatizada | OK: lint, `check:deps`, typecheck e testes cobrem o código novo. |
| III/IV. Back e adaptadores | N/A: sem mudança no back. |
| V. Lógica pura e testada | OK: regra de filtro e contagem em helper puro com teste. |
| VI. Segurança e privacidade | OK: nada sai do aparelho, nada novo é guardado. |
| VII. Testes determinísticos | OK: sem rede, `today` injetado como em `calendar.test.ts`. |
| VIII/IX. Conteúdo e schema | N/A: sem schema nem conteúdo de terceiros. |

Fronteiras (feature 037): tudo em `features/library`; `pages/library` só compõe via `index.ts`. Sem import novo entre features. Sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/053-filtros-calendario-status/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

Sem `contracts/`: nenhuma interface externa muda (nenhuma rota, esquema ou formato).

### Source Code (repository root)

```text
apps/web/src/
├── features/library/
│   ├── helpers/
│   │   ├── status-filter.ts            # novo: StatusFilter, matchesFilter, countByFilter
│   │   └── status-filter.test.ts       # novo
│   ├── components/
│   │   ├── StatusFilter/               # novo: StatusFilter.tsx, .module.css, .test.tsx
│   │   ├── Calendar/Calendar.tsx       # recebe filter/onFilterChange, mostra barra e mensagem vazia
│   │   └── DayCell/DayCell.tsx         # recebe filter: dia fora vira texto inoperante
│   └── index.ts                        # exporta o tipo StatusFilter
└── pages/library/LibraryPage.tsx       # useState<StatusFilter>('all'), repassa ao Calendar
```

**Structure Decision**: tudo dentro de `features/library` (já dona do calendário); a página só guarda o estado. Cada componente em pasta própria com `.module.css` e testes (feature 037).

## Design

- **Estado**: `useState<StatusFilter>('all')` em `LibraryPage`; não é resetado ao trocar mês ou fonte (US3) e some ao desmontar (FR-009).
- **Helper**: `matchesFilter(state, filter)`: `all` → tudo ativo como hoje (FR-002, SC-004), inclusive `fetchable`; os demais comparam `state.kind`. `countByFilter(days)` devolve `{ all, not_started, in_progress, completed }` contando só estados de jogo (FR-005, FR-006).
- **DayCell**: `dimmed = !matchesFilter(state, filter)`. Dia apagado vira `<span role="img">` (mesmo caminho de `none`/`future`), classe `.dimmed` (fundo transparente, cor `--mute`, sem `opacity`, para manter o contraste do axe) e `aria-label` com ", fora do filtro" (FR-008). Sai da tabulação por deixar de ser link.
- **StatusFilter**: `role="group"` com `aria-label="Filtrar por status"`, quatro `Pill` com `aria-pressed`. Entra primeiro com o rótulo simples (US1); a prop opcional `counts` passa o rótulo a "Nome (N)" (US2).
- **Calendar**: renderiza a barra entre o cabeçalho do mês e a tabela; com `filter !== 'all'` mostra um único `<p role="status">` de altura reservada (sem salto): "N dias em andamento" (singular/plural) ou, com contagem 0, "Nenhum dia neste mês com esse status." Com `all` o espaço fica vazio. Essa região é o anúncio da troca de filtro (FR-008).
- **Contagem "Todas"**: só dias com cruzada guardada; dias `fetchable` seguem abríveis com `all` mas não entram na conta.
- **Fonte recusada / erro / carregando**: a barra vive dentro de `Calendar`, que já só aparece no ramo de sucesso, então esses estados ficam como estão.
- **Hoje e legenda**: `TodayCards` e `LibraryLegend` não recebem o filtro (FR-010).

## Complexity Tracking

Nenhuma violação.

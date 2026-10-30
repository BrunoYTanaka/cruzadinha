# Implementation Plan: Pular para uma data no calendário

**Branch**: `feat/054-pular-para-data-calendario` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/054-pular-para-data-calendario/spec.md`

## Summary

Um seletor de mês (`<select>`) e um campo de data (`<input type="date">`) no cabeçalho do calendário. O mês exibido já é `useState` da `LibraryPage`; o salto só troca esse estado. A data completa é validada por um helper puro contra o período navegável (`firstNavigableMonth` a `today`) e, se válida, troca o mês e pede foco no dia. Só site; nenhuma mudança em API, `shared` ou armazenamento.

## Technical Context

**Language/Version**: TypeScript 6 strict, React 19, Vite 8 (`apps/web`)

**Primary Dependencies**: nenhuma nova; controles nativos, `shared/helpers/dates`, CSS Modules

**Storage**: N/A (o mês escolhido não é guardado)

**Testing**: Vitest + Testing Library + `vitest-axe`

**Target Platform**: navegadores modernos, PWA existente

**Project Type**: web-application (somente `apps/web`)

**Performance Goals**: derivação síncrona, sem requisição nova

**Constraints**: sem salto de layout ao exibir ou apagar o erro (altura reservada); nome acessível em cada controle; erro anunciado; compatível com a API anterior

**Scale/Scope**: 1 helper puro, 1 componente novo, `Calendar` e `LibraryPage` alterados

## Constitution Check

*GATE: passa antes e depois do design.*

| Princípio | Situação |
|---|---|
| I. TypeScript estrito | OK: sem `any`; datas entram como `string` e passam por `parseIsoDate`. |
| II. Qualidade automatizada | OK: lint, `check:deps`, typecheck, testes. |
| III/IV. Back e adaptadores | N/A. |
| V. Lógica pura e testada | OK: `resolveJump` é puro, com teste. |
| VI. Segurança e privacidade | OK: nada sai do aparelho nem é guardado. |
| VII. Testes determinísticos | OK: `today` injetado. |
| VIII/IX. Conteúdo e schema | N/A. |

Fronteiras (feature 037): tudo em `features/library`; a página só compõe via `index.ts`. Sem import novo entre features.

## Project Structure

### Documentation (this feature)

```text
specs/054-pular-para-data-calendario/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

Sem `contracts/`: nenhuma interface externa muda.

### Source Code (repository root)

```text
apps/web/src/
├── features/library/
│   ├── helpers/
│   │   ├── jump.ts                    # novo: resolveJump, monthOptions
│   │   └── jump.test.ts               # novo
│   ├── components/
│   │   ├── JumpToDate/                # novo: JumpToDate.tsx, .module.css, .test.tsx
│   │   ├── Calendar/Calendar.tsx      # recebe jump handlers e focusDate; monta JumpToDate
│   │   └── DayCell/DayCell.tsx        # data-date no elemento para receber foco
│   └── index.ts                       # exporta o que a página usar (se algo)
└── pages/library/LibraryPage.tsx      # onJumpMonth/onJumpDate, estado focusDate
```

**Structure Decision**: tudo em `features/library`; cada componente em pasta própria (feature 037).

## Design

- **Helper `jump.ts`** (puro; `MONTH_NAMES` passa de `DayCell` para `helpers/calendar.ts` para o helper não importar componente):
  - `periodText(today)`: "de <mês de ano inicial> até hoje", usado nas mensagens.
  - `monthOptions(first, last)`: lista `{ year, month, value: 'YYYY-MM', label: 'janeiro de 2026' }` do mais recente ao mais antigo, com `compareMonths`/`addMonths`.
  - `resolveJump(input, today)`: `{ ok: true, month, date }` ou `{ ok: false, reason: 'invalid' | 'future' | 'too-old' }`. Usa `parseIsoDate` (rejeita 31/02) e compara com `firstNavigableMonth(today)` e `today`. Texto vazio (campo limpo) não é erro: ignorado.
- **`JumpToDate`**: grupo `role="group"` `aria-label="Ir para uma data"` com `<select>` (rótulo "Mês", valor = mês exibido) e `<input type="date" min max>` (rótulo "Data"). `onChange` do select chama `onJumpMonth`. `onChange` do input chama `resolveJump`; válido → `onJumpDate(date, month)` e limpa o erro; inválido → mensagem em `<p role="alert">` dentro de uma linha de altura reservada (FR-011). O `min`/`max` nativos ajudam mas a validação é nossa (digitação livre e navegador sem suporte).
- **Mensagens** (todas citam o período aceito, FR-006): `invalid` "Data inválida. Use uma data <período>."; `future` "Esta data ainda não chegou. Use uma data <período>."; `too-old` "Só há datas <período>."
- **Página**: `onJumpMonth = (m) => setMonth(m)`; `onJumpDate = (date, month) => { setMonth(month); setFocusDate(date) }`. Escolher o mês já exibido: `setMonth` com valor igual não muda nada (comparar antes para não re-render; foco não se move).
- **Foco**: `Calendar` recebe `focusDate`; um `useEffect` depende de `[focusDate, view.month, view.year]` e, se o dia existe como link (`a[data-date]`), chama `.focus()` e rola para ele; `onFocused` limpa `focusDate` para não roubar o foco depois (ex.: ao trocar de fonte). Dia sem link (apagado, futuro, sem cruzada) não recebe foco; o mês é mostrado e o `title`/região de status já anunciam o mês (FR-007: `h2` é `aria-live`).
- **Fonte e filtro**: mês, fonte e filtro são estados irmãos na página, então o salto não mexe nos outros (FR-008). `TodayCards` e `LibraryLegend` não recebem nada.
- **Erro e estados**: `JumpToDate` fica dentro de `Calendar`, que só aparece no ramo de sucesso: carregando, erro e fonte recusada ficam como estão.
- **Mês não guardado**: `useState` da página, sem storage (FR-009).
- **Tela estreita**: o grupo quebra em duas linhas (`flex-wrap`); altura da linha de erro fixa.

## Complexity Tracking

Nenhuma violação.

# Implementation Plan: Calendário mais enxuto

**Branch**: `feat/061-calendario-enxuto` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/061-calendario-enxuto/spec.md`

## Summary

Tirar a seção "Hoje" (`TodayCards`) da página do calendário e do que só ela usa, e mover o filtro de data (`JumpToDate`, feature 054) para um botão de ícone de calendário na ponta direita da linha das abas de fonte, que abre um painel flutuante (disclosure, não `role="menu"`). Uma barra nova, `SourceBar`, junta `SourceTabs` e o botão, e é usada por `LibraryPage` e `DayPicker`. A página mantém um `h1` "Escolha um dia" visualmente escondido. Só web; nenhuma regra, rota, schema ou contrato muda.

## Technical Context

**Language/Version**: TypeScript 6 strict, React 19, Vite 8

**Primary Dependencies**: as já instaladas; nenhuma nova (sem biblioteca de popover)

**Storage**: N/A (o painel não guarda estado fora da tela)

**Testing**: Vitest + Testing Library + `vitest-axe` (jsdom); Playwright em `apps/web/e2e/`

**Target Platform**: navegadores, desktop e celular (breakpoint 860 px do calendário, 599 px das abas)

**Project Type**: web (apenas `apps/web`)

**Performance Goals**: N/A; abrir o painel é só estado local

**Constraints**: zero deslocamento de layout (`e2e/sem-saltos.spec.ts`), `check:deps` (feature `library` não importa `pages/`), cada componente em pasta própria com `.module.css` e teste

**Scale/Scope**: 1 componente novo, 3 alterados, 1 removido, 18 specs e2e com ajuste de localizador, mais `support.ts` e um caso novo em `sem-saltos.spec.ts`

## Constitution Check

*Constituição 7.0.0.*

- I TypeScript estrito: sem `any`, sem dado externo novo. Passa.
- II Qualidade: lint, typecheck, testes e `format:check` seguem. Passa.
- III/IV/IX (API, adaptadores, migração): não tocados. N/A.
- V Lógica pura: `resolveJump` e `monthOptions` não mudam. Passa.
- VI Segurança e privacidade: sem dado novo, sem rede. Passa.
- VII Testes determinísticos: sem rede nem relógio novo (`today` já é injetado). Passa.
- VIII Conteúdo de terceiros: N/A.

Sem violações; nada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/061-calendario-enxuto/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui-contract.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/features/library/
├── components/
│   ├── SourceBar/                 # NOVO: SourceTabs + botão do filtro; borda de baixo vai para cá
│   │   ├── SourceBar.tsx
│   │   ├── SourceBar.module.css
│   │   └── SourceBar.test.tsx
│   ├── JumpToDate/                # MUDA: vira botão + painel (disclosure); regras iguais
│   ├── SourceTabs/                # MUDA: sem a borda de baixo (passa para a barra)
│   ├── Calendar/                  # MUDA: sem JumpToDate; mantém focusDate/onFocused
│   ├── DayPicker/                 # MUDA: usa SourceBar
│   └── TodayCards/                # REMOVIDO (tsx, css, teste)
├── helpers/today-cards.ts         # fica (direct-play, GameScreen e abas usam)
└── index.ts                       # MUDA: sai o export TodayCards; entra SourceBar
apps/web/src/pages/library/        # MUDA: h1 escondido, SourceBar no lugar de TodayCards + SourceTabs
apps/web/e2e/                      # MUDA: `openToday` em support.ts (usa `brasiliaToday`), h1, caso de sem-saltos
CLAUDE.md                          # MUDA: linha da feature 061
```

**Structure Decision**: o botão fica na barra, não no `Calendar`, porque a linha das abas é irmã do `Calendar` e o botão precisa estar nela. O estado de mês e de foco continua na página (`LibraryPage`) e no `DayPicker`; a barra só repassa `onJumpMonth`/`onJumpDate`. Assim o filtro também funciona enquanto a biblioteca carrega ou falha.

## Complexity Tracking

Sem violações.

# Implementation Plan: Menos avisos e botões no calendário e no jogo

**Branch**: `feat/051-limpar-avisos-e-botoes` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/051-limpar-avisos-e-botoes/spec.md`

## Summary

Só o site muda. Três ajustes: (1) o visitante não vê mais o aviso "Há progresso esperando você entrar."; (2) o botão "Ajudas" mantém o estilo de pílula dos vizinhos e o ponto da verificação automática sai do fluxo, sem reservar largura; (3) o calendário perde o botão "Baixar as cruzadas de hoje". Nenhum dado, rota ou contrato muda. O código já está feito; este plano registra o que foi tocado e como conferir.

## Technical Context

**Language/Version**: TypeScript 6 estrito, React 19, Vite 8

**Primary Dependencies**: as que já existem (React Router, Testing Library, Playwright); nenhuma nova

**Storage**: N/A (a fila de saves em `localStorage` e as cópias em IndexedDB não mudam)

**Testing**: Vitest + Testing Library (`vitest-axe`); Playwright em `e2e/offline.spec.ts`

**Target Platform**: navegador (site)

**Project Type**: web (`apps/web`)

**Performance Goals**: N/A

**Constraints**: a barra de ajudas não pode saltar ao ligar a verificação automática (`e2e/sem-saltos.spec.ts`)

**Scale/Scope**: 3 telas tocadas (qualquer tela com o aviso, jogo, calendário)

## Constitution Check

*GATE: passa antes e depois do desenho.*

- I. TypeScript estrito: sem `any`; código removido, nada novo tipado frouxo. Passa.
- II. Qualidade automatizada: lint, `typecheck`, `check:deps` e testes continuam rodando; testes dos avisos e do botão foram ajustados na mesma mudança. Passa.
- III, IV, VIII: sem mudança no back nem nas fontes. N/A.
- Fluxo de desenvolvimento: a mudança altera regras documentadas da 041; por isso passa pelo ciclo completo e a 041 recebe uma nota de substituição (T014). Context7: nenhuma biblioteca ou API nova entra, então não se aplica.
- V. Lógica de jogo pura: `domain/game` não é tocado. Passa.
- VI. Segurança e privacidade: a fila de saves e as regras de dono (`clearAccountData`, `discardOtherAccounts`) não mudam; só o aviso ao visitante sai. Passa.
- VII. Testes determinísticos: nenhum teste novo usa rede. Passa.
- IX. Schema: nenhuma migração. N/A.

## Project Structure

### Documentation (this feature)

```text
specs/051-limpar-avisos-e-botoes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md             # /speckit-tasks
```

Sem `contracts/`: nenhuma interface externa muda.

### Source Code (repository root)

```text
apps/web/
├── e2e/offline.spec.ts                                   # teste do modo sem rede abre cruzada já aberta
└── src/
    ├── app/AppLayout.tsx                                 # PendingOwnerNotice sem loginPath
    ├── features/
    │   ├── offline/components/PendingOwnerNotice/        # só o aviso de descarte, para conta
    │   ├── library/components/TodayCards/                # sem DownloadToday
    │   └── game/components/controls/HelpsMenu/           # ponto absoluto no canto
    └── shared/components/Menu/Menu.module.css            # botão ganha `position: relative` (único uso: HelpsMenu)
```

**Structure Decision**: edição em lugar, dentro das pastas existentes; nenhuma pasta nova. `downloadToday`, `hasAnyOutbox` e seus testes ficam em `features/offline` sem uso na interface.

## Complexity Tracking

Sem violações.

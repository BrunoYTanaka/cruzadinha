# Implementation Plan: Estatísticas e sequência de dias

**Branch**: `feat/056-estatisticas-sequencia` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

## Summary

`GET /api/stats` (sessão obrigatória) lê as linhas de `progress` da conta e devolve o resumo. A regra de cálculo é uma função pura em `packages/shared` (`computeStats`), usada pela API (linhas do banco) e pelo site (visitante, linhas do IndexedDB), então conta e visitante não podem divergir. Nova tela `/estatisticas` (`pages/stats`, `features/stats`). Sem migração.

## Technical Context

**Language/Version**: TypeScript 6 strict, Node 24
**Primary Dependencies**: Fastify 5, Drizzle, Zod (shared), React 19, TanStack Query, `idb` (já existentes; nada novo)
**Storage**: PostgreSQL 17 (`progress`, só leitura); IndexedDB do visitante (só leitura)
**Testing**: Vitest (unit, shared/api/web), `*.int.test.ts` para a consulta, Playwright para o fluxo
**Target Platform**: site (Pages) + API (Render)
**Project Type**: web app, monorepo
**Performance Goals**: uma consulta por abertura da tela; linhas por usuário ≤ total de puzzles guardados (~1.5k)
**Constraints**: nunca selecionar `cells`, `data`, `solution`; resposta tolerante em `shared`; API antiga → tela mostra "indisponível" para conta
**Scale/Scope**: 1 rota de API, 1 página, 1 função pura

## Constitution Check

| Princípio | Resultado |
|---|---|
| I TypeScript estrito, sem `any` | OK: resposta validada por Zod |
| II Qualidade automatizada | OK: testes + `check:deps` |
| III Camadas (route → service → repository) | OK: `modules/stats` segue o de `library` |
| IV Adaptadores externos | N/A |
| V Lógica pura testada | OK: `computeStats` pura, em `shared`, testada |
| VI Segurança/privacidade | OK: só a sessão define o usuário; sem solução/letras |
| VII Testes determinísticos | OK: `Clock`/data injetada |
| IX Schema por migração | OK: nenhuma mudança de schema (sem DDE/ERD novos) |

Re-check pós-design: sem violações.

## Project Structure

```text
specs/056-estatisticas-sequencia/
├── plan.md  research.md  data-model.md  quickstart.md
└── contracts/stats.md

packages/shared/src/stats/        # statsSchema, computeStats (pura), testes
apps/api/src/modules/stats/       # routes, schemas (docs), service, repository, testes (+ int)
apps/api/src/app.ts               # registra statsRoutes
apps/web/src/features/stats/      # useStats (conta/visitante), StatsView, helpers de formato, index.ts
apps/web/src/pages/stats/         # StatsPage (compõe session + stats)
apps/web/src/app/router.tsx       # rota /estatisticas; HeaderStart ganha link "Estatísticas"
apps/web/public/_headers          # sem mudança (já noindex em /*)
```

**Ordem de features**: `stats` importa `session` e `guest` (por `index.ts`); fica depois de `guest`, fora da cadeia até `game`. Ajustar `.dependency-cruiser.cjs` se a regra de ordem listar as features.

## Complexity Tracking

Nenhuma violação.

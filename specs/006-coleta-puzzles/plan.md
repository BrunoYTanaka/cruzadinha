# Implementation Plan: Coleta e cache de puzzles

**Branch**: `feat/006-coleta-puzzles` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-coleta-puzzles/spec.md`

## Summary

A API passa a guardar e servir os puzzles do O Globo. As peças:

- **Tabela `puzzles`** (migração `0002`): um puzzle por `(source, level, date)`, com a parte pública e a solução em `jsonb`. Guarda só o formato interno, nunca a resposta bruta.
- **Módulo `puzzles`** (rota → serviço → repositório): `GET /api/puzzles?level=&date=` e `GET /api/puzzles/:id`, ambos com sessão. A busca por data lê o banco; se faltar e a data não for futura, chama o `PuzzleSource`, grava com `onConflictDoNothing` e devolve. O corpo tem `puzzleId` e `puzzle` e nunca a solução.
- **Coleta**: o mesmo serviço expõe `collect()`, usado pelo comando `puzzles collect` da CLI. Busca o puzzle de hoje (fuso de Brasília), busca com pausa as datas passadas que faltam dentro da janela `COLLECT_HISTORY_DAYS` (padrão 31), parando no primeiro sinal de limite de uso.
- **Agendamento**: workflow do GitHub Actions (`collect.yml`) com duas execuções por dia e disparo manual. Roda só a coleta contra o banco da produção (a migração fica com a API ao subir), com `DATABASE_URL` nos segredos da CI.
- **Seed de exemplo**: o seed de desenvolvimento (`db:seed`) passa a gravar também uma cruzada 5×5 de conteúdo inventado na data de hoje, convertida da fixture `daily-valid.json` pelo conversor existente, sem rede e sem sobrescrever puzzle já guardado.
- **Proteção da fonte**: busca sob demanda conta contra um limite persistido por endereço (`PUZZLE_FETCH`), reaproveitando o módulo `rate-limit`.

## Technical Context

**Language/Version**: TypeScript 6.0 (`strict`) em Node.js 24 LTS

**Primary Dependencies**: Fastify 5.12, Drizzle ORM 0.45 + drizzle-kit 0.31, postgres.js 3.4, Zod 4.6; todas já instaladas. Nenhuma dependência nova. APIs conferidas no Context7 em 2026-10-13 (ver [research.md](./research.md)).

**Storage**: Postgres 17. Nova tabela `puzzles`; a tabela `rate_limit_attempts` ganha a ação `PUZZLE_FETCH` no `check` (mesma migração `0002`).

**Testing**: Vitest 5.

- Unitários (`npm test`, sem banco): utilitários de data e cálculo das datas candidatas da coleta (`lib/dates.test.ts`), schemas do `shared`, validação da configuração (`config.test.ts`) e o texto do workflow agendado (`lib/collect-workflow.test.ts`). Serviço e coleta são cobertos por integração, com `PuzzleSource` falso e Postgres real.
- Integração (Testcontainers, Postgres 17): repositório e upsert, rotas via `app.inject()`, comando da CLI, convenções de tabela, seed (`seed.int.test.ts`: grava o exemplo, é idempotente e não sobrescreve o puzzle real).
- Nenhum teste chama a fonte real (constituição VII).

**Target Platform**: API em container Linux (Render); coleta no runner `ubuntu-latest` do GitHub Actions.

**Project Type**: Web service + CLI. Muda `apps/api` e `packages/shared`; `apps/web` não muda.

**Performance Goals**: puzzle já guardado devolvido em menos de 1 s (SC-002), com uma consulta indexada por `(source, level, date)`.

**Constraints**:

- Janela de histórico configurável por `COLLECT_HISTORY_DAYS` (0 a 365, padrão 31), validada em `config.ts`; sem constante fixa no código.

- A solução nunca sai do servidor (princípio VI).
- No máximo um pedido à fonte por nível e data por execução, com pausa de 2 s entre pedidos da coleta.
- Mensagens de erro genéricas, sem detalhes da fonte.
- Logs e saída da CLI sem token, `DATABASE_URL` ou conteúdo bruto.

**Scale/Scope**: 1 fonte, 1 nível, cerca de 31 puzzles no preenchimento inicial e 1 por dia depois. 2 rotas e 1 comando novos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação | Como |
|---|---|---|
| I. TypeScript estrito | ✅ | Sem `any`. Colunas `jsonb` tipadas com `$type<Puzzle>()`/`$type<Solution>()` e relidas pelo Zod ao ler do banco. O contrato de resposta vive em `packages/shared`. |
| II. Qualidade automatizada | ✅ | Testes novos entram em `npm test` e `npm run test:int`, já na CI. O workflow agendado é um arquivo novo, mas não substitui o `ci.yml`. |
| III. Camadas | ✅ | Rota só traduz HTTP e resultado do serviço em status. Serviço não conhece HTTP. SQL só no repositório. |
| IV. Adaptadores | ✅ | O serviço usa apenas a interface `PuzzleSource`. Nada fora de `sources/oglobo/` conhece a Agilmente. |
| V. Lógica de jogo | ✅ N/A | — |
| VI. Segurança e privacidade | ✅ | A rota exige sessão. Resposta sem solução, garantida por teste. Erros genéricos. A busca sob demanda tem limite persistido. `DATABASE_URL` só no cofre da CI. |
| VII. Testes sem internet | ✅ | Fonte falsa em todos os testes; o seed usa só a fixture local. Testes contra a fonte real continuam em `source:check`, sob demanda. |
| VIII. Uso privado | ✅ | Só usuários logados; atribuição incluída em cada puzzle; guardado apenas o necessário para jogar. O exemplo do seed é texto inventado (nenhum puzzle real é versionado). |
| IX. Migrações | ✅ | Tabela `puzzles` e o novo valor do `check` entram numa migração Drizzle (`0002`), com o trigger `puzzles_set_updated_at`. |
| Fluxo: Context7 | ✅ | Drizzle (`onConflictDoNothing`, `date`, `jsonb`) e Fastify (tipagem de `query`/`params`) conferidos em 2026-10-13. |

Re-check pós-design: [data-model.md](./data-model.md), [contracts/](./contracts/) e [quickstart.md](./quickstart.md) mantêm a tabela acima, sem violações novas.

## Project Structure

### Documentation (this feature)

```text
specs/006-coleta-puzzles/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-api.md
│   └── collect-command.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/src/
├── api-error.ts                  # + puzzle-unavailable, puzzle-source-failed
├── puzzle/response.ts            # puzzleResponseSchema {puzzleId, puzzle}
└── index.ts                      # exporta o novo schema e tipo

apps/api/
├── drizzle/0002_*.sql            # tabela puzzles, check de rate_limit_attempts, trigger updated_at
└── src/
    ├── db/schema.ts              # + puzzles; PUZZLE_FETCH em rateLimitActions
    ├── db/seed-user.ts           # runSeed também grava o puzzle de exemplo (FR-020 a FR-022)
    ├── db/seed-puzzle.ts         # monta o exemplo da fixture sources/oglobo/fixtures/daily-valid.json
    ├── http/errors.ts            # + mensagens dos dois códigos
    ├── lib/collect-workflow.test.ts  # texto do workflow: guard, segredo só no passo da coleta
    ├── lib/dates.test.ts         # datas de Brasília, janela de candidatas
    ├── lib/dates.ts              # todayInSaoPaulo(clock), addDaysToIsoDate, candidateDates; check.ts passa a usá-lo
    ├── config.ts                 # + COLLECT_HISTORY_DAYS (0 a 365, padrão 31)
    ├── app.ts                    # AppDeps.puzzleSource; registra puzzlesRoutes
    ├── cli.ts / cli/run-cli.ts   # puzzles collect; CliDeps.source
    ├── modules/rate-limit/limits.ts   # + puzzleFetch
    ├── modules/puzzles/
    │   ├── puzzles.repository.ts
    │   ├── puzzles.service.ts    # getByDate, getById, collect
    │   ├── puzzles.routes.ts
    │   └── puzzles.schemas.ts    # schema de documentação (toDocSchema)
    └── test/                     # puzzles.int.test.ts, cli.int.test.ts, conventions.int.test.ts, app.ts

.github/workflows/collect.yml     # schedule + workflow_dispatch
```

Também mudam: `CLAUDE.md` (comandos, módulo, workflow, variável) e `.env.example` (+ `COLLECT_HISTORY_DAYS=31`).

**Structure Decision**: Tudo em `apps/api` e `packages/shared`, no mesmo padrão de `modules/invites`. A coleta é uma função do serviço (e não um script à parte) para a CLI e a rota compartilharem gravação e validação.

## Complexity Tracking

Sem violações da constituição a justificar.

# Implementation Plan: Progresso do usuário em cada puzzle

**Branch**: `feat/008-progresso-usuario-puzzle` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-progresso-usuario-puzzle/spec.md`

## Summary

Liga `users` a `puzzles` com a tabela `progress` (uma linha por usuário e puzzle, chave composta) e três rotas autenticadas: `GET /api/progress/:puzzleId`, `PUT /api/progress/:puzzleId` (salvar, inclusive concluir) e `POST /api/progress/:puzzleId/reset` (jogar de novo do zero, preservando o melhor tempo). O módulo novo `progress` segue rota → serviço → repositório. O servidor valida o formato das letras contra a grade do puzzle, aplica as regras de conclusão e de ordem (salvamento atrasado nunca desfaz o mais novo nem uma conclusão) dentro de uma transação com a linha travada, e deriva de si mesmo o momento de conclusão e o melhor tempo. A conferência de "grade correta" continua no front-end (spec, Assumptions). Uma migração Drizzle, um módulo de schemas em `shared`; nenhuma dependência nova e nenhuma mudança no front-end.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24

**Primary Dependencies**: Fastify 5, Zod, Drizzle, postgres.js (já em uso; nenhuma nova)

**Storage**: PostgreSQL 17; tabela nova `progress` por migração Drizzle gerada de `schema.ts` (com `--custom` apenas para o trigger `updated_at`)

**Testing**: Vitest 5 (unitário em `shared` e `api`) e integração com Testcontainers (`npm run test:int`)

**Target Platform**: API em contêiner Linux; consumidor é o front-end web (ainda sem tela do jogo)

**Project Type**: web-service em monorepo npm workspaces

**Performance Goals**: salvar e retomar em menos de 1 s (SC-003); uma transação curta com uma linha travada

**Constraints**: só o dono lê e escreve (constituição VI); letras do jogador nunca em log nem em mensagem de erro; `shared` sem etapa de build; toda tabela com `created_at`/`updated_at` e trigger

**Scale/Scope**: 3 rotas, 1 tabela, 1 módulo; grade de até 30 x 30; uso privado por convidados

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito | Passa. Contratos em `packages/shared` (Zod), `jsonb` relido por Zod, sem `any`. |
| II. Qualidade automatizada | Passa. Sem mudança de tooling; lint, typecheck e testes cobrem os arquivos novos. |
| III. Camadas | Passa. Rota só valida a entrada e monta o corpo; regras no serviço; repositório só com SQL. |
| IV. Adaptadores | Não afetado. |
| V. Lógica de jogo pura | Não afetado: a conferência de acerto e o cronômetro ficam no `game-logic` do front. As regras de conclusão e de ordem aqui são regras de persistência, não de tabuleiro. |
| VI. Segurança e privacidade | Passa. Toda rota exige sessão; a consulta sempre filtra por `request.user`, e o identificador do usuário nunca vem do cliente; letras fora de log e erro; resposta de "outro usuário" é indistinguível de "sem progresso". |
| VII. Testes determinísticos | Passa. Integração com Postgres real em contêiner, como a constituição exige para progresso; relógio injetável. |
| VIII. Conteúdo de terceiros | Passa. O progresso guarda só letras do jogador, não conteúdo da fonte. |
| IX. Migração de schema | Passa. Mudança só por migração Drizzle versionada; sem `drizzle-kit push`. |

Resultado: sem violações; Complexity Tracking vazio. Reavaliado após o design: sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/008-progresso-usuario-puzzle/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── http-api.md
└── tasks.md             # /speckit-tasks (não criado aqui)
```

### Source Code (repository root)

```text
packages/shared/src/
├── progress/
│   ├── schema.ts            # saveProgressRequestSchema, progressSchema, progressEnvelopeSchema, cellsMatchGrid()
│   └── schema.test.ts
├── api-error.ts             # + 'progress-completed'
└── index.ts                 # exporta o módulo novo

apps/api/
├── drizzle/0003_progress.sql        # tabela, checks, índice, trigger progress_set_updated_at
└── src/
    ├── db/schema.ts                 # tabela `progress`
    ├── http/errors.ts               # mensagem de 'progress-completed'
    ├── app.ts                       # registra progressRoutes
    ├── modules/progress/
    │   ├── progress.repository.ts   # lock + upsert + leitura
    │   ├── progress.service.ts      # regras: formato, ordem, conclusão, melhor tempo, reset
    │   ├── progress.service.test.ts # regras puras (função de decisão), sem banco
    │   ├── progress.routes.ts
    │   └── progress.schemas.ts      # OpenAPI
    ├── docs/docs.test.ts            # (já cobre: toda rota /api/* tem schema)
    └── test/
        ├── progress.int.test.ts     # fluxos das 3 histórias, isolamento, corridas
        └── conventions.int.test.ts  # lista de tabelas ganha 'progress'

docs/design.md                       # tabela `progress` e endpoints alinhados ao que foi feito
CLAUDE.md                            # frase da feature 008
```

**Structure Decision**: módulo `progress` ao lado de `puzzles`; ele lê o puzzle via `findPuzzleById` do repositório de `puzzles` e usa só a grade (o repositório relê também a solução, custo aceito; a solução nunca sai deste módulo). Nenhum arquivo do front-end é tocado.

## Complexity Tracking

Sem violações a justificar.

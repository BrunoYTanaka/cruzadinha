# Implementation Plan: Biblioteca de puzzles

**Branch**: `feat/009-biblioteca-puzzles` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-biblioteca-puzzles/spec.md`

## Summary

Uma rota de leitura, `GET /api/library`, que devolve os puzzles já guardados (até 366, do mais recente ao mais antigo) com a situação do usuário da sessão em cada um: `not_started`, `in_progress` ou `completed`, mais os tempos (`elapsedMs`, `finishedMs`, `completedAt`, `bestMs`, `bestAt`). Uma única consulta com `LEFT JOIN` de `puzzles` com `progress` filtrado pelo usuário, selecionando só colunas de metadados (nunca `data`, `solution` nem `cells`). O módulo novo `library` segue rota → serviço → repositório; não usa o `PuzzleSource` nem o limite `PUZZLE_FETCH`. Sem migração e sem dependência nova; um schema novo em `shared` (`library/schema.ts`).

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24

**Primary Dependencies**: Fastify 5, Zod, Drizzle, postgres.js (já em uso; nenhuma nova)

**Storage**: PostgreSQL 17; **sem mudança de esquema** (lê `puzzles` e `progress`)

**Testing**: Vitest 5 (unitário em `shared` e `api`) e integração com Testcontainers (`npm run test:int`)

**Target Platform**: API em contêiner Linux; consumidor é o front-end web (tela da biblioteca é outra feature)

**Project Type**: web-service em monorepo npm workspaces

**Performance Goals**: lista completa (366 itens) em menos de 1 s (SC-003); uma consulta, sem N+1

**Constraints**: só colunas de metadados na consulta (as colunas `jsonb` grandes não são lidas); usuário só da sessão; nenhum acesso à fonte

**Scale/Scope**: 1 rota, 1 consulta, 1 módulo; uso privado por convidados

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito | Passa. Contrato em `packages/shared` (Zod), sem `any`. |
| II. Qualidade automatizada | Passa. Sem mudança de tooling. |
| III. Camadas | Passa. Rota só valida e monta o corpo; mapeamento de situação no serviço (função pura); repositório só com SQL. |
| IV. Adaptadores | Não afetado, e é um requisito: a biblioteca não chama `PuzzleSource`. |
| V. Lógica de jogo pura | Não afetado. A derivação da situação é regra de apresentação de dados salvos, pura e testada sem banco. |
| VI. Segurança e privacidade | Passa. Exige sessão; o `LEFT JOIN` filtra `progress.user_id` pelo usuário da sessão (no `ON`, não no `WHERE`); resposta sem grade, solução nem letras. |
| VII. Testes determinísticos | Passa. Integração com Postgres real; sem rede (a fonte é um dublê que falha se chamado). |
| VIII. Conteúdo de terceiros | Passa. A resposta não carrega conteúdo da fonte (só data, nível e identificador). |
| IX. Migração de schema | Não se aplica: nenhuma mudança de esquema. |

Resultado: sem violações; Complexity Tracking vazio. Reavaliado após o design: sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/009-biblioteca-puzzles/
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
├── library/
│   ├── schema.ts            # libraryItemSchema, libraryResponseSchema, LIBRARY_LIMIT
│   └── schema.test.ts
└── index.ts                 # exporta o módulo novo

apps/api/src/
├── app.ts                   # registra libraryRoutes
├── docs/
│   ├── docs.plugin.ts       # + tag `library`
│   └── docs.test.ts         # + rota no catálogo, tag permitida e rota com sessão
├── modules/library/
│   ├── library.repository.ts   # LEFT JOIN puzzles x progress (só metadados)
│   ├── library.service.ts      # deriva a situação (função pura toLibraryItem) e monta a lista
│   ├── library.service.test.ts # derivação de situação, sem banco
│   ├── library.routes.ts
│   └── library.schemas.ts      # OpenAPI
└── test/library.int.test.ts    # fluxos das 3 histórias, isolamento, fonte inacessível

docs/design.md               # `GET /api/library` alinhado ao que foi feito
CLAUDE.md                    # frase da feature 009
```

**Structure Decision**: módulo `library` ao lado de `progress` e `puzzles`. Ele lê as duas tabelas pelo Drizzle diretamente em seu próprio repositório (consulta de leitura que cruza dois módulos; não reaproveita `findPuzzle*`, que relêem a solução). Nenhum arquivo do front-end é tocado.

## Complexity Tracking

Sem violações a justificar.

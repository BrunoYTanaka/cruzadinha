# Implementation Plan: Resposta no puzzle entregue ao front-end

**Branch**: `feat/007-resposta-no-puzzle` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-resposta-no-puzzle/spec.md`

## Summary

`GET /api/puzzles` e `GET /api/puzzles/:id` passam a devolver `{ puzzleId, puzzle, solution }`. A solução já é guardada e já é lida pelo repositório (`StoredPuzzle`); falta o serviço repassá-la, a rota incluí-la e o contrato compartilhado descrevê-la. Antes de entregar, o serviço revalida o par puzzle/solução (`validatePuzzleWithSolution`); se um puzzle guardado estiver inconsistente, o pedido termina em `500 internal-error` genérico, sem conteúdo no log. Sem migração, sem nova coluna, sem mudança no adaptador, na coleta nem no seed. A emenda da constituição (v3.0.0) já foi mesclada (#9); o plano também atualiza a feature 006 e `docs/design.md`.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24

**Primary Dependencies**: Fastify 5, Zod, Drizzle (já em uso; nenhuma dependência nova)

**Storage**: PostgreSQL 17, tabela `puzzles` existente (coluna `solution` já guarda o dado); sem migração

**Testing**: Vitest 5 (unitário em `packages/shared` e `apps/api`) e testes de integração com Testcontainers (`npm run test:int`)

**Target Platform**: API em contêiner Linux; consumidor é o front-end web (ainda sem tela do jogo)

**Project Type**: web-service em monorepo npm workspaces

**Performance Goals**: mesmo que a 006: puzzle guardado em até 1 s (SC-004); a revalidação do par é O(células) e desprezível

**Constraints**: solução só para usuário com sessão; nunca em erro, log ou documentação de exemplo; `shared` continua sem etapa de build

**Scale/Scope**: 2 rotas, 1 schema compartilhado, 1 serviço; uso privado por convidados

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito | Passa. Contrato em `packages/shared` (Zod), sem `any`; `jsonb` já é relido por Zod. |
| II. Qualidade automatizada | Passa. Sem mudança de tooling; lint, typecheck e testes cobrem os arquivos alterados. |
| III. Camadas | Passa. A rota só monta o corpo; a revalidação do par fica no serviço; o repositório continua só com SQL. |
| IV. Adaptadores | Não afetado. O adaptador não muda. |
| V. Lógica de jogo pura | Não afetado. As ajudas no front ficam para outra feature, em `game-logic`. |
| VI. Segurança e privacidade (v3.0.0) | Passa. A solução vai só a sessão válida, nunca em erro/log/mensagem, e o par é validado antes de entregar. Segredos, argon2, cookies e limites inalterados. |
| VII. Testes determinísticos | Passa. Testes novos usam fonte simulada e Postgres em contêiner. |
| VIII. Conteúdo de terceiros | Passa. Site continua privado e atribuído; o cache continua guardando só o necessário. |
| IX. Migração de schema | Passa por não se aplicar: nenhuma mudança de schema. |

Resultado: sem violações; Complexity Tracking vazio. Reavaliado após o design: sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/007-resposta-no-puzzle/
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
packages/shared/src/puzzle/
├── response.ts          # puzzleResponseSchema ganha `solution` + checagem do par
└── response.test.ts     # troca "recusa solução" por "exige solução coerente"

apps/api/src/
├── modules/puzzles/
│   ├── puzzles.service.ts   # GetPuzzleResult ok carrega solution; revalida o par ao ler
│   ├── puzzles.routes.ts    # corpo inclui solution
│   └── puzzles.schemas.ts   # descrições OpenAPI sem "nunca traz as letras"
├── docs/docs.test.ts        # remove a asserção de que o documento não contém 'solution'
└── test/
    ├── puzzles.int.test.ts  # 200 traz solution (data e id); 401/404/502 não; par inválido → 500
    └── seed.int.test.ts     # exemplo do seed volta com solution

specs/006-coleta-puzzles/    # FR-002, SC-004, contrato e quickstart ajustados
docs/design.md               # item 30 e seção do modelo de dados
CLAUDE.md                    # frase da feature 006 ("never return the solution")
```

**Structure Decision**: mudança confinada ao módulo `puzzles` da API e ao contrato em `shared`; nenhum arquivo novo de código. Front-end não é tocado.

## Complexity Tracking

Sem violações a justificar.

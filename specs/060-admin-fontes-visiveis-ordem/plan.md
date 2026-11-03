# Implementation Plan: Painel de admin para esconder e reordenar fontes

**Branch**: `feat/060-admin-fontes-visiveis-ordem` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/060-admin-fontes-visiveis-ordem/spec.md`

## Summary

Uma configuração global por fonte (visível e posição), guardada no banco e lida por uma rota pública `GET /api/sources`; o calendário, "Hoje", x1, estatísticas e configurações do site passam a usar essa lista em vez de `puzzleSourceIdSchema.options`. As rotas de puzzle por data e de biblioteca recusam fonte escondida como fonte inexistente (`400 invalid-input`). Contas ganham `users.is_admin`, alterado só pela CLI do autor (`users set-admin`, `users create --admin`). A página `/admin` e as rotas `GET`/`PUT /api/admin/sources` só atendem admin; para qualquer outra pessoa respondem exatamente como uma rota inexistente (`reply.callNotFound()` num hook `onRequest`, antes de qualquer leitura de corpo). Cada salvamento grava uma linha em `source_setting_changes` na mesma transação. Detalhes em [research.md](./research.md), [data-model.md](./data-model.md) e [contracts/api.md](./contracts/api.md).

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24

**Primary Dependencies**: Fastify 5, Drizzle + postgres.js, Zod (`packages/shared`), React 19 + TanStack Query + React Router (site). Nenhuma dependência nova.

**Storage**: PostgreSQL 17: coluna nova `users.is_admin` e duas tabelas, `source_settings` e `source_setting_changes` (migração Drizzle; DDE-008)

**Testing**: Vitest (unitário, jsdom no site), `*.int.test.ts` com Testcontainers para a API, Playwright para o fluxo `/admin`

**Target Platform**: API no Render, site no Cloudflare Pages (como hoje)

**Project Type**: monorepo web (`apps/api`, `apps/web`, `packages/shared`)

**Performance Goals**: mudança visível ao público em até 1 minuto (FR-015); uma consulta de até 4 linhas por pedido de puzzle ou biblioteca

**Constraints**: compatível com a versão anterior da outra parte; sem cache no servidor; `404` idêntico ao de rota inexistente para quem não é admin; nenhum `401`/`403` nas rotas de admin

**Scale/Scope**: 4 fontes, poucos admins, poucas alterações por ano

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|-----------|-----------|
| I. TypeScript estrito | Sem `any`; entrada externa passa por Zod (`updateSourcesRequestSchema`). Conforme. |
| II. Qualidade automatizada | Lint, `check:deps` (regras novas para `features/admin` e `pages/admin`), typecheck e testes. Conforme. |
| III. Camadas no back | Módulo novo `modules/sources` (route → service → repository); acesso ao banco só no repository; a visibilidade é aplicada nos services de puzzles, library e duels por `sourcesService.isVisible` (R14), nunca nas rotas. Conforme. |
| IV. Fontes em adaptadores | Adaptadores intactos; a visibilidade fica fora deles, no módulo `sources`. Conforme. |
| V. Lógica pura e testada | Regra de validação (`decideSources`: todas as fontes uma vez, ao menos uma visível) e de resolução (`resolveSources`) puras, com `Clock` não necessário. Conforme. |
| VI. Segurança e privacidade | Papel lido do banco a cada pedido; `/api/sources` sem dado de usuário; `isAdmin` só na resposta da própria conta; log sem dados pessoais. Sem exceção nova. Conforme. |
| VII. Testes determinísticos | Unitários sem rede nem banco; integração em Testcontainers. Conforme. |
| VIII. Conteúdo de terceiros | Não toca conteúdo das fontes; `/admin` já sai com `noindex` pelo `/*` de `_headers`. Conforme. |
| Fluxo (Context7) | Fastify confirmado via Context7 (R11); Drizzle e TanStack Query consultados em T046/T047 antes do código. Conforme. |
| IX. Schema por migração | Uma migração gerada por `db:generate`, com gatilhos `<table>_set_updated_at`. Conforme. |

Sem violação; a tabela Complexity Tracking não se aplica. Reavaliado após o desenho: sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/060-admin-fontes-visiveis-ordem/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── tasks.md             # /speckit-tasks (não criado aqui)
```

### Source Code (repository root)

```text
packages/shared/src/
├── sources/                      # novo: sourcesResponseSchema, adminSourcesResponseSchema,
│                                 #       updateSourcesRequestSchema, resolveVisibleSources (pura)
└── auth/schema.ts                # userSchema ganha isAdmin (padrão false na leitura)

apps/api/
├── drizzle/                      # migração: users.is_admin, source_settings, source_setting_changes
└── src/
    ├── platform/db/schema.ts     # tabelas e coluna novas
    ├── modules/sources/          # novo: sources.routes (público + admin), service, repository,
    │                             #       sources.rules (decideSources), sources.schemas, index.ts
    ├── modules/identity/
    │   ├── sessions/             # AuthUser.isAdmin; createRequireAdmin (onRequest, callNotFound)
    │   └── registration/create-account.ts   # opção isAdmin
    ├── modules/puzzles/          # service de getByDate recusa fonte escondida
    ├── modules/library/          # list/listPublic recusam fonte escondida
    ├── modules/duels/            # create recusa puzzle de fonte escondida
    └── cli/run-cli.ts            # users set-admin, users create --admin

apps/web/src/
├── shared/hooks/useVisibleSources/   # GET /api/sources; isPending enquanto carrega; fallback a todas em erro ou 404
├── shared/services/api/sources/      # fetchVisibleSources(queryClient): versão sem hook para loaders (R12)
├── shared/services/api/              # sources.ts (cliente público e admin)
├── features/admin/                   # SourcesAdmin (lista, alternar, subir/descer, salvar)
├── pages/admin/AdminPage.tsx         # não admin: <NotFoundPage />
├── app/router.tsx                    # rota /admin
├── features/account/                 # link "Administração" só para admin
├── features/library/                 # abas, "Hoje", fonte padrão a partir da lista
├── features/library/ (DayPicker)     # só fontes visíveis (seleção de dia do x1)
├── features/stats/ (StatsView)       # linhas só das fontes visíveis
└── features/settings/                # opções de "cruzada padrão" só das visíveis

docs/data-definitions/DDE-008-admin-fontes.md        # já criada
docs/entity-relationship-diagrams/ERD-008-*.md       # a criar
.dependency-cruiser.cjs               # features/admin importa só session
```

**Structure Decision**: módulo de API próprio (`modules/sources`) porque a configuração é lida por vários módulos (puzzles, library, duels) que só podem importar uns dos outros pelo `index.ts`; no site, a leitura vai para `shared/hooks` (usada por várias features) e a edição fica em `features/admin`, que importa apenas `session`, como `account`.

## Complexity Tracking

Sem violações a justificar.

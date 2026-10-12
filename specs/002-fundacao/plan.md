# Implementation Plan: Fundação do projeto

**Branch**: `feat/002-fundacao` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-fundacao/spec.md`

## Summary

Montar o monorepo npm workspaces com três partes (`apps/api`, `apps/web`, `packages/shared`), a configuração comum de qualidade (TypeScript estrito, ESLint, Prettier, Husky e lint-staged), a verificação automática no GitHub Actions e o ambiente local com Docker Compose. O código de aplicação fica no mínimo que prova a estrutura: um schema compartilhado do estado de saúde, um servidor Fastify com `GET /api/health` e configuração validada, e um site React com uma página que mostra esse estado pelo proxy do Vite. Nenhuma funcionalidade de produto.

## Technical Context

**Language/Version**: TypeScript 6.0 (`strict`) em Node.js 24 LTS

**Primary Dependencies**: servidor: Fastify 5, Zod 4, Postgres.js 3; site: React 19, Vite 8, TanStack Query 5; ferramentas: ESLint 10 + typescript-eslint 8, Prettier 3, Husky 9, lint-staged 17, tsx 4, tsdown 0.23 (ver [research.md](./research.md))

**Storage**: Postgres 17 em container, só para a verificação de saúde (sem tabelas nem migrações)

**Testing**: Vitest 5 por workspace; `app.inject()` no servidor; Testing Library + jsdom no site. Nenhum teste usa rede, banco ou navegador

**Target Platform**: máquina do autor (Linux) e runners Linux do GitHub Actions; imagem de container Linux para o servidor

**Project Type**: aplicação web em monorepo (servidor + site + código compartilhado)

**Performance Goals**: comandos de qualidade da raiz em menos de 1 minuto (SC-002), pré-commit em menos de 10 segundos (SC-005), CI em menos de 10 minutos (SC-004), ambiente local saudável em menos de 2 minutos (SC-006)

**Constraints**: nenhum valor real de segredo versionado (FR-014, SC-007); repositório público sem conteúdo completo da fonte (FR-018); configuração só por variáveis de ambiente (FR-013, FR-015)

**Scale/Scope**: 3 workspaces, 1 rota, 1 página, cerca de 6 testes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito em monorepo | Passa: npm workspaces com `apps/api`, `apps/web` e `packages/shared`; `tsconfig.base.json` com `strict: true`, estendido por cada parte; o schema compartilhado vive em `packages/shared`; `@typescript-eslint/no-explicit-any` como `error` e `noImplicitAny` pelo `strict` (v1.4.0); respostas externas entram como `unknown` e passam por Zod (`loadConfig`, resposta de `/api/health` no site) |
| II. Qualidade automatizada | Passa: Prettier, ESLint flat (`typescript-eslint`, `eslint-config-prettier`, e no site `react-hooks` e `jsx-a11y`), Husky e lint-staged; pré-push com `typecheck` e testes unitários; CI com `npm ci`, lint, typecheck e testes a cada push; `package-lock.json` versionado; scripts da raiz com `--workspaces --if-present` |
| III. Camadas no back | Passa no que existe: a rota de saúde só chama um serviço (`getHealth`), que conhece a interface `DatabaseProbe`, não HTTP; o SQL (`select 1`) fica no módulo de banco. Repositórios de verdade chegam na 004 |
| IV. Adaptador isolado | Não se aplica (sem fonte de puzzles). FR-018 registra a regra de fixtures reduzidas para a 003 |
| V. Lógica de jogo pura | Não se aplica (sem jogo). A página mínima já usa TanStack Query para estado de servidor |
| VI. Segurança e segredos | Passa: só `.env.example` com valores fictícios; `.env*` ignorado; mensagem de configuração inválida cita o nome da variável, nunca o valor; `DATABASE_URL` nunca é logada; imagem roda como usuário não-root |
| VII. Testes sem internet | Passa: todos os testes usam `inject`, sonda de banco simulada e `fetch` simulado. Testes de integração com Postgres e Playwright chegam com as features que os exigem |
| VIII. Conteúdo de terceiros | Não se aplica (sem puzzles); o repositório público fica sem conteúdo da fonte |
| IX. Schema por migração | Não se aplica (sem tabelas) |
| Fluxo: Context7 | Cumprido para as ferramentas centrais (ver `research.md`); as tarefas repetem a consulta para as restantes |
| Fluxo: feature | Ciclo completo do Spec Kit em `feat/002-fundacao` |

Resultado do gate: **passa**, sem violações. Reavaliado após a fase 1: continua passando.

## Project Structure

### Documentation (this feature)

```text
specs/002-fundacao/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── health-api.md
│   ├── server-config.md
│   └── root-scripts.md
├── checklists/
│   └── requirements.md
└── tasks.md             # criado por /speckit-tasks
```

### Source Code (repository root)

```text
.
├── package.json              # workspaces, scripts da raiz, engines, prepare: husky
├── package-lock.json
├── .nvmrc                    # 24
├── tsconfig.base.json
├── eslint.config.mjs         # base comum + bloco de React e acessibilidade para apps/web
├── .prettierrc.json
├── .prettierignore
├── .editorconfig
├── .lintstagedrc.json
├── .husky/
│   ├── pre-commit            # lint-staged
│   └── pre-push              # typecheck + testes unitários
├── .env.example              # nomes de variáveis, valores fictícios
├── .dockerignore
├── docker-compose.yml        # db (postgres:17-alpine) + api
├── .github/
│   └── workflows/
│       └── ci.yml            # jobs quality e image
├── packages/
│   └── shared/
│       ├── package.json      # @cruzadinha/shared, exports ./src/index.ts
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts
│           ├── health.ts     # schema Zod e tipo HealthStatus
│           └── health.test.ts
├── apps/
│   ├── api/
│   │   ├── package.json      # @cruzadinha/api
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── tsdown.config.ts  # bundle com o shared embutido
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── server.ts     # entrada: carrega config, cria app, escuta porta
│   │       ├── app.ts        # buildApp(deps): Fastify sem escutar porta
│   │       ├── config.ts     # loadConfig(env) com Zod
│   │       ├── db/
│   │       │   └── probe.ts  # DatabaseProbe com Postgres.js (select 1)
│   │       └── modules/
│   │           └── health/
│   │               ├── health.routes.ts
│   │               └── health.service.ts
│   │       (testes ao lado: app.test.ts, config.test.ts, health.service.test.ts)
│   └── web/
│       ├── package.json      # @cruzadinha/web
│       ├── tsconfig.json
│       ├── tsconfig.node.json # tipos do Node para vite.config.ts e vitest.config.ts
│       ├── vite.config.ts    # proxy /api → API_PROXY_TARGET
│       ├── vitest.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx      # QueryClientProvider
│           └── app/
│               ├── App.tsx   # página mínima: nome e estado do servidor
│               └── App.test.tsx
└── CLAUDE.md                 # comandos e estrutura atualizados (FR-017)
```

**Structure Decision**: monorepo com as três partes do design. O `shared` exporta o próprio fonte TypeScript, sem build. O `api` segue as camadas do design desde a primeira rota (`modules/health` com rota e serviço; `db/` para o acesso ao banco). O `web` já nasce com a pasta `app/` do design; `features/`, `game-logic/` e o resto chegam com as features que os usam. A configuração de ESLint, Prettier, lint-staged e Husky é única, na raiz.

## Complexity Tracking

Sem violações da constitution a justificar.

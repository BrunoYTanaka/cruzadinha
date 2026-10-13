# Implementation Plan: Banco de dados, autenticação e convites

**Branch**: `feat/004-banco-auth-convites` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-banco-auth-convites/spec.md`

## Summary

A feature leva o Drizzle (0.45, sobre o postgres.js já instalado) para `apps/api`, com schema em `src/db/schema.ts` e migrações versionadas em `apps/api/drizzle/`. Elas são aplicadas por `npm run db:migrate` e também na subida do servidor. O schema tem quatro tabelas: `users`, `sessions`, `invites` e `rate_limit_attempts`. Todas têm `created_at` e `updated_at` preenchidos pelo banco (`DEFAULT now()` e um trigger `BEFORE UPDATE`), e um teste de guarda faz a convenção valer também para as tabelas futuras.

Dois módulos novos seguem rota → serviço → repositório:

- **`auth`**: cadastro com convite, login, logout e "quem sou eu".
  - Senha guardada com argon2id (`@node-rs/argon2`).
  - Sessão no servidor, com cookie `sid` `HttpOnly`/`SameSite=Lax` e só o SHA-256 do valor no banco.
  - Expiração deslizante: 30 dias sem uso, renovação no máximo uma vez por dia, limite absoluto de 1 ano.
- **`invites`**:
  - Código de 16 caracteres sem símbolos confundíveis, guardado só como hash.
  - Cota de 3 convites ativos, garantida com trava de linha.
  - Revogação.

Os limites de tentativas ficam num módulo `rate-limit` gravado no banco. A linha de comando do autor (`src/cli.ts`) cria, lista e revoga convites chamando o serviço diretamente. Um seed só de desenvolvimento (`npm run db:seed`) cria o usuário de teste de `SEED_USER_EMAIL`/`SEED_USER_PASSWORD`, sem convite, e não mexe numa conta que já existe. Os contratos HTTP ficam em schemas Zod no `shared`.

Os testes de integração (`*.int.test.ts`) sobem Postgres 17 pelo Testcontainers, rodam por `npm run test:int` e entram num job novo da CI. Os testes unitários e o pré-push continuam sem banco.

## Technical Context

**Language/Version**: TypeScript 6.0 (`strict`) em Node.js 24 LTS

**Primary Dependencies**: Fastify 5.12, Zod 4.6 e postgres.js 3.4, já instalados. Novas, conferidas no Context7 (ver [research.md](./research.md)):
- dependências: `drizzle-orm` 0.45, `@node-rs/argon2` 2.2, `@fastify/cookie` 11.1;
- desenvolvimento: `drizzle-kit` 0.31, `@testcontainers/postgresql` 12.2.

APIs nativas: `node:crypto` e `node:util` `parseArgs`.

**Storage**: PostgreSQL 17 (Compose local e Testcontainers; Neon na implantação). Tabelas `users`, `sessions`, `invites` e `rate_limit_attempts`, criadas só por migração Drizzle.

**Testing**:
- Vitest 5 unitário (`npm test`), sem banco: serviços com repositórios falsos e relógio injetado, schemas do `shared`, geração e normalização de códigos, rotas com `app.inject()`.
- Vitest 5 de integração (`npm run test:int`, `vitest.int.config.ts`): Testcontainers `postgres:17-alpine`, migrações aplicadas no `globalSetup`, `TRUNCATE` entre testes e arquivos em série.

**Target Platform**: servidor Node em container Linux (Alpine); o `shared` continua sem APIs do Node.

**Project Type**: aplicação web em monorepo. Esta feature mexe em `apps/api`, `packages/shared`, CI, Compose, Dockerfile e `.env.example`; não mexe em `apps/web`.

**Performance Goals**: cadastro, login, logout e `me` em menos de 1 s numa máquina comum (SC-008); argon2 com os parâmetros padrão (cerca de 50 ms); suíte de integração em menos de 2 min (SC-009).

**Constraints**:
- Nenhum segredo em texto puro no banco (SC-006).
- Respostas idênticas para convite inválido (SC-003) e para credenciais erradas, com tempo equivalente (SC-007).
- Cota exata sob concorrência (SC-004).
- Limites de tentativas persistentes (FR-029).
- Nada de rede nos testes além do download da imagem do Postgres.

**Scale/Scope**: site privado com dezenas de usuários; 4 tabelas, 6 rotas, 3 subcomandos de linha de comando; cerca de 30 arquivos de código e uns 80 casos de teste.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito em monorepo | Passa: schemas de requisição e resposta no `shared`; corpo da requisição entra como `unknown` e passa por Zod; nenhum `any` |
| II. Qualidade automatizada | Passa: `npm test` e o pré-push continuam sem banco; novo job `integration` na CI roda `test:int` a cada push, o que mantém "todos os testes na CI" |
| III. Camadas no back | Passa: `auth`, `invites` e `rate-limit` com rota → serviço → repositório. Rotas só validam e traduzem para HTTP; serviços não conhecem Fastify; SQL só nos repositórios. A linha de comando chama serviços |
| IV. Adaptador isolado | Não se aplica (sem fonte de puzzles) |
| V. Lógica de jogo pura | Não se aplica |
| VI. Segurança e segredos | Passa: argon2id para senha; sessão e convite só como SHA-256; cookie `HttpOnly`, `SameSite=Lax` e `Secure` fora do desenvolvimento; limites de tentativas em login, cadastro e geração; mensagens genéricas; nenhum segredo em log ou resposta; `.env.example` só com valores fictícios |
| VII. Testes sem internet | Passa: integração com Postgres real em container, separada dos unitários |
| VIII. Conteúdo de terceiros | Passa: o cadastro só com convite mantém o site restrito a convidados |
| IX. Schema por migração | Passa: tabelas e triggers só por migrações Drizzle versionadas; `drizzle-kit push` não é usado |
| Fluxo: Context7 | Cumprido para Drizzle, `@node-rs/argon2`, `@fastify/cookie`, Fastify 5, Testcontainers e Vitest 5 (ver `research.md`) |
| Fluxo: feature | Ciclo completo do Spec Kit em `feat/004-banco-auth-convites` |

Resultado do gate: **passa**, sem violações. Reavaliado após a fase 1 (data model e contratos): continua passando.

## Project Structure

### Documentation (this feature)

```text
specs/004-banco-auth-convites/
├── plan.md
├── research.md
├── data-model.md            # físico; o lógico está em docs/data-definitions/DDE-001
├── quickstart.md
├── contracts/
│   ├── http-api.md          # rotas, cookie, erros
│   ├── shared-schemas.md    # exportações do shared
│   └── cli.md               # linha de comando, banco e scripts de teste
├── checklists/
│   └── requirements.md
└── tasks.md                 # criado por /speckit-tasks
```

### Source Code (repository root)

```text
.
├── .env.example                       # + TRUST_PROXY_HOPS, SEED_USER_EMAIL, SEED_USER_PASSWORD
├── .prettierignore                    # + apps/api/drizzle/
├── package.json                       # + script test:int
├── .github/workflows/ci.yml           # + job integration
├── packages/
│   └── shared/
│       └── src/
│           ├── index.ts               # + exportações de auth, invites e erros
│           ├── api-error.ts           # apiErrorSchema, códigos
│           ├── auth/
│           │   ├── schema.ts          # email, password, register, login, user, authResponse
│           │   └── schema.test.ts
│           └── invites/
│               ├── schema.ts          # inviteCode, status, createdInvite, inviteList
│               └── schema.test.ts
└── apps/
    └── api/
        ├── Dockerfile                 # + copia drizzle/
        ├── package.json               # + deps; scripts db:generate, db:migrate, db:seed, cli, test:int
        ├── drizzle.config.ts
        ├── tsdown.config.ts           # entradas server, migrate e cli
        ├── vitest.config.ts           # exclui *.int.test.ts
        ├── vitest.int.config.ts
        ├── drizzle/                   # migrações geradas e a custom de updated_at
        └── src/
            ├── config.ts              # + TRUST_PROXY_HOPS; loadSeedConfig
            ├── app.ts                 # + cookie, error handler, rotas de auth e invites
            ├── server.ts              # aplica migrações antes de escutar
            ├── cli.ts                 # entrada da linha de comando
            ├── cli/run-cli.ts         # runCli: invites create | list | revoke
            ├── lib/
            │   ├── clock.ts           # Clock = () => Date
            │   ├── tokens.ts          # token de sessão, SHA-256, gerar e formatar código
            │   └── password.ts        # hash, verify e hash fictício (argon2)
            ├── env-file.ts            # carga do .env fora de produção (server, migrate, cli)
            ├── http/errors.ts         # corpo de erro comum e 429 com Retry-After
            ├── db/
            │   ├── probe.ts           # sem mudança
            │   ├── client.ts          # createDatabase(url) → { db, close }
            │   ├── columns.ts         # timestamps
            │   ├── schema.ts          # users, sessions, invites, rateLimitAttempts
            │   ├── migrations.ts      # runMigrations(url)
            │   ├── migrate.ts         # entrada do db:migrate
            │   ├── seed-user.ts       # runSeed (só desenvolvimento)
            │   ├── seed.ts            # entrada do db:seed
            │   └── errors.ts          # isConnectionError
            ├── modules/
            │   ├── auth/
            │   │   ├── auth.routes.ts
            │   │   ├── auth.service.ts
            │   │   ├── users.repository.ts
            │   │   ├── sessions.repository.ts
            │   │   ├── session.plugin.ts    # preHandler requireSession e renovação
            │   │   ├── session-cookie.ts    # setSessionCookie, clearSessionCookie
            │   │   ├── session-policy.ts    # decideSession (pura)
            │   │   └── session-policy.test.ts
            │   ├── invites/
            │   │   ├── invites.routes.ts
            │   │   ├── invites.service.ts
            │   │   ├── invites.repository.ts
            │   │   ├── invite-status.ts     # inviteStatus (pura)
            │   │   └── invite-status.test.ts
            │   └── rate-limit/
            │       ├── limits.ts             # valores padrão, injetáveis
            │       ├── rate-limit.service.ts
            │       ├── rate-limit.repository.ts
            │       └── rate-limit.service.test.ts
            └── test/
                ├── global-setup.ts           # Testcontainers + migrações + provide
                ├── database.ts               # conexão do teste e truncate
                ├── conventions.int.test.ts   # created_at/updated_at em toda tabela
                ├── register.int.test.ts
                ├── session.int.test.ts
                ├── invites.int.test.ts
                ├── cli.int.test.ts
                ├── seed.int.test.ts
                └── secrets.int.test.ts       # SC-006
```

**Structure Decision**: o código de banco fica em `apps/api/src/db/`, e a regra de negócio nos módulos `auth`, `invites` e `rate-limit`, como no design §4. O design colocava os limites de tentativas dentro de `auth`, mas eles viraram um módulo à parte (só serviço e repositório) porque `invites` também os usa. Os schemas de contrato vão para o `shared`, porque o site vai consumi-los na feature de telas. Os testes de integração ficam juntos em `src/test/`, já que dependem do mesmo container e da mesma limpeza. Os unitários ficam ao lado do código, como nas features anteriores.

## Complexity Tracking

Sem violações da constitution a justificar.

---

description: "Task list for feature 004-banco-auth-convites"
---

# Tasks: Banco de dados, autenticação e convites

**Input**: Design documents from `/specs/004-banco-auth-convites/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (http-api.md, shared-schemas.md, cli.md), quickstart.md. Modelo lógico em `docs/data-definitions/DDE-001-banco-auth-convites.md`.

**Tests**: incluídos. FR-030 a FR-032 exigem testes de integração com Postgres real, e a constitution exige testes unitários sem banco (princípios II e VII). Em cada história, os testes vêm antes da implementação e devem falhar primeiro.

**Organization**: tarefas agrupadas por história de usuário (US1 = P1 ... US5 = P5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história a que a tarefa pertence (US1 a US5)

## Path Conventions

Monorepo npm workspaces: `packages/shared` e `apps/api` (ver Project Structure em plan.md). Todos os caminhos são relativos à raiz.

**Regras para todas as tarefas** (constitution v2.0.0 e `CLAUDE.md`):
- Consultar o Context7 antes de escrever código que use Drizzle, `@node-rs/argon2`, `@fastify/cookie`, Fastify, Testcontainers, Zod ou Vitest; usar as versões de `research.md` (Drizzle 0.45, drizzle-kit 0.31, argon2 2.2, cookie 11.1, Testcontainers 12.2, Zod 4.6, Vitest 5.0).
- Nunca escrever o tipo `any`; corpo de requisição, argumentos da linha de comando e linhas lidas do banco por SQL cru entram como `unknown` e passam por Zod.
- Camadas: rotas só validam e traduzem para HTTP; serviços não importam Fastify; SQL e Drizzle só em `*.repository.ts` e `src/db/`.
- Nenhuma senha, hash, valor de cookie, código de convite ou `DATABASE_URL` em logs, respostas de erro ou saídas da linha de comando (exceto o código na criação e o cookie no `Set-Cookie`).
- Toda tabela nova usa o objeto `timestamps` de `apps/api/src/db/columns.ts` e ganha o trigger `<tabela>_set_updated_at` na migração (FR-003).
- Toda mudança de schema é migração gerada por `npm run db:generate -w @cruzadinha/api` (ou `--custom` para SQL à mão), nunca `drizzle-kit push` nem alteração manual (princípio IX).
- Mensagens ao usuário em português, nos textos exatos de `contracts/http-api.md` e `contracts/cli.md`.
- Formatar com Prettier (`semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`).
- Commits em Conventional Commits, em inglês, sem `Co-Authored-By`, com escopo `api`, `shared`, `auth`, `ci` etc.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependências, scripts e configuração que todas as histórias usam.

- [X] T001 Em `apps/api/package.json`: acrescentar as dependências `drizzle-orm@0.45`, `@node-rs/argon2@2.2` e `@fastify/cookie@11.1` e as de desenvolvimento `drizzle-kit@0.31` e `@testcontainers/postgresql@12.2` (instalar com `npm install -w @cruzadinha/api`, atualizando o `package-lock.json`). Acrescentar os scripts `db:generate` (`drizzle-kit generate`), `db:migrate` (`tsx src/db/migrate.ts`), `db:seed` (`tsx src/db/seed.ts`), `cli` (`tsx src/cli.ts`) e `test:int` (`vitest run --config vitest.int.config.ts`). Na raiz, em `package.json`, acrescentar `test:int`: `npm run test:int --workspaces --if-present`
- [X] T002 [P] Acrescentar `apps/api/drizzle/` ao `.prettierignore`, para as migrações e o `meta/` ficarem como o Drizzle Kit gera
- [X] T003 [P] Em `.env.example`, no bloco "Servidor (apps/api)", acrescentar `TRUST_PROXY_HOPS=0` com o comentário `# Saltos de proxy confiáveis para descobrir o IP real (0 = não confiar no X-Forwarded-For)`. Num bloco novo "Seed de desenvolvimento (npm run db:seed)", acrescentar `SEED_USER_EMAIL=dev@cruzadinha.local` e `SEED_USER_PASSWORD=senha-de-teste-123`, com o comentário `# Valores fictícios, só para desenvolvimento; o seed recusa rodar em produção`
- [X] T004 Em `apps/api/src/config.ts`: nova variável `TRUST_PROXY_HOPS` (inteiro de 0 a 10, padrão 0, mensagem `deve ser um inteiro de 0 a 10`) exposta como `trustProxyHops` em `ServerConfig`. Acrescentar casos em `apps/api/src/config.test.ts`: padrão 0, valor válido e valores inválidos (`-1`, `abc`, `1.5`)
- [X] T005 [P] Extrair de `apps/api/src/server.ts` a busca e a carga do `.env` (`findEnvFile` mais `process.loadEnvFile`, só fora de `production`) para `apps/api/src/env-file.ts`, exportando `loadDotEnvIfPresent()`. O `server.ts` passa a chamá-la; o comportamento não muda
- [X] T006 [P] Em `apps/api/vitest.config.ts`, excluir `**/*.int.test.ts` (mantendo as exclusões padrão de `node_modules` e `dist`). Criar `apps/api/vitest.int.config.ts` com `include: ['src/**/*.int.test.ts']`, `globalSetup: ['src/test/global-setup.ts']`, `fileParallelism: false`, `testTimeout: 30_000` e `hookTimeout: 120_000`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: utilitários e a estrutura do app que todas as histórias usam. Nenhuma tarefa aqui toca o schema (ele é a US1).

**⚠️ CRITICAL**: nenhuma história começa antes desta fase terminar.

- [X] T007 [P] Criar `apps/api/src/lib/clock.ts` com `export type Clock = () => Date` e `export const systemClock: Clock = () => new Date()`, e um helper `addDays(date, days)`
- [X] T008 [P] Criar `apps/api/src/lib/tokens.ts` e `apps/api/src/lib/tokens.test.ts` (teste primeiro):
  - `generateSessionToken()`: 32 bytes de `randomBytes` em base64url.
  - `sha256Hex(value)`.
  - `INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'`.
  - `generateInviteCode()`: 16 caracteres sorteados com `crypto.randomInt` do alfabeto.
  - `formatInviteCode(code)`: grupos de 4 com hífen.
  - `normalizeInviteCode(input)`: maiúsculas, sem espaços nem hífens.

  Os testes conferem:
  - tamanho e alfabeto em 1000 códigos;
  - ausência de `0`, `O`, `1`, `I` e `L`;
  - formato `XXXX-XXXX-XXXX-XXXX`;
  - `normalizeInviteCode(' abcd-efgh jkmn-pqrs ') === 'ABCDEFGHJKMNPQRS'`;
  - tokens distintos e com 43 caracteres base64url;
  - SHA-256 conhecido de `'abc'`.
- [X] T009 [P] Criar `apps/api/src/lib/password.ts` e `apps/api/src/lib/password.test.ts` (teste primeiro):
  - `hashPassword(password)` e `verifyPassword(hash, password)` com `@node-rs/argon2`, usando os padrões (argon2id, `memoryCost` 19456, `timeCost` 2, `parallelism` 1).
  - `createDummyHash()`: hash de um valor aleatório, para igualar o tempo do login com e-mail inexistente.
  - `verifyPassword` devolve `false`, e não lança, para hash mal formado.

  Os testes conferem:
  - o hash começa com `$argon2id$`;
  - verifica a senha certa e recusa a errada;
  - senha com espaços nas pontas não é alterada.
- [X] T010 [P] Criar `packages/shared/src/api-error.ts` com:
  - `apiErrorCodeSchema`: `invalid-input`, `invalid-invite`, `registration-failed`, `invalid-credentials`, `unauthenticated`, `invite-quota-reached`, `too-many-attempts`, `service-unavailable` e `internal-error`;
  - `apiErrorSchema`: `{ error, message, fields?: string[] }`, estrito, com o tipo `ApiError`.

  Exportar em `packages/shared/src/index.ts` e criar `packages/shared/src/api-error.test.ts`, que confere que aceita um erro de cada código e recusa código desconhecido.
- [X] T011 Criar `apps/api/src/db/client.ts` com `createDatabase(databaseUrl)`:
  - cria o cliente `postgres(databaseUrl, { onnotice: () => {} })` e `drizzle({ client })` (sem o schema: o projeto usa o query builder, não as consultas relacionais);
  - devolve `{ db, close }`;
  - exporta o tipo `Database`;
  - o cliente é preguiçoso: não conecta até a primeira consulta.

  Criar `apps/api/src/db/errors.ts` com `isConnectionError(error: unknown)`, verdadeiro para erros do postgres.js de conexão (`ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT`, `CONNECT_TIMEOUT`, `CONNECTION_CLOSED`, `CONNECTION_ENDED`, `CONNECTION_DESTROYED`), conferindo também `error.cause`. Acrescentar o teste unitário `apps/api/src/db/errors.test.ts`.
- [X] T012 [P] Criar `apps/api/src/db/columns.ts` com `export const timestamps`: `created_at` e `updated_at` como `timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow()`. Comentário curto: o `updated_at` avança pelo trigger `set_updated_at` (FR-003), não pela aplicação
- [X] T013 Em `apps/api/src/app.ts`:
  - `AppDeps` ganha `database: Database` e `clock?: Clock`.
  - O Fastify é criado com `trustProxy: config.trustProxyHops` quando maior que 0.
  - Registra `@fastify/cookie` sem `secret`.
  - Um `setErrorHandler` responde `503 service-unavailable` quando `isConnectionError` e `500 internal-error` nos demais casos, no formato de `apiErrorSchema`, com as mensagens de `contracts/http-api.md` e sem detalhes. O erro completo vai para `request.log.error`.

  O `server.ts` cria o banco com `createDatabase(config.databaseUrl)` e o fecha no encerramento.

  Em `apps/api/src/app.test.ts`:
  - passar um `createDatabase('postgres://user:SEGREDO@localhost:1/db')` que nunca é consultado;
  - acrescentar um teste com uma rota de teste que lança um erro de conexão simulado, conferindo 503, o corpo genérico e que o corpo não contém `SEGREDO`.

**Checkpoint**: utilitários prontos e app com cookie e tratamento de erro. `npm test` verde.

---

## Phase 3: User Story 1 - Banco versionado com datas de criação e alteração (Priority: P1) 🎯 MVP

**Goal**: um comando leva o banco vazio à estrutura atual, com as quatro tabelas, e `created_at`/`updated_at` preenchidos e avançados pelo banco (FR-001 a FR-004).

**Independent Test**: `npm run test:int -w @cruzadinha/api -- src/test/conventions.int.test.ts` verde; `npm run db:migrate -w @cruzadinha/api` duas vezes seguidas sem erro (quickstart §2).

### Schema, migrações e ambiente de teste da User Story 1

- [X] T014 [US1] Criar `apps/api/src/db/schema.ts` com as quatro tabelas de `specs/004-banco-auth-convites/data-model.md`, todas com `...timestamps` e PK `uuid().primaryKey().defaultRandom()`:
  - **`users`**:
    - `user_id`;
    - `email`: `text NOT NULL`, único `users_email_unique`;
    - `password_hash`: `text NOT NULL`.
  - **`sessions`**:
    - `session_id`;
    - `token_hash`: `text NOT NULL UNIQUE`;
    - `user_id`: `uuid NOT NULL`, FK → `users.user_id` `ON DELETE CASCADE`, índice `sessions_user_id_idx`;
    - `expires_at` e `absolute_expires_at`: `timestamptz NOT NULL`;
    - `ended_at`: `timestamptz` nulo;
    - check `CHECK (expires_at <= absolute_expires_at)`.
  - **`invites`**:
    - `invite_id`;
    - `code_hash`: `text NOT NULL UNIQUE`;
    - `created_by_user_id`: `uuid`, FK → `users.user_id` sem cascata, índice `invites_created_by_user_id_idx`;
    - `used_by_user_id`: `uuid`, FK → `users.user_id`, `UNIQUE`;
    - `expires_at`: `timestamptz NOT NULL`;
    - `used_at` e `revoked_at`: `timestamptz` nulos;
    - checks `CHECK ((used_at IS NULL) = (used_by_user_id IS NULL))` e `CHECK (NOT (used_at IS NOT NULL AND revoked_at IS NOT NULL))`.
  - **`rate_limit_attempts`**:
    - `rate_limit_attempt_id`;
    - `action`: `text NOT NULL`, `CHECK (action IN ('LOGIN', 'REGISTER', 'INVITE_CREATE'))`;
    - `key_type`: `text NOT NULL`, `CHECK (key_type IN ('EMAIL', 'NETWORK_ADDRESS'))`;
    - `key_value`: `text NOT NULL`;
    - índices `rate_limit_attempts_lookup_idx (action, key_type, key_value, created_at)` e `rate_limit_attempts_created_at_idx (created_at)`.

  Nomes de coluna em snake_case como no data model; propriedades TypeScript em camelCase.
- [X] T015 [US1] Criar `apps/api/drizzle.config.ts` (`dialect: 'postgresql'`, `schema: './src/db/schema.ts'`, `out: './drizzle'`, sem credenciais). Gerar a migração inicial com `npm run db:generate -w @cruzadinha/api -- --name init` e conferir o SQL em `apps/api/drizzle/0000_init.sql`. Gerar `npm run db:generate -w @cruzadinha/api -- --custom --name updated_at_triggers` e escrever em `apps/api/drizzle/0001_updated_at_triggers.sql`:
  - a função `set_updated_at()` em `plpgsql` (`NEW.updated_at = now(); RETURN NEW;`);
  - um `CREATE TRIGGER <tabela>_set_updated_at BEFORE UPDATE ON <tabela> FOR EACH ROW EXECUTE FUNCTION set_updated_at()` para cada uma das quatro tabelas, separados por `--> statement-breakpoint`.
- [X] T016 [US1] Criar `apps/api/src/db/migrate.ts`:
  - `runMigrations(databaseUrl)` abre um cliente postgres.js `max: 1`, chama `migrate(drizzle({ client }), { migrationsFolder })` de `drizzle-orm/postgres-js/migrator` e fecha o cliente.
  - `migrationsFolder` é achado subindo a partir de `import.meta.dirname` até uma pasta `drizzle` com `meta/_journal.json`, para funcionar tanto em `src/db/` (tsx) quanto em `dist/` (bundle).
  - Quando executado como entrada (`db:migrate` e `dist/migrate.mjs`), chama `loadDotEnvIfPresent()` e `loadConfig(process.env)`, aplica as migrações e imprime `Migrações aplicadas.`. Em erro, imprime `Falha ao aplicar as migrações.` mais a mensagem do erro sem a URL, e sai com código 1.
- [X] T017 [US1] Criar `apps/api/src/test/global-setup.ts`:
  - sobe `new PostgreSqlContainer('postgres:17-alpine')`;
  - chama `runMigrations(container.getConnectionUri())`;
  - faz `project.provide('databaseUrl', uri)`;
  - no `teardown`, para o container;
  - declara `ProvidedContext { databaseUrl: string }` em `declare module 'vitest'`.

  Criar `apps/api/src/test/database.ts`:
  - `openTestDatabase()`: `createDatabase(inject('databaseUrl'))`;
  - `truncateAll(db)`: `TRUNCATE` de todas as tabelas de `pg_tables` do schema `public` com `RESTART IDENTITY CASCADE`;
  - `buildTestApp({ database, clock, limits })`: chama `buildApp` com `LOG_LEVEL` `fatal`.

### Tests for User Story 1

- [X] T018 [US1] Criar `apps/api/src/test/conventions.int.test.ts` (deve falhar sem a T015). Cenários:
  - As tabelas do schema `public` são exatamente `users`, `sessions`, `invites` e `rate_limit_attempts` (sem `puzzles` nem `progress`).
  - Para cada tabela, `information_schema.columns` mostra `created_at` e `updated_at` com `data_type = 'timestamp with time zone'`, `is_nullable = 'NO'` e `column_default` contendo `now()`, e `pg_trigger` mostra `<tabela>_set_updated_at` (este é o teste de guarda das tabelas futuras).
  - Inserir em `users` sem datas: as duas datas são iguais.
  - Atualizar `email` numa transação seguinte: `updated_at` maior e `created_at` igual.
  - Aplicar `runMigrations` de novo: nada muda (mesmo número de linhas em `drizzle.__drizzle_migrations`) e não lança.

### Implementation for User Story 1

- [X] T019 [US1] Em `apps/api/src/server.ts`, chamar `runMigrations(config.databaseUrl)` antes de `app.listen`. Se falhar, escrever `Falha ao aplicar as migrações.` mais a mensagem sem a URL no stderr, fechar o banco e o probe e sair com código 1
- [X] T020 [US1] Em `apps/api/tsdown.config.ts`, acrescentar as entradas `src/db/migrate.ts` e `src/cli.ts`, gerando `dist/server.mjs`, `dist/migrate.mjs` e `dist/cli.mjs`; crie `src/cli.ts` mínimo (imprime a ajuda e sai com 2) se ainda não existir. Em `apps/api/Dockerfile`, no estágio final, acrescentar `COPY apps/api/drizzle apps/api/drizzle`. Conferir com `npm run build -w @cruzadinha/api` e `docker build -f apps/api/Dockerfile .` que a imagem aplica as migrações ao subir com `docker compose up -d --build`

**Checkpoint**: banco versionado e convenção de datas garantida por teste. MVP entregue.

---

## Phase 4: User Story 2 - Cadastro com convite (Priority: P2)

**Goal**: o autor gera um convite pela linha de comando e o convidado se cadastra com e-mail, senha e código, saindo autenticado (FR-005 a FR-009, FR-017 a FR-020, FR-024 parcial, FR-028).

**Independent Test**: `npm run test:int -w @cruzadinha/api -- src/test/register.int.test.ts` verde; quickstart §3 e o primeiro bloco do §4.

### Tests for User Story 2

- [X] T021 [P] [US2] Criar `packages/shared/src/auth/schema.test.ts` (deve falhar antes da T026):
  - `emailSchema` transforma `' Ana@X.com '` em `'ana@x.com'` e recusa `'ana'`, `''` e e-mail com mais de 254 caracteres;
  - `passwordSchema` aceita 8 e 128 caracteres e recusa 7 e 129, mantendo espaços;
  - `registerRequestSchema` e `loginRequestSchema` são estritos (recusam campo extra);
  - `registerRequestSchema` aceita `inviteCode: 'qualquer-coisa'` (o formato do código não é conferido no schema do pedido) e recusa `inviteCode` vazio ou com 65 caracteres;
  - a senha do login aceita de 1 a 128 caracteres;
  - `authResponseSchema` aceita `{ user: { id: <uuid>, email } }`.
- [X] T022 [P] [US2] Criar `packages/shared/src/invites/schema.test.ts` (deve falhar antes da T027):
  - `inviteCodeSchema` transforma `'abcd-efgh jkmn-pqrs'` em `'ABCDEFGHJKMNPQRS'` e recusa 15 ou 17 caracteres e qualquer caractere fora de `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (por exemplo `O`, `0`, `I`, `1` e `L`);
  - `inviteStatusSchema` aceita `active`, `used`, `expired` e `revoked`;
  - `createdInviteSchema` exige `code` no formato `XXXX-XXXX-XXXX-XXXX` e `expiresAt` ISO;
  - `inviteListSchema` aceita `{ invites: [] }`.
- [X] T023 [P] [US2] Criar `apps/api/src/modules/rate-limit/rate-limit.service.test.ts` (unitário, com repositório falso e relógio injetado):
  - `check` recusa quando a contagem na janela atinge o limite e informa `retryAfterSeconds` maior que 0;
  - `check` aceita abaixo do limite;
  - os limites padrão de `limits.ts` são 5/15 min por e-mail e 20/15 min por endereço no login, e 10/1 h no cadastro e na geração de convites.
- [X] T024 [US2] Criar `apps/api/src/test/register.int.test.ts` (deve falhar antes da T032), usando `buildTestApp`, `app.inject` e convites criados pelo serviço de convites. Cada cenário confere o corpo exato de `contracts/http-api.md`:
  - (a) Convite válido mais e-mail novo: 201, `Set-Cookie` `sid` com `HttpOnly`, `SameSite=Lax`, `Path=/` e `Max-Age` de 30 dias. A linha em `sessions` tem `token_hash` igual ao SHA-256 do cookie. O convite tem `used_by_user_id` igual ao usuário criado e `used_at` preenchido.
  - (b) Código inexistente, usado, expirado (relógio avançado 8 dias), revogado (`revoked_at` preenchido no banco) e mal formado: as cinco respostas são idênticas (400 `invalid-invite`).
  - (c) E-mail já cadastrado com outra caixa e espaços: 409 `registration-failed`, e o convite continua válido.
  - (d) Senha com 7 caracteres e e-mail mal formado: 400 `invalid-input` com `fields`, e o convite continua válido.
  - (e) Dois cadastros simultâneos (`Promise.all`) com o mesmo convite e e-mails diferentes: exatamente um 201 e um `users` a mais (SC-004).
  - (f) Onze cadastros do mesmo `remoteAddress` em 1 hora: o 11º recebe 429 `too-many-attempts` com `Retry-After`, sem consultar convites. Com o relógio avançado 61 minutos, volta a aceitar.
  - (g) Código digitado em minúsculas com espaços: aceito.
  - (h) Nenhuma resposta contém o hash, e o banco não tem a senha em texto puro.
  - (i) Convite com `expires_at` igual ao instante do relógio: 400 `invalid-invite` (vale até o instante, não nele), e o convite segue sem `used_at`.
  - (j) Cadastro feito com o cookie de uma sessão ativa de outra conta e outro convite: 201, uma conta nova, e a sessão anterior continua válida.
- [X] T025 [US2] Criar `apps/api/src/test/cli.int.test.ts` com os cenários de `invites create` de `contracts/cli.md`, chamando `runCli(argv, deps)` com saída capturada:
  - sem `--days`: código 0, código no formato `XXXX-XXXX-XXXX-XXXX` e `expires_at` 7 dias depois do relógio;
  - `--days 1`: 1 dia;
  - `--days 0`, `--days -2`, `--days 1.5` e `--days abc`: código 2 e nenhuma linha gravada;
  - quatro criações seguidas: todas aceitas (sem cota) e com `created_by_user_id` nulo;
  - o código impresso cadastra uma conta pela API.

### Implementation for User Story 2

- [X] T026 [P] [US2] Criar `packages/shared/src/auth/schema.ts` com `emailSchema`, `passwordSchema`, `registerRequestSchema`, `loginRequestSchema`, `userSchema`/`User` e `authResponseSchema`, conforme `contracts/shared-schemas.md` (e-mail: trim, minúsculas, `z.email()`, até 254; senha: 8 a 128 caracteres, sem normalização; login: senha de 1 a 128; `inviteCode` no cadastro: texto de 1 a 64 caracteres, sem usar o `inviteCodeSchema`, para que código mal formado vire `invalid-invite` e não `invalid-input`). Exportar em `packages/shared/src/index.ts`
- [X] T027 [P] [US2] Criar `packages/shared/src/invites/schema.ts` com:
  - `inviteCodeSchema`: maiúsculas, sem espaços nem hífens, e então `/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{16}$/`;
  - `inviteStatusSchema`/`InviteStatus`;
  - `createdInviteSchema`: `code` `/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/` e `expiresAt` `z.iso.datetime()`;
  - `inviteListSchema`.

  Exportar em `packages/shared/src/index.ts`. O `shared` não importa nada do `api`.
- [X] T028 [P] [US2] Criar o módulo `apps/api/src/modules/rate-limit/`:
  - `limits.ts`: tipo `RateLimits` e `defaultRateLimits` (`login.email` 5 em 15 min, `login.address` 20 em 15 min, `register.address` 10 em 60 min, `inviteCreate.address` 10 em 60 min).
  - `rate-limit.repository.ts`:
    - `count(action, keyType, keyValue, since)`;
    - `record(entries)`: insere as linhas e, na mesma chamada, apaga `created_at < agora - 1 dia`;
    - `clear(action, keyType, keyValue)`.
  - `rate-limit.service.ts`:
    - `check(rules, now)` devolve `{ allowed: true }` ou `{ allowed: false, retryAfterSeconds }`, calculado pelo `created_at` mais antigo dentro da janela;
    - `record(...)`;
    - `clear(...)`.

  Nunca gravar senha nem código.
- [X] T029 [P] [US2] Criar `apps/api/src/modules/auth/users.repository.ts`, com `insertIfEmailFree(tx, { email, passwordHash })` (`INSERT ... ON CONFLICT (email) DO NOTHING RETURNING user_id, email`) e `findByEmail(email)`. Criar `apps/api/src/modules/auth/sessions.repository.ts`, com `create(tx, { userId, tokenHash, expiresAt, absoluteExpiresAt })`
- [X] T030 [P] [US2] Criar `apps/api/src/modules/invites/invites.repository.ts` com:
  - `create({ codeHash, createdByUserId, expiresAt })`;
  - `lockValidByCodeHash(tx, codeHash, now)`: `SELECT ... WHERE code_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > $now FOR UPDATE`;
  - `markUsed(tx, inviteId, userId, now)`.
- [X] T031 [US2] Criar `apps/api/src/modules/invites/invites.service.ts` com `createInvite({ createdByUserId: null, days })`, o caminho da linha de comando, sem cota. Ele gera o código (`generateInviteCode`), grava `sha256Hex` do código normalizado com `expires_at = now + days` e devolve `{ inviteId, code: formatInviteCode(code), expiresAt }`. `days` deve ser inteiro positivo; o padrão é 7
- [X] T032 [US2] Criar `apps/api/src/modules/auth/auth.service.ts` com `register({ email, password, inviteCode, address })`, seguindo a decisão 11 de `research.md`:
  1. Confere o limite `REGISTER` por endereço e registra a tentativa.
  2. Normaliza o código com `inviteCodeSchema.safeParse`; se falhar, devolve `invalid-invite` sem consultar o banco.
  3. Calcula o hash argon2 fora da transação.
  4. Em `db.transaction`, chama `lockValidByCodeHash`; sem linha, devolve `invalid-invite`.
  5. Chama `insertIfEmailFree`; sem linha, lança um erro interno que desfaz a transação e devolve `registration-failed`.
  6. Chama `markUsed`.
  7. Cria a sessão (`generateSessionToken`, `expires_at = now + 30 d`, `absolute_expires_at = now + 365 d`).

  Devolve `{ user, sessionToken, expiresAt }` ou uma falha tipada. Não importa Fastify.
- [X] T033 [US2] Criar `apps/api/src/modules/auth/session-cookie.ts` com `setSessionCookie(reply, token, expiresAt, now, config)` (`sid`, `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure` quando `nodeEnv` não é `development` nem `test`, `maxAge` em segundos até `expiresAt`) e `clearSessionCookie(reply)`, com o teste unitário `apps/api/src/modules/auth/session-cookie.test.ts`, que confere o `Set-Cookie` gerado: com `nodeEnv: 'production'` tem `Secure`, `HttpOnly`, `SameSite=Lax` e `Path=/`; com `development` e `test` não tem `Secure` (FR-013). Criar `apps/api/src/modules/auth/auth.routes.ts` com `POST /api/auth/register`:
  - ordem de `contracts/http-api.md`: limite, formato, convite, e-mail;
  - corpo como `unknown` e `registerRequestSchema.safeParse`, com `fields` a partir dos `path` dos issues;
  - `request.ip` como endereço;
  - resposta 201 com `authResponseSchema`.

  Registrar as rotas e os serviços em `apps/api/src/app.ts`.
- [X] T034 [US2] Implementar a linha de comando: `runCli` em `apps/api/src/cli/run-cli.ts` (importável pelos testes) e a entrada em `apps/api/src/cli.ts` (criado mínimo na T020):
  - `runCli(argv, deps)` usa `node:util` `parseArgs` e devolve o código de saída. `deps` traz `database`, `clock`, `stdout` e `stderr`, injetáveis nos testes.
  - Implementa `invites create [--days N]` com a saída exata de `contracts/cli.md` e o erro de uso (código 2) para `--days` que não seja inteiro positivo.
  - Quando executado como entrada: `loadDotEnvIfPresent()`, `loadConfig`, `createDatabase`, `runCli(process.argv.slice(2))`, fechar o banco e `process.exit(code)`.

**Checkpoint**: cadastro com convite funcionando pela API e convite criado pela linha de comando.

---

## Phase 5: User Story 3 - Entrar, saber quem está logado e sair (Priority: P3)

**Goal**: login, "quem sou eu" e logout com sessão no servidor, expiração deslizante e limite absoluto (FR-010 a FR-016, FR-027, FR-029).

**Independent Test**: `npm run test:int -w @cruzadinha/api -- src/test/session.int.test.ts` verde; segundo bloco do quickstart §4.

### Tests for User Story 3

- [X] T035 [P] [US3] Criar `apps/api/src/modules/auth/session-policy.test.ts` (unitário, deve falhar antes da T037), para `decideSession({ expiresAt, absoluteExpiresAt, endedAt }, now)`:
  - `ended` quando `endedAt` está preenchido;
  - `expired` quando `now >= expiresAt`;
  - `active` sem renovação quando `expiresAt - now >= 29 d`;
  - `active` com `renewTo = min(now + 30 d, absoluteExpiresAt)` quando `expiresAt - now < 29 d` e `expiresAt < absoluteExpiresAt`;
  - sem renovação quando `expiresAt == absoluteExpiresAt`;
  - `expired` exatamente no instante de `expiresAt`, e válido 1 ms antes.
- [X] T036 [US3] Criar `apps/api/src/test/session.int.test.ts` (deve falhar antes da T040). Cenários:
  - (a) Login com e-mail em outra caixa e a senha certa: 200, cookie novo e `me` com `{ user: { id, email } }`. O corpo de `me` não contém `password` nem `$argon2`.
  - (b) E-mail inexistente e senha errada: corpos e status idênticos (401 `invalid-credentials`).
  - (c) `me` sem cookie, com cookie inventado, com cookie mal formado (`sid=%%%`), com sessão expirada (relógio + 30 d) e com sessão encerrada: sempre 401 `unauthenticated`, sem 500.
  - (d) Logout: 204, `Set-Cookie` expirado, `ended_at` preenchido, e o mesmo cookie depois dá 401. Logout sem sessão também dá 204.
  - (e) Renovação:
    - relógio + 2 dias: `me` responde com `Set-Cookie` e `expires_at` igual a agora + 30 d;
    - de novo no mesmo dia: sem `Set-Cookie` e sem mudar `expires_at`;
    - usando a cada 20 dias por 380 dias: a sessão é recusada depois de `absolute_expires_at` (cenário 7 da US3).
  - (f) Login com sessão já ativa: cria uma sessão nova e a anterior continua válida.
  - (g) Limites:
    - cinco senhas erradas para o mesmo e-mail: a sexta tentativa recebe 429 `too-many-attempts` mesmo com a senha certa;
    - com o relógio + 16 min, volta a aceitar;
    - vinte falhas do mesmo endereço com e-mails diferentes: a 21ª recebe 429;
    - um login certo apaga as falhas daquele e-mail.
  - (h) SC-007: com limites altos injetados, 20 logins com e-mail inexistente e 20 com senha errada, alternando a ordem a cada par. Descartar as 2 primeiras medidas de cada lado e comparar as médias: diferença menor que 10%, com `retry: 2` no teste.
  - (i) SC-008: cadastro, login, `me` e logout levam cada um menos de 1 s.

### Implementation for User Story 3

- [X] T037 [P] [US3] Criar `apps/api/src/modules/auth/session-policy.ts`, com a função pura `decideSession` da T035 e as constantes `SESSION_IDLE_DAYS = 30`, `SESSION_ABSOLUTE_DAYS = 365` e `SESSION_RENEW_AFTER_DAYS = 1`. Usá-las também em `register` (T032)
- [X] T038 [P] [US3] Em `apps/api/src/modules/auth/sessions.repository.ts`, acrescentar:
  - `findByTokenHash(tokenHash)`, que junta `users` para trazer `user_id` e `email`;
  - `renew(sessionId, expiresAt)`;
  - `end(sessionId, now)`, só onde `ended_at IS NULL`.
- [X] T039 [US3] Em `apps/api/src/modules/auth/auth.service.ts`, acrescentar:
  - `login({ email, password, address })`:
    1. Confere os limites `LOGIN` por e-mail e por endereço.
    2. Busca o usuário; sem usuário, verifica a senha contra o hash fictício da subida.
    3. Em falha, registra as duas linhas e devolve `invalid-credentials`.
    4. Em sucesso, apaga as falhas `LOGIN`/`EMAIL` do e-mail e cria a sessão.
  - `authenticate(sessionToken, now)`: `sha256Hex`, `findByTokenHash` e `decideSession`. Renova quando indicado e devolve `{ user, renewedExpiresAt? }` ou `null`.
  - `logout(sessionToken, now)`.

  Token ausente ou com formato diferente de base64url com 43 caracteres devolve `null` sem consultar o banco.
- [X] T040 [US3] Criar `apps/api/src/modules/auth/session.plugin.ts` com `createRequireSession(authService, config, clock)`, que devolve o `preHandler` `requireSession` passado às rotas como opção (sem `fastify-plugin`; o `app.decorateRequest('user', null)` fica no `app.ts`):
  - lê `request.cookies.sid` e chama `authenticate`;
  - sem sessão, responde 401 `unauthenticated`;
  - com sessão, preenche `request.user` (tipado por `declare module 'fastify'`) e reenvia o cookie quando houve renovação.

  Em `apps/api/src/modules/auth/auth.routes.ts`, acrescentar:
  - `POST /api/auth/login`: 200 com `authResponseSchema` e cookie; 400, 401 e 429 conforme o contrato;
  - `POST /api/auth/logout`: sempre 204 com `clearSessionCookie`;
  - `GET /api/auth/me`: com `requireSession`.

**Checkpoint**: ciclo completo de sessão, com renovação e limites.

---

## Phase 6: User Story 4 - Usuário gera convites dentro da cota (Priority: P4)

**Goal**: usuário logado gera convites (no máximo 3 ativos) e lista os seus sem ver códigos (FR-021 a FR-023, FR-028).

**Independent Test**: `npm run test:int -w @cruzadinha/api -- src/test/invites.int.test.ts` verde; terceiro bloco do quickstart §4.

### Tests for User Story 4

- [X] T041 [P] [US4] Criar `apps/api/src/modules/invites/invite-status.test.ts` (unitário, deve falhar antes da T043), para `inviteStatus({ usedAt, revokedAt, expiresAt }, now)`:
  - `used` tem precedência sobre `revoked` e `expired`;
  - `revoked` tem precedência sobre `expired`;
  - `expired` quando `now >= expiresAt`;
  - `active` nos demais casos.
- [X] T042 [US4] Criar `apps/api/src/test/invites.int.test.ts` (deve falhar antes da T045). Cenários:
  - (a) Usuário logado: `POST /api/invites` dá 201 com `code` no formato e `expiresAt` = agora + 7 d. O código cadastra outra conta, e o banco não tem o código em texto puro.
  - (b) O quarto pedido com 3 ativos dá 409 `invite-quota-reached`.
  - (c) Depois de um convite usado, outro expirado (relógio + 8 d) ou outro revogado, um novo pedido é aceito.
  - (d) Com 2 ativos, cinco pedidos simultâneos: exatamente um 201 e nunca mais de 3 ativos (SC-004).
  - (e) `GET /api/invites` lista só os convites do usuário, do mais novo para o mais antigo, com `createdAt`, `expiresAt` e `status` corretos para os quatro estados. Não mostra códigos, convites de outro usuário nem os da linha de comando (`JSON.stringify` da resposta não contém nenhum código gerado).
  - (f) Sem sessão: 401 nas duas rotas.
  - (g) Onze pedidos do mesmo endereço em 1 hora: o 11º recebe 429, mesmo com cota livre.

### Implementation for User Story 4

- [X] T043 [P] [US4] Criar `apps/api/src/modules/invites/invite-status.ts` com a função pura `inviteStatus` da T041
- [X] T044 [US4] Em `apps/api/src/modules/invites/invites.repository.ts`, acrescentar:
  - `createWithinQuota({ userId, codeHash, expiresAt, now, quota: 3 })`: numa transação, `SELECT ... FROM users WHERE user_id = $1 FOR UPDATE`, depois a contagem de `created_by_user_id = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > $now`, e o `INSERT` só se a contagem for menor que a cota. Devolve a linha ou `quota-reached`;
  - `listByCreator(userId)`, ordenado por `created_at DESC`.
- [X] T045 [US4] Em `apps/api/src/modules/invites/invites.service.ts`, acrescentar `createForUser(userId, address, now)` (limite `INVITE_CREATE` por endereço, registra a tentativa, cota de 3, validade de 7 dias) e `listForUser(userId, now)` (com `inviteStatus`). Criar `apps/api/src/modules/invites/invites.routes.ts`, com `POST /api/invites` (201 `createdInviteSchema`, 409, 429) e `GET /api/invites` (200 `inviteListSchema`), ambos com `requireSession`. Registrar em `apps/api/src/app.ts`

**Checkpoint**: convites por usuário com cota exata.

---

## Phase 7: User Story 5 - Autor administra convites pela linha de comando (Priority: P5)

**Goal**: listar todos os convites e revogar pelo identificador (FR-025, FR-026; `create` já veio na US2).

**Independent Test**: `npm run test:int -w @cruzadinha/api -- src/test/cli.int.test.ts` verde; quickstart §5.

### Tests for User Story 5

- [X] T046 [US5] Em `apps/api/src/test/cli.int.test.ts`, acrescentar:
  - `invites list` com convites da linha de comando e de um usuário: uma linha por convite, com `linha de comando` ou o e-mail do criador, as datas ISO e a situação em português, sem nenhum código. Sem convites: `Nenhum convite.`
  - `invites revoke <id>` de um convite ativo: código 0 e `Convite <id> revogado.`; depois disso o cadastro com o código dá 400 `invalid-invite`, e o convite deixa de contar na cota do criador.
  - Revogar um convite expirado: código 0, e a situação passa a `revogado`.
  - Revogar um convite usado, um já revogado ou um UUID inexistente: código 1 com a mensagem de "Nada a revogar…", sem alterar `updated_at`.
  - `revoke abc`: código 2.
  - Subcomando desconhecido: código 2 com a ajuda.

### Implementation for User Story 5

- [X] T047 [US5] Em `apps/api/src/modules/invites/invites.repository.ts`, acrescentar `listAll()` (com `LEFT JOIN users` pelo `created_by_user_id`, trazendo o e-mail do criador, ordenado por `created_at DESC`) e `revoke(inviteId, now)` (`UPDATE ... SET revoked_at = $now WHERE invite_id = $1 AND used_at IS NULL AND revoked_at IS NULL RETURNING invite_id`). Em `apps/api/src/modules/invites/invites.service.ts`, acrescentar `listAll(now)` (com `inviteStatus`) e `revoke(inviteId, now)` (devolve `revoked` ou `nothing-to-revoke`)
- [X] T048 [US5] Em `apps/api/src/cli.ts`, acrescentar `invites list` (tabela com cabeçalho `ID  CRIADOR  CRIADO EM  EXPIRA EM  SITUAÇÃO` e situações `ativo`, `usado`, `expirado` e `revogado`) e `invites revoke <invite_id>` (UUID validado por Zod), com as saídas e os códigos de `contracts/cli.md`

### Seed de desenvolvimento (FR-033, cenários 6 a 8 da US5)

- [X] T049 [US5] Criar `apps/api/src/test/seed.int.test.ts` (deve falhar antes da T050), chamando `runSeed(env, deps)` com saída capturada:
  - com `NODE_ENV=development`, `SEED_USER_EMAIL=' Dev@Cruzadinha.local '` e `SEED_USER_PASSWORD='senha-de-teste-123'`: código 0, saída `Usuário de teste criado: dev@cruzadinha.local`, uma linha em `users` com o e-mail normalizado e `password_hash` argon2id, nenhuma linha em `invites`, e `POST /api/auth/login` com essas credenciais dá 200;
  - rodar de novo com outra senha: código 0, saída `Usuário de teste já existe: dev@cruzadinha.local`, e `password_hash` e `updated_at` iguais aos de antes (o login com a senha antiga continua dando 200);
  - `NODE_ENV=production`: código 1, `O seed só roda em desenvolvimento.` e nenhuma linha gravada;
  - variável ausente, e-mail inválido ou senha com 7 caracteres: código 1, mensagem com o nome da variável e nenhuma linha gravada;
  - nenhuma saída contém a senha.
- [X] T050 [US5] Em `apps/api/src/config.ts`, criar `loadSeedConfig(env)` (variáveis `SEED_USER_EMAIL` com `emailSchema` e `SEED_USER_PASSWORD` com `passwordSchema`, ambas obrigatórias, mensagens no formato de `loadConfig` e sem os valores), com casos em `apps/api/src/config.test.ts`. Criar `runSeed` em `apps/api/src/db/seed-user.ts` (importável pelos testes) e a entrada em `apps/api/src/db/seed.ts`:
  - `runSeed(env, deps)` segue esta ordem, para recusar antes de qualquer conexão:
    1. recusa quando `NODE_ENV` é `production` (lido pelo `loadSeedConfig`, que também valida `NODE_ENV`), antes de exigir `DATABASE_URL`;
    2. valida `SEED_USER_EMAIL` e `SEED_USER_PASSWORD` com `loadSeedConfig`;
    3. só então chama `loadConfig` e abre o banco pelo `deps.openDatabase(url)` (nos testes, o banco do container);
    4. calcula `hashPassword` e chama `insertIfEmailFree` de `users.repository.ts`, sem convite;
    5. imprime `Usuário de teste criado: <email>` ou `Usuário de teste já existe: <email>`, fecha o banco e devolve o código de saída.
  - Quando executado como entrada (`npm run db:seed -w @cruzadinha/api`): chama `loadDotEnvIfPresent()` e `runSeed(process.env, { openDatabase: createDatabase })` e sai com o código.

  O seed não entra no `tsdown.config.ts`: fica fora da imagem de produção.

**Checkpoint**: todas as histórias funcionando.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: garantias transversais, CI e documentação.

- [X] T051 [P] Criar `apps/api/src/test/secrets.int.test.ts` (SC-006). Como a suíte esvazia as tabelas antes de cada teste, a inspeção é feita ao fim de um teste único que exercita todos os fluxos: o teste roda cadastro, login, geração de convites e criação pela linha de comando, guardando cada senha, código de convite e valor de cookie usado. Depois, lê todas as colunas `text` de todas as tabelas do schema `public` e confere que nenhum desses valores aparece em texto puro, nem o código normalizado
- [X] T052 [P] Em `.github/workflows/ci.yml`, acrescentar o job `integration` (`runs-on: ubuntu-latest`, `timeout-minutes: 10`, `actions/checkout@v7`, `actions/setup-node@v7` com `node-version-file: .nvmrc` e `cache: npm`, `npm ci` e `npm run test:int`), sem mudar os jobs `quality` e `image`
- [X] T053 [P] Atualizar `CLAUDE.md`:
  - Commands: `npm run test:int` (exige Docker), `npm run db:generate -w @cruzadinha/api` (e `-- --custom --name <nome>`), `npm run db:migrate -w @cruzadinha/api`, `npm run db:seed -w @cruzadinha/api` (usuário de teste só em desenvolvimento, credenciais de `SEED_USER_EMAIL`/`SEED_USER_PASSWORD`) e `npm run cli -w @cruzadinha/api -- invites create|list|revoke`.
  - Architecture: `src/db/` (cliente, schema, `timestamps`, migrações em `apps/api/drizzle/` aplicadas também na subida), os módulos `auth`, `invites` e `rate-limit`, `src/cli.ts` e os testes de integração em `src/test/` com Testcontainers.
  - Current state: a feature 004.
  - A frase sobre testes ("never touch ... a database") passa a valer só para os unitários.
- [X] T054 [P] Atualizar `README.md`: na tabela de comandos, `npm run test:int` (exige Docker) `npm run db:seed -w @cruzadinha/api` (cria o usuário de teste do `.env`) e `npm run cli -w @cruzadinha/api -- invites create`, e uma frase dizendo que a API aplica as migrações ao subir
- [X] T055 Rodar o portão completo e corrigir o que falhar: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (sem Docker), `npm run test:int` (menos de 2 min, SC-009), `npm run build` e `docker build -f apps/api/Dockerfile .`
- [X] T056 Executar `specs/004-banco-auth-convites/quickstart.md` do §2 ao §6 contra o Compose local e registrar qualquer divergência como correção nesta branch

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências. A T001 vem antes de tudo (dependências instaladas); a T004 vem antes da T013.
- **Foundational (Phase 2)**: depende do Setup e bloqueia todas as histórias.
- **US1 (Phase 3)**: depende da Foundational. Bloqueia as demais, porque cria o schema e o ambiente dos testes de integração.
- **US2 (Phase 4)**: depende da US1.
- **US3 (Phase 5)**: depende da US2 (contas e sessões criadas no cadastro).
- **US4 (Phase 6)**: depende da US3 (`requireSession`).
- **US5 (Phase 7)**: depende da US2 (`cli.ts`, `invites.service.ts` e `users.repository.ts`, usado pelo seed). Pode correr em paralelo com a US3 e a US4, se os arquivos compartilhados (`invites.repository.ts`, `invites.service.ts`) forem editados em sequência.
- **Polish (Phase 8)**: depois de todas as histórias. A T055 e a T056 vêm por último.

### Within Each User Story

- Testes primeiro, falhando; depois schemas do `shared`, repositórios, serviços, rotas e linha de comando.
- `invites.repository.ts`, `invites.service.ts`, `auth.service.ts`, `auth.routes.ts`, `sessions.repository.ts` e `cli.ts` são editados por várias tarefas: essas tarefas nunca rodam em paralelo entre si.

## Parallel Opportunities

- **Setup**: T002, T003, T005 e T006 em paralelo depois da T001.
- **Foundational**: T007, T008, T009, T010 e T012 em paralelo; a T011 e depois a T013 em seguida.
- **US2**: T021, T022 e T023 em paralelo; depois T026, T027, T028, T029 e T030 em paralelo; então T031 → T032 → T033 → T034.
- **US3**: T035 e T037 (teste e função pura) e a T038 em paralelo.
- **US4**: T041 e T043 em paralelo com a T042.
- **Polish**: T051, T052, T053 e T054 em paralelo.

### Exemplo (US2)

```bash
Task: "T021 Criar packages/shared/src/auth/schema.test.ts"
Task: "T022 Criar packages/shared/src/invites/schema.test.ts"
Task: "T023 Criar apps/api/src/modules/rate-limit/rate-limit.service.test.ts"
# depois:
Task: "T026 Criar packages/shared/src/auth/schema.ts"
Task: "T027 Criar packages/shared/src/invites/schema.ts"
Task: "T028 Criar o módulo apps/api/src/modules/rate-limit/"
Task: "T029 Criar users.repository.ts e sessions.repository.ts"
Task: "T030 Criar invites.repository.ts"
```

## Implementation Strategy

1. **MVP (US1)**: Setup, Foundational e US1. O banco versionado, com a convenção de datas protegida por teste, já pode ir para a `main` sozinho.
2. **Entrada no site (US2 + US3)**: cadastro com convite e sessão completa. É o mínimo para alguém usar o site, numa feature futura das telas.
3. **Crescimento por indicação (US4)** e **administração (US5)**.
4. **Polish**: inspeção de segredos, job de CI, documentação e validação final.

Cada fase termina com `npm test` e `npm run test:int` verdes antes do commit.

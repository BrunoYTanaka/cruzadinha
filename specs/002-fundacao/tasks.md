---

description: "Task list for feature 002-fundacao"
---

# Tasks: Fundação do projeto

**Input**: Design documents from `/specs/002-fundacao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (health-api.md, server-config.md, root-scripts.md), quickstart.md

**Tests**: Incluídos. FR-006 exige pelo menos um teste mínimo por parte, e a constitution exige testes sem internet (princípio VII). Nenhum teste usa rede, banco ou navegador.

**Organization**: Tarefas agrupadas por história de usuário (US1 = P1, US2 = P2, US3 = P3, US4 = P4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história a que a tarefa pertence (US1 a US4)

## Path Conventions

Monorepo npm workspaces na raiz do repositório: `apps/api`, `apps/web`, `packages/shared` (ver Project Structure em plan.md). Todos os caminhos são relativos à raiz.

**Regras para todas as tarefas** (constitution v1.4.0 e `CLAUDE.md`):
- Consultar o Context7 antes de escrever código ou configuração de qualquer biblioteca; usar as versões de `research.md`.
- Nunca escrever o tipo `any` (`: any`, `as any`, `<any>`); usar `unknown`, genéricos ou uniões. Dados externos entram como `unknown` e passam por Zod.
- Formatar com Prettier (`semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`).
- Nunca gravar, imprimir ou commitar valores reais de segredos; só valores fictícios no `.env.example` e no Compose.
- Commits em Conventional Commits, sem `Co-Authored-By`, com escopo `api`, `web`, `shared` ou sem escopo para a raiz.
- Pré-requisito do autor: Node.js 24 ativo (`nvm use`) antes da T008. Docker só a partir da Phase 4 (job de imagem) e da Phase 6.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Arquivos da raiz que todas as partes herdam.

- [X] T001 Criar `package.json` da raiz: `"name": "cruzadinha"`, `"private": true`, `"type": "module"`, `"workspaces": ["apps/*", "packages/*"]`, `"engines": { "node": ">=24" }` e os scripts de `specs/002-fundacao/contracts/root-scripts.md`: `format` (`prettier --write .`), `format:check` (`prettier --check .`), `lint` (`eslint .`), `typecheck` (`npm run typecheck --workspaces --if-present`), `test` (`npm run test --workspaces --if-present`), `build` (`npm run build --workspaces --if-present`). Sem `engine-strict` (FR-016: versão diferente só avisa)
- [X] T002 [P] Criar `.nvmrc` com `24`
- [X] T003 [P] Criar `tsconfig.base.json` com `strict: true`, `module: "preserve"`, `moduleResolution: "bundler"`, `target: "es2024"`, `verbatimModuleSyntax: true`, `isolatedModules: true`, `noUncheckedIndexedAccess: true`, `skipLibCheck: true`, `noEmit: true`, `resolveJsonModule: true` (TypeScript 6.0; não usar opções obsoletas como `moduleResolution: "node"`)
- [X] T004 [P] Criar `.prettierrc.json` com as opções do `CLAUDE.md` e `.prettierignore` com `dist/`, `coverage/`, `package-lock.json`, `.specify/`, `.claude/`, `specs/` e `CLAUDE.md` (Markdown gerenciado pelo Spec Kit ou escrito à mão, que continua versionado no git e fica fora só da formatação)
- [X] T005 [P] Criar `.editorconfig` alinhado ao Prettier (UTF-8, LF, 2 espaços, newline final, sem espaço no fim da linha)
- [X] T006 [P] Conferir `.gitignore` da raiz: manter `.env`, `.env.*` e `!.env.example`, e acrescentar `*.tsbuildinfo` e `.vite/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: As três partes existem, instalam e têm configuração de tipos, testes e lint. Nenhuma história começa antes disto.

**⚠️ CRITICAL**: os comandos da raiz (T008 em diante) dependem destes pacotes.

- [X] T007 Criar os `package.json` das três partes, todos `"private": true` e `"type": "module"`:
  - `packages/shared/package.json`: `@cruzadinha/shared`, `"exports": { ".": "./src/index.ts" }`, dependência `zod` (4.6), dev `vitest` (5.0), scripts `typecheck` (`tsc --noEmit`) e `test` (`vitest run`)
  - `apps/api/package.json`: `@cruzadinha/api`, dependências `@cruzadinha/shared` (`"*"`), `fastify` (5.12), `zod` (4.6), `postgres` (3.4); dev `tsx` (4.23), `tsdown` (0.23), `vitest`, `@types/node`; scripts `dev` (`tsx watch src/server.ts`), `build` (`tsdown`), `start` (`node dist/server.mjs`), `typecheck`, `test`
  - `apps/web/package.json`: `@cruzadinha/web`, dependências `@cruzadinha/shared` (`"*"`), `react` e `react-dom` (19.3), `@tanstack/react-query` (5); dev `vite` (8.3), `@vitejs/plugin-react` (6), `vitest`, `jsdom`, `@testing-library/react` (16), `@testing-library/jest-dom`, `@types/react`, `@types/react-dom`, `@types/node`; scripts `dev` (`vite`), `build` (`vite build`), `typecheck` (`tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json`), `test`
- [X] T008 Na raiz, instalar as dev dependencies compartilhadas: `typescript` (6.0, ainda não o 7, por causa do typescript-eslint), `eslint` e `@eslint/js` (10, com `overrides` de peer para o jsx-a11y; o 9.39 se mostrou sem suporte, ver research.md item 5), `typescript-eslint` (8.71), `eslint-config-prettier` (10), `eslint-plugin-react-hooks` (7), `eslint-plugin-jsx-a11y` (6.10), `globals` (17), `prettier` (3.9). Rodar `npm install` para gerar o `package-lock.json` (versionado, princípio II) e confirmar que não há erro de peer dependency
- [X] T009 [P] Criar `packages/shared/tsconfig.json`, `apps/api/tsconfig.json` e `apps/web/tsconfig.json`, cada um estendendo `../../tsconfig.base.json`: `shared` com `"types": []` e `lib: ["es2024"]`; `api` com `"types": ["node"]` e `lib: ["es2024"]`; `web` com `lib: ["es2024", "dom", "dom.iterable"]`, `jsx: "react-jsx"`, `"types": ["vite/client", "@testing-library/jest-dom/vitest"]` e `include: ["src"]`; mais `apps/web/tsconfig.node.json`, estendendo a base com `"types": ["node"]` e `include: ["vite.config.ts", "vitest.config.ts"]`. Em `shared` e `api`, o `include` cobre `src` e os arquivos `*.config.ts`
- [X] T010 [P] Criar `packages/shared/vitest.config.ts` e `apps/api/vitest.config.ts` com `environment: 'node'`, e `apps/web/vitest.config.ts` com `environment: 'jsdom'` e um `setupFiles` (`apps/web/src/test/setup.ts`) que importa `@testing-library/jest-dom/vitest`. Nenhum declara `test.projects` (aviso do Vitest 5 em research.md, item 8)
- [X] T011 Criar `eslint.config.mjs` na raiz com `defineConfig` do ESLint 9: ignorar `**/dist`, `**/coverage` e `.specify/`; base para `**/*.{ts,tsx,js,mjs}` com `js.configs.recommended` e `tseslint.configs.recommended`; regra `@typescript-eslint/no-explicit-any: 'error'` declarada explicitamente (constitution v1.4.0); `globals.node` para `apps/api/**`, `packages/**` e arquivos de config; bloco `apps/web/**/*.{ts,tsx}` com `globals.browser`, `reactHooks.configs.flat.recommended` e `jsxA11y.flatConfigs.recommended`; `eslint-config-prettier` por último
- [X] T012 Criar `packages/shared/src/index.ts` vazio (só `export {}`), `apps/api/src/server.ts` provisório (só `export {}`, substituído na T023) e `apps/web/src/main.tsx` provisório (só `export {}`, substituído na T025) para que `npm run typecheck`, `npm run lint` e `npm run format:check` rodem e passem nas três partes antes das histórias

**Checkpoint**: `npm install`, `npm run lint`, `npm run typecheck` e `npm run format:check` passam na raiz.

---

## Phase 3: User Story 1 - Preparar o projeto e conferir a qualidade com comandos únicos (Priority: P1) 🎯 MVP

**Goal**: As três partes têm código mínimo real, ligado pelo tipo compartilhado, e os comandos da raiz cobrem todas.

**Independent Test**: Num clone limpo, `npm ci` e depois `format:check`, `lint`, `typecheck` e `test` passam; um erro de tipo proposital falha com arquivo e linha; mudar `HealthStatus` quebra o `api` e o `web` (quickstart, história 1).

### Tests for User Story 1

> **NOTE: escrever primeiro e confirmar que falham antes da implementação.**

- [X] T013 [P] [US1] Criar `packages/shared/src/health.test.ts`: `healthStatusSchema` aceita `{ status: 'ok', database: 'up' }` e `{ status: 'ok', database: 'down' }` e rejeita `database` com outro valor, `status` diferente de `'ok'` e campos ausentes
- [X] T014 [P] [US1] Criar `apps/api/src/config.test.ts` para `loadConfig(env)`. Regras de `data-model.md`: "`nodeEnv`: `development` | `test` | `production`; padrão `development`"; "`host`: texto não vazio; padrão `0.0.0.0`"; "`port`: inteiro de 1 a 65535; padrão `3000`"; "`logLevel`: `fatal` | `error` | `warn` | `info` | `debug` | `trace`; padrão `info`"; "`databaseUrl`: obrigatória; URL com esquema `postgres:` ou `postgresql:`". Casos: só `DATABASE_URL` válida aplica todos os padrões; `DATABASE_URL` ausente, com esquema `http:`, `PORT=0`, `PORT=70000` e `PORT=abc` falham; a mensagem de erro cita o nome da variável e NÃO contém o valor recebido (testar com um valor marcador, como `postgres://usuario:SEGREDO@host/db` num campo inválido)
- [X] T015 [P] [US1] Criar `apps/api/src/modules/health/health.service.test.ts` com uma `DatabaseProbe` falsa: `check()` `true` → `{ status: 'ok', database: 'up' }`; `false` → `{ status: 'ok', database: 'down' }`; `check()` que rejeita → `database: 'down'` sem propagar a exceção
- [X] T016 [P] [US1] Criar `apps/api/src/app.test.ts` com `buildApp({ config, probe })` e `app.inject()`: `GET /api/health` responde 200 e corpo válido por `healthStatusSchema` com o banco `up` e com o banco `down` (contrato `contracts/health-api.md`: "O status HTTP é 200 nos dois casos de `database`"); o corpo nunca contém a `databaseUrl`; `GET /api/outra` responde 404. A mensagem de porta ocupada de T023 é testada à parte, como função pura `describeListenError` em `apps/api/src/listen-error.ts` e `listen-error.test.ts`, sem abrir porta (achado T1 da análise)
- [X] T017 [P] [US1] Criar `apps/web/src/app/App.test.tsx` (Testing Library, `fetch` simulado com `vi.stubGlobal` e `vi.unstubAllGlobals()` em `afterEach`, `QueryClient` novo por teste com `retry: false`): mostra "Cruzadinha"; com `/api/health` respondendo banco `up`, mostra servidor e banco disponíveis; com banco `down`, mostra o banco indisponível; com `fetch` falhando ou corpo que não passa no `healthStatusSchema`, mostra o servidor indisponível

### Implementation for User Story 1

- [X] T018 [US1] Criar `packages/shared/src/health.ts` com `healthStatusSchema` (Zod: `status: z.literal('ok')`, `database: z.enum(['up', 'down'])`) e `export type HealthStatus = z.infer<typeof healthStatusSchema>`, e reexportar os dois em `packages/shared/src/index.ts`
- [X] T019 [P] [US1] Criar `apps/api/src/config.ts` com `loadConfig(env: Record<string, string | undefined>)` validando com Zod (`safeParse`) as regras de T014; retorna um objeto `ServerConfig` congelado (`Object.freeze`); em falha, lança um erro cuja mensagem lista `NOME: motivo` por variável a partir de `issues[].path`, sem incluir valores (contrato `contracts/server-config.md`)
- [X] T020 [P] [US1] Criar `apps/api/src/db/probe.ts` com a interface `DatabaseProbe` (`check(): Promise<boolean>` e `close(): Promise<void>`) e `createPostgresProbe(databaseUrl)` com Postgres.js (`postgres(url, { max: 1, connect_timeout: 2 })`, `` sql`select 1` ``). `check()` devolve `false` em erro ou tempo limite, nunca lança, e nunca loga a URL. `close()` chama `sql.end({ timeout: 5 })`
- [X] T021 [US1] Criar `apps/api/src/modules/health/health.service.ts` com `getHealth(probe: DatabaseProbe): Promise<HealthStatus>` (tipo de `@cruzadinha/shared`), sem conhecer HTTP (princípio III)
- [X] T022 [US1] Criar `apps/api/src/modules/health/health.routes.ts` como plugin Fastify que registra `GET /api/health` e só chama `getHealth`, e `apps/api/src/app.ts` com `buildApp({ config, probe })`, que cria o Fastify com `logger: { level: config.logLevel }`, registra as rotas e não escuta porta
- [X] T023 [US1] Criar `apps/api/src/server.ts`: carrega `.env` da raiz com `process.loadEnvFile()` só se o arquivo existir; chama `loadConfig(process.env)`; em erro, escreve a mensagem em `stderr` e sai com código 1 sem abrir a porta; cria a sonda e o app; escuta em `config.host` e `config.port`; se o `listen` falhar com `EADDRINUSE`, escreve em `stderr` `porta <port> em uso; troque PORT (ou API_PORT no Compose)` e sai com código 1, sem stack trace; em `SIGINT` e `SIGTERM`, fecha o app e a sonda
- [X] T024 [P] [US1] Criar `apps/web/vite.config.ts` com `@vitejs/plugin-react` e `server.proxy` para `'/api'` com `target` em `process.env.API_PROXY_TARGET ?? 'http://localhost:3000'` e `changeOrigin: true`, sem `rewrite` (a API já tem o prefixo `/api`)
- [X] T025 [US1] Criar `apps/web/index.html`, `apps/web/src/main.tsx` (com `QueryClientProvider`) e `apps/web/src/app/App.tsx`: `useQuery` busca `/api/health`, lê o corpo como `unknown` e valida com `healthStatusSchema` de `@cruzadinha/shared`; a página mostra "Cruzadinha" e o estado do servidor e do banco em texto (sem cor como único sinal, para acessibilidade). Este `main.tsx` substitui o provisório de T012
- [X] T026 [US1] Rodar da raiz `npm run format:check`, `npm run lint`, `npm run typecheck` e `npm test` e corrigir até passarem, cada um em menos de 1 minuto (SC-002). Conferir à mão os cenários 3 e 4 da história 1 (erro de tipo proposital; renomear `database` em `packages/shared/src/health.ts` quebra `api` e `web`) e que `const x: any = 1` faz o `lint` falhar; desfazer as mudanças de teste

**Checkpoint**: história 1 completa e testável sozinha (MVP).

---

## Phase 4: User Story 2 - Barrar automaticamente o que quebra a qualidade (Priority: P2)

**Goal**: Todo push roda instalação limpa, formatação, lint, tipos, testes, build e build da imagem.

**Independent Test**: Push correto fica verde; push com teste, lint ou tipo quebrado fica vermelho no passo certo; lockfile desatualizado falha no `npm ci` (quickstart, história 2).

### Implementation for User Story 2

- [X] T027 [P] [US2] Criar `apps/api/tsdown.config.ts`: entrada `src/server.ts`, `platform: 'node'`, formato `esm`, saída em `dist/`, `deps.alwaysBundle: ['@cruzadinha/shared']`, as demais dependências externas (research.md, item 3) e `fixedExtension: true`, para a saída ser sempre `dist/server.mjs` (confirmar o nome da opção no Context7 antes de escrever). Conferir que `npm run build -w @cruzadinha/api` gera `apps/api/dist/server.mjs` e que `node apps/api/dist/server.mjs` sem `DATABASE_URL` falha com a mensagem de configuração
- [X] T028 [P] [US2] Criar `apps/api/Dockerfile` multi-stage com contexto na raiz (research.md, item 12): estágio `build` em `node:24-alpine` copiando os `package.json`, o `package-lock.json` e o código, com `npm ci --ignore-scripts` e `npm run build -w @cruzadinha/api`; estágio final `node:24-alpine` com `NODE_ENV=production`, `npm ci --omit=dev --ignore-scripts -w @cruzadinha/api` (sem `--ignore-scripts`, o `prepare` chamaria o `husky`, que não existe sem as dev dependencies), cópia de `apps/api/dist`, `USER node`, `EXPOSE 3000` e `CMD ["node", "apps/api/dist/server.mjs"]`. Nenhuma variável de configuração com valor na imagem
- [X] T029 [P] [US2] Criar `.dockerignore` excluindo `node_modules`, `**/node_modules`, `**/dist`, `.git`, `.env`, `.env.*` (mantendo `!.env.example`), `specs/`, `.specify/` e `.claude/`
- [X] T030 [US2] Criar `.github/workflows/ci.yml` (contrato `contracts/root-scripts.md`, seção CI): gatilhos `push` e `pull_request`; `env: HUSKY: 0`; job `quality` com `timeout-minutes: 10`, `actions/checkout@v7`, `actions/setup-node@v7` (`node-version-file: .nvmrc`, `cache: npm`), `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`; job `image` com `timeout-minutes: 10`, `actions/checkout@v7` e `docker build -f apps/api/Dockerfile .`. Sem segredos no workflow
- [X] T031 [US2] Depois de o autor criar o repositório público no GitHub e o remote: enviar a branch e validar os cenários da história 2 em `specs/002-fundacao/quickstart.md` (verde; vermelho com teste, lint e tipo quebrados via `--no-verify` em commits descartáveis; lockfile desatualizado falhando no `npm ci`), conferindo o tempo de menos de 10 minutos (SC-004). Desfazer os commits de teste

**Checkpoint**: histórias 1 e 2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Corrigir problemas antes de registrar e enviar (Priority: P3)

**Goal**: Pré-commit formata e confere os arquivos alterados; pré-push roda tipos e testes; tudo ativo após a instalação.

**Independent Test**: Commit com arquivo desformatado sai formatado; commit com erro de lint ou `any` é bloqueado; push com teste quebrado é bloqueado; commit só de `.md` termina em menos de 10 segundos (quickstart, história 3).

### Implementation for User Story 3

- [X] T032 [US3] Instalar na raiz `husky` (9.1) e `lint-staged` (17) como dev dependencies e acrescentar `"prepare": "husky"` ao `package.json` da raiz, para os hooks ficarem ativos no `npm install` e no `npm ci` (FR-009)
- [X] T033 [P] [US3] Criar `.lintstagedrc.json` na raiz: `"*.{ts,tsx,js,mjs}": ["eslint --fix", "prettier --write"]` e `"!(*.{ts,tsx,js,mjs})": "prettier --write --ignore-unknown"` (negação com lista para evitar edição simultânea, research.md, item 7)
- [X] T034 [P] [US3] Criar `.husky/pre-commit` com `npx lint-staged` e `.husky/pre-push` com `npm run typecheck && npm test`
- [X] T035 [US3] Validar os quatro cenários da história 3 em `specs/002-fundacao/quickstart.md`, inclusive o bloqueio de `const x: any = 1`, e medir que um commit típico termina em menos de 10 segundos (SC-005). Desfazer os commits de teste

**Checkpoint**: histórias 1, 2 e 3 funcionam de forma independente.

---

## Phase 6: User Story 4 - Subir o ambiente local com um comando (Priority: P4)

**Goal**: `docker compose up -d` sobe banco e servidor; o site em desenvolvimento mostra o estado dos dois pelo mesmo endereço.

**Independent Test**: Saúde `up` com o Compose no ar; página mínima mostra servidor e banco disponíveis; `docker compose stop db` faz a saúde e a página mostrarem o banco `down`; servidor sem `DATABASE_URL` não sobe (quickstart, história 4).

### Implementation for User Story 4

- [X] T036 [P] [US4] Criar `.env.example` na raiz com todas as variáveis de `contracts/server-config.md` e valores fictícios: `DATABASE_URL=postgres://cruzadinha:cruzadinha@localhost:5432/cruzadinha`, `PORT=3000`, `HOST=0.0.0.0`, `NODE_ENV=development`, `LOG_LEVEL=info`, `DB_PORT=5432`, `API_PORT=3000`, `API_PROXY_TARGET=http://localhost:3000`
- [X] T037 [US4] Criar `docker-compose.yml` na raiz (consultar a sintaxe atual no Context7): serviço `db` com `postgres:17-alpine`, usuário, senha e banco fictícios `cruzadinha`, porta `${DB_PORT:-5432}:5432`, volume nomeado e `healthcheck` com `pg_isready`; serviço `api` com `build` (`context: .`, `dockerfile: apps/api/Dockerfile`), `DATABASE_URL` apontando para o host `db`, porta `${API_PORT:-3000}:3000` e `depends_on` com `condition: service_healthy`
- [X] T038 [US4] Validar os quatro cenários da história 4 em `specs/002-fundacao/quickstart.md`, medindo que a saúde fica `up` em menos de 2 minutos depois do `docker compose up -d` com as imagens já baixadas (SC-006). Conferir também as mensagens de porta ocupada e de Docker ausente (edge cases da spec)

**Checkpoint**: as quatro histórias funcionam de forma independente.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T039 Atualizar `CLAUDE.md` (FR-017): trocar a seção "Current state" pela situação nova; acrescentar a estrutura do monorepo (`apps/api`, `apps/web`, `packages/shared`) e os comandos de `contracts/root-scripts.md`, inclusive teste único (`npx vitest run <arquivo>` dentro do workspace), ambiente local e pré-requisitos (Node 24, Docker)
- [X] T040 Num clone limpo (`git clone` local para uma pasta temporária), seguir só o `CLAUDE.md` e confirmar que o autor fica pronto em no máximo 3 comandos e menos de 10 minutos (SC-001)
- [X] T041 Procurar segredos no repositório e no histórico (`specs/002-fundacao/quickstart.md`, seção Segredos) e confirmar que só aparecem os valores fictícios (SC-007)
- [X] T042 Rodar toda a validação de `specs/002-fundacao/quickstart.md` de ponta a ponta e marcar o checklist da feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup e bloqueia todas as histórias; T008 exige Node 24
- **US1 (Phase 3)**: depende da Fundação; é o MVP
- **US2 (Phase 4)**: depende da Fundação; o job `quality` só fica verde com a US1 pronta; T031 exige o repositório no GitHub
- **US3 (Phase 5)**: depende da Fundação; o pré-push só tem testes para rodar com a US1 pronta
- **US4 (Phase 6)**: depende da US1 (servidor e página) e de T028 (Dockerfile, US2); exige Docker
- **Polish (Phase 7)**: depende das histórias desejadas

### Within Each Story

- Testes antes da implementação, e devem falhar primeiro
- `shared` (T018) antes de `api` e `web`, que o importam
- Configuração e sonda (T019, T020) antes do serviço (T021), do app (T022) e da entrada (T023)

### Parallel Opportunities

- Setup: T002 a T006 em paralelo, depois de T001
- Fundação: T009 e T010 em paralelo, depois de T007 e T008
- US1: T013 a T017 em paralelo; T019, T020 e T024 em paralelo depois de T018
- US2: T027, T028 e T029 em paralelo
- US3: T033 e T034 em paralelo depois de T032

---

## Parallel Example: User Story 1

```text
Task: "Criar packages/shared/src/health.test.ts"                (T013)
Task: "Criar apps/api/src/config.test.ts"                       (T014)
Task: "Criar apps/api/src/modules/health/health.service.test.ts" (T015)
Task: "Criar apps/api/src/app.test.ts"                          (T016)
Task: "Criar apps/web/src/app/App.test.tsx"                     (T017)

Task: "Criar apps/api/src/config.ts"                            (T019)
Task: "Criar apps/api/src/db/probe.ts"                          (T020)
Task: "Criar apps/web/vite.config.ts"                           (T024)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Concluir Setup (Phase 1) e Fundação (Phase 2)
2. Concluir a história 1 (Phase 3)
3. **Parar e validar**: comandos da raiz passam, e o tipo compartilhado quebra as duas partes quando muda

### Incremental Delivery

1. Fundação pronta
2. US1: comandos de qualidade e código mínimo (MVP)
3. US2: CI no GitHub (precisa do repositório público)
4. US3: hooks locais
5. US4: ambiente local com Docker
6. Polish: `CLAUDE.md` e validação final

---

## Notes

- Commits em `feat/002-fundacao`, por exemplo `build: add npm workspaces and shared tooling`, `feat(shared): add health status schema`, `feat(api): add health check route`, `feat(web): add minimal status page`, `ci: add quality and image workflow`.
- Nenhum teste automático acessa rede, banco ou navegador.
- O Sync Impact Report no topo de `.specify/memory/constitution.md` (v1.4.0) deve ser removido antes do commit da emenda; isso não faz parte desta feature.

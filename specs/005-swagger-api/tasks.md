---

description: "Task list for feature 005: documentação interativa da API (Swagger)"
---

# Tasks: Documentação interativa da API (Swagger)

**Input**: Design documents from `/specs/005-swagger-api/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-docs.md, quickstart.md

**Tests**: Pedidos pela spec (FR-012, FR-013, SC-001, SC-003, SC-005, SC-006). Todos são unitários (Vitest, `app.inject()`, banco que nunca conecta, sem rede). Escreva cada teste antes da implementação correspondente e confira que ele falha.

**Organization**: Tarefas agrupadas por história de usuário. Só `apps/api` muda, além de uma linha no `CLAUDE.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: História da spec (US1 a US4)
- Caminhos relativos à raiz do repositório

## Referências fixas para todas as tarefas

- Versões (research.md): `@fastify/swagger` `9.9`, `@fastify/swagger-ui` `6.1`, `fastify-plugin` `6.0` (dependencies), `@apidevtools/swagger-parser` `13.1` (devDependencies). O `apps/api/package.json` fixa versões no formato `"major.minor"` (ex.: `"fastify": "5.12"`); siga o mesmo formato.
- Prefixo: `/api/docs` (página em `/api/docs/`, documento em `/api/docs/json` e `/api/docs/yaml`).
- OpenAPI `3.1.0`, sem `servers`, sem `$ref` externo.
- Exemplos só com valores fictícios: `ana@example.com`, `senha-de-exemplo`, `ABCD-EFGH-JKMN-PQRS`. Nunca `dev@cruzadinha.local` nem `senha-de-teste-123` (valores do `.env.example`).
- Códigos e mensagens de erro: `specs/004-banco-auth-convites/contracts/http-api.md` e `apps/api/src/http/errors.ts`. Esta feature não muda nenhum status, corpo, cabeçalho, cookie nem ordem de verificação.

---

## Phase 1: Setup

**Purpose**: Dependências e conferência da documentação das bibliotecas

- [X] T001 Consultar o Context7 sobre `@fastify/swagger`, `@fastify/swagger-ui`, `z.toJSONSchema` do Zod 4 e os compiladores do Fastify 5, registrando as divergências em `specs/005-swagger-api/research.md` ("Conferência no Context7"). Feito em 2026-10-13. Na implementação, consultar de novo o Context7 para qualquer API não coberta lá (constitution, Fluxo de Desenvolvimento)
- [X] T002 Adicionar `@fastify/swagger` `9.9`, `@fastify/swagger-ui` `6.1` e `fastify-plugin` `6.0` (hoje só transitiva; usada direto em T006) em `dependencies` e `@apidevtools/swagger-parser` `13.1` em `devDependencies` de `apps/api/package.json`, e adicionar `"version": "0.0.0"` logo após `"name"` nesse arquivo (hoje ele não tem `version`, e o `info.version` do OpenAPI é obrigatório), rodando `npm install -w @cruzadinha/api` na raiz para atualizar `package-lock.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Compiladores neutros, helper de schema e plugin de documentação (só fora de produção). Todas as histórias dependem disto.

**⚠️ CRITICAL**: Nenhuma história começa antes desta fase.

- [X] T003 Em `apps/api/src/app.ts`, dentro de `buildApp`, logo após criar a instância, trocar os compiladores: `app.setValidatorCompiler(() => (data) => ({ value: data }))` e `app.setSerializerCompiler(() => (data) => JSON.stringify(data))`, com um comentário curto explicando que os `schema` das rotas só documentam e a validação continua nos `safeParse` (research R3). Rodar `npm test -w @cruzadinha/api` e confirmar que os testes existentes passam
- [X] T004 [P] Criar `apps/api/src/docs/doc-schema.ts` com:
  - `toDocSchema(schema: z.ZodType)`: `z.toJSONSchema(schema, { io: 'output' })` sem a chave `$schema`, retornando um objeto tipado sem `any` (research R3, R4);
  - `withFieldDescription(schema, field, description)`: devolve uma cópia do JSON Schema de objeto com `description` em `properties[field]`, sem mudar mais nada (usado no `email`, research R4);
  - `errorResponse(description: string)`: `{ description, ...toDocSchema(apiErrorSchema) }`;
  - `retryAfterHeader` (cabeçalho `Retry-After`, inteiro em segundos) e `setCookieHeader(description)` (cabeçalho `Set-Cookie`, string);
  - `commonErrors`: respostas 503 (`service-unavailable`) e 500 (`internal-error`) reutilizáveis, com `description` em português
- [X] T005 [P] Criar `apps/api/src/docs/doc-schema.test.ts`: `toDocSchema(emailSchema)` traz `format: 'email'` e `maxLength: 254` e não tem `$schema`; `toDocSchema(passwordSchema)` traz `minLength: 8` e `maxLength: 128`; `errorResponse('x')` tem `required` com `error` e `message`; `withFieldDescription` acrescenta a `description` só no campo pedido e não altera o objeto recebido
- [X] T006 Criar `apps/api/src/docs/docs.plugin.ts` com `export default fp(async (app) => { ... })` (`fastify-plugin`). O `fp` é obrigatório: sem ele, o plugin fica encapsulado e o hook `onRoute` do `@fastify/swagger` não vê as rotas registradas como irmãs em `buildApp`. O plugin registra `@fastify/swagger` com `openapi: { openapi: '3.1.0', info: { title: 'Cruzadinha API', version: <campo version de apps/api/package.json (adicionado em T002), lido na subida e validado com Zod como string não vazia; o plugin não o lê sozinho quando `info` é passado>, description: <uso privado, sessão por cookie, limites de tentativas valem para a página> }, tags: [health, auth, invites com descrição em português] }` e sem `servers` (data-model.md, "Descrição da API")
- [X] T007 Em `apps/api/src/app.ts`, registrar o plugin de documentação com `app.register(import('./docs/docs.plugin'))` só quando `config.nodeEnv !== 'production'`, ANTES de `app.register(healthRoutes, ...)`, `authRoutes` e `invitesRoutes` (research R6, R7). Não criar variável de configuração para ligar a documentação (clarificação da spec)
- [X] T008 Criar `apps/api/src/docs/docs.test.ts` seguindo o padrão de `apps/api/src/app.test.ts` (`loadConfig` com `LOG_LEVEL: 'fatal'`, `createDatabase` que nunca conecta, `probe` falso, `app.close()` no `afterEach`, `testDatabase.close()` no `afterAll`), com o primeiro teste: com `NODE_ENV: 'production'`, `GET /api/docs`, `/api/docs/`, `/api/docs/json` e `/api/docs/yaml` respondem 404 com o mesmo corpo de `GET /api/outra`, e `GET /api/health` continua 200 (FR-009, contracts/api-docs.md)

**Checkpoint**: Testes existentes passam com os compiladores neutros; documentação desligada em produção.

---

## Phase 3: User Story 1 - Consultar e executar as operações pelo navegador (Priority: P1) 🎯 MVP

**Goal**: Página Swagger UI em `/api/docs/` com as 7 operações agrupadas, entradas com limites, exemplos e respostas, executáveis contra a própria API.

**Independent Test**: `npm run dev -w @cruzadinha/api`, abrir `http://localhost:3000/api/docs/`, executar `GET /api/health` e ver o mesmo `200` de uma chamada direta (quickstart.md, seção 2).

### Tests for User Story 1

- [X] T009 [US1] Em `apps/api/src/docs/docs.test.ts`, com a config padrão (`development`) e o banco que nunca conecta (prova o Edge Case "banco fora do ar": a documentação não depende do banco): `GET /api/docs/` responde 200 `text/html`; o HTML e o `GET /api/docs/static/swagger-initializer.js` não referenciam nenhum host externo (sem `http://`/`https://` fora de `localhost`, e `validatorUrl` nulo) (FR-007, FR-011)
- [X] T010 [US1] Em `apps/api/src/docs/docs.test.ts`: depois de `app.ready()`, `app.swagger()` tem em `paths` exatamente as 7 operações do catálogo de data-model.md, cada uma com uma única tag entre `health`, `auth`, `invites`; `POST /api/auth/register` e `POST /api/auth/login` têm `requestBody` com `example` (os limites dos campos são conferidos em T025, contra os schemas Zod); nenhuma rota `/api/docs*` aparece em `paths` (FR-002, FR-005, SC-001, Edge Cases)
- [X] T011 [US1] Em `apps/api/src/docs/docs.test.ts`: o JSON de `app.swagger()` não contém `dev@cruzadinha.local`, `senha-de-teste-123`, `cruzadinha:cruzadinha`, `SEGREDO`; percorrendo os schemas recursivamente, nenhuma resposta tem propriedade `password`, e nenhum schema (corpo ou resposta) tem propriedade `passwordHash`, `hash` ou `tokenHash`. A busca é por nome de propriedade, não por substring, para que um texto como "guardado só como hash" numa `description` não dispare o teste (FR-006, SC-006)

### Implementation for User Story 1

- [X] T012 [US1] Em `apps/api/src/docs/docs.plugin.ts`, registrar `@fastify/swagger-ui` com `routePrefix: '/api/docs'` e `uiConfig: { tryItOutEnabled: true }`, sem `baseDir`. Não definir `validatorUrl` (opção de primeiro nível do plugin, já desligada por padrão; research, "Conferência no Context7")
- [X] T013 [P] [US1] Criar `apps/api/src/modules/health/health.schemas.ts` exportando `healthSchema` (`FastifySchema`): `tags: ['health']`, `summary`, `response: { 200: { description, ...toDocSchema(healthStatusSchema) }, 500: errorResponse(...) }`
- [X] T014 [P] [US1] Criar `apps/api/src/modules/auth/auth.schemas.ts` exportando `registerSchema`, `loginSchema`, `logoutSchema` e `meSchema` (`FastifySchema`) conforme o catálogo de data-model.md:
  - corpo de register = `toDocSchema(registerRequestSchema)` e de login = `toDocSchema(loginRequestSchema)`, cada um com `examples: [...]` fictícios e com a `description` do campo `email` (via `withFieldDescription`) dizendo que espaços nas pontas são removidos e maiúsculas viram minúsculas antes da checagem (research R4);
  - `description` de register dizendo que o limite de tentativas é verificado antes do corpo;
  - register: 201 `authResponseSchema` + `Set-Cookie`; 400 (`invalid-input` com `fields` ou `invalid-invite`); 409 `registration-failed`; 429 + `Retry-After`; 503; 500;
  - login: 200 `authResponseSchema` + `Set-Cookie`; 400 `invalid-input`; 401 `invalid-credentials`; 429 + `Retry-After`; 503; 500;
  - logout: 204 `{ type: 'null' }` + `Set-Cookie` expirado, com `description` de idempotência; 503; 500;
  - me: 200 `authResponseSchema` (+ `Set-Cookie` se a sessão foi renovada); 401 `unauthenticated`; 503; 500
- [X] T015 [P] [US1] Criar `apps/api/src/modules/invites/invites.schemas.ts` exportando `createInviteSchema` (201 `createdInviteSchema` com `description` de que o código aparece só nesta resposta; 401; 409 `invite-quota-reached`; 429 + `Retry-After`; 503; 500) e `listInvitesSchema` (200 `inviteListSchema`; 401; 503; 500), ambos com `tags: ['invites']`
- [X] T016 [US1] Passar os schemas às rotas, sem mudar handlers: `{ schema: healthSchema }` em `apps/api/src/modules/health/health.routes.ts`; `{ schema: registerSchema }`, `{ schema: loginSchema }`, `{ schema: logoutSchema }` e `{ schema: meSchema, preHandler: requireSession }` em `apps/api/src/modules/auth/auth.routes.ts`; `{ schema: createInviteSchema, preHandler: requireSession }` e `{ schema: listInvitesSchema, preHandler: requireSession }` em `apps/api/src/modules/invites/invites.routes.ts`
- [X] T017 [US1] Em `apps/api/src/docs/docs.test.ts`, teste de não regressão com os compiladores neutros: `POST /api/auth/login` com `{ email: 'invalido', password: 'x', extra: 1 }` responde 400 com `error: 'invalid-input'` e `fields` exatamente `['email', 'body']` (valor de hoje, conferido com `loginRequestSchema.safeParse`: `password: 'x'` é válido no login, e a chave extra gera um issue de caminho vazio, que `invalidFields` chama de `'body'`), provando que o `schema.body` não valida antes do handler (FR-010, research R3). Rodar `npm test` e `npm run test:int` e confirmar que tudo passa

**Checkpoint**: Página navegável com as 7 operações; T009 a T011 e T017 passam.

---

## Phase 4: User Story 2 - Testar operações que exigem sessão (Priority: P2)

**Goal**: Operações protegidas marcadas com o esquema de sessão por cookie; login pela página deixa o cookie `sid` valendo para as chamadas seguintes na mesma origem.

**Independent Test**: Quickstart.md, seção 3: login com a conta de seed pela página, depois `me` e convites sem colar cookie; logout e `me` volta a 401. Repetir por `http://localhost:5173/api/docs/`.

### Tests for User Story 2

- [X] T018 [US2] Em `apps/api/src/docs/docs.test.ts`: `components.securitySchemes.session` é `{ type: 'apiKey', in: 'cookie', name: 'sid' }`; `GET /api/auth/me`, `POST /api/invites` e `GET /api/invites` têm `security: [{ session: [] }]` e resposta `401`; as demais 4 operações não têm `security` (FR-004, US2 cenário 3)

### Implementation for User Story 2

- [X] T019 [US2] Em `apps/api/src/docs/docs.plugin.ts`, adicionar `components.securitySchemes.session = { type: 'apiKey', in: 'cookie', name: 'sid', description: <cookie HttpOnly emitido pelo login ou cadastro; o navegador envia sozinho na mesma origem, não é preciso usar Authorize> }` (research R5). Conferir que o nome `sid` é o de `SESSION_COOKIE` em `apps/api/src/modules/auth/session-cookie.ts`
- [X] T020 [US2] Adicionar `security: [{ session: [] }]` a `meSchema` em `apps/api/src/modules/auth/auth.schemas.ts` e a `createInviteSchema` e `listInvitesSchema` em `apps/api/src/modules/invites/invites.schemas.ts`
- [X] T021 [US2] Validação manual (quickstart.md, seção 3), direto em `localhost:3000` e pelo proxy do Vite em `localhost:5173`; anotar o resultado no PR. Se a Swagger UI não reenviar o cookie, ajustar `uiConfig` em `apps/api/src/docs/docs.plugin.ts` (ex.: `withCredentials: true`) e registrar em research.md R5

**Checkpoint**: Fluxo login → me → convites → logout funciona só pela página.

---

## Phase 5: User Story 3 - Descrição da API legível por máquina (Priority: P3)

**Goal**: Documento OpenAPI 3.1.0 válido em `/api/docs/json` e `/api/docs/yaml`.

**Independent Test**: `curl -s localhost:3000/api/docs/json` e importar no Postman/Insomnia (quickstart.md, seção 4).

### Tests for User Story 3

- [X] T022 [US3] Em `apps/api/src/docs/docs.test.ts`: `GET /api/docs/json` responde 200 `application/json` com `openapi: '3.1.0'` e as mesmas `paths` de `app.swagger()`; `GET /api/docs/yaml` responde 200 com corpo começando por `openapi: 3.1.0` (contracts/api-docs.md)
- [X] T023 [US3] Em `apps/api/src/docs/docs.test.ts`: `await SwaggerParser.validate(structuredClone(app.swagger()))` (import de `@apidevtools/swagger-parser`) resolve sem erro; o documento serializado não contém `"$ref":"http` nem `"$ref":"https` (FR-013, SC-003, constitution VII). Se o validador falhar por algum schema gerado, corrigir em `apps/api/src/docs/doc-schema.ts` ou no `*.schemas.ts` correspondente, nunca nos schemas do `shared`

**Checkpoint**: Documento válido e servido em JSON e YAML.

---

## Phase 6: User Story 4 - Documentação que não fica desatualizada (Priority: P4)

**Goal**: A suíte falha se uma rota `/api/*` não tiver documentação, e os limites documentados vêm dos mesmos schemas Zod que a rota usa.

**Independent Test**: Registrar no teste uma rota `/api/x` sem `schema` e ver o verificador acusá-la; o corpo documentado de register é igual a `toDocSchema(registerRequestSchema)`.

### Tests for User Story 4

- [X] T024 [US4] Em `apps/api/src/docs/docs.test.ts`, criar a função `undocumentedRoutes(app)` (no próprio arquivo de teste) que usa um hook `onRoute` registrado antes de `ready()` para coletar as rotas e devolve as `/api/*` fora de `/api/docs` sem `schema.tags`, `schema.summary` ou `schema.response`, ou ausentes de `app.swagger().paths`. Ordem obrigatória: `buildApp(...)` → `app.addHook('onRoute', ...)` → (só no caso b) `app.get('/api/x', handler)` → `await app.ready()`; com o hook adicionado depois da rota extra, ela não seria coletada e o caso (b) passaria sem testar nada. Testes: (a) com `buildApp` puro, a lista é vazia e a coleta encontrou as 7 rotas `/api/*` (confere que o hook rodou); (b) com a rota extra sem schema, a lista é `['GET /api/x']` (FR-012, SC-005). Ignorar `HEAD` gerado automaticamente pelo Fastify
- [X] T025 [US4] Em `apps/api/src/docs/docs.test.ts`: o `requestBody` de `POST /api/auth/register` e de `POST /api/auth/login` em `app.swagger()` contém as mesmas propriedades, `required` e limites de `toDocSchema(registerRequestSchema)` e `toDocSchema(loginRequestSchema)`; as respostas 200/201 de `me`, `POST /api/invites` e `GET /api/invites` correspondem a `toDocSchema(authResponseSchema)`, `toDocSchema(createdInviteSchema)` e `toDocSchema(inviteListSchema)` (FR-003, SC-004). Também: o `example` documentado de register passa em `registerRequestSchema.safeParse` e o de login em `loginRequestSchema.safeParse` (SC-004: uma requisição montada conforme a descrição nunca é recusada por formato; FR-005). Comparar ignorando `description` e `examples` adicionados pela camada de documentação, e tratando `const: x` como igual a `enum: [x]` (o `@fastify/swagger` converte `const` em `enum` por padrão; research, "Conferência no Context7")

### Implementation for User Story 4

- [X] T026 [US4] Se T024 ou T025 falharem, ajustar `apps/api/src/docs/doc-schema.ts` ou os `*.schemas.ts` até passarem, sem cópia manual de limites. Confirmar que nenhum `*.schemas.ts` escreve à mão `minLength`, `maxLength`, `format` ou `pattern` de campos que já existem nos schemas do `shared`

**Checkpoint**: Rota nova sem documentação quebra a suíte.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T027 [P] Em `CLAUDE.md`, seção Commands, adicionar uma linha: com `npm run dev -w @cruzadinha/api`, a página fica em `http://localhost:3000/api/docs/` e o documento em `/api/docs/json` e `/api/docs/yaml`; desligada em produção (inclusive na API do `docker compose`) (FR-014). Na seção Architecture, mencionar `src/docs/` e os arquivos `<módulo>.schemas.ts`, e que toda rota `/api/*` nova precisa de `schema` (verificado por teste)
- [X] T028 [P] Conferir que `npm run build -w @cruzadinha/api` gera `dist/server.mjs` com `@fastify/swagger` e `@fastify/swagger-ui` externos (não embutidos) e que `docker build -f apps/api/Dockerfile .` passa (research R10)
- [X] T029 Rodar na raiz `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npm run test:int`, e corrigir qualquer falha
- [X] T030 Validação manual completa de quickstart.md (seções 2 a 5), incluindo o 404 em produção com `docker compose up -d --build`, o percurso de SC-002 em menos de 3 minutos e a meta do plano de página e documento carregando em menos de 1 s localmente (aba Network do navegador)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende de T002. T003 e T004/T005 são independentes entre si (T005 escrito antes de T004); T006 depende de T002; T007 depende de T006. T008 é um teste de guarda: passa antes e depois de T007 e precisa continuar passando depois dele
- **US1 (Phase 3)**: depende da fase 2. Os testes T009 a T011 e T017 são escritos primeiro e falham; T012 faz T009 passar; T013 a T015 dependem de T004; T016 depende de T013 a T015 e faz T010, T011 e T017 passarem
- **US2 (Phase 4)**: depende de US1 (os `*.schemas.ts` existem)
- **US3 (Phase 5)**: depende de US1 (documento com as 7 operações); independe de US2, mas T023 é mais completo depois de T019
- **US4 (Phase 6)**: depende de US1
- **Polish (Phase 7)**: depois das histórias desejadas

### Within Each User Story

- Testes escritos e falhando antes da implementação. Exceções: T008 (guarda, já passa) e T017 (não regressão: passa antes de T016 e precisa continuar passando depois)
- `apps/api/src/docs/docs.test.ts` é um arquivo só: as tarefas de teste nele são sequenciais (sem [P])

### Parallel Opportunities

- T004 e T005 em paralelo com T003
- T013, T014 e T015 em paralelo (arquivos diferentes)
- Depois de US1: US3 e US4 podem andar em paralelo com US2, coordenando as edições em `docs.test.ts`
- T027 e T028 em paralelo

---

## Parallel Example: User Story 1

```text
Task: "T013 [P] [US1] Criar apps/api/src/modules/health/health.schemas.ts"
Task: "T014 [P] [US1] Criar apps/api/src/modules/auth/auth.schemas.ts"
Task: "T015 [P] [US1] Criar apps/api/src/modules/invites/invites.schemas.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fase 1 e Fase 2 (compiladores neutros, helper, plugin desligado em produção)
2. Fase 3 (página + schemas das 7 rotas)
3. **PARAR e VALIDAR**: quickstart.md, seção 2; `npm test` e `npm run test:int` verdes

### Incremental Delivery

1. US1 → página utilizável para rotas públicas
2. US2 → sessão documentada e testada pela página
3. US3 → documento validado para ferramentas externas
4. US4 → garantia de cobertura para as próximas features
5. Polish → `CLAUDE.md`, build, imagem e checagens completas

---

## Notes

- Nenhum `any` (constitution I); schemas de rota tipados como `FastifySchema`
- Nenhuma mudança em `packages/shared` nem em `apps/web`
- Commits em inglês, Conventional Commits, escopo `api` (ex.: `feat(api): add openapi docs plugin`), sem linha de atribuição de IA

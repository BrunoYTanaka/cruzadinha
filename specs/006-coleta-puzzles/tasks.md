---

description: "Task list for feature 006: coleta e cache de puzzles"
---

# Tasks: Coleta e cache de puzzles

**Input**: Design documents from `/specs/006-coleta-puzzles/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-api.md, contracts/collect-command.md, quickstart.md

**Tests**: Pedidos pela constituição (VII: autenticação e dados com Postgres real; fonte sempre falsa) e pelos critérios SC-001 a SC-006. Escreva cada teste antes da implementação correspondente e confira que ele falha. Unitários rodam com `npm test`; os que usam banco são `*.int.test.ts` (`npm run test:int`, precisa de Docker). Nenhum teste chama a fonte real.

**Organization**: Tarefas agrupadas por história de usuário. Muda `apps/api` e `packages/shared`, mais o workflow, `CLAUDE.md` e a documentação desta feature.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: História da spec (US1 a US4)
- Caminhos relativos à raiz do repositório

## Referências fixas para todas as tarefas

- Nenhuma dependência nova. Versões em uso: Fastify `5.12`, Drizzle ORM `0.45`, drizzle-kit `0.31`, postgres.js `3.4`, Zod `4.6`. Consultar o Context7 (constituição, Fluxo de Desenvolvimento) para qualquer API não coberta em `research.md`.
- Padrão de módulo: `apps/api/src/modules/invites/` (rota → serviço → repositório; repositório com funções que recebem `Executor`; serviço `createXService({ db, clock, ... })` devolvendo união discriminada; rota `FastifyPluginAsync` com `preHandler: requireSession` e `if (!request.user) return sendError(reply, 401, 'unauthenticated')`).
- Validação nas rotas por `safeParse` (os `schema` do Fastify só documentam, feature 005). Dados externos (`jsonb`, fonte) entram como `unknown` e passam pelo Zod. Nunca escrever `any`.
- Erros HTTP: `apps/api/src/http/errors.ts` (`sendError`, `sendTooManyAttempts`).
- Textos de saída e mensagens em português. Commits em inglês, Conventional Commits, sem `Co-Authored-By` nem atribuição de IA (CLAUDE.md).
- Segredos: nada de `.env` real, `DATABASE_URL`, token da fonte ou conteúdo bruto da fonte em código, logs, fixtures ou saída (constituição VI).

---

## Phase 1: Setup

**Purpose**: Conferir o ponto de partida

- [X] T001 Confirmar que a branch `feat/006-coleta-puzzles` está ativa e que `npm ci`, `npm run lint`, `npm run typecheck` e `npm test` passam antes de qualquer mudança (linha de base); nenhuma dependência é adicionada

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contratos compartilhados, tabela, migração, repositório e fiação da fonte. Todas as histórias dependem disto.

**⚠️ CRITICAL**: Nenhuma história começa antes desta fase.

- [X] T002 [P] Criar `packages/shared/src/puzzle/response.ts` com `puzzleResponseSchema = z.strictObject({ puzzleId: z.uuid(), puzzle: puzzleSchema })` e o tipo `PuzzleResponse`; exportar ambos em `packages/shared/src/index.ts`. O objeto não pode ter campo de solução (data-model.md, "Contrato compartilhado")
- [X] T003 [P] Criar `packages/shared/src/puzzle/response.test.ts`: aceita `{ puzzleId, puzzle }` válido (reusar um puzzle válido do `schema.test.ts`); recusa `puzzleId` que não é uuid; recusa campo extra como `solution` (strictObject)
- [X] T004 [P] Em `packages/shared/src/api-error.ts`, acrescentar `'puzzle-unavailable'` e `'puzzle-source-failed'` ao `apiErrorCodeSchema`; em `apps/api/src/http/errors.ts`, acrescentar as mensagens em `errorMessages` (genéricas, sem detalhe da fonte): `'puzzle-unavailable': 'Puzzle indisponível.'` e `'puzzle-source-failed': 'Não foi possível buscar o puzzle agora, tente mais tarde.'`. O `Record<ApiErrorCode, string>` obriga a completar
- [X] T005 [P] Criar `apps/api/src/lib/dates.ts` com `todayInSaoPaulo(clock: Clock): string` (`Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })`, formato `AAAA-MM-DD`) e `addDaysToIsoDate(date: string, days: number): string` (aritmética de calendário em UTC sobre a string, sem fuso) e `candidateDates(today: string, historyDays: number): string[]` (hoje e os `historyDays` dias anteriores, em ordem decrescente; usada pela coleta). Criar `apps/api/src/lib/dates.test.ts`: 2026-10-14T01:30:00Z vira `2026-10-13` (ainda é dia 13 em Brasília); 2026-10-13T12:00:00Z vira `2026-10-13`; `addDaysToIsoDate('2026-03-01', -1)` é `2026-02-28`; virada de ano; `candidateDates('2026-10-13', 0)` é só `['2026-10-13']`, `candidateDates('2026-10-13', 2)` é `['2026-10-13', '2026-10-12', '2026-10-11']`, e com 31 dias cruza o mês sem repetir data. Em `apps/api/src/sources/oglobo/check.ts`, trocar o `today()` privado por `todayInSaoPaulo(systemClock)`
- [X] T006 Em `apps/api/src/db/schema.ts`, acrescentar a tabela `puzzles`, mantendo o estilo das outras (`uuid('puzzle_id').primaryKey().defaultRandom()`, `...timestamps`):
  - `source: text('source', { enum: ['oglobo'] as const }).notNull()` e `check('puzzles_source_check', sql\`... IN ('oglobo')\`)`;
  - `level: text('level', { enum: ['daily'] as const }).notNull()` e `check('puzzles_level_check', sql\`... IN ('daily')\`)`;
  - `date: date('date', { mode: 'string' }).notNull()`;
  - `data: jsonb('data').$type<Puzzle>().notNull()` e `solution: jsonb('solution').$type<Solution>().notNull()` (tipos de `@cruzadinha/shared`; `$type` só vale em compilação, research R1/R3);
  - `uniqueIndex('puzzles_source_level_date_unique').on(table.source, table.level, table.date)`.
  Acrescentar `'PUZZLE_FETCH'` a `rateLimitActions` e ao `check` `rate_limit_attempts_action_check` (`IN ('LOGIN', 'REGISTER', 'INVITE_CREATE', 'PUZZLE_FETCH')`)
- [X] T007 Gerar a migração com `npm run db:generate -w @cruzadinha/api -- --name puzzles` (nunca `drizzle-kit push`), conferir que `apps/api/drizzle/0002_puzzles.sql` cria a tabela, o índice único e os checks e que recria `rate_limit_attempts_action_check`, e acrescentar à mão, com `--> statement-breakpoint` entre as instruções, `CREATE TRIGGER puzzles_set_updated_at BEFORE UPDATE ON puzzles FOR EACH ROW EXECUTE FUNCTION set_updated_at();` (padrão da `0001_updated_at_triggers.sql`). Não editar migrações antigas
- [X] T008 Em `apps/api/src/test/conventions.int.test.ts`: a lista de tabelas passa a ser `['invites', 'puzzles', 'rate_limit_attempts', 'sessions', 'users']` e a contagem de migrações aplicadas de 2 para 3 (`expect(before).toBe(3)`); confirmar que o teste de convenção cobre `created_at`/`updated_at` e o trigger `puzzles_set_updated_at` da nova tabela
- [X] T009 [P] Em `apps/api/src/modules/rate-limit/limits.ts`, acrescentar `puzzleFetch: RateWindow` a `RateLimits` e `puzzleFetch: { max: 30, windowMinutes: 60 }` a `defaultRateLimits` (research R6). Ajustar os pontos que constroem `RateLimits` por inteiro (procurar por `inviteCreate:` em `apps/api/src`) para incluir o campo novo
- [X] T010 Criar `apps/api/src/modules/puzzles/puzzles.repository.ts` com funções que recebem `Executor` (`import type { Executor } from '../../db/client'`):
  - `findPuzzle(db, { source, level, date })` e `findPuzzleById(db, puzzleId)`: devolvem `{ puzzleId, puzzle, solution } | undefined`, relendo `data` com `puzzleSchema.safeParse` e `solution` com `solutionSchema.safeParse`; se falhar, lançar `Error('puzzle guardado inválido')` sem incluir o conteúdo (research R3);
  - `insertPuzzleIfAbsent(db, { puzzle, solution })`: `insert(puzzles).values({ source: puzzle.source, level: puzzle.level, date: puzzle.date, data: puzzle, solution }).onConflictDoNothing({ target: [puzzles.source, puzzles.level, puzzles.date] }).returning({ puzzleId })`; se voltar vazio, ler a linha existente e devolver `{ puzzleId, inserted: false }`, senão `inserted: true` (research R2);
  - `existingDates(db, { source, level, dates })`: devolve o `Set<string>` das datas já guardadas (`inArray`).
  `source` e `level` vêm dos tipos `PuzzleSourceId` e `Level`
- [X] T011 Criar `apps/api/src/test/puzzles-repository.int.test.ts` (Postgres real; padrão de `invites.int.test.ts`: `openTestDatabase`, `truncateAll` no `beforeEach`): grava e relê um puzzle (usar a fixture `apps/api/src/sources/oglobo/fixtures/daily-valid.json` convertida por `convertAgilmenteResponse`); segunda gravação da mesma data devolve `inserted: false` e mantém uma só linha; duas gravações concorrentes (`Promise.all`) deixam uma linha e ambas devolvem o mesmo `puzzleId`; `existingDates` devolve só as datas presentes; linha com `data` corrompido (inserida direto) faz `findPuzzle` lançar
- [X] T012 [P] Criar `apps/api/src/test/fake-source.ts` com `fakeSource(responses)`: um `PuzzleSource` (`id: 'oglobo'`) que devolve resultados por data (`Map<string, FetchPuzzleResult>`), conta as chamadas (`calls: string[]`) e, para data fora do mapa, devolve `{ ok: false, reason: 'unavailable' }` (e a registra em `calls`), em vez de lançar erro: assim os testes que mapeiam só hoje continuam válidos quando a coleta passa a pedir a janela de histórico (T027); helper `okResult(date)` que monta um `FetchPuzzleSuccess` a partir da fixture `daily-valid.json` com a data pedida (via `convertAgilmenteResponse(body, 'daily', date)`)
- [X] T013 Em `apps/api/src/app.ts`, acrescentar `puzzleSource?: PuzzleSource` a `AppDeps` (padrão `createOgloboSource()` importado de `./sources/oglobo/oglobo`); em `apps/api/src/test/app.ts`, aceitar `puzzleSource` e `rateLimits` em `buildTestApp` e repassar a `buildApp`. Nenhum comportamento muda ainda; `npm test` continua verde

**Checkpoint**: tabela migrada, repositório testado, contratos compartilhados prontos; `npm run lint && npm run typecheck && npm test && npm run test:int` verdes.

---

## Phase 3: User Story 1 - Abrir o puzzle de uma data (Priority: P1) 🎯 MVP

**Goal**: Jogador logado pede o puzzle de uma data e recebe do banco; se faltar, o sistema busca na fonte, grava e devolve; a solução nunca sai do servidor.

**Independent Test**: Banco vazio e fonte falsa; `GET /api/puzzles?date=...` com sessão devolve o puzzle e o grava; a segunda chamada não consulta a fonte; sem sessão, 401 sem consultar a fonte.

### Tests for User Story 1 (escrever primeiro e ver falhar)

- [X] T014 [US1] Criar `apps/api/src/test/puzzles.int.test.ts` (Postgres real, `buildTestApp` com `puzzleSource: fakeSource(...)`, relógio de `testClock()`; autenticar como em `invites.int.test.ts`, helper `account()`), cobrindo o contrato `contracts/http-api.md`:
  - 401 `unauthenticated` sem cookie e a fonte não é chamada (SC-005);
  - 200 com `{ puzzleId, puzzle }` para puzzle já gravado, `source.calls` vazio (FR-004, SC-001); o corpo não contém a chave `solution` nem nenhuma letra da solução da fixture (percorrer o JSON; SC-004, FR-002) e tem `puzzle.attribution` (FR-017);
  - 200 para data ausente com fonte ok: grava (uma linha) e a segunda chamada não chama a fonte;
  - `level` omitido vale `daily`; `level=weekly` e `date=2026-13-40` ou ausente dão 400 `invalid-input` com `fields`, sem chamar a fonte;
  - data futura (depois de `todayInSaoPaulo(clock)`) dá 404 `puzzle-unavailable` sem chamar a fonte;
  - fonte `unavailable` dá 404 `puzzle-unavailable` e nada é gravado;
  - fonte que devolve puzzle e solução inconsistentes (`okResult` com uma letra da solução trocada por outra que quebra a regra, ou grade e solução de tamanhos diferentes) dá 502 `puzzle-source-failed` e nada é gravado (FR-006);
  - fonte `source-down`, `refused`, `unexpected-format` e `rate-limited` dão 502 `puzzle-source-failed`, sem vazar `detail` no corpo, e um puzzle já gravado continua sendo servido (FR-016, SC-006);
  - com `rateLimits.puzzleFetch = { max: 2, windowMinutes: 60 }`, a terceira data ausente pedida dá 429 `too-many-attempts` com `Retry-After`; pedir data já gravada não consome o limite (R6);
  - duas requisições simultâneas da mesma data ausente (`Promise.all`) devolvem 200 com o mesmo `puzzleId` e deixam uma linha;
  - `GET /api/puzzles/:id` devolve 200 para id existente, 404 `puzzle-unavailable` para uuid inexistente e para `id` que não é uuid, 401 sem sessão, e nunca chama a fonte

### Implementation for User Story 1

- [X] T015 [US1] Criar `apps/api/src/modules/puzzles/puzzles.service.ts` com `createPuzzlesService({ db, clock, source, rateLimits })` e o tipo `PuzzlesService`:
  - `getByDate(level, date, address)`: (1) `findPuzzle`; achou → `{ ok: true, puzzleId, puzzle }`; (2) `date > todayInSaoPaulo(clock)` → `{ ok: false, reason: 'unavailable' }`; (3) `createRateLimiter(createRateLimitRepository(db)).check([{ key: { action: 'PUZZLE_FETCH', keyType: 'NETWORK_ADDRESS', keyValue: address }, window: rateLimits.puzzleFetch }], clock())`; negado → `{ ok: false, reason: 'too-many-attempts', retryAfterSeconds }`; (4) `record` da tentativa e `source.fetchPuzzle(level, date)`; (5) sucesso da fonte: revalidar com `validatePuzzleWithSolution(puzzle, solution)` antes de gravar (defesa em profundidade; FR-006); se falhar, não gravar, registrar só o motivo curto e responder `source-failed`; `ok: false` da fonte: `unavailable` → `reason: 'unavailable'`; `rate-limited`, `source-down`, `refused`, `unexpected-format`, `unsupported` → `reason: 'source-failed'`; (6) `insertPuzzleIfAbsent` e devolver o `puzzleId` (da linha existente se `inserted: false`). Registrar falhas com log curto sem token nem corpo (use `describeError`/mensagem fixa, nunca o `detail` bruto no log de produção)
  - `getById(puzzleId)`: só `findPuzzleById`, nunca a fonte; `{ ok: false, reason: 'unavailable' }` se ausente
  - O serviço não conhece HTTP (constituição III) e nunca devolve `solution` nas funções de leitura da API (devolve só `puzzle`)
- [X] T016 [P] [US1] Criar `apps/api/src/modules/puzzles/puzzles.schemas.ts` com os `schema` de documentação `getPuzzleByDateSchema` e `getPuzzleByIdSchema` (`satisfies FastifySchema`, tag `puzzles`, `security: [{ session: [] }]`, resumo e descrição em português, `querystring`/`params`, respostas 200 com `toDocSchema(puzzleResponseSchema)`, 400, 401, 404, 429 com `retryAfterHeader`, 502 via `errorResponse`, e `commonErrors`), conforme `contracts/http-api.md`. Exemplo de `date` fictício (`2026-10-13`)
- [X] T017 [US1] Criar `apps/api/src/modules/puzzles/puzzles.routes.ts` (`puzzlesRoutes: FastifyPluginAsync<{ puzzles: PuzzlesService; requireSession: RequireSession }>`) com `GET /api/puzzles` e `GET /api/puzzles/:id`, ambas com `preHandler: requireSession`. A ordem na primeira é: sessão → `safeParse` de `{ level (padrão 'daily'), date }` com `levelSchema` e `isoDateSchema` (400 `invalid-input` com os nomes em `fields`) → serviço. Mapear: `unavailable` → 404 `puzzle-unavailable`; `source-failed` → 502 `puzzle-source-failed`; `too-many-attempts` → `sendTooManyAttempts`. A segunda valida `id` com `z.uuid()`; inválido ou ausente → 404 `puzzle-unavailable`. Chamar `puzzles.getByDate(level, date, request.ip)` (o endereço alimenta o limite de buscas, T015). Corpo tipado como `PuzzleResponse`
- [X] T018 [US1] Em `apps/api/src/app.ts`, criar `createPuzzlesService({ db: database, clock, source: puzzleSource, rateLimits })` e `app.register(puzzlesRoutes, { puzzles, requireSession })` junto das outras rotas
- [X] T019 [US1] Em `apps/api/src/docs/docs.test.ts`, acrescentar `GET /api/puzzles` e `GET /api/puzzles/{id}` ao `catalog`, `'puzzles'` à lista de tags aceitas, e a tag `puzzles` (descrição em português) à lista de tags de `apps/api/src/docs/docs.plugin.ts`; conferir que o teste de cobertura das rotas passa e que o documento não contém `solution`

**Checkpoint**: US1 funcional e testável sozinha (`npm test`, `npm run test:int`).

---

## Phase 4: User Story 2 - Puzzle do dia guardado automaticamente (Priority: P2)

**Goal**: Comando `puzzles collect` e workflow agendado guardam o puzzle do dia, de forma idempotente.

**Independent Test**: Banco vazio e fonte falsa; `runCli(['puzzles', 'collect'])` grava o puzzle de hoje; rodar de novo não chama a fonte e sai com 0.

### Tests for User Story 2 (escrever primeiro e ver falhar)

- [X] T020 [US2] Criar `apps/api/src/test/collect.int.test.ts` (Postgres real, `fakeSource`) testando `service.collect()` criado com `historyDays: 0` (só o dia de hoje; sem isso, as datas anteriores não mapeadas virariam `unavailable` e as chamadas à fonte passariam de uma): grava hoje e devolve `CollectReport` com `saved: [hoje]`; segunda chamada tem `skipped: [hoje]`, `source.calls` vazio e uma só linha (FR-008, FR-009, SC-003); fonte `source-down` dá `failed: [{ date: hoje, reason: 'source-down' }]` sem apagar o que existia (FR-012, FR-016); fonte `unavailable` vai para `unavailable`, não para `failed`; puzzle inconsistente da fonte vai para `failed` com `reason: 'unexpected-format'` e não é gravado (FR-006)
- [X] T021 [US2] Em `apps/api/src/test/cli.int.test.ts`, acrescentar (o helper `cli(...)` passa a receber a fonte falsa e `historyDays: 0`): `puzzles collect` com fonte ok imprime `Coleta de puzzles: 1 gravados, 0 já existentes, 0 indisponíveis, 0 falhas.` e as datas gravadas e sai com 0; segunda execução sai com 0 com `0 gravados, 1 já existentes`; com fonte `source-down` sai com 1 e escreve a falha no stderr; argumento inesperado (`puzzles collect foo`) sai com 2 com o `USAGE`; a saída não contém a `DATABASE_URL` nem texto bruto da fonte (FR-019)

### Implementation for User Story 2

- [X] T022 [US2] Em `apps/api/src/modules/puzzles/puzzles.service.ts`, acrescentar `collect(): Promise<CollectReport>` com `CollectReport` conforme `data-model.md` (`saved`, `skipped`, `unavailable`, `failed: { date, reason }[]`, `stoppedBy?: 'rate-limited'`). `createPuzzlesService` passa a aceitar `historyDays` (padrão 0); nesta história as datas candidatas são `[todayInSaoPaulo(clock)]` mais os `historyDays` dias anteriores (T027 liga o valor à configuração e acrescenta pausa e parada): `existingDates` → pular as existentes; para as demais, `source.fetchPuzzle('daily', date)`, gravar com `insertPuzzleIfAbsent`; `unavailable` → `unavailable`; `rate-limited` → `stoppedBy`; outras falhas → `failed`; antes de gravar, revalidar com `validatePuzzleWithSolution` e, se falhar, registrar em `failed` com `reason: 'unexpected-format'` (FR-006). O relatório é devolvido, não impresso (o serviço não conhece a saída)
- [X] T023 [US2] Em `apps/api/src/cli/run-cli.ts`: acrescentar `source: PuzzleSource` e `historyDays: number` a `CliDeps` (repassado ao serviço; `cli.ts` passa `0` até a T027 ligar a configuração); adicionar ao `USAGE` a linha `  puzzles collect             guarda o puzzle do dia (e o histórico que faltar)`; roteamento `group === 'puzzles' && command === 'collect'`; função `collectPuzzles(args, deps)` que usa `parseArgs({ args, options: {}, allowPositionals: false })`, chama `createPuzzlesService({ db, clock, source, rateLimits: defaultRateLimits, historyDays }).collect()` e imprime conforme `contracts/collect-command.md` (resumo e `Gravados: ...` no stdout; `Falhou em AAAA-MM-DD: <reason>` e `Interrompido por limite de uso da fonte; pendentes: ...` no stderr); código 0 sem falhas nem interrupção, 1 caso contrário. Em `apps/api/src/cli.ts`, passar `source: createOgloboSource()` e `historyDays: 0`
- [X] T024 [US2] Criar `.github/workflows/collect.yml` conforme `contracts/collect-command.md`: `on: schedule` com `cron: '1 3 * * *'` e `cron: '0 11 * * *'` (UTC; 00:01 e 08:00 em Brasília, valores iniciais da spec, ajustáveis só editando o cron) mais `workflow_dispatch`; `concurrency: { group: collect, cancel-in-progress: false }`; `runs-on: ubuntu-latest`; `permissions: { contents: read }`; passos `actions/checkout@v7`, `actions/setup-node@v7` (`node-version-file: .nvmrc`, `cache: npm`), `npm ci` com `HUSKY: 0`, `npm run build -w @cruzadinha/api` e `node apps/api/dist/cli.mjs puzzles collect` (sem passo de migração: a API já migra ao subir, e rodar as duas coisas ao mesmo tempo poderia colidir), este último com `env: DATABASE_URL: ${{ secrets.DATABASE_URL }}` apenas nesse passo e `COLLECT_HISTORY_DAYS: ${{ vars.COLLECT_HISTORY_DAYS }}` (variável opcional do repositório; se vazia, a config trata como ausente: ver T027, tratar string vazia como não definida). Um primeiro passo `guard` (id `guard`) decide se a coleta roda sem expor o segredo: `env: HAS_DATABASE_URL: ${{ secrets.DATABASE_URL != '' }}` (só um booleano) e um script que escreve `enabled=true|false` em `$GITHUB_OUTPUT`; se for `false` e o evento for `schedule`, imprime `::notice::coleta ignorada: segredo DATABASE_URL não cadastrado` e os passos seguintes (todos com `if: steps.guard.outputs.enabled == 'true'`) são pulados, para o agendamento não falhar todo dia antes da implantação; se for `false` e o evento for `workflow_dispatch`, imprime `::error::` e sai com 1 (disparo manual sem segredo é erro). Sem `set -x` nem impressão de variáveis. Usar as mesmas versões das actions do `.github/workflows/ci.yml`
- [X] T025 [P] [US2] Criar o teste unitário `apps/api/src/lib/collect-workflow.test.ts` (sem banco), que lê `.github/workflows/collect.yml` e verifica que o texto não contém `echo $DATABASE_URL`, `set -x` nem valores do `.env.example`, que `DATABASE_URL` aparece só via `secrets.DATABASE_URL` (no passo da coleta e na comparação `secrets.DATABASE_URL != ''` do passo `guard`, nunca no nível do job) e que o passo `guard` existe e os demais passos o referenciam

**Checkpoint**: US1 e US2 funcionam; `puzzles collect` idempotente.

---

## Phase 5: User Story 3 - Preencher o histórico dentro da janela (Priority: P3)

**Goal**: A coleta também guarda as datas passadas ausentes dentro da janela configurável `COLLECT_HISTORY_DAYS`, com pausa entre pedidos e parada em limite de uso.

**Independent Test**: Banco vazio e fonte falsa com 31 datas; a coleta guarda hoje e a janela configurada (padrão 31 dias); a segunda execução não faz pedidos.

### Tests for User Story 3 (escrever primeiro e ver falhar)

- [X] T026 [US3] Em `apps/api/src/test/collect.int.test.ts`, acrescentar (com `sleep` falso que registra as pausas): banco vazio e fonte ok para hoje e 31 dias anteriores (padrão) resulta em 32 gravados, `source.calls` em ordem decrescente de data e 31 pausas de 2000 ms entre os 32 pedidos (FR-010); segunda execução tem 32 `skipped` e zero chamadas; com algumas datas já gravadas, só as ausentes são pedidas; fonte `unavailable` em uma data antiga não conta como falha e não interrompe; `rate-limited` na 5ª data interrompe: `stoppedBy: 'rate-limited'`, as datas seguintes não são chamadas e o relatório lista o que ficou pendente (FR-011); outra falha (`source-down`) numa data não impede as seguintes; exit 1 na CLI quando há `failed` ou `stoppedBy` (FR-012); com `historyDays = 0` só hoje é pedido; com `historyDays = 3` são 4 datas. Em `apps/api/src/config.test.ts`: `COLLECT_HISTORY_DAYS` ausente ou `''` vale 31; `0` e `365` são aceitos; `-1`, `366`, `1.5` e `abc` são recusados com `COLLECT_HISTORY_DAYS: deve ser um inteiro de 0 a 365`

### Implementation for User Story 3

- [X] T027 [US3] Em `apps/api/src/modules/puzzles/puzzles.service.ts`, estender `collect()`: `PAUSE_MS = 2_000` como constante exportada e o `historyDays` do serviço (criado em T022) passa a vir da configuração, sem constante fixa; em `apps/api/src/config.ts` acrescentar `COLLECT_HISTORY_DAYS: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number({ error: 'deve ser um inteiro de 0 a 365' }).int(...).min(0, ...).max(365, ...).default(31))` ao `envSchema` (string vazia vira ausente: `z.coerce.number` converteria `''` em 0 e o workflow passa `''` quando a variável do repositório não existe) e `collectHistoryDays` a `ServerConfig`/`loadConfig`; em `.env.example` acrescentar `COLLECT_HISTORY_DAYS=31` com comentário (0 = só o dia; limite real da fonte desconhecido); em `apps/api/src/cli.ts` trocar o `historyDays: 0` provisório (T023) por `collectHistoryDays` lido da config; candidatas = `candidateDates(hoje, historyDays)` (T005); remover as existentes (`existingDates`); pedir uma por vez com `await sleep(PAUSE_MS)` entre pedidos (não antes do primeiro), usando um `sleep` injetável em `createPuzzlesService` (padrão `setTimeout` de `node:timers/promises`) para os testes; em `rate-limited` parar e acrescentar ao relatório as datas não tentadas como `pending: string[]`; no máximo um pedido por data por execução (FR-011). Acrescentar `pending` a `CollectReport` e ao `data-model.md`
- [X] T028 [US3] Em `apps/api/src/cli/run-cli.ts`, imprimir as datas de `pending` em `Interrompido por limite de uso da fonte; pendentes: ...` e garantir que o resumo conte `indisponíveis` e `já existentes`; atualizar `contracts/collect-command.md` se o texto mudar

**Checkpoint**: histórico preenchido e retomável; coleta idempotente com zero pedidos quando tudo está gravado.

---

## Phase 6: User Story 4 - Puzzle de exemplo no ambiente de desenvolvimento (Priority: P4)

**Goal**: O seed de desenvolvimento deixa um puzzle de exemplo guardado na data de hoje, sem rede.

**Independent Test**: Banco local vazio; `runSeed` grava a conta e o exemplo; rodar de novo não altera nada; em produção, recusa.

### Tests for User Story 4 (escrever primeiro e ver falhar)

- [X] T029 [US4] Em `apps/api/src/test/seed.int.test.ts`, acrescentar: `runSeed` com relógio fixo grava o puzzle de exemplo em `todayInSaoPaulo(clock)` com `attribution.sourceName` e `attribution.title` iguais a `Exemplo de desenvolvimento (seed)`, `author` e `copyright` nulos e a saída informa a data (`Puzzle de exemplo gravado: AAAA-MM-DD`); `GET /api/puzzles?date=hoje` com sessão do usuário do seed devolve 200 sem consultar a fonte (`fakeSource.calls` permanece vazio); segunda execução não altera a linha e diz que já existe; com um puzzle real já gravado para hoje, o seed não o substitui e imprime `Já existe puzzle em AAAA-MM-DD; exemplo não gravado.` (FR-021); com `NODE_ENV=production` continua recusando antes de abrir o banco e sem gravar nada; o exemplo valida em `validatePuzzleWithSolution` (FR-022)

### Implementation for User Story 4

- [X] T030 [US4] Criar `apps/api/src/db/seed-puzzle.ts` com `buildSamplePuzzle(date: string): { puzzle: Puzzle; solution: Solution }`: importa `apps/api/src/sources/oglobo/fixtures/daily-valid.json`, chama `convertAgilmenteResponse(body, 'daily', date)`, lança `Error` se o resultado não for `ok` e devolve o puzzle com `attribution` trocada por `{ sourceName: 'Exemplo de desenvolvimento (seed)', title: 'Exemplo de desenvolvimento (seed)', author: null, copyright: null }`, para o conteúdo inventado não aparecer atribuído à Globo (FR-022) (research R10). O arquivo vive fora do bundle do servidor (só o seed o importa, via `tsx`) e a fixture continua sendo texto inventado: não copiar nem versionar nenhum puzzle real
- [X] T031 [US4] Em `apps/api/src/db/seed-user.ts`, acrescentar `clock?: Clock` a `SeedDeps` (padrão `systemClock`) e, depois de criar a conta, chamar `insertPuzzleIfAbsent(database.db, buildSamplePuzzle(todayInSaoPaulo(clock)))`, imprimindo `Puzzle de exemplo gravado: AAAA-MM-DD` ou `Já existe puzzle em AAAA-MM-DD; exemplo não gravado.`; manter a recusa em produção antes de abrir o banco (FR-021) e o código de saída 0. Em `apps/api/src/db/seed.ts` nada muda além de repassar o relógio, se necessário
- [X] T032 [US4] Em `CLAUDE.md`, atualizar a linha do `npm run db:seed` para dizer que também grava o puzzle de exemplo de hoje (sem rede, sem sobrescrever puzzle existente) e que, enquanto ele ocupa hoje, `puzzles collect` o conta como já existente (recriar o banco local para obter o real)

**Checkpoint**: todas as histórias funcionam de forma independente.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T033 [P] Em `CLAUDE.md`: acrescentar à seção "Current state" a feature 006 (tabela `puzzles`, rotas `GET /api/puzzles`, coleta `puzzles collect`, workflow `collect.yml`, seed de exemplo); em "Commands", `npm run cli -w @cruzadinha/api -- puzzles collect` (e `node apps/api/dist/cli.mjs puzzles collect` na imagem) e o workflow agendado; em "Architecture", o módulo `src/modules/puzzles` e o limite `PUZZLE_FETCH`; documentar a variável `COLLECT_HISTORY_DAYS`. Manter o estilo (inglês) do arquivo
- [X] T034 [P] Atualizar `docs/design.md` só onde a implementação divergir do texto (por exemplo, janela configurável `COLLECT_HISTORY_DAYS` no lugar de "datas que a fonte ainda lista" e o limite de buscas sob demanda; o workflow não aplica migrações e é ignorado enquanto o segredo `DATABASE_URL` não existe); manter o restante
- [X] T035 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:int` e `npm run build`; corrigir o que falhar. Conferir que o `.env.example` só tem valores fictícios (incluindo `COLLECT_HISTORY_DAYS=31`). Conferir `git status` e `git diff --stat` por arquivos inesperados e por segredos (`.env` real, `DATABASE_URL`, token) antes de commitar
- [ ] T036 Executar o `quickstart.md` do começo ao fim em ambiente local: seções 1 a 4 (testes, coleta contra a fonte real sob demanda, seed, rota pelo Swagger); a seção 5 (workflow; antes de cadastrar o segredo, conferir que o disparo agendado é ignorado com o aviso e o manual falha com erro) só depois de o autor publicar a API com a migração `0002` e cadastrar o segredo `DATABASE_URL`; nela, forçar uma falha controlada (por exemplo, `DATABASE_URL` inválida num disparo manual em branch de teste) e confirmar que o job fica vermelho e o GitHub avisa o autor (SC-008). Registrar o resultado
- [X] T037 Revisar o Constitution Check do `plan.md` contra o diff final (solução nunca no payload, limites de tentativa, fontes só no adaptador, migração versionada, testes sem rede) e registrar qualquer desvio justificado em "Complexity Tracking"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende da Setup; bloqueia todas as histórias.
- **US1 (Phase 3)**: depende da Phase 2. É o MVP.
- **US2 (Phase 4)**: depende da Phase 2 e reaproveita `insertPuzzleIfAbsent`/`existingDates`; não depende de US1, mas `collect` mora no mesmo `puzzles.service.ts` criado em T015 (fazer US1 antes evita conflito de arquivo).
- **US3 (Phase 5)**: depende de US2 (estende `collect`).
- **US4 (Phase 6)**: depende da Phase 2 (repositório) e de T005; a verificação por rota (T029) usa US1.
- **Polish (Phase 7)**: depende das histórias desejadas.

### Within Each Story

Testes primeiro (devem falhar) → serviço → rota/CLI → integração. Cada tarefa que mexe em `puzzles.service.ts`, `run-cli.ts` ou `app.ts` é sequencial entre si.

### Parallel Opportunities

- Phase 2: T002, T003, T004, T005, T009 e T012 em paralelo (arquivos diferentes); T006 → T007 → T008 em sequência; T010 depende de T006; T011 depende de T010 e T012; T013 depende de T012.
- US1: T016 em paralelo com T015.
- US2: T025 em paralelo com T022 a T024.
- Polish: T033 e T034 em paralelo.

### Parallel Example: Phase 2

```text
T002 packages/shared/src/puzzle/response.ts
T004 packages/shared/src/api-error.ts + apps/api/src/http/errors.ts
T005 apps/api/src/lib/dates.ts (+ test) e check.ts
T009 apps/api/src/modules/rate-limit/limits.ts
T012 apps/api/src/test/fake-source.ts
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 e Phase 2.
2. Phase 3 (US1): o front já consegue pedir e receber um puzzle, mesmo sem coleta agendada.
3. Validar com os testes e com o Swagger (quickstart 1 e 4); parar e revisar.

### Incremental Delivery

1. US1: puzzle sob demanda com cache.
2. US2: coleta diária e workflow agendado.
3. US3: histórico retomável.
4. US4: seed de exemplo para desenvolvimento.
5. Polish.

### Notes

- Commits pequenos por tarefa ou grupo, em inglês, Conventional Commits (por exemplo, `feat(api): add puzzles table and repository`), sem `Co-Authored-By` nem atribuição de IA.
- O workflow só roda de verdade depois de o autor cadastrar `DATABASE_URL` em *Settings → Secrets*; isso não é tarefa de código.
- `T036` usa a fonte real: é manual e nunca entra na suíte automática.

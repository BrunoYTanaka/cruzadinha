---

description: "Task list for feature 008: progresso do usuário em cada puzzle"
---

# Tasks: Progresso do usuário em cada puzzle

**Input**: Design documents from `/specs/008-progresso-usuario-puzzle/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-api.md, quickstart.md

**Tests**: Pedidos pela constituição (VI e VII: progresso com Postgres real em contêiner) e pelos critérios SC-001 a SC-006. Escreva cada teste antes da implementação correspondente e confira que ele falha. Unitários rodam com `npm test`; os que usam banco são `*.int.test.ts` (`npm run test:int`, precisa de Docker). Nenhum teste chama a fonte real.

**Organization**: Tarefas agrupadas por história de usuário (US1 salvar e retomar, US3 isolamento, US2 concluir e melhor tempo; US1 e US3 são P1, US2 é P2). Muda `packages/shared`, a API (schema, migração, módulo `progress`) e a documentação. Sem dependência nova e sem mudança no front.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: História da spec (US1, US2, US3)
- Caminhos relativos à raiz do repositório

## Referências fixas para todas as tarefas

- Nenhuma dependência nova nem API de biblioteca nova; o Context7 não se aplica (Drizzle, Fastify e Zod já em uso, com padrões a copiar do módulo `puzzles`).
- Contrato HTTP: `contracts/http-api.md`. Tabela e estados: `data-model.md`. Decisões: `research.md`.
- Copiar o padrão de `apps/api/src/modules/puzzles/` (rotas com `schema` e `preHandler: requireSession`, `sendError`, `findPuzzleById`) e de `apps/api/src/test/puzzles.int.test.ts` (registro por convite, cookie `sid`, `buildTestApp`, `testClock`).
- Nunca escrever `any`. Textos e mensagens em português. Commits em inglês, Conventional Commits, sem `Co-Authored-By` nem atribuição de IA (CLAUDE.md, que prevalece sobre qualquer lembrete de atribuição).
- Letras do jogador nunca em log nem em mensagem de erro; `fields` de `invalid-input` só com nomes de campos. Exemplos e fixtures com conteúdo inventado.
- Toda tabela spread `timestamps` e ganha trigger `<tabela>_set_updated_at` na migração (guardado por `conventions.int.test.ts`). Nunca usar `drizzle-kit push`.

---

## Phase 1: Setup

**Purpose**: Conferir o ponto de partida

- [X] T001 Confirmar que a branch `feat/008-progresso-usuario-puzzle` está ativa e que `npm ci`, `npm run lint`, `npm run typecheck` e `npm test` passam antes de qualquer mudança (linha de base)

---

## Phase 2: Foundational (contrato, tabela e repositório)

**Purpose**: Contrato compartilhado, tabela e acesso a dados são pré-requisito de todas as histórias

- [X] T002 [P] Em `packages/shared/src/progress/schema.test.ts`, escrever testes que falham para: `saveProgressRequestSchema` (aceita `{ cells, elapsedMs, status, savedAt }`; recusa `elapsedMs` negativo, não inteiro ou acima de 604800000; recusa `status` fora de `in_progress | completed`; recusa `savedAt` que não seja data-hora ISO-8601 com fuso; recusa campo extra); `progressSchema` (aceita progresso concluído e em andamento do contrato; `completedAt`, `finishedMs`, `bestMs`, `bestAt` nulos ou preenchidos); `progressEnvelopeSchema` (`{ progress: null }` válido); `cellsMatchGrid(grid, cells)` (dimensões iguais às da grade; bloco sempre `null`; célula aberta `null` ou exatamente uma letra já maiúscula pela regra `toLocaleUpperCase('pt-BR')`; recusa duas letras, minúscula, número, bloco com letra, linha a mais ou a menos) usando uma grade 2 x 2 inventada
- [X] T003 [P] Em `packages/shared/src/api-error.ts`, acrescentar `'progress-completed'` a `apiErrorCodeSchema`; em `packages/shared/src/api-error.test.ts`, cobrir o código novo; em `apps/api/src/http/errors.ts`, adicionar a mensagem genérica em português (`errorMessages` é `Record<ApiErrorCode, string>`, então o typecheck acusa a falta)
- [X] T004 Em `packages/shared/src/progress/schema.ts`, implementar `saveProgressRequestSchema`, `progressSchema`, `progressEnvelopeSchema`, `cellsMatchGrid` e os tipos inferidos (T002 passa); `elapsedMs` `z.number().int().min(0).max(604800000)`; `status` `z.enum(['in_progress','completed'])`; `savedAt` `z.iso.datetime({ offset: true })`; `cells` como matriz de `string | null` com `strictObject` nos objetos; exportar tudo em `packages/shared/src/index.ts`
- [X] T005 Em `apps/api/src/db/schema.ts`, declarar a tabela `progress` conforme `data-model.md`: chave primária composta `(userId, puzzleId)`; `userId` uuid `notNull` referenciando `users.userId` com `onDelete: 'cascade'`; `puzzleId` uuid `notNull` referenciando `puzzles.puzzleId` com `onDelete: 'restrict'`; `cells` `jsonb` `notNull` tipado `ProgressCells`; `elapsedMs` `integer` `notNull` com `check` `BETWEEN 0 AND 604800000`; `status` `text` enum `in_progress | completed` com `check`; `savedAt` `instant` `notNull`; `completedAt` `instant` nulo; `finishedMs` e `bestMs` `integer` nulos; `bestAt` `instant` nulo; `...timestamps`; índice `progress_puzzle_id_idx` em `puzzleId`; checks `progress_completed_pair` (`(status = 'completed') = (completed_at IS NOT NULL AND finished_ms IS NOT NULL)`) `progress_best_pair` (`(best_ms IS NULL) = (best_at IS NULL)`) e `progress_best_when_finished` (`finished_ms IS NULL OR (best_ms IS NOT NULL AND best_ms <= finished_ms)`)
- [X] T006 Gerar a migração com `npm run db:generate -w @cruzadinha/api -- --name progress` (arquivo `apps/api/drizzle/0003_progress.sql` e `meta/`) e acrescentar, no mesmo arquivo, o trigger `CREATE TRIGGER progress_set_updated_at BEFORE UPDATE ON progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();` como na `0002_puzzles.sql`; conferir o SQL gerado contra `data-model.md` e aplicar com `npm run db:migrate -w @cruzadinha/api` num banco local (Postgres de pé com `docker compose up -d` e `.env` copiado de `.env.example`)
- [X] T007 Em `apps/api/src/test/conventions.int.test.ts`, incluir `'progress'` na lista esperada de tabelas (ordem alfabética: `invites`, `progress`, `puzzles`, `rate_limit_attempts`, `sessions`, `users`) e confirmar com `npm run test:int` que o guarda de `created_at`/`updated_at`/trigger passa para a tabela nova
- [X] T008 Em `apps/api/src/modules/progress/progress.repository.ts`, implementar sobre `Executor`: `ensureRow(db, userId, puzzleId, emptyCells)` (`INSERT ... ON CONFLICT DO NOTHING` de uma linha vazia: todas as células `null`, `elapsed_ms` 0, `in_progress` e `saved_at` em `1970-01-01T00:00:00Z`, para que qualquer `savedAt` real do primeiro salvamento seja aceito; o serviço aplica o conteúdo do pedido logo depois, na mesma transação), `lockRow(db, userId, puzzleId)` (`SELECT ... FOR UPDATE`), `findProgress(db, userId, puzzleId)` e `updateProgress(db, userId, puzzleId, values)`; toda leitura relê `cells` com Zod e converte para o tipo `Progress` de `shared` (datas em ISO); toda consulta filtra por `userId` e `puzzleId` juntos; erro de linha inválida sem conteúdo na mensagem

**Checkpoint**: `npm test` e `npm run test:int` passam; as rotas ainda não existem

---

## Phase 3: User Story 1 - Salvar e retomar o progresso de um puzzle (Priority: P1) 🎯 MVP

**Goal**: Um jogador logado salva letras e tempo de um puzzle e os recebe de volta, inclusive de outro dispositivo; letras inválidas são recusadas sem tocar no progresso guardado.

**Independent Test**: Com usuário logado e puzzle guardado, `GET` sem progresso → `{ progress: null }`; `PUT` parcial → `200`; `GET` devolve o mesmo; segundo `PUT` substitui (uma linha); `PUT` com letra em bloco → `400` e o progresso anterior intacto; puzzle inexistente → `404`.

### Tests for User Story 1

- [X] T009 [P] [US1] Em `apps/api/src/modules/progress/progress.service.test.ts`, escrever testes unitários que falham para a função pura `decideSave(current, request, now)` (sem banco): linha vazia + `in_progress` aplica letras, `elapsedMs` e `savedAt`; `savedAt` anterior ao guardado devolve "sem alteração"; `savedAt` igual ao guardado aplica (idempotente); `savedAt` mais de 5 minutos à frente de `now` é recusado como `invalid-input` no campo `savedAt`; tempo e letras vêm sempre do pedido, nunca do estado anterior
- [X] T010 [P] [US1] Em `apps/api/src/test/progress.int.test.ts` (montar app, convite, registro e cookie como em `puzzles.int.test.ts`; inserir puzzle 2 x 2 inventado direto na tabela `puzzles`), escrever testes que falham: `GET` sem progresso → `200 { progress: null }`; `PUT` parcial → `200` com `status: in_progress`, `completedAt`, `finishedMs`, `bestMs` nulos; `GET` devolve o mesmo; segundo `PUT` substitui e `SELECT count(*)` mostra uma linha; uma segunda sessão do mesmo usuário (novo login) lê as mesmas letras e o mesmo tempo (SC-001); `PUT` com bloco preenchido, célula com duas letras, minúscula, dimensão errada, `elapsedMs` negativo, `elapsedMs` 604800001, `status` desconhecido e `savedAt` inválido → `400 invalid-input` com `fields` só de nomes e o progresso anterior intacto; `PUT` com `savedAt` anterior não altera e devolve o estado atual; `PUT` vazio (todas `null`) aceito; `puzzleId` inexistente e malformado → `404 puzzle-unavailable` em `GET` e `PUT`; dois `PUT` simultâneos (`Promise.all`) deixam uma linha; o log capturado depois de um `400` não contém as letras enviadas

### Implementation for User Story 1

- [X] T011 [US1] Em `apps/api/src/modules/progress/progress.service.ts`, criar `createProgressService({ db, clock })` com `get(userId, puzzleId)` e `save(userId, puzzleId, request)`: carregar o puzzle com `findPuzzleById` (inexistente → `{ ok: false, reason: 'puzzle-unavailable' }`); validar `cellsMatchGrid(puzzle.grid, request.cells)` (falha → `invalid-input` com `fields: ['cells']`); em transação, `ensureRow`, `lockRow`, aplicar `decideSave` (exportada e pura, T009 passa) e `updateProgress`; devolver sempre o estado resultante; nada de letras em mensagens de erro lançadas
- [X] T012 [US1] Em `apps/api/src/modules/progress/progress.schemas.ts`, declarar os `schema` OpenAPI de `GET` e `PUT /api/progress/:puzzleId` (tag `progress`, `security: [{ session: [] }]`, `params` com `puzzleId` uuid, corpo e respostas `200`, `400`, `401`, `404`, `409` e `commonErrors` conforme o contrato, usando `toDocSchema`, `errorResponse` e `commonErrors` de `apps/api/src/docs/doc-schema.ts`)
- [X] T013 [US1] Em `apps/api/src/modules/progress/progress.routes.ts`, registrar `GET` e `PUT /api/progress/:puzzleId` com `preHandler: requireSession`, `userId` vindo só de `request.user`, `puzzleId` validado com `z.uuid()` (inválido → `404 puzzle-unavailable`), corpo do `PUT` validado com `saveProgressRequestSchema.safeParse` no handler (falha → `400 invalid-input` com nomes de campos), corpo de sucesso `{ progress }`; registrar o plugin em `apps/api/src/app.ts` criando `createProgressService({ db: database, clock })` ao lado de `puzzles` (T010 passa)

**Checkpoint**: US1 funciona e é testável sozinha (MVP)

---

## Phase 4: User Story 3 - Cada jogador enxerga somente o próprio progresso (Priority: P1)

**Goal**: Nenhuma leitura ou escrita cruza usuários; sem sessão, tudo é recusado.

**Independent Test**: Dois usuários no mesmo puzzle com progressos diferentes: cada `GET` devolve só o seu; o `PUT` de B não altera o de A; sem cookie → `401` e nada gravado.

### Tests for User Story 3

- [X] T014 [US3] Em `apps/api/src/test/progress.int.test.ts`, acrescentar um `describe` de isolamento (segundo usuário registrado por outro convite): A e B salvam letras e tempos diferentes no mesmo puzzle e cada `GET` devolve só o próprio (SC-002); o `PUT` de B não muda a linha de A (conferir direto no banco); corpo com `userId` extra é recusado com `400 invalid-input` (schema estrito) e nada é gravado; `GET`, `PUT` e `POST .../reset` sem cookie → `401 unauthenticated` e `SELECT count(*)` continua 0 (SC-006); nenhuma resposta de progresso contém o e-mail nem o identificador do outro usuário; remover o usuário A (`DELETE FROM users`) apaga seu progresso e preserva o de B; `DELETE FROM puzzles` de um puzzle com progresso falha por violação de chave estrangeira (FR-014)

### Implementation for User Story 3

- [X] T015 [US3] Conferir, sem criar rota nova, que `progress.routes.ts` nunca lê `userId` de corpo, query ou params e que `progress.repository.ts` filtra todas as consultas por `userId` da sessão; se algum teste de T014 falhar, corrigir no serviço, na rota ou no schema da tabela (chaves estrangeiras de T005) até passar

**Checkpoint**: US1 e US3 passam; o requisito de privacidade da constituição VI está coberto por teste

---

## Phase 5: User Story 2 - Concluir um puzzle e guardar o melhor tempo (Priority: P2)

**Goal**: Concluir registra o momento e o tempo total; o melhor tempo só melhora; reiniciar do zero preserva o melhor tempo; uma conclusão não se desfaz por salvamento comum.

**Independent Test**: `PUT completed` → `completedAt`, `finishedMs`, `bestMs`; `POST reset` zera letras e tempo e mantém `bestMs`; concluir pior mantém o `bestMs`, concluir melhor o reduz; `PUT in_progress` sobre concluído → `409`.

### Tests for User Story 2

- [X] T016 [P] [US2] Em `apps/api/src/modules/progress/progress.service.test.ts`, estender os testes de `decideSave` e criar os de `decideReset(current, now)`: `completed` sobre `in_progress` define `finishedMs = elapsedMs`, `completedAt = now` e, se não há `bestMs` ou `finishedMs < bestMs` (estrito), `bestMs = finishedMs` e `bestAt = completedAt` (empate mantém `bestMs` e `bestAt` antigos); sobre registro já `completed` com as mesmas letras é idempotente (nada muda); sobre `completed` com `in_progress` ou letras diferentes devolve `progress-completed`; `savedAt` anterior ao guardado não muda nada mesmo em `completed`; `decideReset` zera letras (`null` em todas) e `elapsedMs`, volta a `in_progress`, limpa `completedAt` e `finishedMs`, mantém `bestMs` e `bestAt` e avança `savedAt` para `max(savedAt, now)`
- [X] T017 [P] [US2] Em `apps/api/src/test/progress.int.test.ts`, acrescentar (com `testClock` para o instante de conclusão): `PUT completed` com `elapsedMs` 83000 → `completedAt` igual ao relógio do servidor (não ao `savedAt` do cliente), `finishedMs` 83000, `bestMs` 83000, `bestAt` igual ao `completedAt`, e `GET` devolve o mesmo (FR-007); `POST reset` → letras todas `null`, `elapsedMs` 0, `in_progress`, `completedAt` e `finishedMs` nulos, `bestMs` 83000 e `bestAt` mantido; concluir de novo com 90000 ou com 83000 (empate) mantém `bestMs` 83000 e `bestAt`, e com 79000 passa a 79000 com `bestAt` novo (SC-004); `PUT in_progress` e `PUT` com outras letras sobre concluído → `409 progress-completed` e a linha intacta; `PUT completed` repetido idêntico → `200` sem mudar `completedAt`; `PUT` atrasado (`savedAt` anterior ao do reset) depois do reset é ignorado e não ressuscita as letras; `POST reset` sem linha prévia cria linha vazia; `PUT completed` concorrente com `PUT in_progress` nunca deixa o registro desfeito (SC-005); `puzzleId` inexistente no reset → `404`

### Implementation for User Story 2

- [X] T018 [US2] Em `apps/api/src/modules/progress/progress.service.ts`, estender `decideSave` com as regras de conclusão, idempotência e `progress-completed`, criar `decideReset` pura e o método `reset(userId, puzzleId)` (carrega o puzzle, transação com `ensureRow`/`lockRow`/`updateProgress`, devolve o estado resultante); `save` passa a mapear `progress-completed` para `{ ok: false, reason: 'progress-completed' }` (T016 passa)
- [X] T019 [US2] Em `apps/api/src/modules/progress/progress.schemas.ts` e `progress.routes.ts`, declarar e registrar `POST /api/progress/:puzzleId/reset` (sem corpo, `200 { progress }`, `401`, `404`) e mapear `progress-completed` do `PUT` para `409` com `sendError(reply, 409, 'progress-completed')` (T017 passa)

**Checkpoint**: As três histórias funcionam de forma independente

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Documentação, guardas e verificação final

- [X] T020 Rodar `apps/api/src/docs/docs.test.ts` (já exige `schema` em toda rota `/api/*`) e `npm run dev -w @cruzadinha/api` para abrir `http://localhost:3000/api/docs/`: conferir que as três rotas aparecem na tag `progress` com exemplos de letras inventadas, e que em produção `/api/docs*` continua 404
- [X] T021 [P] Em `docs/design.md`, alinhar a tabela `progress` (colunas `elapsed_ms`, `saved_at`, `completed_at`, `finished_ms`, `best_ms`, `best_at`, chave composta) e a lista de endpoints (`PUT`, `GET` e `POST .../reset`) ao que foi implementado
- [X] T022 [P] Em `CLAUDE.md`, acrescentar à seção "Current state" a frase da feature 008 (tabela `progress`, três rotas, regras de conclusão, melhor tempo e ordem de salvamento) e atualizar a lista de tabelas do bloco da feature 004 quando fizer sentido
- [X] T023 Executar o roteiro de `quickstart.md`: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:int` e o passo a passo manual na Swagger UI, medindo o tempo de resposta de um `PUT` e de um `GET` (SC-003: menos de 1 s em uso normal; por exemplo com `curl -w '%{time_total}'`); registrar qualquer desvio no `quickstart.md`
- [ ] T024 Conferir que os testes de `progress.int.test.ts` que capturam o log (T010) passam e que `apps/api/src/test/secrets.int.test.ts` continua verde, para garantir que nenhuma letra do jogador nem segredo novo vaza em log ou erro; commitar em Conventional Commits em inglês (`feat(api): add per-user puzzle progress (feature 008)`), sem `Co-Authored-By`

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** → fases de história. T002 e T003 são paralelos; T004 depende de T002; T005 → T006 → T007; T008 depende de T004 e T006.
- **US1 (Phase 3)** depende da Phase 2. É o MVP.
- **US3 (Phase 4)** depende da US1 (usa as mesmas rotas) mas não de US2.
- **US2 (Phase 5)** depende da US1 (estende `decideSave` e as rotas).
- **Polish** depende das histórias desejadas.
- Dentro da história: testes (falhando) → serviço → schemas OpenAPI → rotas.
- T010, T014 e T017 editam o mesmo arquivo de teste: executar em sequência, não em paralelo.

### Parallel Opportunities

- T002 ‖ T003 (Phase 2)
- T009 ‖ T010 (US1, arquivos diferentes)
- T016 ‖ T017 (US2, arquivos diferentes)
- T021 ‖ T022 (Polish)

## Implementation Strategy

1. **MVP**: Phases 1, 2 e 3: salvar e retomar com validação (US1). Já cumpre "o progresso fica salvo entre dispositivos".
2. Em seguida US3, que fecha o isolamento exigido pela constituição antes de qualquer tela usar a API.
3. Depois US2 (conclusão, melhor tempo e reinício), e por fim o Polish.
4. Dar push só com `typecheck` e testes unitários verdes (hook de pré-push); rodar `npm run test:int` antes de abrir o PR.

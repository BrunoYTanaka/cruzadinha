---

description: "Task list for feature 009: biblioteca de puzzles"
---

# Tasks: Biblioteca de puzzles

**Input**: Design documents from `/specs/009-biblioteca-puzzles/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-api.md, quickstart.md

**Tests**: Pedidos pela constituição (VII) e pelos critérios SC-001 a SC-005. Escreva cada teste antes da implementação correspondente e confira que ele falha. Unitários rodam com `npm test`; os que usam banco são `*.int.test.ts` (`npm run test:int`, precisa de Docker). Nenhum teste chama a fonte real.

**Organization**: Tarefas agrupadas por história de usuário (US1 lista com a situação do jogador, US2 sem fonte e sem expor a resposta, US3 só logado; as três são P1). Há uma única rota, então US2 e US3 são principalmente garantias testadas sobre o que a US1 entrega. Muda `packages/shared`, a API (módulo `library`) e a documentação. Sem migração, sem dependência nova e sem mudança no front.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: História da spec (US1, US2, US3)
- Caminhos relativos à raiz do repositório

## Referências fixas para todas as tarefas

- Nenhuma dependência nova nem API de biblioteca nova; o Context7 não se aplica (Drizzle, Fastify e Zod já em uso, com padrões a copiar dos módulos `progress` e `puzzles`).
- Contrato HTTP: `contracts/http-api.md`. Campos e derivação de situação: `data-model.md`. Decisões: `research.md`.
- Copiar o padrão de `apps/api/src/modules/progress/` (rota com `schema` e `preHandler: requireSession`, `sendError`, serviço com `Clock`, schemas OpenAPI com `toDocSchema`) e de `apps/api/src/test/progress.int.test.ts` (registro por convite, cookie `sid`, `buildTestApp`, `testClock`).
- Nunca escrever `any`. Textos e mensagens em português. Commits em inglês, Conventional Commits, sem `Co-Authored-By` nem atribuição de IA (CLAUDE.md, que prevalece sobre qualquer lembrete de atribuição).
- A resposta nunca contém `grid`, `words`, `solution` nem `cells`; nenhum log com letras. Exemplos e fixtures com conteúdo inventado.
- Sem migração: não tocar em `apps/api/drizzle/` nem em `apps/api/src/db/schema.ts`.

---

## Phase 1: Setup

**Purpose**: Conferir o ponto de partida

- [X] T001 Confirmar que a branch `feat/009-biblioteca-puzzles` está ativa (criada a partir de `feat/008-progresso-usuario-puzzle`, que contém a tabela `progress`) e que `npm ci`, `npm run lint`, `npm run typecheck` e `npm test` passam antes de qualquer mudança (linha de base)

---

## Phase 2: Foundational (contrato compartilhado)

**Purpose**: O schema do item e da resposta, usado por API e (depois) pelo front

- [X] T002 [P] Escrever primeiro `packages/shared/src/library/schema.test.ts`: aceita um item de cada situação (`not_started`, `in_progress`, `completed`) e `{ items: [] }`; recusa `status` desconhecido, `level` diferente de `daily`, `date` fora de `YYYY-MM-DD`, campo extra (por exemplo `cells` ou `solution`, pois o schema é `strictObject`) e `bestMs` sem `bestAt` (e o inverso)
- [X] T003 Criar `packages/shared/src/library/schema.ts`: `LIBRARY_LIMIT = 366`; `libraryStatusSchema = z.enum(['not_started','in_progress','completed'])`; `libraryItemSchema` (`z.strictObject`) com `puzzleId` uuid, `date` (`isoDateSchema`), `level` (`levelSchema`), `status`, `elapsedMs`, `finishedMs`, `bestMs` (inteiros de 0 a `MAX_ELAPSED_MS`, anuláveis), `completedAt` e `bestAt` (`z.iso.datetime({ offset: true })`, anuláveis) e um `superRefine` que exige `bestMs` e `bestAt` juntos; `libraryResponseSchema = z.strictObject({ items: z.array(libraryItemSchema) })`; tipos `LibraryItem`, `LibraryResponse`, `LibraryStatus`. Exportar em `packages/shared/src/index.ts`. T002 deve passar.

**Checkpoint**: contrato validado por teste unitário

---

## Phase 3: User Story 1 - Ver os puzzles disponíveis com a minha situação (Priority: P1) 🎯 MVP

**Goal**: `GET /api/library` devolve os puzzles guardados, do mais recente ao mais antigo, com a situação e os tempos do usuário da sessão.

**Independent Test**: Com um usuário logado, três puzzles guardados e progressos de cada tipo, pedir a biblioteca e conferir ordem, datas, situação e tempos (cenários 1 a 6 da US1).

### Tests for User Story 1 (escrever e ver falhar antes da implementação)

- [X] T004 [P] [US1] Escrever `apps/api/src/modules/library/library.service.test.ts` para a função pura `toLibraryItem(row)` (`data-model.md`, "Derivação de `status`"): sem linha de progresso → `not_started` com todos os tempos `null`; `completed` → `completed` com `finishedMs` e `completedAt` e `elapsedMs: null`; `in_progress` com `hasLetters: true` → `in_progress` com `elapsedMs`; `in_progress` com `hasLetters: false` → `not_started` e `elapsedMs: null`; `bestMs`/`bestAt` presentes em qualquer situação quando existirem; datas devolvidas como ISO com `Z`
- [X] T005 [P] [US1] Escrever `apps/api/src/test/library.int.test.ts` (Postgres real, copiando o preparo de `progress.int.test.ts`) com: lista vazia → `200 { items: [] }`; três puzzles em datas diferentes saem do mais recente ao mais antigo; sem progresso → `not_started`; `PUT /api/progress/:puzzleId` com letras → `in_progress` com `elapsedMs`; concluído → `completed` com `finishedMs`, `completedAt`, `bestMs`, `bestAt`; reiniciado depois de concluir → `not_started` com `bestMs`/`bestAt` mantidos e `finishedMs`/`completedAt` nulos; linha vazia criada por `POST .../reset` sem recorde → `not_started`; com 367 puzzles inseridos (datas distintas, pois há no máximo um puzzle por data), a resposta tem 366 itens, é a janela mais recente e chega em menos de 1 s (SC-003)

### Implementation for User Story 1

- [X] T006 [US1] Criar `apps/api/src/modules/library/library.repository.ts`: `listLibraryRows(db: Executor, userId: string, limit: number)` com Drizzle, `puzzles` `LEFT JOIN progress ON progress.puzzle_id = puzzles.puzzle_id AND progress.user_id = userId` (o filtro do usuário no `ON`, nunca no `WHERE`), selecionando só `puzzleId`, `level`, `date`, `status`, `elapsedMs`, `finishedMs`, `completedAt`, `bestMs`, `bestAt` e `hasLetters` (`jsonb_path_exists(progress.cells, '$[*][*] ? (@ != null)')`), `ORDER BY puzzles.date DESC, puzzles.level ASC, puzzles.puzzle_id ASC`, `LIMIT limit`. Nunca selecionar `puzzles.data`, `puzzles.solution` nem `progress.cells`. Se a expressão de `hasLetters` não se comportar como esperado no Postgres 17, aplicar o plano B de `research.md` (ler `cells`, calcular no serviço, descartar antes de responder) e anotar a decisão em `research.md`
- [X] T007 [US1] Criar `apps/api/src/modules/library/library.service.ts`: tipo `LibraryRow`, função pura `toLibraryItem(row): LibraryItem` conforme `data-model.md` e `createLibraryService({ db })` com `list(userId): Promise<LibraryItem[]>` usando `LIBRARY_LIMIT` de `shared`. O serviço não recebe `PuzzleSource` nem o limitador de busca. T004 deve passar.
- [X] T008 [US1] Criar `apps/api/src/modules/library/library.schemas.ts` (`getLibrarySchema`: tag `library`, `security: [{ session: [] }]`, `summary`, `description` dizendo que só lê o que está guardado, resposta `200` com `toDocSchema(libraryResponseSchema)` e um exemplo, `401` com `errorResponse`, `...commonErrors`) e `apps/api/src/modules/library/library.routes.ts` (`GET /api/library` com `preHandler: requireSession`, `401` se não houver `request.user`, corpo `LibraryResponse` com `items` do serviço; o usuário só vem de `request.user.id`)
- [X] T009 [US1] Registrar `libraryRoutes` e `createLibraryService({ db: database })` em `apps/api/src/app.ts`, ao lado de `progress`. T005 deve passar

- [X] T010 [US1] Atualizar a documentação da API: em `apps/api/src/docs/docs.plugin.ts` acrescentar a tag `library` (com descrição em português) e, em `apps/api/src/docs/docs.test.ts`, acrescentar `'GET /api/library'` ao catálogo de rotas, `'library'` à lista de tags permitidas e `'GET /api/library'` à lista de rotas que exigem sessão; conferir que o exemplo de resposta de `getLibrarySchema` aparece no documento OpenAPI (FR-011). `npm test` em `apps/api` deve passar

**Checkpoint**: a US1 funciona sozinha (MVP) e é testável de forma independente

---

## Phase 4: User Story 2 - Listar sem acionar a fonte e sem expor a resposta (Priority: P1)

**Goal**: A biblioteca nunca chama a fonte, não consome o limite `PUZZLE_FETCH` e não carrega grade, dicas, solução nem letras.

**Independent Test**: Pedir a biblioteca com uma fonte que lança se for chamada e conferir resposta normal, contador de tentativas inalterado e corpo sem os campos proibidos.

- [X] T011 [US2] Acrescentar a `apps/api/src/test/library.int.test.ts`: (a) montar o app com um `PuzzleSource` que lança se chamado, pedir a biblioteca várias vezes e conferir `200` e zero chamadas à fonte; (b) contar as linhas de `rate_limit_attempts` com `action = 'PUZZLE_FETCH'` antes e depois e conferir que não mudaram; (c) com puzzle e progresso com letras guardados, conferir que o corpo serializado não contém as chaves `grid`, `words`, `attribution`, `solution` nem `cells`, e que nenhuma letra do jogador aparece nele; (d) um pedido a `GET /api/library` não escreve em `puzzles` nem em `progress` (contagens iguais). Se algum teste falhar, corrigir o serviço/repositório (causa provável: coluna selecionada a mais ou dependência injetada a mais)

**Checkpoint**: US1 e US2 verdes; a garantia de não tocar na fonte é testada

---

## Phase 5: User Story 3 - Só quem está logado acessa a biblioteca (Priority: P1)

**Goal**: Sem sessão válida, recusa; cada jogador vê só o próprio progresso.

**Independent Test**: Pedir sem sessão e com sessão de outro usuário e conferir recusa e isolamento.

- [X] T012 [US3] Acrescentar a `apps/api/src/test/library.int.test.ts`: sem cookie → `401 unauthenticated`; cookie de sessão expirada ou revogada → `401`; dois usuários com progressos diferentes nos mesmos puzzles recebem cada um apenas a própria situação e os próprios tempos (SC-005); um parâmetro `userId` na query string é ignorado (a resposta continua sendo a do usuário da sessão). Se algum teste falhar, corrigir `library.routes.ts`/`library.repository.ts` (usuário só de `request.user.id`; nenhum parâmetro lido da query)

**Checkpoint**: as três histórias independentes e verdes

---

## Phase 6: Polish & documentação

- [X] T013 [P] Atualizar `docs/design.md`: a linha de `GET /api/library` passa a descrever o que foi feito (até 366 puzzles já guardados, mais recentes primeiro, com situação e tempos do usuário; nunca consulta a fonte), sem apagar o restante
- [X] T014 [P] Atualizar `CLAUDE.md`: acrescentar um parágrafo "Feature 009 (puzzle library)" na seção "Current state" (rota, módulo `modules/library`, sem migração, uma consulta com `LEFT JOIN`, não usa `PuzzleSource` nem o limite de busca) e, em Architecture, uma linha para `src/modules/library`
- [X] T015 Conferir os cenários manuais de `quickstart.md` contra a API local (`docker compose up -d`, `npm run db:seed -w @cruzadinha/api`, `npm run dev -w @cruzadinha/api`): `GET /api/library` → `not_started`; `PUT` com letras → `in_progress`; concluir → `completed` com `bestMs`; `POST .../reset` → `not_started` com `bestMs` mantido; medir que responde em menos de 1 s (o teste de carga com 367 puzzles está na T005); conferir `http://localhost:3000/api/docs/` com a rota documentada
- [X] T016 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:int`; corrigir o que falhar; marcar as tarefas concluídas neste arquivo e fazer o commit `feat(api): add puzzle library (feature 009)` em inglês, sem `Co-Authored-By` nem atribuição de IA

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (T003 depende de T002 escrito) → Phase 3 → Phases 4 e 5 (depois da US1, em sequência, pois editam o mesmo arquivo de teste) → Phase 6.
- Dentro da US1: T004 e T005 em paralelo (arquivos diferentes), depois T006 → T007 → T008 → T009 → T010.
- T013 e T014 em paralelo (arquivos diferentes), depois de T010.

## Parallel Example: User Story 1

```text
T004 library.service.test.ts   ||   T005 library.int.test.ts
(depois) T006 repository → T007 service → T008 routes + schemas → T009 app.ts → T010 docs
```

## Implementation Strategy

- **MVP**: Phases 1 a 3 (rota funcionando com situação e tempos). Em seguida, as garantias das US2 e US3 e a documentação.
- Entrega em um único commit. Abrir o PR depois que o PR #11 (feature 008) for integrado em `main`; se for aberto antes, usar a branch da 008 como base para o diff não carregar a 008.

# Tasks: Correções dos achados da auditoria

**Input**: `specs/034-correcoes-da-auditoria/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Prerequisites**: Node.js 24 (`nvm use`), `npm ci`, Docker para `npm run test:int`.

**Tests**: obrigatórios. Cada correção começa por um teste que falha (constituição, fluxo de desenvolvimento); o teste entra no mesmo commit da correção.

**Organization**: uma fase por história de usuário. Caminhos relativos à raiz do repositório. Commits `fix(api)`, `fix(shared)`, `refactor(api)`, `perf(api)`, `docs`, `test` conforme `docs/versionamento.md`; sem `Co-Authored-By`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1 a US8)

---

## Phase 1: Setup

- [X] T001 Confirmar o ponto de partida: `git branch --show-current` deve ser `fix/corrigir-achados-da-auditoria` e `npm run check:branch` deve passar (a branch foi renomeada; não há remoto nem PR); rodar `npm run typecheck && npm test` e `npm run test:int` na branch limpa e anotar qualquer falha prévia em `specs/034-correcoes-da-auditoria/research.md` (seção "Linha de base")

---

## Phase 2: Foundational

Nada bloqueante: cada história toca arquivos próprios. Atenção a dois pontos de contato, resolvidos pela ordem das fases: `apps/api/src/db/schema.ts` (US5) e `apps/api/src/modules/rate-limit/` (US1; a US5 só tira `INVITE_CREATE` do enum).

---

## Phase 3: User Story 1 - Limite de login com pedidos simultâneos (Priority: P1) 🎯 MVP

**Goal**: no máximo `max` verificações de senha por e-mail e janela, mesmo com pedidos simultâneos.

**Independent Test**: `apps/api/src/test/login-race.int.test.ts`: 10 logins errados simultâneos com limite 5 dão exatamente 5 `invalid-credentials` e 5 `too-many-attempts`.

- [X] T002 [US1] Escrever o teste de integração que falha em `apps/api/src/test/login-race.int.test.ts`: `Promise.all` com 10 `POST /api/auth/login` de senha errada para o mesmo e-mail e `loginEmail: { max: 5, windowMinutes: 15 }` injetado (como em `session.int.test.ts`); esperar 5 `invalid-credentials` (401) e 5 `too-many-attempts` (429), e que no máximo 5 pedidos tenham passado pela verificação da senha, provado pelo resultado (exatamente 5 respostas `invalid-credentials`, as demais `too-many-attempts`) ; não depender de `vi.spyOn` em módulo ESM
- [X] T003 [US1] Acrescentar em `apps/api/src/test/login-race.int.test.ts` os casos: login certo após erros zera a contagem do e-mail (`rate_limit_attempts` sem linhas `LOGIN`/`EMAIL`); login certo não deixa linha `LOGIN`/`NETWORK_ADDRESS`; e-mail inexistente se comporta como existente (mesmo número de 429); e-mail no limite recusa até com senha certa; uma única falha deixa exatamente 1 linha por chave (não conta duas vezes)
- [X] T004 [P] [US1] Escrever testes unitários de `reserve` em `apps/api/src/modules/rate-limit/rate-limit.service.test.ts` com repositório em memória: admite abaixo do limite e devolve `release`; recusa acima do limite, apaga só as próprias linhas e devolve o maior `retryAfterSeconds`; `release(keys)` apaga só as chaves dadas
- [X] T005 [US1] Em `apps/api/src/modules/rate-limit/rate-limit.repository.ts` acrescentar `insert(keys, now): Promise<string[]>` (ids inseridos, `returning({ id: rateLimitAttempts.rateLimitAttemptId })`) e `deleteByIds(ids)`; manter `record`, `countSince` e `clear` (contrato em `contracts/rate-limiter.md`)
- [X] T006 [US1] Em `apps/api/src/modules/rate-limit/rate-limit.service.ts` implementar `reserve(rules, now)` conforme `contracts/rate-limiter.md` (insere, conta incluindo a própria linha com `count > window.max`, apaga as próprias linhas ao recusar, devolve `release`); incluir no tipo `RateLimiter`; atualizar o repositório falso de `rate-limit.service.test.ts`
- [X] T007 [US1] Em `apps/api/src/modules/auth/auth.service.ts` (`login`) trocar `check` por `reserve([email, endereço])` antes de `findUserByEmail`; falha mantém as linhas e remove o `rateLimiter.record` do ramo de falha; sucesso chama `release` só do endereço e `rateLimiter.clear(emailKey)`; recusa devolve `too-many-attempts` sem consultar o usuário
- [X] T008 [US1] Rodar `npx vitest run src/modules/rate-limit src/modules/auth` e `npm run test:int -w @cruzadinha/api`; corrigir `apps/api/src/test/session.int.test.ts` e demais testes de login só se a contagem esperada mudou por causa da regra nova; commit `fix(api): reserve the login attempt before checking the password`

**Checkpoint**: US1 entregue sozinha.

---

## Phase 4: User Story 2 - Produção exige o segredo do repasse (Priority: P1)

**Goal**: o servidor recusa iniciar em produção sem `PROXY_SECRET`; o compose local continua subindo.

**Independent Test**: `apps/api/src/config.test.ts`.

- [X] T009 [US2] Escrever em `apps/api/src/config.test.ts` os testes que falham: com `{ requireProxySecret: true }` e `NODE_ENV=production`, `PROXY_SECRET` ausente ou `''` lança erro contendo `PROXY_SECRET: obrigatório em produção`; com segredo de 32 caracteres carrega; `NODE_ENV=development` e `test` carregam sem segredo; sem a opção, produção sem segredo carrega (CLI); `ALLOW_MISSING_PROXY_SECRET=true` em produção carrega; `ALLOW_MISSING_PROXY_SECRET=talvez` falha com `deve ser true ou false`; o valor do segredo nunca aparece na mensagem
- [X] T010 [US2] Em `apps/api/src/config.ts` acrescentar a variável `ALLOW_MISSING_PROXY_SECRET` (`true`/`false`, padrão `false`, vazio vale ausente, mesmo molde de `REGISTRATION_ENABLED`) e o segundo parâmetro `options?: { requireProxySecret?: boolean }` de `loadConfig`, que falha em produção conforme `contracts/config-and-cli.md`
- [X] T011 [US2] Em `apps/api/src/server.ts` chamar `loadConfig(process.env, { requireProxySecret: true })`
- [X] T012 [P] [US2] Em `docker-compose.yml` definir `ALLOW_MISSING_PROXY_SECRET: 'true'` no serviço `api` com comentário de uma linha; em `.env.example` documentar a variável e que o Render nunca a define; em `docs/deploy.md` acrescentar à lista de variáveis do Render que `PROXY_SECRET` é obrigatório e que sem ele a API não sobe
- [X] T013 [US2] Verificar à mão (quickstart passo 3): `docker compose up -d --build api` sobe e `curl localhost:3000/api/health` responde. Antes do lançamento, conferir no painel do Render (ou com o autor) que `PROXY_SECRET` está preenchido; sem ele a API passa a não subir. Commit `fix(api): refuse to start in production without PROXY_SECRET`

---

## Phase 5: User Story 3 - Limpeza de sessões (Priority: P2)

**Goal**: `puzzles collect` apaga sessões mortas sem prejudicar a coleta.

**Independent Test**: `apps/api/src/test/sessions-cleanup.int.test.ts`.

- [X] T014 [US3] Escrever o teste de integração que falha em `apps/api/src/test/sessions-cleanup.int.test.ts` com 5 sessões: vencida por inatividade, vencida pelo limite absoluto, encerrada há 8 dias, encerrada há 6 dias, ativa; após `purgeStaleSessions` restam só as duas últimas; banco sem sessões não falha
- [X] T015 [US3] Em `apps/api/src/modules/auth/sessions.repository.ts` implementar `deleteStaleSessions(db: Executor, now: Date): Promise<number>` com `db.delete(sessions).where(or(lt(sessions.expiresAt, now), lt(sessions.absoluteExpiresAt, now), lt(sessions.endedAt, subDays7)))` e `.returning({ id: sessions.sessionId })` (regra em `data-model.md`)
- [X] T016 [US3] Em `apps/api/src/modules/auth/auth.service.ts` acrescentar `purgeStaleSessions(): Promise<number>` ao tipo `AuthService` e à implementação, usando `clock()`
- [X] T017 [US3] Escrever em `apps/api/src/test/cli.int.test.ts` os casos: `puzzles collect` imprime `Sessões apagadas: N.`; para provocar a falha, `CliDeps` ganha uma dependência `purgeSessions` injetável (criada na T018) que o teste faz lançar; quando a limpeza lança, `stderr` recebe `Falha ao apagar sessões antigas.`, o código é 1 e os puzzles coletados ficam gravados, sem detalhes da consulta na saída
- [X] T018 [US3] Em `apps/api/src/cli/run-cli.ts` (`collectPuzzles`), depois do laço das fontes, chamar `deps.purgeSessions()` (campo novo de `CliDeps` em `run-cli.ts`, ligado em `apps/api/src/cli.ts` a `createAuthService(...).purgeStaleSessions()`) dentro de `try/catch` próprio, imprimir o resumo e somar à falha; usar `describeError` de `db/` apenas se for registrar causa; commit `fix(api): delete expired and ended sessions during puzzles collect`
- [X] T019 [P] [US3] Atualizar `CLAUDE.md` (comando `puzzles collect`: limpeza de sessões e a linha `Sessões apagadas: N.`) e `docs/design.md` com a limpeza de sessões e o resumo novo

---

## Phase 6: User Story 4 - Sandbox do Clube (Priority: P2)

**Goal**: provar que os testes de limite da sandbox já existem e cobrem o pedido.

**Independent Test**: `npx vitest run src/sources/clube/sandbox.test.ts`.

- [X] T020 [US4] Ler `apps/api/src/sources/clube/sandbox.test.ts` e conferir o que os casos de `game-loop.js` (timeout curto injetado, `timeoutMs: 100`) e `game-memory.js` afirmam; o texto `script: falha na sandbox` não aparece hoje no arquivo (`grep`), então acrescentar a asserção do texto exato e a de rapidez (tempo medido abaixo de 2 s, SC-004) para os dois casos; se faltar a asserção do texto ou do tempo, acrescentar só ela; sem mudança de código de produção; commit `test(api): assert the sandbox failure message and speed` apenas se houve alteração

---

## Phase 7: User Story 5 - Remover o código de convites (Priority: P3)

**Goal**: tabela, ação e campo mortos fora do projeto, sem quebrar a versão anterior do site.

**Independent Test**: `npm run test:int` com a migração `0008` sobre dados de `0007`.

- [ ] T021 [US5] Antes de mexer: descobrir o endereço do site em `docs/deploy.md` e confirmar `curl -s https://<endereço>/version.json` com versão do site posterior à feature 013 (§8 de `docs/versionamento.md`: este é o segundo lançamento da remoção) e registrar o resultado em `specs/034-correcoes-da-auditoria/research.md` (R6); se a versão for anterior, parar e levar ao autor
- [ ] T022 [US5] Escrever o teste de migração que falha em `apps/api/src/test/migration-0008.int.test.ts` (ou estender `apps/api/src/test/conventions.int.test.ts`): após as migrações, `invites` não existe; inserir `INVITE_CREATE` em `rate_limit_attempts` viola `rate_limit_attempts_action_check`; `LOGIN`, `REGISTER`, `PUZZLE_FETCH`, `SETTINGS_SAVE` seguem aceitos. Em `apps/api/src/test/conventions.int.test.ts` e `apps/api/src/test/seed.int.test.ts` remover `'invites'` e o import `invites`
- [ ] T023 [US5] Em `apps/api/src/db/schema.ts` remover a tabela `invites` e `'INVITE_CREATE'` de `rateLimitActions` e do `check` (`IN ('LOGIN', 'REGISTER', 'PUZZLE_FETCH', 'SETTINGS_SAVE')`)
- [ ] T024 [US5] Gerar a migração: `npm run db:generate -w @cruzadinha/api -- --custom --name remove_invites`, escrever em `apps/api/drizzle/0008_remove_invites.sql` na ordem: `DELETE FROM "rate_limit_attempts" WHERE "action" = 'INVITE_CREATE';`, `ALTER TABLE ... DROP CONSTRAINT "rate_limit_attempts_action_check";`, `ADD CONSTRAINT ... CHECK (... IN ('LOGIN', 'REGISTER', 'PUZZLE_FETCH', 'SETTINGS_SAVE'));`, `DROP TABLE "invites";` (separar com `--> statement-breakpoint`); rodar `npm run db:generate -w @cruzadinha/api` e confirmar que não gera mais nada; nunca `drizzle-kit push`
- [ ] T025 [P] [US5] Em `packages/shared/src/auth/schema.ts` remover `inviteCode` de `registerRequestSchema`; ajustar `packages/shared/src/auth/schema.test.ts` (linhas ~42 a 50) para o comportamento novo; em `apps/api/src/modules/auth/auth.schemas.ts` (~linha 40) e `auth.routes.ts` (~linha 55) remover o texto e o comentário sobre `inviteCode`; em `apps/api/src/test/register.int.test.ts` (~linha 96) trocar o caso "ignora o código de convite" por "recusa com 400 um cadastro com `inviteCode`" (`registerRequestSchema` é `z.strictObject`, logo o campo vira chave desconhecida; spec US5 cenário 2); em `packages/shared/src/auth/schema.test.ts` os casos de `inviteCode` viram um que espera `success: false`
- [ ] T026 [P] [US5] Em `apps/web/e2e/support.ts` (~linha 40) tirar `invites` do `TRUNCATE`
- [ ] T027 [US5] Atualizar `docs/data-definitions/DDE-001-banco-auth-convites.md` (entidade Invite, relações com User, valores de `action` sem `INVITE_CREATE`, versão e histórico) e `docs/entity-relationship-diagrams/ERD-001-banco-auth-convites.md` (sem `invites`), usando as skills `/data-definition` e `/entity-relationship-diagram`; ajustar `docs/design.md` (linhas ~151, ~281, ~335); na nota de `RateLimitAttempt` do DDE-001 ("No login só as tentativas falhas são registradas") descrever a reserva antes da verificação, a devolução da linha do endereço no sucesso e a remoção da linha recusada; conferir a spec da feature 004 (`specs/004-*/spec.md`, FR-027/FR-028) e anotar a mudança de ordem do registro; em `CLAUDE.md` corrigir a frase da feature 013 sobre a tabela `invites` (removida pela 034) e acrescentar o resumo da feature 034 ao fim da lista de features
- [ ] T028 [US5] Rodar `npm run test:int` e `npm run test:e2e -w @cruzadinha/web` (seção "E2E" do `CLAUDE.md`); commits `fix(api): drop the unused invites table and action` e `docs: update the data definition and diagram for the removal of invites`

---

## Phase 8: User Story 6 - Progresso lê só a grade (Priority: P3)

**Goal**: salvar progresso não lê a solução.

**Independent Test**: `apps/api/src/test/progress.int.test.ts` e unitário do serviço.

- [ ] T029 [US6] Escrever o teste que falha: em `apps/api/src/test/puzzles-repository.int.test.ts` pedir `findPuzzleGridById` de um puzzle salvo (devolve a grade igual à de `findPuzzleById`) e de um id inexistente (`undefined`); em `apps/api/src/modules/progress/` (teste do serviço, ou `progress.int.test.ts`) afirmar que `save` não chama `findPuzzleById`
- [ ] T030 [US6] Em `apps/api/src/modules/puzzles/puzzles.repository.ts` implementar `findPuzzleGridById(db, id)` com `db.select({ grid: sql<unknown>\`${puzzles.data}->'grid'\` })`, validando o resultado com `gridSchema` (definido em `packages/shared/src/puzzle/schema.ts`, ainda não exportado: acrescentar o export em `packages/shared/src/index.ts`)
- [ ] T031 [US6] Em `apps/api/src/modules/progress/progress.service.ts` usar `findPuzzleGridById` em `save` (~linha 127); manter `findPuzzleById` em `get` e `reset` se precisarem do puzzle completo, senão trocar também; respostas idênticas (`puzzle-unavailable`, `invalid-input`); commit `perf(api): read only the grid when saving progress`

---

## Phase 9: User Story 7 - Código comum dos adaptadores (Priority: P3)

**Goal**: nenhum adaptador importa de outro.

**Independent Test**: testes dos adaptadores e `grep` sem importações cruzadas.

- [ ] T032 [P] [US7] `git mv` de `apps/api/src/sources/cruzadaonline/{xml.ts,xml.test.ts,clue-text.ts,clue-text.test.ts}` para `apps/api/src/sources/common/` e corrigir as importações em `apps/api/src/sources/cruzadaonline/*.ts`, `apps/api/src/sources/clube/{clube.ts,page.ts,convert.ts,convert.test.ts}` e `apps/api/src/db/seed-puzzle.ts`
- [ ] T033 [US7] Conferir `grep -rnE "from '\.\./(cruzadaonline|clube|oglobo|cruzadasbrasil)/" apps/api/src/sources` sem resultado fora do próprio adaptador; `npx vitest run src/sources` sem alterar expectativas; atualizar o parágrafo de adaptadores em `CLAUDE.md` (pasta `sources/common/`); commit `refactor(api): move shared xml and clue helpers to sources/common`

---

## Phase 10: User Story 8 - Leitura do corpo em stream (Priority: P3)

**Goal**: o limite de 1 MB vale sem `content-length`.

**Independent Test**: `apps/api/src/sources/clube/clube.test.ts`.

- [ ] T034 [US8] Escrever em `apps/api/src/sources/clube/clube.test.ts` os casos que falham: `fetch` falso devolve `Response` com `ReadableStream` em pedaços, sem `content-length`, somando mais que `maxBytes` (pequeno, injetado): resultado `unexpected-format` / `corpo grande demais` e o stream é cancelado (`cancel` chamado, pedaços seguintes não lidos); corpo dentro do limite devolve o mesmo resultado de hoje, inclusive com caracteres acentuados partidos entre pedaços
- [ ] T035 [US8] Em `apps/api/src/sources/clube/clube.ts` (`get`) substituir `response.text()` por leitura de `response.body.getReader()` acumulando `Uint8Array` até `maxBytes` (`reader.cancel()` ao passar), decodificando UTF-8 com `TextDecoder` ao final; manter a checagem de `content-length`; commit `fix(api): stop reading a source body once it passes the size limit`

---

## Phase 11: Polish

- [ ] T036 [P] Rodar `npm run format:check && npm run lint && npm run typecheck && npm test && npm run test:int` e `npm run build`; corrigir o que falhar sem desligar regra nem pular teste
- [ ] T037 [P] Rodar `npm run check:branch` e `npm run check:ids` (a pasta `034-correcoes-da-auditoria` não colide com outra); executar o roteiro de `specs/034-correcoes-da-auditoria/quickstart.md`
- [ ] T038 Registrar em `specs/034-correcoes-da-auditoria/research.md` os acompanhamentos adiados (R2: `reserve` em `settings` e `puzzles`; leitura do corpo sem limite de stream em `cruzadaonline` e `cruzadasbrasil`, não verificada nesta feature) e abrir uma issue `[Chore]:` para ele se o autor quiser

---

## Dependencies & Execution Order

- Phase 1 antes de tudo. Não há fase Foundational bloqueante.
- US1 e US2 (P1) são independentes entre si; fazer US1 primeiro (MVP).
- US3 depende de US1 só em `auth.service.ts` (T016 depois de T007, mesmo arquivo).
- US5 (T023) depende de US1 só em `schema.ts`/enum, sem conflito de lógica; fazer depois de US1.
- US4, US6, US7, US8 independem das demais. US7 (T032) antes de US8 (T034) reduz conflito em `clube.ts`.
- Dentro de cada história: teste que falha → implementação → verificação → commit.

## Parallel Opportunities

- T003 e T004 (US1, arquivos diferentes), T012 (US2) e T019 (US3) são independentes de código.
- T025 e T026 (US5) rodam juntos depois de T023.
- US6 e US7 podem andar em paralelo por serem módulos separados.

## Implementation Strategy

- **MVP**: US1 (Phase 3). Entrega a correção de segurança central e já é lançável como `fix(api)`.
- Depois US2, em seguida US3 e US4, depois os P3 na ordem US5, US6, US7, US8.
- Um PR pode juntar tudo; os commits ficam separados por história para facilitar o `release-please` e a revisão.

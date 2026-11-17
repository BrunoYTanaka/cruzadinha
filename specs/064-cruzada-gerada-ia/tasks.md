# Tasks: Casa (cruzada diária gerada)

**Input**: Design documents from `specs/064-cruzada-gerada-ia/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos. A constituição (II, V, VII) e o FR-016 exigem testes unitários sem rede e de integração com Postgres; fixtures da DeepSeek são inventadas e reduzidas, nunca respostas reais.

**Organization**: por história da spec. Duas releases (research R6): a Fase 1 é a release A, em PR próprio, publicada antes de tudo; o resto é a release B.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 a US5 da spec

---

## Phase 1: Setup — Release A (site tolerante a fonte desconhecida)

**Purpose**: o site em produção e o PWA aberto não podem quebrar quando a API passar a devolver `casa` (deploy publica a API antes do site). PR `fix/tolerate-unknown-source-ids`, commit `fix(shared): ...`, mergeado e publicado antes da Fase 2.

- [X] T001 [P] Teste em `packages/shared/src/sources/schema.test.ts`: `sourcesResponseSchema` e `adminSourcesResponseSchema` aceitam uma resposta com um id desconhecido (`'nova'`) e o descartam, mantendo os conhecidos na ordem; resposta só com ids desconhecidos continua inválida (`min(1)` em `sources`)
- [X] T002 [P] Teste em `packages/shared/src/stats/schema.test.ts`: `statsSchema` aceita `bySource` com um item de fonte desconhecida e o descarta
- [X] T003 Fazer os três esquemas descartarem ids desconhecidos em `packages/shared/src/sources/schema.ts` e `packages/shared/src/stats/schema.ts` (filtrar por `puzzleSourceIdSchema.safeParse` antes de validar o item; pedidos continuam estritos)
- [X] T004 Rodar `npm run typecheck && npm test`; abrir o PR da release A e esperar o `web-v*` novo no ar antes de mergear a release B

**Checkpoint**: site no ar ignora fonte desconhecida em `/api/sources`, `/api/admin/sources` e `/api/stats`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: fonte `casa` existir no código e no banco, configuração lida, relatório da coleta com notas. Branch `feat/064-cruzada-gerada-ia`.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

- [X] T005 Acrescentar `'casa'` a `puzzleSourceIdSchema`, `puzzleSourceNames.casa = 'Casa'` e `'casa'` a `puzzleSourcesWithoutFetch` em `packages/shared/src/puzzle/schema.ts`
- [X] T006 [P] Criar `packages/shared/src/sources/generated-settings.ts` (exportado em `packages/shared/src/index.ts`): `generatedSourceIds = ['casa']`, `difficultySchema = z.enum(['easy','medium','hard'])`, `difficultyLabels = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }`, `GENERATED_GRID_SIZE_MIN = 9`, `GENERATED_GRID_SIZE_MAX = 15`, `GENERATED_SETTINGS_DEFAULT = { gridSize: 11, difficulty: 'medium' }`, `GENERATION_DAILY_CALLS = 3`, `generatedSettingsRequestSchema` (strictObject `{ source, gridSize: int 9..15, difficulty }`), `discardGeneratedRequestSchema` (strictObject `{ source, puzzleId }`) e `generatedSourcesResponseSchema` tolerante conforme `data-model.md`; testes em `generated-settings.test.ts`
- [X] T007 Corrigir todo erro de `npm run typecheck` causado pelo id novo (todo `Record<PuzzleSourceId, ...>`), incluindo o texto próprio de `casa` em `apps/web/src/features/landing/helpers/source-descriptions.ts` sem citar IA, modelo ou geração automática (FR-012)
- [X] T008 Em `apps/api/src/platform/db/schema.ts`: tabela `generatedSourceSettings` (`generated_source_setting_id uuid PK`, `source_id text UNIQUE` com `CHECK (source_id IN ('casa'))`, `grid_size smallint NOT NULL DEFAULT 11 CHECK (grid_size BETWEEN 9 AND 15)`, `difficulty text NOT NULL DEFAULT 'medium' CHECK IN ('easy','medium','hard')`, `...timestamps`); `'casa'` nos `CHECK` de `puzzles.source` e `source_settings.source_id`; `'PUZZLE_GENERATE'` em `rateLimitActions`
- [X] T009 Gerar a migração (`npm run db:generate -w @cruzadinha/api -- --name fonte_casa`) e completar à mão em `apps/api/drizzle/00NN_fonte_casa.sql`: trigger `generated_source_settings_set_updated_at`; `INSERT INTO generated_source_settings (source_id) VALUES ('casa') ON CONFLICT DO NOTHING`; `INSERT INTO source_settings (source_id, visible, position) SELECT 'casa', false, COALESCE(MAX(position), -1) + 1 FROM source_settings ON CONFLICT DO NOTHING`; `CHECK` de `rate_limit_attempts.action` com `'PUZZLE_GENERATE'`
- [X] T010 [P] Teste de integração em `apps/api/src/test/generated-source-settings.int.test.ts`: migração aceita `'casa'` em `puzzles` e `source_settings`; linha de `casa` em `source_settings` com `visible = false`; linha de `casa` em `generated_source_settings` com 11/medium; `CHECK`s recusam `grid_size` 8 e 16 e `difficulty` `'extreme'`; ação `PUZZLE_GENERATE` aceita (o `conventions.int.test.ts` existente cobre timestamps e trigger)
- [X] T011 [P] Em `apps/api/src/config.ts` (+ `apps/api/src/config.test.ts`): `DEEPSEEK_API_KEY` (opcional, vazio = ausente), `DEEPSEEK_MODEL` (padrão `deepseek-chat`), `GENERATION_ENABLED` (booleano, padrão `true` só com `NODE_ENV=production`, como `CAPTCHA_ENABLED`); em `.env.example`: `DEEPSEEK_API_KEY=` vazio e `GENERATION_ENABLED=false` com comentário
- [X] T012 [P] Em `apps/api/src/modules/puzzles/puzzles.service.ts`: `CollectReport.notes: string[]`; em `collectListed` e `collectSource`, resultado `unavailable` com `detail` grava `"<data>: <detail>"` em `notes`; teste em `apps/api/src/test/collect.int.test.ts` com fonte falsa devolvendo `unavailable` + `detail`
- [X] T013 Em `apps/api/src/cli/run-cli.ts`: para cada nota, `deps.stdout("[<nome>] Pulado em <data>: <detail>\n")`, nunca stderr e nunca "Falhou em"; caso no teste da CLI em `apps/api/src/test/cli.int.test.ts` conferindo stdout, ausência em stderr e exit 0
- [X] T014 Em `apps/api/src/modules/sources/sources.repository.ts`: `readGeneratedSettings(db, source)` devolvendo `{ gridSize, difficulty }` da linha de `generated_source_settings` ou `GENERATED_SETTINGS_DEFAULT` (11, medium) sem linha; exportar em `apps/api/src/modules/sources/index.ts`; caso no teste `apps/api/src/test/generated-source-settings.int.test.ts`

**Checkpoint**: `npm run typecheck`, `npm test`, `npm run test:int` verdes com a fonte `casa` sem adaptador ainda.

---

## Phase 3: User Story 1 - Jogar a cruzada gerada do dia (Priority: P1) 🎯 MVP

**Goal**: a Casa aparece e é jogável como as outras fontes, com atribuição "Casa" + dificuldade, sem menção a IA.

**Independent Test**: `npm run db:seed -w @cruzadinha/api`, abrir `/calendario?fonte=casa`, jogar a cruzada de hoje até concluir (quickstart 2b e 4).

- [X] T015 [P] [US1] Criar `apps/api/src/sources/generated/layout.ts` (puro): `layout(words, size, seed)` conforme research R2 e `data-model.md` (PRNG com semente, até 200 ordens, primeira palavra na linha do meio, cruzamento só com letra idêntica, sem casa vizinha encostada, aceita com `>= round(1.25 * size)` palavras todas ligadas, senão `null`) e `toPuzzle(placements, { source, date, size, difficulty })` gerando `Puzzle` (blocos onde não há letra, números em ordem de leitura, `attribution = { sourceName: 'Casa', title: 'Dificuldade: <rótulo>', author: null, copyright: null }`) e `Solution`
- [X] T016 [P] [US1] Testes em `apps/api/src/sources/generated/layout.test.ts` com lista inventada e semente fixa: tamanhos 9, 11 e 15 passam em `puzzleSchema` e `validatePuzzleWithSolution`; mesma semente = mesma grade; cruzamento `A`/`Á` recusado; lista curta demais → `null`; título com o rótulo da dificuldade; atribuição sem "IA"
- [X] T017 [P] [US1] Criar fixture inventada em `apps/api/src/sources/generated/fixtures.ts` (lista de ~60 palavras com dicas, inventadas para teste, e uma resposta HTTP no formato de `contracts/deepseek-request.md`)
- [X] T018 [US1] Em `apps/api/src/seed/seed-puzzle.ts`: `buildSamplePuzzle('casa', date)` monta a cruzada pela fixture de T017 e `layout` de T015, sem chamada externa
- [X] T019 [US1] Em `apps/api/src/seed/seed-user.ts`: só no seed, deixar `casa` visível em `source_settings` e marcar a conta de teste com `is_admin = true` (FR-028); ajustar o teste do seed se houver
- [X] T020 [US1] Garantir FR-013 e FR-012 no site: `grep -rn "puzzleSourceIdSchema\|PuzzleSourceId\|puzzleSourcesWithoutFetch" apps/web/src` e conferir que cada uso aceita `casa` (abas `SourceTabs`, calendário, `defaultSourceFor`, `DayPicker` do x1, `StatsPage`, `PrintSheet`, `buildShareText`/`renderShareCard`, cópia offline); acrescentar em `apps/web/src/features/game` (teste do `PrintSheet` e de `buildShareText`) um caso com puzzle `casa` conferindo atribuição "Casa" + "Dificuldade: …" e ausência de "IA", "DeepSeek" e "gerad"; corrigir qualquer uso que trate só as quatro fontes antigas
- [X] T021 [P] [US1] Teste em `apps/api/src/test/puzzles.int.test.ts`: `GET /api/puzzles?fonte=casa` de um dia sem cruzada responde como fonte sem busca sob demanda (sem chamar fonte nenhuma) e com a cruzada salva entrega puzzle e solução

**Checkpoint**: Casa jogável localmente com dados de exemplo.

---

## Phase 4: User Story 2 - Geração diária automática e validada (Priority: P1)

**Goal**: a coleta gera a cruzada de hoje da Casa, validada, até 3 chamadas por dia somando execuções, sem repetir respostas de 30 dias nem termos bloqueados.

**Independent Test**: coleta com `fetch` simulado: primeiro conteúdo inválido, depois válido → só o válido salvo, 2 chamadas; só inválidos → nada salvo, `Falhou em`, 3 chamadas (quickstart 1 e 3).

- [X] T022 [P] [US2] Criar `apps/api/src/sources/generated/normalize.ts` com `plain(text)` (NFD, remove marcas diacríticas, maiúsculas; mesma regra do `plainLetter` do site, que a API não pode importar por `check:deps`) e `apps/api/src/sources/generated/blocklist.ts` (termos em minúsculas e sem acento) com `isBlocked(text)` comparando palavras inteiras via `plain()`; testes em `normalize.test.ts` e `blocklist.test.ts`
- [X] T023 [US2] Criar `apps/api/src/sources/generated/schema.ts`: esquema tolerante da resposta HTTP (`choices[0].message.content`, `finish_reason`), esquema do JSON `{ words: [{ answer, clue }] }` com 20 a 100 itens, e `cleanWords(raw, { size, avoid })` que, item a item, normaliza (`trim`, maiúsculas), aceita resposta só com `A-Z` e `ÁÀÂÃÉÊÍÓÔÕÚÜÇ` de 3 a `size` letras, dica de 3 a 120 caracteres sem `<`, `>`, `http`, `www` nem a resposta (via `plain()` de T022), descarta bloqueados (T022), respostas em `avoid` e repetidas (sem acento); teste em `schema.test.ts` cobrindo cada regra
- [X] T024 [P] [US2] Criar `apps/api/src/sources/generated/prompt.ts`: `buildPrompt({ size, difficulty, date, avoid })` devolvendo as mensagens `system` e `user` exatamente como em `contracts/deepseek-request.md` (quantidade `4 * size + 20`, texto por dificuldade, linha "Não use" omitida se `avoid` vazio); teste em `prompt.test.ts`
- [X] T025 [US2] Criar `apps/api/src/sources/generated/client.ts`: `requestWords({ baseUrl, model, apiKey, messages, fetch })` com o corpo de `contracts/deepseek-request.md` (`max_tokens` 6000, `temperature` 1.3, `response_format` json, timeout 180 s), classificando: `402` → `no-credits`, `401` → `refused`, `400`/`422`/conteúdo vazio/`finish_reason !== 'stop'`/JSON inválido → `bad-content`, `429`/`5xx`/rede/timeout → `down`; nenhuma mensagem com corpo, prompt ou chave; teste em `client.test.ts` com `fetch` injetado, incluindo asserção de que nenhum resultado, `detail` ou erro lançado contém a chave de teste nem o conteúdo da resposta (FR-014, FR-015)
- [X] T026 [US2] Criar `apps/api/src/sources/generated/generated.ts`: `createGeneratedSource({ id, provider, enabled, fetch, clock, readSettings, reserveCall, recentAnswers })` implementando `PuzzleSource` com `onDemand: false`, `fetchPuzzle` → `unavailable`, `listRecent` devolvendo só hoje (`todayInSaoPaulo(clock)`); `loadPuzzle` lê a configuração uma vez (FR-020), busca `recentAnswers` (30 dias), e repete até `reserveCall()` recusar: monta prompt, chama o cliente, limpa, monta (`layout` com semente da data e da tentativa, até 200 ordens); devolve conforme a tabela de desfechos de `data-model.md` (`402` para na hora; tentativas esgotadas → `source-down` ou `unexpected-format`)
- [X] T027 [US2] Testes em `apps/api/src/sources/generated/generated.test.ts` com `fetch`, `clock`, `reserveCall` e `recentAnswers` falsos: inválido + válido = 2 chamadas e cruzada salva no tamanho e dificuldade lidos; 3 inválidos = 3 chamadas e `unexpected-format`; `reserveCall` recusando de início = 0 chamadas e `limite do dia`; resposta repetida de `recentAnswers` descartada e enviada em "Não use"; cruzada não contém termo bloqueado; `readSettings` chamado uma única vez por `loadPuzzle` mesmo com 3 tentativas (FR-020)
- [X] T028 [US2] Em `apps/api/src/modules/puzzles/puzzles.repository.ts` (+ `index.ts`): `recentAnswers(db, { source, today, days: 30 })` lendo só `solution` e as palavras do `data` das cruzadas da fonte no período e extraindo respostas com `word-cells.ts` de `shared`; teste em `apps/api/src/test/puzzles-repository.int.test.ts`
- [X] T029 [US2] Em `apps/api/src/cli.ts`: registrar `createGeneratedSource` para `casa` com `provider = { baseUrl: 'https://api.deepseek.com', model: config.DEEPSEEK_MODEL, apiKey: config.DEEPSEEK_API_KEY }`, `enabled: config.GENERATION_ENABLED`, `readSettings` = `readGeneratedSettings` de T014, `reserveCall` via `rateLimiter.reserve` (ação `PUZZLE_GENERATE`, `keyType: 'GLOBAL'`, `keyValue: 'casa:<data>'`, limite 3, janela 1440 min) e `recentAnswers` de T028; em `apps/api/src/app.ts` registrar a mesma fonte sem chave e com `enabled: false` (a API nunca gera)
- [X] T030 [US2] Teste em `apps/api/src/test/collect.int.test.ts`: coleta com a fonte `casa` e `fetch` falso grava a cruzada de hoje; segunda coleta no mesmo dia não chama o modelo (`skipped`); duas coletas que falham somam no máximo 3 chamadas no dia (limite persistido); outras fontes seguem coletando se a Casa falhar; com `casa` escondida em `source_settings` a coleta gera do mesmo jeito (FR-027); duas coletas simultâneas no mesmo dia salvam uma só cruzada e somam no máximo 3 chamadas
- [X] T031 [P] [US2] Criar `apps/api/src/sources/generated/check.ts` e o script `"source:check:generated": "tsx src/sources/generated/check.ts"` em `apps/api/package.json`: pedido real à DeepSeek com a configuração padrão, imprime nº de palavras postas e tentativas, `--save` grava em `apps/api/.source-samples/`; ignora `GENERATION_ENABLED`; nunca imprime a chave
- [X] T032 [US2] Teste de contrato (constituição IV, research R8b): rodar uma vez `DEEPSEEK_API_KEY=... npm run source:check:generated -w @cruzadinha/api -- --save`, reduzir a resposta a ~20 itens, remover `id` e `usage`, conferir que não há segredo e salvar em `apps/api/src/sources/generated/fixtures/deepseek-response.json`; criar `apps/api/src/sources/generated/contract.test.ts` que passa essa resposta pelo esquema HTTP, `cleanWords` e `layout` (tamanho 9) e espera uma cruzada válida
- [X] T033 [US2] Em `.github/workflows/collect.yml`, passo Coletar: `DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}`, `DEEPSEEK_MODEL: ${{ vars.DEEPSEEK_MODEL }}` e `GENERATION_ENABLED: 'true'`

**Checkpoint**: coleta local com `GENERATION_ENABLED=true` gera uma cruzada válida; US1 joga a cruzada gerada.

---

## Phase 5: User Story 3 - Parar quietamente quando os créditos acabam (Priority: P2)

**Goal**: `402`, chave ausente e geração desligada não falham a coleta nem abrem issue.

**Independent Test**: coleta com `fetch` respondendo `402` → 1 chamada, nada salvo, `Pulado em <hoje>: sem créditos` em stdout, exit 0 (quickstart 3).

- [X] T034 [US3] Testes em `apps/api/src/sources/generated/generated.test.ts`: `402` na primeira chamada → 1 chamada, `unavailable` + `sem créditos`; sem chave → 0 chamadas, `sem chave`; `enabled: false` → 0 chamadas, `geração desligada`; `401` → `refused`
- [X] T035 [US3] Teste em `apps/api/src/test/cli.int.test.ts`: `puzzles collect` com `402` imprime `[Casa] Pulado em <hoje>: sem créditos` em stdout, nenhuma linha `Falhou em`, exit 0 com as outras fontes ok; com `401` imprime `[Casa] Falhou em <hoje>: refused` e exit 1 (`contracts/collect-output.md`)

**Checkpoint**: falta de crédito é silenciosa; chave errada continua avisando.

---

## Phase 6: User Story 4 - Administrador escolhe tamanho e dificuldade (Priority: P2)

**Goal**: seção "Fontes geradas" em `/admin` edita tamanho (9 a 15) e dificuldade por fonte; a próxima geração usa.

**Independent Test**: como admin salvar 13/Difícil, rodar coleta com `fetch` falso num dia sem cruzada e conferir 13 x 13 com "Dificuldade: Difícil" e o prompt pedindo Difícil (quickstart 4).

- [X] T036 [US4] Em `apps/api/src/modules/sources/sources.repository.ts`: `upsertGeneratedSettings(db, { source, gridSize, difficulty })` com `ON CONFLICT (source_id)` (o leitor já existe desde T014)
- [X] T037 [US4] Em `apps/api/src/modules/sources/sources.service.ts`, `sources.schemas.ts` e `sources.routes.ts`: `GET /api/admin/generated` (configuração por fonte; `callsLeft` e `today` entram em T042) e `PUT /api/admin/generated/settings` com `generatedSettingsRequestSchema` via `safeParse` (`400 invalid-input`), atrás de `createRequireAdmin` (404 a não admin), schemas de documentação com `toDocSchema`
- [X] T038 [P] [US4] Teste em `apps/api/src/test/admin-generated-settings.int.test.ts`: admin lê 11/medium, salva 13/hard e lê de volta; `gridSize` 8, 16, 11.5, `difficulty` `'extreme'`, fonte `oglobo` e chave a mais → `400` sem mudar; sem sessão e conta comum → `404`
- [X] T039 [P] [US4] Cliente em `apps/web/src/shared/services/api/generated-sources/generated-sources.ts` (+ teste): `getGeneratedSources()`, `putGeneratedSourceSettings(body)` e `discardGeneratedPuzzle(body)` com os esquemas de `shared`; query key em `apps/web/src/shared/services/api/query-keys/`
- [X] T040 [US4] Hook `apps/web/src/features/admin/hooks/useGeneratedSources/useGeneratedSources.ts` (TanStack Query, invalidação após salvar e descartar) e componente `apps/web/src/features/admin/components/GeneratedSourcesAdmin/GeneratedSourcesAdmin.tsx` (+ `.module.css`, `.test.tsx` com `vitest-axe`): por fonte, campo numérico 9 a 15 "Tamanho da grade", rádios "Dificuldade" (Fácil, Médio, Difícil), `Button` `primary` "Salvar" com `pending`, `Notice ok`/`error`
- [X] T041 [US4] Incluir `GeneratedSourcesAdmin` abaixo de `SourcesAdmin` em `apps/web/src/pages/admin/AdminPage.tsx` e cobrir em `AdminPage.test.tsx`

**Checkpoint**: configuração persistida e usada pela geração seguinte.

---

## Phase 7: User Story 5 - Administrador revisa e descarta a cruzada do dia (Priority: P3)

**Goal**: admin vê respostas e dicas de hoje, chamadas restantes, e descarta enquanto nenhuma conta nem x1 usa.

**Independent Test**: gerar com `fetch` falso, abrir `/admin`, descartar, conferir dia vazio; nova coleta gera outra; com progresso de conta, descartar dá `409` (quickstart 4).

- [X] T042 [US5] Em `apps/api/src/modules/puzzles/puzzles.repository.ts`: `findToday(db, { source, date })` com `puzzleId`, palavras (número, direção, resposta pela solução, dica) e uso (`progress` existe → `'progress'`; `duels` existe → `'duel'`), e `deleteIfUnused(db, { source, date, puzzleId })` que traduz a violação de FK em `in-use`; em `sources.service.ts` completar `GET /api/admin/generated` com `today` e `callsLeft` (3 menos tentativas `PUZZLE_GENERATE` da chave `casa:<hoje>`)
- [X] T043 [US5] Rota `POST /api/admin/generated/discard` em `apps/api/src/modules/sources/sources.routes.ts` com `discardGeneratedRequestSchema`: `200 { discarded: true }`, `404 not-found` se não for a cruzada de hoje daquela fonte gerada, `409 in-use`, `400 invalid-input`, `404` a não admin (`contracts/admin-generated-sources.md`)
- [X] T044 [P] [US5] Teste em `apps/api/src/test/admin-generated-discard.int.test.ts`: `GET` mostra palavras, `discardable` e `callsLeft`; descarte sem uso apaga e o dia fica vazio; com progresso de conta → `409` e `blockedBy: 'progress'`; com x1 → `409` e `blockedBy: 'duel'`; cruzada de ontem ou de outra fonte → `404`; não admin → `404`; descartar não devolve chamadas ao limite
- [X] T045 [US5] Em `GeneratedSourcesAdmin.tsx`: "Chamadas restantes hoje: N", lista Horizontais/Verticais (resposta e dica) ou "Sem cruzada hoje", `Button` `secondary` "Descartar cruzada de hoje" com `Dialog` de confirmação, desabilitado com o motivo (`blockedBy`), e `Notice info` após descartar com `gh workflow run collect.yml` e aviso quando `callsLeft` é 0; testes no `.test.tsx`

**Checkpoint**: erro de conteúdo corrigível sem acesso ao banco.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T046 [P] Conferir `docs/data-definitions/DDE-001`, `DDE-002`, `DDE-008`, `DDE-009` e `docs/entity-relationship-diagrams/ERD-002`, `ERD-008`, `ERD-009` contra a migração final (nomes de coluna, `CHECK`s, linhas iniciais) e ajustar
- [X] T047 [P] Em `docs/deploy.md`: segredo `DEEPSEEK_API_KEY` e variável `DEEPSEEK_MODEL` do GitHub Actions, `GENERATION_ENABLED` só no `collect.yml`, ligar a Casa em `/admin` depois da primeira cruzada, como pausar o gasto (tirar o segredo)
- [X] T048 [P] Atualizar `CLAUDE.md` (seção API/Site): fonte gerada `casa`, `sources/generated/`, sem menção a IA para o jogador, limite `PUZZLE_GENERATE`, `GENERATION_ENABLED`, rotas `/api/admin/generated*`
- [X] T049 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:int` e o roteiro de `specs/064-cruzada-gerada-ia/quickstart.md` (seções 1, 2b, 3 e 4; a 2 só com crédito)
- [X] T050 Rodar `source:check:generated` com chave real nos tamanhos 9 e 15 (o 11 já roda na T032; no máximo 2 chamadas extras); se 15 x 15 não chegar a 19 palavras na maioria das tentativas, ajustar o mínimo em `layout.ts` e registrar em `research.md` R2. Feito com a lista real da T032 nos tamanhos 9 a 15, sem chamada extra; a montagem passou a "melhor primeiro" (R2)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Fase 1 (release A)**: sem dependência; publicada antes da release B entrar em produção.
- **Fase 2**: depois da Fase 1 mergeada; bloqueia todas as histórias.
- **US1 (Fase 3)**: depois da Fase 2.
- **US2 (Fase 4)**: depois da Fase 2; usa `layout` e fixture de US1 (T015, T017).
- **US3 (Fase 5)**: depois de T026 e T029.
- **US4 (Fase 6)**: depois da Fase 2.
- **US5 (Fase 7)**: depois de T037 (rotas e tela de US4).
- **Polish**: depois das histórias desejadas.

### Within Each User Story

- Teste antes ou junto da implementação, no mesmo commit.
- Funções puras (`layout`, `schema`, `prompt`, `blocklist`) antes de `generated.ts`; repositório antes de serviço e rota; rota antes da tela.

### Parallel Opportunities

- T001 e T002; T006, T010, T011, T012 depois de T005/T008.
- US1: T015, T016, T017 juntos; T021 em paralelo.
- US2: T022 e T024 juntos, T023 depois de T022; T031 em paralelo com T026; T032 depois de T031 e T023.
- US4: T038 e T039 em paralelo depois de T037.

---

## Parallel Example: User Story 2

```bash
Task: "T022 normalize.ts + blocklist.ts + testes"
Task: "T024 prompt.ts (buildPrompt) + teste"
# depois de T022:
Task: "T023 schema.ts (cleanWords) + teste"
```

---

## Implementation Strategy

### MVP

1. Fase 1 (release A) publicada.
2. Fase 2 + US1 + US2: Casa gerada e jogável, escondida no painel.
3. US3 antes de cadastrar o segredo na CI (sem ele, a coleta já pula quieta: "sem chave").

### Incremental Delivery

4. US4 (configuração) e US5 (revisão e descarte) no mesmo PR ou em PRs seguintes da 064.
5. Cadastrar `DEEPSEEK_API_KEY`, revisar a primeira cruzada em `/admin`, ligar a Casa.

### Commits

- `fix(shared): ...` (release A); `feat(api): ...`, `feat(web): ...`, `feat(shared): ...` (release B); `docs: ...` para DDE/ERD/deploy; nenhuma linha de atribuição de IA.

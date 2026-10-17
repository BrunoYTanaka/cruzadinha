---

description: "Task list for feature 014: adaptador da fonte Público"
---

# Tasks: Adaptador da fonte Público

**Input**: Design documents from `/specs/014-adaptador-publico/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: obrigatórios. A spec pede testes de contrato do adaptador (FR-017, SC-001, SC-002, SC-004, SC-007), e a constitution exige testes nos adaptadores (IV) e integração com Postgres real (VII). Em cada história, os testes vêm antes da implementação e precisam falhar primeiro.

**Organization**: tarefas agrupadas por história de usuário da spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 (adaptador), US2 (jogar no site, com as rotas), US3 (coleta e verificação real).
- Caminhos relativos à raiz do repositório.

## Regras que valem para todas as tarefas

- Antes de escrever código que usa uma biblioteca (Fastify, Drizzle, Zod, `fast-xml-parser`, React Router, TanStack Query, Vitest, Playwright), consultar a documentação atual pelo Context7 (constitution, Fluxo de Desenvolvimento).
- Sem `any`. Dados externos entram como `unknown` e passam por Zod.
- Comentários em português, no mesmo tom e densidade do código ao redor. Prettier: sem ponto e vírgula, aspas simples, `printWidth` 100.
- Nunca pôr corpo bruto da fonte, texto de dica ou solução em logs, `detail` ou mensagens de erro (FR-010).
- Commits em inglês, Conventional Commits, sem linha de coautoria. Escopos: `shared`, `api`, `web`.

---

## Phase 1: Setup

**Purpose**: branch, dependência nova e fixtures.

- [X] T001 Criar a branch `feat/014-adaptador-publico` a partir de `main` (`git switch -c feat/014-adaptador-publico`).
- [X] T002 Adicionar `fast-xml-parser` às `dependencies` de `apps/api/package.json`. Rodar `npm install fast-xml-parser@5.11.2 -w @cruzadinha/api` e depois deixar a versão no estilo das outras, `"fast-xml-parser": "5.11"`, rodando `npm install` de novo para atualizar o `package-lock.json`. Conferir que `npm ls fast-xml-parser` resolve uma 5.11.x (research R1).
- [X] T003 [P] Criar as fixtures em `apps/api/src/sources/cruzadaonline/fixtures/` (research R11), todas 5 x 5 com palavras e dicas inventadas, copiando a estrutura dos arquivos reais:
  - Estrutura comum:
    - `<?xml version="1.0" encoding="UTF-8"?>`
    - `<crossword-compiler xmlns="http://crossword.info/xml/crossword-compiler">` > `<rectangular-puzzle xmlns="http://crossword.info/xml/rectangular-puzzle" alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ">` > `<metadata>` com `title`, `creator`, `copyright` e `description` vazios > `<crossword>` > `<grid width="5" height="5">` com `<grid-look …/>`.
    - Células `<cell x y solution number?/>` ou `<cell x y type="block"/>`, em ordem por coluna.
    - `<word id x="1-5" y="1"/>`.
    - Dois `<clues ordering="normal">` com `<title><b>HORIZONTAL</b></title>` e `<title><b>VERTICAL</b></title>` e `<clue word number format>texto</clue>`.
  - Arquivos:
    - `daily-valid.xml`: `Ç` e `Ã` na solução; uma dica com `hint-url="https://example.invalid/noticia"`, uma com `&amp;` e uma com `<i>…</i>`.
    - `cdn-error.xml`: `<Error><Code>AccessDenied</Code><Message>Access Denied</Message><RequestId>FICTICIO</RequestId><HostId>FICTICIO</HostId></Error>`.
    - `malformed.xml`: uma tag sem fechar.
    - `changed-shape.xml`: uma `cell` sem `x`.
    - `word-without-clue.xml`: uma palavra sem `clue`.
    - `clue-number-mismatch.xml`: o `number` da dica difere do número da célula inicial.
    - `unsupported-multi-letter.xml`: uma célula com `solution="QU"`.
    - `with-doctype.xml`: `<!DOCTYPE crossword-compiler [<!ENTITY x "XX">]>` e `&x;` numa dica.

  Nenhuma fixture pode reproduzir um puzzle real da fonte (SC-006).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o identificador novo, a regra do banco e o serviço de puzzles com várias fontes. US1 só depende de T004. US2 e US3 dependem desta fase inteira.

**⚠️ CRITICAL**: US2 e US3 não começam antes do checkpoint desta fase.

- [X] T004 Em `packages/shared/src/puzzle/schema.ts`:
  - Trocar `puzzleSourceIdSchema` para `z.enum(['oglobo', 'cruzadaonline'])`.
  - Adicionar `export const puzzleSourceQuerySchema = puzzleSourceIdSchema.default('oglobo')`, com o comentário "fonte não informada vale oglobo, para o site anterior (feature 014)".
  - Adicionar `export const puzzleSourceNames = { oglobo: 'O Globo', cruzadaonline: 'Cruzada Online' } as const satisfies Record<PuzzleSourceId, string>`: é a única fonte dos nomes exibidos, usada pela conversão de cada adaptador, pela linha de comando e pelo site. Trocar o literal `'O Globo'` de `apps/api/src/sources/oglobo/convert.ts` por `puzzleSourceNames.oglobo`.
  - Exportar pelo `packages/shared/src/index.ts`, se o arquivo reexportar nomes um a um.
  - Em `packages/shared/src/puzzle/schema.test.ts`: aceita `cruzadaonline`, recusa `publico`, o `puzzleSourceQuerySchema` devolve `oglobo` para `undefined`, e `puzzleSourceNames` tem exatamente uma entrada para cada valor do enum.
- [X] T005 [P] Em `packages/shared/src/library/schema.ts`, adicionar ao `libraryItemSchema` o campo `source: puzzleSourceIdSchema.default('oglobo')` (data-model §5). Em `packages/shared/src/library/schema.test.ts`: item sem `source` vira `oglobo`, item `cruzadaonline` é aceito e um valor fora do enum é recusado. Atualizar os objetos de teste que comparam com `toEqual`.
- [X] T006 Em `apps/api/src/db/schema.ts`, trocar `puzzleSources` para `['oglobo', 'cruzadaonline'] as const` e a regra para `` check('puzzles_source_check', sql`${table.source} IN ('oglobo', 'cruzadaonline')`) `` (data-model §2).
  - Gerar a migração com `npm run db:generate -w @cruzadinha/api -- --name puzzles_source_cruzadaonline`.
  - Conferir que `apps/api/drizzle/0004_puzzles_source_cruzadaonline.sql` faz `ALTER TABLE "puzzles" DROP CONSTRAINT "puzzles_source_check"` e `ADD CONSTRAINT "puzzles_source_check" CHECK (… IN ('oglobo', 'cruzadaonline'))`, sem nenhuma outra mudança.
  - Se o `drizzle-kit` não emitir a troca, apagar o gerado e criar com `-- --custom --name puzzles_source_cruzadaonline`, escrevendo o SQL à mão e mantendo o snapshot coerente (research R8).
  - Nunca usar `drizzle-kit push`.
- [X] T007 Em `apps/api/src/test/puzzles-repository.int.test.ts`, acrescentar casos:
  - Inserir uma linha `cruzadaonline` funciona.
  - `oglobo` e `cruzadaonline` na mesma data e nível convivem com `puzzle_id` diferentes.
  - Um `INSERT` direto com `source = 'xyz'` falha na regra `puzzles_source_check`.
- [X] T008 Em `apps/api/src/test/fake-source.ts`:
  - `okResult(date, source = 'oglobo')` devolve o puzzle da fixture com `puzzle.source = source` e `attribution.sourceName = puzzleSourceNames[source]`. O par precisa continuar válido por `validatePuzzleWithSolution`.
  - `fakeSource(responses, id = 'oglobo')` passa a aceitar o id.
  - Acrescentar a opção de lançar erro numa data (por exemplo `throwOn?: Set<string>`), para testar exceção do adaptador.
- [X] T009 Em `apps/api/src/modules/puzzles/puzzles.service.ts`, trocar a dependência `source: PuzzleSource` por `sources: readonly PuzzleSource[]` (research R6):
  - `createPuzzlesService` lança `Error('fonte repetida: <id>')` se dois adaptadores tiverem o mesmo `id`.
  - `getByDate(source: PuzzleSourceId, level, date, address)` usa o adaptador do `source` e lança `Error('fonte sem adaptador: <id>')` se não houver. O resto da lógica fica igual: guardado primeiro, futuro → `unavailable`, limite `PUZZLE_FETCH` por endereço comum às fontes, revalidação do par e `insertPuzzleIfAbsent`.
  - `GetPuzzleResult` de falha da fonte ganha `source: PuzzleSourceId`, só para o log.
  - `collect()` devolve `CollectRun = { sources: { source: PuzzleSourceId; report: CollectReport }[] }` (data-model §4):
    - Percorre as fontes na ordem da lista. O `CollectReport` de cada uma é o de hoje.
    - `rate-limited` interrompe só a fonte atual.
    - Uma exceção de `fetchPuzzle` vira `failed: { date, reason: 'source-down' }` daquela data, e a coleta passa para a próxima fonte.
    - A pausa `PAUSE_MS` vale entre quaisquer dois pedidos consecutivos, inclusive entre fontes.
  - Exportar o tipo `CollectRun`.
- [X] T010 Ajustar quem cria o serviço:
  - `apps/api/src/app.ts`: a opção `puzzleSource?: PuzzleSource` vira `puzzleSources?: readonly PuzzleSource[]`, com padrão `[createOgloboSource()]` por enquanto (o `cruzadaonline` entra em T022).
  - `apps/api/src/cli/run-cli.ts`: `CliDeps.source` vira `sources: readonly PuzzleSource[]`. `collectPuzzles` imprime por fonte conforme contracts/cli.md: `Coleta <nome>: N gravados, N já existentes, N indisponíveis, N falhas.` e `Gravados: …` em stdout; `[<nome>] Falhou em <data>: <motivo>` e `[<nome>] Interrompido por limite de uso da fonte; pendentes: …` em stderr. Os nomes vêm de `puzzleSourceNames` (`shared`). A saída é 1 se alguma fonte tiver `failed` ou `stoppedBy`.
  - `apps/api/src/cli.ts`: passa `[createOgloboSource()]` por enquanto (o `cruzadaonline` entra em T034).
  - Helper `apps/api/src/test/app.ts`: troca `puzzleSource` por `puzzleSources`.
  - Rota `apps/api/src/modules/puzzles/puzzles.routes.ts`: chama `getByDate('oglobo', …)` até T021.
- [X] T011 Atualizar os testes de integração para as novas assinaturas e cobrir o serviço com várias fontes:
  - `apps/api/src/test/collect.int.test.ts`:
    - Duas fontes falsas (`oglobo` e `cruzadaonline`): o relatório traz as duas, na ordem.
    - `rate-limited` na primeira não impede a segunda.
    - Exceção na primeira vira `failed` com `source-down` e a segunda segue.
    - Datas já guardadas de uma fonte não contam como guardadas na outra.
    - A pausa é chamada entre os pedidos das duas fontes.
  - `apps/api/src/test/cli.int.test.ts`: linhas de saída por fonte e código de saída.
  - `apps/api/src/test/puzzles.int.test.ts` e os outros que montam a app: só a troca de assinatura.
  - Rodar `npm run typecheck` e `npm run test:int`.

**Checkpoint**: `npm test` e `npm run test:int` verdes, com o comportamento externo da API inalterado.

---

## Phase 3: User Story 1 - Obter um puzzle do Público por data (Priority: P1) 🎯 MVP

**Goal**: o adaptador `cruzadaonline` busca, lê, valida e converte o arquivo do dia, ou devolve o motivo certo (FR-001 a FR-010, FR-017).

**Independent Test**: `cd apps/api && npx vitest run src/sources/cruzadaonline`. As fixtures válidas viram puzzles idênticos ao arquivo, e cada fixture de falha dá o motivo esperado, sem rede.

### Tests for User Story 1 ⚠️

> Escrever antes da implementação e ver falhar.

- [X] T012 [P] [US1] `apps/api/src/sources/cruzadaonline/clue-text.test.ts`, cobrindo `clueText(raw)` (research R3):
  - Remove `<b>`, `<i>` e `</i>`, e troca `<br/>` por espaço.
  - Decodifica `&amp; &lt; &gt; &quot; &apos;`, `&#231;` e `&#xE7;`.
  - Junta espaços repetidos e tira os das pontas.
  - Mantém aspas tipográficas e `(…)`.
  - Devolve `null` para entidade com nome desconhecido (`&nbsp;`) e para texto vazio depois da limpeza.
- [X] T013 [P] [US1] `apps/api/src/sources/cruzadaonline/xml.test.ts`, cobrindo `readXml(text)`:
  - `daily-valid.xml` dá `ok` com `cell`, `word`, `clues` e `clue` sempre como listas.
  - O atributo `word` da dica continua texto, não lista.
  - O conteúdo de `clue` chega cru, com as tags.
  - Os atributos chegam como texto (`width: '5'`) e `&amp;` é decodificado nos atributos.
  - `malformed.xml` dá `{ ok: false }` com `detail` começando por `xml:`, sem trecho do corpo.
- [X] T014 [P] [US1] `apps/api/src/sources/cruzadaonline/convert.test.ts`, cobrindo `convertCrosswordCompiler(doc, 'daily', '2026-10-16')` com as fixtures lidas por `readFileSync` + `readXml` + schema:
  - `daily-valid.xml` dá `ok`, com `source: 'cruzadaonline'`, `level: 'daily'`, a data e `attribution` `{ sourceName: 'Cruzada Online', title: null, author: null, copyright: 'Cruzada Online' }`.
  - Grade 5 x 5 com os blocos e os números do arquivo (`x` = coluna, `y` = linha, base 1 → índice 0).
  - Palavras com direção, início e tamanho; dicas sem `hint-url` e sem marcação.
  - Solução em maiúsculas com `Ç` e `Ã` mantidos e `null` nos blocos; `dates: []`.
  - A parte pública não contém nenhuma letra da solução (SC-004 da feature 003).
  - `word-without-clue.xml` e `clue-number-mismatch.xml` dão `unexpected-format`; `unsupported-multi-letter.xml` dá `unsupported`.
  - Casos montados no próprio teste a partir da fixture válida:
    - Célula repetida, célula faltando e célula fora da grade: `unexpected-format`.
    - `type="void"`: `unsupported`.
    - Palavra com `x` e `y` fixos (uma letra): `unexpected-format`.
    - Palavra com os dois eixos em intervalo: `unexpected-format`.
    - Intervalo decrescente (`"5-1"`): `unsupported`.
    - Duas dicas para a mesma palavra e dica para id inexistente: `unexpected-format`.
    - `format="3"` numa palavra de 5: `unexpected-format`.
    - `format="2,3"`: ignorado, dá `ok`.
- [X] T015 [P] [US1] `apps/api/src/sources/cruzadaonline/cruzadaonline.test.ts`, cobrindo `createCruzadaOnlineSource({ fetch, clock })` com `fetch` falso e relógio fixo em 2026-10-17 (Brasília):
  - Pede exatamente `https://static.publico.pt/s3/files/widgets/crosswords/prd/20261016.xml` uma vez, com `accept` XML.
  - 200 com `daily-valid.xml` dá `ok`.
  - 403 com `cdn-error.xml` e 404 dão `unavailable`.
  - 200 com `cdn-error.xml` dá `unexpected-format`.
  - 429 dá `rate-limited` com um único pedido.
  - 500 e 503 dão `source-down`.
  - `fetch` que rejeita e tempo limite (`AbortSignal`) dão `source-down`.
  - 302 ou 400 dão `unexpected-format` com `detail` `HTTP <status>`.
  - Corpo acima de `maxBytes` (por `content-length` e por tamanho real) dá `unexpected-format` sem ler o XML.
  - `with-doctype.xml` dá `unexpected-format`.
  - `malformed.xml` e `changed-shape.xml` dão `unexpected-format`.
  - Data 2026-10-18 dá `unavailable` sem chamar o `fetch`.
  - Nível inválido e data `16/10/2026` lançam `TypeError` sem pedido.
  - Nenhum `detail` contém texto das fixtures (por exemplo, o texto de uma dica ou `FICTICIO`).
- [X] T016 [P] [US1] Teste de mudança de estrutura (SC-004) em `apps/api/src/sources/cruzadaonline/convert.test.ts`. A partir de `daily-valid.xml`, trocando trechos com `replace`, cada variante precisa deixar de dar `ok`:
  - `<cell` renomeado para `<square`.
  - Atributo `solution` removido de uma célula aberta.
  - `width="5"` trocado por `width="cinco"`.
  - `<clues` removido.
  - `word=` da dica removido.

### Implementation for User Story 1

- [X] T017 [P] [US1] `apps/api/src/sources/cruzadaonline/clue-text.ts`: `export function clueText(raw: string): string | null`, pura, conforme T012.
- [X] T018 [US1] Implementar a leitura, o schema, a conversão e o adaptador, nesta ordem, até T013 a T016 passarem:
  - **Leitura** (`apps/api/src/sources/cruzadaonline/xml.ts`): `readXml(text: string): { ok: true; doc: unknown } | { ok: false; detail: string }`.
    - Primeiro `XMLValidator.validate(text)`. Em erro, devolve `detail: 'xml: <err.code>'`.
    - Depois `new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: false, parseTagValue: false, isArray: (name, _path, _leaf, isAttribute) => !isAttribute && ['cell', 'word', 'clues', 'clue'].includes(name), stopNodes: ['*.clue'] })` (research R1).
  - **Schema** (`crossword-compiler-schema.ts`): Zod do documento lido, conforme data-model §3.
    - `z.object` (descarta atributos desconhecidos como `hint-url`, `grid-look`, `xmlns`).
    - Números vindos de texto validados por `/^[1-9]\d*$/` e transformados em `number`.
    - `x` e `y` da palavra como `/^\d+(-\d+)?$/`.
    - Dica com `#text` opcional (string) mais `word`, `number` e `format?`.
    - Exporta o tipo `CrosswordCompilerDoc`.
  - **Conversão** (`convert.ts`): `convertCrosswordCompiler(doc: CrosswordCompilerDoc, level: Level, date: string): ConvertResult`, pura, no mesmo modelo de `apps/api/src/sources/oglobo/convert.ts` (classe `ConversionError`, `unexpected` e `unsupported`, `puzzleSchema.safeParse` e `validatePuzzleWithSolution` no fim).
    - Regras de research R4.
    - Letras com `toLocaleUpperCase('pt-PT')`; um grafema contado por `Array.from`.
    - `attribution.sourceName = puzzleSourceNames.cruzadaonline`, e `attribution.copyright` = `metadata.copyright` limpo ou, se vazio, `puzzleSourceNames.cruzadaonline`.
    - `metadata.title` e `creator` passam por `clueText` e viram `null` quando vazios; `copyright` também passa por `clueText` antes da regra acima.
    - `detail` só com coordenadas e ids (`cell 3,4: solução ausente`, `word 7: sem dica`).
  - **Adaptador** (`cruzadaonline.ts`): `createCruzadaOnlineSource(options)` conforme contracts/puzzle-source.md e research R5.
    - `id: 'cruzadaonline'`.
    - `BASE_URL = 'https://static.publico.pt/s3/files/widgets/crosswords/prd'`, e a data vira `AAAAMMDD` com `date.replaceAll('-', '')`.
    - `AbortSignal.timeout(timeoutMs)`; padrões `timeoutMs = 10_000` e `maxBytes = 1_048_576`.
    - Datas futuras checadas com `todayInSaoPaulo(clock)` (`apps/api/src/lib/dates.ts`).
    - DOCTYPE detectado por `/<!DOCTYPE/i`.
    - Sem nova tentativa.

**Checkpoint**: `npx vitest run src/sources/cruzadaonline` verde, e `npm run lint` e `npm run typecheck` verdes. O adaptador funciona sozinho, ainda sem ligação com a app.

---

## Phase 4: User Story 2 - Jogar o puzzle do Público no site (Priority: P2)

**Goal**: rotas com `source` (FR-011 a FR-013), escolha da fonte no site (FR-014) e compatibilidade com o site anterior (SC-007).

**Independent Test**: com o seed, `curl '/api/library?source=cruzadaonline'` traz só `cruzadaonline`, e sem `source` traz só `oglobo`. No site, trocar para "Cruzada Online", jogar o de hoje e conferir que o progresso não aparece em "O Globo" (quickstart §3 e §4; `fontes.spec.ts`).

### Tests for User Story 2 (API) ⚠️

- [X] T019 [P] [US2] Testes da rota de puzzles em `apps/api/src/test/puzzles.int.test.ts`, montando a app com `puzzleSources: [fakeSource(…, 'oglobo'), fakeSource(…, 'cruzadaonline')]`:
  - Sem `source`, usa `oglobo` e a resposta é idêntica à de antes da feature.
  - `source=cruzadaonline` chama só a fonte falsa `cruzadaonline` e devolve `puzzle.source: 'cruzadaonline'`.
  - `source=xyz` dá `400 { error: 'invalid-input', fields: ['source'] }`.
  - Data futura com `cruzadaonline` dá 404 sem chamar a fonte.
  - O limite `PUZZLE_FETCH` é comum: buscas alternadas entre as duas fontes somam no mesmo limite e a 31ª responde 429.
  - Puzzle guardado de uma fonte não é devolvido quando se pede a outra.
- [X] T020 [P] [US2] Testes da biblioteca:
  - `apps/api/src/test/library.int.test.ts`, com puzzles das duas fontes no mesmo dia:
    - Sem `source`, só `oglobo`, com `source: 'oglobo'` em cada item.
    - `source=cruzadaonline`, só `cruzadaonline`.
    - Com sessão, o progresso de um puzzle `cruzadaonline` aparece só na lista `cruzadaonline`.
    - Sem sessão, os itens vêm `not_started`, com tempos nulos e `source` presente.
    - `source=xyz` dá 400 com `fields: ['source']`.
    - O limite de 366 vale por fonte.
  - `apps/api/src/modules/library/library.service.test.ts`: `toLibraryItem` e `toPublicLibraryItem` repassam `source`.

### Implementation for User Story 2 (API)

- [X] T021 [US2] Rota e documentação de puzzles:
  - Em `apps/api/src/modules/puzzles/puzzles.routes.ts`, acrescentar `source: puzzleSourceQuerySchema` ao `querySchema` e passar `query.data.source` a `getByDate`.
  - O log de falha passa a `request.log.warn({ source: result.source, reason: result.sourceReason }, …)`.
  - Em `apps/api/src/modules/puzzles/puzzles.schemas.ts`, documentar o parâmetro `source` (enum `oglobo` e `cruzadaonline`, padrão `oglobo`, descrição "Fonte da cruzada; sem ela vale O Globo") com o mesmo helper `toDocSchema` das outras rotas. O `docs.test.ts` precisa continuar verde.
- [X] T022 [US2] Em `apps/api/src/app.ts`, o padrão de `puzzleSources` passa a `[createOgloboSource(), createCruzadaOnlineSource()]`.
- [X] T023 [US2] Biblioteca por fonte:
  - Em `apps/api/src/modules/library/library.repository.ts`, `listPuzzleRows(db, source, limit)` e `listLibraryRows(db, userId, source, limit)` ganham `where(eq(puzzles.source, source))` e selecionam `source: puzzles.source`. `LibraryRow` e `PuzzleRow` ganham `source`. A ordem e o limite ficam iguais, e `data`, `solution` e `cells` continuam fora do `select`.
  - Em `library.service.ts`, `list(userId, source)` e `listPublic(source)`, e `toLibraryItem`/`toPublicLibraryItem` incluem `source`.
  - Em `library.routes.ts`, ler `request.query` com `z.object({ source: puzzleSourceQuerySchema }).safeParse` e, em erro, `sendError(reply, 400, 'invalid-input', ['source'])`.
  - Em `library.schemas.ts`, documentar o `querystring` `source`, incluir `source` nos exemplos e acrescentar a resposta 400 (contracts/api.md).
- [X] T024 [US2] Seed com as duas fontes:
  - Em `apps/api/src/db/seed-puzzle.ts`, `buildSamplePuzzle(source, date)`:
    - Para `oglobo`, como hoje.
    - Para `cruzadaonline`, lê `../sources/cruzadaonline/fixtures/daily-valid.xml` com `readFileSync(new URL(…, import.meta.url))`, passa por `readXml`, pelo schema e por `convertCrosswordCompiler` e põe `attribution.title = 'Exemplo'`.
  - Em `seed-user.ts`, gravar as duas fontes para hoje com `insertPuzzleIfAbsent` e uma linha de saída por fonte, nunca substituindo um puzzle guardado.
  - Atualizar `apps/api/src/test/seed.int.test.ts`.

### Tests for User Story 2 (site) ⚠️

- [X] T025 [P] [US2] `apps/web/src/features/library/source-choice.test.ts`, cobrindo a chave `cruzadinha:source`:
  - Sem valor, `oglobo`.
  - Valor `cruzadaonline` lido.
  - Valor inválido (`publico`, JSON quebrado) vira `oglobo`.
  - `localStorage` que lança não quebra (via `lib/storage.ts`).
  - Gravar e ler de novo devolve o mesmo valor.
- [X] T026 [P] [US2] `apps/web/src/features/library/source-down.test.ts` (novo), com chaves por fonte (data-model §6):
  - `markSourceDown('cruzadaonline')` não afeta `isSourceDown('oglobo')`.
  - Dura 10 min.
  - `markNoPuzzle('cruzadaonline', date)` não marca o mesmo dia em `oglobo`.
- [X] T027 [P] [US2] `apps/web/src/features/library/SourcePicker.test.tsx`:
  - `role="group"` com nome "Fonte da cruzada".
  - Botões "O Globo" e "Cruzada Online", com `aria-pressed="true"` só no ativo.
  - Clique e Enter chamam `onChange` com `cruzadaonline`.
  - Sem violações no `vitest-axe`.
  - Acrescentar o componente em `apps/web/src/components/touch-targets.test.tsx`, se esse teste listar componentes.
- [X] T028 [P] [US2] Em `apps/web/src/features/library/LibraryPage.test.tsx`, com handlers de `src/test/http.ts` que respondem por `source`:
  - Começa em "O Globo" e pede `/api/library?source=oglobo`.
  - Trocar para "Cruzada Online" pede `?source=cruzadaonline`, mantém o mês e grava a preferência.
  - Recarregar com a preferência gravada começa em "Cruzada Online".
  - "Jogar a de hoje" vai para `/jogo/<id>` quando a fonte tem o dia, e senão para `/dia/<hoje>?fonte=cruzadaonline`.
  - Dia buscável aponta para `/dia/<data>?fonte=<fonte>`.
  - O aviso de fonte fora do ar aparece só para a fonte marcada.
  - Visitante: o estado vem do IndexedDB pelo `puzzleId` na fonte escolhida.
  - Itens com `source` diferente do escolhido (API anterior) não aparecem no calendário.
- [X] T029 [P] [US2] Em `apps/web/src/features/library/DayRoute.test.tsx`:
  - `/dia/2026-10-10?fonte=cruzadaonline` pede `source=cruzadaonline`, grava a preferência e navega para `/jogo/<id>`.
  - Sem `fonte`, usa a preferência.
  - `fonte=xyz` usa a preferência.
  - Resposta com `puzzle.source: 'oglobo'` quando se pediu `cruzadaonline` mostra "Esta fonte não está disponível agora", não navega e não grava no cache.
  - 404 e 502 marcam só a fonte pedida.

### Implementation for User Story 2 (site)

- [X] T030 [US2] Cliente HTTP e chaves:
  - Em `apps/web/src/api/puzzles.ts`, `getPuzzleByDate(source: PuzzleSourceId, date)` monta `/api/puzzles?level=daily&date=<date>&source=<source>`.
  - Em `apps/web/src/api/library.ts`, `getLibrary(source)` usa `/api/library?source=<source>`.
  - Em `apps/web/src/api/query-keys.ts`, `library(viewer, source)` → `['library', viewer, source]` e `puzzleByDate(source, date)` → `['puzzle-by-date', source, date]`; `libraryAll` continua `['library']`.
  - Em `apps/web/src/test/fixtures.ts`, `source` nos itens e puzzles de exemplo. Em `apps/web/src/test/http.ts`, handlers que levam `source` em conta.
- [X] T031 [US2] Preferência e avisos:
  - `apps/web/src/features/library/source-choice.ts` (novo):
    - `SOURCE_KEY = 'cruzadinha:source'`.
    - `loadSourceChoice(): PuzzleSourceId` (Zod `puzzleSourceIdSchema`, padrão `oglobo`) e `saveSourceChoice(source)`, no estilo de `library-width.ts`.
    - `useSourceChoice(): [PuzzleSourceId, (source) => void]` com `useState(loadSourceChoice)`.
    - Os rótulos vêm de `puzzleSourceNames` (`shared`), sem nomes escritos no site.
  - Em `apps/web/src/features/library/source-down.ts`:
    - `markSourceDown(source, now?)`, `clearSourceDown(source)` e `isSourceDown(source, now?)` com a chave `cruzadinha:source-down:<source>`.
    - `markNoPuzzle(source, date)`, `isNoPuzzle(source, date)` e `readNoPuzzleDates(source, dates)` com `cruzadinha:no-puzzle:<source>:<date>`.
    - A chave antiga não é lida.
- [X] T032 [US2] Seletor, calendário e dia:
  - `apps/web/src/features/library/SourcePicker.tsx` e `SourcePicker.module.css` (novos), conforme contracts/ui.md: `role="group"`, `aria-label="Fonte da cruzada"`, dois `Button` com `aria-pressed`, só tokens de tema e alvo de toque mínimo.
  - Em `LibraryPage.tsx`:
    - Usar `useSourceChoice()` e a consulta `queryKeys.library(viewerKey, source)` com `libraryFor(viewer, source)`.
    - Filtrar `items` por `item.source === source`.
    - Ler `readNoPuzzleDates(source, monthDates)` e `isSourceDown(source)`.
    - Mostrar o seletor acima do `Calendar` (também durante o carregamento).
    - "Jogar a de hoje" vai para `/dia/<hoje>?fonte=<source>` quando falta o dia.
    - O subtítulo passa a "Uma cruzada por dia de cada fonte.".
  - Em `Calendar.tsx` e `DayCell.tsx`, receber `source` e montar o link do dia buscável como `/dia/<data>?fonte=<source>`. O link de `/jogo/<id>` não muda.
  - Em `DayRoute.tsx`:
    - Ler `fonte` com `useSearchParams` e validar com `puzzleSourceIdSchema`. Se for válido, `saveSourceChoice`; senão, `loadSourceChoice()`.
    - `queryKeys.puzzleByDate(source, date)` e `getPuzzleByDate(source, date)`.
    - Se `data.puzzle.source !== source`, mostrar o `ErrorState` "Esta fonte não está disponível agora" com `BackLink`, sem `setQueryData` e sem navegar.
    - `markNoPuzzle(source, date)` e `markSourceDown(source)` ou `clearSourceDown(source)`.
  - Em `apps/web/src/features/game/GamePage.tsx`, `attribution(puzzle)` deixa de repetir partes iguais (mantém a primeira ocorrência), para "Fonte: Cruzada Online" não virar "Fonte: Cruzada Online · Cruzada Online". Em `GamePage.test.tsx`: com `sourceName` e `copyright` iguais a "Cruzada Online", a linha é exatamente "Fonte: Cruzada Online"; com o puzzle do O Globo, a linha não muda.
- [X] T033 [US2] E2E `apps/web/e2e/fontes.spec.ts` (novo), no modelo de `visitante.spec.ts` e com o seed (T024):
  - O visitante abre `/`, escolhe "Cruzada Online" e clica em "Jogar a de hoje".
  - Vê "Fonte: Cruzada Online" e digita uma letra.
  - Digita `Ç` na célula da fixture que tem `Ç` na solução e usa a ajuda "verificar": a letra não é marcada como errada (US2, cenário 6).
  - Volta ao calendário: hoje está em andamento em "Cruzada Online" e não iniciado em "O Globo".
  - Recarrega e "Cruzada Online" continua escolhido.
  - Ajustar `apps/web/e2e/support.ts` se precisar de helpers.

**Checkpoint**: `npm test`, `npm run test:int` e `npm run test:e2e -w @cruzadinha/web` verdes. As duas fontes podem ser jogadas no site, e o site anterior continua funcionando contra a API nova (T019 e T020, casos sem `source`).

---

## Phase 5: User Story 3 - Coleta diária e verificação sob demanda (Priority: P3)

**Goal**: a coleta agendada salva o Público, e o autor confere a fonte real (FR-015, FR-016, SC-003).

**Independent Test**: `npm run test:int` com o relatório por fonte (T011). Depois, manualmente, `npm run source:check:cruzadaonline -w @cruzadinha/api -- 2024-01-01 2025-01-01 2026-01-01 2026-09-01 2026-10-16`.

- [X] T034 [US3] Em `apps/api/src/cli.ts`, passar `sources: [createOgloboSource(), createCruzadaOnlineSource()]` ao `runCli`. Conferir que `.github/workflows/collect.yml` não precisa mudar (continua `node apps/api/dist/cli.mjs puzzles collect`) e que `npm run build -w @cruzadinha/api` inclui `fast-xml-parser` como dependência externa, instalada pelo `npm ci --omit=dev` do `apps/api/Dockerfile`.
- [X] T035 [P] [US3] `apps/api/src/sources/cruzadaonline/check.ts` (novo) e o script `"source:check:cruzadaonline": "tsx src/sources/cruzadaonline/check.ts"` em `apps/api/package.json`, conforme contracts/cli.md e contracts/source-check.md:
  - Argumentos `[AAAA-MM-DD ...] [--save]`; sem data, usa hoje em Brasília.
  - Até 10 datas; mais que isso ou data inválida → uso no stderr e saída 2.
  - Pausa de 2 s entre pedidos; para no primeiro `rate-limited`, listando as datas não consultadas.
  - Uma linha por data (`<data>  ok  <L>x<A>  <n> palavras` ou `<data>  <motivo>  <detail>`).
  - `--save` grava o corpo bruto em `apps/api/.source-samples/cruzadaonline-<data>.xml` (conferir que a pasta continua no `.gitignore`).
  - Saída 0 se todas forem `ok` ou `unavailable`, senão 1.
  - O arquivo fica fora do bundle (não é importado por `server.ts` nem por `cli.ts`).
- [X] T036 [US3] (manual, autor; faz pedidos reais) Rodar `npm run source:check:cruzadaonline -w @cruzadinha/api -- 2024-01-01 2025-01-01 2026-01-01 2026-09-01 2026-10-16 --save` e registrar em `specs/014-adaptador-publico/findings.md`, no formato de `specs/003-adaptador-oglobo/findings.md`:
  - O resultado por data, que precisa dar 5 `ok` (SC-003).
  - Dimensões e número de palavras.
  - Atributos ou elementos não previstos nos corpos salvos.
  - Uma data futura dá `unavailable` (`data no futuro`) sem nenhum pedido, e 2023-01-01 dá `unavailable` com `HTTP 403`.

  Se algum arquivo real não converter, ajustar o schema ou a conversão e acrescentar uma fixture reduzida que reproduza o caso.

**Checkpoint**: a coleta grava as duas fontes, e a verificação real confirma 5 datas.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T037 [P] Atualizar `CLAUDE.md`:
  - Acrescentar a feature 014 em "Current state": fonte `cruzadaonline` (Público, XML do Crossword Compiler em `sources/cruzadaonline/`), `source` opcional nas rotas com padrão `oglobo`, coleta por fonte e seletor de fonte no calendário com `cruzadinha:source`.
  - Em "Commands", acrescentar `source:check:cruzadaonline` e a saída por fonte de `puzzles collect`.
  - Em "Architecture", acrescentar `sources/cruzadaonline/` e o `sources[]` do serviço de puzzles.
- [X] T038 [P] Conferir `docs/design.md` e `docs/deploy.md`: mencionar a segunda fonte e a atribuição "Cruzada Online" onde o texto fala de "a fonte" no singular, sem reescrever o resto.
- [X] T039 Rodar e deixar verdes `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:int` e `docker build -f apps/api/Dockerfile .`.
- [X] T040 Seguir `specs/014-adaptador-publico/quickstart.md` (§2 a §4) num banco local recriado e corrigir qualquer divergência. Os commits seguem `feat(shared)`, `feat(api)` e `feat(web)` em inglês, por exemplo `feat(api): add cruzadaonline puzzle source`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende de T001. T004 e T005 primeiro (shared); T006 e T007 (banco); T008 a T011 (serviço).
- **US1 (Phase 3)**: depende de T002, T003 e T004. Pode começar em paralelo com T005 a T011.
- **US2 (Phase 4)**: depende da Phase 2 inteira e de US1 (T022 cria o adaptador na app; T024 usa a conversão).
- **US3 (Phase 5)**: depende da Phase 2 (relatório por fonte) e de US1. Não depende de US2.
- **Polish (Phase 6)**: depois das histórias desejadas.

### Within Each User Story

- Testes antes e falhando, depois a implementação.
- US1: T017 (clueText) → T018 (leitura, schema, conversão, adaptador).
- US2, API: T021 → T022 → T023 → T024. Site: T030 → T031 → T032 → T033.
- US3: T034 → T036; T035 em paralelo com T034.

### Parallel Opportunities

- T003 em paralelo com T002.
- T005 em paralelo com T004 (arquivos diferentes, os dois em `shared`).
- Testes de US1 (T012 a T016) em paralelo entre si.
- Testes de US2 (T019, T020, T025 a T029) em paralelo entre si. A parte da API (T021 a T024) e a do site (T030 a T032) podem andar em paralelo depois dos testes.
- US3 (T034 e T035) em paralelo com US2.
- T037 e T038 em paralelo.

---

## Parallel Example: User Story 1

```text
Task: "T012 [US1] clue-text.test.ts"
Task: "T013 [US1] xml.test.ts"
Task: "T014 [US1] convert.test.ts"
Task: "T015 [US1] cruzadaonline.test.ts"
```

## Parallel Example: User Story 2

```text
Task: "T019 [US2] puzzles.int.test.ts (source)"
Task: "T020 [US2] library.int.test.ts (source)"
Task: "T025 [US2] source-choice.test.ts"
Task: "T027 [US2] SourcePicker.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 e T004.
2. Phase 3 (US1): o adaptador converte as fixtures e responde os motivos certos, sem rede.
3. **Parar e validar**: `npx vitest run src/sources/cruzadaonline`. Opcionalmente, rodar T035 e T036 antes para confirmar contra a fonte real.

### Incremental Delivery

1. Setup + Foundational: a API se comporta igual, com o serviço pronto para várias fontes.
2. US1: adaptador testado.
3. US2: rotas com `source` (a API fica pronta para o site consumir) e depois o site.
4. US3: coleta das duas fontes e verificação real.
5. Polish e PR único para `main` (plan.md, Ordem de entrega).

### Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Commitar por tarefa ou grupo lógico; o pre-push roda `typecheck` e os testes unitários.
- O adaptador nunca é chamado contra a rede real em teste, CI ou `collect` local sem intenção.

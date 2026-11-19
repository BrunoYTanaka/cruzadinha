---
description: 'Task list for 065 — Casa com grade densa (estilo O Globo)'
---

# Tasks: Casa com grade densa (estilo O Globo)

**Input**: Design documents from `specs/065-cruzada-densa/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: incluídos. FR-016 e a constituição (V, VII) pedem testes da lógica pura e do adaptador; cada regra nova começa por um teste que falha.

**Organization**: por história da spec. US1 e US2 são P1; US3 é P2; US4 é P3. Todos os caminhos são relativos à raiz do repositório; `generated/` = `apps/api/src/sources/generated/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história da spec (US1 a US4)

---

## Phase 1: Setup

**Purpose**: dependência, scripts e ignores da lista de palavras

- [X] T001 Consultar no Context7 a doc atual de `hunspell-asm` (`loadModule`, `mountBuffer`, `create`, `spell`), de `tsdown` (como `import()` dinâmico vira chunk separado) e da DeepSeek (`/chat/completions`, `response_format`, `temperature`, nome do modelo); anotar o que mudar em `specs/065-cruzada-densa/research.md` (R3) e `contracts/clue-request.md`
- [X] T002 Adicionar `hunspell-asm@4.0.2` como `devDependency` exata e os scripts `"words:build": "tsx src/sources/generated/words/build.ts"` e `"words:measure": "tsx src/sources/generated/words/measure.ts"` em `apps/api/package.json`; rodar `npm install` para atualizar `package-lock.json`
- [X] T003 [P] Ignorar `apps/api/.word-sources/` em `.gitignore` e `apps/api/src/sources/generated/words/word-list.data.ts` em `.prettierignore` e nos `ignores` de `eslint.config.mjs`; os scripts ficam em `apps/api/src/sources/generated/words/` (já cobertos pelo `tsconfig` e pelo lint da API, como `check.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: lista de palavras no repositório e pedido de dicas; todas as histórias dependem disso

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

- [X] T004 Escrever `apps/api/src/sources/generated/words/build.ts` conforme `specs/065-cruzada-densa/contracts/word-list-build.md`: baixar com `fetch` para `apps/api/.word-sources/` (reaproveitar se existir) `pt_br_50k.txt` de `hermitdave/FrequencyWords` e `pt_BR.aff`/`pt_BR.dic` de `LibreOffice/dictionaries`, cada URL com commit fixo numa constante; ler a frequência em ordem (posição = linha, BOM removido); manter a palavra só se for toda `[a-zàáâãéêíóôõúüç]`, tiver 3 a 15 letras depois de `plain()`, o Hunspell (`hunspell-asm`) a aceitar, `plain()` não estiver em `excluded.txt` nem `isBlockedAnswer` (`generated/blocklist.ts`) a recusar; deduplicar por `plain()` ficando a primeira (mais frequente); faixa `1` se posição ≤ 15 000, `2` se ≤ 30 000, `3` senão; gravar `generated/words/word-list.data.ts` com o cabeçalho do contrato e a constante `WORD_LIST` (texto com uma linha `PLAIN<tab>forma<tab>faixa` por palavra, em ordem de frequência); imprimir totais por comprimento e faixa e quantas palavras cada filtro tirou. Saída idêntica byte a byte numa segunda execução
- [X] T005 [P] Criar `apps/api/src/sources/generated/words/excluded.txt` (uma palavra sem acento por linha; `#` inicia comentário; cabeçalho explicando o uso, research R4), vazio de entradas por enquanto
- [X] T006 [P] Criar `generated/words/NOTICE.md` com a atribuição: FrequencyWords (Hermit Dave; conteúdo CC BY-SA 4.0, código MIT; commit fixo), LibreOffice dictionaries pt_BR / projeto VERO (LGPLv3 e MPL; commit fixo); a lista derivada fica sob CC BY-SA 4.0
- [X] T007 Rodar `npm run words:build -w @cruzadinha/api` e versionar `generated/words/word-list.data.ts` (esperado ~35 mil palavras; T032 refaz com a curadoria)
- [X] T008 [P] Teste em `generated/words/word-list.test.ts` com um texto inventado no formato `PLAIN\tforma\tfaixa` (não a lista real): `parseWordList` devolve as entradas na ordem; `wordsFor({ maxBand, exclude })` filtra por faixa e por um conjunto de `plain`; linha malformada falha (erro, não entrada silenciosa)
- [X] T009 Implementar `generated/words/word-list.ts`: tipo `WordEntry = { plain: string; form: string; band: 1 | 2 | 3 }`, `parseWordList(text)`, `wordsFor(list, { maxBand, exclude })` e `loadWordList()` que faz `import('./word-list.data')` dinâmico e guarda o resultado em memória (só a coleta carrega; o servidor nunca)
- [X] T010 [P] Teste em `generated/prompt.test.ts` (substituir os casos de `buildPrompt`): `buildCluePrompt({ answers: [{ n: 1, form: 'água' }, …], difficulty })` gera a mensagem `system` fixa de `contracts/clue-request.md` e a `user` com `Dificuldade: <DIFFICULTY_TEXT>` e uma linha `n. forma` por resposta; nenhuma data nem lista de respostas recentes
- [X] T011 Trocar `buildPrompt`/`wordCount` por `buildCluePrompt` em `generated/prompt.ts` conforme `specs/065-cruzada-densa/contracts/clue-request.md` (manter `DIFFICULTY_TEXT`)
- [X] T012 Em `generated/client.ts`, renomear `requestWords` para `requestClues` e trocar a validação do conteúdo para `clueOutputSchema` (T013); manter HTTP, timeout de 180 s, `max_tokens` 6000, tratamento de `402` (`no-credits`), recusa e queda; `temperature` 1.0 (contrato); ajustar `generated/client.test.ts`
- [X] T013 Em `generated/schema.ts`, trocar `modelOutputSchema` por `clueOutputSchema = z.object({ clues: z.array(z.object({ n: z.unknown(), clue: z.unknown() })) })` (chaves extras ignoradas); a validação item a item fica em `cleanClues` (T024 cria a versão mínima, T036 completa)
- [X] T014 Adaptar `generated/check.ts` (não depende do preenchimento): sortear com semente da data `--count=20` respostas da lista real (`loadWordList`, faixa da `--difficulty`), pedir as dicas reais com `requestClues`/`buildCluePrompt`, imprimir respostas e dicas e, com `--save`, gravar em `apps/api/.source-samples/` o pedido (respostas numeradas) e a resposta
- [X] T015 **Dono** roda `npm run source:check:generated -w @cruzadinha/api -- --difficulty=easy --save` com a própria `DEEPSEEK_API_KEY`; reduzir a resposta a ~20 dicas, sem `id` nem `usage`, e substituir `generated/fixtures/deepseek-response.json` (com as respostas do pedido ao lado em `generated/fixtures/deepseek-request-answers.json`)
- [X] T016 Reescrever o teste de contrato em `generated/contract.test.ts` com a fixture de T015: passa por `chatCompletionSchema` e `clueOutputSchema` (e por `cleanClues` quando T036 existir). T012, T013, T014–T016 ficam no mesmo commit: o contrato antigo (lista de palavras) não pode ficar quebrado no `pre-push` nem na CI (constituição II e IV)

**Checkpoint**: lista carregável, pedido de dicas pronto e contrato com resposta real

---

## Phase 3: User Story 1 - Jogar uma Casa densa como a do O Globo (Priority: P1) 🎯 MVP

**Goal**: a coleta salva uma Casa com grade densa, simétrica e toda cruzada

**Independent Test**: com o modelo simulado, gerar a Casa de um dia e conferir na cruzada salva simetria, toda branca em duas palavras de 3+ letras, ≤ 25% de pretas, tudo ligado; jogar no site até a conclusão

### Tests for User Story 1

- [X] T017 [P] [US1] Teste em `generated/template.test.ts`: para cada N de 9 a 15 e 20 sementes, `makeTemplate(N, random, { maxSlot: 7 })` devolve grade com `black[r][c] === black[N-1-r][N-1-c]`, pretas ≤ 25% das casas, toda corrida horizontal e vertical com 3 a 7 letras, brancas ligadas; mesma semente → mesma grade; `slotsOf(template)` lista cada casa branca em exatamente uma corrida horizontal e uma vertical
- [X] T018 [P] [US1] Teste em `generated/fill.test.ts` com desenho fixo pequeno e lista inventada em `generated/fixtures.ts` (não a lista real): `fill` devolve uma palavra por corrida, mesma letra em todo cruzamento, nenhuma `plain` repetida; sem solução possível devolve `null`; respeita `nodeBudget` (devolve `null` ao esgotar) e o prazo do `Clock` injetado; mesma semente → mesmo resultado
- [X] T019 [P] [US1] Teste em `generated/fill-real-list.test.ts` com a lista real (`loadWordList`) e semente fixa: `generateGrid({ size: 9, maxBand: 3, … })` fecha a grade só com orçamento de nós (sem relógio real, determinístico)

### Implementation for User Story 1

- [X] T020 [US1] Implementar `generated/template.ts`: `makeTemplate(size, random, { maxSlot, maxBlackRatio = 0.25 })` como em research R6 (todo branco; pares simétricos sorteados; recusa par que cria corrida de 1 ou 2; proporção alvo sorteada entre 19% e 25%; aceita só se corridas 3..`maxSlot` e brancas ligadas; repete até 2000 vezes, senão `null`) e `slotsOf(template)` com direção, início, comprimento e casas
- [X] T021 [US1] Implementar `generated/fill.ts`: índice por comprimento e (posição, letra) com conjuntos de bits; MRV; candidatas em ordem de frequência com ruído da semente, no máximo 60 por corrida; forward checking nas corridas cruzadas; `used` por `plain`; `fill(template, words, { random, nodeBudget, deadline, clock })`; e `generateGrid({ size, words, random, clock, timeLimitMs: 20_000, maxSlot: 7 })` que troca de desenho ao esgotar o orçamento até o prazo (research R7)
- [X] T022 [US1] Adaptar `toPuzzle` em `generated/layout.ts` para receber a grade preenchida (`FilledGrid` + dica por corrida) com letras `plain` na solução; tirar `layout`, `layoutOnce`, `crossings`, `put`, `minWords` e `ATTEMPTS`; manter `seededRandom` e `seedFrom`; reescrever `generated/layout.test.ts` para `toPuzzle` (numeração em ordem de leitura, `puzzleSchema` e `validatePuzzleWithSolution` passam, atribuição `sourceName` = nome da fonte e `title` = `Dificuldade: …`, sem menção a IA, modelo ou provedor — FR-012)
- [X] T023 [US1] Em `generated/fixtures.ts`, trocar `SAMPLE_WORDS` por: lista inventada pequena + desenho fixo (para T018) e `buildSamplePuzzle({ source, date, size, difficulty, seed })`, que preenche com a lista real e semente fixa e põe dicas inventadas `Dica de exemplo n` (nunca uma resposta real do modelo)
- [X] T024 [US1] Reescrever o fluxo de `generate` em `generated/generated.ts` (research R9). Nova opção injetável `loadWords: () => Promise<WordEntry[]>` em `GeneratedSourceOptions` (padrão `loadWordList`), para os testes passarem uma lista inventada. Passos: ler a configuração; carregar a lista; para cada tentativa até `GENERATION_DAILY_CALLS`, (1) `generateGrid` com a semente `seedFrom` de `today:attempt`; (2) se a grade não fechar, a tentativa falha com `reason: 'unexpected-format'` e `detail: 'grade não preenchida'`, sem chamar `reserveCall`; (3) senão `reserveCall`: se o limite estiver esgotado e nenhuma chamada foi reservada nesta execução, `skip('limite do dia')`, e se alguma já foi, devolve a última falha (troca o `attempt === 1` da 064, que deixaria de valer quando uma tentativa falha antes de reservar); (4) `requestClues` com `buildCluePrompt`; (5) `cleanClues`, criado em `generated/schema.ts` na versão mínima (uma dica por `n`, nenhum faltando; T036 completa as regras); (6) `toPuzzle`. Manter `sem chave`, `geração desligada`, `sem créditos` e recusa como na 064; nenhuma resposta da grade em `detail`
- [X] T025 [US1] Reescrever `generated/generated.test.ts` para o fluxo novo (fetch injetado com dicas inventadas): sucesso salva grade densa; grade não preenchida não chama `reserveCall` nem `fetch`; `402` para na hora; limite esgotado pula quieto; três tentativas falhas devolvem a última falha
- [X] T026 [US1] Trocar `layout(SAMPLE_WORDS…)` por `buildSamplePuzzle` em `apps/api/src/seed/seed-puzzle.ts`, `apps/api/src/test/admin-generated.int.test.ts`, `apps/api/src/test/puzzles-repository.int.test.ts` e `apps/api/src/test/generated-collect.int.test.ts` (respostas esperadas tiradas da solução do puzzle de exemplo); rodar `npm run test:int`

**Checkpoint**: Casa densa gerada, salva e jogável (MVP)

---

## Phase 4: User Story 2 - Palavras reais na dificuldade escolhida (Priority: P1)

**Goal**: respostas só da lista, na faixa da dificuldade, sem lixo, sem bloqueadas e sem repetir longas de 30 dias

**Independent Test**: gerar com a mesma semente em Fácil e Difícil; toda resposta está na lista; Fácil só faixa 1; nenhuma de 5+ letras dos últimos 30 dias

### Tests for User Story 2

- [X] T027 [P] [US2] Teste em `generated/generated.test.ts`: em Fácil toda resposta salva tem `band` 1; com `recentAnswers` devolvendo uma palavra de 3 letras e outra de 6 da lista, só a de 6 fica de fora; com `loadWords` injetando uma lista que contém uma resposta que `isBlockedAnswer` recusa, ela nunca entra (filtro em tempo de execução, mesmo que esteja na lista)
- [X] T028 [P] [US2] Teste em `generated/fill.test.ts`: quando a faixa pedida não fecha em metade do prazo (lista inventada pequena demais), `generateGrid` tenta a faixa seguinte e fecha; sem faixa seguinte devolve `null`

### Implementation for User Story 2

- [X] T029 [US2] Em `generated/generated.ts`, montar as palavras da tentativa: `maxBand` por dificuldade (`easy` → 1, `medium` → 2, `hard` → 3), excluir `plain` de `recentAnswers` só com 5+ letras (clarificação 4) e excluir `isBlockedAnswer`; tirar `avoid` do pedido; atualizar o comentário de `recentAnswers` em `GeneratedSourceOptions`
- [X] T030 [US2] Em `generated/fill.ts`, `generateGrid` com `bands` em ordem: usa a faixa pedida até metade do prazo e, se não fechar, alarga para a seguinte (research R5)
- [X] T031 [US2] Curadoria (research R4): revisar todas as palavras de 3 e 4 letras de `word-list.data.ts` e uma amostra de 300 das demais; pôr em `apps/api/src/sources/generated/words/excluded.txt` siglas, nomes próprios, estrangeirismos, onomatopeias e gírias sem dicionário (ex.: `MCA`, `JINX`, `KUNG`, `SINS`, `CRIS`, `LUX`, `ATM`, `SIE`, `MOO`); listar ao dono uma amostra do resultado para conferência
- [X] T032 [US2] Rodar de novo `npm run words:build -w @cruzadinha/api` com a curadoria e versionar `generated/words/word-list.data.ts`
- [X] T033 [US2] Escrever `apps/api/src/sources/generated/words/measure.ts` (quickstart passo 3): para N em 9, 11, 13, 15 e cada dificuldade, 30 datas com `generateGrid` real e `systemClock`; imprimir fechadas/30, palavras (média, mínimo), % de pretas e tempo (médio, máximo)
- [X] T034 [US2] Rodar `npm run words:measure -w @cruzadinha/api`; se alguma combinação ficar abaixo de 29/30 (SC-003), passar de 11 x 11 com menos de 28 palavras (SC-001) ou de 30 s (SC-004), ajustar `maxSlot` (até 8 em 13 e 15), cortes de faixa ou orçamento de nós, e anotar os números finais em `specs/065-cruzada-densa/research.md` (R5–R7)

**Checkpoint**: palavras reais e na dificuldade, metas medidas

---

## Phase 5: User Story 3 - Dicas escritas pelo modelo para a grade pronta (Priority: P2)

**Goal**: uma dica válida por resposta; qualquer falha descarta a tentativa

**Independent Test**: modelo simulado com dicas válidas, uma faltando, uma com a resposta e uma bloqueada; só o primeiro caso salva. (O pedido real e o contrato ficaram na fase 2: T014–T016.)

### Tests for User Story 3

- [X] T035 [P] [US3] Teste em `generated/schema.test.ts` (substituir os casos de `cleanWords`): `cleanClues(items, answers)` aceita uma dica por `n`; recusa (`null` + motivo) quando falta `n`, sobra `n`, `n` repetido ou fora da lista, dica com menos de 3 ou mais de 120 caracteres depois de `trim` e espaços colapsados, com `<`, `>`, `http` ou `www`, que contém a resposta sem acento, ou com termo de `isBlocked`

### Implementation for User Story 3

- [X] T036 [US3] Completar `cleanClues` em `generated/schema.ts` (contrato `clue-request.md`) e incluí-lo no teste de contrato de T016: devolve as dicas na ordem de `n` ou a falha com `detail` `dicas incompletas` ou `dica inválida` (sem texto da dica nem da resposta); usar em `generated/generated.ts` (falha conta a tentativa, próxima tentativa preenche outra grade)

**Checkpoint**: dicas validadas por completo

---

## Phase 6: User Story 4 - Admin revê a cruzada densa (Priority: P3)

**Goal**: `/admin` mostra todas as palavras da Casa densa e o descarte segue a 064

**Independent Test**: com uma Casa densa salva, `GET /api/admin/generated` traz todas as horizontais e verticais e o descarte funciona

- [X] T037 [US4] Em `apps/api/src/test/admin-generated.int.test.ts`, conferir que `today.words` tem uma entrada por palavra do puzzle denso de exemplo (horizontais e verticais), com `answer` sem acento; descarte e `409 in-use` como antes
- [X] T038 [P] [US4] Conferir no site local (quickstart passo 5) que "Fontes geradas" em `/admin` lista as ~30–85 palavras sem quebrar o layout (nenhum código do site deve mudar; se mudar, vira tarefa nova)

**Checkpoint**: painel correto com a grade densa

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T039 [P] Atualizar a linha da Casa em `CLAUDE.md` ("Generated source `casa`"): grade densa preenchida por `fill` com a lista `words/word-list.data.ts` (Hunspell ∩ FrequencyWords, `words:build`), modelo só escreve dicas, letras sem acento, 30 dias só para 5+ letras; comandos `words:build`/`words:measure` na seção Commands
- [X] T040 [P] Marcar em `specs/064-cruzada-gerada-ia/research.md` (R1, R2, R3, R14) e `specs/064-cruzada-gerada-ia/contracts/deepseek-request.md` que a 065 substituiu essas decisões (link para `specs/065-cruzada-densa/`)
- [X] T041 Rodar `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`; conferir que `apps/api/dist/server.mjs` não contém a lista de palavras (só um chunk à parte carregado pela coleta)
- [X] T042 Rodar `npm run test:int` e os passos 1 a 3 e 5 de `specs/065-cruzada-densa/quickstart.md`; conferir com `git diff main --stat` que o caminho de leitura (`apps/api/src/modules/puzzles/`, `packages/shared/src/puzzle/`) não mudou, para as Casas antigas continuarem jogáveis (FR-013)
- [ ] T043 **Dono**, depois da release: revisar as 7 primeiras Casas densas em `/admin` e marcar respostas inventadas ou desconhecidas para a dificuldade (SC-005); cada uma vira entrada em `excluded.txt` + `words:build`

---

## Phase 8: Reparo das dicas (clarificação 2026-11-19)

- [X] T044 Em `generated/schema.ts`, `cleanClues` devolve também as dicas válidas (`valid`) e os números a repetir (`retry`); testes em `schema.test.ts` e `contract.test.ts` (resposta real: `tragam` cai em `retry`)
- [X] T045 Em `generated/prompt.ts`, regra do sistema: a dica não pode conter a palavra em nenhuma forma; teste em `prompt.test.ts`
- [X] T046 Em `generated/generated.ts`, reparo: com `retry` não vazio, `reserveCall` e novo pedido só com essas palavras; sucesso junta as dicas, falha ou sem chamada sobrando derruba a tentativa; testes em `generated.test.ts`
- [X] T047 Em `generated/fill.ts`, `fill` aceita `preassigned` e `banned`, e `refillRegion` preenche só a região da palavra recusada (até 4 níveis); `generated.ts` usa a troca local no reparo e cai no pedido repetido se a região não fechar; o prompt volta a proibir a palavra em qualquer forma; testes em `fill.test.ts`, `fill-real-list.test.ts` e `generated.test.ts`
- [X] T048 Linha de diagnóstico por tentativa (`log` em `GeneratedSourceOptions` e `createGeneratedSources`, ligado ao stdout em `cli.ts`): passos e contagens, sem palavras nem dicas; teste em `generated.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (1) → Foundational (2) → US1 (3) → US2 (4) e US3 (5) → US4 (6) → Polish (7)
- US2 e US3 dependem de US1 (`generated.ts`, `fill.ts` reescritos) e podem andar em paralelo entre si, exceto em `generated/generated.ts` (T029 e T036 tocam o mesmo arquivo: fazer em sequência)
- T015 depende do dono e de T014; T016 depende de T015. É o único ponto que espera o dono: pedir cedo, logo depois de T014

### Within Each User Story

- Testes antes da implementação, falhando primeiro
- `template` → `fill` → `toPuzzle` → `generated` → seed/integração

### Parallel Opportunities

- T003, T005, T006 juntos; T008 e T010 juntos
- T017, T018, T019 juntos (arquivos de teste diferentes)
- T027 e T028 juntos; T035 em paralelo com a fase 4
- T039 e T040 juntos

## Parallel Example: User Story 1

```text
T017 template.test.ts   T018 fill.test.ts (lista inventada)   T019 fill-real-list.test.ts (lista real)
```

## Implementation Strategy

### MVP First (User Story 1)

Fases 1 e 2, depois US1: a Casa já sai densa com a lista bruta e dicas validadas no mínimo. Parar e medir com `words:measure` antes de seguir.

### Incremental Delivery

1. US1: grade densa (MVP)
2. US2: curadoria, faixas, 30 dias e metas medidas
3. US3: validação completa das dicas e fixture real
4. US4: conferência do painel
5. Uma release `feat(api)`; o site não muda

## Notes

- Commits em inglês, Conventional Commits, sem atribuição de IA
- Nenhuma mudança de schema, DDE ou ERD
- O arquivo gerado nunca é editado à mão: muda só por `words:build`

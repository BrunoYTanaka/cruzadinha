---

description: "Task list for feature 001-viabilidade-fonte"
---

# Tasks: Viabilidade da fonte de puzzles

**Input**: Design documents from `/specs/001-viabilidade-fonte/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/probe-cli.md, quickstart.md

**Tests**: Incluídos. A spec não os pede explicitamente, mas a constitution exige testes de lógica pura e testes sem internet (princípios IV e VII). Os testes usam `fetch` simulado e nunca acessam a rede.

**Organization**: Tarefas agrupadas por história de usuário (US1 = P1, US2 = P2, US3 = P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história a que a tarefa pertence (US1, US2, US3)

## Path Conventions

Pacote isolado em `tools/source-probe/` (ver Structure Decision em plan.md). Todos os caminhos abaixo são relativos à raiz do repositório.

**Regras para todas as tarefas** (constitution v1.3.0 e `CLAUDE.md`):
- Consultar o Context7 antes de usar qualquer biblioteca (`zod`, `tsx`, `vitest`).
- Formatar com Prettier: `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`.
- Nunca gravar, imprimir ou commitar credenciais, tokens, cookies ou dados pessoais.
- Commits no padrão Conventional Commits, sem linha `Co-Authored-By`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Criar o pacote isolado da ferramenta.

- [ ] T001 Criar a estrutura de pastas `tools/source-probe/{src,tests,fixtures}` conforme plan.md
- [ ] T002 Criar `tools/source-probe/package.json` (`"type": "module"`, `"private": true`, engine Node `>=22`) com dependência `zod` e dev dependencies `tsx`, `vitest`, `typescript`, e scripts `probe` (`tsx ./src/cli.ts`), `test` (`vitest run`) e `typecheck` (`tsc --noEmit`); gerar `package-lock.json` com `npm install` (versão de cada biblioteca confirmada no Context7)
- [ ] T003 [P] Criar `tools/source-probe/tsconfig.json` com `strict: true`, módulos ES e inclusão de `src` e `tests`
- [ ] T004 [P] Criar `tools/source-probe/.env.example` apenas com nomes de variáveis e valores fictícios, sem nenhum valor real
- [ ] T005 [P] Criar `tools/source-probe/.prettierrc.json` com as opções de formatação do projeto
- [ ] T006 [P] Acrescentar `node_modules/` e `tools/source-probe/.env` ao `.gitignore` da raiz (os padrões `.env*` já existem)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Peças compartilhadas por todas as histórias. Nenhuma história começa antes disto.

**⚠️ CRITICAL**: sanitização, limite de pedidos e tipos precisam existir antes de qualquer saída ou pedido real.

- [ ] T007 Criar `tools/source-probe/src/types.ts` com os tipos de `data-model.md`: `Verdict` (`status`: `viable` | `not-viable-login` | `inconclusive`; `reason`; `inconclusiveCause`: `source-down` | `unexpected-format` | `rate-limited`; `stage`; `executedAt`), `PuzzleSummary` (`date`, `gridWidth`, `gridHeight`, `wordCount`, `clueCount`, `hasSolution`, `complete`), `SourceCatalog` (`dailyDates`, `listingAvailable`), `PuzzleSample` (`source`, `date`, `capturedAt`, `payload`) e `ProbeReport` (inclui a recomendação `proceed` | `back-to-design`)
- [ ] T008 [P] Criar `tools/source-probe/src/sanitize.ts` com função pura que remove de qualquer objeto, texto e cabeçalhos todo campo ou valor que seja credencial, token, cookie ou dado pessoal, e função que informa se ainda sobrou algum valor suspeito. Regra: "A amostra só é gravada se a sanitização não deixar nenhum valor suspeito (FR-008, FR-009)"
- [ ] T009 [P] Criar `tools/source-probe/tests/sanitize.test.ts` (Vitest): cabeçalhos, cookies, tokens, e-mails e campos aninhados são removidos; objeto limpo passa intacto; a verificação de "valor suspeito" reprova entradas com credencial
- [ ] T010 [P] Criar `tools/source-probe/src/source.ts` como único módulo que fala com a fonte: função de pedido com `fetch` nativo, orçamento de no máximo 6 pedidos por execução, pausa de 1 segundo entre pedidos e parada imediata ao detectar sinal de limite de uso ou bloqueio. Ao esgotar o orçamento, a função sinaliza `rate-limited` indicando que foi o limite próprio. As credenciais vêm de variáveis de ambiente e a função nunca as retorna nem registra o valor, só se estão definidas
- [ ] T011 [P] Criar `tools/source-probe/src/schema.ts` com schemas Zod do formato recebido (usar `object()`, que descarta chaves desconhecidas) e função baseada em `safeParse` que devolve os `issues` de forma legível para o veredito `unexpected-format`
- [ ] T012 Criar `tools/source-probe/tests/source.test.ts` (Vitest, `vi.stubGlobal('fetch', ...)` e `vi.unstubAllGlobals()` em `afterEach`): respeita o máximo de 6 pedidos, aplica a pausa entre pedidos, para ao receber limite de uso e nunca inclui credenciais na saída

**Checkpoint**: Fundação pronta; as histórias podem começar.

---

## Phase 3: User Story 1 - Confirmar que um puzzle real pode ser obtido sem login (Priority: P1) 🎯 MVP

**Goal**: Executar `npm run probe` e receber um veredito claro com motivo e resumo de um puzzle do nível diário.

**Independent Test**: Rodar a verificação uma vez e conferir que termina com `viable`, `not-viable-login` ou `inconclusive`, com motivo, e que no caso viável mostra data, tamanho da grade, quantidade de palavras e de dicas.

### Tests for User Story 1

> **NOTE: escrever primeiro e confirmar que falham antes da implementação.**

- [ ] T013 [P] [US1] Criar `tools/source-probe/tests/verdict.test.ts` (Vitest) cobrindo a classificação: resposta com puzzle válido → `viable`; acesso negado mesmo após o acesso de visitante → `not-viable-login`; falha de rede → `inconclusive` com `source-down`; resposta fora do schema, ou puzzle sem solução ou sem dicas → `inconclusive` com `unexpected-format`; limite de uso da fonte ou orçamento de 6 pedidos esgotado → `inconclusive` com `rate-limited` (o motivo diz qual); sem puzzle após 2 datas anteriores → `inconclusive`. Regras: "`inconclusive` nunca é tratado como `not-viable-login`" e "Todo veredito tem `reason` não vazio"
- [ ] T014 [P] [US1] Criar `tools/source-probe/tests/probe.test.ts` (Vitest, `fetch` simulado, sem rede) cobrindo os cenários 1 a 3 da história 1 de ponta a ponta na ferramenta, incluindo que as etapas (a) pedido sem credencial, (b) obtenção de credencial de visitante pela página pública e (c) repetição do pedido são registradas na trilha
- [ ] T015 [P] [US1] Criar `tools/source-probe/tests/summary.test.ts` (Vitest): o resumo informa data, dimensões, contagens e `hasSolution`; "Se faltar grade, dicas ou solução, `complete = false`"; nesse caso o veredito é `inconclusive` com causa `unexpected-format`, citando o que faltou, e nunca `viable`

### Implementation for User Story 1

- [ ] T016 [P] [US1] Criar `tools/source-probe/src/verdict.ts` com a função pura que transforma o resultado de cada etapa em `Verdict`, garantindo `reason` não vazio e a separação entre `inconclusive` e `not-viable-login`
- [ ] T017 [P] [US1] Criar `tools/source-probe/src/summary.ts` com a função pura que gera `PuzzleSummary` a partir da resposta validada, calculando `complete`
- [ ] T018 [US1] Criar `tools/source-probe/src/probe.ts` que orquestra as etapas de descoberta (pedido sem credencial; credencial de visitante da página pública, sem login nem conta de ninguém; repetição do pedido), tenta no máximo 2 datas anteriores se o puzzle do dia ainda não saiu (sem puzzle após isso → `inconclusive`), respeita o orçamento de 6 pedidos (1 sem credencial, 1 credencial de visitante, 1 repetição, até 2 datas anteriores, 1 listagem), usa `source.ts`, `schema.ts`, `verdict.ts` e `summary.ts`, e devolve o `ProbeReport` com a trilha e a recomendação `proceed` ou `back-to-design`
- [ ] T019 [P] [US1] Criar `tools/source-probe/src/report.ts` que formata o relatório legível na ordem do contrato: veredito e motivo, trilha das etapas, resumo do puzzle, datas do diário (se houver) e recomendação; passa todo o texto pela sanitização de T008
- [ ] T020 [US1] Criar `tools/source-probe/src/cli.ts` que lê `--date` e `--save-sample`, executa `probe.ts`, imprime o relatório e define o código de saída (0 viável, 1 não viável, 2 inconclusivo, 64 uso incorreto), sempre com veredito e motivo, mesmo em erro inesperado

**Checkpoint**: A história 1 funciona e pode ser testada sozinha (MVP).

---

## Phase 4: User Story 2 - Descobrir quais datas existem no nível diário (Priority: P2)

**Goal**: O relatório lista as datas com puzzle do nível diário, ou declara que a fonte não fornece a listagem.

**Independent Test**: Rodar a verificação e conferir que o resumo mostra o intervalo de datas do diário ou informa que não há listagem; uma data sem puzzle aparece como indisponível, sem falha geral.

### Tests for User Story 2

- [ ] T021 [P] [US2] Criar `tools/source-probe/tests/catalog.test.ts` (Vitest, `fetch` simulado) cobrindo: resposta com lista de datas → `dailyDates` preenchido e `listingAvailable` verdadeiro; resposta sem lista → `listingAvailable` falso; data sem puzzle → `unavailable`. Regra: "Data sem puzzle vira `unavailable`, não falha da fonte (FR-006). Só o nível diário é consultado (FR-005)"

### Implementation for User Story 2

- [ ] T022 [US2] Criar `tools/source-probe/src/catalog.ts` que extrai `SourceCatalog` da resposta validada e classifica data sem puzzle como `unavailable`, sem consultar nenhum outro nível
- [ ] T023 [US2] Integrar `catalog.ts` em `tools/source-probe/src/probe.ts` e acrescentar a seção de datas do diário em `tools/source-probe/src/report.ts`, mantendo o orçamento de 6 pedidos

**Checkpoint**: Histórias 1 e 2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Guardar uma amostra para os testes futuros (Priority: P3)

**Goal**: `--save-sample` grava uma cópia sanitizada de um puzzle real em `tools/source-probe/fixtures/`.

**Independent Test**: Após uma verificação viável, existe uma amostra sem credenciais, tokens ou dados pessoais, legível sem acessar a fonte.

### Tests for User Story 3

- [ ] T024 [P] [US3] Criar `tools/source-probe/tests/sample.test.ts` (Vitest): grava a amostra com `source`, `date`, `capturedAt` e `payload` sanitizado; recusa gravar se restar valor suspeito; não grava nada sem `--save-sample`

### Implementation for User Story 3

- [ ] T025 [US3] Criar `tools/source-probe/src/sample.ts` que monta o `PuzzleSample`, aplica `sanitize.ts`, verifica que não restou valor suspeito e grava o arquivo em `tools/source-probe/fixtures/` com a atribuição à fonte (princípio VIII)
- [ ] T026 [US3] Ligar `--save-sample` em `tools/source-probe/src/cli.ts` e registrar no relatório o caminho da amostra gravada ou o motivo de não ter gravado

**Checkpoint**: As três histórias funcionam de forma independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T027 Rodar `npm test` e `npm run typecheck` em `tools/source-probe/` e corrigir o que falhar. Confirmar também que nenhum arquivo em `tools/source-probe/tests/` importa `src/cli.ts` nem chama a rede de verdade (`npm test` com a rede desligada deve passar), em atendimento a FR-001 e ao princípio VII
- [ ] T028 **Gate de conformidade (princípio VIII)**: antes de qualquer pedido real, ler os termos de uso do O Globo e da fornecedora do jogo (e o `robots.txt` do host da API, se existir) e registrar em `specs/001-viabilidade-fonte/decision.md` a conclusão: "permitido", "proibido" ou "não esclarecido", com a data e o link das páginas consultadas, sem copiar trechos longos. Se for "proibido", NÃO executar T029: registrar `back-to-design` em T030 e encerrar a feature. Se for "não esclarecido", decidir com o autor antes de seguir
- [ ] T029 Executar a verificação real uma vez, com `npm run probe -- --save-sample`, conforme `specs/001-viabilidade-fonte/quickstart.md`, sem expor credenciais na saída. Só rodar depois de T028 concluída como "permitido" (ou decidida pelo autor). A execução grava a amostra sanitizada em `tools/source-probe/fixtures/` para os testes de contrato da feature 004 (US3)
- [ ] T030 Registrar o veredito, a data e a decisão (`proceed` ou `back-to-design`) em `specs/001-viabilidade-fonte/decision.md` (FR-011), sem nenhum valor sensível
- [ ] T031 Revisar manualmente o arquivo gravado em `tools/source-probe/fixtures/` por T029 e confirmar a ausência de credenciais, tokens, cookies e dados pessoais antes de qualquer commit (SC-004). Se a amostra não foi gerada (veredito diferente de `viable`), registrar isso em `decision.md`
- [ ] T032 Atualizar `CLAUDE.md` com os comandos reais da ferramenta (`npm run probe`, `npm test`, `npm run typecheck`, teste único com `npx vitest run <arquivo>`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup e bloqueia todas as histórias
- **US1 (Phase 3)**: depende da Fundação; é o MVP
- **US2 (Phase 4)**: depende da Fundação; T023 depende de T018 e T019 (US1)
- **US3 (Phase 5)**: depende da Fundação; T026 depende de T020 (US1)
- **Polish (Phase 6)**: depende das histórias desejadas; T029 exige T018 a T020 e a conclusão de T028, e a amostra de T029 depende de T025 e T026 (US3)

### Within Each Story

- Testes antes da implementação, e devem falhar primeiro
- Funções puras (`verdict`, `summary`, `catalog`, `sample`) antes da orquestração
- Orquestração (`probe.ts`) antes do CLI

### Parallel Opportunities

- Setup: T003, T004, T005 e T006 em paralelo
- Fundação: T008 e T009, T010 e T011 em paralelo; T012 só depois de T010
- US1: T013, T014 e T015 em paralelo; T016, T017 e T019 em paralelo
- US2 e US3 podem começar em paralelo após a Fundação, se T018 a T020 estiverem prontas para as integrações

---

## Parallel Example: User Story 1

```text
Task: "Criar tools/source-probe/tests/verdict.test.ts"   (T013)
Task: "Criar tools/source-probe/tests/probe.test.ts"     (T014)
Task: "Criar tools/source-probe/tests/summary.test.ts"   (T015)

Task: "Criar tools/source-probe/src/verdict.ts"          (T016)
Task: "Criar tools/source-probe/src/summary.ts"          (T017)
Task: "Criar tools/source-probe/src/report.ts"           (T019)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Concluir Setup (Phase 1) e Fundação (Phase 2)
2. Concluir a história 1 (Phase 3)
3. **Parar e validar**: conferir os termos de uso (T028), rodar a verificação real (T029) e registrar o veredito (T030)
4. Se o veredito for `back-to-design`, encerrar aqui e voltar ao documento de design; as histórias 2 e 3 só valem a pena se a fonte for viável

### Incremental Delivery

1. Fundação pronta
2. US1: veredito e resumo (MVP)
3. US2: datas do nível diário
4. US3: amostra sanitizada para os testes de contrato da feature 004

---

## Notes

- Commits seguem Conventional Commits em `feat/001-viabilidade-fonte` (por exemplo `feat(source-probe): add verdict classification`).
- Nenhum teste automático acessa a internet; só T029 faz pedidos reais, uma vez e sob demanda, depois do gate de conformidade T028.
- Esta feature consulta apenas o nível diário (clarificação de 2026-10-12).

---

description: "Task list for feature 007: resposta no puzzle entregue ao front-end"
---

# Tasks: Resposta no puzzle entregue ao front-end

**Input**: Design documents from `/specs/007-resposta-no-puzzle/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-api.md, quickstart.md

**Tests**: Pedidos pela constituição (VI e VII) e pelos critérios SC-001, SC-002 e SC-005. Escreva cada teste antes da implementação correspondente e confira que ele falha. Unitários rodam com `npm test`; os que usam banco são `*.int.test.ts` (`npm run test:int`, precisa de Docker). Nenhum teste chama a fonte real.

**Organization**: Tarefas agrupadas por história de usuário. Muda `packages/shared` e o módulo `puzzles` da API, mais a documentação afetada. Sem migração, sem dependência nova, sem mudança no front.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: História da spec (US1, US2)
- Caminhos relativos à raiz do repositório

## Referências fixas para todas as tarefas

- Nenhuma dependência nova nem API de biblioteca nova; o Context7 não se aplica (regra de negócio própria e contrato Zod já em uso).
- Contrato do corpo: `contracts/http-api.md`. Formato: `data-model.md`. Decisões: `research.md`.
- Validação do par: `validatePuzzleWithSolution` de `@cruzadinha/shared`. Erro lançado no serviço vira `500 internal-error` pelo `setErrorHandler` de `apps/api/src/app.ts`, que registra só nome e código (`describeError`).
- Nunca escrever `any`. Textos e mensagens em português. Commits em inglês, Conventional Commits, sem `Co-Authored-By` nem atribuição de IA (CLAUDE.md).
- Segredos e letras de puzzle real: nada em fixtures, logs ou exemplos; usar conteúdo inventado (constituição VI e VIII).

---

## Phase 1: Setup

**Purpose**: Conferir o ponto de partida

- [X] T001 Confirmar que a branch `feat/007-resposta-no-puzzle` está ativa (com a constituição 3.0.0) e que `npm ci`, `npm run lint`, `npm run typecheck` e `npm test` passam antes de qualquer mudança (linha de base)

---

## Phase 2: Foundational (contrato compartilhado)

**Purpose**: O schema da resposta é pré-requisito das rotas e da documentação

- [X] T002 Em `packages/shared/src/puzzle/response.test.ts`, trocar o teste "recusa campo extra como a solução" por testes que falham: aceita `{ puzzleId, puzzle, solution }` coerente; recusa resposta sem `solution`; recusa `solution` com dimensões diferentes da grade; recusa `solution` com letra em bloco ou célula aberta sem letra; ainda recusa campo extra desconhecido
- [X] T003 Em `packages/shared/src/puzzle/response.ts`, adicionar `solution: solutionSchema` ao `puzzleResponseSchema` (continua `z.strictObject`) e um `superRefine` que aplica `validatePuzzleWithSolution(puzzle, solution)` e converte os `issues` em erros do Zod; atualizar o comentário do arquivo (já não é "nunca tem a solução"); manter `PuzzleResponse` inferido

**Checkpoint**: `npm test -w @cruzadinha/shared` passa; o typecheck da API falha onde monta `PuzzleResponse` sem `solution` (esperado até a US1; não dar push antes do T007, porque o pré-push roda o typecheck)

---

## Phase 3: User Story 1 - Receber a resposta junto do puzzle (Priority: P1) 🎯 MVP

**Goal**: As duas rotas devolvem `{ puzzleId, puzzle, solution }` para usuário logado, e nenhuma resposta de erro traz a solução.

**Independent Test**: Com puzzle guardado e usuário logado, pedir por data e por id e conferir que `solution` é igual à guardada; sem sessão, `401` sem `solution`.

### Tests for User Story 1

- [X] T004 [P] [US1] Em `apps/api/src/test/puzzles.int.test.ts`, trocar o teste "nunca devolve a solução nem a grade de respostas" (~linha 82) por: `GET /api/puzzles?date=` devolve as chaves `['puzzle', 'puzzleId', 'solution']` e `solution` igual a `ok.solution`; e ajustar a asserção por id (~linha 199, hoje `not.toContain('"solution"')`) para exigir `solution` igual à guardada; testes devem falhar antes de T006
- [X] T005 [P] [US1] Em `apps/api/src/test/puzzles.int.test.ts`, acrescentar: puzzle buscado na fonte pela primeira vez já sai com `solution` (a fonte simulada é chamada uma vez); segunda chamada sai igual sem consultar a fonte; puzzle guardado com par inconsistente (inserir direto no banco um `solution` com dimensões erradas) responde `500` com `error: 'internal-error'` e corpo sem letras e, capturando o log da app, nenhuma letra da solução no log (FR-006); os dois pedidos simultâneos da mesma data recebem a mesma `solution`; respostas `400`, `401`, `404` e `502` existentes continuam sem `"solution"` nem as letras (manter/ajustar as asserções `not.toContain` desses casos)

### Implementation for User Story 1

- [X] T006 [US1] Em `apps/api/src/modules/puzzles/puzzles.service.ts`, incluir `solution: Solution` no ramo `ok: true` de `GetPuzzleResult`; em `getByDate` (puzzle guardado e puzzle recém-buscado) e em `getById`, devolver a solução; ao entregar um puzzle **guardado**, chamar `validatePuzzleWithSolution` e, se falhar, lançar `new Error('puzzle guardado inconsistente')` sem conteúdo da solução na mensagem (research.md, item 2)
- [X] T007 [US1] Em `apps/api/src/modules/puzzles/puzzles.routes.ts`, montar o corpo das duas rotas como `PuzzleResponse` com `puzzleId`, `puzzle` e `solution` vindos do resultado do serviço
- [X] T008 [P] [US1] Em `apps/api/src/modules/puzzles/puzzles.schemas.ts`, atualizar `description` e a descrição do `200` das duas rotas (remover "nunca traz as letras de resposta", "Sem a solução" e "Puzzle sem a solução"; descrever `solution`: matriz com uma letra por célula aberta e `null` nos blocos; só para sessão válida)
- [X] T009 [US1] Em `apps/api/src/docs/docs.test.ts`, trocar `expect(serialized).not.toContain('solution')` (~linha 192) por uma checagem de que o documento descreve `solution` na resposta `200` das duas rotas de puzzles e de que os exemplos do documento só usam letras do fixture inventado de `apps/api/src/db/seed-puzzle.ts`

**Checkpoint**: `npm test` e `npm run test:int` passam; a US1 funciona sozinha

---

## Phase 4: User Story 2 - Puzzle de exemplo também com resposta (Priority: P2)

**Goal**: O exemplo do seed é entregue com `solution` coerente, para desenvolver as ajudas do front localmente.

**Independent Test**: Rodar o seed, pedir o puzzle de hoje logado e conferir `solution` coerente com a grade.

- [X] T010 [US2] Em `apps/api/src/test/seed.int.test.ts`, ajustar o teste que hoje afirma `not.toContain('"solution"')` (~linha 150) para exigir `solution` igual à guardada pelo seed e coerente com a grade (`validatePuzzleWithSolution`); deve falhar antes de T006/T007 e passar depois. Nenhuma mudança em `apps/api/src/db/seed-puzzle.ts`

**Checkpoint**: seed e rotas entregam o exemplo com solução

---

## Phase 5: Polish & documentação (FR-007, FR-008, FR-010)

**Purpose**: Deixar a documentação coerente com a constituição 3.0.0

- [X] T011 [P] Em `specs/006-coleta-puzzles/spec.md`, atualizar o FR-002, o SC-004, o FR-022 (trecho "sem resposta no que vai ao navegador") o cenário 4 da US1 e a entidade "Puzzle guardado" ("solução (só no servidor)") para a nova regra, com nota "alterado pela feature 007"; em `specs/006-coleta-puzzles/contracts/http-api.md`, atualizar o corpo `200` e a regra "nunca contém `solution`" com a mesma nota; em `specs/006-coleta-puzzles/data-model.md`, nota de topo sobre `solution` "só no servidor"; em `specs/006-coleta-puzzles/quickstart.md`, atualizar a linha que diz "sem `solution`"
- [X] T012 [P] Em `docs/design.md`, trocar a regra "A resposta correta fica em campo separado, só no servidor. Na v1 ela não vai ao navegador" (~linha 104) e o item 30 da lista de decisões ("A resposta correta nunca vai ao navegador na v1", ~linha 213) pela regra nova: a solução fica em campo separado e vai ao navegador só para usuário logado, para o front controlar as dicas
- [X] T013 [P] Em `CLAUDE.md`, ajustar a frase da feature 006 ("session required, never return the solution") e a descrição de `packages/shared` ("so the public part has no field for answer letters") para a regra nova; acrescentar uma linha sobre a feature 007 na seção "Current state"
- [ ] T014 Rodar o `quickstart.md` desta feature: `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check` e `npm run test:int` (Docker); conferir manualmente, com `npm run dev -w @cruzadinha/api` e o seed, que `GET /api/puzzles?date=<hoje>` logado traz `solution` e que sem cookie traz `401` sem `solution`; confirmar que as rotas aparecem com `solution` em `/api/docs/`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 → US2 → Polish. T002 antes de T003 (teste primeiro).
- US1: T004 e T005 (mesmo arquivo, sequenciais entre si na prática) antes de T006; T006 antes de T007; T008 em paralelo a T006/T007; T009 depois de T008.
- US2 depende de T006 e T007 (rota entrega a solução); T010 pode ser escrito antes e deve falhar até lá.
- Polish: T011, T012 e T013 independentes entre si; T014 por último.

## Parallel Example

```text
Após T003:  T004 + T008 (arquivos diferentes)
Polish:     T011 + T012 + T013
```

## Implementation Strategy

- **MVP**: Phases 1 a 3 (US1) já entregam o pedido. Faça o commit após o checkpoint da US1 (`feat(api): return the puzzle solution with the puzzle`).
- Depois US2 (teste do seed) e a documentação em commits separados (`test(api): ...`, `docs: ...`).
- Branch já aberta: `feat/007-resposta-no-puzzle`; incluir `specs/007-resposta-no-puzzle/` no primeiro commit da feature.

# Implementation Plan: Formato interno de puzzle e adaptador O Globo

**Branch**: `feat/003-adaptador-oglobo` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-adaptador-oglobo/spec.md`

## Summary

Definir em `packages/shared` o formato interno de puzzle: schemas Zod estritos para a parte pública (grade, palavras, dicas, metadados e atribuição) e para a solução, separadas, com as regras de consistência aplicadas no próprio `safeParse`. Em `apps/api/src/sources/`, criar a interface `PuzzleSource` e o adaptador O Globo, que faz o pedido à Agilmente com token anônimo gerado localmente, valida a resposta como `unknown`, converte o ipuz v2 para o formato interno por uma função pura e devolve um resultado explícito (sucesso ou um de seis motivos de falha). Os testes usam fixtures reduzidas e um `fetch` injetado, sem rede. Uma verificação sob demanda (`npm run source:check`) consulta os níveis aceitos na fonte real e alimenta as fixtures. A verificação mostrou que a fonte só publica `daily`, que passou a ser o único nível aceito.

## Technical Context

**Language/Version**: TypeScript 6.0 (`strict`) em Node.js 24 LTS

**Primary Dependencies**: Zod 4.6 (já no `shared` e no `api`); APIs nativas do Node 24 (`fetch`, `AbortSignal.timeout`, `node:crypto`); tsx 4 para o script da verificação. Nenhuma dependência nova (ver [research.md](./research.md))

**Storage**: N/A (persistência fica para a feature de puzzles)

**Testing**: Vitest 5 no `shared` e no `api`; `fetch` injetado com `vi.fn()` devolvendo `Response` montadas a partir das fixtures; conversor testado direto. Nenhum teste usa rede

**Target Platform**: servidor Node (container Linux) e, para os schemas, também o navegador (o `shared` não usa APIs do Node)

**Project Type**: aplicação web em monorepo; esta feature mexe em `packages/shared` e `apps/api`

**Performance Goals**: suíte da feature em menos de 10 s (SC-003); pedido à fonte com tempo limite de 10 s

**Constraints**: no máximo 2 pedidos por chamada e 1 por nível na verificação (FR-012, SC-006); token só em memória e fora de qualquer saída (FR-013); fixtures reduzidas e sanitizadas num repositório público (FR-015, SC-007)

**Scale/Scope**: 1 fonte, 1 nível (`daily`), grades de até 30 x 30; cerca de 8 arquivos de código, 6 fixtures e 40 casos de teste

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito em monorepo | Passa: schemas e tipos do puzzle no `shared`; resposta da fonte entra como `unknown` e passa por Zod antes do uso; nenhum `any` |
| II. Qualidade automatizada | Passa: sem mudança nas ferramentas; os novos testes entram em `npm test`, que a CI já roda |
| III. Camadas no back | Passa: o adaptador fica em `sources/`, fora das camadas rota → serviço → repositório, como no design; o serviço de puzzles (próxima feature) vai depender só da interface |
| IV. Adaptador isolado | Passa: só `sources/oglobo/` conhece endereço, cabeçalhos e formato da Agilmente, atrás de `PuzzleSource`; testes de contrato com fixtures derivadas de respostas reais |
| V. Lógica de jogo pura | Não se aplica (sem regras de jogo) |
| VI. Segurança e segredos | Passa: solução em estrutura separada, sem campo de letra no puzzle público; token gerado na hora, só em memória, fora de logs, resultados e fixtures; `.source-samples/` ignorado pelo git |
| VII. Testes sem internet | Passa: `fetch` injetado; a verificação real é script à parte, fora da suíte |
| VIII. Conteúdo de terceiros | Passa: atribuição no formato interno; fixtures sem puzzle completo; site e cache fora do escopo. Desde a emenda 2.0.0, a leitura dos termos de uso não é condição de feature |
| IX. Schema por migração | Não se aplica (sem banco) |
| Fluxo: Context7 | Cumprido para Zod 4.6 e Vitest 5.0 (ver `research.md`) |
| Fluxo: feature | Ciclo completo do Spec Kit em `feat/003-adaptador-oglobo` |

Resultado do gate: **passa**, sem violações. Reavaliado após a fase 1: continua passando.

## Project Structure

### Documentation (this feature)

```text
specs/003-adaptador-oglobo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── puzzle-format.md     # exportações do shared
│   ├── puzzle-source.md     # interface, pedido, mapeamento e conversão
│   └── source-check.md      # verificação sob demanda
├── checklists/
│   └── requirements.md
├── findings.md              # criado na T020: resultado da verificação real por nível
└── tasks.md                 # criado por /speckit-tasks
```

### Source Code (repository root)

```text
.
├── .gitignore                         # + apps/api/.source-samples/
├── packages/
│   └── shared/
│       └── src/
│           ├── index.ts               # + exportações do puzzle
│           └── puzzle/
│               ├── schema.ts          # level, cell, word, grid, attribution, puzzle, solution, availableDate
│               ├── rules.ts           # regras de FR-003 (usadas pelo superRefine) e validatePuzzleWithSolution
│               ├── word-cells.ts      # wordCells(word)
│               ├── schema.test.ts
│               └── rules.test.ts
└── apps/
    └── api/
        ├── package.json               # + script source:check
        └── src/
            └── sources/
                ├── types.ts           # PuzzleSource, FetchPuzzleResult, FetchFailureReason
                └── oglobo/
                    ├── oglobo.ts          # createOgloboSource: pedido, token, mapeamento
                    ├── agilmente-schema.ts # Zod da resposta bruta
                    ├── convert.ts         # ipuz → Puzzle + Solution (pura)
                    ├── token.ts           # generateAnonymousToken
                    ├── check.ts           # verificação sob demanda (fora da suíte e do bundle)
                    ├── convert.test.ts
                    ├── oglobo.test.ts
                    └── fixtures/
                        ├── daily-valid.json
                        ├── refused.json
                        ├── changed-shape.json
                        ├── unsupported-cell-style.json
                        ├── unsupported-rebus.json
                        └── unavailable.json
```

**Structure Decision**: o formato interno vai para `packages/shared/src/puzzle/`, porque o site vai consumir o tipo público na feature do jogo. A interface de fonte e o adaptador ficam em `apps/api/src/sources/`, como no design; o O Globo ganha uma pasta em vez do arquivo único previsto, para separar conversão pura, acesso HTTP, schema da resposta e fixtures. Nenhum módulo em `modules/` nem rota nova nesta feature.

## Complexity Tracking

Sem violações da constitution a justificar.

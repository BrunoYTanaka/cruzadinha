# Implementation Plan: Cruzadas Clube como terceira fonte

**Branch**: `feat/030-clube-terceira-fonte` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/030-clube-terceira-fonte/spec.md`

## Summary

Acrescentar `clube` (Cruzadas Clube) como terceira fonte. Três blocos de trabalho:

1. **`shared`**: a regra `checkPuzzleRules` passa a aceitar palavra seguida de célula aberta quando essa célula inicia outra palavra da mesma direção (palavras vizinhas). Sem mudança no formato `Puzzle`: o limite entre vizinhas já é dado por `row/col/length` de cada palavra. `puzzleSourceIdSchema` e `puzzleSourceNames` ganham `clube`.
2. **`apps/api`**: adaptador `sources/clube/` (página HTML → data, autor, caminho do `CCnnn.js` e link da edição anterior; script → XML dentro de uma sandbox QuickJS/WASM sem rede, arquivos, com limites de tempo e memória; XML Crossword Compiler com `left-bar`/`top-bar` → formato interno). Migração `0006` amplia `puzzles_source_check`. A coleta descobre edições seguindo o link "anterior", pedindo o script só das datas ainda não salvas. `getByDate` não busca na fonte para `clube` (só lê o salvo).
3. **`apps/web`**: o tabuleiro desenha as barras entre vizinhas; `game-logic` já navega por palavra (`wordCells`), então a mudança é auditar e testar os limites; aba e cartão "Hoje" da terceira fonte; dia passado sem edição é "sem cruzada" sem `/dia` buscando.

Antes do acabamento do site, uma partida de teste na grade 12 x 8 valida a experiência (spec, Suposições).

## Technical Context

**Language/Version**: TypeScript 6 strict, Node.js 24 (monorepo npm workspaces)

**Primary Dependencies**: Zod 4.6 e Fastify 5.12 (já existentes); `fast-xml-parser` 5.11 (já existente, reaproveita `cruzadaonline/xml.ts`); **nova** `quickjs-emscripten-core` + `@jitl/quickjs-singlefile-mjs-release-sync` (WASM embutido no JS, sem arquivo `.wasm` extra; ficam como dependências de produção instaladas na imagem, ver research R1); React 19 + Vite 8 no site

**Storage**: Postgres 17 via Drizzle; só a restrição `puzzles_source_check` muda (migração `0006`). Sem tabela nova

**Testing**: Vitest 5 (unit), `*.int.test.ts` com Testcontainers, Playwright (e2e) e `vitest-axe`; fixtures reduzidas e inventadas

**Target Platform**: API em Docker (Render free, Linux) e site estático (Cloudflare Pages)

**Project Type**: web (monorepo `shared` + `api` + `web`)

**Performance Goals**: extração do XML em menos de 2 s por edição; coleta com pausa de 2 s entre pedidos (regra existente)

**Constraints**: sandbox com limite de tempo (~1 s de CPU), memória (~32 MB) e pilha; nenhum acesso a rede, arquivos ou ao host; no máximo 2 pedidos por edição (página + script, este só se a data ainda não está salva) e 1 por coleta (lista), sem nova tentativa; compatível com a versão anterior do site e da API (duas releases)

**Scale/Scope**: 1 edição por dia, 12 x 8, 366 edições por fonte na biblioteca

## Constitution Check

*GATE: passa antes da pesquisa e é reavaliado após o desenho.*

| Princípio | Avaliação |
|-----------|-----------|
| I. TypeScript estrito | OK. Resposta da fonte entra como `unknown` e passa por Zod; sem `any`. |
| II. Qualidade automatizada | OK. Lint, typecheck, testes e CI sem mudança de processo. |
| III. Camadas | OK. Rota → serviço → repositório; a regra "só lê o salvo" fica no serviço (`PuzzleSource` declara `onDemand`, ver R6), não na rota. |
| IV. Adaptadores | OK. `sources/clube/` é o único que conhece página, ofuscação e XML. Fixtures reduzidas e inventadas (a constituição pede fixtures de respostas reais; derivadas e reduzidas, como nas features 003 e 014). |
| V. Lógica pura | OK. Barras e limites calculados em funções puras de `game-logic`/`shared`, com testes. |
| VI. Segurança | **Atenção**: executar código remoto. Mitigação: QuickJS em WASM, sem *host functions*, limites de tempo/memória/pilha/tamanho; erro vira `unexpected-format`. Nenhum segredo novo. |
| VII. Testes sem internet | OK. Fixtures locais; a verificação real é um script sob demanda (`source:check:clube`), fora da CI. |
| VIII. Conteúdo de terceiros | **Atenção**: o `robots.txt` da fonte declara `Content-Signal: search=yes, ai-train=no, use=reference` e permite `User-agent: *`. O uso aqui é jogo privado, atribuído, sem redistribuição nem treino; o adaptador usa `User-Agent` identificável do projeto e pausa de 2 s. Atribuição "Cruzadas Clube" + autor. Registrado como risco aceito, igual ao das outras fontes (emenda 2.0.0). |
| IX. Migração | OK. `0006` só amplia o `CHECK`, gerada pelo Drizzle (`--custom`, SQL escrito à mão como a `0004`). Atualizar DDE-002 e ERD-002 (memória do projeto). |

Sem violações; a tabela de Complexity Tracking fica vazia.

**Re-avaliação pós-design**: sem mudança. A dependência nova (`quickjs-emscripten`) é a única adição de superfície e está justificada em R1.

## Project Structure

### Documentation (this feature)

```text
specs/030-clube-terceira-fonte/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── puzzle-source-clube.md
│   └── api-changes.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/src/puzzle/
├── rules.ts             # regra de palavras vizinhas (checkPuzzleRules)
├── rules.test.ts
├── schema.ts            # 'clube' em puzzleSourceIdSchema e puzzleSourceNames
└── word-cells.ts        # + wordBoundaries() (barras entre vizinhas), usado pelo site

apps/api/
├── drizzle/0006_puzzles_source_clube.sql   # + meta/_journal.json e snapshot
├── src/db/schema.ts                        # puzzles_source_check com 'clube'
├── src/sources/types.ts                    # PuzzleSource.onDemand (default true)
├── src/sources/clube/
│   ├── clube.ts            # fetch página + script, motivos de falha
│   ├── page.ts             # data, autor, script, link anterior (puro)
│   ├── sandbox.ts          # QuickJS: roda o script, devolve CrosswordPuzzleData
│   ├── convert.ts          # XML Crossword Compiler (com barras) → interno (puro)
│   ├── schema.ts           # Zod do XML
│   ├── check.ts            # source:check:clube
│   ├── fixtures/ + fixtures.ts
│   └── *.test.ts
├── src/modules/puzzles/puzzles.service.ts  # onDemand=false; descoberta por "anterior" na coleta
├── src/app.ts, src/cli.ts, src/cli/run-cli.ts   # passam o terceiro adaptador
└── src/test/*.int.test.ts                  # coleta, biblioteca, rota, constraint

apps/web/src/
├── game-logic/navigation.ts (+ testes)     # limites por palavra; Home/End/Delete/Tab
├── features/game/Board*.tsx|css            # barras entre vizinhas
├── features/library/                       # aba, cartão, dayState sem busca (clube)
├── features/settings/                      # defaultSource lista 3
└── e2e/clube.spec.ts

docs/data-definitions/DDE-002-coleta-puzzles.md, docs/entity-relationship-diagrams/ERD-002-coleta-puzzles.md, docs/design.md, CLAUDE.md
.github/workflows/collect.yml               # só se precisar (a coleta já itera as fontes)
```

**Structure Decision**: segue o layout existente (um adaptador por pasta em `apps/api/src/sources/`, regras puras em `shared`, lógica de jogo pura em `game-logic`). Nenhum pacote novo.

## Complexity Tracking

Sem violações a justificar.

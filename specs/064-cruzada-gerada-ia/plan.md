# Implementation Plan: Casa (cruzada diária gerada)

**Branch**: `feat/064-cruzada-gerada-ia` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/064-cruzada-gerada-ia/spec.md`

## Summary

Quinta fonte `casa` ("Casa"), sem busca sob demanda, cuja cruzada do dia é criada dentro do `puzzles collect`. A DeepSeek devolve só uma lista de palavras e dicas em JSON; um montador puro e determinístico põe as palavras numa grade N x N (9 a 15, padrão 11) de palavras cruzadas livres, o que garante cruzamentos coerentes por construção. Até 3 chamadas por fonte e por dia, contadas em `rate_limit_attempts` entre execuções; `402` (sem créditos) ou chave ausente param quietos (`unavailable` + nota, exit 0, sem issue). Entrega em duas releases: A deixa o site tolerante a ids de fonte desconhecidos; B adiciona a fonte, nascendo escondida no painel de fontes. Desenho para várias fontes geradas (um adaptador `sources/generated/` com fábrica e cliente compatível com a OpenAI; só `casa` com a DeepSeek agora). Tamanho (9 a 15) e dificuldade (Fácil, Médio, Difícil) por fonte em `generated_source_settings`; a seção "Fontes geradas" de `/admin` edita a configuração, mostra a cruzada de hoje e a descarta enquanto nenhuma conta nem x1 a usa (`/api/admin/generated*`). A validação também descarta termos da lista de bloqueio e respostas usadas pela fonte nos últimos 30 dias, que o prompt já pede para evitar. O jogador vê só "Casa" e a dificuldade, sem menção a IA.

## Technical Context

**Language/Version**: TypeScript 6 strict, Node.js 24

**Primary Dependencies**: Fastify 5, Drizzle, Zod (existentes); `fetch` nativo para a DeepSeek; nenhuma dependência nova

**Storage**: Postgres 17, tabela `puzzles` existente; migração alarga dois `CHECK`, insere uma linha em `source_settings` e cria `generated_source_settings` (uma linha por fonte gerada); limite diário em `rate_limit_attempts`

**Testing**: Vitest (fetch e Clock injetados, saídas do modelo inventadas e reduzidas), Testcontainers para a migração

**Target Platform**: CLI de coleta no GitHub Actions (`collect.yml`); API no Render (sem a chave); site estático no Cloudflare Pages

**Project Type**: monorepo web (api + web + shared)

**Performance Goals**: geração inteira (até 3 chamadas + montagem) dentro do tempo do job de coleta; montagem < 1 s

**Constraints**: no máximo 3 chamadas ao modelo por fonte gerada e por dia, entre execuções; timeout de 180 s por chamada; nenhuma geração fora da coleta; compatível com o site e a API anteriores (duas releases)

**Scale/Scope**: 1 cruzada por dia; de 11 (9 x 9) a ~30 (15 x 15) palavras por grade

## Constitution Check

| Princípio                  | Situação                                                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TypeScript estrito      | OK. Saída do modelo entra como `unknown` e passa por Zod.                                                                                                                                                  |
| II. Qualidade automatizada | OK. Lint, typecheck, testes; `check:deps` (adaptador em `sources/generated/`, não importa outro adaptador).                                                                                                       |
| III. Camadas               | OK. Coleta segue route/service/repository; adaptador só implementa `PuzzleSource` e recebe a leitura da configuração injetada (não importa `modules/`). Rotas de admin no módulo `sources` (route → service → repository). |
| IV. Adaptadores            | OK. Teste de contrato com uma resposta **real** da DeepSeek salva por `source:check:generated --save`, reduzida e sem segredo (o conteúdo é do próprio site, sem direito de terceiros); casos de erro com fixtures inventadas no mesmo formato. Mudança no formato da DeepSeek quebra o teste de contrato. |
| V. Lógica pura testada     | OK. Montador e validação de palavras são puros, com testes. Nenhuma regra de jogo muda.                                                                                                                    |
| VI. Segurança e segredos   | OK. `DEEPSEEK_API_KEY` só no segredo da CI; nunca em logs, `detail`, fixtures ou specs. Solução não aparece em erros. Configuração, revisão e descarte só para admin (`createRequireAdmin`, 404 a quem não é); corpo estrito; id da fonte no corpo. Descarte protegido pelas FKs `ON DELETE RESTRICT` de `progress` e `duels`. |
| VII. Testes sem internet   | OK. `fetch` injetado; nenhum teste chama a DeepSeek.                                                                                                                                                       |
| VIII. Conteúdo             | OK. Fonte própria, mas segue as mesmas regras (sem conteúdo na landing, sem indexação, sem exportação). A landing ganha só uma descrição em texto próprio. Atribuição exibida (nome e dificuldade; sem menção a IA, decisão do dono do produto).                              |
| IX. Migrações              | OK. Migração Drizzle (tabela pelo schema + SQL dos `CHECK` e inserts); `generated_source_settings` com `timestamps` e trigger (`conventions.int.test.ts`); DDE-001, DDE-002, DDE-008, ERD-002, ERD-008 e `docs/design.md` atualizados; DDE-009 e ERD-009 novos (já escritos nesta fase). |

Sem violações. Reavaliado após o design: sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/064-cruzada-gerada-ia/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── deepseek-request.md
│   ├── collect-output.md
│   └── admin-generated-sources.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
# Release A (tolerância do site)
packages/shared/src/sources/schema.ts        # sourcesResponseSchema/adminSourcesResponseSchema descartam id desconhecido
packages/shared/src/stats/schema.ts          # bySource descarta id desconhecido

# Release B (fonte)
packages/shared/src/puzzle/schema.ts         # 'casa' no enum, nome, puzzleSourcesWithoutFetch
packages/shared/src/sources/generated-settings.ts   # generatedSourceIds, dificuldade, rótulos, faixa, padrão, esquemas do painel
apps/api/src/sources/generated/
├── generated.ts         # createGeneratedSource({ id, provider, fetch, clock, readSettings, reserveCall, recentAnswers }): onDemand false, listRecent só hoje
├── client.ts            # pedido compatível com a OpenAI (baseUrl, model, apiKey), classificação de erros (R4)
├── prompt.ts            # buildPrompt({ size, difficulty, date, avoid })
├── blocklist.ts         # termos bloqueados (R13)
├── schema.ts            # Zod da resposta HTTP e do JSON de palavras; limpeza item a item (R8, R13, R14)
├── layout.ts            # montador puro com semente (R2) -> Puzzle + Solution
├── check.ts             # source:check:generated (pedido real, --save)
├── fixtures.ts          # respostas inventadas e reduzidas
└── *.test.ts
apps/api/src/config.ts                       # DEEPSEEK_API_KEY, DEEPSEEK_MODEL (opcionais), GENERATION_ENABLED (padrão true só em produção)
.env.example                                 # DEEPSEEK_API_KEY vazio, GENERATION_ENABLED=false
apps/api/src/app.ts, apps/api/src/cli.ts     # registram a fonte (app sem chave); cli liga casa à DeepSeek e injeta readSettings, reserveCall (rateLimiter), recentAnswers
apps/api/src/platform/db/schema.ts           # tabela generated_source_settings; 'PUZZLE_GENERATE' em rateLimitActions
apps/api/src/modules/sources/                # repository/service/routes/schemas: GET /api/admin/generated, PUT .../settings, POST .../discard
apps/api/src/modules/puzzles/                # repository: respostas dos últimos 30 dias por fonte; cruzada de hoje; exclusão com FK
apps/web/src/shared/services/api/            # getGeneratedSources/putGeneratedSourceSettings/discardGeneratedPuzzle
apps/web/src/features/admin/                 # hooks/useGeneratedSources, components/GeneratedSourcesAdmin (seção em /admin)
apps/api/src/modules/puzzles/puzzles.service.ts  # CollectReport.notes (visibilidade da fonte não entra na coleta: FR-027)
apps/api/src/seed/seed-puzzle.ts             # cruzada de exemplo de casa: fixture inventado → layout (FR-028)
apps/api/src/seed/seed-user.ts               # casa visível em source_settings e conta de teste admin, só no seed (FR-028)
apps/api/src/cli/run-cli.ts                  # imprime "Pulado em" em stdout
apps/api/drizzle/00NN_*.sql                  # generated_source_settings + linha; CHECKs (puzzles, source_settings, rate_limit_attempts.action) + linha escondida em source_settings
apps/api/package.json                        # script source:check:generated
.github/workflows/collect.yml                # DEEPSEEK_API_KEY e GENERATION_ENABLED: 'true' no passo Coletar
apps/web/src/features/landing/helpers/source-descriptions.ts  # texto da fonte nova
docs/ (DDE-001, 002, 008, 009; ERD-002, 008, 009; design.md) # já atualizados no plano; conferir contra a migração final
docs/deploy.md                               # segredo DEEPSEEK_API_KEY e ligar a fonte no painel
```

**Structure Decision**: estrutura existente; um adaptador novo em `apps/api/src/sources/generated/`, como os outros quatro, que serve a todas as fontes geradas. Qualquer `Record<PuzzleSourceId, ...>` no site falha no `typecheck` até ganhar a entrada de `casa`.

## Rollout

1. **PR/release A** (`fix(shared)`): esquemas de resposta toleram ids desconhecidos. Publicar e esperar o site no ar.
2. **PR/release B** (`feat(api)`, `feat(web)`): fonte `casa`, migração (linha escondida, `generated_source_settings`), painel de configuração, segredo na CI. As rotas de admin são novas e só o site novo as chama: sem problema de compatibilidade.
3. Cadastrar o segredo `DEEPSEEK_API_KEY` no GitHub; se quiser, ajustar tamanho e dificuldade em `/admin`; a próxima coleta gera; o admin revisa a cruzada e liga a fonte em `/admin`.
4. Fonte gerada nova no futuro: id no enum e nos `CHECK`, linha em `generated_source_settings`, nome, texto da landing, segredo e uma linha em `cli.ts` (research R11).

## Complexity Tracking

Nenhuma violação.

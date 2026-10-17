# Implementation Plan: Adaptador da fonte Público

**Branch**: `feat/014-adaptador-publico` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-adaptador-publico/spec.md`

## Summary

Acrescentar o Público como segunda fonte de cruzadas, com identificador `cruzadaonline` e atribuição "Cruzada Online", e deixar a API pronta para o site escolher a fonte.

**Na API**:

- Um adaptador novo em `apps/api/src/sources/cruzadaonline/` implementa `PuzzleSource`:
  - Busca o arquivo do dia na CDN do Público.
  - Lê o XML do Crossword Compiler com `fast-xml-parser`, recusando DOCTYPE e corpos acima de 1 MB.
  - Valida a estrutura com Zod e converte para o formato interno da feature 003 por uma função pura.
- O serviço de puzzles passa de uma fonte para uma lista. A busca por data recebe a fonte, e a coleta percorre as duas, sem que a falha de uma impeça a outra.
- `GET /api/puzzles` e `GET /api/library` ganham `source` opcional, com padrão `oglobo`, para o site anterior receber exatamente o que recebe hoje. O item da biblioteca passa a informar a fonte.
- Uma migração só troca a regra `puzzles_source_check`.
- Há uma verificação sob demanda nova (`source:check:cruzadaonline`), e o seed grava um exemplo da nova fonte.

**No site**:

- Um seletor "Fonte da cruzada" (O Globo ou Cruzada Online) fica no calendário, e a escolha é lembrada no aparelho.
- A biblioteca, o dia buscável (`/dia/:date?fonte=`) e os avisos de fonte fora do ar passam a ser por fonte.
- A tela do jogo só deixa de repetir uma parte igual na linha de atribuição (nome e direitos "Cruzada Online"); o progresso já é por `puzzleId`.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24; navegador moderno (o mesmo da feature 013)

**Primary Dependencies**:

- API: Fastify 5, Drizzle 0.45 / drizzle-kit 0.31, Zod 4, postgres.js.
- Site: React 19, React Router 7, TanStack Query 5.
- Nova: `fast-xml-parser` 5.11 (dependência do `apps/api`; versão 5.11.2, de 2026-09-29, confirmada no Context7 e no npm, research R1).

**Storage**:

- Postgres: migração `0004_puzzles_source_cruzadaonline`, que só troca a regra `CHECK` (data-model §2). Sem coluna nem dado novo.
- Navegador: `localStorage` `cruzadinha:source` e chaves de aviso por fonte (data-model §6). IndexedDB de visitante sem mudança.

**Testing**:

- Vitest 5:
  - Adaptador com `fetch` e relógio injetados e fixtures XML 5 x 5 inventadas.
  - Conversão e `clueText` puros.
  - Serviço com fontes falsas.
  - Site em jsdom, com `vitest-axe` no seletor.
- Integração (`npm run test:int`): migração, biblioteca por fonte e busca por data com duas fontes falsas.
- Playwright: `fontes.spec.ts` nova.
- Verificação real só sob demanda.

**Target Platform**: o mesmo da feature 012: Cloudflare Pages (site e Function), Render (API, Docker) e Neon (Postgres)

**Project Type**: aplicação web em monorepo npm workspaces (`apps/api`, `apps/web`, `packages/shared`)

**Performance Goals**:

- Sem meta própria de desempenho: a conversão roda uma vez por arquivo (~10 kB), e a busca na hora é dominada pela rede (até 10 s de tempo limite).
- Trocar a fonte no calendário faz uma única consulta à biblioteca, e o resultado fica em cache por fonte.

**Constraints**:

- Nenhum pedido à fonte real em testes ou CI (princípio VII).
- Leitura de XML segura (R2).
- Compatibilidade com a versão anterior da outra parte (`docs/versionamento.md`; contracts/api.md §Compatibilidade).
- `any` proibido: o XML lido entra como `unknown` e passa por Zod.
- O link de notícia das dicas não é guardado (princípio VIII).

**Scale/Scope**:

- Até 366 puzzles por fonte e uma coleta diária de 2 fontes com 31 dias de janela (no primeiro dia, ~31 pedidos ao Público com 2 s de pausa, ~1 min).
- API: 1 adaptador novo (6 arquivos e fixtures), 3 módulos alterados (puzzles, library, cli) e 1 migração.
- Site: 1 componente novo, 1 preferência nova e cerca de 10 arquivos alterados (cliente HTTP, chaves de consulta, calendário, dia, avisos e helpers de teste).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constitution 4.0.0.

| Princípio | Avaliação |
| --- | --- |
| I. TypeScript estrito | Passa. `puzzleSourceIdSchema`, `puzzleSourceQuerySchema` e o `source` do item ficam em `shared`. O XML lido entra como `unknown` e passa por `crossword-compiler-schema.ts`. A preferência do aparelho é validada por Zod. Sem `any`. |
| II. Qualidade automatizada | Passa. Sem mudança de ferramentas. A dependência nova entra no `package-lock.json`. |
| III. Camadas no back | Passa. As rotas só validam `source` e chamam o serviço. O serviço escolhe o adaptador e orquestra a coleta, sem HTTP. O filtro por fonte fica nos repositórios. |
| IV. Adaptadores | Passa. Só `sources/cruzadaonline/` conhece o endereço, o XML e os nomes dos elementos. Há testes de contrato com fixtures derivadas de arquivos reais e reduzidas (R11). Uma mudança no formato quebra os testes (SC-004). |
| V. Lógica de jogo pura | Não afetado. `game-logic` não muda. A fonte escolhida é uma preferência local mais o estado de servidor do TanStack Query, sem estado global novo. |
| VI. Segurança e privacidade | Passa. A fonte não usa segredo nem identificação. A leitura recusa DOCTYPE, entidades externas e corpos grandes (R2). O corpo bruto e as dicas não vão a logs nem a `detail`. A solução segue as regras das emendas 3.0.0 e 4.0.0, com revalidação do par antes de entregar. A biblioteca sem sessão continua sem dado de usuário. |
| VII. Testes determinísticos | Passa. Toda a suíte roda com `fetch` injetado. A verificação real é um script separado e manual. O e2e usa o exemplo do seed. |
| VIII. Conteúdo de terceiros | Passa. A atribuição "Cruzada Online" aparece em cada puzzle. O cache guarda só grade, palavras, dicas (sem link) e solução. Sem exportação nem API pública documentada nova; a documentação OpenAPI continua fora de produção. `noindex` mantido. |
| IX. Migração de schema | Passa. A troca da regra é uma migração Drizzle versionada, gerada com `db:generate` e conferida, sem `push` (R8). |

Resultado: sem violações; Complexity Tracking vazio. **Reavaliado após o design** (data-model e contratos): sem mudança. O ponto mais sensível é a leitura de XML de terceiros, coberta por R2 e pela fixture `with-doctype.xml`.

## Riscos e decisões

1. **A CDN publica o dia seguinte antes da hora**: o adaptador e o serviço recusam datas futuras (Brasília), então o puzzle de amanhã nunca é entregue antes (R5).
2. **403 ambíguo**: a CDN usa 403 tanto para "não existe" quanto, em tese, para "bloqueado". Tratado como `unavailable`. Se a verificação real mostrar bloqueio, a coleta registra o dia como indisponível, e não como falha: risco aceito, revisto em `findings.md`.
3. **Formato composto em `format`** (`"5,4"`): ignorado na conferência do tamanho, porque o tamanho já vem do intervalo da palavra (R4).
4. **Fuso de Portugal**: a data do arquivo é a do jornal. Usada como chave sem conversão, como o O Globo.
5. **Primeira coleta mais longa**: ~31 pedidos ao Público, ~1 min a mais no `collect.yml`. Fica dentro do tempo do job.
6. **Site novo com API revertida**: a escolha "Cruzada Online" mostra "Esta fonte não está disponível agora", e O Globo segue normal (R7, contracts/ui.md).
7. **Limite `PUZZLE_FETCH` compartilhado**: buscar dias das duas fontes consome o mesmo limite de 30 por hora. Aceito pela spec.

## Project Structure

### Documentation (this feature)

```text
specs/014-adaptador-publico/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md             # parâmetro source, item da biblioteca, compatibilidade
│   ├── puzzle-source.md   # adaptador cruzadaonline e seus módulos
│   ├── cli.md             # puzzles collect por fonte, source:check:cruzadaonline
│   ├── source-check.md    # regras da verificação real
│   └── ui.md              # seletor de fonte, /dia?fonte=, jogo
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/src/
├── puzzle/schema.ts              # puzzleSourceIdSchema + 'cruzadaonline'; puzzleSourceQuerySchema
└── library/schema.ts             # libraryItemSchema.source (.default('oglobo'))

apps/api/
├── package.json                  # + fast-xml-parser 5.11; + script source:check:cruzadaonline
├── drizzle/0004_puzzles_source_cruzadaonline.sql   # gerada
└── src/
    ├── sources/cruzadaonline/    # NOVO
    │   ├── cruzadaonline.ts      # createCruzadaOnlineSource
    │   ├── xml.ts                # readXml (validação + parser configurado)
    │   ├── crossword-compiler-schema.ts
    │   ├── clue-text.ts
    │   ├── convert.ts
    │   ├── check.ts              # verificação sob demanda (fora do bundle)
    │   ├── *.test.ts
    │   └── fixtures/*.xml
    ├── db/schema.ts              # puzzleSources + regra CHECK
    ├── db/seed-puzzle.ts, seed-user.ts   # exemplo por fonte
    ├── modules/puzzles/          # service: sources[]; getByDate(source, …); collect por fonte
    │   ├── puzzles.routes.ts     # query source
    │   └── puzzles.schemas.ts    # documentação do parâmetro
    ├── modules/library/          # repository: filtro por fonte; service/routes: source
    ├── cli/run-cli.ts            # saída por fonte
    ├── cli.ts, app.ts            # passam as duas fontes
    └── test/fake-source.ts, *.int.test.ts

apps/web/src/
├── api/puzzles.ts, library.ts, query-keys.ts      # source nos pedidos e nas chaves
├── features/library/
│   ├── source-choice.ts (+ test)                  # NOVO: preferência validada
│   ├── SourcePicker.tsx (+ module.css, test)       # NOVO
│   ├── LibraryPage.tsx                            # seletor, consulta por fonte, links ?fonte=
│   ├── Calendar.tsx, DayCell.tsx                  # link do dia buscável com ?fonte=
│   ├── DayRoute.tsx                               # ?fonte=, conferência de puzzle.source
│   └── source-down.ts                             # chaves por fonte
├── features/game/GamePage.tsx (+ test)           # atribuição sem partes repetidas
├── test/fixtures.ts, http.ts                      # itens com source; handlers por source
└── ../e2e/fontes.spec.ts                          # NOVO
```

**Structure Decision**: o monorepo existente. A fonte nova segue o modelo da pasta `sources/oglobo/`, sem pacote novo. Nada é compartilhado entre os dois adaptadores além da interface e dos schemas de `shared`.

## Ordem de entrega

1. **shared**: enum e schemas, com testes.
2. **Adaptador**: fixtures, `clueText`, leitura, conversão e `fetchPuzzle`, com testes de contrato. Depois a verificação sob demanda e uma execução real registrada em `findings.md`.
3. **API**: migração, serviço com várias fontes, rotas, biblioteca, coleta, CLI, seed e integração.
4. **Site**: preferência, seletor, biblioteca e dia por fonte, e o e2e.

Tudo vai num só PR. Os commits `feat(api)` e `feat(web)` geram minor nas duas partes, e `shared` gera patch nas duas (`docs/versionamento.md`). O deploy publica a API antes do site, e as duas ordens são compatíveis (contracts/api.md).

## Complexity Tracking

Sem violações a justificar.

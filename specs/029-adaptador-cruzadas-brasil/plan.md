# Implementation Plan: Adaptador da fonte Cruzadas Brasil

**Branch**: `feat/029-adaptador-cruzadas-brasil` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/029-adaptador-cruzadas-brasil/spec.md`

## Summary

Acrescentar a Cruzadas Brasil como terceira fonte, `cruzadasbrasil`, com atribuição "Cruzadas Brasil". A feature 014 já deixou as rotas, o serviço, a coleta e o site prontos para uma lista de fontes, então o trabalho é um adaptador novo e a inclusão do id nos pontos que enumeram fontes.

**Na API**:

- Adaptador novo em `apps/api/src/sources/cruzadasbrasil/` (`PuzzleSource`): busca `https://cruzadasbrasil.com.br/palavras-cruzadas/AAAAMMDD`, lê o corpo sempre como UTF-8, extrai os dados do jogo do payload do Next.js embutido no HTML, valida com Zod e converte por uma função pura.
- A conversão deriva palavras, números e tamanhos da grade (regra clássica de numeração), e confere contra os números e as posições informados pela fonte, contra as dicas e contra o gabarito. Não depende de `fast-xml-parser` nem de nenhuma dependência nova.
- 404 vira `unavailable`; data futura é recusada sem pedido; página sem os dados do jogo vira `unexpected-format`.
- Migração `0006` só troca `puzzles_source_check`. `cli.ts`, `app.ts` e o seed passam a incluir a fonte. Verificação sob demanda `source:check:cruzadasbrasil`.

**Em `shared`**: `cruzadasbrasil` em `puzzleSourceIdSchema` e em `puzzleSourceNames`.

**No site**: nenhum componente novo. Abas, cartões de "Hoje", seletor de fonte padrão, `/dia/:date?fonte=` e atribuição já derivam a lista de `puzzleSourceIdSchema.options`; o trabalho é conferir o layout com três fontes (360 px e desktop), cobrir com testes e corrigir o que quebrar.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24; navegador moderno (o mesmo da feature 013)

**Primary Dependencies**: Fastify 5, Drizzle 0.45 / drizzle-kit 0.31, Zod 4, postgres.js (API); React 19, React Router 7, TanStack Query 5 (site). Nenhuma dependência nova (research R1, R2).

**Storage**: Postgres, migração `0006_puzzles_source_cruzadasbrasil` que só troca a regra `CHECK` (data-model §2). Sem coluna nem dado novo. `localStorage` e IndexedDB sem mudança (a fonte padrão já é validada só pelo formato).

**Testing**: Vitest 5 (adaptador com `fetch` e relógio injetados, fixtures HTML 5 x 5 inventadas; conversão e limpeza de texto puras; site em jsdom com `vitest-axe`); integração (`npm run test:int`) para migração, biblioteca e busca por data com três fontes; Playwright para o layout com três fontes. Verificação real só sob demanda.

**Target Platform**: o mesmo da feature 012 (Cloudflare Pages, Render, Neon).

**Project Type**: aplicação web em monorepo npm workspaces (`apps/api`, `apps/web`, `packages/shared`).

**Performance Goals**: sem meta própria. A página tem cerca de 45 kB; a conversão roda uma vez por página. A busca na hora é dominada pela rede (até 10 s de tempo limite).

**Constraints**: nenhum pedido à fonte real em testes ou CI (VII); o HTML é dado não confiável: nada é executado nem interpretado como instrução, e só o trecho dos dados do jogo é lido; compatibilidade com a versão anterior da outra parte (`docs/versionamento.md`); `any` proibido; o corpo bruto nunca vai a log (FR-008).

**Scale/Scope**: histórico real de cerca de 103 dias (desde 2026-07-13); coleta diária de 3 fontes com 31 dias de janela (primeiro dia: até ~31 pedidos por fonte, 2 s de pausa). API: 1 adaptador (5 arquivos e fixtures), 1 migração, ~6 arquivos tocados. Site: ~0 a 4 arquivos de CSS/teste conforme o layout.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Constitution 4.0.0.

| Princípio | Avaliação |
|-----------|-----------|
| I. TypeScript estrito | Passa. A página entra como `string`/`unknown` e passa por Zod; sem `any`. O id novo vai em `shared`. |
| II. Qualidade automatizada | Passa. Mesmos scripts da raiz; sem dependência nova. |
| III. Camadas | Passa. Rotas, serviço e repositório não mudam; o adaptador é a única parte nova. |
| IV. Adaptadores | Passa. Só `sources/cruzadasbrasil/` conhece a URL, o HTML e os campos. Testes de contrato com fixtures reduzidas derivadas de páginas reais (mesmo critério das features 003 e 014); os formatos reais foram conferidos sob demanda (research R3). |
| V. Lógica de jogo | Passa. Nenhuma regra de jogo muda; `plainLetter` já cobre acentos. |
| VI. Segurança e privacidade | Passa. Sem segredo; sem cookie nem cabeçalho especial; o corpo não vai a logs; progresso de visitante segue só no navegador. |
| VII. Testes sem internet | Passa. `fetch` injetado; verificação real só sob demanda. |
| VIII. Conteúdo de terceiros | Passa com ressalva registrada: atribuição por puzzle ("Cruzadas Brasil"), cache só do necessário (puzzle e solução), `noindex` inalterado, sem redistribuição. A fonte monetiza com anúncios e vende PDF, e não há permissão escrita; a constituição (emenda 2.0.0) não faz a leitura dos termos condição de feature, e o contato fica como pendência do autor em `findings.md`. |
| IX. Migração | Passa. `0006` versionada via `drizzle-kit generate`. |
| Fluxo (Context7) | Nenhuma biblioteca nova. Na implementação, chamadas a Zod/Drizzle/Vitest passam de novo pelo Context7 (research, cabeçalho). |

**Resultado**: sem violações; Complexity Tracking vazio. Reavaliado após o desenho (Phase 1): sem mudança.

## Riscos e decisões

- **Formato interno instável (R2)**: os dados vêm do payload RSC do Next.js, sem contrato. Mitigação: extração isolada em `page-data.ts`, schema Zod estrito nos campos usados, fixtures que quebram quando o formato muda, e `findings.md` com o pedido de um endpoint JSON à fonte.
- **Página sem dados (R3)**: datas futuras respondem 200 com "Em breve", sem os dados do jogo, e uma página existente pode perder o payload no futuro. Ambos viram `unexpected-format`; a coleta registra a falha e segue, sem parar as outras datas.
- **Bloqueio por IP (R3)**: a fonte usa Cloudflare e o IP do Render pode ser barrado; 403 vira `source-down` e a coleta é conferida no ambiente publicado (FR-019, T033).
- **Permissão e atribuição**: pendência do autor, fora do código (spec, Assumptions).
- **Três fontes no layout**: o layout foi pensado para 1 a 3 fontes; é o limite. Conferir abas e cartões a 360 px antes de qualquer outra mudança (R6).

## Project Structure

### Documentation (this feature)

```text
specs/029-adaptador-cruzadas-brasil/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── puzzle-source.md
│   ├── api.md
│   ├── cli.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/src/puzzle/schema.ts          # id e nome da fonte
apps/api/
├── drizzle/0006_puzzles_source_cruzadasbrasil.sql (+ meta)  # só o CHECK
├── package.json                               # script source:check:cruzadasbrasil
└── src/
    ├── db/schema.ts                           # puzzleSources e check
    ├── db/seed-puzzle.ts                      # exemplo da nova fonte
    ├── app.ts, cli.ts                         # terceiro adaptador na lista
    ├── modules/*/*.schemas.ts, docs/          # exemplos/enum da documentação, se citarem a lista
    └── sources/cruzadasbrasil/
        ├── cruzadasbrasil.ts                  # PuzzleSource: pedido, status, UTF-8, limite
        ├── page-data.ts                       # extrai os dados do jogo do HTML
        ├── page-schema.ts                     # Zod dos dados do jogo
        ├── convert.ts                         # conversão pura e conferências
        ├── clue-text.ts                       # limpeza do texto da dica
        ├── check.ts                           # verificação sob demanda
        ├── fixtures.ts, fixtures/*.html
        └── *.test.ts
apps/web/src/features/library/, game/, settings/  # só testes e ajuste de layout, se preciso
apps/web/e2e/fontes.spec.ts                       # cobre três fontes
docs/design.md, docs/data-definitions/DDE-002-*.md, docs/entity-relationship-diagrams/ERD-002-*.md, CLAUDE.md
```

**Structure Decision**: mesma estrutura do monorepo; um adaptador por pasta, como `oglobo/` e `cruzadaonline/`.

## Ordem de entrega

1. `shared` + adaptador + testes de contrato + migração + registro em `app.ts`/`cli.ts` (API completa; o site anterior segue funcionando, FR-014).
2. Coleta/CLI/seed e verificação sob demanda; `findings.md` com as páginas reais.
3. Site: conferir e ajustar o layout com três fontes; testes e e2e.
4. Documentação (design, DDE/ERD, CLAUDE.md).

Entregar a API antes do site: o site anterior ignora o id novo (respostas tolerantes), então não há janela quebrada.

## Complexity Tracking

Sem violações.

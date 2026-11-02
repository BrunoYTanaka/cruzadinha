# Implementation Plan: x1 de cruzada (duelo 1x1 por link ou código)

**Branch**: `feat/058-x1-duelo-1x1` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/058-x1-duelo-1x1/spec.md` (issue #117, entrega 1 de 2)

## Summary

Duelo assíncrono 1x1 sobre uma cruzada já salva. Novo módulo `duels` na API (rotas sem sessão obrigatória, `createOptionalSession`), duas tabelas novas (`duels`, `duel_participants`) e nova `features/duel` no site com três páginas (`duel-new`, `duel`, `duels`). O servidor é dono do relógio (`started_at` gravado no "Começar"), do estado e do desfecho; a decisão de estado é uma função pura com `Clock` injetável (`resolveDuel`), o prazo vencido é calculado na leitura e o cron só apaga o que expirou há tempo. Identidade: sessão vale mais que o token do participante (hash SHA-256). Todas as chamadas que levam token ou código usam `POST` com corpo, nunca URL. O calendário ganha um modo de seleção opcional sem mudar o comportamento atual. Precisa de emenda 7.0.0 da constituição (ver Constitution Check).

## Technical Context

**Language/Version**: TypeScript 6 strict, Node.js 24 (monorepo npm workspaces)

**Primary Dependencies**: Fastify 5, Drizzle + postgres.js, Zod (`packages/shared`), React 19 + Vite 8, TanStack Query, React Router, `idb`. Nenhuma dependência nova.

**Storage**: Postgres 17 (migração Drizzle `0012_duels.sql` com trigger `<table>_set_updated_at`); no aparelho, IndexedDB `cruzadinha-duelos` (token do participante, chave por duelo) e progresso do jogo do duelo isolado do jogo normal.

**Testing**: Vitest (unit, `Clock` falso, sem rede), `*.int.test.ts` com Testcontainers (concorrência do "Começar", limites), Testing Library + `vitest-axe`, Playwright com dois contextos de navegador.

**Target Platform**: API em Docker (Render), site estático (Cloudflare Pages) via Function de proxy; navegador desktop e celular.

**Project Type**: web (API + site + `shared`).

**Performance Goals**: "Meus x1" por consulta periódica a cada 15 s com a aba visível (pausa oculta); estado do duelo a cada 5 s só enquanto se espera o oponente.

**Constraints**: nada de token/código em URL de consulta; resposta idêntica para código inexistente e não aberto; site novo funciona com API antiga (mostra "indisponível") e API nova com site antigo (rotas só adicionadas); depois do "Começar" nada bloqueia o jogador.

**Scale/Scope**: jogo entre amigos; teto de 5 duelos abertos por criador; 9 rotas, 2 tabelas, 1 feature de site, 3 páginas.

## Constitution Check

*GATE: passa antes da pesquisa e é reavaliado depois do desenho.*

| Princípio | Resultado |
|---|---|
| I TypeScript estrito / schemas em `shared` | Passa. Schemas de corpo e resposta em `packages/shared/src/duel/`; sem `any`. |
| II Qualidade automatizada | Passa. Mesmos hooks e CI. |
| III Rota → serviço → repositório | Passa. `duels.routes` só valida e chama o serviço; regra em `duels.rules.ts` (puro) e `duels.service.ts`; SQL em `duels.repository.ts`. |
| IV Adaptadores de fonte | N/A. O duelo só referencia `puzzle_id` já salvo; não toca em fonte. |
| V Lógica pura | Passa. Regras de desfecho/estado em funções puras testadas; regras do tabuleiro seguem em `domain/game`. |
| VI Segurança e privacidade | **Exceção a justificar** (ver Complexity Tracking): grava no servidor apelido, hash de token e tempos de visitante. Nenhuma outra parte do progresso de visitante sai do aparelho. Token do participante só como hash (o token do link fica em claro, ver R3); sessão `HttpOnly`/`SameSite=Lax` inalterada; respostas só a quem apresenta sessão, token, link ou código do duelo; limites de taxa novos; respostas sem dado de usuário para quem não apresentou credencial. |
| VII Testes determinísticos | Passa. `Clock` falso, Postgres em container para concorrência, Playwright com dois contextos. |
| VIII Conteúdo de terceiros | Passa. Rotas do duelo `noindex` e `no-referrer`; o duelo não exporta nem redistribui a cruzada (só o `puzzle_id`; o conteúdo vem do endpoint já existente). Share de resultado não leva solução. |
| IX Migração | Passa. Uma migração Drizzle; DDE-007 e ERD-007 atualizados. |
| Context7 | Só bibliotecas já em uso; APIs conferidas em Context7 na implementação de cada tarefa que as tocar (Drizzle `onConflict`/transação com `FOR UPDATE`, Fastify hooks). |

**Reavaliação pós-desenho**: sem novas violações (emenda 7.0.0 registrada). A emenda 7.0.0 entra como T001 antes de qualquer código.

## Project Structure

### Documentation (this feature)

```text
specs/058-x1-duelo-1x1/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/src/duel/
├── duel.ts                 # schemas: regras, estados, requests/responses, códigos
└── duel.test.ts

apps/api/
├── drizzle/0012_duels.sql  # duels, duel_participants, checks, triggers, novas ações de rate limit
└── src/
    ├── platform/db/schema.ts            # tabelas + rateLimitActions (DUEL_CREATE, DUEL_LOOKUP, DUEL_MINE)
    ├── platform/rate-limit/limits.ts    # duelCreate, duelLookup, duelMine
    └── modules/duels/
        ├── index.ts
        ├── duels.routes.ts
        ├── duels.schemas.ts             # schemas OpenAPI (toDocSchema)
        ├── duels.service.ts
        ├── duels.repository.ts
        ├── duels.rules.ts               # resolveDuel(), pura, Clock injetável
        ├── duel-codes.ts                # token do link, código de 8 caracteres, token do participante
        └── *.test.ts / *.int.test.ts

apps/web/src/
├── features/duel/                       # index.ts, components/ hooks/ services/ helpers/
│   ├── components/{CreateForm,RulesDialog,DuelBoard,ResultPanel,DuelList,JoinByCode,ForfeitConfirm}/
│   ├── hooks/{useDuel,useMyDuels,useServerClock}.ts
│   ├── services/{duel-api,duel-tokens,duel-progress}.ts   # tokens no IndexedDB; progresso do duelo isolado
│   └── helpers/{rules-text,result-text,parse-join-input}.ts
├── features/library/                    # modo de seleção em Calendar/DayCell (prop opcional)
├── pages/{duel-new,duel,duels}/
├── app/                                 # rotas /x1/novo, /x1/:linkToken, /x1; link no menu com contador
├── public/_headers                      # noindex + Referrer-Policy: no-referrer em /x1/*
└── e2e/duelo.spec.ts                    # dois contextos

.dependency-cruiser.cjs                  # FEATURE_ORDER: ... library, stats, settings, game, duel
docs/data-definitions/DDE-007-duelos.md
docs/entity-relationship-diagrams/ERD-007-duelos.md
.specify/memory/constitution.md          # emenda 7.0.0
```

**Structure Decision**: segue a organização por feature da 037. `features/duel` entra por último na ordem (`... < game < duel`) e importa `session`, `library` e `game` só pelos `index.ts`; `game` passa a exportar o que o duelo precisa (ver research R4). A API ganha o módulo `duels`, que importa `identity` e `puzzles` só pelos `index.ts` e `platform/rate-limit` pelo seu `index.ts`.

## Complexity Tracking

| Violação | Por que é necessária | Alternativa mais simples rejeitada porque |
|---|---|---|
| VI: dados de visitante no servidor (apelido, hash do token, tempos do duelo) | O vencedor é medido pelo servidor e o oponente precisa ver o resultado; os dois lados são pessoas diferentes | Guardar só no aparelho não permite comparar dois jogadores nem relógio confiável. A exceção é limitada: só dados do duelo, nunca cruzadas, letras ou progresso do jogo normal. |

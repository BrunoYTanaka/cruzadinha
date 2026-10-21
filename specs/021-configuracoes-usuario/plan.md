# Implementation Plan: Configurações do usuário

**Branch**: `feat/021-configuracoes-usuario` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-configuracoes-usuario/spec.md`

## Summary

As preferências da pessoa viram um único conjunto de configurações. Ele é aberto por uma engrenagem no cabeçalho, numa modal, e guardado no aparelho para todos e também na conta para quem está logado. As três partes do monorepo mudam.

**`shared`**
- `settingsSchema` com oito campos e leitura tolerante campo a campo (R1).
- `defaultSource` é validado pelo formato, não pelo enum de fontes (R2).
- Pedido tolerante a campos novos (R3).

**API**
- Tabela `user_settings` com `jsonb` e `saved_at`, criada pela migração `0005`, que também amplia o check do limitador (R4).
- `GET`/`PUT /api/settings` com sessão.
- Regra pura `decideSettingsSave`: vence o `savedAt` mais recente, com `setWhere` no `upsert` (R5).
- `bodyLimit` de 4 KB e limite `SETTINGS_SAVE` de 120 gravações por hora por endereço (R6).

**Site: armazenamento e sincronização**
- Armazenamento em módulo `settings-store` sobre `cruzadinha:settings`, migrando as chaves antigas (R8).
- Sincronização entre abas pelo evento `storage`.
- Fila de envio para a conta, com agrupamento, espera crescente e aviso não bloqueante (R9).
- Primeiro login sobe o local se a conta não tem configurações; logout mantém (R7).

**Site: interface e efeitos**
- Modal com `Tooltip` genérico; o relógio pausa com ela aberta (R16).
- `ThemeButton` único, na ordem claro → escuro → automático, com o ícone animado e a View Transition em círculo. Sem animação quando o aparelho pede redução de movimento (R10, R11).
- Limites de ajuda vivos com `null` para "sem limite" (R12).
- Modo de riscar `filled`, só com o risco (R13).
- "Ir direto ao jogo" decidido num loader de `/` com `replace` (R14).
- A aba do calendário deixa de ser preferência (R15).

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24 (API), navegador moderno (site)

**Primary Dependencies**: Fastify 5, Drizzle ORM com postgres.js, Zod, React 19, React Router 7 (modo data), TanStack Query. Nenhuma dependência nova. A View Transitions API é do navegador e tem plano B sem animação. O Context7 foi consultado para Drizzle `onConflictDoUpdate`/`setWhere`, React Router `replace` em loader e Fastify `bodyLimit` (research.md).

**Storage**:
- Postgres: tabela nova `user_settings`. A migração `0005` também altera o check `rate_limit_attempts_action_check`.
- `localStorage`: chave nova `cruzadinha:settings`. As chaves antigas só são lidas para migrar.
- IndexedDB do visitante: sem mudança.

**Testing**:
- **Vitest em `shared`:** `parseSettings` (padrão por campo, chaves desconhecidas, `defaultSource` desconhecido), `parseStoredSettings` (só campos válidos, sem padrões) e o pedido.
- **Vitest na API:**
  - `decideSettingsSave`;
  - rotas com `app.inject()` (401, 400 com `fields`, corpo grande, 429);
  - `docs.test.ts` cobre o `schema` novo.
- **Integração (Testcontainers):**
  - `user_settings` com gatilho e cascata;
  - `upsert` fora de ordem;
  - limite `SETTINGS_SAVE`;
  - `conventions.int.test.ts`.
- **Vitest no site:**
  - `settings-store`: migração, sem armazenamento, evento `storage`;
  - `settings-sync`: agrupamento, espera, 404 da API antiga, 429;
  - `help.ts` com `null`;
  - `clue-strike.ts` com `filled`;
  - `nextTheme`, `theme-transition` (sem suporte, movimento reduzido, `skipTransition`);
  - `directPlayLoader`;
  - componentes `Tooltip`, `SettingsButton`, `SettingsDialog`, `ThemeButton`, `HelpButtons`, `ClueList`, `ClueSheet`, `LibraryPage` e `GamePage`, com `vitest-axe`.
- **Playwright:**
  - `e2e/configuracoes.spec.ts`: modal, tema, ajudas, riscar, cruzada padrão, ir direto, persistência, conta em dois contextos, 360 px e axe nos dois temas;
  - ajustes em `visitante.spec.ts`, `fontes.spec.ts` e `sem-saltos.spec.ts`, onde o botão de tema saiu e a aba deixou de ser lembrada.

**Target Platform**: Cloudflare Pages (site) e Render (API), feature 012

**Project Type**: aplicação web em monorepo npm workspaces (`packages/shared`, `apps/api`, `apps/web`)

**Performance Goals**:
- Cada mudança vale na tela em menos de 1 s (SC-002); na prática, no mesmo quadro.
- A troca de tema termina em menos de 1 s (SC-009).
- Num aparelho novo, as configurações chegam junto com a primeira consulta depois do login (SC-004).

**Constraints**:
- **Nada bloqueia o jogo (FR-032 da feature 010):** falhas de envio viram só aviso.
- **Compatibilidade nos dois sentidos com a versão anterior da outra parte (FR-025):** o site novo trata o 404 da API antiga, e o site antigo não chama as rotas novas.
- **Visitante não envia nada ao servidor** (princípio VI, FR-021).
- **Componentes só leem tokens de tema.**
- **`any` proibido.**

**Scale/Scope**:
- 1 tabela e 1 migração.
- 2 rotas.
- 1 módulo de API (`settings`).
- 1 pasta de site (`features/settings`).
- 3 componentes novos (`Tooltip`, `ThemeButton`, `SettingsDialog`) e 1 utilitário de transição.
- Cerca de 10 arquivos existentes alterados.
- Docs: `CLAUDE.md`, `docs/design.md`, data definitions e ERD.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
| --- | --- |
| I. TypeScript estrito | OK: schemas em `shared`; o `jsonb` entra como `unknown` e passa por `parseStoredSettings`; o `localStorage` por `parseSettings`; sem `any`. |
| II. Qualidade automatizada | OK: lint, typecheck, unitários, integração e e2e na CI, sem mudança de ferramenta. |
| III. Camadas no back | OK: `settings.routes.ts` (HTTP) → `settings.service.ts` (regra pura `decideSettingsSave`, sem HTTP) → `settings.repository.ts` (SQL e `upsert`). |
| IV. Adaptadores | N/A: nenhuma fonte nova; o desenho só evita fixar as fontes (R2). |
| V. Lógica de jogo pura e testada | OK: limites `null` e modo `filled` ficam em `game-logic` com teste; os limites chegam pelo pedido do reducer. O estado de servidor usa TanStack Query; o armazenamento de módulo não é biblioteca de estado global. |
| VI. Segurança e privacidade | OK: o usuário vem só da sessão; visitante não chama a API; erros com nomes de campos, nunca valores; nenhuma configuração é sensível; limite de tamanho e de frequência. |
| VII. Testes determinísticos | OK: unitários sem rede, integração com Postgres em container, e2e contra a API local. |
| VIII. Conteúdo de terceiros | OK: nada muda em puzzles, atribuição ou indexação. |
| IX. Migrações | OK: `0005` gerada pelo `drizzle-kit`, com o gatilho escrito à mão; sem `push`. |
| Restrições técnicas (tokens, celular, temas) | OK: a modal é testada em 360 px e nos dois temas; a animação respeita `prefers-reduced-motion`. |
| Fluxo (Context7) | OK: consultado para Drizzle, React Router e Fastify. |

Resultado: aprovado, sem violações. Reavaliado depois da Fase 1: continua aprovado. O pedido tolerante a chaves desconhecidas (R3) foge da convenção de pedidos estritos da feature 012, que não é princípio da constituição. A justificativa está no research.

## Project Structure

### Documentation (this feature)

```text
specs/021-configuracoes-usuario/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── settings-api.md  # GET/PUT /api/settings
│   └── ui.md            # engrenagem, modal, tema, dicas, ajudas, ir direto
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/shared/src/
├── settings/
│   ├── schema.ts               # settingsSchema, parseSettings, defaultSettings, pedido e envelope
│   └── schema.test.ts
└── index.ts                    # exporta settings

apps/api/
├── drizzle/0005_user_settings.sql      # tabela, gatilho, check do limitador ampliado
└── src/
    ├── db/schema.ts                    # userSettings; rateLimitActions + SETTINGS_SAVE
    ├── lib/saved-at.ts                 # savedAtTooFar (sai de progress.service.ts)
    ├── modules/rate-limit/limits.ts    # settingsSave: 120 / 60 min
    ├── modules/settings/
    │   ├── settings.routes.ts          # GET/PUT, bodyLimit 4096, requireSession
    │   ├── settings.schemas.ts         # documentação OpenAPI
    │   ├── settings.service.ts         # decideSettingsSave, get, save
    │   ├── settings.service.test.ts
    │   └── settings.repository.ts      # find, upsert com setWhere
    ├── app.ts                          # registra settingsRoutes
    └── test/settings.int.test.ts

apps/web/src/
├── components/Tooltip.tsx (+ .module.css, .test.tsx)
├── ../index.html                # script inline do tema lê cruzadinha:settings (e a chave antiga)
├── themes/
│   ├── theme.ts                # nextTheme claro → escuro → auto; leitura via settings
│   ├── theme-transition.ts     # startThemeTransition (View Transition em círculo) + teste
│   ├── ThemeButton.tsx (+ .module.css, .test.tsx)
│   └── ThemeToggle.tsx         # removido
├── features/settings/
│   ├── settings-store.ts       # registro local, migração, evento storage, useSettings
│   ├── settings-sync.ts        # fila de envio, primeiro login, 404/429
│   ├── settings-open.ts        # modal aberta (pausa do relógio)
│   ├── SettingsButton.tsx      # engrenagem + Tooltip
│   ├── SettingsDialog.tsx (+ .module.css)
│   └── *.test.ts(x)
├── api/settings.ts, api/query-keys.ts  # getSettings, saveSettings, queryKeys.settings
├── app/AppLayout.tsx            # engrenagem no lugar do ThemeToggle; monta a sincronização
├── app/router.tsx               # directPlayLoader na rota /
├── app/direct-play.ts (+ teste) # decisão de "ir direto ao jogo"
├── game-logic/help.ts, reducer.ts      # limites null e no pedido
├── game-logic/clue-strike.ts           # StrikeMode 'filled', isWordFilled
├── features/game/useGame.ts, HelpButtons.tsx, ClueList.tsx, ClueSheet.tsx, GamePage.tsx
├── features/game/board-size.ts, features/library/library-width.ts  # leem/gravam pelo settings-store
├── features/library/source-choice.ts, SourceTabs.tsx, LibraryPage.tsx, DayRoute.tsx
└── ../e2e/configuracoes.spec.ts (+ ajustes em visitante, fontes, sem-saltos)

docs/design.md, docs/data-definitions/, docs/entity-relationship-diagrams/, CLAUDE.md   # feature 021
```

**Structure Decision**: a feature segue a divisão do monorepo.
- `shared` guarda o contrato.
- A API ganha o módulo `settings` nas três camadas.
- O site ganha `features/settings`.
- As regras de jogo continuam em `game-logic`.
- O tema continua em `themes`.

## Complexity Tracking

Nenhuma violação a justificar.

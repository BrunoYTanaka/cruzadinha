# Implementation Plan: Reorganizar web e API por feature

**Branch**: `chore/reorganizar-web-e-api-por-feature-com-page` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/037-reorganizar-por-feature/spec.md`

## Summary

Reorganizar `apps/web/src` e `apps/api/src` por feature sem mudar comportamento, em oito passos curtos (um PR `refactor/...` cada). A fronteira entre áreas passa a ser checada por `dependency-cruiser` (regras `forbidden`, primeiro com severidade `warn`, no fim `error`), que também detecta ciclos; a mesma ferramenta cobre FR-008 e FR-009. A medição do código real (research.md) mostrou que o quadro da issue está incompleto: há mais ciclos que os dois citados, `apps/web/src/specs/` não existe, `help-schema` e `save-types` ainda não existem como arquivos, e `features/*` importa de `app/`. O plano ajusta o alvo a isso (ver Decisões em research.md).

## Technical Context

**Language/Version**: TypeScript 6 strict, Node.js 24 (monorepo npm workspaces)

**Primary Dependencies**: `dependency-cruiser` (novo, só devDependency na raiz, decisão D1); ESLint 10 e Vitest 5 já existentes; nada muda em runtime

**Storage**: N/A (nenhuma tabela, nenhuma chave de `localStorage`/IndexedDB muda)

**Testing**: Vitest (unidade, `jsdom` no site), `test:int` (Testcontainers) na API, Playwright e2e no site; mais o novo `check:deps`

**Target Platform**: site estático no Cloudflare Pages, API Fastify no Render (sem mudança)

**Project Type**: monorepo web-service (`apps/web`, `apps/api`, `packages/shared`)

**Performance Goals**: chunks do site equivalentes (SC-007, tolerância em research.md D6)

**Constraints**: sem mudança de comportamento, de rota HTTP ou de contrato; `git mv` para preservar histórico; cada PR com CI verde; sem bump de versão (só `refactor`)

**Scale/Scope**: ~250 arquivos em `apps/web/src`, ~36 imports em `apps/api/src/app.ts`; 6 features no site, 8 módulos na API

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|-----------|-----------|
| I. TypeScript estrito | Passa. Nenhum tipo novo; nenhum `any`. |
| II. Qualidade automatizada | Passa e reforça: `check:deps` entra em `lint`/CI/hook. |
| III. Camadas no back (rota → serviço → repositório) | Passa. A separação de `identity` em sessão/cadastro/recuperação mantém as camadas dentro de cada parte. |
| IV. Integrações externas em adaptadores | Passa. `sources/` não muda de conteúdo. |
| V. Lógica de jogo pura e testada | Reforça: `domain/` sem React nem I/O, checado pela regra. |
| VI. Segurança e privacidade | Passa. Rotas, cookies e limites idênticos; os testes de integração de login/cadastro/recuperação não mudam. |
| VII. Testes determinísticos | Passa. Só caminhos de importação mudam nos testes. |
| VIII/IX. Conteúdo de terceiros / schema | N/A. Sem migração. |
| Fluxo: manutenção dispensa spec | Spec feita a pedido (registrado na spec). Biblioteca nova (`dependency-cruiser`) consultada via Context7 (research.md D1). |
| Versões compatíveis entre partes | Passa. Nenhum contrato muda, nada a coordenar. |

Re-check após o desenho (Phase 1): sem violação; Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/037-reorganizar-por-feature/
├── plan.md              # este arquivo
├── research.md          # medições do código real e decisões D1..D8
├── data-model.md        # mapa de destino arquivo a arquivo (web e API)
├── quickstart.md        # como validar cada passo
├── contracts/
│   └── boundaries.md    # regras de dependência (viram .dependency-cruiser.cjs)
└── tasks.md             # /speckit-tasks (não criado aqui)
```

### Source Code (repository root)

```text
.dependency-cruiser.cjs          # novo: regras web e API, severidade por passo
package.json                     # novo script check:deps; lint-staged e CI o chamam

apps/web/src/
├── app/            router.tsx AppLayout RouteError reload-after-deploy main-level wiring
├── pages/          login register verify-email forgot-password reset-password
│                   library (inclui direct-play) day game status
├── shared/
│   ├── components/ (Button Dialog Field Notice Pill ResizeHandle Tooltip VisuallyHidden
│   │                ErrorState NotFoundPage)
│   ├── hooks/      (useDocumentTitle useMediaQuery useSlowServer)
│   ├── services/   (api/ storage settings-store config)
│   ├── helpers/    (dates time)
│   └── themes/
├── domain/
│   ├── game/       (reducer state navigation help letters completion clue-* neighbours
│   │                help-schema save-types)
│   └── guest/      (guest-progress)
├── features/
│   ├── session/    useSession redirect session-ended session-expired session-handlers
│   │               viewer SessionExpiredNotice ReloginDialog
│   ├── account/    components/*Form, ResendLink, useCountdown, token-fragment, messages
│   ├── guest/      guest-store guest-record guest-library guest-save-queue
│   ├── library/    calendar, today-cards, source-*, library-width, useSourceLibraries
│   ├── settings/   SettingsButton SettingsDialog settings-sync settings-open
│   ├── game/       components/ hooks/ services/ helpers/ (Board, Clue*, Help*, useGame…)
│   └── status/     ServerWake
└── test/

apps/api/src/
├── app.ts server.ts cli.ts config.ts
├── platform/       db/ http/ lib/ docs/ rate-limit/ email/   (index.ts nos dois últimos)
├── modules/
│   ├── identity/   sessions/ registration/ recovery/ (+ users.repository, cleanup.repository)
│   ├── puzzles/ library/ progress/ settings/ health/
├── seed/           seed.ts seed-user.ts seed-puzzle.ts (saiu de db/ para não importar módulos)
├── cli/
└── sources/        sem mudança
```

**Structure Decision**: a estrutura-alvo da issue, com três ajustes medidos no código: `session` e `account` separadas (a sessão é dependência de várias features e hoje vive em `auth` + `app/`), `ErrorState`/`NotFoundPage` em `shared/components` (features os importam) e `seed` fora de `platform/db` (importava módulos). Detalhe arquivo a arquivo em `data-model.md`.

## Execução em passos (um PR `refactor/...` cada)

| # | Passo | Prova de pronto |
|---|-------|-----------------|
| 1 | `.dependency-cruiser.cjs` com todas as regras em `warn` + `check:deps` fora do CI bloqueante; remover `apps/web/src/specs/` se existir (não existe: nada a apagar) | `check:deps` roda e lista as violações atuais |
| 2 | Quebrar os ciclos do web (D3): `settings-store` e `config` → `shared/services`; extrair `help-schema` e `save-types` para `domain/game`; `guest-record`/`guest-save-queue` deixam de importar `game`; `useGame` recebe a fábrica da fila; `ErrorState`, `NotFoundPage`, `useSlowServer` → `shared`; `session-*`, `viewer` → `features/session` | zero ciclos no web |
| 3 | Mover por feature (uma por PR): `status`, `account` (+`session`), `guest`, `library`, `settings`; `game-logic` → `domain/` | `check:deps` sem violação nova; testes |
| 4 | `pages/` e afinar `GamePage` (quebra de `features/game` em `components/hooks/services/helpers`) | chunks medidos (D6), e2e |
| 5 | API: `auth` → `identity/{sessions,registration,recovery}`, rotas separadas; `seed/` | `test:int`, OpenAPI idêntico (D7) |
| 6 | API: `rate-limit` e `email` → `platform/` com `index.ts` | idem |
| 7 | Regras de `warn` para `error`; `check:deps` entra no `lint`, no hook e na CI | uma importação proibida de teste falha |
| 8 | Atualizar CLAUDE.md, `docs/`, specs com caminhos antigos (pode ir junto de cada passo; este fecha o que sobrar) | SC-008 |

Correspondência com `tasks.md` (10 PRs): passo 1 = PR 1; passo 2 = PR 2; passo 3 = PR 3 a 5 (shared/domain, status/session/account, guest/library/settings); passo 4 = PR 6; passo 5 = PR 7; passo 6 = PR 8; passo 7 = PR 9; passo 8 = PR 10. A web (PR 2 a 6) e a API (PR 7 e 8) podem andar em paralelo; a ordem obrigatória é 1 → 2 → (3 a 6, 7 e 8) → 9.

## Complexity Tracking

Sem violações a justificar.

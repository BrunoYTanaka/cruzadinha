# Research: Reorganizar web e API por feature

Medido em 2026-10-26 sobre `main` (commit `ec0adf3`) com um script que lê as importações relativas de `apps/web/src` e `apps/api/src` e agrega por área (fora dos arquivos de teste).

## Medições que corrigem a issue

| Afirmação da issue | Código real | Efeito no plano |
|---|---|---|
| `apps/web/src/specs/` é resíduo | A pasta não existe (`git ls-files` não lista nada). | Passo "apagar" vira no-op; sai do FR-012 como ação. |
| Ciclos: `settings ↔ library` e `game ↔ guest` | Há mais: `auth ↔ app` (`session-ended`, `session-expired`), `status ↔ app` (`ErrorState`), `library → app` (`ErrorState`, `NotFoundPage`), `game → app` (`ErrorState`), `auth → status` (`useSlowServer`), `themes → settings` (`settings-store`). Somados, formam ciclos que passam por `app/`. | D3: `ErrorState`, `NotFoundPage`, `useSlowServer`, `session-*` saem de `app/`. |
| `help-schema` e `save-types` descem para `domain/game` | Os arquivos não existem: o esquema de ajuda está dentro de `help-storage.ts` e os tipos de salvamento dentro de `save-queue.ts` (importados por `guest-record.ts` e `guest-save-queue.ts`). | D3: extrair os dois, não mover. |
| `app/` mistura casca e sessão | Confirmado: `session-ended`, `session-expired`, `session-handlers`, `viewer` (sessão) e `direct-play` (biblioteca + configurações). | Sessão vira feature; `direct-play` vai para `pages/library`. |
| `GamePage.tsx` com 449 linhas e cinco features | Confirmado (449 linhas; importa auth, guest, library, settings e `app`). | Passo 4. |
| Só o `GamePage` está sob demanda hoje | `router.tsx` importa as outras páginas de forma estática; só `GamePage` usa `lazy: import(...)`. | D6: a exceção da regra do router cobre esse `import()`. |
| `app.ts` com 40 imports | 36 linhas de `import`. Importa `auth` (5), `email` (4), `rate-limit` (3) etc. | `index.ts` de plataforma e identidade reduzem; sem meta numérica. |
| Módulos importam infra "por dentro" | Confirmado: `../rate-limit/limits`, `../rate-limit/address-gate`, `../email/templates`; também `docs` e `puzzles/progress/library/settings` importam `modules/auth/session.plugin`, e `db/seed-user.ts` importa `modules/auth` e `modules/puzzles`. | D5: `seed/` sai de `platform/db`; sessão por `identity/index.ts`. |

## Decisões

### D1 — `dependency-cruiser` para regras e ciclos

**Decisão**: usar `dependency-cruiser` com `.dependency-cruiser.cjs`: regras `forbidden` (`from.path`, `to.path`, `to.pathNot`), severidade `warn` ou `error` por regra, `to.circular: true` para ciclos, `options.tsConfig` para resolver TypeScript. Um comando cobre fronteiras e ciclos (FR-008, FR-009). Consultado via Context7 (`/sverweij/dependency-cruiser`).

**Alternativas**: `madge --circular --ts-config` (só ciclos, exit 1; precisaria de outra ferramenta para fronteiras); `no-restricted-imports` do ESLint (os imports são relativos, então o padrão por texto de importação não distingue `../settings/x` de `./x`, e não detecta ciclos); `eslint-plugin-boundaries` (o ESLint 10 do repo já exigiu `overrides` para o `jsx-a11y`; mais um plugin com peer range arriscado).

### D2 — Ordem de dependência das features do site

`session < guest < library < settings < game`; `account` e `status` dependem só de `session` e `shared`. Medido: `library → guest/session/settings`, `settings → library/session`, `game → guest/library/settings/session` são todas coerentes com a ordem **depois** de D3; hoje violam `library → settings` (`library-width`, `source-choice` importam `settings-store`) e `guest → game`.

Leitura da ordem: uma feature só importa de feature **anterior**. `settings → library` (`SettingsDialog` importa `source-choice`) é permitido; `library → settings` não, e hoje acontece porque `settings-store` mora em `settings` (resolvido em D3).

### D3 — Quebras de ciclo

1. `settings-store` e `config` → `shared/services` (importados por `library`, `game`, `themes`, `test/setup`).
2. Extrair o esquema de ajuda de `help-storage.ts` e os tipos de `save-queue.ts` para `domain/game`; `guest-record` e `guest-save-queue` passam a importar de lá.
3. `GamePage` (em `pages/game`) cria a fila de salvamento (visitante ou conta) e passa a fábrica a `useGame`; `useGame` deixa de importar `guest-store` e `guest-save-queue`.
4. `ErrorState`, `NotFoundPage` → `shared/components`; `useSlowServer` → `shared/hooks` (era importado por `auth/useSession` e `app/ErrorState`).
5. `session-ended`, `session-expired`, `session-handlers`, `viewer` → `features/session` com `useSession`/`redirect`; `test/render` e `test/game-harness` importam pela entrada pública.

### D4 — Divisão de `account` e `session`

`session` (sem interface de formulário): `useSession`, `redirect`, handlers de fim de sessão, `viewer`, `SessionExpiredNotice`, `ReloginDialog`. `account`: formulários dos cinco fluxos (`LoginForm`, `RegisterForm`, `VerifyEmailForm`, `ForgotPasswordForm`, `ResetPasswordForm`), `ResendLink`, `useCountdown`, `token-fragment`, `useRegistration`, `messages`. Cada página em `pages/*` só compõe. `ReloginDialog` fica em `session` porque é disparado pelo fim de sessão, não por um fluxo de conta; confirma-se ao mover.

### D5 — API

- `identity/sessions` (login, logout, `me`, plugin de sessão, cookie, política, repositório de sessões), `identity/registration` (cadastro, confirmação, reenvio, `pending.repository`), `identity/recovery` (esqueci/redefinir, `reset-tokens.repository`); `users.repository` e `cleanup.repository` ficam na raiz de `identity` porque as três partes (e o CLI) os usam.
- Caminhos `/api/auth/*` ficam iguais: cada parte registra suas rotas no mesmo prefixo.
- `identity/index.ts` exporta o que os outros módulos usam (`createRequireSession`, `createOptionalSession`, `SESSION_COOKIE`, `createAccount`); sem isso `puzzles`, `progress`, `library`, `settings` e `docs` seguiriam importando um arquivo interno.
- `platform/rate-limit/index.ts` e `platform/email/index.ts` são a única entrada; módulos e CLI importam só por elas. `email` importa `rate-limit` pela entrada.
- `db/seed*.ts` → `seed/` (importam módulos; `platform` não pode depender de `modules`). `package.json` do `api`: `db:seed` aponta para o novo caminho.
- `config.ts` fica na raiz; módulos e plataforma o importam (já é assim).

### D6 — Chunks do site

Hoje só `GamePage` é carregado sob demanda. A entrada pública (`index.ts`) de uma feature puxa tudo que exporta: uma página sob demanda que importe a feature por ela pode arrastar código para o chunk principal, e a feature `game` é a grande. Regra: o `import()` do router aponta direto para `pages/game/GamePage`; `pages/game` importa o que precisa de `features/game` pela entrada. Medição: `npm run build -w @cruzadinha/web` antes do passo 1 e depois de cada passo 3/4, comparando os arquivos de `dist/assets`. Tolerância: chunk principal (entrada) +5% e `react`/`vendor` iguais; o chunk do jogo não pode ser absorvido pelo principal. O corte dos chunks atuais está registrado em CLAUDE.md (feature 028: 71 + 219 + 228 kB); a linha de base é medida no passo 1.

### D7 — Provas sem mudança de comportamento

- Mesma lista de rotas e esquemas: comparar `GET /api/docs/json` antes e depois (diff vazio).
- Testes existentes passam sem mudar expectativa; diff de teste só em importações.
- e2e do site e `test:int` da API em cada PR que os toca.

### D8 — Entrega

Cada passo é um PR `refactor/<slug>` (branch pelo `check:branch`). `git mv` em commit separado da edição de importações, para o histórico seguir. O passo 7 (`warn` → `error`) é o último de código.

## Riscos

- O corte de `features/game`/`GamePage` só aparece ao mover; o plano fixa os critérios (SC-005, páginas só compõem) e não a divisão exata.
- Conflito com PRs de outras features no meio: PR por passo e curto.
- `dependency-cruiser` resolve arquivos `.module.css`? Tratado com `doNotFollow`/`exclude` de `\.css$` na configuração (valida-se no passo 1).
- `node_modules` não estava instalado ao planejar: a linha de base de chunks e a execução do `depcruise` ficam para o passo 1.

## Baseline (medida em 2026-10-26, antes do passo 2)

`npm run build -w @cruzadinha/web`, tamanho dos arquivos JS de `apps/web/dist/assets`:

| Chunk | kB | gzip kB |
|---|---|---|
| `index` (entrada) | 83.78 | 27.05 |
| `react` | 218.76 | 68.26 |
| `vendor` | 228.33 | 68.75 |
| `GamePage` (lazy) | 48.29 | 16.55 |
| `rolldown-runtime` | 0.58 | 0.36 |

CSS: `index` 22.92, `GamePage` 13.50. Tolerância do passo 4: `index` até 87.97 kB (+5%), `react`/`vendor` iguais, `GamePage` em chunk próprio. O OpenAPI "antes" (T002) fica para quando a API local estiver no ar.

## Violações iniciais (T007)

`npm run check:deps` (dependency-cruiser 18.7.0, 248 módulos, 884 dependências): 67 avisos, 0 erros.

| Regra | Avisos |
|---|---|
| `web-feature-public-api` | 27 |
| `api-modules-isolated` | 25 |
| `web-layer-app` | 9 |
| `web-guest-no-feature` | 2 |
| `web-feature-order-library` | 2 (`library` → `settings-store`) |
| `web-feature-order-guest` | 2 (`guest` → `game`) |
| `no-cycles` | **0** |

Achado: os ciclos da issue são **entre features**, não entre arquivos (`settings-store` não importa a biblioteca, então `madge`/`no-cycles` de arquivo não os vê). Quem os pega são `web-feature-order-*` e `web-guest-no-feature`. A regra `no-cycles` continua valendo como proteção contra ciclos de arquivo. `api-modules-isolated` ainda conta `rate-limit` e `email` como módulos; o aviso some quando forem para `platform/` (PR 8).

## Registro da execução

- **PR 4 (account)**: `ReloginDialog` (sessão) usa o estilo e as mensagens das telas de autenticação; como `session` não pode importar `account`, `AuthPage.module.css` foi para `shared/components/` e `messages.ts` para `features/session/`. As cinco páginas de autenticação já nasceram em `pages/<rota>/` (finas, só renderizam o `*Form` de `features/account`, que mantém o título da aba); o restante das páginas move no PR 6.
- **PR 2 (useGame)**: `game → guest` é permitido pela ordem; o ciclo real era `guest → game`, resolvido ao extrair `help-schema.ts` e `save-types.ts`. Mesmo assim `useGame` deixou de importar `guest`: `GamePage` entrega `store` e `createQueue` no `GameOwner` do visitante (FR-010).
- **Testes que leem CSS** (`touch-targets`, `button-states`, `a11y`, `tokens-contrast`) passaram a usar `test/css-file.ts` (`readCss('Nome.css')`), que acha o arquivo pelo nome em `src/`, para não quebrar a cada mudança de pasta.
- **PR 6 (game e pages)**: `features/game` ficou em `components/{board,clues,controls,dialogs}` (10 a 13 arquivos cada), `hooks/`, `services/` (`board-size`, `help-storage`, `save-queue`, que usam o store de configurações ou `localStorage`) e `helpers/` (`attribution`, `board-keys`, `clock`, `format-date`). `GamePage` foi de 449 para 45 linhas: o carregamento (cruzada, progresso da conta, registro do visitante e o dono do jogo) virou `useGameData` e a tela virou `GameScreen`, ambos em `features/game`; a página só escolhe entre erro, carregando e `GameScreen`. Os testes de integração do jogo (`GuestGame`, `GameCompletion`, `PlayAgainHelps`, etc.) ficaram com a página em `pages/game/`. Como `useGameData` já está dentro de `features/game` (que pode importar `guest`), a entrega da fábrica da fila deixou de ser feita pela página: o `GameOwner` do visitante continua levando `store` e `createQueue`, montados em `useGameData`.
- **Chunks após o PR 6** (T031): `index` 85.13 kB (baseline 83.78, +1,6%), `GamePage` 47.13 kB em chunk próprio (baseline 48.29), `react` e `vendor` idênticos.
- **Barris**: `features/*/index.ts` foram gerados a partir do que os outros importam. Um barril carrega tudo o que exporta: `test/setup.ts` importa o arquivo direto (`features/account/helpers/token-fragment`) porque, pelo barril, o `setup` carregava o cliente de API real antes do `vi.mock` de `session-handlers.test.ts`.

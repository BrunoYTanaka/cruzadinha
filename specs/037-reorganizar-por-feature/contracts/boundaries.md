# Contrato: regras de dependência

Viram `forbidden` em `.dependency-cruiser.cjs` (D1). Passos 1 a 6 com severidade `warn`; passo 7 troca para `error`. Os caminhos são os do destino (data-model.md).

## Site (`apps/web/src`)

| Regra | From | To (proibido) |
|---|---|---|
| `web-no-cycles` | qualquer | `circular: true` |
| `web-layer-app` | `shared`, `domain`, `features`, `pages` | `app/` |
| `web-layer-pages` | `shared`, `domain`, `features` | `pages/` |
| `web-pages-isolated` | `pages/X` | `pages/Y` |
| `web-shared-up` | `shared`, `domain` | `features/` (e `shared` → `domain` é permitido, `domain` → `shared` não) |
| `web-domain-pure` | `domain` | `react`, `shared/services`, `features/` |
| `web-feature-public-api` | `features/A` | `features/B/<qualquer arquivo exceto index.ts>` (B ≠ A) |
| `web-feature-order` | `features/{session,guest,library,settings,game}` | feature mais à direita na ordem `session < guest < library < settings < game` |
| `web-account-status` | `features/account`, `features/status` | qualquer feature que não seja `session` |
| `web-guest-no-feature` | `features/guest` | qualquer outra feature (só `domain` e `shared`) |
| `web-test-exempt` | `*.test.ts(x)`, `test/`, `e2e/` | isento |

Uma página pode chamar o cliente HTTP (`shared/services/api/*`) direto, para as chamadas que só ela usa (loaders e consultas da rota); a regra de compor features vale para os componentes e hooks, não para o acesso à API. Nenhuma regra proíbe isso.

Exceção explícita: `app/router.tsx` importa `pages/*` por caminho direto, e o `import()` de `pages/game/GamePage` fica fora da regra de entrada pública.

## API (`apps/api/src`)

| Regra | From | To (proibido) |
|---|---|---|
| `api-no-cycles` | qualquer | `circular: true` |
| `api-platform-up` | `platform/` | `modules/`, `sources/` |
| `api-rate-limit-entry` | tudo fora de `platform/rate-limit` | `platform/rate-limit/<qualquer exceto index.ts>` |
| `api-email-entry` | tudo fora de `platform/email` | `platform/email/<qualquer exceto index.ts>` |
| `api-identity-entry` | `modules/{puzzles,library,progress,settings}`, `platform/docs`, `cli/`, `seed/` | `modules/identity/<qualquer exceto index.ts>` |
| `api-identity-sessions-alone`, `api-identity-registration-alone`, `api-identity-recovery-no-registration` | `identity/sessions`, `identity/registration`, `identity/recovery` | as outras partes de `identity` (`recovery` só usa `sessions`) |
| `web-api-never-import`, `api-web-never-import` | `apps/web`, `apps/api` | `apps/api`, `apps/web` |
| `api-modules-isolated` | `modules/X` | `modules/Y` (exceto `identity` por `index.ts` e `progress → puzzles.repository`, a ser tratado: ver nota) |
| `api-sources-isolated` | `sources/A` | `sources/B` (comum em `sources/common`) |

Nota: `progress.service` importa `puzzles.repository`; ou se expõe por `modules/puzzles/index.ts` ou fica como exceção nomeada. Decisão no passo 5.

Testes (`*.test.ts`, `src/test/`) são isentos.

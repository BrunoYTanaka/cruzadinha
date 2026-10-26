# Data Model: mapa de destino

Sem tabela, sem schema, sem DDE/ERD. Esta é a "modelagem" da reorganização: de onde cada coisa sai e para onde vai. A divisão fina de `features/game` e a classificação `helpers/` × `services/` se confirmam ao mover (spec, Edge Cases).

## Site (`apps/web/src`)

| Origem | Destino |
|---|---|
| `app/router.tsx`, `AppLayout*`, `RouteError*`, `reload-after-deploy*` | `app/` (ficam) |
| `app/ErrorState*`, `app/NotFoundPage.tsx` | `shared/components/` |
| `app/session-ended`, `session-expired`, `session-handlers`, `viewer` | `features/session/` |
| `app/direct-play*` | `pages/library/` |
| `main.tsx`, `config.ts` | `main.tsx` fica; `config.ts` → `shared/services/` |
| `components/*` | `shared/components/` |
| `lib/useDocumentTitle`, `useMediaQuery` | `shared/hooks/` |
| `lib/dates`, `time` | `shared/helpers/` |
| `lib/storage` | `shared/services/` |
| `api/*` (`client`, `query-keys`, `server-wake`, endpoints) | `shared/services/api/` |
| `features/settings/settings-store` | `shared/services/` |
| `features/status/useSlowServer` | `shared/hooks/` |
| `themes/*` | `shared/themes/` |
| `game-logic/*` (menos `guest-progress`) | `domain/game/` |
| `game-logic/guest-progress*` | `domain/guest/` |
| esquema de ajuda (de `features/game/help-storage.ts`) e tipos de salvamento (de `save-queue.ts`) | `domain/game/help-schema.ts`, `save-types.ts` (extraídos) |
| `features/auth/useSession`, `redirect`, `SessionExpiredNotice`, `ReloginDialog` | `features/session/` |
| `features/auth/*Page`, `AuthPage.module.css` | `pages/{login,register,verify-email,forgot-password,reset-password}/` (só compõem) |
| formulários dentro de `*Page`, `ResendLink`, `useCountdown`, `token-fragment`, `useRegistration`, `messages` | `features/account/` |
| `features/guest/*` | `features/guest/` (ficam; deixam de importar `game`) |
| `features/library/LibraryPage`, `DayRoute` | `pages/library/`, `pages/day/` |
| `features/library/*` restante | `features/library/` |
| `features/settings/*` restante | `features/settings/` |
| `features/status/StatusPage` | `pages/status/` |
| `features/status/ServerWake*` | `features/status/` |
| `features/game/GamePage*` | `pages/game/` |
| `features/game/*` restante (~65 arquivos) | `features/game/{components,hooks,services,helpers}/` |

## API (`apps/api/src`)

| Origem | Destino |
|---|---|
| `db/` (menos `seed*`), `http/`, `lib/`, `docs/` | `platform/{db,http,lib,docs}/` |
| `db/seed.ts`, `seed-user.ts`, `seed-puzzle.ts` | `seed/` |
| `modules/rate-limit/` | `platform/rate-limit/` (+ `index.ts`) |
| `modules/email/` | `platform/email/` (+ `index.ts`) |
| `modules/auth/session.plugin`, `session-cookie`, `session-policy`, `sessions.repository`, login/logout/`me` (`auth.service`, parte de `auth.routes`/`auth.schemas`) | `modules/identity/sessions/` |
| `modules/auth/registration.service`, `pending.repository`, rotas e esquemas de cadastro | `modules/identity/registration/` |
| `modules/auth/recovery.service`, `reset-tokens.repository`, rotas e esquemas de recuperação | `modules/identity/recovery/` |
| `modules/auth/users.repository`, `cleanup.repository` | `modules/identity/` |
| (novo) | `modules/identity/index.ts`, `platform/rate-limit/index.ts`, `platform/email/index.ts` |
| `modules/{puzzles,library,progress,settings,health}`, `sources/`, `cli/` | ficam |

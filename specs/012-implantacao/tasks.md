---
description: "Lista de tarefas da feature 012: implantação"
---

# Tasks: Implantação

**Input**: Documentos de design em `/specs/012-implantacao/`

**Prerequisites**: plan.md, spec.md, research.md (R1 a R17), data-model.md, contracts/ (proxy, health, deploy-workflow, release, ui-server-wake, ui-after-deploy), quickstart.md

**Tests**: incluídos. A constituição (princípios II e VII) pede testes automáticos sem internet, e o plano define unitários com `fetch` falso, relógio falso, `sessionStorage` falso e `app.inject`, um teste de integração com Postgres real e um e2e com `page.route`. Os testes de cada fase vêm antes da implementação e devem falhar primeiro. Nada nos testes fala com Render, Cloudflare, Neon ou GitHub.

**Organization**: tarefas agrupadas por história de usuário (US1 a US5), na ordem de prioridade da spec. As tarefas **(manual)** são feitas pelo autor nos painéis dos provedores e do GitHub, seguindo `docs/deploy.md`. Nenhum valor real entra no repositório, em commits ou na conversa (constituição, princípio VI).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história de usuário da spec (US1 a US5). Setup, Foundational e Polish não têm rótulo.
- Todo caminho é relativo à raiz do repositório.

## Path Conventions

Monorepo npm workspaces: `apps/api/src/`, `apps/web/src/`, `apps/web/functions/` (novo), `apps/web/e2e/`, `packages/shared/src/`, `.github/workflows/`, `docs/`. Comentários e textos de interface ficam em português, como no resto do código.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: preparar o workspace web para a Pages Function, as versões iniciais e as variáveis novas

- [X] T001 Escolher a versão exata do Wrangler (a estável atual, conferida com `npm view wrangler version`) que o `deploy.yml` (input `wranglerVersion` do `cloudflare/wrangler-action@v4`) e o roteiro (`npx wrangler@<versão>`) vão usar, e anotá-la para T025 e T049. **Não** acrescentar `wrangler` ao `package.json`: o pacote é pesado (`workerd`) e só é usado na publicação (research R11).
- [X] T002 [P] Incluir `functions` no `include` de `apps/web/tsconfig.json` (`["src", "functions"]`) e conferir que `npm run lint` e `npm run typecheck` passam a cobrir `apps/web/functions/` (ajustar `eslint.config.mjs` só se a pasta ficar de fora).
  - Acrescentar `'functions/**/*.test.ts'` ao `include` de `apps/web/vitest.config.ts`.
  - Os testes da Function começam com o comentário `// @vitest-environment node` (research R11).
  - Em `apps/web/src/test/setup.ts`, envolver `HTMLCanvasElement.prototype.getContext = () => null` em `if (typeof HTMLCanvasElement !== 'undefined')`, porque o `setupFiles` também roda nos arquivos com ambiente node.
- [X] T003 [P] Acrescentar a `.env.example`, na seção do servidor:
  - `PROXY_SECRET=` (vazio), com o comentário "Segredo do repasse do site (produção). Vazio = API aceita pedidos diretos, como no desenvolvimento. 32 a 256 caracteres.";
  - `RELEASE_COMMIT=` (vazio), com o comentário "SHA publicado, mostrado no /api/health; no Render vem de RENDER_GIT_COMMIT.".
- [X] T004 [P] Versões iniciais (research R12, data-model "Versões"):
  - `"version": "0.1.0"` em `apps/api/package.json` (hoje `0.0.0`), `apps/web/package.json` (campo novo, logo depois de `name`) e `packages/shared/package.json` (campo novo);
  - `npm install --package-lock-only` para o `package-lock.json` refletir as versões;
  - conferir com `npm ci` que nada quebrou.
- [X] T005 [P] Acrescentar a `.prettierignore` as linhas `**/CHANGELOG.md` e `.release-please-manifest.json`, com um comentário dizendo que esses arquivos são gerados pela release-please e que formatá-los faria o `format:check` reprovar o pedido de lançamento (research R12).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: schemas compartilhados (health, erro e respostas tolerantes a campos novos) e configuração da API, usados por US1 e US3

**⚠️ CRITICAL**: US1 depende de T006 a T013; US3 depende de T006, T009, T011, T012 e T013.

- [X] T006 [P] Em `packages/shared/src/health.test.ts`, acrescentar casos:
  - aceita `version` em semver (`0.1.0`, `12.3.45`) e sem `version`;
  - rejeita `version` fora de `^\d+\.\d+\.\d+$` (`v0.1.0`, `0.1`, `0.1.0-beta`);
  - aceita `commit` com 7 e com 40 hexadecimais minúsculos e sem `commit`;
  - rejeita `commit` com maiúsculas, com 6 ou 41 caracteres e com caracteres não hexadecimais;
  - **descarta** um campo desconhecido (`{ status, database, extra: 1 }` passa e o resultado não tem `extra`).
- [X] T007 [P] Em `packages/shared/src/api-error.test.ts`, acrescentar um caso que confere que `apiErrorCodeSchema.options` contém `forbidden`.
- [X] T008 [P] Nos testes de `packages/shared/src/puzzle/response.test.ts`, `library/schema.test.ts`, `progress/schema.test.ts`, `auth/schema.test.ts` e `invites/schema.test.ts` (criar os que não existirem):
  - trocar os casos "rejeita propriedades extras" dos **schemas de resposta** por "descarta propriedades extras" (a resposta com um campo a mais passa e o campo some do resultado);
  - manter os casos de rejeição nos schemas de **pedido** e em `puzzleSchema`/`solutionSchema`, e acrescentar um caso que confere que eles continuam rejeitando campos extras (research R16, FR-025).
- [X] T009 Em `packages/shared/src/health.ts`, acrescentar ao `healthStatusSchema` `version: z.string().regex(/^\d+\.\d+\.\d+$/).optional()` e `commit: z.string().regex(/^[0-9a-f]{7,40}$/).optional()` (contracts/health.md), mantendo `z.object`. Em `packages/shared/src/api-error.ts`, acrescentar `'forbidden'` ao `apiErrorCodeSchema` (antes de `service-unavailable`). Faz T006 e T007 passarem.
- [X] T010 Nos arquivos de `packages/shared/src/` listados em data-model.md ("Schemas de resposta"), trocar `z.strictObject` por `z.object` só nos schemas que descrevem **respostas** da API:
  - envelope do puzzle;
  - item e lista da biblioteca;
  - envelope de resposta do progresso;
  - `userSchema` e `authResponseSchema`;
  - respostas de convites.

  Acrescentar, em cada schema trocado, o comentário "Resposta: descarta campos desconhecidos para o site anterior aceitar versões novas da API (FR-025)". Não mudar pedidos, `puzzleSchema`, `solutionSchema` nem `apiErrorSchema`. Faz T008 passar; rodar `npm test` nos três workspaces.
- [X] T011 [P] Em `apps/api/src/config.test.ts`, acrescentar casos (data-model.md, "Configuração da API"):
  - `PROXY_SECRET` ausente ou `''` → `proxySecret: undefined`;
  - com 32 e com 256 caracteres → aceito;
  - com 31 ou 257 → erro `PROXY_SECRET: deve ter de 32 a 256 caracteres`, e a mensagem de erro **não contém o valor recebido**;
  - `RELEASE_COMMIT` válido → `releaseCommit`;
  - sem `RELEASE_COMMIT` e com `RENDER_GIT_COMMIT` válido → usa `RENDER_GIT_COMMIT`;
  - os dois definidos → `RELEASE_COMMIT` tem precedência;
  - `''` vale como ausente;
  - valor fora de `^[0-9a-f]{7,40}$` → erro `deve ser um SHA de 7 a 40 caracteres hexadecimais`.
- [X] T012 Em `apps/api/src/config.ts`:
  - acrescentar ao `envSchema` `PROXY_SECRET` e `RELEASE_COMMIT`/`RENDER_GIT_COMMIT` com as regras de T011 (vazio vira `undefined` com `z.preprocess`, como `COLLECT_HISTORY_DAYS`);
  - acrescentar a `ServerConfig` os campos `proxySecret: string | undefined` e `releaseCommit: string | undefined`.

  Em `apps/api/src/test/app.ts`, dar a `buildTestApp` uma opção `env?: Record<string, string>`, mesclada ao objeto passado a `loadConfig`. Atualizar os objetos `ServerConfig` montados à mão em testes; para encontrá-los, usar `grep -rln 'trustProxyHops' apps/api/src`, que também lista os arquivos de produção a ignorar. Faz T011 passar.
- [X] T013 Rodar `npm run typecheck && npm test` e corrigir o que os campos e schemas novos quebrarem.

**Checkpoint**: schemas, versões e configuração prontos; nenhuma mudança de comportamento ainda.

---

## Phase 3: User Story 1 - Jogar pelo site publicado (Priority: P1) 🎯 MVP

**Goal**: o site no ar por HTTPS, com `/api/*` repassado à API pelo mesmo endereço, a API recusando pedidos diretos, limites contando pelo endereço real, rotas internas abrindo direto e `noindex`.

**Independent Test**: quickstart.md seções 2 e 3, com as verificações por `curl` e o fluxo convite → cadastro → jogar → outro aparelho.

### Tests for User Story 1 ⚠️

- [X] T014 [P] [US1] Criar `apps/web/functions/proxy.test.ts` para `proxyRequest(request, env, fetchImpl)` (contracts/proxy.md), com `fetchImpl` falso que registra o `Request` recebido:
  - monta a URL como `API_ORIGIN + pathname + search` (`https://site/api/puzzles?level=daily&date=2026-10-01` → `https://api.example/api/puzzles?level=daily&date=2026-10-01`);
  - repassa método e corpo de um `PUT` com JSON, e o cabeçalho `cookie`;
  - remove `host` e qualquer `x-cruzadinha-*` vindo do navegador (inclusive um `x-cruzadinha-client-ip` inventado);
  - acrescenta `x-cruzadinha-proxy-secret` com o valor de `env.PROXY_SECRET` e `x-cruzadinha-client-ip` com o valor de `CF-Connecting-IP`;
  - usa `redirect: 'manual'`;
  - devolve status, corpo e cabeçalhos da API como vieram, inclusive `set-cookie`, `retry-after` e `date`;
  - resposta com `content-type: text/html` → `503`, `retry-after: 5` e corpo `{ error: 'service-unavailable', message: 'O servidor está acordando. Tente de novo em instantes.' }`;
  - `fetchImpl` que lança → o mesmo `503`;
  - `env` incompleto → o mesmo `503`, sem chamar `fetchImpl`. Conta como incompleto: sem `API_ORIGIN`, sem `PROXY_SECRET`, `API_ORIGIN` que não é URL, `PROXY_SECRET` com menos de 32 caracteres ou valor com tipo diferente de string;
  - nenhum caminho põe o segredo no corpo ou nos cabeçalhos da resposta.
- [X] T015 [P] [US1] Criar `apps/api/src/http/proxy-guard.test.ts` (unitário, sem banco):
  - um `Fastify({ logger: { level: 'info', stream } })` mínimo com o plugin de T019 e duas rotas de teste, `GET /api/health` e `GET /api/eco`, que devolvem `{ address: request.clientAddress }`;
  - `proxySecret` fictício de 32+ caracteres gerado no teste e `app.inject`.

  Casos:
  - `GET /api/health` sem cabeçalho → 200;
  - `GET /api/eco` sem cabeçalho → 403 `{ error: 'forbidden', message: 'Acesso negado.' }`;
  - com segredo errado (mesmo tamanho e tamanho diferente) → 403;
  - com o segredo certo → 200;
  - com o segredo certo e `x-cruzadinha-client-ip: 203.0.113.7` → `clientAddress` é `203.0.113.7`;
  - com o segredo certo e `x-cruzadinha-client-ip: lixo` → `clientAddress` é `request.ip`;
  - **sem** `proxySecret` → todo pedido passa, `x-cruzadinha-client-ip` é ignorado e `clientAddress` é `request.ip`;
  - o log capturado de um 403 não contém o valor enviado.
- [X] T016 [P] [US1] Criar `apps/api/src/test/proxy.int.test.ts` (roda com `npm run test:int`, Postgres real) usando `buildTestApp({ ..., env: { PROXY_SECRET: <fictício>, TRUST_PROXY_HOPS: '1' } })` e `rateLimits` com `loginAddress: { max: 2, windowMinutes: 15 }`. Casos:
  - logins errados com `x-cruzadinha-client-ip: 203.0.113.1` e o segredo esgotam o limite: o seguinte recebe 429;
  - um login com `x-cruzadinha-client-ip: 203.0.113.2` continua permitido;
  - um `x-forwarded-for` diferente, com o mesmo `x-cruzadinha-client-ip` bloqueado, continua 429 (FR-006);
  - `GET /api/auth/me` sem o segredo → 403.

### Implementation for User Story 1

- [X] T017 [US1] Criar `apps/web/functions/proxy.ts`, conforme contracts/proxy.md:
  - `export async function proxyRequest(request: Request, env: unknown, fetchImpl: typeof fetch): Promise<Response>`;
  - `env` validado com `z.object({ API_ORIGIN: z.url(), PROXY_SECRET: z.string().min(32) })`. Antes de escrever, confirmar no Context7 (Zod 4) a forma atual de `z.url()` e de restringir o protocolo a `https:`;
  - a resposta de "acordando" montada por `wakingResponse()`, com o corpo tipado por `import type { ApiError } from '@cruzadinha/shared'`;
  - em falha de configuração, `console.error('repasse sem configuração')`, sem valores.

  Faz T014 passar.
- [X] T018 [US1] Criar `apps/web/functions/api/[[path]].ts` com `export const onRequest = (context: { request: Request; env: unknown }) => proxyRequest(context.request, context.env, fetch)` e um comentário dizendo que a lógica e os testes ficam em `../proxy.ts`.
- [X] T019 [US1] Criar `apps/api/src/http/proxy-guard.ts` (research R3 e R11):
  - **Plugin**: envolvido com `fastify-plugin`, chama `app.decorateRequest('clientAddress', '')` e declara `declare module 'fastify' { interface FastifyRequest { clientAddress: string } }`.
  - **Sem `config.proxySecret`**: `clientAddress = request.ip` e nenhuma verificação.
  - **Com segredo**: um hook `onRequest` `async`:
    - libera `GET /api/health` (pela `routeOptions.url` ou pelo caminho sem query);
    - nos demais, compara `sha256(header)` com `sha256(secret)` via `timingSafeEqual`;
    - se não conferir, `reply.code(403).send(apiError('forbidden'))` seguido de `return reply`, e `request.log.info({ reason: 'proxy-secret' }, 'pedido sem o segredo do repasse')`, sem o valor;
    - se conferir, `clientAddress` recebe `x-cruzadinha-client-ip` quando `net.isIP(valor) !== 0`, senão `request.ip`.

  Acrescentar a mensagem de `forbidden` ("Acesso negado.") em `apps/api/src/http/errors.ts`. Faz T015 passar.
- [X] T020 [US1] Em `apps/api/src/app.ts`, registrar o plugin de T019 logo depois do `cookie` e antes das rotas, passando `config`. Mudar o comentário do `trustProxy` para dizer que, com `PROXY_SECRET`, o endereço vem do repasse.
- [X] T021 [US1] Trocar `request.ip` por `request.clientAddress` em `apps/api/src/modules/auth/auth.routes.ts` (cadastro e login), `apps/api/src/modules/invites/invites.routes.ts` e `apps/api/src/modules/puzzles/puzzles.routes.ts`. Conferir com `grep -rn 'request.ip' apps/api/src` que só o plugin de T019 usa `request.ip`. Faz T016 passar.
- [X] T022 [P] [US1] Em `apps/api/src/db/client.ts`, passar `idle_timeout: 60` ao `postgres(...)` em `createDatabase`, com o comentário: o Neon derruba conexões ao suspender (5 min sem uso), e fechar as ociosas evita falhar a primeira consulta depois disso (research R7).
- [X] T023 [P] [US1] Criar `apps/web/public/_headers` e `apps/web/public/robots.txt` (research R9 e R15, contracts/ui-after-deploy.md):
  - `_headers`:
    - `/*` com `X-Robots-Tag: noindex, nofollow`;
    - `/` e `/index.html` com `Cache-Control: no-cache`;
    - `/version.json` com `Cache-Control: no-store`.
  - `robots.txt`: `User-agent: *` e `Disallow: /`.

  Conferir que `npm run build -w @cruzadinha/web` copia os dois para `apps/web/dist/` e que não existe `apps/web/public/404.html`, porque o modo SPA depende disso.
- [X] T024 [P] [US1] Criar `render.yaml` na raiz (Blueprint):
  - um serviço `type: web`, `name: cruzadinha-api`, `runtime: docker`, `plan: free`, `region: virginia`, `dockerfilePath: ./apps/api/Dockerfile`, `dockerContext: .`, `healthCheckPath: /api/health` e `autoDeployTrigger: off`;
  - `envVars`: `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=10000`, `TRUST_PROXY_HOPS=0`, `LOG_LEVEL=info`, e `DATABASE_URL` e `PROXY_SECRET` com `sync: false`;
  - comentário no topo explicando que o deploy é feito pelo `deploy.yml` (deploy hook), que os segredos são preenchidos no painel e que mudanças neste arquivo valem pela sincronização do Blueprint, não pela versão da API.
- [X] T025 [US1] Criar `docs/deploy.md` (roteiro em português, sem nenhum valor real; placeholders como `<projeto>`, `<serviço>`, `<sua-string-do-neon>`), com as seções desta história:
  1. **Visão geral**: diagrama em texto navegador → Pages (site + Function) → Render → Neon, e quem guarda cada segredo (tabela de data-model.md).
  2. **Contas**: Cloudflare, Render e Neon, entrando com o GitHub, sem cartão.
  3. **Neon**: projeto na região AWS `us-east-1`, string **direta** (sem `-pooler`) com `sslmode=require`; limites do plano gratuito (0,5 GB, 100 CU-hora/mês, suspende após 5 min).
  4. **Segredo do repasse**: gerar com `openssl rand -base64 48 | tr '+/' '-_' | tr -d '='` e colar direto nos painéis, sem salvar em arquivo.
  5. **Render**: New → Blueprint apontando para o repositório; preencher `DATABASE_URL` e `PROXY_SECRET`; anotar a URL `*.onrender.com`; criar o deploy hook (Settings → Deploy Hook). Avisar que o Postgres gratuito do Render nunca deve ser usado, porque é apagado em 30 dias.
  6. **Cloudflare Pages**: criar o projeto por Direct Upload (`npx wrangler@<versão de T001> pages project create <projeto> --production-branch=main`). Em Settings → Variables and Secrets, ambiente Production, cadastrar `API_ORIGIN` (texto) e `PROXY_SECRET` (secret). O ambiente Preview fica sem variáveis.
  7. **Primeiro deploy** (feito **depois do merge** desta feature na `main`, porque o Blueprint do Render publica a `main`; até os segredos existirem, o `release.yml` e o `deploy.yml` se ignoram sozinhos com um aviso): o Render publica a API ao criar o Blueprint; para o site, `npm run build -w @cruzadinha/web` a partir da `main` atualizada e, em `apps/web`, `npx wrangler@<versão de T001> pages deploy dist --project-name=<projeto> --branch=main`.
  8. **Primeiro convite**: `DATABASE_URL='<sua-string-do-neon>' NODE_ENV=production npm run cli -w @cruzadinha/api -- invites create --days 1`, com a variável só no comando (avisar sobre o histórico do shell: começar a linha com espaço ou usar `read -s`).
  9. **Verificação**: apontar para a seção 2 de `specs/012-implantacao/quickstart.md`.
- [ ] T026 [US1] **(manual)**, **depois do merge** desta feature na `main`. O autor segue `docs/deploy.md` seções 2 a 8: cria Neon, Render (Blueprint) e Pages, preenche os segredos, faz o primeiro deploy e cria o primeiro convite. Depois roda as verificações das seções 2 e 3 do quickstart e anota divergências para corrigir o roteiro.

**Checkpoint**: o site está no ar e um convidado consegue jogar (SC-001); pedidos diretos à API recebem 403 (SC-005).

---

## Phase 4: User Story 2 - Espera clara enquanto o servidor acorda (Priority: P1)

**Goal**: "Acordando o servidor" depois de 2 s de espera, seguindo sozinho para a tela pedida; erro com "Tentar de novo" aos 90 s; mensagem também em carregamentos lentos fora do jogo.

**Independent Test**: com `/api/health` atrasado (e2e) ou a API dormindo (quickstart seção 4), a espera aparece em até 3 s e a tela pedida abre sozinha. Com a API acordada, a espera não aparece.

### Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] Criar `apps/web/src/api/server-wake.test.ts` com `vi.useFakeTimers()` e `fetch` falso injetado (data-model.md, "Estado da espera"):
  - 200 com `{ status: 'ok', database: 'up' }` → resolve na primeira tentativa;
  - `database: 'down'` e depois `up` → resolve na segunda, com 2 s entre as tentativas;
  - resposta HTML, `503` JSON e `fetch` que rejeita contam como "não pronto";
  - uma tentativa que não responde é abortada aos 10 s;
  - sem sucesso em 90 s → rejeita com `ServerWakeTimeoutError`;
  - depois de pronto, `isServerReady()` é `true` e uma nova chamada resolve sem chamar `fetch`;
  - `resetServerWake()` (só para testes) volta ao estado inicial;
  - um `AbortSignal` externo cancela a espera sem marcar como pronto.
- [X] T028 [P] [US2] Em `apps/web/src/api/client.test.ts`, acrescentar casos para o registro de pedidos em andamento:
  - `getOldestPendingStartedAt()` é `undefined` sem pedidos;
  - durante um pedido, devolve o instante do início, e com dois pedidos devolve o mais antigo;
  - volta a `undefined` quando terminam, inclusive com erro e com `AbortError`;
  - pedidos com `keepalive: true` não entram;
  - `subscribePending` avisa em cada entrada e saída.
- [X] T029 [P] [US2] Criar `apps/web/src/features/status/ServerWake.test.tsx` com relógio falso (contracts/ui-server-wake.md):
  - nos primeiros 2 s, mostra só o carregamento, sem "Acordando o servidor";
  - depois de 2 s, mostra o título, o texto "O servidor dorme quando ninguém está jogando. A primeira visita pode levar até um minuto." e "Esperando há N s", atualizado a cada segundo;
  - o texto principal está num `role="status"` e o contador fica fora dele;
  - com `prefers-reduced-motion: reduce` simulado (helper `src/test/media.ts`), o indicador fica sem a classe de animação e o contador continua mudando;
  - sem violações no `vitest-axe` nos temas claro e escuro.
- [X] T030 [P] [US2] Criar `apps/web/src/app/ErrorState.test.tsx` e `apps/web/src/app/RouteError.test.tsx`, e acrescentar um caso a `apps/web/src/features/game/GamePage.test.tsx`:
  - `LoadingState` sem pedido lento mostra o `label`;
  - com um pedido em andamento há 2 s ou mais, mostra "Acordando o servidor…" e "Pode levar até um minuto.";
  - `RouteError` com `ServerWakeTimeoutError` mostra "Não foi possível falar com o servidor." e "Tentar de novo";
  - ao clicar em "Tentar de novo", chama `revalidate` e, enquanto `state === 'loading'`, mostra `<ServerWake />` com o foco no título;
  - **GamePage** (FR-011, lado negativo): com a cruzada carregada e um `PUT /api/progress/:id` pendente por mais de 2 s, o tabuleiro continua na tela e "Acordando o servidor" não aparece.
- [X] T031 [P] [US2] Criar `apps/web/src/app/router.test.tsx` com `createMemoryRouter(createAppRoutes(queryClient))` e o helper `src/test/http`:
  - durante a espera inicial, o `AppLayout` aparece com `<ServerWake />` no lugar do conteúdo (research R11);
  - o `/api/health` é consultado antes do `/api/auth/me`;
  - `/status` não espera o health;
  - o endereço `/dia/2026-10-01?x=1` é preservado depois da espera;
  - depois de pronto, navegar entre rotas não consulta o health de novo.

### Implementation for User Story 2

- [X] T032 [US2] Em `apps/web/src/api/client.ts`, acrescentar o registro de pedidos em andamento (data-model.md, "Pedidos em andamento"):
  - um `Map<number, number>` de id → `Date.now()`, com entrada no começo de `send()` e saída num `finally`, menos com `keepalive`;
  - exportar `subscribePending(listener): () => void` e `getOldestPendingStartedAt(): number | undefined`.

  Faz T028 passar.
- [X] T033 [US2] Criar `apps/web/src/api/server-wake.ts` com:
  - `ServerWakeTimeoutError`;
  - `waitForServer(options?: { signal?: AbortSignal; fetch?: typeof fetch }): Promise<void>`:
    - tentativas em `GET /api/health` com `AbortSignal.timeout(10_000)` combinado ao `signal` externo;
    - intervalo de 2 s depois de cada tentativa e limite total de 90 s;
    - "pronto" quando o status é 200 e `healthStatusSchema.safeParse(body)` dá `database === 'up'`;
  - `isServerReady()`;
  - `resetServerWake()`, com o comentário "só para testes";
  - as constantes exportadas `WAKE_NOTICE_DELAY_MS = 2000`, `WAKE_TIMEOUT_MS = 90_000`, `WAKE_RETRY_MS = 2000` e `WAKE_ATTEMPT_TIMEOUT_MS = 10_000`.

  Usar `fetch` direto com `credentials: 'same-origin'`, não o `apiRequest`. Faz T027 passar.
- [X] T034 [US2] Criar `apps/web/src/features/status/useSlowServer.ts` com `useSlowServer(thresholdMs = WAKE_NOTICE_DELAY_MS): { slow: boolean; elapsedSeconds: number }`, usando `useSyncExternalStore(subscribePending, getOldestPendingStartedAt)` e um intervalo de 1 s só enquanto há pedido pendente.
- [X] T035 [US2] Criar `apps/web/src/features/status/ServerWake.tsx` e `ServerWake.module.css` (contracts/ui-server-wake.md):
  - abaixo de 2 s, renderiza `<LoadingState />`;
  - depois, mostra o título "Acordando o servidor", o texto, um indicador animado só sem `prefers-reduced-motion: reduce` e "Esperando há N s" fora da região `role="status"`;
  - cores e medidas só com tokens dos temas.

  Faz T029 passar.
- [X] T036 [US2] Em `apps/web/src/app/ErrorState.tsx`, o `LoadingState` usa `useSlowServer()` e, quando `slow`, mostra "Acordando o servidor…" e "Pode levar até um minuto." no lugar do `label`, mantendo o `role="status"`.

  Em `apps/web/src/app/RouteError.tsx`:
  - tratar `ServerWakeTimeoutError` com o título "Não foi possível falar com o servidor.", o texto "O servidor não respondeu em 90 segundos." e "Tentar de novo" (`revalidator.revalidate()`);
  - enquanto `revalidator.state === 'loading'`, renderizar `<ServerWake />` com a contagem recomeçando e o foco no título (research R11).

  Faz T030 passar.
- [X] T037 [US2] Em `apps/web/src/app/router.tsx`:
  - criar `serverReadyLoader = async ({ request }) => { await waitForServer({ signal: request.signal }); return null }`;
  - `/status` fica como filho direto do `AppLayout`;
  - as demais rotas (`/login`, `/cadastro`, o grupo com `requireSessionLoader` e `*`) ficam numa rota sem caminho com `loader: serverReadyLoader`, `shouldRevalidate: () => !isServerReady()`, `hydrateFallbackElement: <ServerWake />` e `errorElement: <RouteError />`;
  - retirar o `hydrateFallbackElement` do `AppLayout`.

  Acrescentar uma resposta padrão de `/api/health` aos helpers de `apps/web/src/test/http.ts`, para os testes existentes de rotas e de `RequireSession` continuarem passando. Faz T031 passar.
- [X] T038 [US2] Criar `apps/web/e2e/espera-servidor.spec.ts`:
  - **Com atraso**: `page.route('**/api/health', ...)` atrasando 4 s antes de seguir para a API real; abrir `/dia/<data do seed>` logado; conferir que "Acordando o servidor" aparece e que depois a tela do dia abre sem recarregar (mesma URL).
  - **Sem atraso**: "Acordando o servidor" nunca aparece.
  - **Tempo esgotado**: health sempre `503`, `page.clock.install()` **antes** do `goto` e `page.clock.fastForward('01:30')`; conferir o erro e que "Tentar de novo" volta a mostrar a espera.

**Checkpoint**: a espera funciona localmente e nos testes; em produção, é validada pelo quickstart seção 4.

---

## Phase 5: User Story 3 - Lançar e publicar versões sem trabalho manual (Priority: P2)

**Goal**: cada merge atualiza o pedido de lançamento. O aceite gera tags e registros de mudanças, e depois da CI verde só as partes com versão nova são publicadas. A versão no ar é consultável, abas antigas sobrevivem à publicação, e a documentação de versionamento é encontrada pelo README.

**Independent Test**: quickstart.md seções 6 e 6b.

### Tests for User Story 3 ⚠️

- [X] T039 [P] [US3] Em `apps/api/src/modules/health/health.service.test.ts`, cobrir:
  - o resultado tem `version` igual à versão recebida;
  - com `releaseCommit`, tem `commit` igual a ele; sem, não tem a chave `commit`;
  - o resultado passa no `healthStatusSchema`.
- [X] T040 [P] [US3] Criar `apps/api/src/version.test.ts`: `API_VERSION` é igual ao `version` de `apps/api/package.json` (lido no teste com `readFileSync`) e casa com `^\d+\.\d+\.\d+$`.
- [X] T041 [P] [US3] Criar `apps/web/version-plugin.test.ts` (com `// @vitest-environment node`; incluir o arquivo no `include` do `apps/web/vitest.config.ts`) para a função pura `siteVersionJson(pkgVersion, env, gitHead)` de `apps/web/version-plugin.ts`:
  - com `GITHUB_SHA` → usa-o;
  - sem `GITHUB_SHA` e com `gitHead` → usa `gitHead`;
  - sem nenhum → `"desconhecido"`;
  - `version` igual à versão do pacote;
  - o resultado é JSON `{ "version", "commit" }`.
- [X] T042 [P] [US3] Criar `apps/web/src/app/reload-after-deploy.test.ts` para `shouldReloadAfterChunkError(previous: unknown, path: string, now: number)` (contracts/ui-after-deploy.md):
  - sem registro → `true`;
  - registro inválido (não JSON, sem `path`, `at` não numérico) → `true`;
  - mesmo caminho com menos de 30 s → `false`;
  - mesmo caminho com 30 s ou mais → `true`;
  - outro caminho → `true`.

  Testar também `installReloadAfterDeploy(win)` com um `window` falso:
  - na primeira falha, grava `cruzadinha:reloaded-after-deploy`, chama `preventDefault` e `location.reload`;
  - na segunda falha em menos de 30 s, não chama nenhum dos dois;
  - com `sessionStorage` que lança, não recarrega.

### Implementation for User Story 3

- [X] T043 [US3] Criar `apps/api/src/version.ts` com `export const API_VERSION: string`, lido de `../package.json` por importação JSON (`import pkg from '../package.json' with { type: 'json' }`), e conferir que o `tsdown` embute o valor em `dist/server.mjs` (`npm run build -w @cruzadinha/api` e `grep` do número). Faz T040 passar.
- [X] T044 [US3] Em `apps/api/src/modules/health/health.service.ts` e `health.routes.ts`, receber `{ version, commit }` (opções novas de `healthRoutes`, registradas em `apps/api/src/app.ts` com `API_VERSION` e `config.releaseCommit`). Incluir `version` sempre e `commit` só quando definido. Atualizar `health.schemas.ts` (documentação). Faz T039 passar.
- [X] T045 [US3] Criar `apps/web/version-plugin.ts`:
  - a função pura `siteVersionJson` de T041;
  - um plugin Vite `siteVersionPlugin()` que, em `generateBundle`, emite `version.json` com `this.emitFile({ type: 'asset', fileName: 'version.json', source })`, lendo a versão de `apps/web/package.json`, `process.env.GITHUB_SHA` e `git rev-parse HEAD` (com `try`, porque o git pode não existir).

  Registrar o plugin em `apps/web/vite.config.ts`. Antes de escrever, confirmar no Context7 (Vite 8) a API de plugin `generateBundle`/`emitFile`. Faz T041 passar; conferir `apps/web/dist/version.json` depois do build.
- [X] T046 [US3] Criar `apps/web/src/app/reload-after-deploy.ts` com `shouldReloadAfterChunkError` e `installReloadAfterDeploy(win: Window)`:
  - `installReloadAfterDeploy` ouve `vite:preloadError` (R15);
  - o valor lido do `sessionStorage` passa por Zod `{ path: string, at: number }`;
  - todo acesso ao `sessionStorage` fica em `try/catch`.

  Chamar `installReloadAfterDeploy(window)` em `apps/web/src/main.tsx`, antes de criar o router. Faz T042 passar.
- [X] T047 [US3] Criar `release-please-config.json` e `.release-please-manifest.json` na raiz conforme contracts/release.md:
  - `release-type: node`, `bump-minor-pre-major: true`, `include-component-in-tag: true`, `tag-separator: "-"` e `plugins: [{ "type": "node-workspace" }]`;
  - `packages`: `apps/api` → `api`, `apps/web` → `web`, `packages/shared` → `shared` com `skip-github-release: true`;
  - `bootstrap-sha` com o SHA **completo** do último commit da `main` antes desta feature (`git merge-base origin/main HEAD`);
  - manifest com as três versões em `0.1.0`.

  Antes de escrever, confirmar no Context7 (`/googleapis/release-please`) o schema atual dessas chaves.
- [X] T048 [US3] Criar `.github/workflows/release.yml` conforme contracts/release.md:
  - gatilhos `push` em `main` e `workflow_dispatch`, `env.HUSKY: 0` e `permissions` (`contents: write`, `pull-requests: write`, `issues: write`);
  - **passo de guarda**: confere se `vars.RELEASE_APP_CLIENT_ID` e `secrets.RELEASE_APP_PRIVATE_KEY` existem, só como booleanos; se faltarem, `::notice::lançamento ignorado: App não configurado` e fim, **sem** usar o token padrão como alternativa;
  - `actions/create-github-app-token@v3` (`client-id`, `private-key`, sem `owner`/`repositories`);
  - `googleapis/release-please-action@v4` com `token: ${{ steps.app-token.outputs.token }}`, `config-file: release-please-config.json` e `manifest-file: .release-please-manifest.json`;
  - comentário curto explicando por que o token do App é necessário (a CI precisa rodar no pedido, princípio II).
- [X] T049 [US3] Antes de escrever, consultar a página oficial "Events that trigger workflows → workflow_run" do GitHub (research R11) e confirmar:
  - que o arquivo usado é o do branch padrão;
  - os campos `workflow_run.conclusion`, `.event` e `.head_sha`;
  - o filtro `branches`.

  Criar `.github/workflows/deploy.yml` conforme contracts/deploy-workflow.md (passos 1 a 10):
  - **Gatilhos**: `workflow_run` do `CI` (`types: [completed]`, `branches: [main]`) e `workflow_dispatch` com os inputs `api` e `web` (padrão `ultima`; aceitam uma versão ou `atual`). No dispatch, toda parte com versão ou `ultima` é publicada **mesmo que já esteja no ar**, e `atual` não publica (FR-012, contrato passo 5).
  - **Configuração**: `env.HUSKY: 0`, `permissions` (`contents: read`, `deployments: write`, `actions: read`), `concurrency` (`group: deploy`, `cancel-in-progress: false`), `timeout-minutes: 40`.
  - **Job**: um job com `if: github.event_name == 'workflow_dispatch' || (github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push')`.
  - **Guarda**: só booleanos; com `::notice::` no `workflow_run` e erro no dispatch.
  - **Preparação**: checkout com `fetch-depth: 0` e `git fetch --tags`. Só no `workflow_run`, esperar o `release.yml` do `head_sha` com `gh run list` (`GH_TOKEN: ${{ github.token }}`, até 5 min).
  - **Comparação**: alvos pelas tags (`git tag --list 'api-v*' --sort=-v:refname | head -1`) e versões no ar via `curl` + `jq -r '.version // empty'` no health (até 2 min) e no `version.json`. O passo `id: plan` grava `api`, `web`, `api_ref` e `web_ref` em `$GITHUB_OUTPUT` e imprime só versões e booleanos; os dois `false` resultam em `::notice::nada a publicar`.
  - **API**: deploy hook com `ref=<sha da tag>` (aceita 200 e 202; imprime só o código) e espera da versão no health (15 min, a cada 15 s).
  - **Site**: `git worktree add` da tag; `actions/setup-node@v7` (`.nvmrc`, cache npm); `npm ci` e `npm run build -w @cruzadinha/web` com `GITHUB_SHA=<sha da tag>` e as `VITE_HELP_*` das `vars`; depois `cloudflare/wrangler-action@v4` com `wranglerVersion` de T001, `workingDirectory` no `apps/web` da worktree e `command: pages deploy dist --project-name=${{ vars.CLOUDFLARE_PAGES_PROJECT }} --branch=main`.
  - **Verificação final**: `x-robots-tag`, `version.json` e health.
  - **Comentários**: curtos, explicando a ordem API → site e a comparação com a versão no ar (research R1). Segredos nunca vão para `echo`.
- [X] T050 [US3] Criar `docs/versionamento.md` (FR-026, research R17), em português, sem valores reais, com as seções:
  1. o que é a versão de cada parte e onde aparece;
  2. o que conta para cada parte (`apps/api/`, `apps/web/`; `packages/shared/` sobe o patch das duas; `render.yaml` não conta);
  3. tabela "tipo de commit → efeito", com as cinco mensagens de exemplo do quickstart 6b e o número resultante (inclusive a regra abaixo de 1.0.0);
  4. o pedido de lançamento e como lançar (aceitar com "Squash and merge" ou "Merge", sem editar);
  5. tags, registros de mudanças e releases;
  6. como ver a versão no ar (`/api/health`, `/version.json`);
  7. como reverter e republicar (`gh workflow run deploy.yml -f api=<versão> -f web=atual`; o disparo manual publica mesmo que a versão já esteja no ar; rollback no painel; e o aviso de que o próximo merge na `main` republica a última versão, então a reversão deve ser seguida de um lançamento de correção);
  8. compatibilidade entre versões (research R16: acrescentar em resposta é livre; campos novos obrigatórios em pedido só depois do site; remoções em dois lançamentos; migrações só aditivas no mesmo lançamento; formato do puzzle é incompatível; códigos de erro novos aparecem como erro genérico no site anterior);
  9. o que não fazer (editar números, `CHANGELOG` ou o pedido à mão).
- [X] T051 [P] [US3] Em `README.md`, acrescentar uma seção "Versões" com 3 a 5 linhas (versões separadas da API e do site, geradas pelos tipos de commit, lançadas pelo aceite do pedido de lançamento) e o link `[docs/versionamento.md](docs/versionamento.md)`. Em `CLAUDE.md`, na seção "Conventions", logo depois da regra de Conventional Commits, o mesmo resumo com o link, acrescentando que o tipo e a pasta do commit decidem a versão de cada parte (FR-026).
- [X] T052 [US3] Acrescentar a `docs/deploy.md` a seção **Lançamento e publicação automática**:
  - **GitHub App de lançamento**: criar em Settings → Developer settings → GitHub Apps, sem webhook, com Contents e Pull requests em leitura e escrita, e instalar só neste repositório; guardar o Client ID em `vars.RELEASE_APP_CLIENT_ID` e a chave privada em `secrets.RELEASE_APP_PRIVATE_KEY`; ligar "Allow GitHub Actions to create and approve pull requests";
  - **Secrets e variables da publicação**: `CLOUDFLARE_API_TOKEN` (My Profile → API Tokens, só "Account → Cloudflare Pages → Edit"), `CLOUDFLARE_ACCOUNT_ID`, `RENDER_DEPLOY_HOOK_URL`, `SITE_URL`, `CLOUDFLARE_PAGES_PROJECT` e as `VITE_HELP_*` opcionais, cadastrados por Settings → Secrets and variables → Actions ou `gh secret set <nome>`, com o valor digitado no prompt;
  - **Como funcionam o `release.yml` e o `deploy.yml`**: um parágrafo e o link para `docs/versionamento.md`, sem repeti-lo;
  - **Falhas**: como ler uma falha de cada um;
  - **Render**: por que o auto-deploy fica desligado.
- [X] T053 [US3] Acrescentar a `docs/deploy.md` a seção **Reversão**:
  - rollback no painel (Render → Events → deploy anterior → Rollback; Pages → Deployments → deploy anterior → Rollback to this deployment);
  - `gh workflow run deploy.yml -f api=<versão> -f web=atual`;
  - o aviso de que o próximo `Deploy` republica a última versão lançada, e por isso a reversão precisa ser seguida de um lançamento de correção;
  - migrações não são desfeitas: seguir a regra de compatibilidade de `docs/versionamento.md` e nunca alterar o banco à mão (princípio IX).
- [ ] T054 [US3] **(manual)** O autor cria o GitHub App e cadastra os secrets e variables de T052, faz o merge desta feature na `main` e acompanha o primeiro ciclo (quickstart seção 6):
  - o `Release` abre o pedido de lançamento e a CI roda nele;
  - o pedido é aceito e saem as tags `api-v*` e `web-v*`;
  - o `Deploy` publica e o health e o `version.json` mostram as versões.

  Confirmar também os dois pontos abertos de research R12:
  - o plugin `node-workspace` com as dependências `"*"`;
  - o `npm ci` com o `package-lock.json` da raiz depois do lançamento.

  Se algum falhar, aplicar o plano B registrado (`extra-files` com `jsonpath` para o lock) ou levar a decisão ao autor. Registrar o resultado em research R12.

**Checkpoint**: lançamento e publicação automáticos funcionando (SC-004, SC-011); documentação de versionamento acessível pelo README (SC-012).

---

## Phase 6: User Story 4 - Coleta diária no banco de produção (Priority: P2)

**Goal**: a coleta agendada grava no Neon e não é desativada pelos 60 dias sem commit.

**Independent Test**: quickstart.md seção 7.

### Implementation for User Story 4

- [X] T055 [US4] Em `.github/workflows/collect.yml`:
  - acrescentar um job `keepalive` separado, com `permissions: { actions: write }` e `if: github.event_name == 'schedule'`;
  - o job tem um passo que só age quando `date -u +%d` é `01` e a hora UTC é a da primeira execução (`03`), e roda `gh api -X PUT "repos/${{ github.repository }}/actions/workflows/collect.yml/enable"` com `GH_TOKEN: ${{ github.token }}`;
  - incluir um comentário explicando a regra dos 60 dias em repositório público e que o job não depende do secret do banco (research R8).

  Manter o job `collect` com `permissions: contents: read`.
- [X] T056 [US4] Acrescentar a `docs/deploy.md` a seção **Coleta diária**:
  - cadastrar o secret `DATABASE_URL` com a string do Neon e rodar o `Coleta de puzzles` à mão uma vez;
  - os horários;
  - o que a reativação mensal faz e como conferir (`gh workflow list --all`) ou reativar (`gh workflow enable collect.yml`);
  - a variável opcional `COLLECT_HISTORY_DAYS`.
- [ ] T057 [US4] **(manual)** O autor cadastra o secret `DATABASE_URL` no GitHub, roda a coleta à mão e confere o dia de hoje no calendário publicado (quickstart seção 7, passo 1).

**Checkpoint**: coleta gravando em produção (SC-010 é acompanhado nos 7 dias seguintes).

---

## Phase 7: User Story 5 - Recriar a implantação a partir do roteiro (Priority: P3)

**Goal**: o roteiro cobre tudo o que FR-020 pede e foi validado de ponta a ponta.

**Independent Test**: seguir só o `docs/deploy.md` leva do zero ao site no ar (SC-008).

### Implementation for User Story 5

- [X] T058 [US5] Acrescentar a `docs/deploy.md` a seção **Segredo vazado**, uma subseção por segredo:
  - `DATABASE_URL`: resetar a senha do papel no Neon e atualizar Render e GitHub;
  - `PROXY_SECRET`: gerar um novo e trocar primeiro no Render, depois no Pages, aceitando alguns minutos de 403;
  - `CLOUDFLARE_API_TOKEN`: revogar e criar outro;
  - `RENDER_DEPLOY_HOOK_URL`: regenerar o hook;
  - `RELEASE_APP_PRIVATE_KEY`: gerar uma chave nova no App, atualizar o secret e apagar a antiga.

  Incluir a regra geral da constituição: um segredo exposto é comprometido e deve ser trocado; não basta apagar do histórico.
- [X] T059 [US5] Acrescentar a `docs/deploy.md` a seção **Limites do plano gratuito e o que acontece ao estourar**:
  - Render: 750 h/mês, 5 GB de banda, dorme em 15 min, acorda em cerca de 1 min; ao esgotar, fica suspenso até o mês virar, e o consumo aparece em Billing;
  - Neon: 0,5 GB e 100 CU-hora;
  - Function do Pages: 100 mil pedidos por dia;
  - Actions: ilimitado em repositório público;
  - o backup do plano gratuito do Neon e onde conferir.

  Data da consulta: 2026-10.
- [ ] T060 [US5] Acrescentar a `docs/deploy.md` a seção **Servidor dormindo**, com o que foi observado em quickstart seção 4 (como o Render respondeu ao repasse enquanto acordava, e o tempo de uma busca longa na fonte) e o resultado da seção 4b (SC-003: tempos do health e do `me` em "Fast 4G" com a API acordada). Se passar de 3 s, abrir uma correção antes de encerrar a feature.
- [X] T061 [US5] Revisar `docs/deploy.md` e `docs/versionamento.md` inteiros:
  - índice no topo;
  - todos os placeholders no formato `<...>`;
  - nenhum endereço real (`git grep -nE '[a-z0-9-]+\.(onrender\.com|pages\.dev)|neon\.tech/|ep-[a-z0-9-]+' docs/` só encontra placeholders);
  - cada passo diz onde clicar ou qual comando rodar;
  - links para `specs/012-implantacao/quickstart.md` nas verificações.
- [ ] T062 [US5] **(manual)** Validação do roteiro (SC-008): o autor (ou outra pessoa) segue `docs/deploy.md` do zero, num projeto Pages e num serviço Render de teste ou na própria produção recriada, cronometra e corrige o roteiro onde travar.

**Checkpoint**: roteiro completo e validado.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T063 [P] Atualizar `docs/design.md`:
  - **seção 9**: repasse com segredo e IP real, região Virgínia + `us-east-1`, lançamento pela release-please e publicação pelo `deploy.yml`, cold start de cerca de 1 min, links para `docs/deploy.md` e `docs/versionamento.md`;
  - **seção 10**: item 8 como concluído.

  Atualizar também a Assumption de `specs/012-implantacao/spec.md` sobre `TRUST_PROXY_HOPS`: cabeçalho com segredo e `TRUST_PROXY_HOPS=0` em produção.
- [X] T064 [P] Atualizar `CLAUDE.md`:
  - **Current state**: um item para a feature 012:
    - provedores;
    - repasse com `PROXY_SECRET` e `clientAddress`;
    - `version` e `commit` no health;
    - `version.json`;
    - espera do servidor e recarregamento depois de publicar;
    - schemas de resposta tolerantes;
    - `release.yml` e `deploy.yml`;
    - keepalive da coleta;
    - `docs/deploy.md` e `docs/versionamento.md`.
  - **Commands**: a menção ao `deploy.yml` (disparo manual por versão) e ao `npx wrangler@<versão>`.
  - **Architecture**: `apps/web/functions/`, `apps/web/version-plugin.ts`, `src/http/proxy-guard.ts` e `src/version.ts`.
- [X] T065 [P] Atualizar `README.md` com uma seção curta "Produção" apontando para `docs/deploy.md`, sem endereços reais.
- [X] T066 Rodar `npm run format && npm run lint && npm run typecheck && npm test && npm run build && npm run test:int` e o e2e (`npm run test:e2e -w @cruzadinha/web`), corrigindo o que falhar.
- [X] T067 Rodar as verificações de segredos de quickstart.md seção 8 (`git grep` por endereços e nomes de provedores, `grep -r PROXY_SECRET apps/web/dist`, revisão dos logs dos workflows) e conferir que `.env` continua ignorado pelo `.gitignore`.
- [ ] T068 Marcar em `specs/012-implantacao/checklists/requirements.md` e nesta lista o que foi validado em produção, e registrar em `docs/deploy.md` qualquer divergência encontrada nas tarefas manuais (T026, T054, T057, T062).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup e bloqueia US1 e US3.
- **US1 (Phase 3)**: depende da Phase 2. É o MVP: sem ela, nada está no ar.
- **US2 (Phase 4)**: no código, depende só do Setup e pode correr em paralelo com US1. A validação real (quickstart seção 4) precisa de US1 no ar.
- **US3 (Phase 5)**: o código vem depois da Phase 2. T054 depende de US1 no ar e do merge da feature.
- **US4 (Phase 6)**: T055 e T056 a qualquer momento; T057 depende do Neon criado (T026).
- **US5 (Phase 7)**: depende das seções do roteiro criadas em US1, US3 e US4.
- **Polish (Phase 8)**: depois de todas as histórias.

### Within Each User Story

- Testes antes da implementação, falhando primeiro.
- US1: T017 → T018; T019 → T020 → T021; T025 → T026.
- US2: T032 → T034 → T036; T033 → T035 → T037 → T038.
- US3:
  - T043 → T044 → T049 (o workflow compara a `version` do health);
  - T045 e T023 (US1) → T049 (o workflow compara o `version.json`);
  - T047 → T048 → T049;
  - T050 → T051 e T052;
  - todas as tarefas de código antes de T054.

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 e T005 juntos, depois de T001.
- **Phase 2**: T006, T007, T008 e T011 juntos; depois T009, T010 e T012.
- **US1**: T014, T015 e T016 juntos; T022, T023 e T024 em paralelo com qualquer outra tarefa de US1.
- **US2**: T027 a T031 juntos. A implementação toda de US2 pode correr em paralelo com US1.
- **US3**: T039, T040, T041 e T042 juntos. T047, T045 e T046 também podem correr em paralelo.
- **Polish**: T063, T064 e T065 juntos.

---

## Parallel Example: User Story 1

```text
# Testes da história 1, juntos:
T014 apps/web/functions/proxy.test.ts
T015 apps/api/src/http/proxy-guard.test.ts
T016 apps/api/src/test/proxy.int.test.ts

# Arquivos independentes, juntos:
T022 apps/api/src/db/client.ts
T023 apps/web/public/_headers + robots.txt
T024 render.yaml
```

## Parallel Example: User Story 3

```text
# Testes da história 3, juntos:
T039 apps/api/src/modules/health/health.service.test.ts
T040 apps/api/src/version.test.ts
T041 apps/web/version-plugin.test.ts
T042 apps/web/src/app/reload-after-deploy.test.ts

# Configuração e documentação, juntas:
T047 release-please-config.json + .release-please-manifest.json
T050 docs/versionamento.md
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phases 1 e 2.
2. Phase 3 (US1): repasse, guarda da API, `render.yaml`, roteiro inicial e primeiro deploy à mão.
3. **Parar e validar**: quickstart seções 2 e 3. O site já serve aos amigos, com deploy manual e sem a tela de espera (a primeira visita pode parecer travada por até 1 minuto).

### Incremental Delivery

1. US1: site no ar (MVP).
2. US2: espera explicada. É P1 e, idealmente, vai no mesmo merge que US1, porque o código não depende do deploy.
3. US3: versões, lançamento e publicação automática.
4. US4: coleta em produção.
5. US5: roteiro completo e validado.

### Sugestão para este repositório

Um só PR `feat/012-implantacao` com todo o código (Phases 1 a 8, exceto as tarefas manuais). As tarefas manuais acontecem em volta do merge:

- **T026, logo depois do merge**: a `main` já tem o código; o Blueprint do Render publica a API e o site é publicado à mão. Até os segredos existirem, o `release.yml` e o `deploy.yml` terminam com um aviso, sem erro.
- **T054 e T057, em seguida**: criar o GitHub App e os segredos e disparar o `release.yml` à mão (`gh workflow run release.yml`). A release-please lê os commits desde o `bootstrap-sha` e abre o primeiro pedido de lançamento.
- **T062, quando houver tempo.**

As divergências voltam para `docs/deploy.md` num PR `docs/` pequeno.

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefa incompleta.
- Nenhum valor real em commits, testes, logs, specs ou conversa. Os testes usam `https://api.example`, `203.0.113.x` (faixa de documentação) e segredos fictícios gerados no próprio teste.
- Commits em inglês, Conventional Commits, sem trailer de coautoria (CLAUDE.md). Daqui em diante, o tipo e a pasta do commit decidem a versão (`docs/versionamento.md`).
- A tela de espera, o repasse e o recarregamento depois de publicar não mudam regra de jogo; o `game-logic` não é tocado.

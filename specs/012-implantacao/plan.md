# Implementation Plan: Implantação

**Branch**: `feat/012-implantacao` | **Date**: 2026-10-16 (revisado depois das clarificações de versionamento) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-implantacao/spec.md`

## Summary

A feature coloca o site no ar com custo zero: site estático e repasse de `/api/*` no Cloudflare Pages, API no Render (plano gratuito, Virgínia) e banco no Neon (`us-east-1`). Ela também explica a espera da API gratuita e cria um ciclo de lançamento com versões automáticas.

- **Repasse**: uma Pages Function catch-all repassa `/api/*` à API, com um segredo de repasse e o IP real de quem acessa. Resposta HTML ou falha de conexão viram `503` JSON (R2, [contracts/proxy.md](./contracts/proxy.md)).
- **API**:
  - **Pedidos diretos**: com `PROXY_SECRET`, todo pedido sem o segredo recebe `403 forbidden`, exceto `/api/health`.
  - **Limites**: contam por `request.clientAddress`.
  - **Health**: devolve `version` (do `package.json`) e `commit`.
  - **Banco**: o postgres.js fecha conexões ociosas depois de 60 s (R3, R4, R7, R14).
- **Site**:
  - **Espera inicial**: loader de entrada que espera `/api/health` com o banco pronto, com "Acordando o servidor" depois de 2 s e erro aos 90 s; a mesma mensagem em carregamentos lentos (R6, R11).
  - **Depois de publicar**: recarrega uma vez quando uma aba antiga falha ao carregar código que deixou de existir (R15).
  - **Versão**: `version.json` gerado no build (R14).
  - **Indexação**: `noindex` e `robots.txt` (R9).
- **Versões e lançamento**:
  - A release-please mantém um pedido de lançamento com as versões da API e do site, calculadas pelos Conventional Commits. O `packages/shared` é componente interno e sobe o patch das duas partes. Ela usa o token de um GitHub App do autor, para a CI rodar no pedido (R12, R13, [contracts/release.md](./contracts/release.md)).
  - O `deploy.yml` roda depois de cada CI verde na `main` e publica só as partes cuja última tag difere da versão no ar, com reversão por versão no disparo manual (R1, [contracts/deploy-workflow.md](./contracts/deploy-workflow.md)).
- **Compatibilidade**: os schemas de resposta em `shared` passam a descartar campos desconhecidos, e a regra de mudanças em dois lançamentos é documentada (R16, FR-025).
- **Documentação**: `docs/versionamento.md` (link no README e resumo no `CLAUDE.md`) e `docs/deploy.md` (roteiro) (R17, FR-020, FR-026).
- **Coleta**: o `collect.yml` ganha a reativação mensal do agendamento (R8).
- **Fora do código**: contas, segredos e o GitHub App são criados pelo autor, guiado pelo roteiro.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24 (API e build). A Pages Function roda no runtime de Workers (`Request`/`Response`/`fetch` padrão).

**Primary Dependencies**:
- As já usadas: Fastify 5 (com `fastify-plugin`), postgres.js, Drizzle, Zod 4, React 19, React Router 7, TanStack Query 5 e Vite 8.
- Nenhuma dependência npm nova.
- Actions novas na CI:
  - `googleapis/release-please-action@v4`;
  - `actions/create-github-app-token@v3`;
  - `cloudflare/wrangler-action@v4`, com `wranglerVersion` fixo.
- Plataformas: Render (Blueprint, deploy hook com `ref`, health checks, `RENDER_GIT_COMMIT`) e Cloudflare Pages (Direct Upload, Functions, `_headers`, SPA).
- Todas consultadas no Context7 (R11, R12, R13, R15).

**Storage**: Postgres 17 no Neon (sem mudança de schema). No navegador, só estado em memória da espera e uma chave de `sessionStorage` para o recarregamento depois de publicar.

**Testing**:
- Vitest para:
  - a Function (`proxyRequest`, ambiente node por docblock);
  - a configuração, o plugin de repasse e o health (`app.inject`);
  - `waitForServer` (relógio falso), `<ServerWake />` e `LoadingState`/`RouteError` (Testing Library + `vitest-axe`);
  - `shouldReloadAfterChunkError`;
  - o plugin do `version.json`;
  - os schemas de resposta, que agora descartam campos extras.
- Integração (Testcontainers) para os limites por IP real.
- Playwright para a espera simulada.
- A release-please e os workflows são verificados no quickstart (seção 6), sem rede na suíte.

**Target Platform**: Cloudflare Pages (`*.pages.dev`), Render web service gratuito em Docker (`virginia`), Neon gratuito (`aws-us-east-1`) e GitHub Actions.

**Project Type**: aplicação web (API + front) em monorepo npm workspaces, mais infraestrutura e processo de lançamento.

**Performance Goals**:
- Com a API acordada, login ou biblioteca em até 3 s (SC-003).
- Com a API dormindo, a espera aparece em até 3 s e a tela pedida até 5 s depois de a API ficar pronta (SC-002).
- Do aceite do lançamento à versão no ar, até 15 min (SC-004).

**Constraints**:
- Custo zero e sem cartão. O GitHub App é gratuito.
- Configuração só por variáveis validadas com Zod.
- Nenhum valor real no repositório nem nos logs.
- `any` proibido; dados externos entram como `unknown`.
- O ambiente local e a suíte não mudam de comportamento sem `PROXY_SECRET` (FR-021).
- Números de versão e `CHANGELOG` nunca são editados à mão (FR-022).

**Scale/Scope**:
- **API**: cerca de 7 arquivos alterados (`config.ts`, `app.ts`, 3 rotas com `clientAddress`, módulo de health, `db/client.ts`) e 2 novos (`http/proxy-guard.ts`, `version.ts`).
- **`shared`**: `health.ts`, `api-error.ts` e 5 schemas de resposta (strict → strip), com os testes.
- **Web**:
  - **Novos**: `server-wake.ts`, `ServerWake`, `useSlowServer` e `reload-after-deploy.ts`;
  - **Alterados**: `client.ts`, `router.tsx`, `ErrorState.tsx`, `RouteError.tsx`, `main.tsx` e `vite.config.ts` (plugin do `version.json`);
  - **Function**: `functions/`;
  - **Arquivos públicos**: `public/_headers` e `public/robots.txt`.
- **Versões**: `release-please-config.json`, `.release-please-manifest.json`, `version` nos três `package.json` e `.prettierignore`.
- **Infra**: `render.yaml`, `.github/workflows/release.yml`, `.github/workflows/deploy.yml` e o ajuste no `collect.yml`.
- **Documentação**: `docs/deploy.md`, `docs/versionamento.md`, `README.md`, `CLAUDE.md` e `.env.example`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito | Passa. Function, plugin do `version.json` e `reload-after-deploy.ts` em TypeScript estrito. O `env` da Function, o corpo do health e o valor do `sessionStorage` entram como `unknown` e passam por Zod. Os tipos de resposta continuam em `shared`. Sem `any`. |
| II. Qualidade automatizada | Passa. A publicação só acontece depois da CI verde no SHA (`workflow_run`). O pedido de lançamento roda a CI, porque usa o token do App e não o padrão (R13). Os `CHANGELOG.md` gerados ficam fora do Prettier, para o `format:check` não reprovar o pedido. Lint e typecheck cobrem `apps/web/functions`. |
| III. Camadas no back | Passa. O repasse é um plugin HTTP antes das rotas. A versão entra no serviço de health por parâmetro. Rotas, serviços e repositórios não ganham regra nova. |
| IV. Adaptadores | Não afetado. |
| V. Lógica de jogo | Não afetado. O recarregamento depois de publicar não toca no `game-logic`, e a fila de salvamento guarda as letras. |
| VI. Segurança e privacidade | Passa e reforça. Os segredos ficam só nos cofres (Render, Cloudflare e GitHub, inclusive a chave do App). O token do App tem escopo de um repositório, é gerado por execução, sai mascarado e é revogado no fim. O cookie não muda. O segredo do repasse é comparado em tempo constante. O IP real não pode ser forjado. O `version.json` e o health expõem só versão e SHA de um repositório público. |
| VII. Testes determinísticos | Passa. Os testes novos usam `fetch` falso, relógio falso, `sessionStorage` falso e `page.route`. Release-please e provedores são verificados no quickstart, sob demanda. |
| VIII. Conteúdo de terceiros e uso privado | Passa e reforça (`noindex`, `robots.txt`, cadastro só por convite). |
| IX. Migração de schema | Passa. Sem mudança de schema. As migrações continuam no startup. A regra de migrações só aditivas no mesmo lançamento e remoção em dois lançamentos (R16, FR-025) fica documentada em `docs/versionamento.md`. |
| Restrições técnicas | Passa. Custo zero. A API continua sendo o mesmo Dockerfile. As variáveis novas são genéricas e opcionais. A tela de espera usa só tokens. |
| Fluxo de desenvolvimento | Passa. Conventional Commits passam a decidir as versões, sem mudança na regra de commits (`CLAUDE.md` ganha só o resumo e o link). |
| Context7 | Feito para:<br>• Render e Cloudflare Pages;<br>• React Router 7, Fastify 5, Vitest 5 e Playwright (R11);<br>• release-please e release-please-action (R12);<br>• create-github-app-token (R13);<br>• Vite 8 (`vite:preloadError`, R15);<br>• wrangler-action (`wranglerVersion`, `workingDirectory`).<br>O `workflow_run` do GitHub Actions é conferido na documentação oficial na tarefa do `deploy.yml` (R11). O Zod 4 (`z.url()`) é consultado na tarefa da Function. |

Resultado: sem violações; Complexity Tracking vazio.

**Reavaliação depois do design**: sem mudança. Dois pontos dependem de confirmação na implementação e já têm plano B registrado:
- o plugin `node-workspace` com dependências `"*"` (R12);
- o `package-lock.json` da raiz desatualizado depois de um lançamento (R12, `extra-files`).

A spec foi ajustada onde a ferramenta impôs limites (o `render.yaml` não conta; `shared` sobe o patch), registrado nas Clarifications.

## Project Structure

### Documentation (this feature)

```text
specs/012-implantacao/
├── plan.md
├── research.md            # R1–R17
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── proxy.md
│   ├── health.md          # + version, version.json
│   ├── deploy-workflow.md # publicação por versão
│   ├── release.md         # release-please + App
│   ├── ui-server-wake.md
│   └── ui-after-deploy.md
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks (precisa ser regenerado)
```

### Source Code (repository root)

```text
render.yaml                                   # Blueprint da API (free, virginia, docker, autoDeployTrigger off)
release-please-config.json                    # novo (R12)
.release-please-manifest.json                 # novo (R12)
.prettierignore                               # + **/CHANGELOG.md
.env.example                                  # + PROXY_SECRET=, RELEASE_COMMIT=
README.md                                     # + seção "Versões" com link
CLAUDE.md                                     # + resumo de versionamento, feature 012
docs/
├── deploy.md                                 # roteiro (FR-020)
└── versionamento.md                          # FR-026 (R17)
.github/workflows/
├── release.yml                               # novo: App token + release-please
├── deploy.yml                                # novo: publica por versão depois da CI
└── collect.yml                               # + reativação mensal

packages/shared/
├── package.json                              # + "version": "0.1.0"
└── src/
    ├── health.ts                             # + version, commit (opcionais)
    ├── api-error.ts                          # + 'forbidden'
    └── {puzzle/response,library,progress,auth,invites}*.ts  # respostas: strictObject → object

apps/api/
├── package.json                              # version 0.0.0 → 0.1.0
└── src/
    ├── version.ts                            # novo: API_VERSION do package.json
    ├── config.ts                             # + proxySecret, releaseCommit
    ├── app.ts                                # registra o proxy-guard; health com versão
    ├── http/proxy-guard.ts                   # novo
    ├── db/client.ts                          # idle_timeout: 60
    ├── modules/health/                       # version + commit
    ├── modules/{auth,invites,puzzles}/*.routes.ts  # request.clientAddress
    └── test/{app.ts,proxy.int.test.ts}       # opção env; teste novo

apps/web/
├── package.json                              # + "version": "0.1.0"
├── vite.config.ts                            # + plugin que grava dist/version.json
├── vitest.config.ts                          # + functions/**/*.test.ts
├── tsconfig.json                             # include: src, functions
├── functions/{proxy.ts, api/[[path]].ts}     # novo
├── public/{_headers, robots.txt}             # novo
├── e2e/espera-servidor.spec.ts               # novo
└── src/
    ├── main.tsx                              # + ouvinte de vite:preloadError
    ├── app/reload-after-deploy.ts            # novo (função pura)
    ├── api/{client.ts, server-wake.ts}       # pedidos em andamento; espera
    ├── features/status/{ServerWake.tsx, useSlowServer.ts}
    ├── app/{router.tsx, ErrorState.tsx, RouteError.tsx}
    └── test/setup.ts                         # guarda do HTMLCanvasElement
```

**Structure Decision**:
- **Monorepo**: continua como está.
- **Configuração de lançamento**: na raiz, onde a release-please espera.
- **Function**: em `apps/web/functions`, publicada pelo Wrangler junto com o site.
- **Versões**: uma por pacote, no próprio `package.json`.
- **Documentação**: em `docs/`.

## Complexity Tracking

Sem violações.

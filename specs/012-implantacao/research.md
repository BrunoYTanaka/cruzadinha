# Research: Implantação

Feature 012. Documentação consultada no Context7 em 2026-10-15: Render (`/websites/render`: Blueprint, deploy hooks, plano gratuito, health checks, variáveis padrão) e Cloudflare Pages (`/websites/developers_cloudflare_pages`: Direct Upload com GitHub Actions, Functions, `_headers`, SPA). Limites dos planos gratuitos conferidos na web (ver a seção Clarifications da spec).

## R1. Lançamento e publicação: release-please + publicação depois da CI

Substitui a versão anterior deste item (publicação a cada merge e detecção por caminhos), conforme as clarificações de 2026-10-16 (opção B) e FR-012/FR-022.

- **Decision**: dois workflows.
  1. **`.github/workflows/release.yml`**: roda em `push` na `main`.
     - Gera um token de um GitHub App do autor com `actions/create-github-app-token@v3` (`client-id` em `vars.RELEASE_APP_CLIENT_ID`, chave em `secrets.RELEASE_APP_PRIVATE_KEY`; R13).
     - Roda `googleapis/release-please-action@v4` com esse token, `config-file: release-please-config.json` e `manifest-file: .release-please-manifest.json` (R12).
     - Com isso, a release-please abre ou atualiza o pedido de lançamento. Ao aceitá-lo, ela cria as tags `api-vX.Y.Z` e `web-vX.Y.Z` e as releases.
     - Como o token não é o padrão, os pushes na branch do pedido disparam a CI (princípio II, FR-022).
  2. **`.github/workflows/deploy.yml`**: `workflow_run` do `CI`, concluído com sucesso num `push` na `main`, mais `workflow_dispatch` com os inputs `api` e `web` (versões, padrão "última"). Passos:
     1. **Espera o `release.yml` do mesmo SHA terminar** (`gh run list --workflow release.yml --commit <sha> --json status`, até 5 min), para as tags do lançamento existirem.
     2. **Última versão lançada de cada parte**: `git fetch --tags` e a maior tag `api-v*`/`web-v*` por ordem semver (`git tag --list 'api-v*' --sort=-v:refname | head -1`). No disparo manual, a versão pedida.
     3. **Versão no ar**: a `version` de `GET <SITE_URL>/api/health` e a `version` de `GET <SITE_URL>/version.json` (R14).
     4. **Publica cada parte cuja versão lançada for diferente da do ar** (ou cuja versão no ar não puder ser lida), no commit da tag (`git rev-list -n1 <tag>`):
        - API: deploy hook do Render com `ref=<sha da tag>`, depois espera o health mostrar a versão nova (até 15 min);
        - site: checkout da tag, build, `version.json` e `wrangler pages deploy`.
     5. **Nada diferente**: `::notice::nada a publicar` e sucesso. É o caso normal dos merges que não são aceite de lançamento.
     6. **Verificação final**: `X-Robots-Tag`, `version.json` e health com as versões publicadas (FR-015).
- **Rationale**:
  - Publicar depois da CI do SHA do aceite garante "verificação aprovada antes de publicar" (FR-012).
  - Comparar a última tag com a versão no ar cobre a publicação que falhou num lançamento anterior (cenário 8 da US3) sem estado extra.
  - O deploy roda a cada CI verde na `main`, mas na maioria das vezes termina em segundos com "nada a publicar".
  - Esperar o `release.yml` evita a corrida entre a CI e a criação das tags no mesmo push.
  - O disparo manual por versão é a reversão (US3 cenário 7).
- **Alternatives considered**:
  - Publicar dentro do próprio `release.yml`, usando `releases_created`: não espera a CI do SHA e duplicaria os passos de qualidade.
  - Gatilho `push: tags`: cada tag geraria uma execução separada (duas no mesmo lançamento) e ainda precisaria esperar a CI.
  - Detecção por caminhos (versão anterior deste item): substituída pela regra de versões.

## R2. Repasse de `/api/*`: Pages Function catch-all

- **Decision**: `apps/web/functions/api/[[path]].ts` exporta `onRequest`, que monta a URL `API_ORIGIN + pathname + search` e repassa método, corpo e cabeçalhos com `redirect: 'manual'`, devolvendo a resposta como veio, `Set-Cookie` incluído. Ajustes no caminho:
  - Remove do pedido os cabeçalhos `x-cruzadinha-*` que vierem do navegador.
  - Acrescenta `x-cruzadinha-proxy-secret: <PROXY_SECRET>` e `x-cruzadinha-client-ip: <CF-Connecting-IP>`.
  - Se a API responder `text/html` (página de "acordando" do Render, ver R5) ou a conexão falhar, devolve `503` JSON `service-unavailable` com `Retry-After: 5`.

  A lógica fica numa função pura `proxyRequest(request, env, fetch)` em `apps/web/functions/proxy.ts`, testada com Vitest. O arquivo de rota só a chama. As variáveis `API_ORIGIN` (texto) e `PROXY_SECRET` (secret) ficam no ambiente **Production** do projeto Pages. O ambiente Preview fica sem elas, e a Function responde 503 se faltarem.
- **Rationale**: o `_redirects` do Pages não repassa para outro host (design, seção 9). A Function deixa o navegador falar só com o próprio endereço, então o cookie continua `HttpOnly` e `SameSite=Lax` sem CORS. O cookie não define `Domain`, por isso fica no endereço do site.
- **Alternatives considered**: um Worker separado na frente do Pages, que seria um segundo projeto para manter; e chamar a API direto com CORS, que exigiria `SameSite=None` e contraria a constituição.

## R3. Pedidos diretos à API e endereço real de quem acessa

- **Decision**: variável nova e opcional `PROXY_SECRET` na API (Zod, mínimo de 32 caracteres), com dois comportamentos quando ela está definida:
  - **Pedidos sem o segredo**: um hook `onRequest` recusa todo pedido, exceto `GET /api/health`, cujo cabeçalho `x-cruzadinha-proxy-secret` não confere. A comparação é em tempo constante (`timingSafeEqual` sobre os SHA-256 dos dois valores). A resposta é `403` com o código novo `forbidden`.
  - **Endereço real**: a API usa `x-cruzadinha-client-ip` como endereço de quem acessa, se for um IP válido (`net.isIP`); senão, usa `request.ip`.

  Um decorador `request.clientAddress` substitui `request.ip` nas quatro rotas que alimentam limites (cadastro, login, convites e busca na fonte). Sem `PROXY_SECRET` (desenvolvimento, testes, `docker compose`), nada muda: `clientAddress` é `request.ip` com o `TRUST_PROXY_HOPS` de hoje. Em produção, `TRUST_PROXY_HOPS` fica `0`.
- **Rationale**:
  - O endereço `*.onrender.com` é público. Sem o segredo, qualquer um falaria direto com a API, e com `TRUST_PROXY_HOPS > 0` poderia inventar o `X-Forwarded-For` e escapar dos limites (FR-005, FR-006).
  - Contar saltos não é confiável: a cadeia é navegador → borda do Cloudflare → Function → borda do Render → API, e o número de entradas no `X-Forwarded-For` depende dos provedores.
  - O cabeçalho próprio, aceito só com o segredo, dá um valor que só a Function consegue definir.
  - `/api/health` fica liberado porque o health check do Render chama a instância direto. Ele não expõe dado nenhum.
- **Alternatives considered**: lista de IPs do Cloudflare na API, que muda e não identifica *este* projeto; mTLS e Authenticated Origin Pulls, indisponíveis para `*.onrender.com` no plano gratuito.

## R4. Migrações, versão publicada e health check

- **Decision**:
  - **Migrações**: continuam no início do `server.ts`, como hoje. Se falharem, o processo sai com código 1.
  - **Health check**: o Blueprint declara `healthCheckPath: /api/health`. O Render só passa o tráfego para a instância nova quando ela responde ao health check e, se isso não acontecer em 15 minutos, mantém a anterior.
  - **Versão publicada**: o health devolve a `version` da API (semver do `apps/api/package.json`, embutida no build; R14) e, quando conhecido, o `commit`. O `commit` vem de `releaseCommit`, lido de `RELEASE_COMMIT` ou, na falta dele, de `RENDER_GIT_COMMIT` (que o Render define em todo serviço), e é validado como SHA hexadecimal de 7 a 40 caracteres.
- **Rationale**: atende FR-013 sem passo extra. O `preDeployCommand` do Render não está disponível no plano gratuito, e as migrações no startup já são idempotentes. A `version` no health é o que o workflow compara com a última tag (R1); o `commit` ajuda a diagnosticar. O repositório é público, então nenhum dos dois é sensível.
- **Alternatives considered**: consultar a API do Render pelo id do deploy, que exige mais um token com acesso à conta.

## R5. API dormindo: a página de "acordando" do Render

- **Fato**: segundo a documentação, o Render "exibe uma página de carregamento para navegadores que se conectam" enquanto o serviço gratuito acorda, o que leva cerca de 1 minuto. Não está documentado como essa página aparece para um `fetch` vindo da Function (status e `content-type`).
- **Decision**: o site não depende desse detalhe.
  - A Function trata como "acordando" qualquer resposta `text/html` da API ou falha de conexão, e responde `503` JSON com `Retry-After` (R2).
  - O site faz a espera inicial consultando `GET /api/health` até receber `200` JSON com `database: 'up'` (R6).
  - O roteiro tem um passo para observar a resposta real com o serviço dormindo e registrar em `docs/deploy.md`.
- **Rationale**: cobre os dois comportamentos possíveis (pedido que espera e página HTML) e também o banco suspenso (Neon), que deixa o health com `database: 'down'`.

## R6. Tela "Acordando o servidor" no site

- **Decision**:
  - **Portão de entrada**: a rota sem caminho que envolve todas as telas, exceto `/status`, ganha um loader `serverReadyLoader`. Ele chama `waitForServer()` (`src/api/server-wake.ts`), que consulta `/api/health` a cada 2 s, com 10 s de limite por tentativa e 90 s no total, até receber `200` com `database: 'up'`. Ao acabar o tempo, lança `ServerWakeTimeoutError`.
  - **Uma vez por carga**: o resultado fica num estado do módulo, então a espera acontece uma vez por carga da página. `shouldRevalidate` só deixa o loader rodar de novo enquanto o servidor não ficou pronto.
  - **Tela de espera**: o `hydrateFallbackElement` dessa rota é `<ServerWake />`, que não mostra nada nos primeiros 2 s e depois mostra a mensagem com o tempo decorrido (FR-008).
  - **Erro**: o `errorElement` reconhece `ServerWakeTimeoutError` e mostra o erro com "Tentar de novo" (`router.revalidate()`, sem recarregar).
  - **Durante a navegação**: o `client.ts` passa a registrar os pedidos em andamento. Um hook `useSlowServer(2000)` (com `useSyncExternalStore`) deixa o `LoadingState`, usado nos carregamentos das telas, trocar o texto pela mensagem de espera quando um pedido passa de 2 s (FR-011). A tela de jogo não usa `LoadingState` depois de carregada, então a espera nunca cobre o tabuleiro.
- **Rationale**:
  - O loader roda antes do `requireSessionLoader` (`/api/auth/me`), então a primeira tela já encontra a API e o banco prontos. Com a API acordada, o custo é um pedido rápido ao health antes do `me`.
  - O limite de 2 s evita piscar com a API acordada (FR-008, SC-003).
  - O texto e o indicador seguem os tokens, `role="status"` e `prefers-reduced-motion` (FR-010).
- **Alternatives considered**: esperar a API antes de criar o router no `main.tsx`, que não permitiria usar `errorElement` nem o fallback do router; e recarregar a página em "Tentar de novo", que FR-008 proíbe.

## R7. Banco no Neon

- **Decision**: usar a string de conexão **direta** (sem `-pooler`) com `sslmode=require`, na região `us-east-1` (AWS). No `createDatabase`, definir `idle_timeout: 60` no postgres.js, para não guardar conexões que o Neon derruba ao suspender, o que ele faz depois de 5 minutos sem uso. O probe do health continua com `connect_timeout: 2`: se o banco ainda estiver acordando, o health responde `database: 'down'` e o site tenta de novo.
- **Rationale**: o pooler do Neon (PgBouncer em modo transação) exigiria `prepare: false` no postgres.js e pode atrapalhar as migrações. Um site de amigos não precisa de pooling, e o limite de conexões diretas do plano gratuito é folgado. Com o `idle_timeout`, a primeira consulta depois da suspensão abre uma conexão nova, em vez de falhar numa conexão morta.
- **Alternatives considered**: a string com pooler, descartada pelos motivos acima.

## R8. Coleta e a desativação depois de 60 dias

- **Decision**:
  - O `collect.yml` não muda de comportamento: com o secret `DATABASE_URL` (string do Neon) cadastrado, ele passa a gravar no banco de produção.
  - Ganha um passo que, no dia 1 de cada mês, chama `PUT /repos/{repo}/actions/workflows/collect.yml/enable` com `GITHUB_TOKEN` e a permissão `actions: write`. Isso renova o prazo de 60 dias sem precisar de commit.
  - O roteiro explica como conferir (`gh workflow list`) e reativar à mão (`gh workflow enable collect.yml`).
- **Rationale**: o repositório é público, então o GitHub desativa agendamentos depois de 60 dias sem atividade. Reativar pela API é o método usado por ações de "keepalive" sem commits vazios. O roteiro marca isso como algo a confirmar no primeiro ciclo.
- **Alternatives considered**: commits vazios periódicos, que sujam o histórico; e confiar só no e-mail de aviso do GitHub, que é fácil de perder.

## R9. Indexação, HTTPS e rotas do SPA

- **Decision**:
  - `apps/web/public/_headers` aplica `X-Robots-Tag: noindex, nofollow` a `/*`.
  - `apps/web/public/robots.txt` tem `Disallow: /`.
  - Não há `404.html`, então o Pages serve o `index.html` para qualquer caminho (modo SPA) e o React Router mostra a tela certa ou o `NotFoundPage` (FR-004).
  - HTTPS e o redirecionamento de HTTP são automáticos no `*.pages.dev` (FR-001).
- **Rationale**: atende FR-007 e o princípio VIII sem código. O `_headers` não vale para as respostas da Function, o que não importa porque a API só devolve JSON.

## R11. Confirmações no Context7 (depois do `/speckit-analyze`)

Consultas feitas em 2026-10-15 para as bibliotecas de que o plano depende, além de Render e Cloudflare:

- **React Router 7** (`/remix-run/react-router`):
  - O `HydrateFallback` só vale na carga inicial e **não** aparece em navegações nem revalidações seguintes.
  - Uma rota cujo loader ainda não terminou não é renderizada, e a renderização "borbulha" para o `HydrateFallback` do ancestral mais próximo que tiver um.

  Consequências para o desenho:
  - A rota sem caminho com `serverReadyLoader` e `hydrateFallbackElement: <ServerWake />` mostra a espera dentro do `AppLayout`, que não tem loader e renderiza normalmente. O `hydrateFallbackElement` do `AppLayout` deixa de ser usado nesse caminho e pode sair. T027 confere esse comportamento num teste.
  - **Decisão nova**: "Tentar de novo" é uma revalidação, então não mostra fallback. O `RouteError` precisa mostrar `<ServerWake />` enquanto `useRevalidator().state === 'loading'`, senão a pessoa fica olhando o erro por até 90 s (T032).
- **`shouldRevalidate`**: recebe `defaultShouldRevalidate`, vale só para o loader da própria rota e, ao devolver `false`, pula esse loader. `() => !isServerReady()` faz o loader de entrada rodar só enquanto o servidor não ficou pronto, inclusive no "Tentar de novo".
- **Fastify 5** (`/fastify/fastify/v5.0.0`):
  - Decorar com `decorateRequest('clientAddress', '')`, com string vazia para strings, para não desotimizar o objeto.
  - Definir o valor num hook `onRequest` e declarar o tipo com `declare module 'fastify' { interface FastifyRequest { clientAddress: string } }`.
  - Num hook `async`, responder com `reply.code(403).send(...)` e **`return reply`**.
  - Para valer na app inteira, o plugin é envolvido com `fastify-plugin`, que já é dependência da API (6.0).
- **Vitest 5** (`/vitest-dev/vitest/v5.0.3`): o comentário `// @vitest-environment node` no topo do arquivo troca o ambiente só daquele arquivo. Basta isso nos testes de `apps/web/functions/`, sem `projects` (o `environmentMatchGlobs` foi substituído por `projects`).
- **Playwright** (`/microsoft/playwright/v1.61.1`): `page.clock.install()` **antes** do `goto` e `page.clock.fastForward('01:30')` para avançar 90 s; o relógio controla `Date`, `setTimeout` e `setInterval` da página.
- **GitHub Actions** (`/websites/github_en_actions`): a consulta confirmou condições `if` por job e o comportamento de jobs pulados (status Success), mas não trouxe a referência do evento `workflow_run`. T037 consulta a página oficial "Events that trigger workflows → workflow_run" antes de escrever o workflow, para confirmar:
  - que o arquivo usado é o do branch padrão;
  - os campos `conclusion`, `event` e `head_sha`;
  - o filtro `branches`.
- **Zod na Function**: o `env` da Function é dado externo. Ele é validado com um `z.object({ API_ORIGIN: z.url(), PROXY_SECRET: z.string().min(32) })` (Zod já é dependência de `apps/web`), e o corpo de erro usa o tipo `ApiError` de `@cruzadinha/shared` (importação só de tipo).
- **Sem `wrangler` no repositório**: a Function usa tipos próprios, a CI usa `cloudflare/wrangler-action@v4` (com `wranglerVersion` fixo) e o roteiro usa `npx wrangler@<versão exata>`. Isso evita um pacote pesado (`workerd`) no `npm ci` de todos os jobs.
- **Busca longa na fonte atrás do repasse**: o repasse não define limite de tempo próprio. O tempo real de uma busca de dia não salvo passando pela Function é medido no quickstart (seção 4) e registrado no roteiro.

## R10. Configuração por ambiente

Segredos e variáveis por lugar, sem valores reais (detalhes em [data-model.md](./data-model.md)):

- **Render (Blueprint `render.yaml`)**:
  - Com valor fixo: `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=10000` (porta padrão do Render, declarada para não depender do padrão), `TRUST_PROXY_HOPS=0` e `LOG_LEVEL=info`.
  - Preenchidas no painel (`sync: false`): `DATABASE_URL` e `PROXY_SECRET`.
  - Configuração do serviço: `runtime: docker`, `dockerfilePath: ./apps/api/Dockerfile`, `dockerContext: .`, `plan: free`, `region: virginia`, `healthCheckPath: /api/health` e `autoDeployTrigger: off`.
- **Cloudflare Pages (Production)**: `API_ORIGIN` (URL `*.onrender.com`) e `PROXY_SECRET` (secret).
- **GitHub**:
  - Secrets: `CLOUDFLARE_API_TOKEN` (permissão só de Pages: Edit), `CLOUDFLARE_ACCOUNT_ID`, `RENDER_DEPLOY_HOOK_URL`, `DATABASE_URL` e `RELEASE_APP_PRIVATE_KEY` (R13).
  - Variables: `SITE_URL`, `CLOUDFLARE_PAGES_PROJECT`, `RELEASE_APP_CLIENT_ID` (R13) e, opcionalmente, `VITE_HELP_LETTER_LIMIT` e `VITE_HELP_WORD_LIMIT`.
- **`.env.example`**: ganha `PROXY_SECRET=` (vazio, com comentário) e `RELEASE_COMMIT=` (vazio).

## R12. Configuração da release-please

Consulta no Context7 (`/googleapis/release-please` e `/googleapis/release-please-action`) em 2026-10-16.

- **Decision**:
  - **`release-please-config.json`** na raiz:
    - `"release-type": "node"`, `"bump-minor-pre-major": true`, `"include-component-in-tag": true`, `"tag-separator": "-"` (tags `api-v0.2.0`), `"plugins": [{ "type": "node-workspace" }]` e `"bootstrap-sha"` igual ao commit que introduz a configuração, para o histórico anterior não virar um lançamento gigante;
    - `"packages"` com:
      - `apps/api` (`"component": "api"`);
      - `apps/web` (`"component": "web"`);
      - `packages/shared` (`"component": "shared"`, `"skip-github-release": true`).
  - **`.release-please-manifest.json`**: `{ "apps/api": "0.1.0", "apps/web": "0.1.0", "packages/shared": "0.1.0" }`.
  - **Versão inicial**: `apps/api/package.json` passa de `0.0.0` para `0.1.0`; `apps/web/package.json` e `packages/shared/package.json` ganham `"version": "0.1.0"`, com o `package-lock.json` atualizado por `npm install`.
  - **Registros de mudanças**: `apps/api/CHANGELOG.md`, `apps/web/CHANGELOG.md` e `packages/shared/CHANGELOG.md`, todos gerados. Entram no `.prettierignore`, senão o `format:check` reprovaria o pedido de lançamento.
- **Código compartilhado** (FR-022):
  - A release-please só conta commits que tocam a pasta do pacote; a documentação consultada não traz opção para incluir pastas de fora (não há `additional-paths`).
  - Por isso `packages/shared` vira um componente interno. Com o plugin `node-workspace`, quando ele recebe versão nova, os pacotes que dependem dele (`apps/api` e `apps/web`) ganham um **patch** e uma entrada "dependências atualizadas" no registro de mudanças.
  - **Consequência para a spec**: uma mudança só em `shared` sobe o patch das duas partes, e não o minor, mesmo num `feat`. O `shared` tem versão interna e marcação própria, mas não é publicado. A spec foi ajustada (FR-022, Edge Cases, Assumptions).
  - **A confirmar na implementação** (T de verificação com `release-please release-pr --dry-run` ou no primeiro pedido): se o plugin reescreve as dependências `"*"` para `"^0.x.y"` e se o `npm ci` continua passando. Se não funcionar, a alternativa é voltar ao autor; não há solução silenciosa.
- **`render.yaml`**: não conta para a versão da API. O Render aplica as mudanças do Blueprint pela sincronização do próprio Blueprint, e não pelo deploy do código. A spec foi ajustada.
- **Arquivo de lock**: o `package-lock.json` da raiz guarda a `version` de cada workspace. A release-please atualiza o `package.json` do pacote, mas não o lock da raiz.
  - Como nada depende de `api` nem de `web` por versão e o `shared` é `"*"`, o `npm ci` não deve reclamar.
  - A verificação do primeiro pedido de lançamento confirma isso. Se reclamar, usar `extra-files` com `type: json` e `jsonpath` (`$.packages['apps/api'].version`), formato confirmado na documentação.
- **Alternatives considered**: `changesets`, que exige um arquivo de mudança manual por PR (contra "sem edição manual"); `semantic-release`, que é pensado para um pacote só e publica direto, sem pedido de lançamento; e `linked-versions`, que forçaria a mesma versão para API e site (contra FR-022).

## R13. Token da release-please: GitHub App do autor

- **Decision**: um GitHub App pessoal, gratuito, instalado só neste repositório, com as permissões Contents (leitura e escrita) e Pull requests (leitura e escrita).
  - O `release.yml` gera o token por execução com `actions/create-github-app-token@v3` (`client-id: ${{ vars.RELEASE_APP_CLIENT_ID }}`, `private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}`), sem `owner` nem `repositories`, o que restringe o token ao repositório atual.
  - O token sai mascarado e é revogado no fim do job.
  - O workflow também declara `permissions: contents: write, pull-requests: write`, e o repositório precisa da opção "Allow GitHub Actions to create and approve pull requests", como pede a documentação da action.
- **Rationale**: pushes feitos com o token padrão não disparam outros workflows (documentação da release-please-action). Com o token do App, a CI roda no pedido de lançamento (princípio II, FR-022). O App não expira, ao contrário de um token pessoal, e tem escopo mínimo. A chave fica só nos segredos (princípio VI); se vazar, gera-se uma chave nova no App e a antiga é apagada (roteiro).
- **Alternatives considered**: um token pessoal de escopo fino, mais simples de criar mas com expiração e ligado à conta pessoal; e o token padrão, que deixaria o pedido de lançamento sem CI (rejeitado na análise, X2).

## R14. Versão consultável de cada parte (FR-023)

- **Decision**:
  - **API**:
    - Um módulo `apps/api/src/version.ts` exporta `API_VERSION`, lido de `../package.json` por importação JSON (`resolveJsonModule` já está ligado; o tsdown embute o valor no build).
    - O health passa a devolver `version` (semver) além de `status`, `database` e `commit`.
    - No `healthStatusSchema`, `version` entra como **opcional**, para não quebrar o site anterior (FR-025).
  - **Site**:
    - Um plugin pequeno no `vite.config.ts` grava `dist/version.json` no build com `{ "version": <apps/web/package.json>, "commit": <GITHUB_SHA ou git rev-parse HEAD ou "desconhecido"> }`.
    - O `_headers` dá a esse arquivo `Cache-Control: no-store`.
    - Só o workflow lê o arquivo (com `jq`); o site não o consome, então não há schema no `apps/web/src/`.
  - **Workflow**: compara as duas `version` com as tags (R1).
- **Rationale**: a versão vem do mesmo arquivo que a release-please atualiza, então não há segunda fonte. O `version.json` substitui o `version.txt` da versão anterior do plano.
- **Alternatives considered**: variável de ambiente com a versão no Render, que exigiria atualizar o painel a cada lançamento.

## R15. Abas abertas depois de publicar o site (FR-024)

- **Decision**:
  - **Recarregamento**: em `apps/web/src/main.tsx`, ouvir `window.addEventListener('vite:preloadError', ...)`, evento que o Vite emite quando um `import()` dinâmico falha, segundo o Context7 (`/vitejs/vite/v8.0.10`). Antes de recarregar, gravar em `sessionStorage` a chave `cruzadinha:reloaded-after-deploy` com o caminho e o instante. Se a chave existir com menos de 30 s, não recarregar de novo: deixar o erro seguir para o `RouteError`, que mostra o erro de sempre. A lógica fica numa função pura testada (`shouldReloadAfterChunkError`).
  - **Cache**: o `_headers` dá ao `/index.html` e a `/` o `Cache-Control: no-cache`, como a documentação recomenda, para o navegador não usar um HTML antigo que aponta para arquivos que deixaram de existir.
  - **Letras não enviadas**: a fila de salvamento da feature 010 já guarda as letras no aparelho, então o recarregamento não as perde.
- **Rationale**: o caso concreto é a tela de jogo, carregada sob demanda (`lazy`). Com o arquivo antigo apagado, o Pages devolve o `index.html` (modo SPA) e o `import()` falha.
- **Alternatives considered**: manter os arquivos das versões anteriores publicados, o que o Direct Upload não faz sozinho; e Service Worker, desproporcional.

## R16. Compatibilidade entre versões (FR-025)

- **Fato encontrado**: o site valida as respostas da API com os schemas de `shared`, e vários usam `z.strictObject`, que rejeita campos extras: `puzzle/response.ts`, `library/schema.ts`, `progress/schema.ts`, `auth/schema.ts` e `invites/schema.ts`. Assim, **qualquer campo novo numa resposta da API quebraria o site anterior** (abas abertas e o intervalo entre publicar a API e publicar o site).
- **Decision**:
  - **Respostas**: os schemas de **resposta** que o site lê passam de `z.strictObject` para `z.object`, que descarta campos desconhecidos. Isso vale para o envelope do puzzle, o item e a lista da biblioteca, o envelope de progresso, o usuário e a resposta de auth, a lista de convites e o health.
  - **Pedidos e formato interno**: os schemas de **pedido** (corpo de login, cadastro, salvamento de progresso) e os do formato interno do puzzle e da solução (`puzzleSchema`, `solutionSchema`, que validam o que vem da fonte) continuam estritos.
  - **Testes**: os testes de `shared` que exigem "rejeita propriedades extras" nos schemas de resposta mudam para "descarta propriedades extras".
  - **Regra de processo**: fica em `docs/versionamento.md` e no `CLAUDE.md`:
    - acrescentar campo em resposta: livre;
    - acrescentar campo obrigatório em pedido: só depois que o site que o envia estiver no ar;
    - remover ou renomear campo, rota ou coluna: em dois lançamentos (primeiro parar de usar, depois remover);
    - migrações: só aditivas no mesmo lançamento;
    - códigos de erro novos: o site anterior não os conhece (o `apiErrorSchema` continua estrito) e mostra a mensagem genérica; aceitável, mas a mudança deve ser lançada junto com o site que trata o código.
  - **Puzzle e solução**: uma mudança no formato interno do puzzle ou da solução é tratada como incompatível, com o mesmo procedimento em dois lançamentos.
- **Rationale**: a API publica antes do site (R1), e abas antigas vivem por tempo indeterminado. Tolerância a campos extras do lado do leitor é o que torna "acrescentar" seguro. A rigidez continua onde protege, nas entradas.
- **Alternatives considered**: publicar o site antes da API, que não resolve as abas antigas; e versionar a API (`/api/v2`), desproporcional para um site de amigos.

## R17. Documentação de versionamento (FR-026)

- **Decision**: `docs/versionamento.md`, em português, com as seções:
  1. o que é a versão de cada parte e onde aparece;
  2. o que conta para cada parte (API: `apps/api/`; site: `apps/web/`; `packages/shared/` sobe o patch das duas);
  3. tabela "tipo de commit → efeito", com exemplos de mensagem e número resultante (inclusive a regra abaixo de 1.0.0);
  4. o pedido de lançamento e como lançar;
  5. as tags, o registro de mudanças e as releases;
  6. como ver a versão no ar (`/api/health`, `/version.json`);
  7. como reverter (`gh workflow run deploy.yml -f api=0.2.0 -f web=0.3.1`, mais o rollback no painel);
  8. a compatibilidade entre versões (R16);
  9. o que não fazer.

  O `README.md` ganha uma seção "Versões" com 3 a 5 linhas e o link. O `CLAUDE.md` ganha o mesmo resumo em "Conventions", logo depois da regra de Conventional Commits. O `docs/deploy.md` só aponta para o documento.
- **Rationale**: uma referência única, encontrada pelo README (pedido do autor) e lida onde os commits são escritos.


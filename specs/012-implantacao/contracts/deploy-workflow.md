# Contrato: workflow `deploy.yml`

Publica as partes cuja última versão lançada é diferente da versão no ar (FR-012). Desenho em research R1; o lançamento em si está em [release.md](./release.md).

## Gatilhos

- `workflow_run` do workflow `CI`, `types: [completed]`, `branches: [main]`. O job só roda com `conclusion == 'success'` e `event == 'push'`.
- `workflow_dispatch` com dois inputs, `api` e `web`: uma versão (`0.2.0`), `atual` (não publica essa parte) ou `ultima` (padrão, a maior tag). Toda parte com versão ou `ultima` é publicada **mesmo que já esteja no ar** (FR-012). Serve para reverter e para republicar.
- `concurrency: { group: deploy, cancel-in-progress: false }`: as execuções rodam em fila.
- `permissions: { contents: read, deployments: write, actions: read }`. O `actions: read` é para consultar a execução do `release.yml`.

## Guarda

O primeiro passo confere, como booleanos, se os secrets `RENDER_DEPLOY_HOOK_URL`, `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` e as variables `SITE_URL` e `CLOUDFLARE_PAGES_PROJECT` existem.

- No `workflow_run`, se faltar algum, o workflow termina com sucesso e um `::notice::` "publicação ignorada: configuração ausente".
- No `workflow_dispatch`, falta de configuração é erro.

Nenhum valor é impresso.

## Passos

| # | Passo | Roda quando | Falha quando |
|---|---|---|---|
| 1 | Checkout da `main` com `fetch-depth: 0` e `git fetch --tags` | sempre | — |
| 2 | No `workflow_run`: esperar o `release.yml` do mesmo `head_sha` terminar (`gh run list --workflow release.yml --commit <sha> --json status,conclusion`, a cada 10 s, até 5 min), e depois buscar as tags de novo | `workflow_run` | o `release.yml` falhou ou não terminou em 5 min |
| 3 | **Alvo de cada parte**: a maior tag `api-v*` e `web-v*` por semver (`git tag --list 'api-v*' --sort=-v:refname \| head -1`). No dispatch, a versão pedida (tag precisa existir) ou "não publicar" para `atual`. | sempre | tag pedida inexistente |
| 4 | **Versão no ar**: `version` de `$SITE_URL/api/health` (com tentativas por até 2 min, o que também acorda a API) e de `$SITE_URL/version.json` (com `cache-control: no-cache`) | sempre | — (leitura falha → "desconhecida") |
| 5 | No `workflow_run`: `api` = alvo existe e (versão no ar desconhecida ou diferente do alvo); idem `web`. No dispatch: `api` = input diferente de `atual`; idem `web`. Imprimir só versões e booleanos. Os dois `false` → `::notice::nada a publicar` e fim com sucesso. | sempre | — |
| 6 | `POST $RENDER_DEPLOY_HOOK_URL&ref=<sha da tag da API>` (aceita 200 e 202) | `api` | status diferente de 200 ou 202 |
| 7 | Esperar `$SITE_URL/api/health` com `version` igual ao alvo: a cada 15 s, até 15 min | `api` | o tempo acaba |
| 8 | Checkout da tag do site num diretório separado (`git worktree add`), `npm ci` e `npm run build -w @cruzadinha/web` com as `VITE_*` das variables e `GITHUB_SHA=<sha da tag>` (para o `version.json`) | `web` | build falha |
| 9 | `cloudflare/wrangler-action@v4` (`wranglerVersion` fixo, `workingDirectory` no `apps/web` da worktree): `pages deploy dist --project-name=$PROJECT --branch=main` | `web` | o deploy falha |
| 10 | Verificar `$SITE_URL/` (200, `x-robots-tag` contém `noindex`); `$SITE_URL/version.json` com a versão alvo se `web`; health com a versão alvo se `api` | `api \|\| web` | qualquer verificação falha |

## Regras

- A API publica antes do site (R1). A compatibilidade entre versões vem de R16 e FR-025.
- Uma falha em qualquer passo marca o workflow como falho, e o GitHub avisa o autor (FR-015). Nada é revertido sozinho (fora do escopo).
- O workflow não imprime o URL do hook nem o token. As mensagens citam só o nome do passo, o status HTTP e as versões.
- O `version.json` é público. Ele contém só a versão e o SHA, e o repositório é público.

## Fora do workflow

- **Reversão**: dois caminhos, que o roteiro (`docs/deploy.md`) e o `docs/versionamento.md` explicam:
  - rollback no painel de cada provedor, o mais rápido;
  - `gh workflow run deploy.yml -f api=<versão> -f web=<versão>`.

  Depois de um rollback (pelo painel ou pelo disparo manual), a versão no ar fica diferente da última tag. Por isso, o próximo `deploy.yml` (qualquer merge na `main`) republica a última versão. O roteiro avisa: para manter a reversão, é preciso lançar uma versão de correção ou usar o disparo manual com `atual` na parte revertida. Nenhum dos dois caminhos desfaz migração (R16).
- **Coleta**: continua no `collect.yml`, que não depende deste workflow.

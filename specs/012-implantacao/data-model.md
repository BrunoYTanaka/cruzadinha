# Data Model: Implantação

A feature não muda o schema do banco: nenhuma tabela nova e nenhuma migração. O "modelo" aqui é a configuração do ambiente de produção e o estado da espera no navegador.

## Configuração da API (`apps/api/src/config.ts`)

Duas variáveis novas, opcionais e validadas por Zod. As demais continuam como estão.

| Variável | Campo em `ServerConfig` | Regra | Ausente |
|---|---|---|---|
| `PROXY_SECRET` | `proxySecret: string \| undefined` | texto de 32 a 256 caracteres; vazio vale como ausente | sem verificação de repasse; `clientAddress = request.ip` |
| `RELEASE_COMMIT` (ou `RENDER_GIT_COMMIT`) | `releaseCommit: string \| undefined` | 7 a 40 caracteres hexadecimais minúsculos; `RELEASE_COMMIT` tem precedência; vazio vale como ausente | health sem `commit` |

Mensagens de erro em português, como as outras ("deve ter de 32 a 256 caracteres"). O valor de `PROXY_SECRET` nunca aparece em log nem em mensagem de erro, nem quando é inválido.

## Variáveis e segredos por lugar

Nenhum valor real entra no repositório (FR-016). "Secret" quer dizer guardado cifrado no provedor.

| Lugar | Nome | Tipo | Conteúdo |
|---|---|---|---|
| Render (serviço `cruzadinha-api`) | `NODE_ENV` | fixo no Blueprint | `production` |
| | `HOST`, `PORT` | fixo no Blueprint | `0.0.0.0`, `10000` |
| | `TRUST_PROXY_HOPS` | fixo no Blueprint | `0` |
| | `LOG_LEVEL` | fixo no Blueprint | `info` |
| | `DATABASE_URL` | secret (`sync: false`) | string direta do Neon, `sslmode=require` |
| | `PROXY_SECRET` | secret (`sync: false`) | 48 bytes aleatórios em base64url |
| | `RENDER_GIT_COMMIT` | definida pelo Render | SHA publicado |
| Cloudflare Pages (Production) | `API_ORIGIN` | variável | `https://<serviço>.onrender.com` |
| | `PROXY_SECRET` | secret | o mesmo valor do Render |
| GitHub Actions | `CLOUDFLARE_API_TOKEN` | secret | token só com "Cloudflare Pages: Edit" |
| | `CLOUDFLARE_ACCOUNT_ID` | secret | id da conta |
| | `RENDER_DEPLOY_HOOK_URL` | secret | URL do deploy hook (contém a chave) |
| | `DATABASE_URL` | secret | a mesma string do Neon (coleta) |
| | `SITE_URL` | variable | `https://<projeto>.pages.dev` |
| | `CLOUDFLARE_PAGES_PROJECT` | variable | nome do projeto Pages |
| | `RELEASE_APP_CLIENT_ID` | variable | Client ID do GitHub App de lançamento (R13) |
| | `RELEASE_APP_PRIVATE_KEY` | secret | chave privada desse App |
| | `VITE_HELP_LETTER_LIMIT`, `VITE_HELP_WORD_LIMIT` | variable (opcional) | limites das ajudas; padrão 4 e 2 |

**Troca de `PROXY_SECRET`**: gravar o valor novo no Pages e no Render e republicar os dois. Na janela entre as duas trocas, a API recusa os pedidos com `403`, e o site mostra erro até as duas pontas terem o mesmo valor. O roteiro manda trocar primeiro no Render e logo depois no Pages.

## Estado da espera no navegador (`apps/web/src/api/server-wake.ts`)

Estado do módulo, que dura enquanto a página estiver aberta:

```text
idle ──waitForServer()──▶ waiting ──health 200 + database up──▶ ready
                             │
                             └── 90 s sem sucesso ──▶ timed-out ──"Tentar de novo"──▶ waiting
```

- `ready` é definitivo nesta carga da página: novas navegações não esperam de novo. Se a API voltar a dormir depois, quem cobre é o caso de pedido lento (`useSlowServer`).
- Cada tentativa tem limite de 10 s (`AbortSignal.timeout`). O intervalo entre tentativas é de 2 s, contado a partir do fim da tentativa anterior.
- Conta como "não pronto": falha de rede, status diferente de 200, corpo que não passa no `healthStatusSchema` e `database: 'down'`.

## Pedidos em andamento (`apps/web/src/api/client.ts`)

- Um registro dos pedidos em andamento, com o instante de início de cada um, atualizado na entrada e na saída de `send()`.
- `subscribePending(listener)` e `getOldestPendingStartedAt(): number | undefined` para o `useSyncExternalStore`.
- Pedidos com `keepalive` (salvamento ao sair da página) não contam. Os demais, inclusive os da fila de salvamento, contam, mas a mensagem só aparece onde um `LoadingState` está na tela. A tela de jogo usa o `LoadingState` só antes de a cruzada carregar, então a espera nunca cobre o tabuleiro (FR-011).

## Health (`packages/shared/src/health.ts`)

`healthStatusSchema` ganha dois campos opcionais:

- `version: z.string().regex(/^\d+\.\d+\.\d+$/).optional()`;
- `commit: z.string().regex(/^[0-9a-f]{7,40}$/).optional()`.

Ele continua `z.object`, que descarta campos desconhecidos (R16). Ver [contracts/health.md](./contracts/health.md).

## Versões (R12, R14)

| Onde | Valor inicial | Quem atualiza |
|---|---|---|
| `apps/api/package.json` → `version` | `0.1.0` (hoje `0.0.0`) | release-please |
| `apps/web/package.json` → `version` | `0.1.0` (campo novo) | release-please |
| `packages/shared/package.json` → `version` | `0.1.0` (campo novo, interno) | release-please |
| `.release-please-manifest.json` | as três em `0.1.0` | release-please |
| `apps/*/CHANGELOG.md`, `packages/shared/CHANGELOG.md` | criados no primeiro lançamento | release-please (no `.prettierignore`) |
| tags | `api-vX.Y.Z`, `web-vX.Y.Z`, `shared-vX.Y.Z` | release-please, no aceite |
| `API_VERSION` (`apps/api/src/version.ts`) | lido do `package.json` no build | build |
| `dist/version.json` do site | `{ version, commit }` | build (plugin do Vite) |

Ciclo de uma versão:

```text
commits na main ──▶ pedido de lançamento (aberto/atualizado)
                         │ aceite (merge)
                         ▼
                    tags + releases ──▶ CI verde ──▶ deploy.yml: alvo ≠ no ar? ──▶ publica
```

## Recarregamento depois de publicar (R15)

`sessionStorage["cruzadinha:reloaded-after-deploy"]` = `{ "path": "/jogo/…", "at": 1760000000000 }`. É lido como `unknown` e validado por Zod; inválido conta como ausente. Ver [contracts/ui-after-deploy.md](./contracts/ui-after-deploy.md).

## Schemas de resposta (R16)

Os schemas que validam **respostas** da API no site passam de `z.strictObject` para `z.object`, que descarta campos desconhecidos:

- `packages/shared/src/puzzle/response.ts`: o envelope (`puzzleId`, `puzzle`, `solution`);
- `library/schema.ts`: o item e a lista;
- `progress/schema.ts`: o envelope de resposta;
- `auth/schema.ts`: `userSchema` e `authResponseSchema`;
- `invites/schema.ts`: as respostas;
- `health.ts`.

Os schemas de **pedido** e o formato interno (`puzzleSchema`, `solutionSchema`, `apiErrorSchema`) continuam estritos.

## Código de erro (`packages/shared/src/api-error.ts`)

`apiErrorCodeSchema` ganha `forbidden`, usado só na recusa de pedido que não veio pelo site. Ver [contracts/proxy.md](./contracts/proxy.md).

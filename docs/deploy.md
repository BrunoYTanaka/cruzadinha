# Implantação

Roteiro para colocar a Cruzadinha no ar e mantê-la, com custo zero. Nenhum valor real entra neste arquivo: tudo entre `<...>` é um marcador que você troca pelo seu valor **só** no painel do provedor ou no terminal, nunca num arquivo versionado.

Como as versões funcionam (o que cada tipo de commit faz, como lançar, como reverter): [docs/versionamento.md](versionamento.md).

## Índice

1. [Visão geral](#1-visão-geral)
2. [Contas](#2-contas)
3. [Banco: Neon](#3-banco-neon)
4. [Segredo do repasse](#4-segredo-do-repasse)
5. [API: Render](#5-api-render)
6. [Site: Cloudflare Pages](#6-site-cloudflare-pages)
7. [Primeiro deploy](#7-primeiro-deploy)
8. [Primeiro convite](#8-primeiro-convite)
9. [Verificação](#9-verificação)
10. [Lançamento e publicação automática](#lançamento-e-publicação-automática)
11. [Reversão](#reversão)
12. [Coleta diária](#coleta-diária)
13. [Segredo vazado](#segredo-vazado)
14. [Limites do plano gratuito](#limites-do-plano-gratuito)
15. [Servidor dormindo](#servidor-dormindo)

## 1. Visão geral

```text
navegador ──▶ Cloudflare Pages (<projeto>.pages.dev)
                ├─ arquivos do site (estáticos)
                └─ /api/*  ──▶ Pages Function (repasse) ──▶ Render: API (<serviço>.onrender.com)
                                                                   └──▶ Neon: Postgres (us-east-1)
GitHub Actions ──▶ coleta diária (direto no Neon), lançamento de versões e publicação
```

- O navegador só fala com o endereço do site. A Function repassa `/api/*` à API com um **segredo do repasse** e o IP real de quem acessa; a API recusa (`403`) qualquer pedido sem esse segredo, exceto `/api/health`.
- A API dorme depois de 15 minutos sem uso e leva até cerca de 1 minuto para acordar; o site mostra "Acordando o servidor" enquanto isso.

Onde fica cada valor:

| Lugar                         | Nome                                                                                                            | Tipo     | Conteúdo                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| Render                        | `DATABASE_URL`                                                                                                  | secret   | string direta do Neon            |
| Render                        | `PROXY_SECRET`                                                                                                  | secret   | segredo do repasse               |
| Cloudflare Pages (Production) | `API_ORIGIN`                                                                                                    | variável | `https://<serviço>.onrender.com` |
| Cloudflare Pages (Production) | `PROXY_SECRET`                                                                                                  | secret   | o mesmo segredo do repasse       |
| GitHub (Actions)              | ver [Lançamento e publicação automática](#lançamento-e-publicação-automática) e [Coleta diária](#coleta-diária) |          |                                  |

## 2. Contas

Crie contas gratuitas, entrando com o GitHub, sem cadastrar cartão:

- Cloudflare: <https://dash.cloudflare.com>
- Render: <https://render.com>
- Neon: <https://neon.tech>

Se algum provedor passar a exigir cartão, pare e reavalie antes de seguir.

## 3. Banco: Neon

1. Crie um projeto na região **AWS US East 1 (N. Virginia)**, a mesma da API.
2. Em **Connect**, copie a string de conexão **direta**: desligue "Connection pooling" (sem `-pooler` no host) e confira que termina com `sslmode=require`. A API usa conexões diretas; o pooler exigiria outra configuração do driver.
3. Guarde a string só no gerenciador de senhas até colá-la no Render e no GitHub.

Limites do plano gratuito: 0,5 GB de dados e 100 horas de computação por mês; o banco suspende depois de 5 minutos sem uso e acorda na próxima consulta.

## 4. Segredo do repasse

Gere um valor aleatório e cole direto nos painéis (Render e Pages), sem salvar em arquivo:

```sh
openssl rand -base64 48 | tr '+/' '-_' | tr -d '='
```

## 5. API: Render

1. **New → Blueprint**, escolha este repositório e a branch `main`. O Render lê o `render.yaml` da raiz (serviço `cruzadinha-api`, plano free, região Virgínia, Docker).
2. Preencha os valores pedidos: `DATABASE_URL` (string do Neon) e `PROXY_SECRET` (segredo do passo 4).
3. Ao criar, o Render publica a `main`. A API aplica as migrações ao subir; o deploy só termina quando `/api/health` responde.
4. Anote a URL do serviço (`https://<serviço>.onrender.com`).
5. Em **Settings → Deploy Hook**, copie a URL do hook (contém uma chave: trate como segredo).

> Nunca use o Postgres gratuito do próprio Render: ele é apagado 30 dias depois de criado.

## 6. Site: Cloudflare Pages

1. Crie o projeto por Direct Upload (sem integração com o Git, para não haver prévias de pull request ligadas à produção):

   ```sh
   npx wrangler@4.151.1 login
   npx wrangler@4.151.1 pages project create <projeto> --production-branch=main
   ```

2. No painel: **Workers & Pages → `<projeto>` → Settings → Variables and Secrets**, ambiente **Production**:
   - `API_ORIGIN` (texto): `https://<serviço>.onrender.com`;
   - `PROXY_SECRET` (secret): o segredo do passo 4.

   Deixe o ambiente **Preview** sem variáveis: assim nenhuma prévia fala com a API de produção.

## 7. Primeiro deploy

Feito **depois do merge** da feature 012 na `main` (o Render publica a `main`). Até os segredos do GitHub existirem, os workflows `Release` e `Deploy` terminam com um aviso, sem erro.

- **API**: publicada pelo Render ao criar o Blueprint (passo 5).
- **Site**: a partir da `main` atualizada:

  ```sh
  git switch main && git pull
  npm ci
  npm run build -w @cruzadinha/web
  cd apps/web
  npx wrangler@4.151.1 pages deploy dist --project-name=<projeto> --branch=main
  ```

Os deploys seguintes são automáticos: [Lançamento e publicação automática](#lançamento-e-publicação-automática).

## 8. Primeiro convite

O cadastro é só por convite. Crie o primeiro rodando a CLI da sua máquina contra o banco de produção, com a string só no comando (o terminal remoto do Render é pago):

```sh
# o espaço no início evita gravar a linha no histórico na maioria dos shells (HISTCONTROL=ignorespace)
 read -rs DATABASE_URL && export DATABASE_URL
 NODE_ENV=production npm run cli -w @cruzadinha/api -- invites create --days 1
 unset DATABASE_URL
```

`NODE_ENV=production` faz a CLI ignorar o `.env` local. Cadastre-se com o código e convide os amigos pelo próprio site.

## 9. Verificação

Rode as verificações da seção 2 de [`specs/012-implantacao/quickstart.md`](../specs/012-implantacao/quickstart.md) e o fluxo da seção 3 (convite → cadastro → jogar → outro aparelho).

## Lançamento e publicação automática

Dois workflows fazem o trabalho; como as versões funcionam está em [docs/versionamento.md](versionamento.md).

- **Release** (`.github/workflows/release.yml`): a cada push na `main`, mantém o pedido de lançamento; quando ele é aceito, cria as tags `api-v*`/`web-v*` e as releases.
- **Deploy** (`.github/workflows/deploy.yml`): depois de cada CI verde na `main`, compara a última versão lançada de cada parte com a que está no ar (`/api/health` e `/version.json`) e publica só o que for diferente, primeiro a API (deploy hook do Render) e depois o site (Direct Upload no Pages). Na maioria das vezes termina em segundos com "nada a publicar".

### GitHub App de lançamento

O Release precisa de um token próprio: o que o token padrão do GitHub cria não dispara a CI, e o pedido de lançamento precisa passar pela CI como qualquer pull request.

1. **Settings (da sua conta) → Developer settings → GitHub Apps → New GitHub App**:
   - nome livre (por exemplo, `<seu-usuário>-cruzadinha-release`), URL da página inicial do repositório;
   - desmarque **Webhook → Active**;
   - **Repository permissions**: **Contents: Read and write** e **Pull requests: Read and write**; nada mais;
   - **Where can this GitHub App be installed?**: Only on this account.
2. Na página do App, **Generate a private key** (baixa um `.pem`) e anote o **Client ID**.
3. **Install App** → só o repositório `cruzadinha`.
4. No repositório, **Settings → Secrets and variables → Actions**:
   - variable `RELEASE_APP_CLIENT_ID`: o Client ID;
   - secret `RELEASE_APP_PRIVATE_KEY`: o conteúdo do `.pem` (depois apague o arquivo local).
5. **Settings → Actions → General → Workflow permissions**: marque **Allow GitHub Actions to create and approve pull requests**.
6. Dispare o primeiro pedido de lançamento: `gh workflow run release.yml`.

### Secrets e variables da publicação

Em **Settings → Secrets and variables → Actions** (ou `gh secret set <nome>` / `gh variable set <nome>`, digitando o valor no prompt, nunca na linha de comando):

| Nome                                             | Tipo                | Conteúdo                                                                                                          |
| ------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                           | secret              | token criado em **My Profile → API Tokens → Create Token → Custom**, só com **Account → Cloudflare Pages → Edit** |
| `CLOUDFLARE_ACCOUNT_ID`                          | secret              | id da conta Cloudflare (painel, barra lateral)                                                                    |
| `RENDER_DEPLOY_HOOK_URL`                         | secret              | URL do deploy hook do Render                                                                                      |
| `SITE_URL`                                       | variable            | `https://<projeto>.pages.dev`                                                                                     |
| `CLOUDFLARE_PAGES_PROJECT`                       | variable            | `<projeto>`                                                                                                       |
| `VITE_HELP_LETTER_LIMIT`, `VITE_HELP_WORD_LIMIT` | variable (opcional) | limites das ajudas; sem elas valem 4 e 2                                                                          |

Sem essa configuração, o Deploy disparado por um merge termina com um aviso, sem erro.

### Por que o auto-deploy do Render fica desligado

O `render.yaml` declara `autoDeployTrigger: off`. Quem decide quando a API muda é o Deploy, só para versões lançadas e só depois da CI verde. Com o auto-deploy ligado, cada merge na `main` subiria a API, inclusive sem versão nova.

### Lendo uma falha

- **Release falhou**: veja o passo da release-please; o mais comum é o App sem permissão ou a opção do passo 5 desligada.
- **Deploy falhou em "Esperar o lançamento"**: o Release do mesmo commit falhou; corrija-o e rode `gh workflow run deploy.yml`.
- **"deploy hook: HTTP 4xx"**: hook regenerado ou serviço suspenso (veja os limites).
- **"a API não mostrou a versão … em 15 minutos"**: o deploy do Render falhou (migração ou health check); a versão anterior continua no ar. Veja **Events** e os logs no Render.
- **Falha no site**: veja o passo do Wrangler; o token pode ter expirado ou perdido a permissão.

## Reversão

Dois caminhos; nenhum desfaz migração de banco.

1. **Painel (mais rápido)**:
   - Render: **cruzadinha-api → Events** → deploy anterior → **Rollback**;
   - Cloudflare: **Workers & Pages → `<projeto>` → Deployments** → deploy anterior → **Rollback to this deployment**.
2. **Workflow** (publica mesmo que a versão já esteja no ar):

   ```sh
   gh workflow run deploy.yml -f api=<versão> -f web=atual
   ```

**A reversão vale até o próximo merge na `main`**: o Deploy publica de novo a última versão lançada. Lance logo uma versão de correção (por exemplo, revertendo o commit com defeito).

Migrações não são desfeitas. Toda migração segue a regra de compatibilidade de [docs/versionamento.md](versionamento.md#8-compatibilidade-entre-versões); se uma versão com defeito trouxe uma migração, a correção é uma migração nova, nunca uma alteração manual do banco.

## Coleta diária

O workflow **Coleta de puzzles** (`.github/workflows/collect.yml`) grava o puzzle do dia direto no Neon, às 00:01 e às 08:00 de Brasília, sem depender da API acordada.

1. Cadastre o secret `DATABASE_URL` com a string do Neon.
2. Rode à mão uma vez: `gh workflow run collect.yml` e confira o dia de hoje no calendário publicado.
3. Opcional: a variable `COLLECT_HISTORY_DAYS` (0 a 365, padrão 31) define quantos dias passados a coleta busca.

Em repositório público, o GitHub desativa agendamentos depois de 60 dias sem atividade. O job `keepalive` do próprio workflow reativa o agendamento todo dia 1. Para conferir ou reativar à mão:

```sh
gh workflow list --all          # "Coleta de puzzles" deve estar "active"
gh workflow enable collect.yml  # reativa, se estiver desativado
```

## Segredo vazado

Um segredo exposto (colado num commit, numa issue, num log, numa conversa) é considerado comprometido: troque-o. Apagar do histórico não basta.

- **`DATABASE_URL`**: no Neon, **Roles → resetar a senha** do papel; atualize o valor no Render e no secret do GitHub.
- **`PROXY_SECRET`**: gere outro (seção 4); troque primeiro no Render e logo depois no Pages (Production). Entre as duas trocas a API responde `403` por alguns minutos.
- **`CLOUDFLARE_API_TOKEN`**: em **My Profile → API Tokens**, revogue e crie outro com a mesma permissão.
- **`RENDER_DEPLOY_HOOK_URL`**: em **Settings → Deploy Hook**, regenere e atualize o secret.
- **`RELEASE_APP_PRIVATE_KEY`**: na página do GitHub App, gere uma chave nova, atualize o secret e apague a antiga.

## Limites do plano gratuito

Consultados em 2026-10; confira os painéis se algo parar.

| Provedor                         | Limite                                                                                                       | Ao estourar                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Render (API)                     | 750 horas de instância e 5 GB de banda de saída por mês; dorme após 15 min sem uso; acorda em cerca de 1 min | o serviço fica suspenso até o mês virar; o consumo aparece em **Billing** |
| Neon (banco)                     | 0,5 GB de dados e 100 horas de computação por mês; suspende após 5 min sem uso                               | consultas falham até o mês virar; acompanhe em **Usage**                  |
| Cloudflare (Function do repasse) | 100 mil pedidos por dia                                                                                      | `/api/*` falha até o dia virar                                            |
| GitHub Actions                   | ilimitado em repositório público                                                                             | —                                                                         |

Backup: o plano gratuito do Neon guarda um histórico curto para restauração (**Branches → Restore**); confira a janela atual no painel.

## Servidor dormindo

> Seção a completar depois da primeira implantação (tarefa T060), com o que foi observado na seção 4 de [`specs/012-implantacao/quickstart.md`](../specs/012-implantacao/quickstart.md): como o Render respondeu ao repasse enquanto acordava, o tempo de uma busca longa na fonte e os tempos do health e da sessão em "Fast 4G" com a API acordada.

O que já se sabe: o site espera a API acordar, mostra "Acordando o servidor" depois de 2 s e desiste com "Tentar de novo" aos 90 s. O repasse transforma a página de "acordando" do provedor e falhas de conexão num `503`, que o site trata como espera.

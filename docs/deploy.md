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
8. [Contas e cadastro](#8-contas-e-cadastro)
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

| Lugar                         | Nome                                                                                                            | Tipo     | Conteúdo                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| Render                        | `DATABASE_URL`                                                                                                  | secret   | string direta do Neon                                                                                     |
| Render                        | `PROXY_SECRET`                                                                                                  | secret   | segredo do repasse; obrigatório em produção (sem ele a API não sobe)                                      |
| Render                        | `REGISTRATION_ENABLED`                                                                                          | variável | `true` abre o cadastro; ausente ou `false` fecha                                                          |
| Render                        | `RESEND_API_KEY`, `MAIL_FROM`, `APP_BASE_URL`                                                                   | secret   | e-mail do cadastro e da recuperação, ver [E-mail](#e-mail-confirmação-do-cadastro-e-recuperação-de-senha) |
| Cloudflare Pages (Production) | `API_ORIGIN`                                                                                                    | variável | `https://<serviço>.onrender.com`                                                                          |
| Cloudflare Pages (Production) | `PROXY_SECRET`                                                                                                  | secret   | o mesmo segredo do repasse                                                                                |
| GitHub (Actions)              | ver [Lançamento e publicação automática](#lançamento-e-publicação-automática) e [Coleta diária](#coleta-diária) |          |                                                                                                           |

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

## 8. Contas e cadastro

Desde a feature 013 não há convites: qualquer pessoa joga como visitante, e o cadastro pelo site fica atrás da chave `REGISTRATION_ENABLED`, **fechado por padrão**.

**Abrir ou fechar o cadastro.** No painel do Render, **`cruzadinha-api` → Environment**, crie ou mude `REGISTRATION_ENABLED` para `true` (aberto) ou `false` (fechado) e salve; o Render reinicia a API. O site lê a situação na API (`GET /api/auth/registration`), então não precisa de nova publicação. Qualquer outro valor impede a API de subir. A variável fica com `sync: false` no `render.yaml`, sem valor: assim a sincronização do Blueprint não desfaz o que foi escolhido no painel.

**Criar uma conta com o cadastro fechado.** Rode a CLI da sua máquina contra o banco de produção, com a string só no comando (o terminal remoto do Render é pago). A senha é pedida duas vezes, sem aparecer na tela, e nunca vai como argumento:

```sh
# o espaço no início evita gravar a linha no histórico na maioria dos shells (HISTCONTROL=ignorespace)
 read -rs DATABASE_URL && export DATABASE_URL
 NODE_ENV=production npm run cli -w @cruzadinha/api -- users create --email amigo@exemplo.com
 unset DATABASE_URL
```

`NODE_ENV=production` faz a CLI ignorar o `.env` local. O comando sai com `1` se o e-mail já tem conta (sem mudar nada) e com `2` para e-mail ou senha inválidos.

### E-mail: confirmação do cadastro e recuperação de senha

Desde a feature 035 o cadastro só cria a conta depois de a pessoa abrir um link enviado ao e-mail, e quem esquece a senha recebe um link para redefini-la. Os e-mails saem pelo [Resend](https://resend.com) (plano grátis: 100 e-mails por dia e 3.000 por mês). Sem captcha: a proteção contra abuso é o limite persistido por endereço, por e-mail e um teto global por dia.

**Ordem do lançamento.** (1) Lançamento A (`shared` e API) com `REGISTRATION_ENABLED` ausente ou `false`; o site anterior segue funcionando, porque nunca chama as rotas novas. (2) Configure o Resend e as variáveis abaixo. (3) Lançamento B (o site). (4) Só então `REGISTRATION_ENABLED=true`. A recuperação de senha não depende dessa chave: atende contas que já existem (inclusive as criadas pela CLI).

**Resend e DNS.**

1. Crie a conta em <https://resend.com>, entrando com o GitHub, sem cartão.
2. Em **Domains**, adicione o domínio de envio (um subdomínio, como `mail.seudominio.com`, mantém o resto do DNS intocado) e crie, no DNS da Cloudflare, os registros que o Resend mostra, **todos com o proxy desligado ("DNS only")**:
   - **SPF**: um `TXT` e um `MX` do subdomínio de envio, como indicado pelo Resend;
   - **DKIM**: o `TXT` `resend._domainkey` com a chave pública;
   - **DMARC**: um `TXT` `_dmarc` com a política, por exemplo `v=DMARC1; p=none; rua=mailto:voce@seudominio.com` (comece com `p=none` e endureça depois de ver os relatórios).
3. Espere o domínio ficar **Verified** no painel do Resend.
4. Em **API Keys**, crie uma chave só com permissão de envio. Ela aparece uma vez: copie direto para o Render, nunca para o repositório, uma issue ou um chat. Uma chave exposta deve ser tratada como comprometida e rotacionada.

**Variáveis no Render** (**`cruzadinha-api` → Environment**; todas com `sync: false` no `render.yaml`, então a sincronização do Blueprint não desfaz o painel):

| Variável                        | Obrigatória          | Padrão | Conteúdo                                                                              |
| ------------------------------- | -------------------- | ------ | ------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`                | para enviar e-mails  | —      | chave do Resend; sem ela as rotas que enviam e-mail respondem `503 email-unavailable` |
| `MAIL_FROM`                     | com `RESEND_API_KEY` | —      | remetente de um domínio verificado: `Cruzadinha <nao-responda@mail.seudominio.com>`   |
| `APP_BASE_URL`                  | com `RESEND_API_KEY` | —      | endereço público do site, `https`, sem barra final: `https://seusite.pages.dev`       |
| `EMAIL_RESEND_INTERVAL_SECONDS` | não                  | 60     | intervalo mínimo entre envios ao mesmo e-mail, inteiro de 30 a 3600                   |
| `EMAIL_PER_ADDRESS_DAILY_MAX`   | não                  | 5      | e-mails por destinatário por dia, inteiro de 1 a 20                                   |
| `EMAIL_DAILY_CEILING`           | não                  | 90     | teto global por dia, inteiro de 1 a 99 (mantenha abaixo dos 100 do plano grátis)      |
| `EMAIL_RECOVERY_RESERVE`        | não                  | 20     | as últimas vagas do teto, usadas só pela recuperação de senha; menor que o teto       |

Um valor inválido, ou `RESEND_API_KEY` sem `MAIL_FROM` e `APP_BASE_URL`, impede a API de subir (a mensagem diz qual variável). Em desenvolvimento, sem a chave, o link aparece no log da API.

**Cota e como ler a falha.** O teto global conta uma janela móvel de 24 horas, enquanto o Resend zera a cota diária à meia-noite UTC; por isso o teto interno nunca fica atrás do real. Quando o Resend responde `daily_quota_exceeded` ou `monthly_quota_exceeded`, a API grava a trava na tabela `email_send_block` e, até `blocked_until`, cadastro, reenvio e recuperação respondem `503 email-unavailable` sem chamar o Resend (o site mostra "Não foi possível enviar o e-mail agora. Tente novamente mais tarde.", sem citar cota). A tentativa que descobre a cota esgotada já tinha sido respondida; a trava vale da seguinte em diante. `rate_limit_exceeded` (pedidos por segundo) não cria trava. Para conferir:

```sql
SELECT blocked_until, reason FROM email_send_block;   -- linha vencida é ignorada
SELECT count(*) FROM rate_limit_attempts WHERE action = 'EMAIL_SENT' AND key_type = 'GLOBAL' AND created_at > now() - interval '24 hours';
```

Falhas de envio que não são cota aparecem só no log da API (`e-mail não enviado`, com o motivo, sem endereço nem token); a pessoa usa o reenvio. Para liberar a trava antes da hora (por exemplo, depois de subir de plano), apague a linha: `DELETE FROM email_send_block;`.

**Limpeza.** O passo `auth cleanup` do workflow `collect.yml` (duas vezes por dia, com o segredo `DATABASE_URL`) apaga pendências e tokens vencidos há mais de 7 dias e as contagens de tentativas dos limites (login, cadastro, buscas, envios) com mais de 2 dias. Manualmente: `node apps/api/dist/cli.mjs auth cleanup`.

## 9. Verificação

Rode as verificações da seção 2 de [`specs/012-implantacao/quickstart.md`](../specs/012-implantacao/quickstart.md) e o fluxo da seção 3, agora com conta criada por `users create` (ou cadastro com a chave aberta) → jogar → outro aparelho. Confira também que uma janela anônima abre o calendário como visitante.

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
2. Na página do App, **Generate a private key** (baixa um `.pem`) e anote o **Client ID**. Não abra o `.pem` num editor com assistente de IA ou extensões conectadas: copie direto para a área de transferência (`xclip -sel c < arquivo.pem`). Se o conteúdo vazar, gere outra chave e apague a antiga na mesma página.
3. **Install App** → só o repositório `cruzadinha`.
4. No repositório, **Settings → Secrets and variables → Actions** (sempre em **Repository**, veja abaixo):
   - variable `RELEASE_APP_CLIENT_ID`: o Client ID;
   - secret `RELEASE_APP_PRIVATE_KEY`: o conteúdo inteiro do `.pem`, com as linhas `BEGIN`/`END` (depois apague o arquivo local).
5. **Settings → Actions → General → Workflow permissions**: marque **Allow GitHub Actions to create and approve pull requests**.
6. Dispare o primeiro pedido de lançamento: `gh workflow run release.yml`.

### Secrets e variables da publicação

Em **Settings → Secrets and variables → Actions** (ou `gh secret set <nome>` / `gh variable set <nome>`, digitando o valor no prompt, nunca na linha de comando). Use **Repository secrets** e **Repository variables**, nunca os de **Environment**: nenhum workflow declara `environment:`, então um valor cadastrado num ambiente não chega a eles e o Deploy continua com "configuração ausente". Secret é o que dá acesso a algo (token, chave, URL com chave, string do banco); variable é o que pode ficar visível.

| Nome                                             | Tipo                | Conteúdo                                                                                             |
| ------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                           | secret              | token só com a permissão de escrita do Pages (veja abaixo)                                           |
| `CLOUDFLARE_ACCOUNT_ID`                          | secret              | id da conta Cloudflare (**Account home**, ou na URL do painel: `dash.cloudflare.com/<account-id>/…`) |
| `RENDER_DEPLOY_HOOK_URL`                         | secret              | URL do deploy hook do Render (passo 5); contém uma chave                                             |
| `SITE_URL`                                       | variable            | endereço de produção com `https://` e sem hash: `https://<projeto>.pages.dev`                        |
| `CLOUDFLARE_PAGES_PROJECT`                       | variable            | só o nome do projeto (`<projeto>`), como aparece em **Workers & Pages**                              |
| `VITE_HELP_LETTER_LIMIT`, `VITE_HELP_WORD_LIMIT` | variable (opcional) | limites das ajudas; sem elas valem 4 e 2                                                             |

Sem essa configuração, o Deploy disparado por um merge termina com um aviso, sem erro.

O Deploy não acessa o banco: a API recebe o `DATABASE_URL` no Render (passo 5) e aplica as migrações ao subir. O secret `DATABASE_URL` do GitHub é só da [Coleta diária](#coleta-diária).

`SITE_URL` não é o endereço que o Wrangler mostra ao publicar (`https://<hash>.<projeto>.pages.dev`): esse aponta para um deploy específico e o hash muda a cada publicação. O Deploy lê `SITE_URL/api/health` e `SITE_URL/version.json` para saber o que está no ar, então precisa do domínio de produção. Se o subdomínio `<projeto>` já estava ocupado, a Cloudflare usa outro (por exemplo, `<projeto>-abc.pages.dev`): confira em **Workers & Pages → `<projeto>`**.

**Token da Cloudflare**: **My Profile → API Tokens → Create Token → Create Custom Token**:

- dê um nome (por exemplo, `cruzadinha-deploy`); sem nome o botão de revisão fica bloqueado;
- no bloco de permissões, deixe o escopo em **Entire Account** (a sua conta, não "All accounts"), busque `Pages` e marque só a permissão de escrita do **Cloudflare Pages** (_Edit_), nada mais: o grupo **Developer Platform** fica com 1 marcada e os outros com 0; não use **Add policy** nem **Bulk Select**;
- sem filtro de IP (os runners do GitHub mudam de endereço); a validade é opcional, mas um token vencido faz o Deploy falhar até ser trocado;
- no resumo deve aparecer só a permissão do Pages. O token é mostrado uma vez: cole direto no secret.

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

O workflow **Coleta de puzzles** (`.github/workflows/collect.yml`) grava o puzzle do dia de cada fonte (O Globo, Cruzada Online e Cruzadas Clube) direto no Neon, às 00:01 e às 08:00 de Brasília, sem depender da API acordada.

Quando uma fonte falha, o workflow abre uma issue com o rótulo `fonte-quebrada` e o título `[Fonte] <nome> parou de coletar` (uma por fonte, sem repetir enquanto estiver aberta). Feche a issue depois de corrigir a fonte. Limite de uso da fonte, banco fora do ar e segredo ausente não abrem issue; o workflow só fica vermelho.

1. Cadastre o secret `DATABASE_URL` (em **Repository secrets**) com a string do Neon, a mesma do Render. Sem ele, cada execução agendada termina em segundos com "coleta ignorada".
2. Rode à mão uma vez: `gh workflow run collect.yml` e confira o dia de hoje no calendário publicado.
3. Opcional: a variable `COLLECT_HISTORY_DAYS` (0 a 365, padrão 31) define quantos dias passados a coleta busca.

Depois da coleta, o mesmo workflow roda `auth cleanup` (feature 035), que apaga pendências de cadastro e tokens de recuperação vencidos e as contagens de tentativas com mais de 2 dias, ver [E-mail](#e-mail-confirmação-do-cadastro-e-recuperação-de-senha). Esse passo roda mesmo se a coleta falhar.

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

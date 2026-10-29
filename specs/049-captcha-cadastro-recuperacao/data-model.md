# Data Model: Captcha no cadastro e na recuperação de senha

Sem tabela, coluna ou migração: a prova nunca é guardada. Não há mudança em `docs/data-definitions` nem em `docs/entity-relationship-diagrams`. Os tipos abaixo são de transporte e configuração.

## Prova de captcha (`captchaToken`)

| Campo | Tipo | Regra |
|---|---|---|
| `captchaToken` | texto | 1 a 2048 caracteres; opcional no formato dos três pedidos; obrigatório na prática só com `CAPTCHA_ENABLED=true`; nunca registrado em log nem guardado |

Vive em `packages/shared` (`captchaTokenSchema`). Uso único e validade de 300 s vêm da Cloudflare; a API não guarda estado.

## Ação (`CaptchaAction`)

`'signup' | 'resend' | 'forgot'`, constante em `packages/shared`.

| Rota | Ação |
|---|---|
| `POST /api/auth/register` | `signup` |
| `POST /api/auth/resend-verification` | `resend` |
| `POST /api/auth/forgot-password` | `forgot` |

## Resultado da verificação (interno à API)

```text
CaptchaResult = { ok: true } | { ok: false, reason: 'missing' | 'rejected' | 'wrong-action' | 'wrong-hostname' | 'unavailable' }
```

O motivo serve só a log e testes (nomes, nunca o token); o cliente sempre recebe `400 captcha-failed`.

## Interface

```text
CaptchaVerifier.verify({ token, action, remoteIp }): Promise<CaptchaResult>
```

Implementações: `createTurnstileVerifier({ secret, hostname, fetch? })` (real) e um falso em `src/test/` (os testes decidem o resultado por token).

## Configuração

| Variável | Onde | Regra |
|---|---|---|
| `CAPTCHA_ENABLED` | API (Render, `sync: false`) | `true`/`false`; vazio = ausente; padrão `true` em `NODE_ENV=production`, `false` fora; outro valor impede a API de subir |
| `TURNSTILE_SECRET_KEY` | API (Render, `sync: false`) | texto de 1 a 512 caracteres; obrigatória com `CAPTCHA_ENABLED=true` |
| `APP_BASE_URL` | API | já existe; com `CAPTCHA_ENABLED=true` passa a ser obrigatória, e seu host é o `hostname` esperado |
| `VITE_TURNSTILE_SITE_KEY` | build do site | opcional; pública; sem ela e com a API pedindo captcha o site mostra o aviso de indisponível |

`ServerConfig.captcha`: `{ enabled: boolean, secretKey: string | undefined, hostname: string | undefined }`.

## Resposta de `GET /api/auth/registration`

| Campo | Tipo | Regra |
|---|---|---|
| `open` | boolean | como hoje |
| `captchaRequired` | boolean | novo; espelha `config.captcha.enabled`; no `shared` a leitura usa `default(false)` para API antiga |

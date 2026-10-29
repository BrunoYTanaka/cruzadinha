# Contract: captcha nas rotas de e-mail

## Pedidos que passam a aceitar `captchaToken`

`POST /api/auth/register`, `POST /api/auth/resend-verification`, `POST /api/auth/forgot-password`.

```json
{ "email": "pessoa@exemplo.com", "captchaToken": "<prova do widget, 1 a 2048 caracteres>" }
```

- Corpo continua estrito: qualquer outra chave extra é `400 invalid-input`.
- `captchaToken` é opcional no formato. Com `CAPTCHA_ENABLED=false` é ignorado mesmo presente.
- Com `CAPTCHA_ENABLED=true` é obrigatório e validado antes de qualquer outro trabalho.

## Ordem de decisão (cada rota)

1. `register` / `resend-verification`: `403 registration-closed` se o cadastro está fechado (como hoje).
2. Captcha (só com o interruptor ligado): `400 captcha-failed` se a prova falhar por qualquer motivo.
3. Limite por endereço (`admit*`), `400 invalid-input`, teto de e-mail (`503 email-unavailable`), serviço e `202 { retryAfter }` (como hoje).

`forgot-password` não tem o passo 1.

## Resposta de recusa

`400`, mesma forma dos outros erros da API:

```json
{ "error": "captcha-failed", "message": "Não foi possível confirmar que você é uma pessoa. Tente de novo." }
```

Igual para: prova ausente, vazia, maior que 2048, inválida, expirada, repetida, de outra ação, de outro site, e falha do serviço de verificação. Igual com ou sem conta para o e-mail. Sem `Retry-After`. Não consome intervalo, limite por endereço, limite por origem nem teto de e-mail.

## `GET /api/auth/registration`

```json
{ "open": true, "captchaRequired": true }
```

`captchaRequired` espelha `CAPTCHA_ENABLED`. Resposta continua `cache-control: no-store`. Campo novo é aditivo; no `shared` a leitura usa `default(false)`.

## Chamada à Cloudflare (interna)

```text
POST https://challenges.cloudflare.com/turnstile/v0/siteverify
{ "secret": <TURNSTILE_SECRET_KEY>, "response": <captchaToken>, "remoteip": <request.clientAddress, só quando é um IP> }
```

Aceita só com `success: true`, `action` igual à da rota e `hostname` igual ao host de `APP_BASE_URL`. Timeout de 10 s. Sem `idempotency_key`. Qualquer falha é recusa.

## Contrato do widget no site

| Tela | `action` | Quando renderiza |
|---|---|---|
| `/cadastro`, formulário do e-mail | `signup` | `captchaRequired` verdadeiro |
| `/cadastro`, "Confira seu e-mail" | `resend` | `captchaRequired` verdadeiro |
| `/esqueci-a-senha` | `forgot` | `captchaRequired` verdadeiro |

Opções: `appearance: 'interaction-only'`, `language: 'pt-br'`, `theme` do site. Callbacks: `callback` guarda a prova; `expired-callback` e `error-callback` limpam a prova. `reset` depois de cada envio. O script (`api.js?render=explicit`) só é pedido nessas telas.

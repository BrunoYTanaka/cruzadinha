# Contrato da API: confirmar e-mail e recuperar senha

Schemas em `packages/shared` (pedidos estritos, respostas tolerantes). Toda rota nova tem `schema` OpenAPI em `auth.schemas.ts`. Endereço do cliente sempre por `request.clientAddress`. Nenhuma rota nova abre sessão.

## Códigos de erro novos (`apiErrorCodeSchema`)

| Código              | Status | Mensagem                                         |
| ------------------- | ------ | ------------------------------------------------ |
| `invalid-token`     | 400    | "Link inválido ou vencido."                      |
| `email-unavailable` | 503    | "Não foi possível enviar o e-mail agora."        |

`apiErrorSchema` ganha `retryAfter?: number` (segundos, inteiro ≥ 1). `too-many-attempts` (429) passa a levá-lo também, além do `Retry-After`. O site anterior nunca chama estas rotas, e o `429` das rotas antigas não muda.

## Resposta comum de envio

`202 { "retryAfter": <segundos> }` em cadastro, reenvio e recuperação, igual com ou sem conta/pendência. `retryAfter` = tempo até o próximo envio permitido (o intervalo de `EMAIL_RESEND_INTERVAL_SECONDS`, ou o que resta dele).

Ordem de verificação em toda rota que envia e-mail: (1) chave de cadastro, só nas duas rotas de cadastro (`403 registration-closed`); (2) limite por endereço (`429 too-many-attempts`); (3) corpo (`400 invalid-input`); (4) trava de envio ativa ou provedor não configurado (`503 email-unavailable` com `retryAfter` até `blocked_until`, sem chamar o Resend); (5) trabalho igual nos dois casos; (6) resposta `202`; (7) envio depois da resposta, por `email.sendAfterResponse` chamado sem `await` depois de `reply.send` (o serviço guarda as promessas e expõe `flush()` para testes). A trava descoberta no envio vale da requisição seguinte; a atual já foi respondida com `202`.

Dentro do intervalo mínimo (`EMAIL_RESEND_INTERVAL_SECONDS`) o pedido não envia e responde igual, com o `retryAfter` restante. O intervalo é uma tentativa por e-mail (`REGISTER` para cadastro, reenvio e aviso ao dono; `FORGOT_PASSWORD` para a recuperação), contada sempre, com ou sem conta ou pendência, para o tempo restante ser igual nos dois casos. Se nenhum e-mail chega a sair (falha do provedor, trava ou teto), a tentativa é desfeita.

## `POST /api/auth/register` (muda)

- Pedido: `{ email }` (`registerRequestSchema`; `inviteCode` do site anterior é aceito e ignorado, `password` é recusado: a senha é escolhida em `verify-email`).
- `202 { retryAfter }`: grava ou renova `pending_registrations` (só se o intervalo por e-mail passou) e envia o link de confirmação; se o e-mail já tem conta, não cria pendência e envia o aviso ao dono. O intervalo conta nos dois casos.
- `403 registration-closed`, `429 too-many-attempts`, `400 invalid-input`, `503 email-unavailable`.
- Sem `409 registration-failed` e sem cookie de sessão (substitui o `201` da feature 013).

## `POST /api/auth/resend-verification` (nova)

- Pedido: `{ email }`.
- `202 { retryAfter }`: se há pendência e o intervalo passou, troca o token (o antigo morre) e envia. Resposta igual sem pendência.
- Mesmos erros do cadastro (inclui `403 registration-closed`).

## `POST /api/auth/verify-email` (nova)

- Pedido: `{ token, password }` (token de 43 caracteres base64url; senha pelas regras de `passwordSchema`).
- `200 {}`: cria o usuário com essa senha e apaga a pendência. Sem cookie. O corpo é validado antes do token: senha inválida dá `400 invalid-input` (`fields: ["password"]`) sem gastar o link.
- `400 invalid-token`: inexistente, vencido, já usado, substituído ou e-mail já com conta (a pendência é apagada nesse último caso).
- `429 too-many-attempts` (limite `VERIFY_TOKEN` por endereço), `400 invalid-input`.
- Não depende de `REGISTRATION_ENABLED`: uma pendência já criada pode ser confirmada mesmo se o cadastro fechar depois.

## `POST /api/auth/forgot-password` (nova)

- Pedido: `{ email }`.
- `202 { retryAfter }`: se há conta e o intervalo passou, invalida o token aberto anterior, cria o novo e envia. Sem conta, mesma resposta e nenhum e-mail.
- Funciona com `REGISTRATION_ENABLED=false`. Usa a reserva: passa até `EMAIL_DAILY_CEILING`.
- `429 too-many-attempts`, `400 invalid-input`, `503 email-unavailable`.

## `POST /api/auth/reset-password` (nova)

- Pedido: `{ token, password }` (`passwordSchema`).
- `200 {}`: troca a senha (argon2id), marca o token como usado e encerra todas as sessões do usuário. Sem cookie novo; o cookie atual do navegador é apagado na resposta.
- `400 invalid-token`; `400 invalid-input` com `fields: ["password"]` sem consumir o token (a validação do corpo vem antes da consulta ao token); `429 too-many-attempts` (limite `RESET_PASSWORD` por endereço, separado do da confirmação). Redefinir invalida todos os outros tokens abertos do usuário.

## Configuração (`config.ts`, Zod)

| Variável                         | Regra                                                   | Padrão |
| -------------------------------- | ------------------------------------------------------- | ------ |
| `RESEND_API_KEY`                 | opcional, segredo (`sync: false`)                       | —      |
| `MAIL_FROM`                      | opcional; e-mail ou `Nome <e-mail>`                     | —      |
| `APP_BASE_URL`                   | opcional; URL `https`, sem barra final (`http` só fora de produção); exigida junto com `RESEND_API_KEY` | `http://localhost:5173` fora de produção; sem padrão em produção |
| `EMAIL_RESEND_INTERVAL_SECONDS`  | inteiro 30–3600                                         | 60     |
| `EMAIL_PER_ADDRESS_DAILY_MAX`    | inteiro 1–20                                            | 5      |
| `EMAIL_DAILY_CEILING`            | inteiro 1–99                                            | 90     |
| `EMAIL_RECOVERY_RESERVE`         | inteiro 0 até `EMAIL_DAILY_CEILING − 1`                 | 20     |

Valor inválido ou combinação incoerente impede a API de subir. Sem `RESEND_API_KEY`: produção responde `503 email-unavailable`; fora dela o link vai para o log (`LogSender`).

## Interface de envio (interna)

```ts
type EmailMessage = { to: string; subject: string; text: string; html: string; idempotencyKey: string }
type SendResult =
  | { ok: true }
  | { ok: false; reason: 'quota-daily' | 'quota-monthly' | 'rate-limited' | 'failed' }
interface EmailSender { send(message: EmailMessage): Promise<SendResult> }
```

`quota-*` grava `email_send_block`; `rate-limited` e `failed` só vão para o log (sem endereço nem token).

## CLI

`auth cleanup`: apaga pendências e tokens vencidos ou usados há mais de 7 dias e tentativas `EMAIL_SENT` com mais de 2 dias; imprime as contagens; exit 0/1.

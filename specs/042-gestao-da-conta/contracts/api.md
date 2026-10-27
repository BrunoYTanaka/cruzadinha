# Contrato da API: gestão da conta

Schemas em `packages/shared/src/auth/schema.ts` (pedidos estritos, respostas tolerantes). Toda rota nova tem `schema` OpenAPI em `modules/identity/account/account.schemas.ts` (exigido por `platform/docs/docs.test.ts`; `security` nas que pedem sessão). Endereço do cliente sempre por `request.clientAddress`. Nenhuma rota nova abre sessão.

## Código de erro novo (`apiErrorCodeSchema`)

| Código           | Status | Mensagem                        |
| ---------------- | ------ | ------------------------------- |
| `wrong-password` | 400    | "A senha atual não confere."    |

Nunca `401` para senha errada: o site trata `401` como sessão encerrada.

## Pedidos (`shared`)

```text
currentPasswordSchema            = z.string().min(1).max(128)
changePasswordRequestSchema      = strict { currentPassword, newPassword: passwordSchema }
changeEmailRequestSchema         = strict { currentPassword, newEmail: emailSchema }
confirmEmailChangeRequestSchema  = strict { token: tokenSchema }
deleteAccountRequestSchema       = strict { currentPassword }
```

Respostas: `200 {}` (objeto tolerante vazio) e `202 { retryAfter }` (`emailRequestAcceptedSchema` existente).

## Senha atual (comum a trocar senha, trocar e-mail e excluir)

Reserva `PASSWORD_CONFIRM`/`USER` antes do argon2. Recusa: `429 too-many-attempts` com `retryAfter` e `Retry-After`. Senha errada: `400 wrong-password` (a linha reservada é o registro da falha). Acerto: devolve a reserva e limpa o balde.

## `POST /api/auth/change-password`

- Sessão obrigatória (`401 unauthenticated` sem ela).
- Ordem: sessão, corpo (`400 invalid-input`, `fields: ["newPassword"]` etc.), senha atual, trabalho.
- `200 {}`: numa transação, grava o hash argon2id novo, encerra as outras sessões da conta (a do cookie fica), revoga os links de recuperação abertos. O pedido de troca de e-mail pendente continua.
- Repetir o pedido com a senha antiga depois de concluído dá `400 wrong-password` (sem efeito duplicado).

## `POST /api/auth/logout-others`

- Sessão obrigatória. Corpo vazio ou ausente (`{}` estrito).
- `200 {}`: encerra todas as sessões abertas da conta menos a do cookie. Idempotente.

## `POST /api/auth/change-email`

- Sessão obrigatória.
- Ordem: (1) sessão; (2) limite por endereço `CHANGE_EMAIL` (`429`); (3) corpo (`400 invalid-input`); (4) `email.admit()` (`503 email-unavailable` com `retryAfter`); (5) senha atual (`400 wrong-password`, `429`); (6) `newEmail` igual ao atual: `400 invalid-input`, `fields: ["newEmail"]`; (7) intervalo por usuário `CHANGE_EMAIL` (dentro dele responde `202` com o restante, sem enviar); (8) trabalho; (9) `202 { retryAfter }`; (10) envios por `email.sendAfterResponse`.
- Trabalho com o endereço livre: upsert do pedido (token novo, 60 min) e link `APP_BASE_URL/confirmar-email#token=<token>` ao novo endereço.
- Trabalho com o endereço de outra conta: nenhum pedido, nenhum link. A resposta é a mesma.
- Nos dois casos: aviso `emailChangeNotice(requestedAt)` ao endereço atual, sem o novo endereço e sem link de ação.
- Se nenhum e-mail sai (falha do provedor, trava, teto), a tentativa do intervalo é desfeita, como na feature 035.

## `POST /api/auth/confirm-email-change`

- Sem sessão (o link é a prova de posse). Não depende de `REGISTRATION_ENABLED`.
- Ordem: limite `VERIFY_TOKEN` por endereço (`429`), corpo (`400 invalid-input`), trabalho.
- `200 {}`: apaga o pedido e troca `users.email` na mesma transação. Sessões continuam; quem estava logado vê o e-mail novo no próximo `GET /api/auth/me`.
- `400 invalid-token`: inexistente, vencido, usado, substituído, ou endereço ocupado por outra conta desde o pedido (nesse caso o pedido também é apagado).

## `POST /api/auth/delete-account`

- Sessão obrigatória.
- Ordem: sessão, corpo, senha atual, trabalho.
- `200 {}`: apaga `users` (cascata: sessões, progresso, ajustes, tokens de recuperação, pedido de troca) e as tentativas `USER` da conta; a resposta limpa o cookie de sessão.
- Um segundo pedido igual chega sem sessão válida: `401` com o cookie limpo, que o site já trata.

## Configuração

Nenhuma variável nova. Os envios usam `RESEND_API_KEY`, `MAIL_FROM`, `APP_BASE_URL` e os limites `EMAIL_*` da feature 035; sem chave, produção responde `503 email-unavailable` só em `change-email`.

## E-mails (`platform/email/templates.ts`)

- `emailChangeEmail(link)`: "Confirme seu novo e-mail na Cruzadinha", link válido por 60 minutos, "se não foi você, ignore".
- `emailChangeNotice(requestedAt)`: "Pedido de troca de e-mail", data e hora em Brasília, "se não foi você, troque sua senha"; sem o novo endereço e sem link de ação.

## Compatibilidade

Só acréscimos. O site anterior nunca chama estas rotas nem recebe `wrong-password`. O site novo diante da API anterior recebe `404` nestas rotas e mostra "Esta ação não está disponível agora.".

# Contrato: API HTTP de autenticação e convites

Todos os corpos são JSON. Os schemas Zod de cada corpo e resposta ficam em `packages/shared` e são exportados pelo `index.ts` (ver [shared-schemas.md](./shared-schemas.md)). Nomes de campos em camelCase.

## Cookie de sessão

| Atributo | Valor |
|---|---|
| Nome | `sid` |
| Valor | 32 bytes aleatórios em base64url (o banco guarda só o SHA-256) |
| `HttpOnly` | sempre |
| `SameSite` | `Lax` |
| `Secure` | quando `NODE_ENV` não é `development` nem `test` |
| `Path` | `/` |
| `Max-Age` | segundos até `expires_at` da sessão |

O cookie é enviado no cadastro, no login e em qualquer resposta autenticada que renove a sessão. O logout responde com o cookie expirado.

## Erros

Formato comum:

```json
{ "error": "invalid-invite", "message": "Convite inválido." }
```

| Status | `error` | `message` | Quando |
|---|---|---|---|
| 400 | `invalid-input` | `Dados inválidos.` | Corpo fora do schema. Traz `fields`: lista dos campos com problema (`email`, `password`; `inviteCode` só quando ausente, vazio ou com mais de 64 caracteres), sem os valores |
| 400 | `invalid-invite` | `Convite inválido.` | Convite inexistente, usado, expirado, revogado ou com formato de código inválido (FR-020) |
| 409 | `registration-failed` | `Não foi possível concluir o cadastro.` | E-mail já cadastrado (FR-009); o convite não é gasto |
| 401 | `invalid-credentials` | `E-mail ou senha incorretos.` | E-mail inexistente ou senha errada (FR-011) |
| 401 | `unauthenticated` | `Não autenticado.` | Sem sessão, sessão expirada, encerrada, adulterada ou com formato inválido |
| 409 | `invite-quota-reached` | `Você já tem 3 convites ativos.` | Cota atingida (FR-021) |
| 429 | `too-many-attempts` | `Muitas tentativas, tente mais tarde.` | Limite atingido (FR-027 a FR-029). Cabeçalho `Retry-After` com os segundos até a janela liberar |
| 503 | `service-unavailable` | `Serviço indisponível, tente mais tarde.` | Banco fora do ar, sem detalhes da conexão |
| 500 | `internal-error` | `Erro interno.` | Qualquer outra falha, sem detalhes |

Nenhuma resposta contém senha, hash, valor de sessão (exceto no `Set-Cookie`) ou código de convite (exceto na criação).

## `POST /api/auth/register`

Requisição:

```json
{ "email": "ana@exemplo.com", "password": "********", "inviteCode": "ABCD-EFGH-JKMN-PQRS" }
```

Ordem de verificação:
1. Limite de cadastro por endereço (429).
2. Formato do corpo (400 `invalid-input`).
3. Convite válido (400 `invalid-invite`).
4. E-mail livre (409 `registration-failed`).

Toda tentativa conta para o limite, inclusive as que falham no formato.

Por que a ordem difere do login: no cadastro toda tentativa conta, então o limite vem primeiro e barra rajadas antes de qualquer trabalho. No login só as falhas de credencial contam, então um corpo mal formado é recusado antes, sem gastar tentativa nem consultar contadores.

Resposta `201` com o cookie de sessão:

```json
{ "user": { "id": "0b6f…", "email": "ana@exemplo.com" } }
```

## `POST /api/auth/login`

Requisição:

```json
{ "email": "Ana@Exemplo.com ", "password": "********" }
```

- Corpo fora do schema: 400 `invalid-input`.
- Algum limite (e-mail ou endereço) já atingido: 429, sem verificar a senha.
- Credenciais erradas: 401 `invalid-credentials`, e a falha é registrada.

Resposta `200` com um cookie de sessão nova, no mesmo formato do cadastro (`{ "user": { … } }`). Sessões anteriores do usuário continuam válidas.

## `POST /api/auth/logout`

- Sem corpo.
- Com sessão ativa: encerra a sessão (`ended_at`) e responde `204` com o cookie expirado.
- Sem sessão válida: responde `204` com o cookie expirado. O logout é idempotente e não revela nada.

## `GET /api/auth/me`

- `200` com `{ "user": { "id": "…", "email": "…" } }`, e o cookie renovado quando a sessão foi renovada.
- `401 unauthenticated` sem sessão válida.

## `POST /api/invites`

- Exige sessão (401).
- Ordem: sessão, limite por endereço (429), cota (409).

Resposta `201`:

```json
{ "code": "ABCD-EFGH-JKMN-PQRS", "expiresAt": "2026-10-20T12:00:00.000Z" }
```

O código só aparece nessa resposta.

## `GET /api/invites`

- Exige sessão (401).
- Lista só os convites criados pelo próprio usuário, do mais novo para o mais antigo.

Resposta `200`:

```json
{
  "invites": [
    { "createdAt": "2026-10-13T12:00:00.000Z", "expiresAt": "2026-10-20T12:00:00.000Z", "status": "active" }
  ]
}
```

`status` é um de `active`, `used`, `expired` e `revoked`. A resposta não traz código, quem usou nem identificador.

## Renovação da sessão

Qualquer rota autenticada (`/api/auth/me`, `/api/invites`) passa pelo mesmo `preHandler` de sessão. Quando ele renova a sessão (data-model, `sessions`), a resposta leva o `Set-Cookie` com o novo `Max-Age`.

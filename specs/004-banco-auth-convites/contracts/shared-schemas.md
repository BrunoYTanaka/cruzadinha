# Contrato: exportações do `shared` para autenticação e convites

Arquivos novos em `packages/shared/src/auth/` e `packages/shared/src/invites/`, exportados por `packages/shared/src/index.ts`. Os schemas não usam APIs do Node, para o site importar os mesmos tipos.

| Exportação | Forma | Notas |
|---|---|---|
| `emailSchema` | `string` | Sem espaços nas pontas, em minúsculas, depois validação de e-mail, até 254 caracteres. O valor de saída já é o normalizado |
| `passwordSchema` | `string` | De 8 a 128 caracteres, sem normalização |
| `inviteCodeSchema` | `string` | Maiúsculas, sem espaços nem hífens; exige 16 caracteres do alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. A saída é o código normalizado. Usado pelo serviço de cadastro, não pelo `registerRequestSchema`: código mal formado vira `invalid-invite`, nunca `invalid-input` |
| `registerRequestSchema` | `{ email, password, inviteCode }` | Objeto estrito. `inviteCode` é só texto de 1 a 64 caracteres, sem checar o formato do código, para que um código mal formado receba a mesma resposta dos outros convites inválidos (FR-020) |
| `loginRequestSchema` | `{ email, password }` | Objeto estrito. A senha só exige texto de 1 a 128 caracteres, para não revelar a regra de tamanho no login |
| `userSchema` / `User` | `{ id: uuid, email }` | |
| `authResponseSchema` | `{ user: User }` | Resposta de cadastro, login e `me` |
| `inviteStatusSchema` / `InviteStatus` | `'active' \| 'used' \| 'expired' \| 'revoked'` | |
| `createdInviteSchema` | `{ code, expiresAt: ISO datetime }` | `code` no formato `XXXX-XXXX-XXXX-XXXX` |
| `inviteListSchema` | `{ invites: { createdAt, expiresAt, status }[] }` | |
| `apiErrorCodeSchema` | enum dos códigos de [http-api.md](./http-api.md) | |
| `apiErrorSchema` / `ApiError` | `{ error, message, fields? }` | |

Uma senha inválida no cadastro produz `fields: ['password']`. Uma inválida no login produz o mesmo `invalid-input` do formato, e nunca `invalid-credentials`.

# Contrato da API: Jogo sem login e cadastro aberto

Mudanças em relação às features 004, 006, 007 e 009. Os formatos de resposta existentes não mudam. Os schemas ficam em `packages/shared` (respostas tolerantes, pedidos estritos).

## Sessão opcional

Usada por `GET /api/puzzles`, `GET /api/puzzles/:id` e `GET /api/library`:

| Cookie `session` | Comportamento |
|---|---|
| ausente | Visitante: `request.user = null`, a rota responde normalmente. |
| válido | Igual a hoje: usuário preenchido e cookie renovado quando for a hora. |
| presente e inválido (mal formado, expirado, encerrado) | `401 unauthenticated`, e a resposta apaga o cookie (`Set-Cookie` com expiração no passado). |

As rotas de progresso e `GET /api/auth/me` continuam exigindo sessão, mas, quando havia cookie e ele é inválido, o `401 unauthenticated` também apaga o cookie (sem cookie, o 401 vem sem `Set-Cookie`). `POST /api/auth/logout` não muda.

OpenAPI: `security: [{}, { session: [] }]`.

## `GET /api/puzzles?level=daily&date=YYYY-MM-DD` e `GET /api/puzzles/:id`

Iguais às features 006 e 007 (`{ puzzleId, puzzle, solution }`, com 404, 502 e 429), agora também sem sessão. A busca na fonte de um dia passado ainda não guardado conta no limite `PUZZLE_FETCH` por endereço (30 por hora), com ou sem sessão. A revalidação de puzzle e solução continua antes da entrega. A solução nunca vai a logs nem a respostas de erro.

## `GET /api/library`

- Com sessão: igual à feature 009.
- Sem sessão: `200 { items: LibraryItem[] }`, com os mesmos puzzles, a mesma ordem e o mesmo limite (366). Cada item vem com `status: "not_started"` e `elapsedMs`, `finishedMs`, `completedAt`, `bestMs` e `bestAt` nulos. Nenhum dado de usuário.

## `GET /api/auth/registration` (nova)

Sem sessão, sem limite de tentativas.

```json
200 { "open": false }
```

Cabeçalho `Cache-Control: no-store`. Schema em `shared`: `registrationStatusSchema = z.object({ open: z.boolean() })`.

## `POST /api/auth/register`

Pedido (estrito):

```json
{ "email": "pessoa@exemplo.com", "password": "8 a 128 caracteres", "inviteCode": "opcional, ignorado" }
```

`inviteCode` é aceito e ignorado só no lançamento A, para o site anterior (sai no B).

A ordem de avaliação importa:

| # | Condição | Resposta |
|---|---|---|
| 1 | Chave desligada | `403 { error: "registration-closed" }`. Não conta tentativa. |
| 2 | Limite por endereço atingido (10 por hora) | `429 too-many-attempts` com `Retry-After`. |
| 3 | Corpo inválido | `400 invalid-input` com `fields` (só `email`/`password`). |
| 4 | E-mail já existe | `409 registration-failed` (mensagem genérica). |
| 5 | Sucesso | `201 { user: { id, email } }` e cookie de sessão. |

Código de erro novo em `apiErrorCodeSchema`: `registration-closed`. `invalid-invite` e `invite-quota-reached` ficam marcados como obsoletos no lançamento A e saem no B.

## Removidas

`POST /api/invites` e `GET /api/invites` deixam de existir. Respondem o 404 padrão do Fastify, e a janela do site anterior mostra o erro genérico.

## Linha de comando do autor (`npm run cli -w @cruzadinha/api --` / `node apps/api/dist/cli.mjs`)

```text
Uso:
  users create --email <email>   cria uma conta (a senha é pedida sem eco ou lida da entrada padrão)
  puzzles collect                guarda o puzzle do dia (e o histórico que faltar)
```

| Caso | Saída | Código |
|---|---|---|
| Conta criada | `Conta criada: <email normalizado>` | 0 |
| E-mail já tem conta | `Já existe uma conta com esse e-mail.` Nada é gravado. | 1 |
| E-mail inválido, senha fora de 8 a 128, confirmação diferente, `--email` ausente ou argumento desconhecido (inclusive `--password`) | mensagem e uso | 2 |
| `invites ...` | `Comando desconhecido.` e uso | 2 |

A senha nunca aparece na saída, em erros nem em logs. O comando funciona com a chave ligada ou desligada e não conta tentativas.

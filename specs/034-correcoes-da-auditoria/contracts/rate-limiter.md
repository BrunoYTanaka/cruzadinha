# Contrato: limitador de tentativas

```ts
type Reservation =
  | { allowed: true; release(keys?: RateLimitKey[]): Promise<void> }
  | { allowed: false; retryAfterSeconds: number }

RateLimiter.reserve(rules: RateRule[], now: Date): Promise<Reservation>
```

Garantias:

1. A contagem e a inserção acontecem numa transação que segura uma trava consultiva por chave (`withKeyLocks`); chamadas com a mesma chave não se sobrepõem.
2. Se qualquer janela já tem `max` tentativas: não grava nada e devolve `allowed: false` com o maior `retryAfterSeconds`.
3. Se todas cabem: insere uma linha por chave; `release(keys)` apaga as linhas desta chamada das chaves dadas (todas, sem argumento).
4. Em N chamadas concorrentes para a mesma chave com limite `max`, exatamente `min(N, max)` recebem `allowed: true`.

Login (`auth.service.login`):

- `reserve([email, endereço])` antes de `findUserByEmail`/`verifyPassword`.
- Recusado → `too-many-attempts` sem consultar o usuário.
- Senha errada ou e-mail inexistente → mantém as linhas, `invalid-credentials`.
- Sucesso → `release([endereço])` e `clear(email)`; abre a sessão.

`check`, `record` e `clear` continuam existindo para `register`, `settings` e `puzzles`.

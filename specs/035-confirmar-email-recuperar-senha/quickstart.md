# Quickstart: validar confirmação de e-mail e recuperação de senha

Contratos em [contracts/api.md](contracts/api.md) e [contracts/ui-contracts.md](contracts/ui-contracts.md); tabelas em [data-model.md](data-model.md).

## Pré-requisitos

- Node 24, Docker (Postgres), `cp .env.example .env`, `docker compose up -d db`.
- No `.env` de desenvolvimento: `REGISTRATION_ENABLED=true`, `APP_BASE_URL=http://localhost:5173`, `EMAIL_RESEND_INTERVAL_SECONDS=30`. Sem `RESEND_API_KEY` o link sai no log da API (`LogSender`).

## Testes automáticos (sem rede)

```sh
npm run typecheck && npm test && npm run lint && npm run check:ids
npm run test:int        # Postgres real: pendência, token de uso único, sessões encerradas, trava
npm run test:e2e -w @cruzadinha/web   # API simulada no navegador; cobre as quatro telas
```

## Roteiro manual (API + site em desenvolvimento)

1. `npm run dev -w @cruzadinha/api` e `npm run dev -w @cruzadinha/web`.
2. **Cadastro**: em `/cadastro`, informar `ana@example.com` (só o e-mail). Esperado: tela "enviamos um link", link no log da API, nenhuma linha em `users`, uma em `pending_registrations`, login ainda falha.
3. **Reenvio**: o botão fica desativado com a contagem (30 s); depois pedir de novo; o link antigo passa a dar "Este link não vale mais".
4. **Confirmação**: abrir o link mais novo. Esperado: "Escolha sua senha" e a barra de endereço perde o `#token=`; a API ainda não foi chamada. Informar a senha duas vezes: "Conta criada", a pendência some, a conta existe, o cabeçalho segue "Visitante"; entrar com a senha escolhida funciona. Abrir o link de novo → "Este link não vale mais".
5. **Cadastro de e-mail existente**: cadastrar `ana@example.com` de novo. Esperado: mesma tela e mesma resposta de antes; log mostra o aviso ao dono; nenhuma pendência nova.
6. **Recuperação**: com uma sessão aberta em outro navegador, ir a `/esqueci-a-senha`, pedir para `ana@example.com` e para `nao-existe@example.com` (mesma mensagem nos dois; só o primeiro gera link no log). Abrir o link, definir nova senha. Esperado: a senha antiga não vale, a nova vale, a outra sessão responde `401` em `GET /api/auth/me`, o link não abre duas vezes.
7. **Cota** (só no teste de integração `email-block.int.test.ts`, onde o `EmailSender` falso devolve `quota-daily`; uma chave falsa no `.env` não reproduz isso). Esperado: a tentativa que descobre a cota já respondeu `202`; depois dela há uma linha em `email_send_block`, a requisição seguinte dá `503 email-unavailable` sem chamar o sender, e o site mostra só o aviso genérico mantendo os campos.
8. **Limpeza**: `npm run cli -w @cruzadinha/api -- auth cleanup` imprime as contagens (zero em base nova).

## Critérios de pronto

- Todos os critérios da issue #82 e os FR-001 a FR-025 cobertos por teste ou por este roteiro.
- axe sem violações nas quatro telas nos dois temas; uma `h1` por tela.
- Lançamento A (shared + API, `REGISTRATION_ENABLED=false`), depois B (site), depois abrir o cadastro; passos de Resend e DNS em `docs/deploy.md`.

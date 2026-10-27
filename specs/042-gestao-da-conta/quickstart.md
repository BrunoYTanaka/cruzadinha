# Quickstart: validar a gestão da conta

Contratos: [contracts/api.md](contracts/api.md) e [contracts/ui-contracts.md](contracts/ui-contracts.md). Dados: [data-model.md](data-model.md).

## Pré-requisitos

- Node 24 (`nvm use`), `npm ci`, Docker.
- `cp .env.example .env`; sem `RESEND_API_KEY` o link sai no log da API (desenvolvimento).
- `docker compose up -d postgres`, `npm run db:migrate -w @cruzadinha/api`, `npm run db:seed -w @cruzadinha/api`.
- `npm run dev -w @cruzadinha/api` e `npm run dev -w @cruzadinha/web`.

## Portões automáticos

```sh
npm run check:ids:remote   # DDE-006/ERD-006 e specs/042 sem colisão
npm run lint               # inclui check:deps com as regras novas de identity/account
npm run typecheck
npm test                   # serviços com Clock e repositórios em memória, formulários, diálogo
npm run test:int           # rotas novas contra Postgres real (Testcontainers)
npm run test:e2e -w @cruzadinha/web   # banco separado, ver CLAUDE.md
```

Os testes de integração devem cobrir, um cenário por item: cada critério de aceite das histórias 1 a 4, o limite `PASSWORD_CONFIRM` (6.ª tentativa `429`), dois pedidos de troca seguidos (só o último vale), endereço ocupado depois do pedido (`invalid-token`, e-mail não muda), exclusão sem sobra (contagem zero de linhas da conta em todas as tabelas) e recadastro do mesmo e-mail. `conventions.int.test.ts` confere o trigger de `email_change_requests`.

## Roteiro manual

1. **Trocar senha (US1)**: entrar com a conta do seed em dois navegadores (A e B). Em A, `/conta` → Trocar senha com a senha atual e uma nova. Esperado: A segue logado; em B a próxima ação mostra o aviso de sessão encerrada; login com a senha antiga falha, com a nova entra. Senha atual errada cinco vezes, depois a sexta: "Muitas tentativas".
2. **Sair de todos (US2)**: A e B logados, B com uma cruzada aberta. Em A, "Sair dos outros aparelhos". Em B, digitar letras: o jogo continua como visitante com o aviso não bloqueante.
3. **Trocar e-mail (US3)**: em A, pedir a troca para um endereço novo. Esperado: `202`, dois e-mails no log (link para o novo, aviso para o atual sem o novo endereço). Login com o novo ainda falha. Abrir o link num navegador sem sessão: "E-mail trocado."; agora entra com o novo e não com o antigo. Abrir o mesmo link de novo: "Link inválido ou vencido.". Pedir duas vezes e abrir o primeiro link: inválido. Pedir para o e-mail de outra conta: mesma mensagem na tela, só o aviso sai no log.
4. **Excluir (US4)**: com progresso e ajustes na conta e uma cruzada baixada para jogar sem rede, e um progresso de visitante guardado antes, `/conta` → Excluir conta → senha. Esperado: tela de visitante com "Sua conta foi excluída."; DevTools → IndexedDB `cruzadinha-offline` sem dados da conta e `cruzadinha-visitante` intacto; login com o e-mail antigo dá a mensagem genérica; cadastro do mesmo e-mail é aceito (com `REGISTRATION_ENABLED=true`).
5. **Sem rede**: DevTools offline em `/conta`: "Esta tela precisa de conexão.".
6. **Acessibilidade**: percorrer `/conta` e o diálogo só com teclado; leitor de tela anuncia sucesso e erro; temas claro e escuro; largura de 360 px sem deslocamento ao enviar.

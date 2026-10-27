# Research: Gestão da conta

Nenhum item do contexto técnico ficou como NEEDS CLARIFICATION: a spec foi esclarecida (sessão de 2026-10-27) e tudo o que a feature precisa já existe nas features 035 (e-mail, tokens, limites) e 041 (dados do aparelho). As decisões abaixo dizem como reutilizar isso.

Documentação consultada via Context7: Drizzle ORM (`/drizzle-team/drizzle-orm-docs`), `insert ... onConflictDoUpdate({ target, set })` com `sql.raw('excluded.<coluna>')` para o pedido de troca único por conta. Fastify, Zod, TanStack Query e React Router entram só pelos padrões que o código já usa (rotas com `schema`, `safeParse` no handler, `useMutation`), sem API nova dessas bibliotecas.

## D1. Onde fica o código na API

- **Decision**: nova parte `apps/api/src/modules/identity/account/` (rotas, esquemas, serviço, repositório do pedido de troca de e-mail), registrada por `identity.routes.ts`. Ela usa `sessions/` (encerrar sessões, sessão obrigatória) e `recovery/` (`revokeOpenResetTokens`); nenhuma das outras três a importa. Regras novas em `.dependency-cruiser.cjs`.
- **Rationale**: as três partes atuais têm papéis fechados (entrar, cadastrar, recuperar); gestão de quem já está logado é um quarto papel. Mantém rota → serviço → repositório (princípio III).
- **Alternatives considered**: colocar tudo em `sessions/` (misturaria e-mail e tokens com sessão e exigiria que `sessions` importasse `recovery`, hoje proibido); um módulo `modules/account` fora de `identity` (teria de importar internos de `identity`, que só expõe `index.ts`).

## D2. Rotas sob `/api/auth/*`

- **Decision**: `POST /api/auth/change-password`, `POST /api/auth/logout-others`, `POST /api/auth/change-email`, `POST /api/auth/confirm-email-change`, `POST /api/auth/delete-account`. Todas `POST` com corpo JSON estrito.
- **Rationale**: o proxy e o site já tratam `/api/auth/*`; `POST` com corpo evita `DELETE` com corpo (a senha precisa ir no corpo, nunca na URL).
- **Alternatives considered**: `DELETE /api/auth/account` (corpo em `DELETE` é mal suportado por proxies); `PATCH /api/auth/me` (mistura três ações com regras diferentes numa rota só).

## D3. Senha atual errada: código e limite

- **Decision**: novo código `wrong-password` (`400`, "A senha atual não confere."). Limite novo `PASSWORD_CONFIRM` por usuário (`keyType: 'USER'`, 5 em 15 min, os mesmos números de `loginEmail`), um só balde para trocar senha, trocar e-mail e excluir. Reserva antes do argon2 (`rateLimiter.reserve`), como o login; acerto devolve a reserva e limpa o balde.
- **Rationale**: `401` faria o site tratar a resposta como sessão encerrada (handler global da feature 018) e deslogaria a pessoa por errar a senha; `invalid-credentials` é a mensagem do login. Um balde por usuário impede alternar entre ações para multiplicar tentativas e não bloqueia o login da própria pessoa (FR-012, SC-005).
- **Alternatives considered**: reutilizar `LOGIN`/`EMAIL` (um ladrão de sessão bloquearia o login do dono); `403` (já significa proxy e cadastro fechado).

## D4. Pedido de troca de e-mail

- **Decision**: tabela `email_change_requests` com `user_id` único (um pedido por conta, o novo substitui o anterior por upsert e troca o hash), `new_email`, `token_hash` único, `expires_at` (60 min). O pedido é apagado ao ser usado; vencidos saem no `auth cleanup`. Token de 43 caracteres base64url (`generateSessionToken`), guardado só como SHA-256.
- **Rationale**: o upsert numa chave única resolve "só o link mais recente vale" e dois pedidos simultâneos sem trava extra; apagar ao usar dispensa `used_at`. A exclusão da conta o leva por `ON DELETE CASCADE`.
- **Alternatives considered**: reaproveitar `password_reset_tokens` com uma coluna de tipo (mistura dois tokens com regras diferentes e quebraria o índice parcial de um token aberto por usuário); guardar o novo e-mail em `users` (`pending_email`) (sujaria a tabela principal e não guarda validade nem hash).

## D5. Envio e limites da troca de e-mail

- **Decision**: ordem igual à da feature 035: sessão (`401`), limite por endereço `CHANGE_EMAIL` (`admitAddress`, 10/h), corpo (`400`), `email.admit()` (`503 email-unavailable`), senha atual (`PASSWORD_CONFIRM`, `400 wrong-password`), mesmo e-mail atual (`400 invalid-input`, `fields: ["newEmail"]`), intervalo por usuário `CHANGE_EMAIL`/`USER` (`enterIntervalGate`, `EMAIL_RESEND_INTERVAL_SECONDS`), trabalho, `202 { retryAfter }`, envio depois da resposta (`email.sendAfterResponse`). Com o novo endereço livre: grava o pedido e envia o link ao novo endereço. Com o endereço de outra conta: não grava pedido nem envia link. Nos dois casos envia o aviso ao endereço atual. Os dois e-mails passam pelo teto diário (reserva por envio).
- **Rationale**: FR-005/FR-007; a resposta e o tempo da resposta são iguais com ou sem conta no novo endereço, porque os envios saem depois do `202`. O aviso ao dono sai mesmo quando não há link, porque o pedido existiu.
- **Alternatives considered**: intervalo por e-mail de destino (uma pessoa logada poderia disparar avisos em série trocando o destino); mandar só o link (FR-006 pede o aviso).

## D6. Confirmação da troca

- **Decision**: `confirm-email-change` não exige sessão. Limite `VERIFY_TOKEN` por endereço (o mesmo da confirmação de cadastro). Numa transação: apaga o pedido pelo hash onde `expires_at > now` e devolve a linha; sem linha → `400 invalid-token`. Atualiza `users.email`; violação de `users_email_unique` (endereço ocupado depois do pedido) → desfaz o `UPDATE`, mantém o pedido apagado e responde `400 invalid-token`. Não encerra sessões. Sem cookie novo.
- **Rationale**: o link é a prova de posse (spec, edge case "link aberto sem sessão"); o índice único é a checagem final de que o endereço continua livre (FR-005) sem corrida. Uma pendência de cadastro para o mesmo endereço já falha na confirmação dela ("e-mail já com conta", feature 035).
- **Alternatives considered**: checar com `SELECT` antes do `UPDATE` (corrida entre os dois); pedir senha ou clique (descartado na clarificação).

## D7. Sair de todos os aparelhos e troca de senha

- **Decision**: `endOtherSessionsForUser(db, userId, keepTokenHash, now)` no repositório de `sessions/` (mesmo `UPDATE ... SET ended_at` de `endAllSessionsForUser`, com `token_hash <> keep`). A sessão mantida é a do cookie da requisição. Troca de senha numa transação: `updatePasswordHash`, `endOtherSessionsForUser`, `revokeOpenResetTokens`. Trocar a senha não mexe em pedido de troca de e-mail (edge case da spec).
- **Rationale**: FR-002, FR-008; outros aparelhos recebem `401` na próxima ação e já viram visitantes (FR-013) pelo tratamento existente.
- **Alternatives considered**: girar o token da sessão atual (troca de cookie sem ganho: a sessão atual é a que provou a senha).

## D8. Exclusão

- **Decision**: depois da senha, `DELETE FROM users WHERE user_id = $1`; o `ON DELETE CASCADE` já existente leva `sessions`, `progress`, `user_settings`, `password_reset_tokens` e o novo `email_change_requests`. Também apaga as tentativas de limite com `key_type = 'USER'` e `key_value = userId`. A resposta limpa o cookie (`clearSessionCookie`). Tentativas com chave de e-mail ou endereço ficam até o `auth cleanup` (2 dias): são contadores contra abuso e apagá-las zeraria o intervalo de cadastro do mesmo endereço.
- **Rationale**: FR-009, FR-010, SC-004; nenhuma migração de chave estrangeira é necessária (todas já são `cascade`). O e-mail fica livre para novo cadastro pelo próprio índice único.
- **Alternatives considered**: exclusão lógica (`deleted_at`) (contraria "definitiva" e FR-010); período de arrependimento (fora de escopo pela spec).

## D9. Site

- **Decision**: página `/conta` (`pages/account/AccountPage.tsx`) e página `/confirmar-email` (`pages/confirm-email/ConfirmEmailPage.tsx`). Formulários e diálogo em `features/account/components/` (`ChangePasswordForm`, `ChangeEmailForm`, `LogoutOthersButton`, `DeleteAccountDialog`, `ConfirmEmailChange`), com chamadas novas em `shared/services/api/`. O e-mail do cabeçalho vira um link para `/conta`. A limpeza do aparelho na exclusão (`clearAccountData` de `features/offline`) é passada pela página como `onDeleted`, porque `account` só importa `session`. A saída depois da exclusão reaproveita o mesmo fim de `useLogoutMutation` (limpar `last-user`, cache e sessão, ir para `/`), extraído em `features/session` como `endLocalSession`.
- **Rationale**: respeita `app → pages → features → shared/domain` e "account importa só session" sem mudar a ordem das features. O token vai no fragmento e é lido uma vez com o `token-fragment` existente. `/confirmar-email` entra no `_headers` com `Referrer-Policy: no-referrer` e em `ACCOUNT_PATHS`.
- **Alternatives considered**: deixar `account` importar `offline` (mudaria a regra de dependência para um único uso); um menu suspenso no cabeçalho (componente novo sem necessidade: um link basta para FR-001).

## D10. Compatibilidade

- **Decision**: só rotas, códigos de erro e tabela novos. `apiErrorCodeSchema` ganha `wrong-password`. O site anterior nunca chama as rotas novas, então nunca recebe o código. A API anterior não tem as rotas: o site novo publicado antes dela recebe `404` e mostra "Esta ação não está disponível agora." na página da conta.
- **Rationale**: FR-015 e `docs/versionamento.md` (duas versões para remover algo; aqui nada é removido).

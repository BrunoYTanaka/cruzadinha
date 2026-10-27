# Implementation Plan: Gestão da conta

**Branch**: `feat/042-gestao-da-conta` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/042-gestao-da-conta/spec.md` (issue #90)

## Summary

Quem tem conta ganha a página `/conta` com quatro ações: trocar a senha (senha atual; encerra as outras sessões e revoga links de recuperação), sair de todos os outros aparelhos, trocar o e-mail (senha atual; link de uso único de 60 min ao novo endereço, aviso ao antigo, a troca só vale ao abrir o link em `/confirmar-email` e, ao concluir, revoga os links de recuperação abertos; um pedido que cai em endereço já usado descarta o pedido anterior da conta; um pedido dentro do intervalo mínimo não muda nada) e excluir a conta (senha atual; apaga tudo por cascata e limpa os dados da conta no aparelho). A API ganha a parte `modules/identity/account/` com cinco rotas sob `/api/auth/*`, uma tabela `email_change_requests`, duas ações de limite (`PASSWORD_CONFIRM`, `CHANGE_EMAIL`) e um código de erro `wrong-password`; tudo o mais (tokens, envio depois da resposta, intervalo, teto diário, `clearAccountData`, aviso de sessão encerrada) é reaproveitado das features 035 e 041. Decisões em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6 strict, Node.js 24

**Primary Dependencies**: Fastify 5, Drizzle ORM + postgres.js, Zod, argon2; React 19, React Router, TanStack Query, Vite 8 (nenhuma dependência nova)

**Storage**: Postgres 17 (tabela nova `email_change_requests`, `CHECK` de `rate_limit_attempts` atualizado); no site, IndexedDB `cruzadinha-offline` só para apagar dados da conta (feature 041)

**Testing**: Vitest 5 (unitário, jsdom + Testing Library + `vitest-axe`), integração com Testcontainers (`npm run test:int`), Playwright para um caminho ponta a ponta (trocar senha e excluir)

**Target Platform**: API em Render (Docker), site estático em Cloudflare Pages com Function de proxy

**Project Type**: web (monorepo `apps/api`, `apps/web`, `packages/shared`)

**Performance Goals**: cada ação responde no tempo de um argon2 mais poucas consultas; sem meta nova

**Constraints**: resposta de `change-email` igual com ou sem outra conta no destino (envios depois da resposta); senha errada nunca `401`; nenhum deslocamento de layout ao enviar; compatível com a versão anterior do site e da API

**Scale/Scope**: poucas contas; 5 rotas, 1 tabela, 2 páginas, 5 componentes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
| --- | --- |
| I. TypeScript estrito, schemas em `shared` | Pedidos novos e `wrong-password` em `packages/shared/src/auth/schema.ts` e `api-error.ts`; corpos entram como `unknown` e passam por `safeParse`. ✅ |
| II. Qualidade automatizada | Sem mudança nos portões; `check:deps` ganha as regras de `identity/account`. ✅ |
| III. Rota → serviço → repositório | `account.routes.ts` (HTTP, cookie), `account.service.ts` (regras com `Clock`), `email-change.repository.ts` e funções novas em `sessions.repository.ts`/`users.repository.ts` (SQL). ✅ |
| IV. Adaptadores de fonte | Não toca fontes. ✅ |
| V. Lógica de jogo pura | Não toca o tabuleiro; estado de servidor por TanStack Query (`useMutation`). ✅ |
| VI. Segurança e privacidade | argon2id; tokens só como SHA-256; cookie inalterado; limite de tentativas na senha atual (FR-012); mensagens genéricas e resposta igual para e-mail de outra conta; aviso ao antigo sem o novo endereço; token no fragmento e `no-referrer`; nenhum e-mail em log. A exclusão remove tudo da conta (cascata). ✅ |
| VII. Testes sem internet | E-mail por `EmailSender` falso; integração com Postgres em container cobre as rotas novas. ✅ |
| VIII. Conteúdo de terceiros | Não muda; `/conta` e `/confirmar-email` herdam `noindex`. ✅ |
| IX. Migração | Uma migração Drizzle gerada (`account_management`) com a tabela, o trigger `set_updated_at` e o `CHECK` novo; DDE-006 e ERD-006. ✅ |
| Fluxo: Context7 | Drizzle `onConflictDoUpdate` confirmado (research). ✅ |

Sem violações; Complexity Tracking vazio.

**Re-check pós-design**: o design (data-model, contratos) mantém todos os itens acima. Ponto de atenção do gate anterior, FR-011 [LOW CONFIDENCE]: o plano segue a clarificação (só o aparelho da exclusão apaga na hora; outros seguem a regra de sessão expirada da 041), que não exige nada novo no servidor. ✅

## Project Structure

### Documentation (this feature)

```text
specs/042-gestao-da-conta/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui-contracts.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/src/
├── auth/schema.ts                      # pedidos novos (change-password, change-email, confirm, delete)
└── api-error.ts                        # 'wrong-password'

apps/api/
├── drizzle/NNNN_account_management.sql # tabela, trigger, CHECK de rate_limit_attempts
└── src/
    ├── platform/db/schema.ts           # emailChangeRequests, rateLimitActions
    ├── platform/rate-limit/limits.ts   # passwordConfirm, changeEmail
    ├── platform/email/templates.ts     # emailChangeEmail, emailChangeNotice (+ index.ts)
    └── modules/identity/
        ├── account/                    # novo: routes, schemas, service, email-change.repository
        ├── sessions/sessions.repository.ts  # endOtherSessionsForUser
        ├── users.repository.ts         # updateEmail, deleteUser
        ├── cleanup.repository.ts       # pedidos vencidos
        └── identity.routes.ts          # registra account

apps/web/
├── public/_headers                     # /confirmar-email no-referrer
└── src/
    ├── app/router.tsx, app/AppLayout.tsx   # rotas /conta e /confirmar-email; e-mail vira link
    ├── pages/account/AccountPage.tsx
    ├── pages/confirm-email/ConfirmEmailPage.tsx
    ├── features/account/components/{ChangePasswordForm,ChangeEmailForm,LogoutOthersButton,DeleteAccountDialog,ConfirmEmailChange}/
    ├── features/session/                # endLocalSession (extraído de useLogoutMutation)
    └── shared/services/api/             # chamadas novas, uma pasta por arquivo

.dependency-cruiser.cjs                 # account usa sessions e recovery; ninguém importa account
docs/data-definitions/DDE-006-gestao-da-conta.md
docs/entity-relationship-diagrams/ERD-006-gestao-da-conta.md
CLAUDE.md                               # regras que uma mudança nova pode quebrar
```

**Structure Decision**: monorepo existente. API na nova parte `modules/identity/account/` (research D1); site com duas páginas que compõem `features/account` e passam `clearAccountData` de `features/offline` como `onDeleted` (research D9), sem mudar a ordem das features.

## Complexity Tracking

Sem violações a justificar.

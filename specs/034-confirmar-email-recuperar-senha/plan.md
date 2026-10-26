# Implementation Plan: Confirmar e-mail no cadastro e recuperar senha

**Branch**: `feat/034-confirmar-email-recuperar-senha` (trabalho na branch `feature-confirmar-e-mail-no-cadastro-e-recuperar`) | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/034-confirmar-email-recuperar-senha/spec.md` (issue #82)

## Summary

O cadastro deixa de criar a conta na hora: grava uma pendência e envia um link; só a confirmação cria o usuário (sem sessão). Nasce a recuperação de senha por link de uso único, que encerra todas as sessões. O envio passa por uma interface `EmailSender` (Resend por `fetch`, log em desenvolvimento, fakes nos testes). A proteção contra abuso reutiliza `rate_limit_attempts` (por endereço, por e-mail, teto global diário com reserva para a recuperação), e a cota esgotada do Resend vira uma trava persistida (`email_send_block`) que faz as rotas responderem `503 email-unavailable`. Respostas iguais com ou sem conta, com o envio feito depois da resposta. O site ganha quatro telas; o lançamento é em duas partes (A: `shared` + API com cadastro fechado; B: site). Detalhes em [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/) e [quickstart.md](quickstart.md).

## Technical Context

**Language/Version**: TypeScript 6 strict, Node 24

**Primary Dependencies**: Fastify 5, Drizzle + postgres.js, Zod, argon2 (já em uso); web: React 19, React Router 7, TanStack Query. Nenhuma dependência nova (Resend por `fetch`).

**Storage**: Postgres 17. Migrações `0008` (`pending_registrations`, `password_reset_tokens`, `email_send_block` e `CHECK`s alargados em `rate_limit_attempts`) e `0009` (a pendência sem senha nem `last_sent_at`, ação `RESET_PASSWORD` e índice único parcial de um token aberto por usuário).

**Testing**: Vitest (unitários, sem rede; `EmailSender` falso), `*.int.test.ts` com Testcontainers (fluxos completos, uso único, corrida, trava), Playwright com API simulada no navegador, `vitest-axe` e e2e axe nas quatro telas.

**Target Platform**: API no Render (Docker), site no Cloudflare Pages; Resend externo.

**Project Type**: web-service + SPA em monorepo npm workspaces (`shared`, `api`, `web`).

**Performance Goals**: resposta de cadastro, reenvio e recuperação sem esperar o provedor; diferença de tempo entre "existe" e "não existe" sem valor prático (SC-004).

**Constraints**: custo zero (Resend grátis: 100/dia, 3.000/mês; teto interno 90/dia); sem captcha; erros genéricos; token nunca em log, URL persistida nem resposta; `users` não muda; site anterior continua funcionando (cadastro fechado até o lançamento B).

**Scale/Scope**: uso de portfólio, dezenas de contas; 4 rotas novas, 1 rota alterada, 1 comando de CLI, 4 telas.

## Constitution Check

*GATE: passa antes da pesquisa e continua passando após o desenho.*

| Princípio | Avaliação |
| --- | --- |
| I. TypeScript estrito, `shared` | Schemas dos pedidos, códigos de erro e `retryAfter` em `shared`; sem `any`; resposta do Resend entra como `unknown` e passa por Zod. ✔ |
| II. Qualidade automatizada | Mesmos hooks e CI; sem exceções. ✔ |
| III. Camadas | Novo módulo `modules/email` (sender, templates, `email.service` com a regra de cota/trava, repositório da trava); `auth` ganha serviço de verificação e de recuperação com repositórios próprios; rotas sem regra de negócio, SQL só nos repositórios. ✔ |
| IV. Adaptadores externos | `EmailSender` isola o Resend atrás de interface (mesmo espírito; o princípio fala de puzzles). Teste de contrato do `ResendSender` com respostas de erro salvas como fixtures sanitizadas. ✔ |
| V. Lógica pura / TanStack Query | Regras de decisão (cota, intervalo, validade) como funções puras testadas; telas usam `useMutation`. ✔ |
| VI. Segurança e privacidade | argon2id, tokens só como SHA-256, respostas iguais, limites persistidos, mensagens genéricas, sem segredo em log/fixture; `RESEND_API_KEY` só no cofre do Render. A chave `REGISTRATION_ENABLED` segue recusando cadastro e reenvio de confirmação; a recuperação atende contas existentes. ✔ |
| VII. Testes sem internet | `EmailSender` injetável; nenhum teste chama o Resend. Fluxos de cadastro e login com Postgres real. ✔ |
| VIII. Conteúdo de terceiros | Sem relação. ✔ |
| IX. Migração | Só migração Drizzle versionada, com trigger `set_updated_at`. ✔ |
| Context7 | Resend consultado (`/websites/resend`); Fastify, Drizzle e React Router já usados no repositório, com a API conferida no momento de cada tarefa. ✔ |

Sem violações: nada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/034-confirmar-email-recuperar-senha/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui-contracts.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/src/
├── api-error.ts                       # + invalid-token, email-unavailable, retryAfter
└── auth/schema.ts                     # + verify/resend/forgot/reset requests, sendResponse

apps/api/
├── drizzle/0008_email_verification_and_recovery.sql, 0009_pending_without_password.sql
└── src/
    ├── config.ts                      # + RESEND_API_KEY, MAIL_FROM, APP_BASE_URL, EMAIL_*
    ├── db/schema.ts                   # + 3 tabelas, CHECKs alargados
    ├── http/errors.ts                 # + mensagens, retryAfter no 429/503
    ├── modules/email/                 # sender (Resend/Log), templates, email.service, send-block.repository
    ├── modules/auth/
    │   ├── auth.routes.ts / auth.schemas.ts   # rota alterada + 4 novas
    │   ├── registration.service.ts / pending.repository.ts
    │   ├── recovery.service.ts / reset-tokens.repository.ts
    │   └── sessions.repository.ts     # + encerrar todas as sessões do usuário
    ├── modules/rate-limit/limits.ts   # + ações e chaves novas
    ├── cli/run-cli.ts                 # + auth cleanup
    └── app.ts                         # injeta EmailSender

apps/web/src/
├── api/auth.ts                        # + chamadas novas
├── app/router.tsx                     # + 3 rotas
└── features/auth/                     # RegisterPage alterada; VerifyEmailPage, ForgotPasswordPage,
                                       # ResetPasswordPage, useCountdown, token-fragment

apps/web/public/_headers               # + Referrer-Policy: no-referrer nas rotas dos links
apps/web/e2e/                          # confirmar-email.spec.ts, recuperar-senha.spec.ts

docs/  data-definitions/DDE-005-*.md, entity-relationship-diagrams/ERD-005-*.md, deploy.md
.github/workflows/collect.yml          # + passo auth cleanup
render.yaml, .env.example              # + variáveis (sync: false)
```

**Structure Decision**: segue a divisão existente (`shared`/`api`/`web`) e o padrão rota → serviço → repositório por módulo; o que é de e-mail fica em `modules/email` para ser reutilizado por qualquer feature futura, e os fluxos de conta ficam em `modules/auth`.

## Release and compatibility

- **Release A** (`shared` + API, `feat(api)`): rotas novas e `register` alterada, com `REGISTRATION_ENABLED=false` em produção; o site antigo nunca chama as rotas novas e a recusa `403` do cadastro não muda. Colunas e tabelas são só aditivas.
- **Passos do autor entre A e B**: criar a conta no Resend, verificar o domínio (SPF, DKIM, DMARC na Cloudflare), definir `RESEND_API_KEY`, `MAIL_FROM` e `APP_BASE_URL` no Render e reiniciar.
- **Release B** (`feat(web)`): as quatro telas. Só depois disso `REGISTRATION_ENABLED=true`.
- Remover algo (nada é removido nesta feature) exigiria dois lançamentos; o `409 registration-failed` do cadastro deixa de ser emitido, mas o código de erro continua no enum.

## Complexity Tracking

Sem violações a justificar.

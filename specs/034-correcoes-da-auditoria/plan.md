# Implementation Plan: Correções dos achados da auditoria

**Branch**: `fix/corrigir-achados-da-auditoria` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/034-correcoes-da-auditoria/spec.md`

## Summary

Oito correções na API, sem mudança visível no site. (1) O limite de login passa a **reservar** a tentativa antes de verificar a senha: insere a linha, conta, e devolve a linha se estourou. (2) Em produção o servidor se recusa a iniciar sem `PROXY_SECRET`, com uma saída explícita só para o `docker compose` local. (3) `puzzles collect` apaga sessões mortas depois de coletar. (4) Os testes da sandbox do Clube já existem; só o teste da corrida é novo. (5) Migração `0008` remove `invites` e `INVITE_CREATE`; o campo `inviteCode` sai de `shared`. (6) O salvamento de progresso lê só a grade. (7) `xml.ts` e `clue-text.ts` vão para `sources/common/`. (8) O adaptador Clube lê o corpo como stream e para em `maxBytes`.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24

**Primary Dependencies**: Fastify 5, Drizzle + postgres.js, Zod (todos já no projeto); nenhuma nova.

**Storage**: Postgres 17. Uma migração (`0008`): `DROP TABLE invites`, restrição `rate_limit_attempts_action_check` sem `INVITE_CREATE`.

**Testing**: Vitest 5 (unitários, sem rede nem banco); testes de integração `*.int.test.ts` com Testcontainers (corrida do login, limpeza de sessões, migração).

**Target Platform**: API em Docker (Render, plano gratuito) e CLI `puzzles collect` no GitHub Actions.

**Project Type**: monorepo web; esta feature toca `apps/api` e `packages/shared` (mais `apps/web/e2e/support.ts`, um `TRUNCATE`).

**Performance Goals**: login sob rajada faz no máximo `max` verificações argon2 por e-mail e janela.

**Constraints**: banco gratuito de 0,5 GB; resposta de login idêntica para e-mail existente e inexistente; compatível com a versão anterior do site (docs/versionamento.md, seção 8).

**Scale/Scope**: 5 módulos de API tocados, 1 migração, 1 arquivo de configuração, 1 `docker-compose.yml`, DDE-001/ERD-001, README/deploy.

## Constitution Check

*GATE: passa antes da Fase 0 e depois da Fase 1.*

| Princípio | Resultado |
|-----------|-----------|
| I. TypeScript estrito | Passa. Sem `any`; a grade lida do `jsonb` entra como `unknown` e passa pelo schema de `shared`. |
| II. Qualidade automatizada | Passa. Nenhum hook ou CI muda; testes novos rodam nos jobs existentes. |
| III. Camadas | Passa. A reserva fica em `rate-limit.service`/repositório; a limpeza de sessões em `auth.service` → `sessions.repository`; SQL só em repositórios. |
| IV. Adaptadores | Melhora. Hoje `clube/` importa de `cruzadaonline/`; o código comum sai para `sources/common/`. |
| V. Lógica de jogo | N/A. |
| VI. Segurança | Melhora. Fecha a corrida do limite e o "falha aberto" do `PROXY_SECRET`. Resposta de login segue genérica; nenhum segredo em log. |
| VII. Testes | Passa. Corrida e migração com Postgres real em container. |
| VIII. Conteúdo de terceiros | N/A. |
| IX. Migração | Passa. `0008` gerada com `db:generate --custom`, sem alterar o banco à mão. |
| Context7 | Consultado para Drizzle (`delete().where(or/and/lt/isNotNull)`, `sql` em seleção parcial); ver research.md. |

Sem violações; Complexity Tracking vazio.

Fluxo: o cabeçalho de `CLAUDE.md` manda tratar correção como `fix/` sem ciclo completo. Aqui o ciclo foi pedido explicitamente e a migração (item 5) o justifica. Cada item com comportamento começa por teste que falha.

## Project Structure

### Documentation (this feature)

```text
specs/034-correcoes-da-auditoria/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── rate-limiter.md
│   └── config-and-cli.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/api/
├── drizzle/0008_remove_invites.sql          # nova (custom)
├── src/
│   ├── config.ts (+ .test.ts)               # PROXY_SECRET em produção
│   ├── server.ts                            # pede a exigência
│   ├── db/schema.ts                         # sem invites e INVITE_CREATE
│   ├── cli/run-cli.ts                       # limpeza após a coleta
│   ├── modules/rate-limit/                  # reserve + repositório
│   ├── modules/auth/                        # login reserva; purgeStaleSessions
│   ├── modules/progress/progress.service.ts # só a grade
│   ├── modules/puzzles/puzzles.repository.ts# findPuzzleGridById
│   ├── sources/common/{xml,clue-text}.ts    # movidos de cruzadaonline/
│   ├── sources/clube/clube.ts               # leitura em stream
│   └── test/*.int.test.ts                   # login-race, sessions-cleanup, conventions, seed
packages/shared/src/auth/schema.ts           # sem inviteCode
apps/web/e2e/support.ts                      # TRUNCATE sem invites
docker-compose.yml, .env.example, CLAUDE.md, docs/ (DDE-001, ERD-001, design.md, deploy.md)
```

**Structure Decision**: estrutura de camadas existente; só `sources/common/` é pasta nova.

## Ordem de lançamento (item 5)

Um lançamento só da API e do `shared` (`fix`: patch). O §8 de `docs/versionamento.md` pede dois lançamentos para remover: o primeiro (parar de usar) foi a feature 013; este é o segundo, permitido porque nenhuma versão do site no ar envia `inviteCode` nem usa `/api/invites`. Antes de mesclar, confirmar no `GET /version.json` do site (endereço em `docs/deploy.md`) que a versão no ar é posterior à 013. `registerRequestSchema` é `z.strictObject`: depois da remoção, um cadastro com `inviteCode` dá 400. O risco fica restrito a abas de antes da 013 e é aceito (research.md R6). Antes do lançamento, conferir no painel do Render que `PROXY_SECRET` está preenchido, senão a API não sobe (história 2). A migração é de ida: reverter exige recriar a tabela (vazia).

## Complexity Tracking

Vazio.

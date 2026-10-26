# Implementation Plan: Itens da auditoria do repositório

**Branch**: `chore/itens-da-auditoria-do-reposit-rio` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/038-itens-da-auditoria/spec.md`

## Summary

Quatro correções pequenas, sem esquema novo: (1) trocar `check` + `record` por `rateLimiter.reserve` nas buscas de fontes e nos outros limites por endereço que ainda usam o par (cadastro, configurações); (2) `npm audit fix` para `fastify` e `fast-uri`; (3) o serviço de puzzles ganha um gancho opcional de erro, que a CLI liga a uma linha em `stderr` com `describeError`; (4) `collect.yml` guarda a saída da coleta e, em caso de falha, abre uma issue por fonte que apareça em linhas `Falhou em`, sem duplicar.

## Technical Context

**Language/Version**: TypeScript 6 strict, Node.js 24

**Primary Dependencies**: Fastify 5, Drizzle + postgres.js, Vitest 5, GitHub Actions com `gh` CLI

**Storage**: PostgreSQL 17; `rate_limit_attempts` existente, sem migração

**Testing**: Vitest (unitário com repositório falso), `test:int` com Testcontainers para a concorrência real

**Target Platform**: API na Render (Docker) e workflow do GitHub

**Project Type**: monorepo web (API + site); só `apps/api` e `.github/` mudam

**Performance Goals**: N/A; `reserve` já é usado no login

**Constraints**: compatível com o site anterior (nenhum formato de resposta muda); sem segredo novo

**Scale/Scope**: três rotas/serviços, um workflow, lockfile

## Constitution Check

| Princípio | Resultado |
|-----------|-----------|
| I. TypeScript estrito | Passa: sem `any`. |
| II. Qualidade automatizada | Passa: lint, tipos e testes rodam; teste de regressão antes da correção. |
| III. Camadas | Passa: lógica nos serviços, repositório intacto. |
| IV. Adaptadores isolados | Passa: adaptadores não mudam; o erro sobe ao serviço como hoje. |
| VI. Segurança e privacidade | Passa e melhora: limites atômicos; log só com `describeError`; issue sem segredos nem dados de pessoas. |
| VII. Testes determinísticos | Passa: sem rede; o workflow não é testado na suíte (ver research R4). |
| IX. Schema por migração | N/A: sem mudança de schema (sem DDE/ERD a atualizar). |

Sem violações. Reavaliado após o design: igual.

## Project Structure

### Documentation (this feature)

```text
specs/038-itens-da-auditoria/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/collect-output.md
└── tasks.md        # /speckit-tasks
```

### Source Code (repository root)

```text
apps/api/src/
├── modules/puzzles/puzzles.service.ts      # reserve na busca; gancho onError nos dois catch
├── modules/auth/auth.service.ts            # admitRegistration com reserve
├── modules/settings/settings.service.ts    # save com reserve (testes unitários dos dois serviços ajustados)
├── modules/rate-limit/address-gate.ts      # já usa reserve; reaproveitar nos três
├── cli/run-cli.ts                          # liga onError à linha de erro com describeError
└── test/*.int.test.ts                      # concorrência: 40 pedidos, limite 30
.github/workflows/collect.yml               # tee da saída + passo if: failure() com gh issue
package-lock.json                           # npm audit fix
```

**Structure Decision**: sem pastas novas; o passo do workflow é um trecho de shell dentro do `collect.yml`, sem script em `scripts/`.

## Complexity Tracking

Sem violações a justificar.

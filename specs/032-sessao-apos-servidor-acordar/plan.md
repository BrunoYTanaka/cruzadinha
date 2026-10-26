# Implementation Plan: Sessão só depois de o servidor acordar

**Branch**: `fix/032-sessao-apos-servidor-acordar` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/032-sessao-apos-servidor-acordar/spec.md`

## Summary

Os loaders `viewerLoader` (`apps/web/src/app/viewer.ts`) e `directPlayLoader` (`app/direct-play.ts`, rota `/`) são filhos do roteador que espera a API (`serverReadyLoader`, `router.tsx`), mas o React Router roda loaders de rotas aninhadas em paralelo. Então `GET /api/auth/me` sai com a API dormindo e sua falha vira a tela de erro quando o servidor acorda. A correção: os dois loaders esperam o estado "servidor pronto" antes de pedir a sessão (`directPlayLoader` também chama `ensureQueryData` da sessão e, sem a espera, perderia o atalho "Ir direto ao jogo" na primeira abertura) (nova função `whenServerReady(signal)` em `api/server-wake.ts`, sem segundo laço de `/api/health`). O cabeçalho (`AppLayout`) já só consulta a sessão com o servidor pronto; falta só garantir que a identidade apareça no mesmo quadro do calendário (ver research.md, item 2). Só `apps/web` muda.

## Technical Context

**Language/Version**: TypeScript 6 strict, React 19, React Router 7 (data mode), Node 24

**Primary Dependencies**: as existentes (TanStack Query); nenhuma nova

**Storage**: N/A

**Testing**: Vitest + Testing Library (`viewer.test.tsx`, `router.test.tsx`, `server-wake.test.ts`) e Playwright (`e2e/`, API simulada com `page.route`)

**Target Platform**: navegador, desktop e telefone

**Project Type**: web (front end)

**Performance Goals**: API acordada: nenhuma espera nem pedido a mais (SC-003); `whenServerReady` resolve na hora quando já pronto

**Constraints**: regras de espera da feature 012 intactas; sem mudar endereços, dados salvos ou contrato com a API

**Scale/Scope**: 1 função nova, 1 loader, 1 ajuste de exibição no cabeçalho, testes

## Constitution Check

*GATE: passa antes da pesquisa e continua passando depois do desenho.*

- I (TS estrito): sem `any`. Passa.
- II (qualidade automatizada): lint, format, typecheck, testes e build como sempre. Passa.
- III/IV (camadas back, adaptadores): sem mudança no back. N/A.
- V (lógica pura e testada): `whenServerReady` testada com tempo falso (pronto já, pronto depois, abortado). Passa.
- VI (segurança e privacidade): nenhum dado novo; menos pedidos antes da hora. Passa.
- VII (testes determinísticos): sem rede; o e2e usa `page.route`. Passa.
- IX (schema): sem migração. N/A.
- Fluxo: bug com spec feita; o teste de regressão (sessão 503 antes da saúde) vem primeiro e falha, commitado com a correção. Context7: não é preciso, pois nenhuma API nova de biblioteca é usada além dos loaders do React Router já em uso.

## Project Structure

### Documentation (this feature)

```text
specs/032-sessao-apos-servidor-acordar/
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md   # /speckit-tasks
```

Sem `data-model.md` (nenhuma entidade) e sem `contracts/` (nenhuma interface externa muda).

### Source Code (repository root)

```text
apps/web/
├── src/api/server-wake.ts        # + whenServerReady(signal)
├── src/api/server-wake.test.ts
├── src/app/viewer.ts             # espera whenServerReady antes de ensureQueryData
├── src/app/direct-play.ts        # idem, antes de consultar a sessão
├── src/app/direct-play.test.ts
├── src/test/render.tsx           # helper serverIsReady() para testes que montam loaders fora do portão
├── src/app/viewer.test.tsx       # regressão: 503 antes da saúde não vira tela de erro
├── src/app/router.test.tsx       # ordem: saúde antes de /api/auth/me
├── src/app/AppLayout.tsx         # identidade do cabeçalho junto do calendário (se o item 2 da pesquisa exigir)
└── e2e/espera-servidor.spec.ts   # (já existe) + simulação do issue #63 (cabeçalho e corpo a cada 250 ms)
```

**Structure Decision**: tudo em `apps/web`, nos módulos que já cuidam da espera e da sessão.

## Complexity Tracking

Sem violações.

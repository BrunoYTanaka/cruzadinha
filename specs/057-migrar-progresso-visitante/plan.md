# Implementation Plan: Migrar progresso de visitante para a conta

**Branch**: `feat/057-migrar-progresso-visitante` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/057-migrar-progresso-visitante/spec.md` (issue #92)

## Summary

Um endpoint em lote `POST /api/progress/import` aplica, por cruzada, o progresso de visitante à conta da sessão com a regra pura `decideImport` (savedAt mais novo vence; concluída na conta nunca é sobrescrita; recorde é o menor tempo dos dois). O site ganha `features/import`: ao haver conta e progresso local, abre um diálogo com resumo, envia em lotes de 100 e apaga do IndexedDB só os itens que a API confirmou (importado ou mantido) e que não mudaram desde a leitura. "Agora não" vale até recarregar o site (variável de módulo); descartar pede confirmação.

## Technical Context

**Language/Version**: TypeScript 6 strict, Node 24

**Primary Dependencies**: Fastify 5, Drizzle/postgres.js, Zod (`shared`), React 19, TanStack Query, `idb`

**Storage**: PostgreSQL 17 (tabela `progress` existente, sem migração); IndexedDB `cruzadinha-visitante`

**Testing**: Vitest (unitário), `*.int.test.ts` com Testcontainers, Testing Library + `vitest-axe`, Playwright

**Target Platform**: API em Render, site em Cloudflare Pages

**Project Type**: monorepo web + API + `shared`

**Performance Goals**: 366 dias × 4 fontes (≈1.464 itens) em ≤ 10 s; lotes de 100

**Constraints**: nunca apagar o local antes da confirmação; a API não guarda ajudas (`help`), então a importação não as leva; compatível com a versão anterior do site (rota nova, nada removido)

**Scale/Scope**: 1 rota, 1 regra pura, 1 feature web, 1 mudança no `guestStore`

## Constitution Check

*GATE: passa antes da pesquisa e após o desenho.*

- I TypeScript estrito/Zod: corpo estrito, `unknown` → Zod. Passa.
- II Qualidade automatizada: testes unitários, integração, e2e; `check:deps` atualizado. Passa.
- III Camadas: rota → serviço → repositório dentro de `modules/progress`. Passa.
- IV Integrações externas: não se aplica (nenhuma fonte nova).
- V Lógica pura testada: `decideImport` pura, ao lado de `decideSave`. Passa.
- VI Segurança: usuário só da sessão, limite por usuário, só nomes de campos em erros/logs, nenhuma letra em log. Passa.
- VII Testes determinísticos: relógio injetado, sem rede. Passa.
- VIII Conteúdo de terceiros: não se aplica (só o progresso do próprio visitante; nenhuma solução sai do aparelho).
- IX Schema por migração: sem mudança de schema, logo sem DDE/ERD novos. Passa.

## Project Structure

### Documentation (this feature)

```text
specs/057-migrar-progresso-visitante/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/import.md
└── tasks.md   # /speckit-tasks
```

### Source Code

```text
packages/shared/src/progress/schema.ts        # importProgressRequestSchema, importProgressResponseSchema
apps/api/src/modules/progress/
├── progress.service.ts                       # decideImport (pura) + import()
├── progress.routes.ts                        # POST /api/progress/import
└── progress.schemas.ts                       # schema OpenAPI da rota
apps/api/src/test/progress-import.int.test.ts
apps/web/src/features/guest/                  # guestStore.removeIfUnchanged
apps/web/src/features/import/                 # novo: components/ hooks/ services/ helpers/ index.ts
apps/web/src/app/AppLayout.tsx                # monta o ImportOffer
.dependency-cruiser.cjs                       # FEATURE_ORDER: session, guest, offline, import, library, ...
apps/web/src/shared/services/api/             # importProgress()
apps/web/e2e/                                 # fluxo visitante → conta
```

**Structure Decision**: a regra de conflito fica na API (fonte da verdade, ao lado de `decideSave`); o site só resume, envia e limpa. Feature web própria entre `offline` e `library` (precisa de `clearDraft` de `offline`); ela importa `session`, `guest` e `offline`.

## Complexity Tracking

Sem violações.

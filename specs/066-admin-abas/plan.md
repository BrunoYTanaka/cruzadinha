# Implementation Plan: Administração em abas seguindo o design system

**Branch**: `feat/066-admin-abas` | **Date**: 2026-11-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/066-admin-abas/spec.md`

## Summary

`/admin` deixa de empilhar as duas partes e passa a ter abas coladas no painel: "Fontes" e uma aba por fonte gerada, com a aba escolhida em `?aba=`. As abas vêm de um componente novo `shared/components/Tabs`, extraído de `SourceTabs` (que passa a usá-lo, sem mudar o calendário). Os painéis ficam todos montados (os inativos com `hidden`), então o rascunho que já vive no estado de `SourcesAdmin` e de cada bloco de fonte gerada sobrevive à troca. `GeneratedSourcesAdmin` é refeito no padrão do mockup (Contador, Resumo numérico, Tabelas, Zona de perigo, campo com Copiar, avisos sem espaço reservado); `SourcesAdmin` troca os botões de ícone por texto e o estado por selo. A única mudança fora do site é um campo opcional `today.difficulty` na resposta de `GET /api/admin/generated`, derivado do título que a geração já grava (`Dificuldade: <rótulo>`).

## Technical Context

**Language/Version**: TypeScript 6 strict, Node.js 24

**Primary Dependencies**: React 19, React Router 7 (`useSearchParams`, `setSearchParams(..., { replace: true })`, confirmado no Context7), TanStack Query, `@dnd-kit/react` (inalterado), Zod (`shared`), Fastify 5 (API)

**Storage**: N/A (nenhuma tabela ou migração; a dificuldade sai do título já gravado no `data` do puzzle)

**Testing**: Vitest + Testing Library + `vitest-axe` (web), Vitest com `app.inject()` e `*.int.test.ts` em Postgres (API), Playwright `e2e/admin.spec.ts`

**Target Platform**: navegador (computador e celular a 390 px), temas claro e escuro

**Project Type**: monorepo web (`apps/web`, `apps/api`, `packages/shared`)

**Performance Goals**: nenhuma meta nova; a página continua com os mesmos dois pedidos (`/api/admin/sources`, `/api/admin/generated`)

**Constraints**: `check:deps` (admin importa só `session`; `shared` não importa `features`); `Button` com quatro variantes; um `h1`; compatível com a versão anterior da outra parte (site novo com API velha: `difficulty` ausente mostra "—"; site velho com API nova: chave nova descartada pelo schema tolerante)

**Scale/Scope**: 1 aba fixa + N fontes geradas (hoje 1)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|-----------|----------|
| I. TS estrito, schemas em `shared` | Campo novo entra em `generatedSourceViewSchema` (`shared`); sem `any`. OK |
| II. Qualidade automatizada | Testes unitários, axe, int e e2e atualizados; CI inalterada. OK |
| III. Camadas no back | Dificuldade derivada no serviço (`generatedView`); rota e repositório não mudam. OK |
| IV. Adaptadores | O título continua montado só em `sources/generated/layout.ts`; a função que monta e a que lê ficam juntas em `shared`. OK |
| V. Lógica de jogo pura / servidor via TanStack Query | Nada de jogo; dados do admin continuam nos hooks com TanStack Query; aba na URL, não em estado global. OK |
| VI. Segurança e privacidade | Rotas admin continuam atrás de `createRequireAdmin` (404 para não admin); a dificuldade não é segredo (o jogador já a vê). OK |
| VII. Testes sem internet | Sem rede real; clipboard simulado nos testes. OK |
| VIII. Conteúdo de terceiros | Só fontes geradas; nada novo exportado. OK |
| IX. Migrações | Sem mudança de schema do banco. OK |
| Fluxo: Context7 | `useSearchParams`/`replace` consultado; nenhuma outra API de biblioteca nova. OK |

Sem violações. Re-check pós-design: igual (o design não acrescentou dependência, tabela nem rota).

## Project Structure

### Documentation (this feature)

```text
specs/066-admin-abas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admin-generated-api.md   # campo novo em GET /api/admin/generated
│   └── admin-ui.md              # ?aba=, abas, papéis e textos da tela
└── tasks.md                     # /speckit-tasks
```

### Source Code (repository root)

```text
docs/mockups/design-system.html                 # 1º commit: diff do issue; depois "Média" → "Médio"

packages/shared/src/sources/generated-settings.ts   # difficultyTitle/parseDifficultyTitle; today.difficulty opcional
packages/shared/src/sources/generated-settings.test.ts

apps/api/src/sources/generated/layout.ts            # usa difficultyTitle
apps/api/src/modules/sources/sources.service.ts     # generatedView devolve today.difficulty
apps/api/src/test/admin-generated.int.test.ts       # confere o campo

apps/web/src/shared/components/Tabs/                # NOVO: Tabs.tsx, Tabs.module.css, Tabs.test.tsx
apps/web/src/shared/components/button-states.test.ts  # SourceTabs.module.css → Tabs.module.css
apps/web/src/features/library/components/SourceTabs/  # passa a envolver Tabs (ids e textos iguais)
apps/web/src/features/admin/
├── index.ts                                       # exporta AdminTabs (e para de exportar o que a página não usa)
├── hooks/useAdminTab/                             # NOVO: lê/escreve ?aba= (resolveAdminTab puro + teste)
├── components/AdminTabs/                          # NOVO: Tabs + painéis montados (hidden)
├── components/SourcesAdmin/                       # botões com texto, selo de estado, texto sem "Hoje"
└── components/GeneratedSourcesAdmin/              # refeito: GeneratedSourcePanel (Contador, resumo, tabelas, perigo, copiar)
apps/web/src/pages/admin/AdminPage.tsx            # h1 + AdminTabs; largura 688 px
apps/web/e2e/admin.spec.ts

CLAUDE.md                                          # linhas de Admin (060/064) passam a citar as abas e ?aba=
```

**Structure Decision**: monorepo existente. O componente de abas vai para `shared/components/Tabs` porque `admin` não pode importar `features/library` (`check:deps`). Contador, selo, resumo, tabela, zona de perigo e campo com Copiar ficam em CSS local do `features/admin`, como as outras telas já fazem com esses padrões (Configurações, Status, Estatísticas, Conta, x1): o issue pede para usar padrões existentes, não para criar componentes compartilhados novos.

## Complexity Tracking

Sem violações a justificar.

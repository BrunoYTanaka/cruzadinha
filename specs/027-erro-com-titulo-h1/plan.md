# Implementation Plan: Telas de erro com título de nível 1

**Branch**: `fix/tela-de-erro-do-dia-sem-titulo-h1` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/027-erro-com-titulo-h1/spec.md`

## Summary

O `ErrorState` fixa o título em `h2`, então as telas em que ele é a página inteira ficam sem `h1`. A correção é semântica, só em `apps/web`: o componente passa a receber o nível do título (`h1` ou `h2`) como prop obrigatória, sem mudar o estilo; cada uso declara o nível conforme o lugar (página inteira = `h1`; dentro da biblioteca, que já tem o `h1` "Hoje" = `h2`). A tela "Acordando o servidor" também vira `h1`. O e2e perde a exceção `page-has-heading-one` e ganha uma varredura de axe nas telas de erro, com testes unitários que contam os `h1`.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24

**Primary Dependencies**: React 19, React Router 7, Vite 8 (sem dependência nova)

**Storage**: N/A

**Testing**: Vitest 5 + Testing Library + `vitest-axe` (unitário); Playwright + axe (e2e, `apps/web/e2e/`)

**Target Platform**: navegadores modernos, desktop e celular, temas claro e escuro

**Project Type**: web (monorepo; só `apps/web` muda)

**Performance Goals**: N/A (sem custo de execução)

**Constraints**: aparência idêntica (≤ 1 px); compatível com a API anterior (nenhuma mudança de API); tokens de tema, sem cores fixas

**Scale/Scope**: 1 componente, 5 arquivos de uso (`DayRoute`, `GamePage`, `RouteError`, `LibraryPage`, `ServerWake`), 6 arquivos de teste de unidade ampliados e 2 specs e2e (1 alterado, 1 novo)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito | Passa. Prop tipada (`1 \| 2`), sem `any`. |
| II. Qualidade automatizada | Passa. Lint, typecheck, testes e CI cobrem tudo. |
| III. Camadas no back | N/A. Nenhum código de API. |
| IV. Adaptadores | N/A. |
| V. Lógica de jogo pura | N/A. Nenhuma regra de jogo muda. |
| VI. Segurança e privacidade | Passa. Nenhum dado, texto de erro ou log novo. |
| VII. Testes determinísticos | Passa. Pedidos simulados (`page.route`, `http` de teste); sem internet. |
| VIII. Conteúdo de terceiros | N/A. |
| IX. Schema por migração | N/A. Sem mudança de schema. |
| Restrições técnicas | Passa. CSS com tokens, sem biblioteca de UI. |
| Fluxo | **Desvio explicado**: a constituição dispensa o ciclo completo para correção, e esta é uma correção (a issue #46 é `bug`). A spec foi pedida explicitamente e fica como registro da regra "um `h1` por página". O teste de regressão que falha vem primeiro e entra no mesmo PR. |
| Context7 | Aplicável ao e2e (`@axe-core/playwright`, Playwright). O código só reutiliza APIs já em uso no repositório, mas a regra é MUST: a tarefa T002 consulta o Context7 antes de escrever o e2e e registra o que confirmou em `research.md`. Os títulos `h1`/`h2` do React são HTML nativo. |

Resultado: sem violações que exijam a tabela de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/027-erro-com-titulo-h1/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── error-state-heading.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/app/
│   ├── ErrorState.tsx            # prop `level` obrigatória; título renderizado como h1/h2
│   ├── ErrorState.test.tsx       # testes do nível (h1, h2) e do alerta
│   ├── RouteError.tsx            # level 1
│   ├── RouteError.test.tsx       # um h1 em cada caso
│   └── NotFoundPage.tsx          # já h1 (só conferido)
├── src/features/
│   ├── library/DayRoute.tsx      # level 1 (6 usos) + DayRoute.test.tsx
│   ├── library/LibraryPage.tsx   # 401 antiga: level 1; falha do calendário: level 2 + LibraryPage.test.tsx
│   ├── game/GamePage.tsx         # level 1 (2 usos) + GamePage.test.tsx
│   └── status/ServerWake.tsx     # título vira h1 + ServerWake.test.tsx
└── e2e/
    ├── botoes.spec.ts            # remove disableRules e o comentário
    └── erros-com-titulo.spec.ts  # varredura de axe e contagem de h1 nas telas de erro, 2 temas
```

**Structure Decision**: Sem arquivo novo em `src/` além de testes; a decisão do nível fica em quem chama o `ErrorState` (FR-004).

## Complexity Tracking

Sem violações.

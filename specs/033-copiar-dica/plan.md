# Implementation Plan: Copiar a dica com tamanho e letras e fechar os ajustes ao clicar fora

**Branch**: `feat/033-copiar-dica` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/033-copiar-dica/spec.md`

## Summary

Um ajuste novo, `copyClue` (booleano, padrão `false`), entra no registro de ajustes de `shared`. Com ele ligado, o duplo clique numa dica (lista e barra da dica ativa) copia `dica (n): letras` pela área de transferência. A montagem do texto é uma função pura em `game-logic`. O aviso é um toast fixo, fora do fluxo, com região viva. A janela de ajustes passa a usar o `closeOnBackdrop` que o `Dialog` já tem. Sem banco, sem migração, sem rota nova.

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24

**Primary Dependencies**: React 19, Zod (já no projeto); nenhuma nova. Área de transferência: `navigator.clipboard.writeText`.

**Storage**: o registro de ajustes já existente: `localStorage` (`cruzadinha:settings`) e `user_settings.settings` (jsonb). Sem migração.

**Testing**: Vitest 5 + Testing Library + `vitest-axe` (web e shared); Playwright em `apps/web/e2e/`.

**Target Platform**: navegadores modernos, desktop e celular.

**Project Type**: monorepo web (`packages/shared`, `apps/api`, `apps/web`).

**Performance Goals**: cópia instantânea (trabalho local, sem rede).

**Constraints**: sem saltos de layout (feature 017); compatível com a versão anterior da outra parte (duas versões para remover algo); duplo clique não altera grade, relógio, ajudas nem progresso.

**Scale/Scope**: 1 campo novo, 1 função pura, 1 hook/toast, 3 pontos de ligação (`ClueList`, `ClueSheet`, `ClueBar`), 1 linha no diálogo de ajustes.

## Constitution Check

*GATE: passa antes e depois do desenho.*

- I (TypeScript estrito): campo novo tipado via Zod, sem `any`. OK.
- II (qualidade automatizada): testes unitários, e2e e axe previstos. OK.
- III/IV (camadas, adaptadores): a API só ganha tolerância no esquema de `shared`; nenhum adaptador. OK.
- V (lógica de jogo pura e testada): `clueCopyText` pura em `game-logic/`, com teste. OK.
- VI (segurança e privacidade): o texto copiado sai só para a área de transferência, por gesto do usuário; nada é enviado. Não consulta a solução. OK.
- VII (testes determinísticos): `clipboard` simulado nos testes. OK.
- Fluxo (Context7): bibliotecas tocadas (React, Zod, Playwright) têm a documentação consultada antes do código (T001a). OK.
- IX (schema por migração): sem mudança de tabela (jsonb). OK.

Sem violações; tabela de complexidade vazia.

## Project Structure

### Documentation (this feature)

```text
specs/033-copiar-dica/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/settings.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/src/settings/schema.ts   # campo copyClue; pedido de salvar o aceita ausente
apps/web/src/game-logic/clue-text.ts     # clueCopyText (pura) + teste
apps/web/src/features/game/             # useCopyClue + toast, ligação em ClueList, ClueSheet, ClueBar, GamePage
apps/web/src/features/settings/SettingsDialog.tsx  # Switch "Copiar a dica" + closeOnBackdrop
apps/web/e2e/copiar-dica.spec.ts
docs/data-definitions/DDE-004-*.md, docs/entity-relationship-diagrams/ERD-004-*.md  # lista de campos do jsonb
```

**Structure Decision**: sem diretório novo no back; `apps/api` não muda de código (usa o esquema de `shared`). Releases: `shared` + API primeiro (A), site depois (B).

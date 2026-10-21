# Implementation Plan: Data definitions e diagramas entidade-relacionamento em dia com o sistema

**Branch**: `docs/020-atualizar-modelo-dados` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/020-atualizar-modelo-dados/spec.md`

## Summary

As data definitions (DDE-001 a DDE-003) e os ERDs (ERD-001 a ERD-003) pararam na feature 008. A feature os atualiza no lugar, sem ID novo (R1), para refletirem o que está no ar:

1. **DDE-001 / ERD-001**: cadastro só com e-mail e senha atrás de chave fechada por padrão (013); `Invite` e seus relacionamentos marcados como sem uso até o lançamento B, inclusive dentro do diagrama, por alias e comentário Mermaid (R2); `PUZZLE_FETCH` na lista de ações, rastreado à spec 013 (R4).
2. **DDE-002 / ERD-002**: fonte `cruzadaonline` (014); solução entregue também ao visitante (013); relacionamento com `Progress` no lugar de "feature futura", com `Progress` só com as chaves na DDE e no ERD; `data`/`solution` como `json` no ERD, igual ao ERD-003 (R3).
3. **DDE-003**: nota sobre o progresso do visitante, só no aparelho, sem entidade (clarificação de 2026-10-20).

Cada DDE ganha uma linha de patch no changelog. O estado-alvo campo a campo está em [data-model.md](data-model.md). Nada muda no banco, na API ou no site.

## Technical Context

**Language/Version**: Markdown (tabelas no formato do Prettier) e Mermaid `erDiagram`; Node.js 24 só para Prettier e para a renderização de conferência

**Primary Dependencies**: nenhuma nova. Prettier (já no repositório); Mermaid CLI por `npx`, só para conferir (R7)

**Storage**: N/A; a referência conferida é `apps/api/src/db/schema.ts` (migrações `0000` a `0004`), sem alteração

**Testing**: conferências do [quickstart.md](quickstart.md): `grep` contra o schema, renderização dos ERDs e `npm run format:check`; sem teste automatizado novo

**Target Platform**: leitura no repositório (GitHub e editor)

**Project Type**: documentação de um monorepo web; só `docs/` muda

**Performance Goals**: N/A

**Constraints**: seguir as skills `data-definition` e `entity-relationship-diagram` (seções do template, português, ERD só com o bloco Mermaid, um diagrama por DDE); toda informação nova rastreável a uma `spec.md`; IDs e nomes de arquivo inalterados

**Scale/Scope**: 6 arquivos em `docs/data-definitions/` e `docs/entity-relationship-diagrams/`; 6 specs de origem (004, 006, 007, 008, 013, 014)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação | Nota |
| --- | --- | --- |
| I. TypeScript estrito | N/A | Sem código |
| II. Qualidade automatizada | Passa | `docs/` passa pelo Prettier; `format:check` na CI cobre os arquivos (R6) |
| III. Camadas no back | N/A | Sem código |
| IV. Adaptadores isolados | N/A | Os documentos citam as fontes só pelo identificador, sem endereço nem formato da fonte |
| V. Lógica de jogo pura | N/A | Sem código |
| VI. Segurança e privacidade | Passa | Só hashes como campos de segredo, nenhum valor de exemplo (FR-012). Os textos novos seguem a versão 4.0.0: solução a visitante, progresso de visitante só no aparelho |
| VII. Testes sem internet | Passa | Nenhum teste novo; a renderização por `npx` é conferência manual, fora da suíte |
| VIII. Conteúdo de terceiros | Passa | Nenhum conteúdo de puzzle nos documentos |
| IX. Schema por migração | Passa | Nenhuma mudança de schema; os documentos descrevem o schema atual |
| Fluxo: manutenção dispensa spec | Passa, com nota | Documentação dispensa o ciclo, o que não o proíbe. O autor pediu `/speckit-specify` e `/speckit-plan`; a branch usa o tipo `docs`, e o commit `docs:` não gera versão (`docs/versionamento.md`) |
| Fluxo: Context7 | Passa | Sintaxe de alias e comentário do `erDiagram` confirmada em `/mermaid-js/mermaid` (R2) |

**Re-check pós-design**: sem mudança. O design ([data-model.md](data-model.md)) não introduz código, dependência nem schema.

## Project Structure

### Documentation (this feature)

```text
specs/020-atualizar-modelo-dados/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1: estado-alvo de cada documento
├── quickstart.md        # Fase 1: conferências
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

Sem `contracts/`: a feature não expõe interface (API, linha de comando ou tela).

### Source Code (repository root)

```text
docs/
├── data-definitions/
│   ├── DDE-001-banco-auth-convites.md         # cadastro, Invite sem uso, PUZZLE_FETCH
│   ├── DDE-002-coleta-puzzles.md              # cruzadaonline, visitante, Progress
│   └── DDE-003-progresso-usuario-puzzle.md    # nota do progresso do visitante
└── entity-relationship-diagrams/
    ├── ERD-001-banco-auth-convites.md         # alias e comentários de "sem uso"
    ├── ERD-002-coleta-puzzles.md              # json, valores de source, PROGRESS só com as chaves
    └── ERD-003-progresso-usuario-puzzle.md    # conferido; muda só se divergir
```

**Structure Decision**: só os seis arquivos acima mudam. `CLAUDE.md` não ganha linha em "Current state": a lista registra features de produto, e esta não muda comportamento.

## Complexity Tracking

Sem violações.

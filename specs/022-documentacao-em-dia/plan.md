# Implementation Plan: Documentação em dia com o sistema

**Branch**: `docs/022-documentacao-em-dia` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/022-documentacao-em-dia/spec.md`

## Summary

Três grupos de documentos ficaram atrás do sistema depois das features 013, 014 e 021. A feature os corrige no lugar, sem documento novo:

1. **DDE-001, DDE-003, DDE-004**: notas, escopo e rastreio. Gravação de configurações no limite de tentativas, o que some com a conta, links entre as DDEs, limites e regra do visitante nas configurações. Cada uma ganha uma linha de patch no changelog (R1). A DDE-002 e os quatro ERDs não mudam (R2).
2. **`docs/design.md`**: a tabela de colunas vira um resumo com links para as DDEs (R3); solução e busca valem também para o visitante; endpoints e árvore de módulos batem com a API de hoje (R4).
3. **`README.md`**: estado atual sem convite, comandos que existem, as duas fontes e "aberto a quem tem o endereço, fora dos buscadores" no lugar de "privado" (R5).

O estado-alvo trecho a trecho está em [data-model.md](data-model.md). Nada muda no banco, na API ou no site.

## Technical Context

**Language/Version**: Markdown (tabelas no formato do Prettier); Node.js 24 só para o Prettier

**Primary Dependencies**: nenhuma nova

**Storage**: N/A; as referências conferidas são `apps/api/src/db/schema.ts` (migrações `0000` a `0005`), as rotas em `apps/api/src/modules/*/*.routes.ts` e os comandos em `apps/api/src/cli/run-cli.ts`, sem alteração

**Testing**: conferências do [quickstart.md](quickstart.md) (`grep` contra schema, rotas e comandos; `npm run format:check`); sem teste automatizado novo

**Target Platform**: leitura no repositório (GitHub e editor)

**Project Type**: documentação de um monorepo web; mudam `docs/data-definitions/`, `docs/design.md` e `README.md`

**Performance Goals**: N/A

**Constraints**: DDEs seguem a skill `data-definition` (seções do template, português, rastreio a `spec.md`); design e README mantêm o tom e a estrutura atuais; IDs e nomes de arquivo inalterados; trechos históricos do design (seção 10, "Fora do escopo da v1") ficam como estão

**Scale/Scope**: 5 arquivos (3 DDEs, design, README); specs de origem 004, 007, 008, 013, 014 e 021; o `CLAUDE.md` serve de referência (mapa de acesso das rotas e o que o seed faz), sem ser origem das DDEs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação | Nota |
| --- | --- | --- |
| I. TypeScript estrito | N/A | Sem código |
| II. Qualidade automatizada | Passa | `docs/` e o README passam pelo Prettier; `format:check` na CI cobre os arquivos |
| III. Camadas no back | Passa | A árvore de módulos do design passa a refletir as camadas reais (FR-015a) |
| IV. Adaptadores isolados | N/A | Nenhum detalhe novo de fonte; o README cita as fontes só pelo nome |
| V. Lógica de jogo pura | N/A | Sem código |
| VI. Segurança e privacidade | Passa | Nenhum segredo como exemplo (FR-020). Os textos novos seguem a versão 4.0.0: solução também ao visitante, visitante nunca envia progresso nem configurações |
| VII. Testes sem internet | Passa | Nenhum teste novo |
| VIII. Conteúdo de terceiros | Passa | O README passa a dizer exatamente o que o princípio diz desde a 4.0.0: aberto a quem tem o endereço e fora dos buscadores; a nota de afiliação cita as duas fontes |
| IX. Schema por migração | Passa | Nenhuma mudança de schema |
| Fluxo: manutenção dispensa spec | Passa, com nota | Documentação dispensa o ciclo, o que não o proíbe. O autor pediu `/speckit-specify` e `/speckit-plan`; a branch usa o tipo `docs`, e o commit `docs:` não gera versão (`docs/versionamento.md`) |
| Fluxo: Context7 | N/A | Nenhuma biblioteca envolvida; os ERDs não mudam |

**Re-check pós-design**: sem mudança. O design ([data-model.md](data-model.md)) não introduz código, dependência nem schema.

## Project Structure

### Documentation (this feature)

```text
specs/022-documentacao-em-dia/
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
README.md                                        # estado atual, comandos, fontes, afiliação
docs/
├── design.md                                    # seções 1 e 4
└── data-definitions/
    ├── DDE-001-banco-auth-convites.md           # SETTINGS_SAVE na nota, remoção da conta, escopo
    ├── DDE-003-progresso-usuario-puzzle.md      # escopo aponta para a DDE-004
    └── DDE-004-configuracoes-usuario.md         # limites da gravação, visitante
```

**Structure Decision**: só os cinco arquivos acima mudam. `CLAUDE.md` não ganha linha em "Current state": a lista registra features que mudam o sistema, e esta não muda comportamento (mesma decisão da feature 020).

## Complexity Tracking

Sem violações.

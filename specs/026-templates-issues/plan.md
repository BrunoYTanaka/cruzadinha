# Implementation Plan: Templates de issues para feature, bug, documentação e manutenção

**Branch**: `chore/026-templates-issues` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/026-templates-issues/spec.md`

## Summary

Adicionar quatro formulários de issue do GitHub (bug, feature, documentação, chore) e a configuração do seletor de tipos em `.github/ISSUE_TEMPLATE/`, e registrar no `CLAUDE.md` a ligação entre o tipo de issue e o fluxo de trabalho. Só arquivos de configuração e documentação; nenhum código de `apps/` ou `packages/` muda. A sintaxe foi confirmada na documentação atual do GitHub via Context7 (ver [research.md](research.md)).

## Technical Context

**Language/Version**: YAML (formulários de issue do GitHub); Markdown para a documentação

**Primary Dependencies**: nenhuma; recurso nativo do GitHub (issue forms), sem Action nem app

**Storage**: N/A

**Testing**: sem teste automatizado (a constituição dispensa spec e a suíte não cobre configuração do GitHub); validação por `npm run format:check` (Prettier cobre `.github/**/*.yml`), análise do YAML e conferência manual na página de nova issue após o merge em `main` (ver [quickstart.md](quickstart.md))

**Target Platform**: github.com (página de nova issue, web e móvel)

**Project Type**: configuração de repositório (sem código de aplicação)

**Performance Goals**: N/A

**Constraints**: textos em português do Brasil; no máximo 4 campos obrigatórios por tipo; só usar etiquetas que já existem (o GitHub ignora as inexistentes); `render` em `textarea` desliga anexos, então não é usado nos campos de evidência; a configuração só vale depois do merge em `main`

**Scale/Scope**: 5 arquivos novos em `.github/ISSUE_TEMPLATE/` e 1 edição em `CLAUDE.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
| --- | --- |
| I. TypeScript estrito | N/A: nenhum código de aplicação |
| II. Qualidade automatizada | OK: os YAML passam por Prettier (`format:check` no CI); sem mudança em lint, typecheck ou testes |
| III, IV, V, IX. Camadas, adaptadores, lógica de jogo, schema | N/A: sem código nem banco |
| VI. Segurança e privacidade | OK: os formulários avisam para não colar segredos, `.env`, cookies ou dados pessoais em issues; sem link externo nem coleta de dados |
| VII. Testes determinísticos | OK: nada novo na suíte |
| VIII. Conteúdo de terceiros | OK: o campo de evidências avisa para não colar puzzles inteiros da fonte |
| Fluxo: manutenção dispensa spec | Desvio consciente: a feature passa pelo ciclo por pedido do autor; sem custo extra de governança |
| Fluxo: Context7 para ferramentas | OK: sintaxe de formulários e `config.yml` consultada em `/github/docs` |

Pós-design: sem violações; Complexity Tracking não se aplica.

## Project Structure

### Documentation (this feature)

```text
specs/026-templates-issues/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── issue-forms.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.github/
└── ISSUE_TEMPLATE/
    ├── config.yml       # seletor: issue em branco permitida, sem links de contato
    ├── bug.yml          # prefixo "[Bug]: ", etiqueta bug
    ├── feature.yml      # prefixo "[Feature]: ", etiqueta enhancement
    ├── docs.yml         # prefixo "[Docs]: ", etiqueta documentation
    └── chore.yml        # prefixo "[Chore]: ", sem etiqueta
CLAUDE.md                # bullet em "Conventions" sobre os templates e o fluxo por tipo
```

**Structure Decision**: um formulário YAML por tipo, cada um com nome de arquivo igual ao tipo de commit/branch correspondente, para que o nome, o título sugerido e o fluxo (`fix/…`, `feat/…`) se reconheçam entre si. `CLAUDE.md` é o documento de contribuição do projeto (não há README nem CONTRIBUTING), e já está fora do Prettier.

## Complexity Tracking

Sem violações a justificar.

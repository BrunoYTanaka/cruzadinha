# Implementation Plan: Viabilidade da fonte de puzzles

**Branch**: `feat/001-viabilidade-fonte` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-viabilidade-fonte/spec.md`

## Summary

Uma ferramenta de linha de comando, usada só pelo autor e sob demanda, que tenta obter um puzzle real do O Globo sem conta pessoal e termina com um veredito (viável, não viável ou inconclusivo), um resumo do puzzle diário, a lista de datas do nível diário e, opcionalmente, uma amostra sanitizada. A abordagem é um pacote TypeScript pequeno e isolado em `tools/source-probe/`, sem banco e sem servidor, com a lógica de classificação e sanitização pura e testada com respostas simuladas. Nenhum teste automático acessa a internet.

## Technical Context

**Language/Version**: TypeScript (strict) em Node.js 22 LTS ou superior, usando o `fetch` nativo

**Primary Dependencies**: `zod` (validação do formato recebido), `tsx` (execução direta de TypeScript, dev), `vitest` (testes, dev)

**Storage**: Arquivos locais apenas. A amostra sanitizada é gravada em `tools/source-probe/fixtures/`; nada vai a banco. Na conclusão, nem a amostra nem o código foram versionados (ver `decision.md`).

**Testing**: Vitest, com `fetch` simulado e respostas gravadas à mão. Sem rede na suíte

**Target Platform**: Linux/macOS, na máquina do autor

**Project Type**: CLI de uso único (ferramenta de desenvolvimento)

**Performance Goals**: Veredito em menos de 2 minutos por execução (SC-001)

**Constraints**: Poucos pedidos por execução e pausa entre eles (FR-007); nenhuma credencial ou dado pessoal em arquivos versionados, relatórios ou saída (FR-009, FR-010)

**Scale/Scope**: Um puzzle do nível diário por execução, mais a listagem de datas desse nível. Um único arquivo de relatório

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TypeScript estrito em monorepo | Passa, com ressalva: usa TypeScript `strict`, mas o monorepo é criado na feature 002. O pacote nasce autônomo e entra como workspace depois, sem mudança de código (ver Complexity Tracking) |
| II. Qualidade automatizada | Adiado: Prettier, ESLint, Husky e CI são entregues na feature 002. O pacote já segue o padrão de formatação do `CLAUDE.md` |
| III. Camadas no back | Não se aplica (não há API) |
| IV. Adaptador isolado | Passa: o acesso à fonte fica em um único módulo, com fixtures sanitizadas que viram base dos testes de contrato da feature 003 |
| V. Lógica de jogo pura | Não se aplica |
| VI. Segurança e segredos | Passa: credenciais só por variável de ambiente, sanitização obrigatória antes de gravar amostras, `.gitignore` já cobre `.env*` |
| VII. Testes sem internet | Passa: a suíte usa respostas simuladas; a execução real é manual e sob demanda |
| VIII. Conteúdo de terceiros e uso privado | Passa: uso privado, baixa frequência, atribuição na amostra, interrompe se a fonte proibir |
| IX. Schema por migração | Não se aplica (sem banco) |
| Fluxo: Context7 | Cumprido para `tsx`, `zod` e `vitest` (ver `research.md`) |
| Fluxo: feature | Ciclo completo do Spec Kit em `feat/001-viabilidade-fonte` |

Resultado do gate: **passa**, com uma justificativa registrada abaixo.

## Project Structure

### Documentation (this feature)

```text
specs/001-viabilidade-fonte/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── probe-cli.md
└── tasks.md             # criado por /speckit-tasks
```

### Source Code (repository root)

```text
tools/
└── source-probe/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example          # só nomes de variáveis, valores fictícios
    ├── src/
    │   ├── cli.ts            # lê argumentos e imprime o relatório
    │   ├── probe.ts          # orquestra as etapas e decide o veredito
    │   ├── source.ts         # único módulo que fala com a fonte
    │   ├── schema.ts         # schemas Zod do formato recebido
    │   ├── types.ts          # tipos do modelo de dados (Verdict, PuzzleSummary, ...)
    │   ├── verdict.ts        # classificação pura de erro/resposta em veredito
    │   ├── summary.ts        # resumo puro do puzzle (grade, dicas, solução)
    │   ├── catalog.ts        # datas do nível diário e casos "indisponível"
    │   ├── sample.ts         # montagem e gravação da amostra sanitizada
    │   ├── sanitize.ts       # remoção pura de credenciais e dados pessoais
    │   └── report.ts         # formata o relatório legível
    ├── fixtures/             # amostras sanitizadas (não versionadas; ver decision.md)
    └── tests/                # todos com fetch simulado, sem rede
        ├── verdict.test.ts
        ├── summary.test.ts
        ├── catalog.test.ts
        ├── sample.test.ts
        ├── sanitize.test.ts
        ├── source.test.ts
        └── probe.test.ts
```

**Structure Decision**: um pacote isolado em `tools/source-probe/`, separado de `apps/` e `packages/` (que pertencem à feature 002). Ele não é instalado no site. Quando o monorepo existir, vira um workspace sem alterar o código. A lógica de decisão (`verdict`, `sanitize`) fica pura e separada do acesso à rede (`source`), o que a torna testável sem internet.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Pacote fora de um monorepo (princípio I) e sem lint/CI (princípio II) | A feature 001 existe justamente para decidir se vale montar o resto; criar o monorepo antes contradiria a regra de confirmar a viabilidade primeiro | Adiantar a feature 002 gastaria esforço que se perde se o veredito for "não viável" |

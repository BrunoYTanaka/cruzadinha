# Implementation Plan: Build do site e e2e sem avisos

**Branch**: `chore/eliminar-avisos-do-vite-e-do-git-no-build` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/028-avisos-do-build/spec.md`

## Summary

Três correções em `apps/web`, sem tocar em API, `shared` ou comportamento visível:

1. `vite.config.ts` importa `./version-plugin.ts` (com extensão) e `tsconfig.node.json` ganha `allowImportingTsExtensions`.
2. `version-plugin.ts` só chama o git quando `GITHUB_SHA` falta e descarta o stderr do git. Nenhuma mudança no workflow.
3. O chunk `index` (519 kB) é dividido com `build.rolldownOptions.output.codeSplitting` em um chunk de vendor do React e o resto, sem elevar o limite do aviso. Detalhes e medições em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6 estrito, Node.js 24

**Primary Dependencies**: Vite 8.3 (Rolldown), React 19, React Router 7, Zod, TanStack Query

**Storage**: N/A

**Testing**: Vitest (`version-plugin.test.ts`), Playwright (e2e), build com leitura da saída

**Target Platform**: Navegadores modernos; build local e no container `mcr.microsoft.com/playwright`

**Project Type**: web (monorepo npm workspaces)

**Performance Goals**: Primeira visita não baixa mais código que hoje (160,9 kB gzip no `index` + CSS)

**Constraints**: Sem silenciar avisos por variável de ambiente; compatível com `reload-after-deploy` e a ordem do CSS (`@layer`)

**Scale/Scope**: 4 arquivos de configuração/plugin e 1 teste

## Constitution Check

*GATE: passa antes e depois do desenho.*

- I (TypeScript estrito): sem `any`; `allowImportingTsExtensions` só vale com `noEmit`, já ativo no `tsconfig.base.json`. Passa.
- II (qualidade automatizada): lint, typecheck, testes e build continuam sendo o portão; a CI confirma o container. Passa.
- VII (testes determinísticos): o teste do plugin usa injeção, sem rede nem git real. Passa.
- VI (segurança): nenhum segredo novo; `GITHUB_SHA` já era lido. Passa.
- III, IV, V, VIII, IX: não se aplicam (sem API, fonte, jogo, conteúdo ou schema).

Sem violações; nada a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/028-avisos-do-build/
├── plan.md
├── research.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

`data-model.md` e `contracts/` não se aplicam: a feature não tem dados nem interface nova.

### Source Code (repository root)

```text
apps/web/
├── vite.config.ts         # import com extensão; codeSplitting em build.rolldownOptions
├── tsconfig.node.json     # allowImportingTsExtensions
├── version-plugin.ts      # git só sem GITHUB_SHA, stderr descartado
└── version-plugin.test.ts # cobre: sem git, GITHUB_SHA sem chamar o git
```

**Structure Decision**: tudo em `apps/web` (raiz do pacote). Nenhum arquivo em `src/` muda, exceto, se a pesquisa mostrar ganho, o `router.tsx` para carregar `/login` e `/cadastro` sob demanda (decisão em research.md).

## Complexity Tracking

Sem violações da constituição.

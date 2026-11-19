# Implementation Plan: Aviso de versão nova no calendário

**Branch**: `feat/067-aviso-versao-nova` | **Date**: 2026-11-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/067-aviso-versao-nova/spec.md`

## Summary

Quando o service worker de uma versão nova fica esperando, o calendário (`/calendario`) mostra um `Notice` de informação com "Atualizar" e "Fechar". "Atualizar" manda o service worker esperando assumir (`SKIP_WAITING`, que o SW gerado já atende) e recarrega só a aba que pediu; "Fechar" esconde até o próximo carregamento. O estado vive num store de módulo em `features/offline` (mesmo padrão de `useInstallPrompt`), alimentado por `registerSW` em `main.tsx` com `onNeedRefresh`, `onNeedReload` (guarda que impede recarregar as outras abas) e `onRegisteredSW` (procura versão nova quando a aba volta a ficar visível). Só o calendário renderiza o aviso; nenhuma configuração do PWA muda (`registerType: 'prompt'`, sem `skipWaiting`/`clientsClaim` automáticos). Detalhes e riscos em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6 estrito, React 19, Node.js 24

**Primary Dependencies**: `vite-plugin-pwa` 2.0.0 (`virtual:pwa-register`), `workbox-window` 7.4.1 (carregado pelo plugin), componentes `Notice` e `Button` do design system

**Storage**: Nenhum novo. O estado do aviso (esperando, fechado, atualizando) fica só na memória da página.

**Testing**: Vitest + Testing Library + `vitest-axe` (store com `registerSW` falso injetado, timers falsos); validação manual com build + `vite preview` (ver [quickstart.md](./quickstart.md))

**Target Platform**: Navegadores com service worker (Chromium, Firefox, Safari); sem service worker o aviso nunca aparece

**Project Type**: Web (só `apps/web`; API e `shared` não mudam)

**Performance Goals**: Nenhum custo novo no carregamento; uma checagem de versão (`registration.update()`) por volta à aba

**Constraints**: Nunca recarregar outra aba nem o jogo (FR-007, FR-008); calendário sem versão esperando idêntico ao de hoje (SC-005); arquitetura por feature (`check:deps`)

**Scale/Scope**: 1 hook/store, 1 componente, 1 prop opcional no `Notice`, 1 linha no calendário, `main.tsx` e tipos do módulo virtual

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|-----------|----------|
| I. TS estrito em monorepo | Tipos de `virtual:pwa-register` ampliados em `vite-env.d.ts` (`onNeedRefresh`, `onNeedReload`, `onRegisteredSW`); sem `any`. OK |
| II. Qualidade automatizada | Testes unitários do store, do componente (com axe), do `Notice` e do calendário; CI inalterada. OK |
| III. Camadas no back | API não muda. OK |
| IV. Adaptadores externos | O módulo virtual é injetado em `installAppUpdate(register)`; só `main.tsx` importa o valor de `virtual:pwa-register` (`useAppUpdate.ts` usa só `import type`). OK |
| V. Lógica de jogo pura | Nada de jogo muda; o jogo não lê o store. OK |
| VI. Segurança e privacidade | Nada sai do aparelho; nenhum dado novo guardado. OK |
| VII. Testes determinísticos sem internet | `registerSW` falso e timers falsos; nenhum service worker real nos testes unitários. OK |
| VIII. Conteúdo de terceiros | Não se aplica. OK |
| IX. Schema por migração | Sem banco. OK |

Sem violações. Re-checado após a Fase 1: continua sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/067-aviso-versao-nova/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1 (estado do aviso)
├── quickstart.md        # Fase 1
├── contracts/
│   └── app-update.md    # Contrato do store e do componente
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/src/
├── main.tsx                                      # registerSW → installAppUpdate(registerSW)
├── vite-env.d.ts                                 # tipos de onNeedRefresh/onNeedReload/onRegisteredSW
├── shared/components/Notice/
│   ├── Notice.tsx                                # action.pending opcional → Button pending
│   └── Notice.test.tsx
├── features/offline/
│   ├── index.ts                                  # + installAppUpdate, UpdateNotice
│   ├── hooks/useAppUpdate/
│   │   ├── useAppUpdate.ts                       # store de módulo + hook (useSyncExternalStore)
│   │   └── useAppUpdate.test.ts
│   └── components/UpdateNotice/
│       ├── UpdateNotice.tsx                      # Notice info: Atualizar / Fechar / Atualizando…
│       └── UpdateNotice.test.tsx
└── pages/library/
    ├── LibraryPage.tsx                           # <UpdateNotice /> no topo do conteúdo
    └── LibraryPage.test.tsx

docs/mockups/design-system.html                   # já feito: align-items center + exemplo em Componentes → Aviso
specs/041-pwa-modo-offline/spec.md                # já feito: exceção na FR-007
CLAUDE.md                                         # regra do PWA (041) passa a citar a exceção da 067
```

**Structure Decision**: Tudo no site. O store fica em `features/offline` porque é a feature dona do PWA (041) e já guarda `captureInstallPrompt`; `pages/library` importa pelo `index.ts` (permitido: páginas → features). `main.tsx` (camada `app`) liga o store ao módulo virtual.

## Complexity Tracking

Sem violações a justificar.

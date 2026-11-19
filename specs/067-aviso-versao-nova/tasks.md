# Tasks: Aviso de versão nova no calendário

**Input**: Design documents from `specs/067-aviso-versao-nova/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/app-update.md, quickstart.md

**Tests**: Incluídos. A constituição (II, VII) exige testes unitários sem rede; o store é a parte com risco (guarda de recarga das outras abas, research R2).

**Organization**: por história da spec (US1 atualizar pelo calendário, US3 nada muda fora do calendário, US2 fechar o aviso). US1 e US3 são P1; US3 depende do store da US1 e é sobretudo verificação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 a US3 da spec

Caminhos do site relativos a `apps/web/src/` quando começam por `shared/`, `features/`, `pages/`, `main.tsx` ou `vite-env.d.ts`.

---

## Phase 1: Setup (contrato visual e regra documentada)

**Purpose**: o mockup e a exceção na 041 entram antes do código (CLAUDE.md: regra documentada muda primeiro na spec).

- [X] T001 Commitar sozinhos `docs/mockups/design-system.html` (`.notice` com `align-items: center`; exemplo "Com ação e Fechar, e a ação em espera depois do clique" em Componentes → Aviso) e `specs/041-pwa-modo-offline/spec.md` (exceção da 067 na FR-007), com `docs: add the update notice to the design system and note the 067 exception`, junto com `specs/067-aviso-versao-nova/`

---

## Phase 2: Foundational (tipos e `Notice` com ação em espera)

**Purpose**: o store precisa dos tipos do módulo virtual; o componente precisa de `action.pending`.

- [X] T002 [P] Em `vite-env.d.ts`, ampliar `RegisterSWOptions` de `virtual:pwa-register` com `onNeedRefresh?: () => void`, `onNeedReload?: () => void` e `onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void` (assinaturas de `node_modules/vite-plugin-pwa/dist/client/build/register.js`, research R1, R2, R4)
- [X] T003 [P] Teste em `shared/components/Notice/Notice.test.tsx`: com `action={{ label: 'Atualizando…', onClick, pending: true }}` o botão da ação fica desativado, com `aria-busy="true"`, e o clique não chama `onClick`; sem `pending` continua como hoje
- [X] T004 Em `shared/components/Notice/Notice.tsx`, tipar `action?: { label: string; onClick: () => void; pending?: boolean }` e repassar `pending={action.pending}` ao `Button` da ação (contracts/app-update.md, "Notice (mudança compatível)")

**Checkpoint**: `npx vitest run src/shared/components/Notice` passa; outros usos do `Notice` não mudam.

---

## Phase 3: User Story 1 - Atualizar pelo calendário (Priority: P1) 🎯 MVP

**Goal**: com versão nova esperando, o calendário mostra o aviso; "Atualizar" aplica a versão e recarrega só esta aba.

**Independent Test**: quickstart.md, passos manuais 1–4 e 6; testes do store, do `UpdateNotice` e do `LibraryPage`.

### Tests for User Story 1

- [X] T005 [P] [US1] Teste `features/offline/hooks/useAppUpdate/useAppUpdate.test.ts` com `register` falso (guarda as opções recebidas e devolve um `updateSW` espião), `win` falso (`{ location: { reload }, setTimeout, clearTimeout, document, navigator }`, com `document` = `EventTarget` + `visibilityState` mutável e `navigator = { onLine }`), `vi.useFakeTimers()` e a limpeza devolvida por `installAppUpdate` em `afterEach`: estado inicial `'none'`; `onNeedRefresh` → `'waiting'`; `update()` em `'waiting'` → `'updating'` e chama `updateSW` uma vez; `update()` de novo não chama outra vez; depois de `update()`, `onNeedReload` chama `reload` uma vez; `onNeedReload` sem `update()` antes **não** chama `reload` (FR-008); depois de `update()`, avançar 10 000 ms sem `onNeedReload` chama `reload` (FR-005); `register` recebe `immediate: true`; `onRegisteredSW` com um `registration` falso: disparar `visibilitychange` em `win.document` com `visibilityState` `'visible'` chama `registration.update()`, e não chama com `'hidden'`, com `registration.installing` preenchido, com `win.navigator.onLine === false` ou com `registration` `undefined` (FR-010, research R4)
- [X] T006 [P] [US1] Teste `features/offline/components/UpdateNotice/UpdateNotice.test.tsx`, com `installAppUpdate` chamado com um `register` falso (como em T005) e a limpeza em `afterEach`: sem versão esperando não renderiza nada; com `onNeedRefresh` disparado mostra `role="status"` com "Saiu uma versão nova do Cruzadinha.", botão "Atualizar" e botão "Fechar"; clicar "Atualizar" troca o rótulo para "Atualizando…", botão desativado com `aria-busy`, e "Fechar" some; com o componente já montado e o foco num botão de fora, disparar `onNeedRefresh` dentro de `act` faz o aviso aparecer e `document.activeElement` continua aquele botão (US1 cenário 4, FR-010, FR-012); sem violações do axe (`expectNoA11yViolations` de `src/test/axe`)

### Implementation for User Story 1

- [X] T007 [US1] Criar `features/offline/hooks/useAppUpdate/useAppUpdate.ts` no padrão de `features/offline/hooks/useInstallPrompt/useInstallPrompt.ts` (store de módulo + `useSyncExternalStore`): `type AppUpdateStatus = 'none' | 'waiting' | 'dismissed' | 'updating'`; `installAppUpdate(register: typeof registerSW, win: AppUpdateWindow = window): () => void`, com `type AppUpdateWindow = { location: { reload(): void }; setTimeout(handler: () => void, ms: number): number; clearTimeout(id: number): void; document: EventTarget & { readonly visibilityState: DocumentVisibilityState }; navigator: { readonly onLine: boolean } }` (o `window` real satisfaz o tipo; o teste passa um objeto literal sem cast) e `registerSW` importado só como tipo (`import type`) chama `register({ immediate: true, onNeedRefresh, onNeedReload, onRegisteredSW })`, guarda o `updateSW`, e devolve uma limpeza que remove o ouvinte de `visibilitychange`, cancela o timer e volta o estado a `'none'`/`requested = false`; `onNeedRefresh` só passa de `'none'` para `'waiting'` (fica em `'dismissed'`/`'updating'`); `onNeedReload` chama `win.location.reload()` somente se `requested` (comentário de uma linha citando research R2: o plugin recarregaria todas as abas); `onRegisteredSW` registra o ouvinte de `visibilitychange` em `win.document` (lendo `win.document.visibilityState` e `win.navigator.onLine`, research R4); `useAppUpdate(): { status, update, dismiss }` com as transições de `data-model.md` (`update` só age em `'waiting'`: `'updating'`, `requested = true`, `void updateSW()`, `win.setTimeout(() => win.location.reload(), 10_000)`)
- [X] T008 [US1] Criar `features/offline/components/UpdateNotice/UpdateNotice.tsx`, sem `.module.css` (não tem estilo próprio, como `features/account/components/ResendLink`): `const { status, update, dismiss } = useAppUpdate()`; `null` em `'none'`/`'dismissed'`; senão, com `const updating = status === 'updating'`, `<Notice variant="info" action={{ label: updating ? 'Atualizando…' : 'Atualizar', onClick: update, pending: updating }} onDismiss={updating ? undefined : dismiss}>Saiu uma versão nova do Cruzadinha.</Notice>`
- [X] T009 [US1] Exportar `installAppUpdate` e `UpdateNotice` em `features/offline/index.ts`
- [X] T010 [US1] Em `main.tsx`, trocar `registerSW({ immediate: true })` e o comentário "Sem onNeedRefresh…" por `installAppUpdate(registerSW)` importado de `./features/offline`, com comentário de uma linha: a versão nova só vale com todas as abas fechadas, ou pelo "Atualizar" do calendário (041 FR-007, 067)
- [X] T011 [US1] Em `pages/library/LibraryPage.tsx`, renderizar `<UpdateNotice />` (de `../../features/offline`) logo depois do `<h1>` e antes do aviso de `directPlay`, só no retorno principal da página (não nos estados de carregamento/erro)
- [X] T012 [US1] Teste em `pages/library/LibraryPage.test.tsx`: com `installAppUpdate` chamado com um `register` falso e `onNeedRefresh` disparado, o calendário mostra "Saiu uma versão nova do Cruzadinha." acima das abas de fonte; sem `onNeedRefresh`, nenhum texto de versão nova (SC-005); limpar com a função devolvida em `afterEach`

**Checkpoint**: `npx vitest run src/features/offline src/pages/library src/shared/components/Notice` passa; quickstart passos 1–4 e 6.

---

## Phase 4: User Story 3 - Nada muda fora do calendário (Priority: P1)

**Goal**: nenhuma outra tela mostra o aviso nem recarrega; a 041 continua valendo para quem não atualiza.

**Independent Test**: quickstart.md, passos 2, 4 e 7.

- [X] T013 [P] [US3] Conferir com `grep -rn "UpdateNotice" apps/web/src` que o componente só é usado em `pages/library/LibraryPage.tsx` (FR-003) e que `registerSW` só é chamado em `main.tsx` (fora dele, `virtual:pwa-register` aparece apenas no `declare module` de `vite-env.d.ts` e no `import type` de `useAppUpdate.ts`); `vite.config.ts` continua com `registerType: 'prompt'` e sem `skipWaiting`/`clientsClaim` (research R1)
- [ ] T014 [US3] Validar à mão os passos 2, 4 e 7 de `specs/067-aviso-versao-nova/quickstart.md` (aba do jogo não mostra o aviso e não recarrega quando outra aba toca "Atualizar") e anotar o resultado nas notas do PR

**Checkpoint**: FR-003, FR-007, FR-008 verificados.

---

## Phase 5: User Story 2 - Dispensar o aviso (Priority: P2)

**Goal**: "Fechar" esconde até o próximo carregamento.

**Independent Test**: quickstart.md, passo 5.

- [X] T015 [P] [US2] Em `features/offline/hooks/useAppUpdate/useAppUpdate.test.ts`: `dismiss()` em `'waiting'` → `'dismissed'`; `onNeedRefresh` de novo continua `'dismissed'`; `update()` em `'dismissed'` não chama `updateSW`; depois da limpeza (novo carregamento) e novo `onNeedRefresh`, volta a `'waiting'`
- [X] T016 [P] [US2] Em `features/offline/components/UpdateNotice/UpdateNotice.test.tsx`: clicar "Fechar" esconde o aviso sem chamar `reload`; desmontar e montar de novo o componente (sair e voltar ao calendário) continua sem aviso (FR-006)
- [X] T017 [US2] Ajustar `useAppUpdate.ts` só se T015/T016 falharem (as transições já estão em T007)

**Checkpoint**: FR-006 verificado.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 [P] Em `CLAUDE.md`, na linha "PWA/offline (041)", acrescentar: exceção 067 — o calendário mostra `UpdateNotice` quando um SW novo espera; "Atualizar" manda `SKIP_WAITING` e recarrega só a aba que pediu (`onNeedReload` com guarda, nunca o reload padrão do plugin); `installAppUpdate` em `features/offline` é o único que chama `registerSW`
- [X] T019 Rodar na raiz `npm run format`, `npm run lint` (inclui `check:deps`), `npm run typecheck` e `npm test`
- [ ] T020 Rodar os passos manuais restantes de `specs/067-aviso-versao-nova/quickstart.md` (1, 3, 5, 6, 8, 9 e 10: tempo do toque até a versão nova abaixo de 5 s (SC-001), sem rede, 390 px e fila de salvamentos pendentes preservada (FR-009, SC-003)) e registrar o resultado no PR
- [X] T021 Commits em inglês: `feat(web): show a new-version notice on the calendar` (código e testes) e `docs: describe the calendar update notice` (CLAUDE.md, tasks marcadas)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 (Phase 3) → US3 (Phase 4) e US2 (Phase 5) em qualquer ordem → Polish.
- T002, T003 em paralelo; T004 depois de T003.
- US1: T005 e T006 (testes) em paralelo, antes de T007/T008; T007 → T008 → T009 → T010, T011 → T012.
- US3 e US2 dependem de T007–T011.

## Parallel Example: User Story 1

```text
T005 useAppUpdate.test.ts   |  T006 UpdateNotice.test.tsx
```

## Implementation Strategy

- **MVP**: Phases 1–3 (US1) entregam o aviso com "Atualizar" já seguro para as outras abas (a guarda está em T007).
- US3 é verificação da garantia herdada da 041; US2 só testa "Fechar", que T007/T008 já implementam.
- Uma release só (`feat(web)`, minor do web); API e `shared` não mudam.

# Implementation Plan: Modo rascunho (lápis) com letras provisórias

**Branch**: `feat/043-modo-rascunho` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/043-modo-rascunho/spec.md` (issue #90)

## Summary

O jogo ganha um lápis: com ele ligado, a letra digitada vai para uma camada de rascunho (`draft`) paralela às letras definitivas (`cells`), desenhada em itálico, mais leve e menor. O rascunho nunca entra em `cells`, então conclusão, risco de pista, cópia da pista, verificação e salvamento (conta e visitante) continuam iguais sem mudar uma linha. A regra é toda do reducer puro (`domain/game`): ações novas `setPencil`, `confirmDraft` e `discardDraft`, `type`/`backspace`/`delete` cientes do lápis, e uma invariante aplicada depois de cada ação (casa com letra definitiva ou travada não tem rascunho; conclusão e reinício zeram o rascunho). O rascunho fica só no aparelho, no `localStorage` (`cruzadinha:draft:<dono>:<puzzleId>`, dono = id da conta ou `guest`), no mesmo molde das ajudas da conta (`help-storage.ts`), e segue as regras de dono e de limite da feature 041 (`clearAccountData`, `discardOtherAccounts`, cruzada protegida, apagado quando a cópia sai). A preferência do lápis é `cruzadinha:pencil`. Só o site muda: nenhuma rota, schema de `shared`, tabela ou contrato de salvamento. Decisões em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6 strict, Node.js 24

**Primary Dependencies**: React 19, Vite 8, Zod (já instalados; nenhuma dependência nova)

**Storage**: `localStorage` do navegador (rascunho por dono e cruzada, preferência do lápis); IndexedDB `cruzadinha-offline` só lido/alterado pelas regras de limite já existentes. Nada no servidor.

**Testing**: Vitest 5 (jsdom + Testing Library + `vitest-axe`, `fake-indexeddb`); Playwright para o caminho do lápis e para `e2e/sem-saltos.spec.ts`

**Target Platform**: site estático (Cloudflare Pages), celular e computador, modo claro e escuro, PWA (feature 041)

**Project Type**: web (só `apps/web`)

**Performance Goals**: digitar com o lápis redesenha só as células que mudaram (`Cell` continua `memo`); gravação do rascunho é um `setItem` pequeno por mudança

**Constraints**: nenhum deslocamento de layout ao ligar o lápis ou digitar (FR-013); compatível com a versão anterior do site aberta em outra aba (o registro do visitante não ganha campo, ver research R1); nada bloqueia o jogo se o armazenamento falhar

**Scale/Scope**: 1 camada nova no estado do jogo, 3 ações novas, 1 módulo de armazenamento, 1 componente de controles, ajustes em `Cell`, `Board`, `GameScreen`, `useGame` e nas regras de dono/limite do `offline`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
| --- | --- |
| I. TypeScript estrito, schemas em `shared` | Nada compartilhado com a API (rascunho nunca sai do aparelho); o que vem do `localStorage` entra como `unknown` e passa por um schema Zod (`draftSchema`). ✅ |
| II. Qualidade automatizada | Sem mudança nos portões; `check:deps` cobre o novo arquivo em `features/offline` (game → offline já permitido). ✅ |
| III. Rota → serviço → repositório | Não toca a API. ✅ |
| IV. Adaptadores de fonte | Não toca fontes. ✅ |
| V. Lógica de jogo pura | Toda regra do lápis no reducer de `domain/game`, sem React, com teste unitário por regra (digitar, apagar, prioridade da definitiva, confirmar, descartar, ajudas, conclusão, reinício). ✅ |
| VI. Segurança e privacidade | Rascunho do visitante nunca vai ao servidor; rascunho da conta também não. Chave por dono: visitante e contas nunca se veem; sair da conta e outra conta entrar apagam (FR-017). Não guarda solução. ✅ |
| VII. Testes sem internet | Unitários com `localStorage` do jsdom e `fake-indexeddb`; e2e local. ✅ |
| VIII. Conteúdo de terceiros | O rascunho é anotação da pessoa; a cópia offline continua limitada a 60. ✅ |
| IX. Migração | Sem banco. ✅ |
| Fluxo: Context7 | Nenhuma API de biblioteca nova: reaproveita padrões já usados (`useReducer`, `z.array`/`nullable`, `readStorage`). Nada a consultar (research R7). ✅ |

Sem violações; Complexity Tracking vazio.

**Re-check pós-design**: o design mantém todos os itens. Ponto de atenção: o plano guarda o rascunho em chave própria, porque uma aba com a versão anterior do site apaga um registro de visitante com campo desconhecido (research R1); a duração e o dono pedidos se mantêm. A spec e o plano agora concordam (clarificação, FR-009, FR-018 e entidade Progresso da cruzada). ✅

## Project Structure

### Documentation (this feature)

```text
specs/043-modo-rascunho/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── reducer-actions.md
│   └── device-storage.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── domain/game/
│   ├── state.ts                 # GameState ganha `draft` e `pencil`; emptyCells reaproveitado
│   ├── reducer.ts               # setPencil, confirmDraft, discardDraft; type/backspace/delete; invariante
│   └── draft.ts                 # puras: pruneDraft, wordHasDraft, hasAnyDraft (+ draft.test.ts)
├── features/offline/
│   ├── services/draft/draft.ts  # cruzadinha:draft:<dono>:<puzzleId>: load/save/clear/list (+ teste)
│   ├── services/outbox-owner/outbox-owner.ts    # clearAccountData/discardOtherAccounts apagam rascunhos
│   ├── services/offline-store/offline-store.ts  # protectedIds inclui rascunhos; remoção apaga rascunho
│   └── index.ts                 # exporta loadDraft, saveDraft, clearDraft
├── features/game/
│   ├── services/pencil-preference.ts            # cruzadinha:pencil
│   ├── hooks/useGame.ts         # hidrata rascunho e lápis; grava a cada mudança; limpa em Jogar de novo
│   ├── components/controls/DraftControls/       # lápis (aria-pressed), confirmar, descartar
│   ├── components/board/Cell/   # prop `draft`, classe `.draft`
│   ├── components/board/Board/  # passa o rascunho e descreve a casa ("rascunho A")
│   └── components/GameScreen/   # coloca DraftControls na faixa, só jogando
└── e2e/
    ├── rascunho.spec.ts         # anotar, recarregar, confirmar, concluir
    └── sem-saltos.spec.ts       # mede também digitar com o lápis
```

**Structure Decision**: só `apps/web`. A regra fica em `domain/game` (pura). O armazenamento do rascunho fica em `features/offline` porque as regras de dono e de limite da 041 precisam dele e `offline` não pode importar `game` (ordem `session < guest < offline < library < settings < game`); `game` já importa `offline` pelo `index.ts`. A preferência do lápis é só do jogo e fica em `features/game/services`, no formato plano já usado ali (`help-storage.ts`).

## Complexity Tracking

Sem violações.

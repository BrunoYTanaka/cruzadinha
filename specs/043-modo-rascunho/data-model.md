# Data Model: Modo rascunho (lápis)

Nada muda no servidor, em `packages/shared` nem no registro do visitante (`GuestProgress`). Sem DDE/ERD novos (não há tabela).

## 1. `GameState` (domain/game/state.ts)

| Campo | Tipo | Regra |
| --- | --- | --- |
| `draft` (novo) | `(string \| null)[][]` | Mesmas dimensões da grade; maiúsculas A–Z e Ç; `null` em bloco, casa vazia, casa com definitiva ou travada. Vazio em `mode: 'completed'`. |
| `pencil` (novo) | `boolean` | Lápis ligado. Começa `false`; o hook aplica a preferência do aparelho na abertura. |

Invariante (aplicada por `pruneDraft` no fim de cada ação): para toda casa, `draft != null ⇒ cells == null && !locked`; `mode === 'completed' ⇒ draft` todo `null`.

### Transições

| Ação | Efeito no rascunho |
| --- | --- |
| `setPencil { on }` | Só muda `pencil` (jogando). |
| `type` com lápis | Grava/substitui o rascunho da casa livre; casa com definitiva/travada é ignorada; cursor avança como hoje. |
| `type` sem lápis | Definitiva como hoje; rascunho da casa some. |
| `backspace`/`delete` com lápis | Apagam só rascunho, mesmo movimento de cursor de hoje. |
| `backspace`/`delete` sem lápis | Apagam a letra visível (definitiva não travada ou rascunho). |
| `confirmDraft` | Rascunho da palavra ativa → `cells`; depois `finish` (pode concluir). |
| `discardDraft` | Apaga o rascunho da palavra ativa. |
| `revealLetter`/`revealWord` | Casa revelada perde o rascunho (invariante). |
| `hydrate { cells, help, draft? }` | Aplica o rascunho guardado, filtrado pela invariante. |
| conclusão (`finish`), `viewServerProgress`, `reset` | Rascunho todo vazio. |

## 2. Rascunho no aparelho (features/offline/services/draft)

- Chave: `cruzadinha:draft:<dono>:<puzzleId>`; `dono` é o `userId` (UUID) ou o literal `guest`.
- Valor: `{ "v": 1, "cells": (string | null)[][] }`, lido com `draftSchema` (Zod, estrito; letras A–Z e Ç ou `null`). Valor inválido é ignorado e removido.
- Escrita: a cada mudança de `state.draft` jogando; rascunho todo vazio remove a chave.
- Remoção: conclusão, reinício/"Jogar de novo", abertura de cruzada concluída, `clearAccountData(userId)`, `discardOtherAccounts(userId)` (todas as contas diferentes, nunca `guest`), remoção da cruzada pelo limite de 60.
- Sessão expirada: nada é apagado.

## 3. Preferência do lápis (features/game/services/pencil-preference.ts)

- Chave: `cruzadinha:pencil`, valor `'1'` (ligado) ou ausente (desligado). Por aparelho, fora de `settingsSchema` (não sincroniza).

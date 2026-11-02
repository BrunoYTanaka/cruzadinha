# Research: Migrar progresso de visitante

**Decision 1 — Um endpoint em lote, `POST /api/progress/import`.**
Rationale: usar `PUT /api/progress/:id` por cruzada daria 1.464 chamadas, e o `PUT` não aceita `completedAt`/`bestMs` do visitante nem tem a regra "concluída não é sobrescrita" sem erro 409. Alternativas: laço de `PUT` (lento, perde recorde); um único pedido gigante (corpo grande, transação longa).

**Decision 2 — Lotes de 100 itens por pedido, uma transação por item.**
Rationale: uma linha travada por vez evita bloqueio longo; falha de um item não derruba os outros (FR-008). Máximo de 100 itens validado no esquema.

**Decision 3 — Regra `decideImport(current, incoming, now)`, pura.**
- `savedAt` do item além da tolerância (`savedAtTooFar`) → `rejected`.
- conta `completed` → `kept` (nunca muda, nem o recorde).
- `incoming.savedAt <= current.savedAt` → `kept` (empate também; torna o reenvio idempotente).
- senão → `imported`: copia células, tempo, situação, `completedAt`, `finishedMs`; recorde = o menor entre `incoming.bestMs` e `current.bestMs` (com seu `bestAt`).
Linha nova de `ensureRow` tem `savedAt` na época, então o item sempre vence.
Alternativa rejeitada: reaproveitar `decideSave` — define `completedAt = now` e devolve 409 em vez de contar.

**Decision 4 — Validação por item.** `cellsMatchGrid` contra a grade da cruzada; item de cruzada inexistente → `rejected` (`puzzle-unavailable`). Coerência: `completed` exige `completedAt` e `finishedMs`; `in_progress` exige os dois nulos (Zod `superRefine`).

**Decision 5 — Limite.** Um `reserve` de `PROGRESS_SAVE` por pedido (não por item): 15 pedidos para o pior caso cabem nos 1800/h. `429` com `Retry-After` como nas outras rotas; o site espera e repete o lote.

**Decision 6 — Ajudas não vão.** A tabela `progress` não tem coluna de ajudas e o `PUT` normal também não as leva; nada muda. Spec ajustada (Assumptions e edge case).

**Decision 7 — Limpeza local segura.** Novo `guestStore.removeIfUnchanged(puzzleId, savedAt)`: apaga só se o registro ainda tem o `savedAt` lido. O rascunho de visitante da cruzada (`cruzadinha:draft:guest:<id>`) é apagado junto. Itens `rejected` ficam.

**Decision 8 — Quando oferecer.** `ImportOffer` em `AppLayout`: há conta (`useViewer`) e `guestStore.getAll()` não vazio e a pessoa não escolheu "Agora não" nesta carga da página. "Agora não" guarda em variável de módulo (reaparece na próxima carga/entrada). Descartar: segundo passo de confirmação no mesmo `Dialog`, depois `removeIfUnchanged` em tudo.

**Decision 9 — Feature web nova `features/import`** na ordem `session < guest < offline < import < library`; importa `session`, `guest` e `offline` (`clearDraft`) e `shared`/`domain`.

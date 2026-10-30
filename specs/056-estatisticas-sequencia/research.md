# Research

- **Onde calcular**: função pura em `shared` (`computeStats(rows, today)`). Alternativa: SQL no servidor + código separado no site para visitante. Rejeitada: duas regras de sequência divergem.
- **Dia da conclusão**: `completed_at` convertido para data em `America/Sao_Paulo` (helpers de `platform/lib/dates.ts` no servidor; o `shared` recebe `completedAt` ISO e usa `Intl` com o fuso fixo, sem dependência).
- **Sequência atual**: dias distintos ordenados; parte de hoje se há conclusão hoje, senão de ontem, senão 0. Maior sequência: maior corrida de dias consecutivos.
- **Recorde**: `best_ms` mínimo por fonte (inclui reiniciadas). **Média/total**: só linhas `completed` (`finished_ms`).
- **Limite de consultas**: nenhum (leitura própria, como `/api/library`); evita nova ação em `rate_limit_attempts` e migração.
- **Linhas lidas**: `progress JOIN puzzles` por `user_id`, colunas `source, status, finished_ms, completed_at, best_ms`. Índice da PK `(user_id, puzzle_id)` cobre o filtro.
- **Visitante**: o guest store já guarda status, tempo e recorde por puzzle; mapear para as mesmas linhas de entrada. Fonte do puzzle vem do registro; se faltar, o puzzle fica fora (verificar em `guest-store.ts` na implementação).
- **API antiga**: `GET /api/stats` 404 → tela mostra "indisponível" para conta; visitante não depende da API.

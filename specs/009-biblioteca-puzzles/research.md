# Research: Biblioteca de puzzles

Decisões que o plano precisa fixar; nada ficou como `NEEDS CLARIFICATION`.

## 1. Uma consulta, só metadados

- **Decisão**: `SELECT` em `puzzles` com `LEFT JOIN progress ON progress.puzzle_id = puzzles.puzzle_id AND progress.user_id = $usuario`, `ORDER BY date DESC, level, puzzle_id`, `LIMIT 366`. Colunas: `puzzle_id`, `level`, `date` e, de `progress`, `status`, `elapsed_ms`, `finished_ms`, `completed_at`, `best_ms`, `best_at` e um indicador `has_letters`.
- **Por quê**: cumpre FR-001 a FR-007 sem N+1; não ler `data`, `solution` nem `cells` mantém a resposta leve (FR-006) e a consulta rápida (SC-003). Filtrar o usuário no `ON` (e não no `WHERE`) preserva os puzzles sem progresso (FR-002/FR-003) e garante o isolamento (FR-008).
- **Alternativas**: buscar puzzles e progressos separadamente e cruzar em memória (duas idas ao banco, e leitura de colunas grandes); `INNER JOIN` (perderia os "não iniciado").

## 2. "Tem letras" calculado no banco

- **Decisão**: `has_letters` vem de `jsonb_path_exists(progress.cells, '$[*][*] ? (@ != null)')`, sem trazer a matriz. Se essa expressão não se comportar como esperado no Postgres 17 durante a implementação, o fallback é ler `cells` e calcular no serviço, descartando-as antes da resposta (o contrato não muda).
- **Por quê**: "em andamento" exige distinguir progresso com letras de uma linha vazia (criada por `ensureRow`/reinício) e o JSON das letras não deve sair do banco só para isso.
- **Alternativas**: coluna derivada nova (exige migração por pouco ganho).

## 3. Derivação da situação

- **Decisão**: função pura `toLibraryItem(row)`: sem linha → `not_started`; `status = 'completed'` → `completed`; `in_progress` com `has_letters` → `in_progress`; `in_progress` sem letras → `not_started`. `elapsedMs` só preenchido em `in_progress`; `finishedMs`/`completedAt` só em `completed` (já garantido pelos checks do banco); `bestMs`/`bestAt` vêm sempre que existirem, qualquer que seja a situação.
- **Por quê**: regras da spec (FR-003, FR-004, casos de borda de reinício e linha vazia), testáveis sem banco.
- **Alternativas**: um valor de situação a mais para "reiniciado com recorde" (a spec pede só três situações; o recorde já aparece em `bestMs`).

## 4. Limite e ordem

- **Decisão**: `LIMIT 366`, sem paginação, constante `LIBRARY_LIMIT` em `shared`. Ordem `date DESC, level ASC, puzzle_id ASC` (estável). Sem índice novo: com no máximo alguns milhares de linhas na tabela, o plano usa varredura e ordenação em memória, bem abaixo de 1 s.
- **Por quê**: FR-002 e FR-007; paginação e filtros cabem numa feature futura sem quebrar o contrato (campo `items` já em objeto).
- **Alternativas**: cursor/paginação agora (peso sem demanda); índice `(date DESC)` (otimização prematura).

## 5. Fora do limite da fonte

- **Decisão**: o serviço da biblioteca não recebe `PuzzleSource` nem o limitador `PUZZLE_FETCH` como dependências. O teste de integração injeta uma fonte que lança se chamada e confere que o contador de tentativas não muda.
- **Por quê**: FR-005 vira garantia estrutural (sem dependência, não há como chamar) e verificável.
- **Alternativas**: reaproveitar `PuzzlesService` com flag "só cache" (mistura responsabilidades e arrisca regressão).

## 6. Resposta como objeto

- **Decisão**: corpo `{ items: LibraryItem[] }`, não um array puro.
- **Por quê**: permite acrescentar campos (`nextCursor`, filtros aplicados) sem quebrar clientes; segue o padrão de envelope de `progress`.

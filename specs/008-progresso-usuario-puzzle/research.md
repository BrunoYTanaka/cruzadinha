# Research: Progresso do usuário em cada puzzle

Decisões que o plano precisa fixar; nada ficou como `NEEDS CLARIFICATION`.

## 1. Chave e remoção

- **Decisão**: chave primária composta `(user_id, puzzle_id)`. `user_id` referencia `users` com `ON DELETE CASCADE`; `puzzle_id` referencia `puzzles` com `ON DELETE RESTRICT`.
- **Por quê**: garante FR-001 no banco, sem duplicata mesmo em corrida; o cascade cumpre FR-014 (conta removida leva o progresso); o restrict impede apagar um puzzle com progresso em silêncio.
- **Alternativas**: id próprio + índice único (campo a mais sem uso); `ON DELETE CASCADE` no puzzle (apagaria histórico de jogadores).

## 2. Formato das letras (`cells`)

- **Decisão**: coluna `jsonb` com a mesma forma da solução: matriz `height x width`; `null` em bloco e em célula aberta vazia; uma letra maiúscula em célula preenchida. Validação em `shared` (`cellsMatchGrid(grid, cells)`): dimensões iguais às da grade, bloco sempre `null`, célula aberta `null` ou exatamente uma letra já em maiúscula (`toLocaleUpperCase('pt-BR')`, mesma regra de `rules.ts`).
- **Por quê**: o front compara direto com a solução; reaproveita a regra existente; recusar minúscula em vez de normalizar mantém um único formato guardado (spec, último caso de borda: "normalizadas ou recusadas").
- **Alternativas**: string plana por linha (mais compacta, mas perde a simetria com `solution`); normalizar no servidor (esconde bug do cliente).

## 3. Situação, tempos e conclusão

- **Decisão**: `status` ∈ `in_progress | completed` (texto com `CHECK`). Colunas: `elapsed_ms` (tempo da partida atual), `completed_at` e `finished_ms` (momento e tempo total da conclusão da partida atual, ambos nulos até concluir e limpos no reinício), `best_ms` e `best_at` (menor `finished_ms` já obtido e o momento em que foi obtido; esclarecimento de 2026-10-13: o sistema guarda o recorde e a data dele, não a última conclusão). Ao salvar `completed`, o servidor define `completed_at = agora` (relógio do servidor, nunca do cliente), `finished_ms = elapsed_ms` e, se não há `best_ms` ou `finished_ms < best_ms` (estritamente), `best_ms = finished_ms` e `best_at = completed_at`.
- **Por quê**: cumpre FR-002 e FR-007; o instante de conclusão vindo do servidor evita datas absurdas; o tempo continua vindo do cliente (spec: sem placar competitivo).
- **Alternativas**: calcular o tempo no servidor por diferença de relógio (quebra com pausa de aba e vários dispositivos).

## 4. Ordem dos salvamentos

- **Decisão**: o `PUT` leva `savedAt` (instante do cliente, ISO-8601 com fuso). A coluna `saved_at` guarda o do último salvamento aplicado. Um `PUT` com `savedAt` menor que o guardado não altera nada e responde `200` com o estado atual (o corpo é sempre o estado resultante). `savedAt` mais de 5 minutos à frente do relógio do servidor é `invalid-input`.
- **Por quê**: o front repete envios após falha (design, item 10), então reordenação é esperada (FR-010); devolver o estado atual deixa o cliente se reconciliar sem um código de erro novo.
- **Risco aceito**: relógio de um dispositivo muito adiantado (até 5 min) pode fazer salvamentos de outro dispositivo serem ignorados até o tempo alcançar. Aceitável num site privado de jogo casual.
- **Alternativas**: contador `revision` por registro (exige leitura antes de cada salvamento e conflita entre dispositivos); `If-Match` com `updated_at` (mais cerimônia sem ganho aqui).

## 5. Conclusão não se desfaz; reinício é explícito

- **Decisão**: se o registro está `completed`, um `PUT` com `in_progress` ou com letras diferentes responde `409 progress-completed`; um `PUT` `completed` repetido é idempotente (não muda `completed_at`, `finished_ms`, `best_ms` nem `best_at`). `POST /api/progress/:puzzleId/reset` zera `cells` e `elapsed_ms`, volta `status` para `in_progress`, limpa `completed_at` e `finished_ms`, mantém `best_ms` e `best_at` e avança `saved_at` para `max(saved_at, agora)`, de modo que salvamentos atrasados anteriores ao reinício sejam ignorados.
- **Por quê**: FR-008, FR-009 e FR-010 juntos; o reinício sem registro prévio cria uma linha vazia (idempotente).
- **Alternativas**: `DELETE` (perderia o melhor tempo, contra FR-008).

## 6. Concorrência

- **Decisão**: em uma transação: `INSERT ... ON CONFLICT DO NOTHING` do registro vazio, `SELECT ... FOR UPDATE`, decisão em função pura (`decideSave(current, request, now)`), `UPDATE`. Duas escritas simultâneas do mesmo par se serializam na trava de linha.
- **Por quê**: SC-005 (nunca duas linhas, nunca conclusão desfeita) sem depender de lógica de aplicação frágil; a função pura é testável sem banco (constituição VII).
- **Alternativas**: um único `INSERT ... ON CONFLICT DO UPDATE ... WHERE` (as regras de `best_ms` e de conclusão ficam ilegíveis em SQL).

## 7. Limite de tempo e tamanho

- **Decisão**: `elapsedMs` inteiro de 0 a 604 800 000 (7 dias); coluna `integer` com `CHECK` equivalente. O corpo cabe no limite padrão de corpo do Fastify (grade máxima 30 x 30).
- **Por quê**: FR-006 pede um "limite razoável"; sete dias cobre um jogador que deixa a aba aberta e cabe em `integer`.

## 8. Puzzle inexistente e isolamento

- **Decisão**: id malformado ou inexistente → `404 puzzle-unavailable` (código já existente). O identificador do usuário vem sempre da sessão; não há rota que aceite `userId`. Sem progresso → `200 { progress: null }`.
- **Por quê**: FR-004, FR-011, FR-013; não há caminho em que se pergunte pelo progresso de outro usuário, então não há o que vazar.

## 9. Erros novos

- **Decisão**: um código novo, `progress-completed` (409), em `apiErrorCodeSchema`, com mensagem genérica. `invalid-input` cobre formato, dimensão, letra e tempo; os `fields` nomeiam só campos, nunca valores.
- **Por quê**: o front precisa distinguir "conclusão protegida" de erro de validação para não repetir o envio.

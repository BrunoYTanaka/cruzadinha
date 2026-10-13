# Research: Resposta no puzzle entregue ao front-end

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Não havia `NEEDS CLARIFICATION`. As decisões abaixo fecham os pontos de desenho. Nenhuma biblioteca nova nem API de biblioteca muda, então a consulta ao Context7 não se aplica (só regra de negócio própria e contrato Zod já usado).

## 1. Onde fica a solução na resposta

- **Decisão**: campo irmão `solution` ao lado de `puzzle`: `{ puzzleId, puzzle, solution }`.
- **Rationale**: preserva a separação entre parte pública e solução que o formato interno e o banco já têm (`puzzleSchema` sem campo de letras, `solutionSchema` à parte). Os consumidores existentes de `puzzle` não mudam, e o front recebe exatamente o formato que o servidor guarda (FR-002).
- **Alternativas**: embutir letras dentro de `puzzle.grid.cells` (quebra a separação e o `puzzleSchema`); rota separada `/solution` (mais uma ida ao servidor, contra SC-003).

## 2. Validação do par antes de entregar

- **Decisão**: o serviço chama `validatePuzzleWithSolution` ao entregar um puzzle guardado (por data e por id) e, se falhar, lança erro. O manipulador de erros da app responde `500 internal-error` genérico e registra só nome e código do erro.
- **Rationale**: FR-003 pede falha genérica sem detalhes. A função já existe e é a mesma usada na gravação. O custo é linear no tamanho da grade. Lançar erro reaproveita o caminho que `toStored` já usa para JSON inválido, sem criar código de erro novo.
- **Alternativas**: `502 puzzle-source-failed` (semanticamente errado: o dado já estava guardado); confiar só na validação feita ao gravar (não cobre dado antigo ou alterado à mão); novo código de erro (ampliaria o contrato sem ganho).

## 3. Contrato compartilhado

- **Decisão**: `puzzleResponseSchema` (strictObject) passa a exigir `solution: solutionSchema` e ganha `superRefine` que aplica `validatePuzzleWithSolution`, para que `safeParse` no front rejeite resposta incoerente.
- **Rationale**: mantém `shared` como contrato único (princípio I) e dá ao front a mesma garantia que o servidor. `strictObject` continua recusando campos extras desconhecidos.
- **Alternativas**: schema sem refinamento (o front teria de revalidar por conta própria).

## 4. Sem mudança de dados nem de adaptador

- **Decisão**: nenhuma migração, coluna ou reprocessamento. A coleta e o seed já gravam a solução; o repositório já a devolve em `StoredPuzzle`.
- **Rationale**: FR-007 e SC-005 (puzzles antigos passam a sair com solução sem tocar nos dados).
- **Alternativas**: nenhuma relevante.

## 5. Garantias de não vazamento

- **Decisão**: manter e ajustar os testes: erros 400/401/404/429/502 e o corpo de falha nunca contêm `solution` nem as letras; o log do erro de par inválido não inclui a solução (`describeError`); os exemplos da documentação OpenAPI não incluem letras reais. A asserção de `docs.test.ts` que proíbe a palavra `solution` no documento é trocada por uma checagem de que nenhum exemplo traz letras de puzzle real.
- **Rationale**: FR-005 e FR-006 passam a ser o que protege o dado agora que o caminho feliz o entrega.
- **Alternativas**: remover os testes de ausência (perderia a proteção dos caminhos de erro).

## 6. Documentação existente a atualizar

- **Decisão**: atualizar FR-002 e SC-004 e o contrato da 006 (com uma nota apontando para a 007), o item 30 e a seção do modelo de dados de `docs/design.md`, e a linha da feature 006 em `CLAUDE.md`.
- **Rationale**: FR-010 da spec 007 e o plano de migração da emenda 3.0.0 exigem que a documentação não contradiga a constituição.
- **Alternativas**: deixar a 006 como histórico sem nota (contradiria a regra vigente).

# Data Model: Viabilidade da fonte de puzzles

Estruturas em memória da ferramenta. Não há banco.

## Verdict (Veredito de viabilidade)

| Campo | Descrição |
|---|---|
| `status` | `viable` \| `not-viable-login` \| `inconclusive` |
| `reason` | texto curto e legível que explica o status |
| `inconclusiveCause` | quando `inconclusive`: `source-down` \| `unexpected-format` \| `rate-limited` \| `visitor-credentials-missing` (acesso negado com o token anônimo e sem `x-key` no ambiente) \| `no-puzzle-found` (sem puzzle após 2 datas anteriores) |
| `stage` | etapa de descoberta em que o resultado foi decidido (ver `research.md`, item 6) |
| `executedAt` | data e hora da execução |

**Regras**: `rate-limited` cobre tanto o limite de uso sinalizado pela fonte quanto o esgotamento do orçamento de 6 pedidos da própria verificação; o `reason` diz qual ocorreu. Sem puzzle após 2 datas anteriores também é `inconclusive`. `inconclusive` nunca é tratado como `not-viable-login` (FR-003, história 1 cenário 3). Todo veredito tem `reason` não vazio (SC-002).

## PuzzleSummary (Resumo do puzzle)

| Campo | Descrição |
|---|---|
| `date` | data do puzzle diário (AAAA-MM-DD) |
| `gridWidth`, `gridHeight` | dimensões da grade |
| `wordCount` | quantidade de palavras |
| `clueCount` | quantidade de dicas |
| `hasSolution` | a solução veio incluída |
| `complete` | grade, dicas e solução presentes para uso no jogo |
| `missing` | o que faltou: `grade`, `dicas` e/ou `solução` |

**Regras**: a solução deve sempre vir. Se faltar grade, dicas ou solução, `complete = false` e o veredito é `inconclusive` com causa `unexpected-format`, citando o que faltou; nunca `viable` (edge case do spec).

## SourceCatalog (Catálogo da fonte)

| Campo | Descrição |
|---|---|
| `dailyDates` | datas com puzzle do nível diário; vazio se a fonte não fornece a listagem |
| `listingAvailable` | a fonte fornece listagem de datas |
| `unavailableDates` | datas consultadas que vieram sem puzzle |

**Regras**: data sem puzzle vira `unavailable`, não falha da fonte (FR-006). Só o nível diário é consultado (FR-005).

## PuzzleSample (Amostra sanitizada)

| Campo | Descrição |
|---|---|
| `source` | `oglobo` |
| `level`, `date` | identificação do puzzle |
| `capturedAt` | data da captura |
| `attribution` | atribuição à fonte (princípio VIII) |
| `formatMatched` | a resposta bateu com o schema presumido; `false` ainda é gravado, para ajustar o schema |
| `payload` | corpo da resposta com credenciais e dados pessoais removidos |

**Regras**: antes de gravar, `sanitize` remove qualquer campo ou cabeçalho que seja credencial, token, cookie ou dado pessoal. A amostra só é gravada se a sanitização não deixar nenhum valor suspeito (FR-008, FR-009).

## ProbeReport (Relatório da execução)

Agrega `Verdict`, `PuzzleSummary?`, `SourceCatalog?`, a trilha das etapas executadas e a recomendação de próximo passo (FR-011): `proceed` (seguir com a fonte), `back-to-design` ou `investigate` (veredito inconclusivo: corrigir a causa e repetir).

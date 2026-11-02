# Contrato da API: /api/duels

Todas as rotas: `schema` OpenAPI, `createOptionalSession`, `POST` com corpo estrito (nenhuma credencial em URL), respostas tolerantes. Credencial = sessão (vale mais) **ou** `participantToken` no corpo. Erros genéricos; `404 not-found` idêntico para código/link inexistente e duelo não aberto.

| Rota | Corpo | Resposta 200 | Erros |
|---|---|---|---|
| `POST /api/duels` | `{ puzzleId, rules: { helpMode, helpPenaltyMs?, maxMs\|null, startDeadlineHours }, nickname }` | `{ linkToken, code, participantToken?, duel: DuelView }` (`participantToken` só para visitante) | `400 invalid-input` (inclui apelido ausente), `409 open-limit`, `404 puzzle-unavailable`, `429` |
| `POST /api/duels/lookup` | `{ code } \| { linkToken }` | `{ linkToken, rules, puzzleDate, source, creatorNickname }` (só `open`; `linkToken` deixa o site abrir `/x1/<linkToken>` depois de uma busca por código) | `404 not-found`, `429` |
| `POST /api/duels/start` | `{ linkToken, nickname }` (+ `participantToken?`; o criador inicia por aqui sem ocupar vaga) | `{ participantToken?, duel: DuelView, puzzleId, startedAt, serverNow }` | `404`, `409 duel-taken`, `409 own-duel`, `400 invalid-input`, `429` |
| `POST /api/duels/decline` | `{ linkToken }` | `{ duel: DuelView }` | `404`, `409` |
| `POST /api/duels/state` | `{ linkToken, participantToken? }` | `{ duel: DuelView, puzzleId?, serverNow }` (`puzzleId` só depois de a pessoa começar) | `404`, `401` só se a sessão for inválida |
| `POST /api/duels/finish` | `{ linkToken, participantToken?, helpsUsed }` | `{ duel: DuelView }` (`reason: 'timeout'` se passou do máximo) | `404`, `409 not-running` |
| `POST /api/duels/forfeit` | `{ linkToken, participantToken? }` | `{ duel: DuelView }` | `404`, `409` |
| `POST /api/duels/cancel` | `{ linkToken, participantToken? }` | `{ duel: DuelView }` | `404`, `409 not-open` |
| `POST /api/duels/mine` | `{ participantTokens?: string[] (≤ 20) }` | `{ duels: DuelSummary[] }` (`open`, `running` e `finished` nas últimas 24 h; cada item traz `linkToken` e `attention`; logado por `user_id`, visitante pelos tokens; a sessão vence) | `400`, `429` |

`DuelView` inclui `duelId` (chave local do progresso do duelo) e `linkToken` só para participantes e nunca traz o tempo do oponente antes do resultado final: antes disso só `myStatus` (`playing`, `waiting-other`) e `opponentStatus` (`not-joined`, `playing`, `done`). Depois do resultado traz `outcome`, `diffMs`, tempos, penalidades e ajudas dos dois. `serverNow` permite ao site calcular o deslocamento do relógio. A rota `GET /api/puzzles/:id` existente continua a entregar a cruzada; o duelo só informa o `puzzleId` depois do "Começar".

## Compatibilidade

Rotas novas; nenhum esquema existente muda. Site novo sobre API antiga recebe 404 e mostra "O x1 não está disponível agora".

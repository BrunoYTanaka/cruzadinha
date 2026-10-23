# Contrato: mudanças na API

| Rota | Mudança |
|------|---------|
| `GET /api/puzzles?source=clube&level=daily&date=` | `source` aceita `clube`. Dia salvo: `200 { puzzleId, puzzle, solution }`. Dia não salvo (passado, futuro ou lacuna): `404 puzzle-unavailable`, sem pedido à fonte e sem consumir o limite `PUZZLE_FETCH`. |
| `GET /api/puzzles/:id` | Sem mudança de forma; devolve puzzles `clube` pelo id. |
| `GET /api/library?source=clube` | `source` aceita `clube`; mesmas regras de estado/tempos e limite de 366 por fonte. Item traz `source: 'clube'`. |
| `GET /api/auth/*`, `/api/progress/*`, `/api/settings` | Sem mudança. |

Sem `source` continua valendo `oglobo` e nunca devolve puzzle `clube` (teste de integração). `source=<desconhecida>` continua `400`.

## Compatibilidade (duas releases)

1. **Release A** (`shared` + API): aceita e coleta `clube`; o site antigo nunca pede `clube`, então não vê a fonte.
2. **Release B** (site): aba e cartão `clube`. Site novo contra a API anterior: `?source=clube` responde 400; o site trata como fonte indisponível sem afetar as outras.

## CLI

- `puzzles collect`: uma linha por fonte, agora três; falha ou limite em uma não impede as outras.
- `npm run source:check:clube -w @cruzadinha/api -- [YYYY-MM-DD ...] [--save]`: verificação sob demanda (uma linha por edição, sem conteúdo). A data é opcional: sem data, a edição mais recente.

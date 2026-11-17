# Contract: fontes geradas no painel (`/api/admin/generated*`)

Todas atrás de `createRequireAdmin`: sem sessão ou sem `is_admin` → o mesmo `404` de rota inexistente (nunca 401/403). Id da fonte sempre no corpo, nunca na URL. Schemas de documentação em `sources.schemas.ts` (`toDocSchema`). Esquemas em `data-model.md`.

## `GET /api/admin/generated`

`200`

```json
{
  "sources": [
    {
      "source": "casa",
      "gridSize": 11,
      "difficulty": "medium",
      "callsLeft": 2,
      "today": {
        "puzzleId": "…",
        "size": 11,
        "discardable": true,
        "blockedBy": null,
        "words": [{ "number": 1, "direction": "across", "answer": "BRASIL", "clue": "…" }]
      }
    }
  ]
}
```

`today: null` quando não há cruzada de hoje. `blockedBy`: `progress` (alguma conta tem progresso), `duel` (algum x1 usa) ou `null`.

## `PUT /api/admin/generated/settings`

Corpo estrito: `{ "source": "casa", "gridSize": 13, "difficulty": "hard" }`

| Caso                                                                                     | Resposta                                                         |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| válido                                                                                   | `200` com a fonte atualizada (mesmo formato de um item do `GET`) |
| fonte que não é gerada, `gridSize` fora de 9..15, dificuldade desconhecida, chave a mais | `400 invalid-input`, nada muda                                   |
| não admin                                                                                | `404`                                                            |

## `POST /api/admin/generated/discard`

Corpo estrito: `{ "source": "casa", "puzzleId": "…" }`

| Caso                                                    | Resposta                    |
| ------------------------------------------------------- | --------------------------- |
| cruzada de hoje da fonte, sem progresso de conta nem x1 | `200 { "discarded": true }` |
| `puzzleId` não é a cruzada de hoje daquela fonte gerada | `404 puzzle-unavailable`    |
| conta com progresso ou x1 usando                        | `409 in-use`, nada muda     |
| corpo inválido                                          | `400 invalid-input`         |
| não admin                                               | `404`                       |

## Site (`features/admin`)

Seção "Fontes geradas" em `/admin`, abaixo da lista de fontes, um bloco por fonte gerada:

- Configuração: campo numérico 9 a 15 ("Tamanho da grade"), rádios "Dificuldade" (Fácil, Médio, Difícil), botão `primary` "Salvar" com `pending`; `Notice ok` ou `error`.
- Hoje: "Chamadas restantes hoje: N"; lista de respostas e dicas (Horizontais, Verticais) ou "Sem cruzada hoje".
- Botão `secondary` "Descartar cruzada de hoje" que abre `Dialog` de confirmação; desabilitado com o motivo quando `discardable` é falso. Depois do descarte, `Notice info` com o comando `gh workflow run collect.yml` e o aviso de quando `callsLeft` é 0.

Hook `useGeneratedSources` (TanStack Query) e cliente em `shared/services/api/`.

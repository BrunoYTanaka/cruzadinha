# Contrato: `/api/settings`

As duas rotas exigem sessão (`requireSession`). O usuário vem sempre da sessão, e nenhuma rota aceita identificador de usuário. Cada rota declara `schema` para a documentação OpenAPI (`settings.schemas.ts`, tag `settings`); a validação real é o `safeParse` do Zod na rota.

## `GET /api/settings`

**200**

```json
{ "settings": { "theme": "dark", "helpLetters": null, "helpWords": 2, "strikeMode": "solved", "defaultSource": "cruzadaonline", "directToGame": true, "boardCellSize": null, "libraryWidth": 1200 }, "savedAt": "2026-10-21T13:02:11.000Z" }
```

A conta que nunca salvou devolve `{ "settings": null, "savedAt": null }`. Um campo guardado que não passa no schema atual é omitido (`parseStoredSettings`), então `settings` pode vir parcial. O site completa os campos que faltam com os próprios padrões; a API nunca inventa valores.

**401** `unauthenticated`: sem sessão ou sessão inválida, e o cookie é limpo.

## `PUT /api/settings`

**Corpo** (até 4096 bytes):

```json
{ "settings": { "theme": "light", "helpLetters": 6, "helpWords": null, "strikeMode": "filled", "defaultSource": "oglobo", "directToGame": false, "boardCellSize": 72, "libraryWidth": null }, "savedAt": "2026-10-21T13:05:40.120Z" }
```

**Respostas**

| Status | Corpo | Quando |
| --- | --- | --- |
| 200 | o mesmo envelope do `GET`, com o estado resultante | gravou, ou ignorou um `savedAt` mais antigo (o corpo mostra o que vale) |
| 400 | `invalid-input` com `fields` (nomes de campos, nunca valores) | campo conhecido inválido, `savedAt` ausente ou mais de 5 minutos no futuro, JSON mal formado, corpo acima de 4096 bytes |
| 401 | `unauthenticated` | sem sessão |
| 429 | `too-many-attempts` e cabeçalho `retry-after` | mais de 120 gravações por endereço em 60 minutos (`SETTINGS_SAVE`) |
| 503/500 | `service-unavailable` / `internal-error` | banco indisponível ou erro inesperado |

**Regras**
- Chaves desconhecidas em `settings` são descartadas, não recusadas.
- `defaultSource` é aceito por formato, não pela lista de fontes que a API conhece (FR-012b).

## Compatibilidade

- O site anterior não chama estas rotas e continua igual.
- O site novo contra a API anterior recebe `404` no `GET` ou no `PUT`. Ele trata isso como "conta sem configurações": fica só no aparelho, sem aviso e sem novas tentativas até recarregar (FR-025).
- Ao adicionar uma configuração futura, um site mais novo continua sendo aceito por esta API (R3).

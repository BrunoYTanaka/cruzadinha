# Data Model: Copiar a dica

## Settings (shared, mudança)

| Campo      | Tipo    | Padrão  | Regra                                              |
|------------|---------|---------|----------------------------------------------------|
| `copyClue` | boolean | `false` | Lido campo a campo; inválido ou ausente vira `false` |

- `defaultSettings` ganha `copyClue: false`; `parseSettings`/`parseStoredSettings` cobrem o campo pela lista `fields`.
- `saveSettingsRequestSchema.settings` aceita `copyClue` ausente (compatibilidade com o site anterior). `settingsEnvelopeSchema` já é parcial.
- Persistência: `cruzadinha:settings` (localStorage) e `user_settings.settings` (jsonb). Sem migração; DDE-004 e ERD-004 listam o campo novo.

## Texto copiado (derivado, efêmero)

`<clue> (<length>): <letters>`; `letters` tem `length` posições, cada uma a letra da célula ou `_`. Não é guardado.

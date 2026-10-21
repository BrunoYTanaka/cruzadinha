# Data Model: Configurações do usuário

**Feature**: 021-configuracoes-usuario | **Date**: 2026-10-21

## Configurações (`Settings`, em `packages/shared`)

| Campo | Tipo | Padrão | Regra |
| --- | --- | --- | --- |
| `theme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | FR-007 |
| `helpLetters` | inteiro 0 a 99, ou `null` | `4` (vem de `VITE_HELP_LETTER_LIMIT`) | `null` = sem limite (FR-008, FR-008a) |
| `helpWords` | inteiro 0 a 99, ou `null` | `2` (vem de `VITE_HELP_WORD_LIMIT`) | idem |
| `strikeMode` | `'solved' \| 'filled'` | `'solved'` | FR-010 |
| `defaultSource` | texto `^[a-z0-9-]{1,40}$` | primeira fonte de `puzzleSourceIdSchema` | fonte desconhecida vale como a primeira, sem regravar (FR-012b) |
| `directToGame` | booleano | `false` | FR-013 |
| `boardCellSize` | inteiro 30 a 110, ou `null` | `null` (tamanho que cabe) | FR-015, feature 011 |
| `libraryWidth` | inteiro 720 a 1600, ou `null` | `null` (largura padrão) | FR-015, feature 011 |

- **Leitura no site** (`parseSettings(unknown, defaults)`): cada campo inválido ou ausente vale o padrão; chaves desconhecidas são descartadas (FR-018). Nunca lança exceção.
- **Leitura no servidor** (`parseStoredSettings(unknown): Partial<Settings>`): devolve só os campos válidos e omite os inválidos. O servidor não completa nada com padrões, porque os padrões de ajuda vêm do build do site (`VITE_HELP_*`). O site completa o objeto parcial com os próprios padrões.
- **Pedido** (`saveSettingsRequestSchema`): os oito campos obrigatórios e válidos; chaves desconhecidas descartadas (research R3).
- Os padrões de ajuda vêm do site (`config.helpLimits`), por isso `shared` exporta o schema e uma função `defaultSettings(helpLimits)`.

## Registro local (`localStorage`, chave `cruzadinha:settings`)

```text
{ v: 1, settings: Settings, savedAt: string (ISO, relógio do aparelho corrigido pelo servidor) }
```

- **Sem a chave**: o registro é montado das chaves antigas e gravado (FR-017):
  - `cruzadinha:theme` vira `theme`;
  - `cruzadinha:source` vira `defaultSource`;
  - `cruzadinha:board-size` (`{ cellSize }`) vira `boardCellSize`;
  - `cruzadinha:library-width` (`{ width }`) vira `libraryWidth`.

  As chaves antigas não são apagadas.
- **`v` desconhecido ou JSON inválido**: valem os padrões e as chaves antigas.
- **Sem armazenamento**: o registro vive só em memória.
- `savedAt` muda a cada alteração feita pela pessoa. "Restaurar padrões" também é uma alteração e ganha `savedAt` novo.

## Tabela `user_settings` (Postgres, migração `0005`)

| Coluna | Tipo | Restrição |
| --- | --- | --- |
| `user_id` | `uuid` | PK; FK `users.user_id` `ON DELETE CASCADE` (FR-026) |
| `settings` | `jsonb` | not null; relido por `parseStoredSettings` |
| `saved_at` | `timestamptz` | not null; momento da alteração no aparelho |
| `created_at`, `updated_at` | `timestamptz` | `timestamps` + gatilho `user_settings_set_updated_at` |

A mesma migração amplia `rate_limit_attempts_action_check` para incluir `'SETTINGS_SAVE'`, e `rateLimitActions` em `schema.ts` ganha o valor.

## Transições

**Gravação na conta** (`decideSettingsSave`):

| Situação | Resultado |
| --- | --- |
| `savedAt` mais de 5 min no futuro do servidor | `invalid-saved-at` → `400 invalid-input` (`fields: ['savedAt']`) |
| sem registro | grava |
| `savedAt` ≤ guardado | `unchanged`: devolve o guardado |
| `savedAt` > guardado | grava (o `setWhere` repete a condição no banco) |

**No site:**

| Evento | Efeito local | Efeito na conta |
| --- | --- | --- |
| Pessoa muda uma configuração | grava, `savedAt = agora` | logado: entra na fila de envio |
| Login ou abertura com sessão: `GET` devolve `null` | nada | envia o registro local (FR-020a) |
| Logo após o login: `GET` devolve configurações | substitui o local (completando campos ausentes com os padrões), origem `'account'` | nada (FR-020a) |
| Abertura com sessão: `GET` devolve configurações mais novas que o local | substitui o local, origem `'account'` | nada |
| Abertura com sessão: o local é mais novo que o da conta | mantém | envia o registro local (FR-020c) |
| Logout | mantém (FR-020b) | nada |
| Evento `storage` de outra aba | relê, aplica o tema sem animação | nada (a outra aba envia) |
| Restaurar padrões | padrões, `savedAt = agora` | logado: envia |

**Ajudas** (`game-logic/help.ts`):
- Limite `null`: a ajuda nunca se esgota.
- Limite numérico: `usage < limite`.
- Mudar o limite nunca mexe em `usage` (FR-009).

**Riscar** (`game-logic/clue-strike.ts`):
- `solved`: completa e certa (`plainLetter`).
- `filled`: completa, certa ou errada.

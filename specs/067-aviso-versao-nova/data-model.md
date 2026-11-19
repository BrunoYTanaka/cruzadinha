# Data Model: Aviso de versão nova no calendário

Nenhum dado persistido, nenhuma tabela, nenhum campo de API. Só estado em memória da página.

## AppUpdateState (memória da página, `features/offline`)

| Campo | Tipo | Significado |
|-------|------|-------------|
| `status` | `'none' \| 'waiting' \| 'dismissed' \| 'updating'` | Situação do aviso nesta página |
| `requested` | `boolean` (interno) | Esta aba pediu a atualização; só então `onNeedReload` recarrega |

### Transições

| De | Evento | Para | Efeito |
|----|--------|------|--------|
| `none` | `onNeedRefresh` (SW novo esperando) | `waiting` | aviso aparece no calendário |
| `waiting` | "Fechar" | `dismissed` | aviso some até o próximo carregamento |
| `dismissed` | `onNeedRefresh` de novo | `dismissed` | continua escondido |
| `waiting` | "Atualizar" | `updating` | `requested = true`, `updateSW()`, recarga de segurança em 10 s |
| `updating` | "Atualizar" de novo | `updating` | ignorado |
| `updating` | `onNeedReload` (SW novo assumiu) | — | `location.reload()` |
| `none`/`waiting`/`dismissed` | `onNeedReload` (outra aba atualizou) | igual | nada (FR-008) |
| `updating` | 10 s sem recarregar | — | `location.reload()` (FR-005) |

O aviso aparece quando `status` é `waiting` ou `updating` (este com o botão em espera).

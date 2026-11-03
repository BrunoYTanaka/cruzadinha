# Data Model: Painel de admin para esconder e reordenar fontes

Modelo lógico em [DDE-008](../../docs/data-definitions/DDE-008-admin-fontes.md). Aqui, o físico.

## users (coluna nova)

| Coluna | Tipo | Restrições |
|--------|------|------------|
| is_admin | boolean | not null, default false |

Sem índice. Lida junto com o usuário na consulta de sessão.

## source_settings

| Coluna | Tipo | Restrições |
|--------|------|------------|
| source_setting_id | uuid | PK, default `gen_random_uuid()` |
| source_id | text | not null; `source_settings_source_check IN ('oglobo','cruzadaonline','cruzadasbrasil','clube')` (como `puzzles_source_check`); índice único `source_settings_source_unique` |
| visible | boolean | not null, default true |
| position | integer | not null, `>= 0`; índice único `source_settings_position_unique` |
| created_at, updated_at | timestamptz | `timestamps` de `columns.ts`; gatilho `source_settings_set_updated_at` |

A troca de posições entre duas fontes viola o índice único no meio de um `UPDATE`; o salvamento apaga e reinsere as linhas na transação (4 linhas), em vez de atualizar uma a uma.

## source_setting_changes

| Coluna | Tipo | Restrições |
|--------|------|------------|
| source_setting_change_id | uuid | PK, default `gen_random_uuid()` |
| user_id | uuid | FK → users, `ON DELETE SET NULL` |
| before | jsonb | not null; `[{ "sourceId", "visible", "position" }]` |
| after | jsonb | not null; mesmo formato |
| created_at, updated_at | timestamptz | `timestamps`; gatilho `source_setting_changes_set_updated_at` |

## Validação (regra pura `decideSources`)

- O pedido lista cada fonte conhecida exatamente uma vez; a ordem da lista vira `position` (0, 1, 2…).
- Pelo menos uma com `visible: true`, senão `no-visible-source` (FR-004).
- Igual ao estado atual: nada é gravado e nenhuma linha de registro é criada.

## Resolução para leitura (`resolveVisibleSources`, em `shared`)

Entrada: linhas gravadas (possivelmente nenhuma). Saída: ids visíveis em ordem de `position`; fonte do código sem linha entra visível depois das que têm linha, na ordem padrão; linha de fonte que o código não conhece é ignorada.

## Limpeza

`auth cleanup` não toca em `source_settings` nem em `source_setting_changes`.

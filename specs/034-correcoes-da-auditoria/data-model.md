# Data Model: Correções dos achados da auditoria

Mudança de schema única, migração `0008_remove_invites`.

| Objeto | Mudança |
|--------|---------|
| `invites` | Removida (tabela, índice `invites_created_by_user_id_idx`, gatilho `invites_set_updated_at`, restrições). |
| `rate_limit_attempts.action` | Restrição `rate_limit_attempts_action_check` passa a `IN ('LOGIN','REGISTER','PUZZLE_FETCH','SETTINGS_SAVE')`; antes, `DELETE` das linhas com `INVITE_CREATE`. |
| `rateLimitActions` (`schema.ts`) | Sem `INVITE_CREATE`. |
| `sessions` | Sem mudança de schema; passa a ter linhas apagadas por `puzzles collect`. |
| `rate_limit_attempts` | Sem mudança de schema; o login insere antes de verificar e pode apagar as próprias linhas (recusa ou sucesso). |

Regra de limpeza de sessões (`now` = instante da execução):
`expires_at < now OR absolute_expires_at < now OR ended_at < now - 7 dias`.

Documentos a atualizar: `docs/data-definitions/DDE-001-banco-auth-convites.md` (entidade Invite e relações, valores de `action`), `docs/entity-relationship-diagrams/ERD-001-banco-auth-convites.md`, `docs/design.md` (linhas 151, 281, 335). Os arquivos DDE/ERD mantêm o nome por estabilidade dos links; o título passa a "banco e autenticação" no conteúdo.

# Data Model: Telas de erro com título de nível 1

Nenhuma entidade nova nem alterada. Sem mudança de banco, API ou `packages/shared`.

Único tipo novo, só de interface:

- `ErrorStateProps.level`: `1 | 2`, obrigatório. `1` = o bloco de erro é a página inteira (título vira o `h1`); `2` = o erro está dentro de uma página que já tem `h1`.

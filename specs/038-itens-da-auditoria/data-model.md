# Data Model: Itens da auditoria

Sem mudança de schema nem migração (princípio IX não se aplica; nenhum DDE/ERD a atualizar).

## `rate_limit_attempts` (existente)
Mesmas colunas e chaves. Muda só o momento da gravação: as ações `PUZZLE_FETCH`, `REGISTER` e `SETTINGS_SAVE` passam a ser inseridas na mesma transação em que são contadas, sob a trava da chave (`NETWORK_ADDRESS`, endereço).

## `CollectReport` (em memória, existente)
Sem campo novo. `failed[].reason` continua `source-down` para erro inesperado; o erro em si vai para o gancho `onError`, não para o relatório.

## Issue de aviso (GitHub)
Rótulo `fonte-quebrada`; título `[Fonte] <nome> parou de coletar`; corpo com as linhas `Falhou em` da fonte e o link da execução. Chave de duplicata: issue aberta com o rótulo e o nome da fonte no título.

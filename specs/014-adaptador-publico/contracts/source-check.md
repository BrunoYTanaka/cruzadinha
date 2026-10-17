# Contrato: verificação sob demanda do Público

Descrito em [cli.md](./cli.md#sourcecheckcruzadaonline-novo). Regras que valem para qualquer execução:

- Só faz pedidos reais quando o autor a roda. Nunca roda na suíte automática, na CI ou no `collect.yml`.
- Não imprime trechos do corpo nem texto de dica, só dimensões, número de palavras, motivo e `detail` curto.
- Os corpos salvos com `--save` ficam em `apps/api/.source-samples/`, pasta ignorada pelo git, e nunca são versionados.
- Os resultados relevantes (status novos, formatos inesperados) entram em `specs/014-adaptador-publico/findings.md`, como na feature 003.

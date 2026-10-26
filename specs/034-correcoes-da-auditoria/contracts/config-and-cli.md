# Contrato: configuração e CLI

## `loadConfig(env, options?)`

| Condição | Resultado |
|----------|-----------|
| `options.requireProxySecret` e `NODE_ENV=production` e `PROXY_SECRET` ausente ou vazio e `ALLOW_MISSING_PROXY_SECRET` ≠ `true` | `Error: Configuração inválida:\nPROXY_SECRET: obrigatório em produção` |
| mesma situação, com `ALLOW_MISSING_PROXY_SECRET=true` | carrega |
| `NODE_ENV` ≠ `production`, ou `requireProxySecret` falso | carrega como hoje |
| `PROXY_SECRET` com 31 ou 257 caracteres | erro de tamanho existente; nunca ecoa o valor |

`ALLOW_MISSING_PROXY_SECRET`: `true` ou `false`, padrão `false`, vazio vale ausente. Definida só em `docker-compose.yml`. `server.ts` passa `requireProxySecret: true`; `cli.ts`, não.

## `puzzles collect`

Saída nova, depois das linhas por fonte:

```
Sessões apagadas: <n>.
```

Falha da limpeza: `Falha ao apagar sessões antigas.` em `stderr`, sem detalhes da consulta; código de saída 1; a coleta de puzzles já gravada permanece.

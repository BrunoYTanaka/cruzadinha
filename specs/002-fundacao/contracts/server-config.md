# Contract: configuração do servidor

Toda a configuração do servidor vem de variáveis de ambiente (FR-013). Em desenvolvimento, o servidor carrega `.env` da raiz se o arquivo existir; no container, as variáveis vêm do Compose ou da plataforma.

## Variáveis

| Variável | Obrigatória | Padrão | Formato |
|---|---|---|---|
| `DATABASE_URL` | sim | — | URL `postgres://` ou `postgresql://` |
| `PORT` | não | `3000` | inteiro de 1 a 65535 |
| `HOST` | não | `0.0.0.0` | texto não vazio |
| `NODE_ENV` | não | `development` | `development`, `test` ou `production` |
| `LOG_LEVEL` | não | `info` | `fatal`, `error`, `warn`, `info`, `debug` ou `trace` |

Variáveis do ambiente local, lidas só pelo Compose e pelo Vite:

| Variável | Padrão | Uso |
|---|---|---|
| `DB_PORT` | `5432` | porta do Postgres exposta na máquina |
| `API_PORT` | `3000` | porta do servidor exposta na máquina |
| `API_PROXY_TARGET` | `http://localhost:3000` | destino do proxy `/api` do Vite |

## `.env.example`

Lista todas as variáveis acima com valores fictícios, como `DATABASE_URL=postgres://cruzadinha:cruzadinha@localhost:5432/cruzadinha`. Os valores reais ficam em `.env`, ignorado pelo git.

## Falha de configuração

- O servidor não abre a porta.
- Sai com código diferente de zero.
- A mensagem lista cada variável inválida com o motivo, por exemplo `DATABASE_URL: obrigatória` ou `PORT: deve ser um inteiro de 1 a 65535`, e nunca o valor recebido.

# Data Model: Fundação do projeto

Não há tabelas nesta feature. As estruturas abaixo são tipos em memória e de contrato.

## HealthStatus (`packages/shared`)

Estado de saúde devolvido pelo servidor e lido pelo site. É o tipo compartilhado que prova FR-002.

| Campo | Tipo | Descrição |
|---|---|---|
| `status` | `'ok'` | o processo do servidor está no ar e respondeu |
| `database` | `'up'` \| `'down'` | o banco respondeu à sonda dentro do tempo limite |

**Regras**: o schema Zod (`healthStatusSchema`) é a fonte; o tipo `HealthStatus` é inferido dele (`z.infer`). O site valida a resposta com o mesmo schema antes de mostrar. Mudar um campo quebra a checagem de tipos no `api` e no `web` (cenário 4 da história 1).

## ServerConfig (`apps/api`)

Configuração do servidor, lida das variáveis de ambiente na inicialização. Detalhes em [contracts/server-config.md](./contracts/server-config.md).

| Campo | Origem | Regra |
|---|---|---|
| `nodeEnv` | `NODE_ENV` | `development` \| `test` \| `production`; padrão `development` |
| `host` | `HOST` | texto não vazio; padrão `0.0.0.0` |
| `port` | `PORT` | inteiro de 1 a 65535; padrão `3000` |
| `logLevel` | `LOG_LEVEL` | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace`; padrão `info` |
| `databaseUrl` | `DATABASE_URL` | obrigatória; URL com esquema `postgres:` ou `postgresql:` |

**Regras**: inválida ou ausente → `loadConfig` falha com uma lista de nomes de variáveis e motivos, sem valores (FR-013). O objeto validado é imutável e passado ao app por injeção; nenhum outro módulo lê `process.env`.

## DatabaseProbe (`apps/api`)

Interface que o serviço de saúde usa para saber se o banco responde.

| Membro | Descrição |
|---|---|
| `check(): Promise<boolean>` | `true` se `select 1` responder dentro do tempo limite; `false` em erro ou timeout, sem lançar exceção |
| `close(): Promise<void>` | encerra a conexão no desligamento do servidor |

**Regras**: a implementação real usa Postgres.js com uma conexão e tempo limite curto; os testes usam uma implementação falsa. Falha do banco nunca derruba o servidor (cenário 3 da história 4).

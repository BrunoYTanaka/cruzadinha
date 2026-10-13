# Contrato: comandos do autor e do banco

## Execução

| Ambiente | Comando |
|---|---|
| Desenvolvimento | `npm run cli -w @cruzadinha/api -- <subcomando>` (tsx, lê o `.env` da raiz como o `dev`) |
| Imagem Docker | `node apps/api/dist/cli.mjs <subcomando>` (configuração só por variáveis de ambiente) |

- A configuração é validada por `loadConfig`. Configuração inválida termina com código 1 e a mensagem do `loadConfig`, sem valores.
- Erros de uso (subcomando desconhecido, argumento faltando ou inválido) terminam com código 2 e uma linha de ajuda.
- Nenhuma saída mostra hash, URL de conexão ou dados de sessão.

## `invites create [--days N]`

- `N`: inteiro positivo, padrão 7. Zero, negativo, fracionário ou não numérico é erro de uso, antes de gravar.
- Sem cota. `created_by_user_id` fica nulo.
- Saída (código 0):

```text
Convite criado: ABCD-EFGH-JKMN-PQRS
Expira em: 2026-10-20T12:00:00.000Z
Guarde o código: ele não será exibido de novo.
```

## `invites list`

Todos os convites, do mais novo para o mais antigo, um por linha, sem código. Saída (código 0):

```text
ID                                    CRIADOR                 CRIADO EM                 EXPIRA EM                 SITUAÇÃO
0b6f0c1e-…                            linha de comando        2026-10-13T12:00:00.000Z  2026-10-20T12:00:00.000Z  ativo
5d2a…                                 ana@exemplo.com         2026-10-12T09:00:00.000Z  2026-10-19T09:00:00.000Z  usado
```

- O criador é o e-mail de quem gerou o convite, ou `linha de comando`.
- A situação é `ativo`, `usado`, `expirado` ou `revogado`.
- Sem convites, a saída é `Nenhum convite.`

## `invites revoke <invite_id>`

| Caso | Saída | Código |
|---|---|---|
| Convite não usado e não revogado (inclusive expirado) | `Convite <id> revogado.` | 0 |
| Já usado, já revogado ou inexistente | `Nada a revogar: o convite não existe, já foi usado ou já foi revogado.` | 1 |
| `invite_id` que não é UUID | erro de uso | 2 |

## Banco

| Script do `api` | O que faz |
|---|---|
| `npm run db:generate -w @cruzadinha/api` | `drizzle-kit generate`: gera a migração a partir de `src/db/schema.ts` (só desenvolvimento) |
| `npm run db:generate -w @cruzadinha/api -- --custom --name <nome>` | Migração SQL vazia para escrever à mão (triggers) |
| `npm run db:migrate -w @cruzadinha/api` | Aplica as migrações pendentes em `DATABASE_URL`. Idempotente; termina com código 0 e `Migrações aplicadas.` |
| `node apps/api/dist/migrate.mjs` | O mesmo, na imagem |
| `npm run db:seed -w @cruzadinha/api` | Só em desenvolvimento: cria o usuário de teste de `SEED_USER_EMAIL`/`SEED_USER_PASSWORD`, sem convite. Não existe na imagem |

O servidor também aplica as migrações pendentes antes de escutar a porta. Se a aplicação falhar, ele termina com código 1 e uma mensagem sem a URL.

### `db:seed`

| Caso | Saída | Código |
|---|---|---|
| Usuário criado | `Usuário de teste criado: <email normalizado>` | 0 |
| E-mail já cadastrado (nada muda, nem a senha) | `Usuário de teste já existe: <email normalizado>` | 0 |
| `NODE_ENV=production` | `O seed só roda em desenvolvimento.` | 1 |
| Variável ausente ou inválida | `Configuração do seed inválida:` e uma linha por variável (`SEED_USER_PASSWORD: deve ter de 8 a 128 caracteres`), sem os valores | 1 |

A senha nunca aparece na saída.

## Testes

| Script | O que faz |
|---|---|
| `npm test` (raiz e `api`) | Só os unitários; exclui `*.int.test.ts`; sem Docker |
| `npm run test:int` (raiz) / `npm run test:int -w @cruzadinha/api` | Integração: sobe `postgres:17-alpine` pelo Testcontainers, aplica as migrações e roda `*.int.test.ts`. Exige Docker |

# Research: Banco de dados, autenticação e convites

Documentação consultada via Context7 em 2026-10-13:

- Drizzle ORM (`/drizzle-team/drizzle-orm-docs` e `/drizzle-team/drizzle-orm/drizzle-kit_0.31.5`): driver `postgres-js` com cliente existente (`drizzle({ client })`), `migrate()` de `drizzle-orm/postgres-js/migrator` com cliente `max: 1`, `drizzle-kit generate` e `--custom` para SQL próprio (triggers), `timestamp({ withTimezone: true }).defaultNow()`, `uuid().defaultRandom()`, `uniqueIndex`, `index`, `db.transaction`, `onConflictDoNothing`.
- `@node-rs/argon2` (`/napi-rs/node-rs`): `hash`/`verify`, padrão argon2id com `memoryCost` 19456 KiB, `timeCost` 2, `parallelism` 1.
- `@fastify/cookie` (`/fastify/fastify-cookie`): `request.cookies`, `reply.setCookie` com `httpOnly`, `sameSite`, `secure`, `path` e `maxAge` (em segundos), `reply.clearCookie`.
- Fastify 5 (`/fastify/fastify/v5.0.0`): `trustProxy` e `request.ip`.
- Testcontainers 12.2 (`/testcontainers/testcontainers-node/v12.2.0`): `PostgreSqlContainer(image)` com espera por health check, `getConnectionUri()`, `stop()`, uso em `globalSetup` do Vitest.
- Vitest 5.0 (`/vitest-dev/vitest/v5.0.3`): `globalSetup` com `project.provide` e `inject`, tipagem por `declare module 'vitest' { interface ProvidedContext }`, `exclude`.

Versões no npm em 2026-10-13: `drizzle-orm` 0.45.4 (a 1.0 ainda está em release candidate), `drizzle-kit` 0.31.11, `@node-rs/argon2` 2.2.2, `@fastify/cookie` 11.1.3, `@testcontainers/postgresql` 12.2.1. O `postgres` 3.4 já está no projeto.

## Decisões

### 1. Dependências novas
- **Decision**: em `apps/api`, dependências `drizzle-orm` 0.45, `@node-rs/argon2` 2.2 e `@fastify/cookie` 11.1; dependências de desenvolvimento `drizzle-kit` 0.31 e `@testcontainers/postgresql` 12.2. O driver continua sendo o `postgres` (postgres.js) 3.4, já usado pelo health check.
- **Rationale**: Drizzle, `@fastify/cookie` e `@node-rs/argon2` são as escolhas do design (§3). A linha estável do Drizzle é a 0.45; a 1.0 ainda é release candidate e muda o formato da pasta de migrações, então fica para uma atualização de manutenção. `@node-rs/argon2` traz binários pré-compilados (inclusive para Alpine/musl), sem compilação nativa no `npm ci` da imagem. Testcontainers sobe o Postgres igual no computador e na CI, sem serviço extra no workflow.
- **Alternatives considered**: `argon2` (node-argon2), que compila ou baixa binário no `postinstall` e complicaria o `--ignore-scripts` do Dockerfile; serviço `postgres` do GitHub Actions mais Docker Compose local (duas formas de subir o banco de teste, com portas e esperas diferentes); Drizzle 1.0 RC (sem versão estável).

### 2. Conexão e schema
- **Decision**: `src/db/client.ts` cria um único cliente postgres.js e o Drizzle sobre ele (`drizzle({ client, schema })`), expondo `db` e `close()`. O schema fica em `src/db/schema.ts`. O cliente do postgres.js é preguiçoso (só conecta na primeira consulta), então o `buildApp` dos testes unitários recebe um banco que nunca é tocado. O `DatabaseProbe` da 002 continua igual, com conexão própria e tempo limite curto.
- **Rationale**: uma conexão só para a aplicação, testável com `app.inject()` sem banco nos testes unitários (princípio VII).
- **Alternatives considered**: reaproveitar o cliente do probe (o `connect_timeout: 2` e o `max: 1` são próprios do health check).

### 3. Migrações e quando aplicá-las
- **Decision**: `drizzle-kit generate` gera o SQL em `apps/api/drizzle/` (arquivos `NNNN_nome.sql` mais `meta/`), versionado. O SQL que o Drizzle Kit não gera (função e triggers de `updated_at`) entra numa migração `--custom`. As migrações são aplicadas por código, com `migrate()` de `drizzle-orm/postgres-js/migrator` e um cliente `max: 1`, em dois lugares: no `server.ts`, antes de escutar a porta, e no comando `npm run db:migrate -w @cruzadinha/api`. O tsdown passa a ter três entradas (`server`, `migrate`, `cli`) e o Dockerfile copia `apps/api/drizzle/` para a imagem. `apps/api/drizzle/` entra no `.prettierignore`, para os arquivos ficarem como o Drizzle Kit gera.
- **Rationale**: FR-001 e SC-001 (um comando, idempotente: o migrator registra o que já rodou em `drizzle.__drizzle_migrations`). O Render free não tem comando de pré-implantação gratuito, então aplicar na subida garante o schema atualizado sem passo manual; com uma instância só não há corrida entre instâncias. `drizzle-kit` é dependência de desenvolvimento e não vai para a imagem; o `migrate()` vem do `drizzle-orm`, que vai.
- **Alternatives considered**: `drizzle-kit migrate` na produção (exigiria o kit na imagem); `drizzle-kit push` (altera o banco sem migração, proibido pelo princípio IX); só o comando manual (fácil esquecer na implantação).

### 4. `created_at` e `updated_at` pelo banco
- **Decision**: todo `pgTable` usa um mesmo objeto `timestamps` (em `src/db/columns.ts`) com `created_at` e `updated_at` do tipo `timestamp with time zone`, `NOT NULL DEFAULT now()`. Uma função `set_updated_at()` e um trigger `BEFORE UPDATE` por tabela atribuem `NEW.updated_at = now()` a cada alteração. Um teste de integração lista todas as tabelas do schema `public` e falha se alguma não tiver as duas colunas com esse tipo, padrão e trigger.
- **Rationale**: FR-003 pede que o banco preencha e avance as datas sem depender da aplicação; o trigger vale também para SQL direto e para a linha de comando. `now()` é o mesmo instante dentro de um comando, então na criação as duas datas são iguais (cenário 3 da US1). O teste de guarda faz a convenção valer para as tabelas das próximas features, que só precisam espalhar `timestamps` e criar o trigger na migração.
- **Alternatives considered**: `$onUpdate` do Drizzle (é a aplicação que informa a data, e não vale para SQL direto); event trigger que cria o trigger sozinho em `CREATE TABLE` (mágico demais para o ganho, e exige privilégio de superusuário em alguns provedores, como o Neon).

### 5. Identificadores
- **Decision**: chaves primárias `uuid` com `DEFAULT gen_random_uuid()` (UUID v4), nomeadas `<entidade>_id` como na [DDE-001](../../docs/data-definitions/DDE-001-banco-auth-convites.md). Tabelas no plural (`users`, `sessions`, `invites`, `rate_limit_attempts`).
- **Rationale**: o v4 é aleatório e não revela ordem nem quantidade (Assumptions da spec); o `gen_random_uuid()` é nativo do Postgres 13+. O v7 seria ordenável, justamente o que a spec evita.

### 6. Senha
- **Decision**: `@node-rs/argon2` com os padrões da biblioteca (argon2id, 19456 KiB, 2 passadas, paralelismo 1), que são os mínimos recomendados pela OWASP. Senha validada com 8 a 128 caracteres antes do hash. Para o login com e-mail inexistente, o serviço verifica a senha contra um hash fictício calculado na subida, para gastar o mesmo tempo.
- **Rationale**: princípio VI, FR-007 e FR-011/SC-007 (sem diferença de tempo entre e-mail inexistente e senha errada). O teto de 128 evita o uso do hash para sobrecarregar o servidor (Edge Cases).

### 7. Valor da sessão e código do convite
- **Decision**:
  - Sessão: 32 bytes de `randomBytes` em base64url no cookie; o banco guarda o SHA-256 em hexadecimal (`token_hash`).
  - Convite: 16 caracteres sorteados com `crypto.randomInt` do alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 símbolos, sem `0`, `O`, `1`, `I` e `L`), exibido em quatro grupos (`ABCD-EFGH-JKMN-PQRS`). Ao validar: maiúsculas, sem espaços nem hífens, depois SHA-256 (`code_hash`).
- **Rationale**: os dois valores são aleatórios com muita entropia (256 bits na sessão, cerca de 79 bits no convite), então um hash rápido basta para que um vazamento do banco não entregue sessões nem convites; argon2 seria lento sem ganho. Os grupos facilitam ditar o código; a normalização aceita o código digitado com ou sem hífen (FR-017, FR-018).
- **Alternatives considered**: argon2 nos códigos (custo sem ganho e impede a busca pelo hash); cookie assinado com segredo (`@fastify/cookie` com `secret`), que pede um segredo novo na configuração sem acrescentar segurança a um valor que já é aleatório e verificado no banco.

### 8. Cookie e sessão deslizante
- **Decision**:
  - Cookie `sid` com `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `maxAge` igual ao tempo restante até `expires_at` e `secure` quando `NODE_ENV` não é `development` nem `test`.
  - Abrir sessão: `expires_at = agora + 30 dias` e `absolute_expires_at = agora + 365 dias`.
  - Uma requisição autenticada vale se `ended_at` é nulo e `agora < expires_at`. Quando `expires_at - agora < 29 dias` (ou seja, a última renovação foi há mais de 1 dia) e `expires_at < absolute_expires_at`, o serviço atualiza `expires_at = min(agora + 30 dias, absolute_expires_at)` e a rota reenvia o cookie.
  - Logout preenche `ended_at` e chama `clearCookie`.
- **Rationale**: clarificação de 2026-10-13 (expiração deslizante com limite absoluto) e FR-012 a FR-016. Derivar "última renovação" de `expires_at` dispensa uma coluna a mais. Gravar no máximo uma vez por dia evita escrita a cada requisição. Os navegadores aceitam `Secure` em `localhost`, mas desligá-lo em desenvolvimento permite testar a partir de outros endereços da rede local, que usam HTTP.
- **Alternatives considered**: apagar a linha no logout (perde o registro e não muda a recusa); coluna `last_renewed_at` (redundante).

### 9. Endereço de rede atrás de proxy
- **Decision**: nova variável `TRUST_PROXY_HOPS` (inteiro ≥ 0, padrão 0), passada como `trustProxy` ao Fastify quando maior que zero. O limite por endereço usa `request.ip`.
- **Rationale**: no Render (e com o proxy do Cloudflare Pages previsto no design §9) o socket mostra o endereço do proxy, e todos os usuários dividiriam o mesmo limite. Confiar no `X-Forwarded-For` sem proxy na frente deixaria qualquer um forjar o endereço. O número certo de saltos é decidido na feature de implantação; o padrão seguro é não confiar.

### 10. Limites de tentativas no banco
- **Decision**:
  - Tabela `rate_limit_attempts` (ação, tipo de chave, valor da chave, `created_at`), com índice em `(action, key_type, key_value, created_at)`.
  - Antes de agir, o serviço conta as linhas da chave dentro da janela; se a contagem já atingiu o limite, responde 429 sem verificar senha nem convite.
  - Login: as falhas gravam uma linha por e-mail normalizado e outra por endereço. Um login certo apaga as falhas daquele e-mail (não as do endereço).
  - Cadastro e geração de convites: toda tentativa grava uma linha por endereço.
  - A cada gravação, linhas com mais de 1 dia são apagadas.
  - Os limites (5 por e-mail e 20 por endereço em 15 minutos no login; 10 por hora no cadastro e na geração) ficam num objeto de configuração do módulo, injetável nos testes.
- **Rationale**: clarificação de 2026-10-13 e FR-027 a FR-029. Zerar as falhas do e-mail após um login certo evita bloquear quem errou algumas vezes e acertou; o limite por endereço continua barrando quem testa muitos e-mails. A limpeza oportunista mantém a tabela pequena sem tarefa agendada.
- **Alternatives considered**: `@fastify/rate-limit` com armazenamento em memória (zera ao reiniciar ou dormir, descartado na clarificação); contador por janela fixa numa linha só (janela fixa permite rajada na virada).
- **Limite conhecido**: duas requisições simultâneas podem ler a mesma contagem antes de gravar e passar uma tentativa além do limite. É aceitável para limitar abuso, e a cota de convites, que precisa ser exata, usa trava (decisão 11).

### 11. Concorrência no cadastro e na cota
- **Decision**:
  - Cadastro: o hash da senha é calculado antes da transação. Na transação, `SELECT ... FROM invites WHERE code_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > $agora FOR UPDATE`. Se não houver linha, a resposta é "convite inválido". Se houver, a conta é criada com `INSERT ... ON CONFLICT (email) DO NOTHING`; sem linha inserida, a transação é desfeita e a resposta é a mensagem genérica de cadastro. Por fim, `used_by_user_id` e `used_at` são preenchidos e a sessão é aberta, ainda na mesma transação.
  - Cota: na transação, `SELECT ... FROM users WHERE user_id = $1 FOR UPDATE`, depois a contagem dos convites ativos do usuário e o `INSERT` só se a contagem for menor que 3.
  - Revogação: `UPDATE ... SET revoked_at = $agora WHERE invite_id = $1 AND used_at IS NULL AND revoked_at IS NULL RETURNING`.
- **Rationale**: FR-005, FR-021, SC-004 e SC-005. A trava na linha do convite faz a segunda transação simultânea esperar e reavaliar a condição em `read committed`, sem encontrar o convite. O convite é conferido antes do e-mail, então quem não tem convite nunca descobre se um e-mail existe. A trava na linha do usuário serializa os pedidos de convite da mesma pessoa.
- **Alternatives considered**: isolamento `serializable` com nova tentativa (mais código de repetição); índice parcial único para a cota (não expressa "no máximo 3").

### 12. Relógio injetável
- **Decision**: os serviços recebem `now: () => Date` (padrão `() => new Date()`). Expirações, renovações e janelas de limite usam esse relógio e mandam o instante ao SQL como parâmetro. `created_at` e `updated_at` continuam vindo do `now()` do banco.
- **Rationale**: os testes de expiração de convite, de sessão (30 dias e 1 ano) e de janela de limite avançam o relógio sem esperar. Como o relógio de teste parte do instante real e só anda para frente, comparar com `created_at` do banco continua correto.

### 13. Contratos compartilhados e erros
- **Decision**: os schemas Zod dos corpos e respostas (`registerRequestSchema`, `loginRequestSchema`, `meSchema`, `createdInviteSchema`, `inviteListSchema`, `apiErrorSchema`) ficam em `packages/shared/src/auth/` e `packages/shared/src/invites/`. O corpo da requisição entra como `unknown` e passa pelo `safeParse` na rota. Os erros têm o formato `{ error: <código>, message: <texto em português> }`, com `fields` só no erro de formato. Um `setErrorHandler` transforma falhas de conexão com o banco em 503 genérico e o resto em 500 genérico, sem detalhes.
- **Rationale**: princípio I (contrato único para o site, que vai consumir esses tipos na feature de telas) e edge case "banco fora do ar".

### 14. Linha de comando do autor
- **Decision**: `apps/api/src/cli.ts`, com `node:util` `parseArgs`. No desenvolvimento roda com `npm run cli -w @cruzadinha/api -- invites create --days 3`; na imagem, com `node apps/api/dist/cli.mjs invites ...`. Ele lê a configuração por `loadConfig`, como o servidor, e chama o serviço de convites diretamente, sem HTTP. Os subcomandos são `invites create [--days N]`, `invites list` e `invites revoke <invite_id>`.
- **Rationale**: design §4 (`cli.ts`) e FR-024 a FR-026. A cota é do serviço só no caminho do usuário: a linha de comando chama a operação sem cota, com `created_by_user_id` nulo.

### 15. Testes de integração
- **Decision**:
  - Arquivos `*.int.test.ts`, rodados por `vitest.int.config.ts` com o script `test:int` do `api`. A raiz ganha `npm run test:int` (`--workspaces --if-present`).
  - O `globalSetup` sobe `postgres:17-alpine` pelo Testcontainers, aplica as migrações uma vez e entrega a URL por `project.provide('databaseUrl', ...)`. Cada arquivo esvazia as tabelas com `TRUNCATE ... CASCADE` antes de cada teste. `fileParallelism: false`, para os arquivos não disputarem as mesmas tabelas.
  - O `vitest.config.ts` dos unitários passa a excluir `**/*.int.test.ts`, já que o padrão `*.test.ts` também pegaria esses arquivos.
  - A CI ganha o job `integration` (`npm ci` e `npm run test:int`); o runner do GitHub já tem Docker.
- **Rationale**: FR-030 a FR-032, princípio VII e SC-009. O container sobe com `fsync=off`, `synchronous_commit=off` e `full_page_writes=off`: os dados são descartáveis, a suíte fica mais rápida e as medidas de tempo oscilam menos. O pré-push continua só com os unitários. Uma imagem igual à do Compose (Postgres 17) evita diferença entre teste e desenvolvimento.
- **Alternatives considered**: um banco por arquivo de teste (mais lento); transação desfeita ao fim de cada teste (não funciona com os testes de concorrência, que precisam de transações reais e paralelas).

### 16. Teste de tempo do login (SC-007)
- **Decision**: o teste mede 20 logins com e-mail inexistente e 20 com senha errada, alternados, com limites de tentativas altos injetados e e-mails diferentes, alterna a ordem dos dois casos a cada par, descarta as 2 primeiras medidas de cada lado e compara as médias (diferença menor que 10%), com até 2 repetições automáticas do teste.
- **Rationale**: com o hash fictício (decisão 6), os dois caminhos fazem uma verificação argon2 com os mesmos parâmetros. Medido na implementação: as amostras são bimodais (cerca de 12 e 16 ms), a mediana salta entre os picos e falhava em cerca de 1 de cada 3 execuções; quem é medido primeiro no par fica um pouco mais lento, daí a alternância. Com a média, a alternância e o Postgres de teste sem `fsync`, a diferença ficou entre 0,5% e 9% em 10 execuções, sem sinal sistemático. Sem o hash fictício a diferença passa de 80%, então as repetições não escondem um vazamento real.

### 17. Seed de desenvolvimento
- **Decision**: `apps/api/src/db/seed.ts`, rodado por `npm run db:seed -w @cruzadinha/api`.
  - Lê `SEED_USER_EMAIL` e `SEED_USER_PASSWORD` por `loadSeedConfig` em `config.ts`, com os mesmos schemas do cadastro.
  - Recusa `NODE_ENV=production`.
  - Cria a conta com `insertIfEmailFree`, sem convite. Se o e-mail já existe, não muda nada e informa.
  - Não entra no bundle do tsdown, então não existe na imagem.
  - O `.env.example` traz `dev@cruzadinha.local` / `senha-de-teste-123`.
- **Rationale**: clarificações de 2026-10-13 (FR-033). Ler pelo `config.ts` mantém a regra de que só ele lê variáveis de ambiente. Reaproveitar os schemas e o repositório do cadastro garante a mesma normalização e o mesmo hash. Ficar fora da imagem e recusar produção são duas barreiras contra uma conta com senha conhecida no banco real (princípio VI).
- **Alternatives considered**: atualizar a senha a cada execução (descartado pelo autor: o seed não mexe numa conta existente); seed SQL numa migração (iria para produção e gravaria um hash fixo no repositório).

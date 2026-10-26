# Research: Correções dos achados da auditoria

## R1. Como fechar a corrida do limite de login

**Decision**: o limitador ganha `reserve(rules, now)`. Numa transação curta que segura `pg_advisory_xact_lock` por chave (ordenadas, para não travar entre si), ele conta cada janela e, se todas cabem, insere uma linha por chave; senão não grava nada. Devolve `release(keys?)`, que apaga só as linhas desta reserva. A trava cobre apenas contar e inserir, nunca o argon2. O login reserva antes de verificar a senha; no sucesso chama `release([endereço])` e `clear(email)`; na falha mantém as linhas.

**Rationale**: a trava serializa a decisão por chave, então em N pedidos simultâneos exatamente `max` passam e os demais são recusados, em qualquer ordem de chegada (teste: 10 pedidos, limite 5 → 5 e 5). Recusar não grava nada, então uma rajada não prolonga a janela. Apagar a linha do endereço no sucesso preserva a regra de hoje, em que só falhas contam contra o endereço.

**Alternatives considered**:
- Inserir primeiro e contar depois, sem trava: rodei assim primeiro. Garante no máximo `max`, mas numa rajada todos contam todos e quase nenhum passa (2 de 10 no teste), recusando até pedidos legítimos.
- Só trocar a ordem (registrar antes, não devolver): conta logins certos contra o endereço.
- Contador atômico em tabela própria (`UPDATE ... RETURNING`): exige nova tabela e migração; descartado.

**Limite conhecido**: o repositório passa a receber `Database` (precisa de transação); todos os chamadores já passavam. A trava é por conexão do banco, então vale para várias instâncias da API.

## R2. Escopo do mesmo padrão em `settings` e `puzzles`

**Decision**: fora do escopo. `reserve` fica genérico para uso futuro. Registrar como acompanhamento.

**Rationale**: sem senha nem conta em jogo; `puzzles` só registra quando a fonte é de fato chamada, e trocar isso muda o significado do limite (`PUZZLE_FETCH` conta pedidos à fonte). A spec já permitia deixar para depois.

## R3. `PROXY_SECRET` em produção

**Decision**: `loadConfig(env, { requireProxySecret })`. `server.ts` passa `true`; com `NODE_ENV=production` e segredo ausente ou vazio, falha com `PROXY_SECRET: obrigatório em produção`. A CLI (`cli.ts`) não exige: ela não serve pedidos e a imagem tem `NODE_ENV=production`. Saída explícita: variável `ALLOW_MISSING_PROXY_SECRET` (`true`/`false`, padrão `false`) que o `docker-compose.yml` define como `true`; ignorada fora de produção.

**Rationale**: a imagem do Docker define `NODE_ENV=production` e o `docker compose` local roda essa imagem sem `PROXY_SECRET` (e com o guarda ligado o Vite não passaria o segredo, quebrando o desenvolvimento). A saída explícita e nomeada mantém o compose funcionando sem enfraquecer o Render, onde a variável não existe.

**Alternatives considered**: gerar segredo aleatório no compose (quebra o proxy do Vite, que não conhece o segredo); mudar `NODE_ENV` do compose (religaria a documentação Swagger e mudaria o comportamento descrito no `CLAUDE.md`); exigir sempre em produção sem saída (quebra o compose).

## R4. Limpeza de sessões

**Decision**: `deleteStaleSessions(db, now)` apaga onde `expires_at < now` OU `ended_at < now - 7 dias` (a restrição `sessions_expiry_within_absolute` garante `expires_at <= absolute_expires_at`, então o limite absoluto vencido já entra em `expires_at`). Chamada por `auth.service.purgeStaleSessions()`, executada pela CLI `puzzles collect` **depois** da coleta, num `try/catch` próprio: falha escreve em `stderr`, define código de saída 1 e não desfaz a coleta. Imprime `Sessões apagadas: N`.

**Rationale**: uma sessão com `expires_at` passado já não renova (`decideSession` devolve `expired`), então só o limite absoluto, como a issue sugere, deixaria sessões inativas por até 1 ano. Incluir `expires_at` é a leitura correta de "vencida"; a spec foi ajustada.

**Alternatives considered**: novo comando `sessions purge` (mais uma entrada no workflow); gancho oportunista no login (custa em cada login).

## R5. Sandbox do Clube

**Decision**: só reforçar asserções. `sources/clube/sandbox.test.ts` já exercitava laço infinito, memória e recursão com `toMatchObject({ ok: false })`. Agora cada caso afirma o resultado exato `{ ok: false, detail: 'script: falhou ao executar' }` e o laço, também, que termina em menos de 2 s.

**Rationale**: a issue esperava `script: falha na sandbox`, mas esse texto é do `catch` do próprio motor (instância num estado que não se reaproveita, `sandbox.ts`), não do estouro de tempo ou de memória do script: nesses o motor interrompe o script e o erro volta como `script: falhou ao executar`. As duas mensagens são `ok: false` sem vazar detalhe. Forçar o `catch` do motor exigiria falha artificial do WebAssembly, fora do que a issue pede.

## R6. Remoção de convites

**Decision**: uma migração `0008` gerada com `db:generate -- --custom --name remove_invites`: apaga linhas `INVITE_CREATE` de `rate_limit_attempts`, troca a restrição, `DROP TABLE invites` (os gatilhos e índices caem junto). Remove a tabela e o valor do `schema.ts`, `inviteCode` de `shared`, o texto de `auth.schemas.ts`, os testes que o citam e o `TRUNCATE` de `apps/web/e2e/support.ts`. Atualizar DDE-001, ERD-001 e `docs/design.md`.

**Rationale**: a API não usa a tabela desde a 013. A rota `/api/invites` responde 404 e o site atual não envia `inviteCode`. Um lançamento só da API (e do `shared`, patch) basta; a verificação da versão do site no ar entra no `quickstart.md`.

**Compatibilidade**: `registerRequestSchema` é `z.strictObject`, então remover `inviteCode` faz um corpo com o campo falhar com 400; só abas de antes da feature 013 o enviam. Aceito e registrado na spec (US5, cenário 2). A conferência da versão do site no ar (T021) é o portão: em 2026-10-26 `GET /version.json` do site devolveu `0.10.0` (API `0.6.0`), posterior à feature 013, e `apps/web/src` não cita `inviteCode`.

**Riscos**: `invites` tem chaves estrangeiras para `users`, mas é a tabela que referencia; remover não afeta `users`. A migração é de ida.

## R7. Progresso lê só a grade

**Decision**: `findPuzzleGridById(db, id)` seleciona `sql\`${puzzles.data}->'grid'\`` (Drizzle: expressão `sql` em seleção parcial, confirmada no Context7) e valida com o schema da grade de `shared` (`cellsMatchGrid` já recebe a grade). `get` e `reset` continuam como estão, só `save` muda (`get` precisa de `findPuzzleById`? não: só confirma existência; usar a mesma função leve).

**Rationale**: puzzle salvo não muda; ler a grade basta e deixa a solução no banco.

**Alternatives considered**: cache em memória do tamanho da grade (estado extra e invalidação desnecessária numa instância que dorme).

## R8. Código comum dos adaptadores

**Decision**: mover `xml.ts`, `xml.test.ts`, `clue-text.ts`, `clue-text.test.ts` para `sources/common/` com `git mv`, atualizar as 5 importações (`cruzadaonline/`, `clube/` e `db/seed-puzzle.ts`). Sem mudança de comportamento.

## R9. Leitura em stream no Clube

**Decision**: ler `response.body.getReader()` somando bytes; ao passar de `maxBytes`, `reader.cancel()` e devolver `unexpected-format` / `corpo grande demais`; decodificar com `TextDecoder` ao final. Mantém a checagem de `content-length`.

**Rationale**: limite vale mesmo sem `content-length`. O teste injeta um `fetch` que devolve `ReadableStream` com pedaços.

## Linha de base e acompanhamentos

- Linha de base (T001): `typecheck` e testes unitários verdes (388 + 900 + 144), antes de qualquer mudança.
- Adiado (R2): usar `reserve` em `settings.service.ts` e `puzzles.service.ts`, que ainda conferem e depois registram.
- Adiado: a leitura do corpo sem limite de stream pode existir também em `cruzadaonline/` e `cruzadasbrasil/`; não foi verificada nesta feature.
- Não executado localmente: `npm run test:e2e -w @cruzadinha/web` (exige Chromium, API e servidor de prévia); a única mudança no E2E é tirar `invites` do `TRUNCATE` em `apps/web/e2e/support.ts`. A CI roda o job `e2e`.
- Pendente do autor antes do lançamento: conferir `PROXY_SECRET` no painel do Render (T013).


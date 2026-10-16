# Research: Jogo sem login e cadastro aberto

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-16

Documentação consultada pelo Context7 (constitution, Fluxo de Desenvolvimento): `idb` (`/jakearchibald/idb`, versão 8.0.4 no npm) e `fake-indexeddb` (`/dumbmatter/fakeindexeddb`, versão 6.2.6 no npm). Fastify, Drizzle, React Router, TanStack Query e Zod continuam nas versões já usadas e com as mesmas APIs das features 004 a 012. Na implementação, toda chamada nova a essas bibliotecas passa de novo pelo Context7.

---

## R1. Onde guardar o progresso do visitante

- **Decision**: IndexedDB, pela biblioteca `idb` 8 (dependência nova do `apps/web`, ~1,2 kB). Um banco `cruzadinha-visitante`, versão 1, com um único store `progress` cuja chave é `puzzleId` (`keyPath`). O schema é tipado com `DBSchema` e o store é criado no `upgrade` do `openDB`.
- **Rationale**:
  - A spec pede que os dados sobrevivam a recarregar e a reabrir o navegador (FR-005). O autor sugeriu IndexedDB.
  - O registro é um objeto estruturado (letras, tempos, ajudas). O IndexedDB guarda o objeto direto, sem `JSON.stringify` a cada tecla.
  - Uma transação `readwrite` permite ler e gravar no mesmo passo, o que torna atômica a regra "o salvamento mais recente prevalece" entre duas abas (Edge Cases).
  - O acesso é assíncrono e não trava a digitação.
  - O `idb` só embrulha a API nativa em promessas e tipos. Não traz ORM nem sincronização.
- **Alternatives considered**:
  - `localStorage` (já usado para tema, ajudas e fila de envio): é síncrono e só guarda texto. Ler e gravar não é atômico entre abas, e cada gravação serializa o registro inteiro. Daria conta do tamanho (366 registros de ~3 kB), mas as outras vantagens pesaram mais.
  - `idb-keyval`: mais simples, mas sem transação de leitura e gravação no mesmo passo, que é o que resolve as duas abas.
  - IndexedDB nativo sem biblioteca: funciona, mas a API de eventos aumenta o código e o risco de erro. O `idb` custa pouco.
  - Dexie: grande demais para um único store.

## R2. Navegador sem armazenamento (FR-009)

- **Decision**: o módulo `guest-store` tenta abrir o banco uma vez por carregamento do site. Se `indexedDB` não existir, o `open` falhar ou for bloqueado, ou uma gravação lançar erro (cota, modo privado), o store passa a um mapa em memória para o resto da página e marca `available: false`. O jogo mostra um `Notice` que não bloqueia: "Seu navegador não deixou guardar o progresso. Ele vale só enquanto esta aba estiver aberta."
- **Rationale**: o princípio do FR-032 (feature 010) vale aqui: nada impede de jogar. É o mesmo padrão de `lib/storage.ts`, que engole as exceções do `localStorage`.
- **Alternatives considered**: cair para o `localStorage`. Foi rejeitado porque, quando o IndexedDB falha, o `localStorage` costuma falhar junto (modo privado, dados bloqueados), e duas implementações dobram os testes.

## R3. Pedir armazenamento persistente (`navigator.storage.persist()`)

- **Decision**: não pedir.
- **Rationale**: no Firefox o pedido abre uma janela de permissão, o que interrompe o jogo e soa estranho num site de cruzadinha. Sem o pedido, o armazenamento continua "best effort": o navegador só apaga sob pressão de espaço, e a spec já diz que o site não promete guardar fora daquele navegador.
- **Alternatives considered**: pedir só depois da primeira conclusão. Foi deixado para depois, se aparecer perda de dados em uso.

## R4. Quando gravar o progresso do visitante

- **Decision**: gravar a cada mudança de letras, ajudas ou estado. Se uma gravação estiver em andamento, guardar só a mais nova e gravá-la ao terminar a atual. O tempo decorrido também é gravado ao ocultar a aba (`visibilitychange`) e ao pausar. Não há debounce.
- **Rationale**: cada gravação é um `put` de poucos kB, sem rede. Com debounce (como na fila do servidor, de 1,5 s), a última tecla antes de fechar a aba poderia se perder, e no `pagehide` não há garantia de que uma transação assíncrona termine. Gravar na hora elimina essa janela.
- **Alternatives considered**: reaproveitar o debounce de `save-queue.ts`. Foi rejeitado porque o debounce existe por causa da rede, e aqui não há rede.

## R5. Regras de salvamento, conclusão e recorde do visitante

- **Decision**: funções puras `decideGuestSave(current, incoming, now)` e `decideGuestReset(current, now)` em `apps/web/src/game-logic/guest-progress.ts`, com testes unitários. Elas espelham `decideSave`/`decideReset` da API (feature 008):
  - Um `savedAt` mais antigo que o guardado é ignorado.
  - Um registro concluído ignora mudanças `in_progress` (sem 409: o visitante não tem outro aparelho).
  - A conclusão grava `completedAt`, `finishedMs` e o recorde (`bestMs`/`bestAt`, o menor tempo).
  - O reinício limpa letras, tempo e ajudas e mantém o recorde.
- **Rationale**: o princípio V pede regras de jogo puras e testadas em `game-logic`. Espelhar a API mantém o mesmo comportamento para visitante e pessoa logada (FR-006).
- **Alternatives considered**: mover `decideSave` para `packages/shared` e reaproveitá-lo. Foi rejeitado porque a função depende do `Date` do servidor, do limite de 5 minutos no futuro e do formato `ProgressState` do repositório. Adaptar custaria mais que escrever ~40 linhas puras com a mesma tabela de testes.

## R6. Validação dos dados lidos do navegador (FR-008)

- **Decision**: cada registro tem `v: 1` e passa por um schema Zod (`guestProgressRecordSchema`) ao ser lido. Também precisa passar por `cellsMatchGrid` (de `shared`) contra a grade do puzzle aberto. Um registro inválido, de outra versão ou que não bate com a grade é apagado e a cruzada abre do zero. Na biblioteca, um registro inválido conta como "não iniciado" e é apagado na próxima abertura daquela cruzada.
- **Rationale**: princípio I (dado externo entra como `unknown` e passa por Zod). Assim um formato futuro nunca trava uma versão antiga do site.

## R7. Ajudas do visitante

- **Decision**: o `HelpSnapshot` do visitante (uso, marcas, células travadas) vai dentro do registro de progresso no IndexedDB, no campo `help`. Para a pessoa logada nada muda: continua em `localStorage` (`cruzadinha:help:<userId>:<puzzleId>`).
- **Rationale**: progresso e ajudas do visitante ficam numa única gravação atômica, e "Jogar de novo" limpa os dois juntos. Não há chave de `localStorage` com um "id de visitante" que poderia colidir com uma conta.

## R8. Sessão opcional nas rotas de puzzle e biblioteca

- **Decision**: novo `preHandler` `createOptionalSession` em `modules/auth/session.plugin.ts`:
  - Sem cookie de sessão, segue com `request.user = null` (visitante).
  - Com cookie válido, preenche o usuário e renova o cookie como o `requireSession`.
  - Com cookie presente e inválido (expirado, encerrado, mal formado), responde `401 unauthenticated` e apaga o cookie (`clearSessionCookie`).

  `GET /api/puzzles`, `GET /api/puzzles/:id` e `GET /api/library` passam a usar o `optionalSession`. As rotas de progresso e `GET /api/auth/me` continuam com `requireSession`, mas o `requireSession` também passa a apagar o cookie quando ele estava presente e é inválido.

  O ponto é quem tem uma sessão vencida: o `GET /api/auth/me` que o site faz ao abrir já descarta o cookie velho. Sem isso, o site trataria a pessoa como visitante enquanto continuava mandando o cookie velho, e o primeiro `GET /api/puzzles/:id` (num link direto para o jogo) daria 401 antes de o tabuleiro carregar.
- **Rationale**:
  - O 401 com cookie inválido faz o site descobrir que a sessão terminou, em vez de passar a receber silenciosamente a biblioteca de visitante enquanto acha que está logado. É assim que o FR-013 (aviso de sessão terminada) e o FR-032 da feature 010 continuam funcionando.
  - Apagar o cookie faz o pedido seguinte já sair como visitante, sem ciclo de 401.
- **Alternatives considered**:
  - Tratar cookie inválido como visitante sem 401: a biblioteca de uma pessoa com sessão expirada viraria a de visitante sem aviso.
  - Rotas novas só para visitante (`/api/public/...`): duplicam rotas e docs sem ganho.

## R9. Biblioteca sem sessão

- **Decision**: `GET /api/library` sem sessão devolve os mesmos `items` (mesmo schema, mesma ordem, mesmo limite de 366), com `status: 'not_started'` e todos os tempos nulos. Uma consulta nova `listPuzzleRows(db, limit)` lê só os metadados de `puzzles`, sem `JOIN` com `progress`. O site junta esses itens com os registros do IndexedDB numa função pura `mergeGuestLibrary(items, records)`.
- **Rationale**: FR-002 (nenhum dado de usuário para quem não tem sessão) e US2-4 (os mesmos dias). O schema da resposta não muda, o que é compatível com o site anterior.
- **Alternatives considered**: o site ler a lista de dias de outro lugar. Não há outro lugar: os dias guardados só existem no servidor.

## R10. Chave de cadastro

- **Decision**:
  - Variável `REGISTRATION_ENABLED` em `config.ts`. Aceita só `true` ou `false`, e texto vazio ou ausente vale `false`. Outro valor impede a API de subir com a mensagem de configuração inválida.
  - Rota nova `GET /api/auth/registration`, sem sessão, que responde `{ open: boolean }` com `Cache-Control: no-store`.
  - Em `POST /api/auth/register`, com a chave desligada, a recusa vem antes de qualquer outra coisa: `403 registration-closed`, código de erro novo em `apiErrorCodeSchema`. Essa recusa não conta tentativa.
- **Rationale**:
  - O FR-015 pede valor validado na subida, desligado por padrão.
  - No Render, a variável vai no `render.yaml` com `sync: false` e sem `value`: um valor no Blueprint voltaria a valer em toda sincronização e desfaria a mudança feita no painel (FR-018).
  - O FR-017 pede que o site descubra com o servidor (uma variável `VITE_*` exigiria gerar o site de novo).
  - O FR-018 diz que mudar a chave é só configuração e reinício.
  - A recusa antes do limite de tentativas não revela nada sobre contas (FR-016) e não gasta o limite de quem tentar quando o cadastro abrir.
  - `403` porque o pedido é válido mas não é permitido agora.
- **Alternatives considered**:
  - Rota genérica `/api/config` com várias chaves: nada mais precisa dela hoje.
  - Pôr `registrationOpen` no `/api/health`: o health é do monitor de deploy e não deve mudar de significado.

## R11. Cadastro sem convite

- **Decision**:
  - `registerRequestSchema` passa a ser `{ email, password, inviteCode?: string (máx. 64, ignorado) }`. O `inviteCode` opcional existe só para o site da versão anterior, que ainda o envia, não receber 400. Ele sai no lançamento B (R15).
  - `auth.register` cria a conta e abre a sessão numa transação, sem convite.
  - O e-mail já existente continua `409 registration-failed`.
  - O limite continua de 10 cadastros por endereço por hora.
- **Rationale**: FR-014. O schema de pedido fica estrito (desconhecidos continuam recusados), e o campo opcional ignorado é a forma do `docs/versionamento.md` §8 de mudar um pedido em dois lançamentos.
- **Risco aceito**: com o cadastro aberto, a resposta 409 confirma que um e-mail tem conta. É o mesmo comportamento de hoje, agora alcançável por qualquer pessoa. Quem reduz o risco é o limite por endereço e a chave desligada por padrão (Edge Cases da spec).

## R12. Criação de conta pelo autor (FR-019)

- **Decision**: comando `users create --email <email>` na linha de comando do autor.
  - A senha nunca é argumento. Em terminal interativo, o comando a pede duas vezes, sem eco: `readline` com a saída silenciada enquanto se digita.
  - Com a entrada padrão redirecionada (por exemplo `printf '%s\n' "$SENHA" | ... users create --email ...` num script), lê a primeira linha.
  - E-mail e senha passam por `emailSchema`/`passwordSchema` (as mesmas regras do cadastro). A conta é criada por `auth.createAccount`, que o `register` também usa, e não abre sessão.
  - Saídas: `0` criada; `1` e-mail já existente ("Já existe uma conta com esse e-mail.", sem alterar nada); `2` uso ou validação inválidos.
  - Funciona com a chave ligada ou desligada e não conta tentativas.

  `CliDeps` ganha `readSecret(prompt): Promise<string>`, injetável nos testes.
- **Rationale**: FR-019 (sem senha em argumento, histórico, saída ou log). Mesmo padrão dos comandos `invites` (sem cota) que ele substitui. No Render, o shell do serviço tem terminal.
- **Alternatives considered**: senha gerada e mostrada uma vez. Foi rejeitado porque a senha apareceria na saída, contra o FR-019.

## R13. Remoção dos convites, lançamento A

- **Decision**: no lançamento A, o código deixa de usar convites:
  - Saem o módulo `modules/invites` (rotas, serviço, repositório, schemas, `invite-status`), `generateInviteCode`/`formatInviteCode`/`normalizeInviteCode`/`INVITE_CODE_ALPHABET` de `lib/tokens.ts`, `inviteCreate` de `limits.ts`, os comandos `invites` da linha de comando e `packages/shared/src/invites`.
  - No site, saem `features/invites` (Konami e janela) e `api/invites.ts`.
  - A tabela `invites`, a definição dela em `schema.ts` e o valor `INVITE_CREATE` do `CHECK` de `rate_limit_attempts` ficam até o lançamento B.
- **Rationale**: `docs/versionamento.md` §8: remover coluna ou tabela leva dois lançamentos, e migração no mesmo lançamento só pode acrescentar. Assim, reverter a API para a versão anterior continua funcionando enquanto a tabela existir.
- **Site anterior**: `POST /api/invites` passa a responder 404 do Fastify, e a janela de convite do site anterior já mostra o erro genérico, sem afetar as outras telas (FR-022).

## R14. Códigos de erro de convite

- **Decision**: `invalid-invite` e `invite-quota-reached` continuam em `apiErrorCodeSchema` no lançamento A, marcados como obsoletos, e saem no B.
- **Rationale**: o `apiErrorSchema` é estrito. Se o site novo encontrar a API anterior (reversão), uma resposta com esses códigos ainda é reconhecida.

## R15. Lançamento B (depois que o A estiver no ar)

- **Decision**: um PR separado, depois que o A for lançado e publicado:
  - migração `0004_drop_invites` (Drizzle gerado a partir de `schema.ts` sem `invites`): apaga a tabela, apaga as linhas `INVITE_CREATE` de `rate_limit_attempts` e refaz o `CHECK` sem esse valor;
  - remove `invites` de `schema.ts` e de `rateLimitActions`;
  - remove os códigos de erro de convite e o `inviteCode` opcional do pedido de cadastro;
  - remove `invites` do `TRUNCATE` do E2E;
  - atualiza `docs/data-definitions/DDE-001` e `docs/entity-relationship-diagrams/ERD-001`.
- **Rationale**: FR-021 com a regra de dois lançamentos. As tarefas do B ficam numa fase própria do `tasks.md`.

## R16. Quem é o "visitante" no site

- **Decision**:
  - A consulta de sessão (`sessionQueryOptions`) passa a resolver `AuthResponse | null`: um 401 em `GET /api/auth/me` vira `null`, com `skipUnauthenticatedHandler`.
  - Um hook `useViewer()` devolve `{ kind: 'guest' } | { kind: 'user', user }`.
  - O `requireSessionLoader` sai. No lugar entra um `viewerLoader` que só garante que a consulta de sessão foi resolvida (com `null` permitido) antes de `/`, `/dia/:date` e `/jogo/:puzzleId`.
- **Rationale**: FR-001. Uma única fonte de verdade (o cache do TanStack Query), sem estado global extra (princípio V).

## R17. Sessão que termina fora do tabuleiro (FR-013)

- **Decision**: o `installSessionHandlers` muda o caso "outras telas", **só quando a sessão em cache era de uma conta**:
  - em vez de redirecionar ao login, grava `null` na consulta de sessão (a pessoa vira visitante);
  - invalida a biblioteca uma vez;
  - mostra no `AppLayout` um `Notice` que não bloqueia: "Sua sessão terminou. Você está como visitante." com o botão "Entrar", que leva a `/login?next=<rota atual>`.

  Se a pessoa já era visitante, o 401 não faz nada no handler, e a tela trata o erro (R19). Isso evita um laço de pedidos contra a API anterior. No tabuleiro (`/jogo/...`) nada muda (`markExpired`, janela de login presa à conta).
- **Rationale**: a spec manda que o jogo de uma pessoa logada não vire de visitante sozinho no meio da partida (Edge Cases), e que fora do tabuleiro a pessoa siga navegando.

## R18. Entrar e sair (FR-011, FR-012)

- **Decision**:
  - Sair (`useLogoutMutation`) limpa o cache e vai para `/` (não mais `/login`). A pessoa vira visitante e vê só os registros do IndexedDB.
  - Entrar grava a sessão no cache, e a biblioteca e o jogo passam a ler o servidor. Os registros do IndexedDB não são lidos nem apagados enquanto há sessão.
  - O `Game` é montado com `key={puzzleId + ':' + viewerKey}`, para que trocar de visitante a logado (ou o inverso) monte um jogo novo, sem misturar estados.
  - A fila de envio da conta (`cruzadinha:outbox:<userId>:...`, `localStorage`) e os registros de visitante (IndexedDB) ficam em lugares diferentes e nunca são lidos um no lugar do outro.
- **Rationale**: Q2 da sessão de esclarecimento (resposta A).

## R19. Site anterior com a API nova, e o inverso (FR-022)

- **API nova com o site anterior** (o caso normal, porque a API é publicada antes):
  - o site anterior exige sessão para tudo e continua funcionando para quem tem conta;
  - o cadastro com convite recebe `403 registration-closed` (código desconhecido, mostrado como erro genérico) ou, com a chave ligada, cria a conta ignorando o código;
  - o Konami recebe 404 e a janela mostra erro genérico.
- **Site novo com a API anterior** (só numa reversão da API):
  - `GET /api/auth/registration` dá 404 e o site trata como fechado (FR-017);
  - a biblioteca de visitante dá 401 e o site mostra "Entre para ver a biblioteca", com o botão de login, em vez de travar;
  - quem tem conta continua normal.
- **Rationale**: `docs/versionamento.md` §8.

## R20. Documentação OpenAPI

- **Decision**:
  - As rotas de puzzle e biblioteca passam a declarar `security: [{}, { session: [] }]` (sessão opcional, na forma do OpenAPI 3.1).
  - A rota nova `GET /api/auth/registration` ganha `schema` em `auth.schemas.ts`.
  - As rotas de convite saem do documento.
  - O `docs.test.ts` continua exigindo `schema` em toda rota `/api/*`.
- **Rationale**: convenção da feature 005.

## R21. Testes

- **Decision**:
  - **Unitários, API**: `config` (chave), `decide*` sem mudança, `run-cli` com `users create` (com `readSecret` falso), rotas com `app.inject()` onde já existem.
  - **Integração, API** (`*.int.test.ts`):
    - cadastro com a chave ligada e desligada, inclusive pedido direto à API e o `inviteCode` ignorado;
    - `GET /api/auth/registration`;
    - puzzles e biblioteca sem cookie, com cookie válido e com cookie inválido (401 e cookie apagado);
    - biblioteca sem sessão sem dado de usuário;
    - `users create`.

    `invites.int.test.ts` sai, e `register.int.test.ts` e `cli.int.test.ts` são reescritos.
  - **Unitários, site** (Vitest e jsdom):
    - `fake-indexeddb/auto` no `src/test/setup.ts`, com um `IDBFactory` novo antes de cada teste;
    - `guest-progress.ts` (regras puras), `guest-store.ts` (gravar, ler, mais recente prevalece, inválido descartado, sem armazenamento) e `mergeGuestLibrary`;
    - `useGame` em modo visitante pelo `game-harness`;
    - telas de login e cadastro com a chave aberta e fechada, cabeçalho de visitante e aviso de sessão terminada;
    - o Konami deixa de ter efeito;
    - `vitest-axe` nas telas alteradas.
  - **Ponta a ponta** (Playwright): spec nova `visitante.spec.ts` (abrir sem conta, jogar, recarregar, concluir, conferir no banco que não há linha em `progress`). `fluxo-principal.spec.ts` deixa de criar convite: cadastra com a chave ligada no job de E2E (`REGISTRATION_ENABLED=true` na API do E2E).
- **Rationale**: princípio VII (autenticação, cadastro e progresso com Postgres real; um ou dois caminhos ponta a ponta) e SC-002, SC-003, SC-004 e SC-007.

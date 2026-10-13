# Research: Coleta e cache de puzzles

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Nenhum item do Technical Context ficou como NEEDS CLARIFICATION. Abaixo, as decisões de desenho.

## Conferência no Context7 (2026-10-13)

- **Drizzle ORM** (`/drizzle-team/drizzle-orm-docs`): `db.insert(t).values(v).onConflictDoNothing({ target: [t.a, t.b, t.c] }).returning()` existe no Postgres; com conflito, `returning()` volta vazio. `jsonb().$type<T>()` só afeta tipos em compilação. `date({ mode: 'string' })` mantém `YYYY-MM-DD` como texto.
- **Fastify** (`/fastify/fastify`): `request.query` e `request.params` ficam tipados por `RouteGenericInterface` (`Querystring`, `Params`). Como a validação aqui continua nos `safeParse` (feature 005), os genéricos não são usados e os valores entram como `unknown`.

## R1. Coluna de data

**Decisão**: `date('date', { mode: 'string' })`.
**Motivo**: a data do puzzle é um dia de calendário, sem hora nem fuso; como string `AAAA-MM-DD` ela casa com `isoDateSchema` e com o que a fonte devolve, sem conversão por fuso.
**Alternativas**: `timestamp` (cria ambiguidade de fuso); `text` (perde a validação do tipo no banco).

## R2. Gravação e concorrência

**Decisão**: `insert ... onConflictDoNothing({ target: [source, level, date] }).returning()`; se voltar vazio, ler a linha existente.
**Motivo**: dois pedidos simultâneos da mesma data terminam com uma linha só e ambos recebem o puzzle (spec, Edge Cases). Não precisa de lock nem transação.
**Alternativas**: `onConflictDoUpdate` (reescreve um puzzle que deve ficar como está, spec Assumptions); lock por advisory (complexidade sem ganho).

## R3. Validar antes de gravar e ao ler

**Decisão**: o adaptador já valida o par puzzle/solução (`validatePuzzleWithSolution`); o serviço revalida o par antes de gravar (defesa em profundidade, FR-006: se falhar, não grava e responde falha da fonte) e, ao ler do banco, reparseia `data` com `puzzleSchema` e `solution` com `solutionSchema`.
**Motivo**: `jsonb` chega como `unknown` em tempo de execução (princípio I). Se uma linha estiver corrompida, a leitura falha como erro interno em vez de entregar dado inválido ao navegador.

## R4. Data de hoje

**Decisão**: extrair `todayInSaoPaulo(clock)` para `src/lib/dates.ts` (`Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })`), usada por `collect` e por `check.ts`.
**Motivo**: o dia do puzzle é o de Brasília; usar UTC trocaria de dia às 21h locais. O relógio injetável deixa os testes determinísticos.

## R5. Estratégia da coleta

**Decisão**: `collect()` monta as datas candidatas (hoje e os `COLLECT_HISTORY_DAYS` dias anteriores; padrão 31, a janela observada na feature 003), remove as que já estão no banco e busca as restantes em ordem decrescente, uma requisição por data, com pausa de 2 s (`PAUSE_MS`, injetável). Cada puzzle recebido é gravado. `unavailable` é contado à parte e não é falha; `rate-limited` interrompe a execução e relata as datas pendentes; outras falhas são registradas e a coleta segue. Exit 1 se houve falha ou interrupção.
**Motivo**: a lista `dates` da fonte só acompanha um puzzle, então depender dela exigiria um pedido por execução mesmo com tudo gravado (contra FR-009). A janela, configurável pela variável `COLLECT_HISTORY_DAYS` (inteiro de 0 a 365, padrão 31, validado em `config.ts`; 0 coleta só hoje), mantém a idempotência: com tudo gravado, zero pedidos. O limite real de histórico da fonte é desconhecido (por isso a variável e não uma constante); o teto de 365 evita um valor absurdo por engano. O custo é uma nova tentativa, por rodada, das datas que a fonte não publica; a pausa de 2 s e a parada em limite de uso limitam o risco.
**Alternativas**: tabela de datas indisponíveis (estado extra sem benefício claro); usar `dates` da resposta de hoje (pedido extra quando hoje já está gravado).

## R6. Busca sob demanda e limite

**Decisão**: a rota consulta o banco; só se faltar e a data não for futura chama a fonte. Cada chamada à fonte nessa rota conta contra `puzzleFetch` (30 por 60 min, por endereço), com ação `PUZZLE_FETCH` e chave `NETWORK_ADDRESS`. Passado o limite, 429 `too-many-attempts` com `Retry-After`.
**Motivo**: um usuário logado poderia pedir datas inexistentes em série e martelar a fonte. Reaproveita o módulo `rate-limit` e o padrão de `sendTooManyAttempts`. Puzzle já guardado nunca consome o limite.
**Alternativas**: sem limite (risco de bloqueio da fonte); limite por usuário (a chave `USER` exigiria novo tipo de chave; o endereço já é o padrão do projeto).

## R7. Contrato de resposta

**Decisão**: `{ puzzleId: uuid, puzzle: Puzzle }`, schema `puzzleResponseSchema` em `packages/shared`. `GET /api/puzzles/:id` devolve o mesmo corpo e nunca busca na fonte.
**Motivo**: o front precisa do identificador para o futuro `progress`; mantém `puzzle` idêntico ao tipo existente, sem campo de resposta.

## R8. Códigos de erro

**Decisão**: `puzzle-unavailable` (404: futuro, ou a fonte não publica) e `puzzle-source-failed` (502: fonte fora do ar, recusou, formato inesperado ou limite de uso). Data ou nível inválidos usam `invalid-input` (400), como nas outras rotas; `id` que não é uuid também é 404 `puzzle-unavailable`.
**Motivo**: o front precisa distinguir "não existe" de "não consegui buscar" (design.md, seção 7).

## R9. Agendamento

**Decisão**: `.github/workflows/collect.yml` com `schedule` e `workflow_dispatch`: `npm ci` (`HUSKY: 0`), `npm run build -w @cruzadinha/api`, `node apps/api/dist/cli.mjs puzzles collect`, com `DATABASE_URL` de `secrets`. Horários em UTC: `1 3 * * *` (00:01 em Brasília) e `0 11 * * *` (08:00).
**Motivo**: segue o design.md (seção 9); não depende da API acordada. Falha de job notifica por e-mail do GitHub por padrão (SC-008). O GitHub desativa agendamentos de repositório público após 60 dias sem commits: anotado no quickstart.
**Alternativas**: cron dentro da API (não roda com o servidor dormindo); cron do Render (pago, descartado no design.md).
**Antes da implantação**: sem o segredo `DATABASE_URL`, o agendamento seria um job vermelho todo dia. Um passo `guard` com `secrets.DATABASE_URL != ''` (só um booleano, sem expor o valor) pula a coleta no `schedule` com um aviso e falha no `workflow_dispatch`.
**Risco**: o workflow não aplica migrações (evita corrida com a API, que já migra ao subir). Depois de uma migração nova, a coleta falha até a API ser publicada com o schema novo; a falha fica visível (SC-008) e a execução seguinte se recupera, pois a coleta é idempotente. Para a feature 006, publicar a API com a migração `0002` antes de ativar o agendamento.

## R10. Seed do puzzle de exemplo

**Decisão**: `runSeed` (`db/seed-user.ts`) chama, depois de criar a conta, um passo que grava o exemplo: `convertAgilmenteResponse(fixture, 'daily', hoje)` com a fixture `daily-valid.json` (5×5, texto inventado), troca a atribuição por `{ sourceName, title: 'Exemplo de desenvolvimento (seed)', author: null, copyright: null }` (com o mesmo texto em `sourceName`) e insere com `onConflictDoNothing` em `(source, level, date)`. Mensagem: "Puzzle de exemplo gravado: AAAA-MM-DD" ou "Já existe puzzle em AAAA-MM-DD; exemplo não gravado". A data vem do relógio via `todayInSaoPaulo` (R4).
**Motivo**: reaproveita o conversor e a validação do par puzzle/solução, então o exemplo passa pelas mesmas regras de qualquer puzzle (FR-022); sem rede (princípio VII); ocupa o puzzle de hoje por decisão do autor (spec, Clarifications). `source` continua `oglobo`, pois o enum só aceita essa fonte; a atribuição deixa claro que é exemplo e não o apresenta como conteúdo da fonte real.
**Consequência assumida**: enquanto o exemplo ocupa hoje, a coleta o conta como existente. Para obter o real em desenvolvimento, recriar o banco local (documentado no quickstart).
**Alternativas**: data fixa no passado (evitaria a colisão, descartada pelo autor); arquivo de seed `.sql` (duplicaria o formato interno e não validaria a solução); buscar um puzzle real (rede e conteúdo de terceiros no seed).
**Restrição**: o import da fixture fica só em arquivos do seed, que está fora do bundle e da imagem (`tsx src/db/seed.ts`).

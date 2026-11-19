# Research: Casa (064)

## R1. Quem monta a grade: o modelo ou o código

> **Substituído pela 065** (`specs/065-cruzada-densa/`): a grade densa é preenchida pelo código com uma lista de palavras e o modelo só escreve as dicas.

- **Decision**: o modelo só devolve uma lista de palavras com dicas (JSON); a grade N x N é montada por código puro e determinístico (`sources/generated/layout.ts`), no estilo "palavras cruzadas livres": cada palavra entra cruzando outra já posta, sem encostar em nenhuma letra fora do cruzamento, e as casas que não são de nenhuma palavra viram blocos.
- **Rationale**: modelos de linguagem erram muito ao preencher uma grade com cruzamentos coerentes; pedir a grade pronta gastaria as 3 tentativas (FR-008) à toa. Montando a grade no código, a coerência dos cruzamentos (FR-006) vale por construção, a montagem não gasta crédito e pode ser repetida com outras ordens das palavras até achar um bom resultado. O formato interno já aceita grade com blocos livres (regras em `packages/shared/src/puzzle/rules.ts`: toda sequência de casas abertas é uma palavra; nenhuma casa aberta fora de palavra).
- **Alternatives considered**: (a) o modelo devolve a grade inteira: alto índice de cruzamentos errados e palavras inventadas nas sequências acidentais; (b) grade americana densa preenchida por código com dicionário: precisaria de uma lista grande de palavras em português e licença; o modelo ainda teria de escrever as dicas depois (2 chamadas); (c) o modelo valida a grade: gasto extra sem garantia.

## R2. Algoritmo de montagem

> **Substituído pela 065** (`specs/065-cruzada-densa/`): a grade densa é preenchida pelo código com uma lista de palavras e o modelo só escreve as dicas.

- **Decision**: gerador com semente (PRNG simples, semente derivada da data) para grade quadrada `N x N` (N de 9 a 15, da configuração, R9), que tenta até 200 ordens das palavras. Em cada ordem: a primeira palavra (das mais longas, com ruído) entra na horizontal em linha e coluna sorteadas; depois, a cada passo, entre todas as palavras que faltam, entra a posição que mais cruza uma palavra já posta numa letra idêntica (acento incluído), com desempate pela palavra mais curta e por ruído ("melhor primeiro"); posição inválida se sai da grade, se a casa antes ou depois da palavra está aberta ou se uma casa nova encosta lateralmente em letra existente. Fica a montagem com mais palavras; aceita se tiver ao menos `minWords(N) = round(1.25 * N)` palavras (9 → 11, 11 → 14, 13 → 16, 15 → 19) e todas ligadas entre si. Depois: numeração em ordem de leitura e construção de `Puzzle` e `Solution`, conferidos com `puzzleSchema` e `validatePuzzleWithSolution` (os mesmos da coleta).
- **Rationale**: é o algoritmo clássico de gerador de cruzadas livres; puro, testável com lista inventada e semente fixa (constituição V e VII). 14 palavras numa 11 x 11 (19 numa 15 x 15) é um jogo de tamanho parecido com as fontes menores. Tudo em memória, milissegundos.
- **Alternatives considered**: busca exaustiva com retrocesso (mais código, ganho pequeno); exigir grade densa (impossível com ~40 palavras); encaixar uma palavra por vez na ordem sorteada (primeira versão).
- **Ajuste com a resposta real (T032, T050)**: com as 64 palavras reais (fixture do contrato), a primeira versão (uma palavra por vez na ordem sorteada, primeira palavra no meio) chegou a no máximo 10 palavras no 9 x 9 e 14 no 11 x 11, mesmo com 2000 ordens; a coleta falharia quase todo dia. Com "melhor primeiro" e 200 ordens, 10 datas por tamanho montaram todas, com no mínimo 12 (9 x 9), 16 (11 x 11), 21 (13 x 13) e 27 (15 x 15) palavras, até ~2,3 s por grade. O mínimo `minWords` ficou como estava. O 9 x 9 tem a menor folga (12 a 14 contra 11).

## R3. Pedido ao modelo

> **Substituído pela 065** (`specs/065-cruzada-densa/`): a grade densa é preenchida pelo código com uma lista de palavras e o modelo só escreve as dicas.

- **Decision**: `POST https://api.deepseek.com/chat/completions`, `Authorization: Bearer <DEEPSEEK_API_KEY>`, `response_format: { type: 'json_object' }`, `temperature` alta (1.3) para variedade, `max_tokens` 6000 (cobre 15 x 15), sem streaming, `AbortSignal.timeout(180_000)`. Modelo em `DEEPSEEK_MODEL` (padrão `deepseek-chat`, conferir o nome atual na doc ao implementar). O prompt (em `sources/generated/prompt.ts`, função pura `buildPrompt({ size, difficulty, date })`) pede `4 * N + 20` palavras (R14) de conhecimentos gerais em português do Brasil, de 3 a `N` letras, no nível de dificuldade configurado (texto por nível em R10), uma palavra só (sem espaço, hífen ou número), com dica curta que não contém a resposta, e traz um exemplo do JSON. A data entra no prompt só como semente de variedade. `fetch` injetado, como nos outros adaptadores.
- **Rationale**: a API é compatível com a da OpenAI; JSON Output garante JSON válido, mas a doc avisa que o conteúdo pode vir vazio (só espaços) ou cortado (`finish_reason: 'length'`): os dois casos são tentativa falha. Sem dependência nova (o SDK da OpenAI não é necessário para um `fetch`).
- **Alternatives considered**: SDK `openai` (dependência para uma chamada); modelo de raciocínio (mais caro e lento, a tarefa não precisa).

## R4. Fim dos créditos e erros

- **Decision**: classificação da resposta HTTP:
  - `402 Insufficient Balance` → para na hora, sem nova tentativa: `{ ok: false, reason: 'unavailable', detail: 'sem créditos' }` (quieto).
  - sem `DEEPSEEK_API_KEY` → nenhuma chamada: `{ ok: false, reason: 'unavailable', detail: 'sem chave' }` (quieto).
  - `401` → `refused` sem nova tentativa (chave errada é erro de configuração e deve abrir aviso).
  - `429`, `5xx`, timeout, rede, conteúdo vazio, cortado, JSON fora do formato, lista que não monta grade → tentativa falha; até 3 chamadas no total; esgotou → `source-down` (429/5xx/rede) ou `unexpected-format` (conteúdo).
- **Rationale**: o pedido "deve apenas parar" vale para crédito; chave errada não é falta de crédito e esconder seria pior. `unavailable` já é tratado pela coleta como "não é falha" (sem `Falhou em`, saída 0, sem issue em `collect.yml`).
- **Alternatives considered**: consultar `GET /user/balance` antes (uma chamada a mais por dia e corrida com o gasto real); novo `FetchFailureReason` (mudaria todos os `switch` das fontes sem ganho).

## R5. Onde aparece "sem créditos"

- **Decision**: `CollectReport` ganha `notes: string[]`; `collectListed` grava `"<data>: <detail>"` em `notes` quando o resultado é `unavailable` com `detail`. A CLI imprime `[Casa] Pulado em <data>: sem créditos` em **stdout** (nunca a linha `Falhou em`, que é o gatilho da issue `fonte-quebrada`).
- **Rationale**: muda uma estrutura interna da API (não é resposta HTTP); o relatório diz por que o dia ficou vazio sem virar falha.

## R6. Fonte nova e compatibilidade com o site anterior

- **Decision**: id `casa`, nome `Casa`, sem busca sob demanda (`onDemand: false`, em `puzzleSourcesWithoutFetch`), `listRecent` que só devolve o dia corrente (`todayInSaoPaulo(clock)`). Entrega em **duas releases**:
  1. **Release A (preparação)**: os esquemas de resposta do site passam a descartar ids de fonte desconhecidos em vez de recusar a resposta inteira: `sourcesResponseSchema.sources` e `statsSchema.bySource` (e `adminSourcesResponseSchema`). Sem fonte nova.
  2. **Release B (fonte)**: id `casa` no enum, migração, adaptador, textos. A migração cria a linha de `source_settings` de `casa` **escondida**; o admin a liga pelo painel depois que a release B do site estiver no ar e houver a primeira cruzada.
- **Rationale**: `deploy.yml` publica a API antes do site e o PWA mantém versões antigas abertas; hoje `GET /api/sources` e `GET /api/stats` com um id novo quebram o site antigo (o enum é estrito). Começar escondida também evita uma aba vazia antes da primeira geração. Atualiza a premissa da spec ("nasce visível") para "nasce escondida".
- **Alternatives considered**: uma release só (quebra estatísticas e abas do site antigo até recarregar); filtrar no servidor (o `computeStats` é o mesmo no site e na API).

## R7. Segredo e onde roda

- **Decision**: `DEEPSEEK_API_KEY` e `DEEPSEEK_MODEL` lidos só em `config.ts` (opcionais). A chave fica no segredo `DEEPSEEK_API_KEY` do GitHub Actions, passada só ao passo da coleta em `collect.yml`; não vai para o Render (a API nunca gera). Mensagens de erro do adaptador nunca incluem corpo da resposta, prompt, palavras ou dicas (FR-015); `detail` só tem status HTTP e motivo curto.
- **Rationale**: FR-005 e FR-014; o servidor web nem precisa da chave.

## R7b. Interruptor da geração (clarificação de 2026-11-17)

- **Decision**: `GENERATION_ENABLED` em `config.ts`, no padrão de `CAPTCHA_ENABLED`: padrão `true` com `NODE_ENV=production`, `false` nos outros. Desligado (ou sem chave) → nenhuma chamada, `unavailable` + `detail: 'geração desligada'` (ou `'sem chave'`). `collect.yml` não define `NODE_ENV`, então o passo Coletar passa `GENERATION_ENABLED: 'true'` explicitamente junto do segredo. `source:check:generated` ignora o interruptor (é um pedido manual e explícito).
- **Rationale**: uma chave esquecida no `.env` local não pode gastar crédito a cada `puzzles collect`; o limite diário local é de outro banco e não protege a conta de produção.
- **Alternatives considered**: só a chave (gasto acidental); nunca fora de produção (impede testar a coleta real local de propósito).

## R8. Validação das palavras e dicas (FR-006)

- **Decision**: esquema Zod estrito da saída do modelo (`sources/generated/schema.ts`): `{ words: [{ answer, clue }] }`, 20 a 100 itens. Por item, depois de `trim` e maiúsculas: resposta só com letras `A-Z` e `ÁÀÂÃÉÊÍÓÔÕÚÜÇ`, 3 a `N` letras; dica de 3 a 120 caracteres, sem `<`, `>`, `http`, `www` nem a resposta (comparação com `plain()` de `sources/generated/normalize.ts`). Itens inválidos são descartados um a um; respostas repetidas (comparando sem acento) ficam só a primeira. A tentativa falha se sobrarem menos de 20 itens ou se a montagem (R2) não aceitar.
- **Rationale**: descartar item a item aproveita a chamada; as regras de forma da grade e coerência ficam com os validadores que já existem.

## R8b. Fixture real para o teste de contrato (constituição IV)

- **Decision**: uma resposta real de `POST /chat/completions` salva por `source:check:generated --save`, reduzida a ~20 itens, sem `id` nem `usage`, em `apps/api/src/sources/generated/fixtures/deepseek-response.json`; o teste de contrato passa por esquema HTTP, `cleanWords` e `layout`. Os demais casos usam fixtures inventadas no mesmo formato.
- **Rationale**: o princípio IV exige que mudança de formato do fornecedor quebre os testes; o conteúdo é próprio (sem direito de terceiros) e a resposta não traz segredo.
- **Alternatives considered**: só fixtures inventadas (violaria o princípio IV).

## R9. Configuração de geração (tamanho e dificuldade), por fonte gerada

- **Decision**: tabela nova `generated_source_settings`, uma linha por fonte gerada: `generated_source_setting_id uuid PK`, `source_id text UNIQUE` (mesmo `CHECK` de ids de `source_settings`, restrito às fontes geradas), `grid_size smallint NOT NULL DEFAULT 11 CHECK 9..15`, `difficulty text NOT NULL DEFAULT 'medium' CHECK IN ('easy','medium','hard')`, `timestamps` e trigger. A migração cria a linha de `casa`. Rotas no módulo `sources` (que já tem o painel e o guarda de admin), atrás de `createRequireAdmin`: `GET /api/admin/generated` (lista), `PUT /api/admin/generated/settings` e `POST /api/admin/generated/discard` (contrato em `contracts/admin-generated-sources.md`; id da fonte no corpo, não na URL, como no x1). A coleta recebe `readSettings(sourceId)` injetada em `createGeneratedSource` por `cli.ts`; o adaptador não importa `modules/`. Lida uma vez no início de `loadPuzzle()` (FR-020). Sem linha → padrão 11/Médio.
- **Rationale**: a pessoa escolheu o painel `/admin` e o desenho para várias fontes geradas (clarificações de 2026-11-17). Chave por `source_id` evita migrar a tabela quando chegar a segunda fonte. Sem histórico de mudanças (premissa da spec).
- **Alternatives considered**: colunas em `source_settings` (misturaria configuração de geração na tabela de todas as fontes); tabela de uma linha só (precisaria de migração na segunda fonte); variável de ambiente (descartada pela pessoa).

## R10. Dificuldade no pedido e na cruzada

- **Decision**: valores internos `easy | medium | hard`, rótulos `Fácil | Médio | Difícil` (mapa `difficultyLabels` em `shared`). Texto do prompt por nível:
  - `easy`: palavras comuns do dia a dia, dicas diretas e curtas (definição simples).
  - `medium`: vocabulário geral e conhecimentos comuns, dicas claras.
  - `hard`: palavras menos frequentes e conhecimentos mais específicos, dicas indiretas ou por sinônimo pouco comum.
  A cruzada salva leva o rótulo em `attribution.title` (`"Dificuldade: Médio"`), campo que já existe e já aparece na atribuição: nenhuma mudança no formato do puzzle nem no site para exibir.
- **Rationale**: a dificuldade fica registrada em cada cruzada (FR-012) sem coluna nova; o nível do site (`daily`) não muda (premissa da spec).
- **Alternatives considered**: novo valor em `levelSchema` (mudaria rotas, progresso, calendário e x1); coluna `difficulty` em `puzzles` (só a fonte `casa` usaria).

## R11. Várias fontes geradas, só a Casa agora

- **Decision**: um adaptador só, `sources/generated/`, com uma fábrica `createGeneratedSource({ id, provider, fetch, clock, readSettings, reserveCall, recentAnswers })`. `provider = { baseUrl, model, apiKey }`; o cliente fala o formato compatível com a OpenAI (`/chat/completions`), que DeepSeek, OpenAI, OpenRouter e outros aceitam. Lista de fontes geradas em código (`generated-sources.ts` em `shared`: `generatedSourceIds = ['casa']`), e `cli.ts` liga cada id ao seu provedor e às suas variáveis (`casa` → `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `https://api.deepseek.com`). Uma fonte nova = id no enum e nos `CHECK` (migração), linha em `generated_source_settings`, nome, texto da landing, variáveis e uma linha em `cli.ts`.
- **Rationale**: o pedido, a validação, a montagem e o limite são iguais para todas; só muda quem responde. Fica num adaptador só, então a regra "um adaptador não importa outro" continua valendo. O nome da fonte não traz o modelo (FR-012), então trocar o modelo de uma fonte é só trocar a variável.
- **Alternatives considered**: uma pasta por fonte gerada (código repetido ou import entre adaptadores); SDK de cada provedor (dependências para um `fetch`). Provedor sem formato compatível (ex.: API nativa da Anthropic) ganha outro cliente na mesma pasta quando for preciso.

## R12. Limite de 3 chamadas por fonte e por dia, entre execuções

- **Decision**: reaproveitar `rate_limit_attempts` com `rateLimiter.reserve`: ação nova `PUZZLE_GENERATE` (alarga o `CHECK` de `action`), `key_type` `GLOBAL` e `key_value` `<source>:<data>`, limite 3, janela de 24 h. `cli.ts` injeta `reserveCall()`; o adaptador chama antes de cada pedido ao modelo e, se recusado, termina com `unavailable` + `detail: 'limite do dia'` (quieto). `auth cleanup` já apaga tentativas com mais de 2 dias. O painel lê o número restante pelo mesmo repositório.
- **Rationale**: a coleta roda duas vezes por dia (00h01 e 08h00) e pode rodar depois de um descarte; o limite precisa valer entre execuções (FR-008, SC-003). `reserve` é atômico, como pede o projeto (nunca contar e depois gravar). Sem tabela nova.
- **Alternatives considered**: contador em `generated_source_settings` (mistura configuração com estado diário); tabela própria (mesma coisa que `rate_limit_attempts`).

## R13. Lista de bloqueio e temas sensíveis

- **Decision**: `sources/generated/blocklist.ts`, lista de termos em minúsculas e sem acento (palavrões, ofensas, termos de ódio, sexo explícito). A validação (R8) descarta o item se a resposta for um termo da lista ou se a dica tiver um termo como palavra inteira; comparação com `plain()` de `sources/generated/normalize.ts` (remove acentos por NFD e passa a maiúsculas; mesma regra do `plainLetter` do site, que a API não pode importar). O prompt pede para evitar política partidária, religião, violência, sexo, tragédias e doenças graves.
- **Rationale**: o prompt reduz o risco; a lista garante o mínimo por código. Lista curta, revisada por commit (premissa da spec).
- **Alternatives considered**: API de moderação (mais uma chamada paga e mais um provedor); lista de terceiros (licença e tamanho).

## R14. Sem repetição em 30 dias

> **Substituído pela 065** (`specs/065-cruzada-densa/`): a grade densa é preenchida pelo código com uma lista de palavras e o modelo só escreve as dicas.

- **Decision**: `recentAnswers(sourceId, today)` injetada por `cli.ts`: lê as cruzadas da fonte nos últimos 30 dias no repositório de puzzles (só a coluna `solution`, não a parte pública) e extrai as respostas pelas palavras do puzzle (`word-cells.ts` de `shared`). A lista vai no prompt ("não use: …") e a validação descarta as que vierem mesmo assim (sem acento). O pedido passa a pedir `4 * N + 20` palavras para compensar os descartes.
- **Rationale**: FR-022. Até ~30 x 30 = 900 respostas no prompt: alguns milhares de tokens, custo baixo. A extração reaproveita o código que já liga palavras a casas.
- **Alternatives considered**: guardar as respostas numa tabela (duplica dado que já está em `puzzles`); só validar sem avisar o modelo (mais tentativas falhas).

## R15. Revisão e descarte no `/admin`

- **Decision**: `GET /api/admin/generated` traz, para cada fonte gerada: configuração, chamadas restantes no dia e a cruzada de hoje (`puzzleId`, tamanho, lista de `{ number, direction, answer, clue }`, `discardable` e `blockedBy: 'progress' | 'duel' | null`). `POST /api/admin/generated/discard` com `{ source, puzzleId }` apaga a linha de `puzzles` só se for a de hoje daquela fonte e não houver `progress` nem `duels` com ela; as chaves estrangeiras (`ON DELETE RESTRICT`) garantem isso mesmo numa corrida, e a violação vira `409 in-use`. A API não gera (não tem a chave); a próxima coleta gera, e o painel mostra o comando para rodar na hora (`gh workflow run collect.yml`), que já aceita `workflow_dispatch`.
- **Rationale**: FR-024, FR-025. Gerar dentro da requisição não cabe no limite de 25 s do proxy e exigiria a chave no Render. A cópia offline é guardada por `puzzleId`; ao abrir o dia com internet, o site recebe o `puzzleId` novo. Visitante sem internet com a cópia antiga continua nela (caso de borda aceito na spec).
- **Alternatives considered**: marcar a cruzada como escondida em vez de apagar (coluna nova e regra em todas as leituras); gerar pela API (chave no Render e tempo de resposta).

## R16. Horário

- **Decision**: nada muda. `collect.yml` roda às 03h01 UTC (00h01 de Brasília) e às 11h00 UTC; a geração entra na primeira execução do dia e, se falhar, a segunda tenta de novo dentro do limite (R12).
- **Rationale**: confirmado com a pessoa; igual às fontes sem busca sob demanda.

# Research: Adaptador da fonte Público

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-17

Documentação consultada pelo Context7 (constitution, Fluxo de Desenvolvimento):

- `fast-xml-parser` (`/naturalintelligence/fast-xml-parser`): versão 5.11.2 no npm (publicada em 2026-09-29).
- Drizzle (`/drizzle-team/drizzle-orm-docs`): `check()` em `pgTable` e diff do `drizzle-kit generate`.

Fastify, Zod, React Router, TanStack Query e Vitest continuam nas versões e APIs das features 003 a 013. Na implementação, toda chamada nova a essas bibliotecas passa de novo pelo Context7.

O comportamento do leitor foi conferido com um teste descartável, fora do repositório: o arquivo real de 2026-10-16, conteúdo com marcação, entidades internas, entidade externa e XML quebrado. Os resultados estão em R2 e R3.

---

## R1. Biblioteca para ler o XML

- **Decision**: `fast-xml-parser` 5.11 como dependência do `apps/api` (`"fast-xml-parser": "5.11"`, no mesmo estilo de versão das outras dependências). Uso: só `XMLParser`, com `XMLValidator.validate` antes. Configuração em `xml.ts`:
  - `ignoreAttributes: false` e `attributeNamePrefix: ''`: os atributos são o conteúdo principal (`x`, `y`, `solution`, `number`, `type`, `word`, `format`).
  - `parseAttributeValue: false` e `parseTagValue: false`: tudo chega como texto, e o Zod converte números (`"11"` → 11). Assim um `"010"` ou `"1e3"` não vira número em silêncio.
  - `isArray`, só para elementos (`!isAttribute`): `cell`, `word`, `clues` e `clue` são sempre listas. No teste, o `isArray` sem esse filtro transformou o atributo `word` da dica em lista.
  - `stopNodes: ['*.clue']`: o conteúdo da dica chega cru (R3).
  - `processEntities` no padrão (ligado, com limites). As entidades predefinidas (`&amp;`, `&quot;`...) são decodificadas nos atributos.
- **Rationale**:
  - O Node não tem leitor de XML embutido.
  - A biblioteca é JavaScript puro, sem dependência nativa, e funciona no build da API (tsdown) e na imagem Docker.
  - Recusa entidades externas por padrão: no teste, `<!ENTITY ext SYSTEM "file:///etc/passwd">` deu erro "External entities are not supported".
  - Converte para um objeto simples que entra como `unknown` e passa pelo Zod (princípio I).
- **Alternatives considered**:
  - `@xmldom/xmldom` + DOM: API mais verbosa e mais superfície; o DOM não traz vantagem para um formato fixo.
  - `sax`/`saxes` (streaming): mais código para montar a árvore, sem ganho num arquivo de ~10 kB.
  - Ler com expressões regulares: frágil diante de ordem de atributos, aspas simples, entidades e CDATA. Foi rejeitado.

## R2. Segurança na leitura (FR-006)

- **Decision**: antes de ler, o adaptador aplica três defesas.
  1. **Tamanho**: corpo acima de 1 MB (pelo `content-length` ou pelo texto lido) vira `unexpected-format`, sem ler. O arquivo real tem ~10 kB.
  2. **DOCTYPE**: um corpo com `<!DOCTYPE` (sem diferenciar maiúsculas) vira `unexpected-format`, sem ler. A fonte não usa DOCTYPE. Sem DOCTYPE não existem entidades definidas no documento, então não há expansão em cadeia ("billion laughs") nem entidade externa, independentemente dos limites da biblioteca.
  3. **Validação**: `XMLValidator.validate` antes do `parse`. XML mal formado vira `unexpected-format` com o código do erro no `detail`, nunca o trecho do corpo.
- **Rationale**: no teste, uma cadeia de entidades internas não estourou a memória, mas o resultado veio truncado em silêncio (46 caracteres). Um comportamento silencioso não deve ser a defesa. Recusar o DOCTYPE é simples, verificável e não depende da versão da biblioteca.
- **Alternatives considered**: confiar só em `processEntities` com limites. Foi rejeitado pelo resultado silencioso. `processEntities: false` também foi rejeitado: deixa `&amp;` e `&quot;` sem decodificar nos atributos e nas dicas.

## R3. Texto das dicas (FR-005)

- **Decision**: com `stopNodes: ['*.clue']`, o conteúdo de cada `<clue>` chega cru, e os atributos continuam lidos. A função pura `clueText(raw)` em `clue-text.ts` faz quatro passos:
  1. Remove as tags (`<b>`, `<i>`, `<br/>`...), trocando `<br>` por espaço.
  2. Decodifica as cinco entidades predefinidas e as referências numéricas (`&#231;`, `&#xE7;`).
  3. Junta espaços repetidos.
  4. Tira os espaços das pontas.

  Uma entidade com nome desconhecido (como `&nbsp;`, que não existe em XML sem DOCTYPE) faz a conversão falhar com `unexpected-format`. Texto vazio depois da limpeza também falha com `unexpected-format`.
- **Rationale**:
  - No teste, sem `stopNodes`, uma dica com marcação (`Tom &amp; <i>Jerry</i>`) perdeu a ordem: a parte em itálico foi para outra chave e o texto virou "Tom &".
  - Com `stopNodes`, o texto cru preserva a ordem. As referências numéricas não são decodificadas pela biblioteca no modo padrão (`&#231;` ficou literal no teste).
  - Uma função própria, pequena e testada, dá o mesmo resultado em qualquer caso.
- **Alternatives considered**: `preserveOrder: true` em todo o documento. Foi rejeitado porque troca a estrutura inteira por listas de nós e complica a leitura das células e palavras por causa de um detalhe das dicas.

## R4. Mapeamento do formato Crossword Compiler para o formato interno (FR-004)

- **Decision**: a conversão é pura (`convert.ts`, `convertCrosswordCompiler(doc, level, date)`), no mesmo modelo de `oglobo/convert.ts`.
  - **Grade**: `grid@width` e `grid@height` (1 a 30, como no `gridSchema`). Cada `cell` tem `x` (coluna) e `y` (linha), de 1 até a largura e a altura. Toda posição precisa aparecer exatamente uma vez. Célula repetida, faltando ou fora da grade: `unexpected-format`.
  - **Célula**: `type="block"` vira bloco. Sem `type`, precisa de `solution` com exatamente um grafema e vira célula aberta com `number` (inteiro positivo) ou `null`.
    - `type` com outro valor (por exemplo `void` ou `clue`, que existem no formato): `unsupported`.
    - `solution` com mais de uma letra: `unsupported`.
    - Célula aberta sem `solution`: `unexpected-format`.
  - **Palavra**: `word@id` mais `x` e `y`, cada um um número (`"3"`) ou um intervalo crescente (`"1-10"`).
    - Exatamente um dos dois é intervalo. `x` como intervalo é `across`, a partir de (linha `y`, coluna `x` inicial); `y` como intervalo é `down`.
    - Os dois fixos (palavra de uma letra) ou os dois intervalos: `unexpected-format`.
    - Intervalo decrescente ou `word` com `cells` filhos (palavra em mais de um trecho): `unsupported`.
  - **Dica**: em cada `clues`, cada `clue` tem `word` (id de uma palavra), `number` e `format`. A direção vem da palavra, não do título do grupo.
    - Dica para id inexistente, duas dicas para a mesma palavra ou palavra sem dica: `unexpected-format`.
    - O `number` da dica precisa ser igual ao número da célula inicial da palavra; se não for, `unexpected-format`.
    - `format` só é conferido quando é um inteiro: precisa ser igual ao tamanho da palavra. Um formato composto (`"5,4"`, `"3-2"`) é ignorado.
  - **Solução**: `cells[linha][coluna]` com a letra da célula aberta em maiúscula (`toLocaleUpperCase('pt-PT')`), acentos e cedilha mantidos, e `null` nos blocos.
  - **Atribuição**: `sourceName: 'Cruzada Online'`. `title` e `creator` de `metadata` (passados por `clueText`) quando não vazios; senão `null`. `copyright` vem de `metadata` quando não vazio; senão `'Cruzada Online'` (decisão do autor). Como `GamePage` junta as partes da atribuição, `attribution()` passa a não repetir uma parte igual a outra já mostrada, e a linha fica "Fonte: Cruzada Online".
  - Ao final, `puzzleSchema.safeParse` e `validatePuzzleWithSolution`, como no O Globo: as regras de consistência das palavras (tamanho, bloco no caminho, célula aberta sem palavra, célula numerada sem palavra) já vivem em `shared` e não são reescritas.
- **Rationale**: os nomes e a semântica dos atributos foram confirmados nos dois arquivos reais (2026-10-16 e 2026-10-17): 121 células, 45 palavras e duas listas de dicas. Usar a lista de palavras da fonte, e não as palavras deduzidas da grade, mantém a ligação dica → palavra exatamente como a fonte define. As regras de `shared` recusam qualquer divergência com a grade.
- **Alternatives considered**: deduzir as palavras da grade, como o O Globo, e usar só o `number` das dicas. Foi rejeitado porque ignoraria o vínculo explícito `clue@word` e esconderia uma inconsistência da fonte.

## R5. Endereço, status e datas futuras (FR-007, FR-008)

- **Decision**: `GET https://static.publico.pt/s3/files/widgets/crosswords/prd/AAAAMMDD.xml`, com `accept: application/xml, text/xml`, sem outros cabeçalhos e com tempo limite de 10 s (`AbortSignal.timeout`). Um pedido por chamada, sem nova tentativa. Mapeamento:

  | Situação | Motivo |
  | --- | --- |
  | Data posterior a hoje em Brasília (relógio injetável) | `unavailable`, sem pedido |
  | 403 ou 404 | `unavailable` (a CDN responde 403 `AccessDenied` para arquivo que não existe) |
  | 429 | `rate-limited` |
  | 5xx, erro de rede ou tempo limite | `source-down` |
  | Outro status diferente de 2xx | `unexpected-format` com `HTTP <status>` no `detail` |
  | 200 com corpo maior que 1 MB, DOCTYPE, XML inválido, raiz diferente de `crossword-compiler` > `rectangular-puzzle` > `crossword` ou corpo de erro da CDN (`<Error>`) | `unexpected-format` |

  O adaptador também recusa (`TypeError`) nível ou data mal formados, como o O Globo. `dates` volta sempre `[]` (FR-009).
- **Rationale**:
  - Os status foram observados em 2026-10-17: 200 para 2024-01-01 até 2026-10-17, e 403 para 2026-10-30, 2023-01-01 e 2020-01-01.
  - O arquivo do dia seguinte já está publicado na véspera. Por isso o adaptador também recusa datas futuras, além da regra que o serviço já tem: a verificação sob demanda e qualquer chamada direta não entregam o puzzle de amanhã.
- **Alternatives considered**: tratar o 403 como `refused`. Foi rejeitado porque a fonte não exige identificação, e um `refused` faria a coleta registrar como falha um dia que simplesmente não existe.

## R6. Várias fontes no serviço de puzzles

- **Decision**: `createPuzzlesService` passa a receber `sources: readonly PuzzleSource[]` (um por `id`; ids repetidos lançam erro na criação) no lugar de `source`.
  - `getByDate(source, level, date, address)` escolhe o adaptador pelo id. Um id sem adaptador lança erro: a rota já filtra pelo enum.
  - `collect()` percorre as fontes em sequência e devolve `{ sources: { source, report: CollectReport }[] }`. O `CollectReport` de hoje vale por fonte.
  - Um `rate-limited` interrompe só a fonte que o sinalizou, e uma exceção inesperada num adaptador vira `failed` daquela fonte, sem impedir a seguinte (FR-015).
  - A pausa de 2 s também vale entre a última data de uma fonte e a primeira da seguinte.
  - O limite `PUZZLE_FETCH` por endereço é o mesmo para as duas fontes: uma busca na hora conta igual, de qualquer fonte.
  - `buildApp` e o `cli.ts` passam `[createOgloboSource(), createCruzadaOnlineSource()]`. Os testes passam fontes falsas.
- **Rationale**: o serviço já isola a fonte atrás da interface. Generalizar para uma lista mantém o princípio IV e não exige mudança na interface `PuzzleSource`. Um limite único por endereço segue a spec ("com o mesmo limite de pedidos por endereço") e não dobra o que um visitante pode pedir.
- **Alternatives considered**:
  - Um serviço por fonte: duplicaria rotas e coleta.
  - Um `Record<PuzzleSourceId, PuzzleSource>`: obrigaria os testes a montar todas as fontes, mesmo quando o teste é só de uma.

## R7. Contrato das rotas e compatibilidade (FR-011, FR-012, SC-007)

- **Decision**:
  - `GET /api/puzzles?level=&date=&source=`: `source` é opcional, com padrão `oglobo`. Valor fora do enum responde `400 invalid-input` com `fields: ['source']`.
  - `GET /api/library?source=`: `source` é opcional, com padrão `oglobo`, e a lista traz só a fonte pedida (até 366 itens por fonte). Cada item ganha `source`.
  - `GET /api/puzzles/:id` não muda: a fonte já vem em `puzzle.source`.
  - Em `shared`:
    - `puzzleSourceIdSchema` passa a `['oglobo', 'cruzadaonline']`.
    - `libraryItemSchema` ganha `source: puzzleSourceIdSchema.default('oglobo')`, para o site novo aceitar a API anterior, que não manda o campo.
    - Um `puzzleSourceQuerySchema` compartilhado (o enum com `.default('oglobo')`) serve às duas rotas.
- **Rationale**:
  - O site anterior não manda `source`: com o padrão `oglobo`, ele recebe exatamente as mesmas respostas de hoje. Os esquemas tolerantes da feature 012 já descartam o campo novo `source` do item da biblioteca.
  - O site anterior nunca recebe um puzzle `cruzadaonline` (o enum antigo o recusaria), porque nunca o pede e a biblioteca dele só lista `oglobo`.
  - No sentido inverso (site novo com a API anterior, por exemplo num rollback da API), a API ignora `source` e responde O Globo. O site confere `puzzle.source` e mostra a fonte como indisponível em vez de abrir o puzzle errado (R9).
- **Alternatives considered**:
  - Rota nova `/api/sources/:source/...`: duplicaria contratos e documentação.
  - `source` obrigatório: quebraria o site anterior.

## R8. Banco

- **Decision**: só a regra `puzzles_source_check` muda para `IN ('oglobo', 'cruzadaonline')`, junto com `puzzleSources` em `db/schema.ts`. A migração é gerada (`db:generate -- --name puzzles_source_cruzadaonline`), e o SQL gerado é conferido: precisa ser `DROP CONSTRAINT` + `ADD CONSTRAINT` na mesma migração. Se o `drizzle-kit` não emitir a troca da regra, a migração é escrita à mão com `--custom`.
  - O índice único `(source, level, date)` já começa pela fonte, então serve ao filtro da biblioteca e à ordem por data. Nenhum índice novo.
  - Não há atualização de dados.
- **Rationale**: o princípio IX exige migração versionada. A chave atual (fonte, nível, data) já separa os puzzles das duas fontes, e progresso e dados de visitante usam `puzzleId`, então ficam separados por fonte sem mudança (FR-013).
- **Alternatives considered**: tirar a regra `CHECK` e confiar só no Zod. Foi rejeitado porque a regra no banco é a defesa de última linha das features 006 e 009.

## R9. Escolha da fonte no site (FR-014)

- **Decision**:
  - A preferência fica em `features/library/source-choice.ts`: chave `cruzadinha:source` no `localStorage`, com o valor validado por `puzzleSourceIdSchema`; sem valor ou com valor inválido, vale `oglobo`.
  - Um hook `useSourceChoice()` lê e grava a escolha.
  - No calendário, um seletor de duas opções ("O Globo" e "Cruzada Online") fica acima da grade. É um componente novo, `SourcePicker`: um `role="group"` rotulado "Fonte da cruzada" com dois `Button` com `aria-pressed`, usando só tokens de tema e respeitando o alvo de toque mínimo (`touch-targets.test.tsx`). O `ThemeToggle` é um botão único que alterna; um seletor de duas opções visíveis deixa claro qual fonte está ativa.
  - Ao trocar de fonte, o mês visível não muda.
  - A biblioteca usa `queryKeys.library(viewer, source)`.
  - "Jogar a de hoje" e os dias buscáveis levam a `/dia/:date?fonte=<id>`.
  - `DayRoute` lê `?fonte=`: se vier válido, vale ele (e vira a preferência); senão, vale a preferência. A query passa a `queryKeys.puzzleByDate(source, date)`.
  - Se a resposta trouxer `puzzle.source` diferente do pedido (API anterior), a tela mostra "Esta fonte não está disponível agora" com o link de volta, e não abre o jogo.
  - Os avisos `source-down` e `no-puzzle` passam a ser por fonte: `cruzadinha:source-down:<id>` e `cruzadinha:no-puzzle:<id>:<data>`. A chave antiga `cruzadinha:source-down` é ignorada; ela expira sozinha em 10 minutos.
  - O título da página e a legenda continuam iguais. O subtítulo "Uma cruzada por dia." passa a "Uma cruzada por dia de cada fonte.".
  - A tela do jogo já mostra `Fonte: <sourceName>`; só `attribution()` deixa de repetir partes iguais (R4).
- **Rationale**:
  - A preferência é do aparelho, como tema e tamanhos (Assumptions da spec).
  - O endereço com `?fonte=` permite abrir ou compartilhar o dia de uma fonte sem depender da preferência.
  - `/jogo/:puzzleId` não muda, porque o id já identifica o puzzle.
  - Separar os avisos por fonte evita que a queda de uma fonte esconda os dias buscáveis da outra.
  - SC-008 (até 2 interações): o seletor (1) e "Jogar a de hoje" (2).
- **Alternatives considered**:
  - Rota `/dia/:source/:date`: muda um endereço que já existe e exigiria redirecionar o antigo.
  - Abas com `role="tablist"`: semântica de painel, não de filtro.
  - Guardar a escolha na conta: fora do escopo (Assumptions).

## R10. Verificação sob demanda (FR-016)

- **Decision**: novo script `source:check:cruzadaonline` (`tsx src/sources/cruzadaonline/check.ts`), separado do `source:check` do O Globo. Uso: `-- [AAAA-MM-DD ...] [--save]`.
  - Aceita até 10 datas (SC-003 pede 5), com pausa de 2 s entre os pedidos e parada ao primeiro `rate-limited`.
  - Imprime uma linha por data: `ok 11x11 45 palavras` ou o motivo e o `detail`.
  - `--save` grava o corpo bruto em `apps/api/.source-samples/cruzadaonline-<data>.xml`, pasta ignorada pelo git.
  - Código de saída: 0 se todas as datas derem `ok` ou `unavailable`; 1 em caso contrário; 2 para argumento inválido.
- **Rationale**: o contrato do `source:check` da 003 continua como está. Várias datas numa execução cobrem o SC-003 com um comando só.
- **Alternatives considered**: `--source` no script atual. Foi rejeitado por mudar o contrato da 003 sem ganho.

## R11. Fixtures (FR-017, SC-006)

- **Decision**: em `apps/api/src/sources/cruzadaonline/fixtures/`, arquivos `.xml` 5 x 5 com conteúdo inventado. Eles copiam a estrutura real: declaração XML, `xmlns`, `metadata` vazio, `grid-look`, ordem das células por coluna, `word` com intervalos e dois `clues` com `title` em `<b>`.

  | Fixture | Conteúdo |
  | --- | --- |
  | `daily-valid.xml` | `Ç` e `Ã` na solução, uma dica com `hint-url`, uma com `&amp;` e uma com `<i>` |
  | `cdn-error.xml` | Corpo `<Error><Code>AccessDenied</Code>...` sem ids reais da CDN |
  | `malformed.xml` | Tag sem fechar |
  | `changed-shape.xml` | `cell` sem `x` |
  | `word-without-clue.xml` | Palavra sem dica |
  | `clue-number-mismatch.xml` | Número da dica diferente do número da célula inicial |
  | `unsupported-multi-letter.xml` | Célula com `solution="QU"` |
  | `with-doctype.xml` | DOCTYPE com uma entidade interna |

  Os testes do adaptador usam `fetch` injetado e relógio injetado, e os testes da conversão leem os arquivos com `readFileSync`.
- **Rationale**: é o mesmo padrão da 003 (princípio IV e repositório público). O corpo de erro real traz `RequestId` e `HostId`, que são substituídos por valores fictícios.
- **Alternatives considered**: guardar um arquivo real inteiro. Foi rejeitado por reproduzir um puzzle completo da fonte (SC-006).

## R12. Seed e testes ponta a ponta

- **Decision**:
  - O seed grava também um puzzle de exemplo `cruzadaonline` para hoje, convertido de `fixtures/daily-valid.xml` pela conversão real, sem rede e sem substituir um puzzle já guardado. A atribuição diz "Cruzada Online" mais o título "Exemplo".
  - `seed-puzzle.ts` passa a exportar um construtor por fonte.
  - Uma spec Playwright nova, `fontes.spec.ts`, cobre o caminho: o visitante troca para "Cruzada Online", abre o dia de hoje, vê "Fonte: Cruzada Online", volta ao calendário e encontra o dia em andamento só nessa fonte.
- **Rationale**: o SC-008 e a história 2 precisam de um caminho ponta a ponta. O seed sem rede segue a regra da feature 006.
- **Alternatives considered**: uma API falsa no Playwright. Foi rejeitado porque o e2e do projeto roda contra a API e o banco reais.

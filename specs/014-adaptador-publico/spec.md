# Feature Specification: Adaptador da fonte Público

**Feature Branch**: `feat/014-adaptador-publico`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Integrar outra fonte de cruzada, curl --location 'https://static.publico.pt/s3/files/widgets/crosswords/prd/20261016.xml', ele retornar um xml, então precisa formatar para json e adptar para a resposta."

## Clarifications

### Session 2026-10-17

- Q: Até onde vai esta feature? → A: Tudo (opção B): adaptador, coleta, rotas e site, com a escolha da fonte no calendário (O Globo por padrão). A API deve ficar pronta para o site consumir: as rotas de puzzle e de biblioteca aceitam a fonte e informam a fonte de cada item, e continuam respondendo como hoje a quem não informa a fonte, para que o site da versão anterior siga funcionando (FR-011 a FR-013).
- Q: Como identificar as fontes? → A: A nova fonte se chama `cruzadaonline`; o O Globo continua `oglobo`.
- Q: Qual o nome exibido da nova fonte? → A: "Cruzada Online", o nome da cruzada publicada pelo Público. É o que aparece na atribuição de cada puzzle (princípio VIII), no seletor do calendário e na saída da coleta.
- Q: O que vai nos direitos (`copyright`) do puzzle da nova fonte, já que o arquivo vem sem metadados? → A: "Cruzada Online" quando o arquivo não informar direitos; se informar, vale o do arquivo.

## Observações da fonte (2026-10-17)

Feitas pelo autor com pedidos manuais, antes da spec; servem de base para as suposições abaixo e não substituem a verificação sob demanda (FR-016).

- Um arquivo por dia, endereçado pela data (`AAAAMMDD.xml`), público, sem identificação de visitante nem cabeçalho especial, servido por uma CDN.
- O arquivo segue o formato XML do Crossword Compiler (`crossword-compiler` > `rectangular-puzzle`): grade com largura e altura, uma entrada por célula com coluna e linha a partir de 1, letra da solução e número, ou marcada como bloco; uma lista de palavras com o intervalo de células que ocupam; duas listas de dicas (título "HORIZONTAL" e "VERTICAL") que ligam cada dica à palavra e ao número, com o tamanho da palavra.
- Grades vistas: 11 x 11. Metadados (título, autor, direitos) vêm vazios.
- A solução traz letras acentuadas e cedilha (`Ç`). As dicas estão em português europeu e algumas trazem um link para uma notícia do jornal.
- O arquivo do dia seguinte já está publicado na véspera (o de 2026-10-17 existia em 2026-10-17 e o de 2026-10-16 foi gravado em 2026-10-15 às 22:51 UTC). Uma data sem arquivo (futura distante ou antiga demais) responde com status 403 e um corpo XML de erro da CDN (`AccessDenied`), não com 404.
- Havia arquivo em 2024-01-01, 2025-01-01, 2026-01-01 e 2026-09-01; 2023-01-01 e 2020-01-01 responderam 403.

## User Scenarios & Testing *(mandatory)*

Os atores são o jogador (visitante ou com conta), que passa a ter uma segunda cruzadinha por dia, e o autor do projeto, que mantém a coleta e confere a fonte. A feature 003 definiu o formato interno de puzzle e a interface comum de fonte; esta feature acrescenta a fonte Público sem mudar esse formato.

### User Story 1 - Obter um puzzle do Público por data (Priority: P1)

Dada uma data, o sistema busca o arquivo do Público, interpreta o XML, confere a estrutura e a converte para o formato interno, devolvendo a parte pública e a solução. Quando não consegue, devolve um dos motivos que a interface de fonte já conhece, sem que o resto do sistema saiba que a fonte usa XML.

**Why this priority**: É o núcleo da feature. Sem a conversão confiável, nenhuma outra parte pode oferecer o puzzle do Público.

**Independent Test**: Com arquivos gravados (fixtures reduzidas) no lugar da rede, pedir o puzzle de uma data e conferir que o resultado tem as mesmas dimensões, blocos, números, dicas e letras do arquivo; repetir com o corpo de erro da CDN, um XML mal formado, um XML com estrutura diferente e um com recursos não suportados, conferindo o motivo devolvido.

**Acceptance Scenarios**:

1. **Given** um arquivo válido de uma data, **When** o puzzle dessa data é pedido, **Then** o resultado é um puzzle no formato interno, com as mesmas dimensões, blocos, números, dicas e letras do arquivo, com fonte `cruzadaonline`, nível `daily`, a data pedida e atribuição "Cruzada Online".
2. **Given** a CDN responde 403 ou 404 para a data, **When** o puzzle é pedido, **Then** o motivo devolvido é `unavailable`.
3. **Given** a data pedida é posterior ao dia de hoje em Brasília, **When** o puzzle é pedido, **Then** o motivo é `unavailable` sem nenhum pedido à fonte, mesmo que o arquivo já esteja publicado.
4. **Given** um corpo que não é XML bem formado ou não tem a estrutura esperada, **When** o puzzle é pedido, **Then** o motivo é `unexpected-format` e nenhum puzzle parcial é devolvido.
5. **Given** uma dica que aponta para uma palavra inexistente, uma palavra sem dica, ou um número de dica diferente do número da célula inicial da palavra, **When** o puzzle é convertido, **Then** o motivo é `unexpected-format`.
6. **Given** um arquivo válido com uma dica que traz link para notícia, **When** o puzzle é convertido, **Then** a dica mantém só o texto, e o link não entra no puzzle.

---

### User Story 2 - Jogar o puzzle do Público no site (Priority: P2)

O jogador escolhe entre as cruzadinhas do O Globo e do Público, vê no calendário os dias de cada fonte e joga o puzzle do Público como joga o do O Globo: progresso, relógio, ajudas, conclusão e recorde valem por puzzle, sem misturar as duas fontes.

**Why this priority**: É o que dá valor ao jogador, mas depende da história 1. A parte da API (rotas que aceitam a fonte) pode ser entregue e testada antes do site.

**Independent Test**: Com um puzzle do Público e um do O Globo salvos para a mesma data, abrir o calendário, alternar a fonte e jogar cada um; conferir que o progresso de um não aparece no outro.

**Acceptance Scenarios**:

1. **Given** puzzles das duas fontes salvos para o mesmo dia, **When** o jogador alterna a fonte no calendário, **Then** o calendário mostra o estado e os tempos do puzzle da fonte escolhida.
2. **Given** um dia passado sem o puzzle do Público salvo, **When** o jogador abre esse dia com a fonte Cruzada Online escolhida, **Then** o puzzle é buscado na hora, com as mesmas mensagens de indisponível, falha da fonte e limite de pedidos que já existem para o O Globo.
3. **Given** o jogador está num puzzle do Público, **When** a tela do jogo aparece, **Then** a atribuição mostra "Fonte: Cruzada Online".
4. **Given** o jogador escolheu Cruzada Online e volta ao site depois, no mesmo aparelho, **When** o calendário abre, **Then** a fonte escolhida continua Cruzada Online.
5. **Given** um site da versão anterior, que não informa a fonte, **When** ele pede o puzzle de uma data ou a biblioteca, **Then** recebe só puzzles do O Globo, como antes.
6. **Given** uma letra acentuada na solução (Ã, É), **When** o jogador digita a letra simples (A, E), **Then** ela conta como certa; e **Given** um `Ç` na solução, **When** o jogador digita `Ç` (teclado físico ou o `Ç` do teclado na tela), **Then** conta como certa. São as regras que já valem para o O Globo.

---

### User Story 3 - Coleta diária e verificação sob demanda (Priority: P3)

O autor tem a coleta agendada salvando também o puzzle do Público de hoje e os dias que faltam, e uma verificação sob demanda contra a fonte real que informa se a busca e a conversão funcionaram para uma data.

**Why this priority**: A verificação mantém as fixtures fiéis à fonte real; a coleta deixa o histórico pronto sem depender de busca na hora. Nenhuma das duas bloqueia a história 1.

**Independent Test**: Rodar a verificação para uma data recente e conferir que ela faz um único pedido e imprime uma linha com dimensões e número de palavras, sem o conteúdo do arquivo; rodar a coleta com fontes falsas e conferir que cada fonte é coletada e uma falha numa não impede a outra.

**Acceptance Scenarios**:

1. **Given** a fonte no ar, **When** o autor roda a verificação do Público para uma data, **Then** ela informa sucesso (dimensões e contagem de palavras) ou o motivo da falha em uma linha.
2. **Given** a coleta agendada, **When** ela roda, **Then** salva o puzzle do Público de hoje e os dias passados que faltam na janela configurada, com pausa entre pedidos, sem repetir datas já salvas.
3. **Given** a fonte Público falha durante a coleta, **When** a coleta continua, **Then** a coleta do O Globo não é afetada e a falha aparece no resultado da execução.
4. **Given** a suíte automática, **When** ela roda, **Then** a verificação contra a fonte real não é executada.

---

### Edge Cases

- Corpo com status 200 que não é XML, ou XML de erro da CDN com status 200: `unexpected-format`, nunca puzzle.
- Célula sem letra que não é bloco, célula com mais de uma letra, célula fora da grade, célula repetida ou faltando: `unexpected-format` (ou `unsupported` quando for recurso válido do formato, como célula com mais de uma letra). O formato sempre declara largura e altura, então não existe grade não retangular: uma célula faltando já é `unexpected-format`.
- Palavra cujo intervalo não é uma linha reta, passa por bloco ou não bate com o tamanho informado na dica: `unexpected-format`. O tamanho só é conferido quando a dica informa um número inteiro; um formato composto (como `2,3`) não é conferido.
- Palavra de uma letra: o formato interno exige ao menos duas; `unexpected-format`.
- Dica com marcação (como `<b>`) ou entidades XML: o texto da dica é o conteúdo textual, sem marcação e com as entidades predefinidas e as referências numéricas decodificadas. Uma entidade com nome desconhecido (como `&nbsp;`) leva a `unexpected-format`.
- Listas de dicas com títulos diferentes de "HORIZONTAL" e "VERTICAL", ou em outra ordem: a direção vem da forma do intervalo da palavra (linha ou coluna), não do título.
- Letra da solução em minúscula: guardada em maiúscula; acentos e cedilha mantidos como vieram.
- Metadados vazios: título e autor ficam nulos, e direitos vazios viram "Cruzada Online"; o nome da fonte é sempre "Cruzada Online". A tela do jogo não repete um nome igual na linha de atribuição.
- Tempo limite de 10 segundos ou erro de rede: `source-down`. Status 5xx: `source-down`. Status 429: `rate-limited`, sem nova tentativa.
- Arquivo muito grande (acima de 1 MB): recusado como `unexpected-format` sem interpretar.
- Fuso: a data do arquivo é a do jornal em Portugal; o sistema usa a data pedida como chave, e "futuro" é decidido pelo dia em Brasília (regra já existente).

## Requirements *(mandatory)*

### Functional Requirements

**Adaptador Público**

- **FR-001**: O sistema MUST acessar o Público apenas por um adaptador que implementa a interface comum de fonte de puzzles; nenhuma outra parte MUST conhecer o endereço, o formato XML ou os nomes dos elementos da fonte.
- **FR-002**: O conjunto de fontes aceitas MUST passar a incluir `cruzadaonline`, com nome de atribuição "Cruzada Online" e, quando o arquivo não informar direitos, direitos "Cruzada Online"; o único nível aceito continua sendo `daily`.
- **FR-003**: O adaptador MUST buscar o arquivo da data pedida, interpretar o XML e converter para o formato interno da feature 003 (parte pública e solução separadas), sem mudar esse formato.
- **FR-004**: A conversão MUST mapear coluna e linha a partir de 1 para a grade interna, os blocos, os números de célula, as palavras (direção pela forma do intervalo, posição inicial e tamanho) e as dicas (pelo vínculo dica → palavra), e MUST validar o resultado contra as regras de puzzle e de par puzzle/solução já existentes antes de devolvê-lo.
- **FR-005**: O texto da dica MUST ser o conteúdo textual da dica, sem marcação, com entidades decodificadas, espaços repetidos reduzidos a um e espaços nas pontas removidos; uma entidade com nome desconhecido ou um texto vazio depois da limpeza MUST levar a `unexpected-format`; links para notícias e qualquer outro atributo da dica MUST NOT entrar no puzzle salvo.
- **FR-006**: O adaptador MUST tratar a resposta como dado desconhecido até passar pela validação, e MUST interpretar o XML de forma segura: sem carregar entidades externas nem expandir entidades definidas no próprio documento, e com limite de tamanho do corpo.
- **FR-007**: O adaptador MUST devolver os motivos da interface: `unavailable` (403 ou 404 da fonte, ou data posterior a hoje em Brasília, esta sem pedido), `rate-limited` (429, sem nova tentativa), `source-down` (5xx, rede ou tempo limite de 10 segundos), `unexpected-format` (corpo fora do esperado ou inconsistente) e `unsupported` (recurso válido do formato que o jogo não suporta).
- **FR-008**: O adaptador MUST fazer no máximo um pedido por chamada e nenhuma nova tentativa.
- **FR-009**: Como a fonte não informa uma lista de datas, o adaptador MUST devolver a lista de datas disponíveis vazia.
- **FR-010**: O adaptador MUST NOT registrar em logs, mensagens ou resultados o corpo bruto das respostas.

**Uso no sistema**

- **FR-011**: As rotas de puzzle por data e de biblioteca MUST aceitar a fonte (`oglobo` ou `cruzadaonline`); sem fonte informada MUST valer `oglobo`, para que o site da versão anterior receba exatamente o que recebe hoje. Uma fonte desconhecida MUST ser recusada como pedido inválido. A rota de puzzle por identificador continua sem fonte, já que o identificador é único.
- **FR-012**: As respostas de puzzle e cada item da biblioteca MUST informar a fonte, de modo que o site saiba de qual fonte é cada puzzle sem depender do que pediu. A biblioteca MUST listar só os puzzles da fonte pedida, com as mesmas regras de estado e tempos da feature 009, para visitantes e para quem tem conta.
- **FR-013**: O Público MUST seguir as mesmas regras do O Globo para guardar, buscar sob demanda um dia passado que falta (com o mesmo limite de pedidos por endereço) e recusar datas futuras. Progresso, relógio, ajudas, conclusão e recorde MUST ficar separados por puzzle, para conta e para visitante, sem mistura entre as fontes.
- **FR-014**: O site MUST permitir escolher a fonte no calendário (O Globo por padrão), lembrar a escolha no aparelho, mostrar no calendário os dias e estados da fonte escolhida, abrir o dia da fonte escolhida (inclusive pelo endereço direto do dia) e mostrar a atribuição da fonte na tela do jogo.
- **FR-015**: A coleta MUST incluir o Público, com pausa entre pedidos e sem repetir datas já salvas, e uma falha ou sinal de limite de uma fonte MUST NOT impedir a coleta da outra; o resultado da execução MUST informar cada fonte.

**Testes e fixtures**

- **FR-016**: O sistema MUST oferecer uma verificação sob demanda contra o Público real, fora da suíte automática, com um pedido por data e uma linha de resultado, sem imprimir o conteúdo do arquivo.
- **FR-017**: O adaptador MUST ter testes de contrato sem rede, com fixtures derivadas de arquivos reais, reduzidas a uma grade pequena com conteúdo inventado (nunca um puzzle completo da fonte), cobrindo no mínimo: arquivo válido com letra acentuada e cedilha e dica com link, corpo de erro da CDN, XML mal formado, estrutura alterada, palavra sem dica e recurso não suportado.

### Key Entities

- **Fonte Público**: nova fonte de puzzles, identificada por `cruzadaonline`, com um puzzle por dia no nível `daily` e atribuição "Cruzada Online".
- **Arquivo do dia**: o XML publicado para uma data. Contém grade (células com letra e número, ou bloco), palavras (intervalos de células) e dicas (texto, número, tamanho e vínculo com a palavra).
- **Puzzle e Solução**: os mesmos da feature 003, agora com `cruzadaonline` como valor possível de fonte.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das fixtures válidas viram puzzles que passam na validação e reproduzem exatamente dimensões, blocos, números, dicas e letras do arquivo.
- **SC-002**: Cada fixture de falha produz o motivo esperado em 100% dos casos, sem puzzle parcial.
- **SC-003**: A verificação sob demanda converte sem erro os arquivos reais de pelo menos 5 datas diferentes entre 2024 e hoje.
- **SC-004**: Uma mudança na estrutura do arquivo (elemento renomeado, atributo removido ou com outro tipo) faz pelo menos um teste de contrato falhar.
- **SC-005**: A suíte automática continua passando sem internet.
- **SC-006**: Nenhum arquivo versionado contém um puzzle completo do Público.
- **SC-007**: Um site da versão anterior continua funcionando sem mudança contra a nova API (pedidos sem fonte recebem só O Globo), verificado por teste.
- **SC-008**: Um jogador que já joga o O Globo encontra e abre o puzzle do Público do dia em até 2 interações a partir do calendário.

## Assumptions

- O nível do Público é tratado como `daily`, o mesmo do O Globo; o formato interno não muda.
- O motivo `refused` da interface não se aplica (a fonte não pede identificação); um 403 é tratado como `unavailable`, porque é assim que a CDN responde a um arquivo que não existe.
- A fonte não tem sinal de limite de uso conhecido; o 429 é tratado como `rate-limited` por precaução, e a pausa da coleta (2 segundos) vale também aqui.
- A janela de dias passados da coleta é a mesma para as duas fontes; o histórico do Público vai até pelo menos 2024, mas a coleta não tenta baixá-lo inteiro.
- O link de notícia das dicas é descartado: o cache guarda só o necessário para jogar (princípio VIII).
- As dicas ficam em português europeu, como vieram; nenhuma adaptação de grafia.
- As regras de letra do jogo já cobrem a nova fonte: letras acentuadas viram a letra simples, e o `Ç` é uma letra própria, digitada como `Ç` (o teclado na tela já tem a tecla).
- A escolha da fonte no site é uma preferência do aparelho (como tema e tamanho do tabuleiro), não um dado da conta.
- O texto da interface continua em português do Brasil; só as dicas do Público vêm em português europeu.
- Fora do escopo: outros níveis, ranking entre fontes, mudança no formato interno de puzzle.

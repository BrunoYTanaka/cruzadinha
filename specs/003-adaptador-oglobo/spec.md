# Feature Specification: Formato interno de puzzle e adaptador O Globo

**Feature Branch**: `feat/003-adaptador-oglobo`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Formato interno de puzzle em packages/shared (schemas Zod) e adaptador oglobo na API que busca o puzzle diário por data no endpoint da Agilmente com token anônimo, converte a resposta ipuz v2 para o formato interno e é testado com fixtures reduzidas, sem acesso à rede nos testes" (documento de design `2026-10-12-cruzadas-design.md`, seção 10, item 3; seções 2 e 4; dados técnicos em `specs/001-viabilidade-fonte/decision.md`)

## Clarifications

### Session 2026-10-12

- Q: Quando a leitura dos termos de uso do O Globo e da Agilmente precisa acontecer nesta feature? → A: Só antes de concluir a feature; pedidos reais (verificação sob demanda e gravação de fixtures) podem acontecer durante o desenvolvimento. Superada pela emenda 2.0.0 da constitution, que retirou a exigência de ler os termos; o FR-018 foi removido.
- Q: O que fazer quando o texto de uma dica vier com marcação HTML ou códigos de caracteres? → A: Manter o texto da dica exatamente como veio da fonte, sem conversão nem verificação.
- Q: Quais níveis a fonte realmente oferece? → A: Só `daily`. Os níveis `mini`, `express`, `expert` e `thematic` aparecem no código do widget, mas a fonte não os publica (confirmado pelo autor e pelas execuções de `findings.md`). O FR-005 passa a aceitar só `daily`; o campo `level` continua no formato para que novos níveis entrem sem mudar sua forma.

## User Scenarios & Testing *(mandatory)*

O ator desta feature é o autor do projeto, como desenvolvedor, e as features seguintes que vão consumir puzzles (cache e coleta diária, biblioteca, tela do jogo). Ela ainda não entrega nada ao jogador: entrega a definição única de "puzzle" que o site inteiro vai usar e a única peça do sistema que conversa com a fonte O Globo.

### User Story 1 - Definir o formato interno de puzzle (Priority: P1)

O autor tem uma definição única e validável de puzzle, compartilhada entre servidor e site, que descreve só o que o jogo precisa: a grade, as palavras com suas dicas, os metadados e a atribuição à fonte. A resposta correta fica numa parte separada, que pode ser guardada e usada no servidor sem nunca fazer parte do que é enviado ao navegador.

**Why this priority**: Todas as features seguintes (cache, biblioteca, progresso, tela do jogo) dependem desse formato, e ele é independente de qualquer fonte. Sem ele o adaptador não tem para onde converter.

**Independent Test**: Montar à mão um puzzle pequeno válido e alguns inválidos (palavra saindo da grade, dica sem palavra, solução com tamanho diferente da grade) e conferir que a validação aceita o primeiro e recusa cada um dos outros com um motivo claro.

**Acceptance Scenarios**:

1. **Given** um puzzle bem formado, **When** ele é validado, **Then** é aceito, e servidor e site enxergam o mesmo tipo.
2. **Given** um puzzle em que uma palavra ultrapassa a borda da grade ou passa por um bloco, **When** ele é validado, **Then** é recusado com indicação da palavra problemática.
3. **Given** um puzzle válido, **When** se separa a parte pública da solução, **Then** a parte pública não contém nenhuma letra da resposta.
4. **Given** uma solução cujas dimensões ou blocos não batem com a grade do puzzle, **When** o par é validado, **Then** é recusado.

---

### User Story 2 - Obter um puzzle do O Globo por nível e data (Priority: P2)

Dado um nível e uma data, o sistema busca o puzzle na fonte O Globo, confere a resposta e a converte para o formato interno, devolvendo a parte pública, a solução e a lista de datas que a fonte informa. Quando não consegue, devolve um resultado que diz claramente o motivo (puzzle inexistente, fonte recusou o acesso, limite de uso, fonte fora do ar, formato inesperado), sem deixar o restante do sistema conhecer detalhes da fonte.

**Why this priority**: É o objetivo central da feature e o que destrava a coleta diária e a busca sob demanda da feature de puzzles. Depende do formato da história 1.

**Independent Test**: Com respostas gravadas da fonte (fixtures) no lugar da rede, pedir o puzzle de uma data e conferir que o resultado convertido corresponde à grade, às dicas e à solução da fixture; repetir com fixtures de recusa, de limite de uso, de erro do servidor e de formato alterado e conferir o motivo devolvido em cada caso.

**Acceptance Scenarios**:

1. **Given** uma resposta gravada válida para o nível diário de uma data, **When** o puzzle dessa data é pedido, **Then** o resultado é um puzzle no formato interno, com as mesmas dimensões, blocos, números, dicas e letras da resposta, e com fonte, nível, data e atribuição preenchidos.
2. **Given** uma resposta de recusa por falta de identificação do visitante, **When** o puzzle é pedido, **Then** o sistema gera uma nova identificação anônima e tenta mais uma vez; se a recusa persistir, devolve o motivo "acesso recusado".
3. **Given** uma resposta que sinaliza limite de uso, **When** o puzzle é pedido, **Then** o sistema não tenta de novo e devolve o motivo "limite de uso".
4. **Given** uma resposta com estrutura diferente da esperada, **When** o puzzle é pedido, **Then** o sistema devolve o motivo "formato inesperado" e nenhum puzzle parcial.
5. **Given** a fonte indica que não há puzzle para a data pedida, ou a data está no futuro, **When** o puzzle é pedido, **Then** o sistema devolve o motivo "indisponível", distinto de erro da fonte.
6. **Given** uma resposta válida, **When** o puzzle é convertido, **Then** a lista de datas informada pela fonte é devolvida junto, marcando quais estão no futuro.

---

### User Story 3 - Conferir sob demanda contra a fonte real (Priority: P3)

O autor roda, quando quiser e fora da suíte automática, uma verificação contra a fonte real que busca um puzzle de cada nível para uma data e informa, para cada nível, se a busca e a conversão funcionaram ou o motivo da falha. Ela serve para confirmar os níveis que a feature 001 não consultou e para detectar cedo uma mudança no formato da fonte.

**Why this priority**: É a única forma de saber que as fixtures ainda refletem a fonte real, mas não bloqueia as histórias 1 e 2, que funcionam só com fixtures.

**Independent Test**: Rodar a verificação para uma data recente e conferir que ela faz no máximo um pedido por nível, com pausa entre eles, e imprime um resultado por nível sem expor a identificação anônima nem o conteúdo das respostas.

**Acceptance Scenarios**:

1. **Given** a fonte no ar, **When** o autor roda a verificação para uma data, **Then** ela informa, para cada nível aceito (hoje só `daily`), sucesso (com as dimensões e a contagem de palavras) ou o motivo da falha.
2. **Given** um sinal de limite de uso no meio da verificação, **When** ele é recebido, **Then** a verificação para imediatamente e informa os níveis que não foram consultados.
3. **Given** a suíte automática de testes, **When** ela roda, **Then** a verificação contra a fonte real não é executada.

---

### Edge Cases

- A fonte responde com sucesso de transporte (status 200), mas o corpo é uma recusa (`NO-USER`): deve ser tratada como recusa, não como puzzle.
- A grade tem células sem letra na solução que não são blocos, ou blocos em posições diferentes entre grade e solução: conversão recusada como "formato inesperado".
- Uma dica referencia um número que não existe na grade, ou um número da grade não tem dica: conversão recusada como "formato inesperado".
- A resposta usa recursos do formato que o jogo não suporta (célula com mais de uma letra, grade não retangular, célula com estilo): conversão recusada como "formato não suportado", em vez de produzir um puzzle errado.
- Uma sequência de células abertas que inicia palavra mas não tem número na grade: conversão recusada como "formato inesperado" (no ipuz toda palavra começa numa célula numerada).
- A fonte devolve o corpo completo acrescido de `"error": "NOT-AVAILABLE"`: resultado "indisponível", sem converter o puzzle que veio junto (ele não é o da data pedida).
- Letras da solução em minúsculas ou com acento: a solução é guardada em maiúsculas; acentos são mantidos como vieram (a comparação com o que o jogador digita é decidida na feature do jogo).
- Dica vazia ou só com espaços: conversão recusada como "formato inesperado".
- Dica com marcação HTML ou códigos de caracteres: o texto é mantido exatamente como veio da fonte, sem conversão.
- A fonte demora a responder: após um tempo limite, o resultado é "fonte indisponível".
- Data mal formada ou nível desconhecido: recusados antes de qualquer pedido à fonte.
- A lista de datas da fonte vem vazia ou ausente: o puzzle pedido ainda é devolvido, com lista de datas vazia.

## Requirements *(mandatory)*

### Functional Requirements

**Formato interno**

- **FR-001**: O sistema MUST definir um formato interno único de puzzle, compartilhado por servidor e site, com: metadados (fonte, nível, data), atribuição (nome da fonte e, quando informados, título, autor e direitos), grade (largura, altura e, para cada célula, se é bloco ou aberta e seu número, quando houver) e palavras (número, direção horizontal ou vertical, linha e coluna iniciais, tamanho e dica).
- **FR-002**: O sistema MUST definir a solução como estrutura separada da parte pública do puzzle, com a letra esperada de cada célula aberta, de forma que a parte pública nunca contenha letras da resposta.
- **FR-003**: O sistema MUST validar um puzzle e recusá-lo, indicando o motivo, quando: uma palavra sai da grade ou passa por um bloco; o tamanho declarado de uma palavra não corresponde à sequência de células abertas; uma palavra não tem dica ou a dica é vazia; dois números iguais aparecem na mesma direção; uma célula aberta não pertence a nenhuma palavra; a célula onde a palavra começa não tem o número da palavra; uma célula numerada não inicia nenhuma palavra.
- **FR-004**: O sistema MUST validar o par puzzle e solução e recusá-lo quando as dimensões diferem ou quando uma célula aberta não tem exatamente uma letra na solução.
- **FR-005**: O único nível aceito MUST ser `daily` (a fonte não publica outros); as datas MUST ser dias do calendário no formato ano-mês-dia.

**Adaptador O Globo**

- **FR-006**: O sistema MUST acessar a fonte O Globo apenas por meio de um adaptador que implementa a interface comum de fonte de puzzles; nenhuma outra parte do sistema MUST conhecer o endereço, os cabeçalhos ou o formato da fonte.
- **FR-007**: O adaptador MUST buscar o puzzle de um nível e uma data e devolver: o puzzle no formato interno, a solução e a lista de datas informada pela fonte (cada uma marcada como passada ou futura).
- **FR-008**: O adaptador MUST gerar localmente uma identificação anônima de visitante no formato aceito pela fonte, mantê-la só em memória e reutilizá-la entre pedidos; ao receber uma recusa de acesso, MUST gerar uma nova e tentar no máximo mais uma vez.
- **FR-009**: O adaptador MUST detectar a recusa pelo conteúdo da resposta, e não apenas pelo status de transporte.
- **FR-010**: Quando não consegue entregar um puzzle, o adaptador MUST devolver um resultado com um destes motivos, sem lançar detalhes da fonte para quem chama: `unavailable` (não há puzzle para a data ou ela está no futuro), `refused` (acesso recusado após a nova tentativa), `rate-limited` (sinal de limite de uso; sem nova tentativa), `source-down` (erro do servidor da fonte, falha de rede ou tempo limite), `unexpected-format` (resposta fora da estrutura esperada ou inconsistente) e `unsupported` (resposta válida, mas com recursos que o jogo não suporta).
- **FR-011**: O adaptador MUST validar toda resposta da fonte antes de usá-la, tratando-a como dado desconhecido até passar pela validação, e MUST validar o puzzle convertido contra FR-003 e FR-004 antes de devolvê-lo.
- **FR-012**: O adaptador MUST fazer no máximo um pedido por chamada, mais a única nova tentativa de FR-008, e MUST NOT repetir pedidos após `rate-limited` ou `source-down`.
- **FR-013**: O adaptador MUST NOT registrar em logs, mensagens de erro ou resultados a identificação anônima nem o corpo bruto das respostas.

**Testes e fixtures**

- **FR-014**: O adaptador MUST ter testes de contrato que usam respostas gravadas da fonte (fixtures) e não acessam a rede; a suíte automática MUST passar sem internet.
- **FR-015**: As fixtures MUST ser derivadas de respostas reais, reduzidas ou adulteradas para preservar só a estrutura do formato (sem reproduzir um puzzle completo da fonte) e sanitizadas, sem identificação de visitante, cookies ou outros dados sensíveis.
- **FR-016**: Deve haver fixtures para, no mínimo: resposta válida do nível diário, recusa de acesso, resposta com estrutura alterada e resposta com recursos não suportados; cada nível confirmado na verificação real (FR-017) MUST ganhar sua própria fixture válida.
- **FR-017**: O sistema MUST oferecer uma verificação sob demanda contra a fonte real, fora da suíte automática, que busca uma data em cada nível com no máximo um pedido por nível, pausa entre os pedidos e parada imediata ao sinal de limite de uso, e informa o resultado por nível sem expor a identificação anônima nem o conteúdo das respostas.


### Key Entities

- **Puzzle (parte pública)**: o que o jogo precisa para desenhar e navegar o tabuleiro. Metadados (fonte, nível, data), atribuição (fonte, título, autor, direitos), grade e palavras. Não contém letras da resposta.
- **Célula**: tipo (bloco ou aberta) e número, quando inicia uma palavra. A posição (linha, coluna) é dada pelo lugar da célula na grade.
- **Palavra**: número, direção (horizontal ou vertical), célula inicial, tamanho e dica. Pertence a um puzzle; as células que ocupa são derivadas da posição, direção e tamanho.
- **Solução**: a letra esperada de cada célula aberta de um puzzle. Relaciona-se um para um com o puzzle e fica só no servidor.
- **Data disponível**: uma data informada pela fonte para um nível, marcada como passada ou futura.
- **Resultado da busca**: sucesso (puzzle, solução e datas disponíveis) ou falha com um dos motivos de FR-010.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das fixtures válidas são convertidas em puzzles que passam na validação e reproduzem exatamente as dimensões, blocos, números, dicas e letras da resposta original.
- **SC-002**: Cada fixture de falha produz o motivo esperado em 100% dos casos, sem nenhum puzzle parcial devolvido.
- **SC-003**: A suíte automática da feature roda completa sem conexão com a internet, em menos de 10 segundos numa máquina de desenvolvimento comum.
- **SC-004**: Nenhuma parte pública de puzzle produzida pela feature contém letra da resposta (verificado em todas as fixtures).
- **SC-005**: Uma mudança na estrutura da resposta da fonte (campo renomeado, removido ou com outro tipo) faz pelo menos um teste de contrato falhar.
- **SC-006**: A verificação sob demanda faz no máximo um pedido por nível (hoje um por execução, já que só `daily` é aceito, mais a nova tentativa por recusa) e informa o resultado de cada nível em uma linha.
- **SC-007**: Nenhum arquivo versionado pela feature contém uma identificação de visitante real ou um puzzle completo da fonte.

## Assumptions

- O formato da resposta é o descrito em `specs/001-viabilidade-fonte/decision.md` (ipuz v2 em `ipuzData`, mais `fromIpuz` e `dates`); se a verificação real mostrar outro formato em algum nível, esse nível fica como `unsupported` até uma feature própria.
- A fonte só publica o nível `daily`. Os demais nomes vistos no código do widget (`mini`, `express`, `expert`, `thematic`) respondem `NOT-AVAILABLE` e ficam fora do formato interno até haver uma fonte para eles.
- O sinal de limite de uso é o status de transporte de "muitos pedidos"; outros sinais descobertos na verificação real são acrescentados como `rate-limited`.
- O tempo limite de um pedido é de 10 segundos.
- O puzzle "indisponível" cobre datas futuras e datas sem puzzle; confirmar se datas fora da lista da fonte (mais de cerca de 30 dias) ainda respondem fica para a feature de puzzles, que define a coleta diária.
- Fora do escopo desta feature: banco de dados e cache, rotas da API, coleta diária e agendamento, telas do site e outras fontes. O formato interno e a interface de fonte são definidos de modo que essas features os usem sem mudança.
- O repositório é público (decisão da feature 002), o que motiva as fixtures reduzidas de FR-015.
- A comparação entre letra digitada e letra esperada (incluindo acentos) é regra de jogo e fica para a feature `game-logic`.

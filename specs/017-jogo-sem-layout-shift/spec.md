# Feature Specification: Tela de jogo sem saltos e dica resolvida mais visível

**Feature Branch**: `feat/017-jogo-sem-layout-shift`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "No jogo, remover o salvo/salvando ele está causando layout shift, no cruzada online também tem esse problema, lá as dicas são maiores então na parte de cima do jogo fica esticando e contraindo a dica"

Complemento do autor: "Na verdade, deixa como está a altura e coloca ellipse. Outro ponto, como deixar claro que uma palavra foi preenchida? Estou jogando e não percebo que acertei a palavra, o risco é sutil, tem alguma ideia de como fazer ficar claro? Sem alterar como está, talvez usar uma cor diferente para o stroke."

## Contexto

Na tela de jogo, duas partes mudam de tamanho enquanto a pessoa joga e empurram o resto da tela:

1. **Estado do salvamento na faixa de ferramentas.** A cada letra digitada o texto troca entre "Salvando…" e "Salvo" (ou "Salvo neste aparelho" para o visitante). Os textos têm larguras diferentes, então os itens da faixa andam para os lados e, em telas estreitas, a faixa pode mudar de quantidade de linhas e empurrar o tabuleiro para cima e para baixo.
2. **Barra da dica ativa acima do tabuleiro** (computador, feature 011, e celular com teclado na tela, feature 010). A barra cresce com o texto da dica. No Cruzada Online (feature 014) as dicas são mais longas e ocupam uma, duas ou mais linhas; ao passar de uma palavra para outra, a barra estica e encolhe e o tabuleiro sobe e desce junto.

Além disso, o risco que marca uma dica resolvida na lista (feature 016) é uma linha fina na mesma cor apagada do texto. Durante o jogo ele passa despercebido, e a pessoa não nota que acertou a palavra. Num mockup, nem o risco pintado de verde resolveu; entre as alternativas comparadas (texto verde com visto, fundo verde com visto, contador com as certas no fim da lista, letras verdes no tabuleiro), o autor escolheu o fundo verde com visto.

Esta feature:

- tira o "Salvo"/"Salvando…" da tela;
- mantém a barra da dica ativa com a altura de hoje (uma linha) e corta a dica longa com reticências;
- troca o risco da dica resolvida por um fundo verde claro na linha da dica e um visto (✓) no fim dela, com o texto na cor normal.

Ela muda só o site; a API e os dados salvos não mudam. O salvamento automático continua igual (feature 010, FR-015), só deixa de ser exibido quando está tudo certo.

Esta feature substitui, na tela de jogo, os textos "Salvo", "Salvando…" e "Salvo neste aparelho" (features 010 e 013) e a aparência da dica resolvida, riscada e apagada (features 011 e 016). Os avisos de problema (sem conexão, sessão expirada, concluída em outro aparelho, não salvo) continuam (feature 010, FR-031 e FR-032), e o visitante continua vendo que o progresso fica só neste aparelho (feature 013, FR-010). A regra de quando a dica conta como resolvida (feature 016) não muda.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Faixa de ferramentas parada enquanto se digita (Priority: P1)

A pessoa digita letras no tabuleiro. O progresso é salvo sozinho como antes, mas nada na faixa de ferramentas muda de texto ou de posição por causa disso: tempo, pausa, calendário, ajudas e o título continuam no mesmo lugar.

**Why this priority**: É o salto mais frequente (acontece a cada letra, nas duas fontes e em todos os aparelhos) e é o primeiro pedido.

**Independent Test**: Abrir uma cruzada com conta e outra como visitante, digitar várias letras seguidas e conferir que nenhum texto de "Salvo"/"Salvando…" aparece e que nenhum item da faixa ou o tabuleiro muda de posição; recarregar e ver que as letras foram salvas.

**Acceptance Scenarios**:

1. **Given** uma pessoa com conta jogando, **When** ela digita uma letra e o progresso é enviado, **Then** a faixa de ferramentas não mostra "Salvando…" nem "Salvo" e nenhum item dela muda de posição.
2. **Given** um visitante jogando, **When** ele digita uma letra, **Then** a faixa não mostra "Salvando…" nem "Salvo neste aparelho"; a indicação de que o progresso fica só neste aparelho e o link para entrar continuam visíveis, sempre com o mesmo texto, do início ao fim da partida.
3. **Given** uma pessoa com conta jogando, **When** a rede cai e o envio falha, **Then** o aviso de sem conexão aparece como hoje e é anunciado ao leitor de tela; **When** a rede volta e o envio dá certo, **Then** o aviso some e a volta é anunciada ("Conexão restabelecida"), sem mostrar "Salvo".
4. **Given** a sessão expirada, a cruzada concluída em outro aparelho ou o progresso que não pode ser guardado, **When** isso acontece, **Then** o aviso correspondente aparece como hoje.
5. **Given** letras digitadas, **When** a pessoa recarrega a página ou abre a cruzada em outro aparelho (com conta), **Then** as letras estão lá, como hoje.

---

### User Story 2 - Barra da dica ativa numa linha, com reticências (Priority: P1)

A pessoa anda pelas palavras (clicando, com Tab, setas ou os botões anterior/próxima). A barra da dica ativa acima do tabuleiro troca de texto, mas fica sempre com a altura de hoje, de uma linha. Uma dica que não cabe é cortada no fim com reticências, e o tabuleiro fica parado, mesmo no Cruzada Online.

**Why this priority**: É o salto mais visível no Cruzada Online, acontece a cada troca de palavra e faz o tabuleiro inteiro se mexer embaixo do cursor.

**Independent Test**: Abrir uma cruzada do Cruzada Online com dicas de tamanhos bem diferentes, ir de uma dica curta para a mais longa e voltar, e conferir que a posição do topo do tabuleiro não muda e que a dica longa termina em reticências; repetir no celular com teclado na tela.

**Acceptance Scenarios**:

1. **Given** uma cruzada aberta no computador, **When** a pessoa passa de uma dica curta para uma que não cabe numa linha e volta, **Then** a barra mantém a mesma altura e o tabuleiro não se move.
2. **Given** uma dica que não cabe na largura da barra, **When** ela é a ativa, **Then** a barra mostra uma linha só, com o texto cortado no fim e reticências; o número e a direção ("12 Horizontal") nunca são cortados.
3. **Given** uma dica que cabe numa linha, **When** ela é a ativa, **Then** aparece inteira, sem reticências.
4. **Given** uma dica cortada na barra, **When** a pessoa quer lê-la inteira, **Then** ela a encontra completa na lista de dicas (computador e janela estreita sem teclado na tela (entre 721 e 860 px, com mouse)) ou na barra de letras acima do teclado (celular com teclado na tela).
5. **Given** um leitor de tela, **When** a palavra ativa muda, **Then** a nova dica é anunciada inteira, sem reticências, como hoje.
6. **Given** o celular com teclado na tela, **When** a pessoa troca de palavra, **Then** a barra acima do tabuleiro também fica numa linha e o tabuleiro não se move.

---

### User Story 3 - Dica resolvida fácil de notar (Priority: P2)

Quando a pessoa acerta uma palavra, a linha da dica na lista ganha o fundo verde claro de sucesso do tema e um visto (✓) verde no fim. O texto e o número ficam na cor normal, sem risco e sem apagar. A regra de quando a dica conta como resolvida é a da feature 016.

**Why this priority**: Melhora a percepção do acerto, mas o jogo já funciona sem isso.

**Independent Test**: Num puzzle de teste, acertar uma palavra e conferir, nos temas claro e escuro, que a linha da dica fica com fundo verde claro e um visto no fim, sem risco, inclusive quando ela é a dica ativa; e que a lista não muda de altura nem de quebra de linha nesse momento.

**Acceptance Scenarios**:

1. **Given** a palavra 1 horizontal acertada, **When** a pessoa olha a lista, **Then** a linha da dica "1." tem o fundo de sucesso do tema, o texto na cor normal, sem risco, e um visto verde no fim.
2. **Given** a dica resolvida que também é a ativa, **When** a pessoa olha a lista, **Then** a linha tem o fundo da palavra ativa (como qualquer dica ativa) e continua com o visto no fim.
3. **Given** uma dica não resolvida, **When** a pessoa olha a lista, **Then** ela aparece sem fundo de sucesso nem visto, com o espaço do visto reservado à direita (FR-013).
4. **Given** uma palavra acertada ou desfeita (apagando ou trocando uma letra), **When** a dica passa de não resolvida para resolvida ou volta, **Then** só o fundo e o visto mudam: o texto não quebra em outro ponto e a lista não muda de altura.
5. **Given** os temas claro e escuro, **When** a dica resolvida aparece, **Then** o texto tem contraste de pelo menos 4,5:1 com o fundo de sucesso e o visto tem pelo menos 3:1 com o fundo em que aparece (de sucesso ou da palavra ativa).
6. **Given** a lista do celular (aberta pelo teclado na tela) e a lista do computador, **When** uma dica é resolvida, **Then** as duas mostram o mesmo fundo e o mesmo visto.
7. **Given** um leitor de tela, **When** o foco chega numa dica resolvida, **Then** ele ouve ", resolvida" como hoje, uma vez só (o visto é decorativo); a cor não é a única forma de saber que a dica está resolvida.

---

### Edge Cases

- Mudança de largura da janela (redimensionar, girar o celular, alça de tamanho do tabuleiro): a barra continua com uma linha; só muda onde o texto é cortado.
- Dica curta o bastante para caber: nada de reticências.
- Sem célula escolhida: não acontece durante o jogo, porque a cruzada abre com a primeira palavra horizontal escolhida (`initialSelection`); a seleção só fica vazia na conclusão, quando a faixa de modo leitura ocupa o lugar da barra. O texto "Escolha uma célula para começar." continua no componente e cabe numa linha.
- Dica muito longa em tela estreita: continua numa linha só, com o número e a direção sempre inteiros e o texto cortado.
- Modo leitura (puzzle concluído): a faixa de modo leitura ocupa o lugar da barra, como hoje. Todas as dicas da lista aparecem resolvidas, com fundo verde claro e visto.
- Avisos de problema no salvamento (sem conexão, sessão expirada etc.): são raros e precisam chamar atenção, então podem aparecer e sumir como hoje. Esta feature só trata o vai e vem a cada salvamento normal.
- Pausa e retomada: não mudam a barra.
- Lista de dicas na janela estreita sem teclado na tela (entre 721 e 860 px, com mouse): a barra fica na coluna de dicas, abaixo do tabuleiro, e também fica numa linha com reticências.
- A barra de letras acima do teclado do celular (feature 010) continua mostrando a dica inteira e não faz parte desta feature, porque fica abaixo do tabuleiro e não o move.
- O tabuleiro não muda: células de palavras certas continuam sem cor nem marca.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela de jogo MUST NOT exibir os textos "Salvando…", "Salvo" nem "Salvo neste aparelho" em nenhum momento.
- **FR-002**: O salvamento automático MUST continuar igual ao de hoje (feature 010, FR-015; feature 013 para o visitante); só a sua exibição muda.
- **FR-003**: Os avisos de problema no salvamento (sem conexão, sessão expirada, concluída em outro aparelho, não salvo) MUST continuar visíveis e anunciados ao leitor de tela como hoje, incluindo o anúncio de "Conexão restabelecida" quando o envio volta a funcionar.
- **FR-004**: O visitante MUST continuar vendo, na tela de jogo, que o progresso fica só neste aparelho e o link para entrar, com um texto que não muda durante a partida.
- **FR-005**: Um salvamento normal (começar a enviar, terminar de enviar) MUST NOT mudar o tamanho nem a posição de nenhum elemento da tela de jogo.
- **FR-006**: A barra da dica ativa MUST mostrar sempre uma linha só, com a altura de hoje, em todos os lugares onde aparece (acima do tabuleiro no computador e no celular com teclado na tela, e na coluna de dicas da janela estreita sem teclado na tela (entre 721 e 860 px, com mouse); até 720 px, ou com toque, o celular sempre usa o teclado na tela), qualquer que seja a dica ativa.
- **FR-007**: Quando o texto da dica não cabe, a barra MUST cortá-lo no fim com reticências; o número e a direção MUST aparecer sempre inteiros.
- **FR-008**: O leitor de tela MUST continuar ouvindo a dica ativa inteira quando a palavra ativa muda; as reticências são só visuais.
- **FR-009**: O tamanho padrão do tabuleiro e a regra de caber na janela sem rolagem (feature 011) MUST continuar como hoje.
- **FR-010**: Uma dica resolvida, na lista do computador e na lista do celular, MUST aparecer com o fundo de sucesso do tema na linha inteira e um visto (✓) na cor de sucesso no fim da linha, nos temas claro e escuro. Quando ela é a dica ativa, o fundo MUST ser o da palavra ativa e o visto MUST continuar.
- **FR-011**: A dica resolvida MUST NOT ficar riscada nem apagada: texto e número na cor normal. A regra de quando ela conta como resolvida (feature 016) e o texto oculto ", resolvida" MUST continuar como hoje; o visto MUST ser decorativo para o leitor de tela.
- **FR-012**: O texto da dica resolvida MUST ter contraste de pelo menos 4,5:1 com o fundo de sucesso, e o visto pelo menos 3:1 com o fundo em que aparece (de sucesso ou da palavra ativa), nos dois temas.
- **FR-013**: Uma dica passar de não resolvida para resolvida, ou voltar, MUST NOT mudar a quebra de linha do texto nem a altura da lista: o espaço do visto MUST existir em toda dica, preenchido ou vazio.

### Key Entities

Nenhuma entidade nova: tudo vem das dicas da cruzada aberta e da regra de resolvida da feature 016, sem nada guardado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Percorrendo todas as palavras de uma cruzada do Cruzada Online, a posição do tabuleiro na tela varia 0 px, no computador e no celular com teclado na tela.
- **SC-002**: Digitando 20 letras seguidas, com conta e como visitante, nenhum elemento da faixa de ferramentas nem o tabuleiro muda de posição.
- **SC-003**: Em 100% dos testes, a barra da dica ativa tem uma linha só, e toda dica cortada termina em reticências com o número e a direção inteiros.
- **SC-004**: Acertar ou desfazer uma palavra muda a altura da lista em 0 px (teste automático), e, na conferência manual nos dois temas, a pessoa nota que acertou uma palavra olhando a lista sem precisar procurar a dica.
- **SC-005**: Teste automático de acessibilidade da tela do jogo sem violações nos dois temas, com o aviso de sem conexão, a volta da conexão e o ", resolvida" ainda anunciados.
- **SC-006**: Nenhuma mudança na API nem nos dados salvos de progresso.

## Assumptions

- Quem joga não precisa ver uma confirmação a cada salvamento: o salvamento automático é confiável e os problemas já têm aviso próprio. Não mostrar nada quando está tudo certo é o comportamento esperado.
- Para o visitante, o texto fixo que diz que o progresso fica só neste aparelho pode ser diferente do "Salvo neste aparelho" de hoje, desde que não mude com os salvamentos; o texto exato fica para o plano.
- Cortar a dica na barra não tira informação: no computador a lista de dicas está sempre ao lado, e no celular com teclado na tela a barra de letras acima do teclado mostra a dica inteira.
- O fundo e a cor de sucesso são os que o tema já usa para resultados positivos (verde claro e verde), e os dois temas já os definem com contraste suficiente para o texto e o visto.
- O fundo verde claro quase não se distingue do fundo da lista por si só; quem identifica a dica resolvida é o conjunto de fundo e visto, e o leitor de tela ouve ", resolvida".
- Fora do escopo: dica completa ao passar o mouse sobre a barra, marcar palavras certas no tabuleiro, contador de dicas resolvidas, mudar a ordem da lista, animação ou aviso no momento do acerto, mudanças nos demais avisos e qualquer tela fora a de jogo.

# Feature Specification: Calendário mais largo e tamanho ajustável do tabuleiro

**Feature Branch**: `feat/011-calendario-e-tamanho-tabuleiro`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Quero que aumente a largura do calendário, para aproveitar mais o tamanho da tela. Quero que dê para redimensionar o tamanho da cruzada, e salvar ele no localstorage o tamanho. E por default ele ser grande, do jeito que está, é muito pequeno, pode ser apenas para web se em telas menor for complicado"

## Clarifications

### Session 2026-10-15

- Q: O padrão "grande" deve preencher a largura e deixar a página rolar? → A: Não. Um tabuleiro maior que a janela tira a visão do todo e faz a página pular durante o jogo. O padrão é o maior tamanho com o tabuleiro inteiro visível; quem quiser maior redimensiona e aceita rolar.
- Q: O que deixa o tabuleiro com cara de pequeno? → A: A coluna de dicas, que ocupa metade da tela ou mais e empurra o tabuleiro para o canto. A referência é o jogo d'O Globo: tabuleiro e dicas formam um bloco só, centralizado, e o resultado é confortável mesmo com células menores.
- Q: Horizontais e verticais ficam numa lista só? → A: Não. Ficam separadas, em duas colunas lado a lado.
- Q: O calendário também pode ser redimensionado, entre um mínimo e um máximo fixos? → A: Sim, como uma janela do Windows: a pessoa arrasta a borda do calendário com o mouse, entre 720 px e 1600 px de largura (ou a largura da janela, se for menor), e os dias acompanham na mesma proporção. A largura escolhida fica guardada no navegador. Sem escolha, vale o ajuste automático.
- Q: O tabuleiro também deve ser redimensionado arrastando a borda, em vez dos botões − e +? → A: Sim. O tabuleiro passa a ter uma alça de arrastar no canto inferior direito, como o calendário, sem os botões − e +. O botão "Tamanho padrão" na barra de ferramentas continua.
- Mockup aprovado: canvas "Cruzadinha 011 — tamanhos" (https://claude.ai/artifact/1cRvSUeiKSCZKuwPFYhibX), telas "Jogo · computador" e "Biblioteca · computador". Textos, tempos e dicas do mockup são inventados.
- Ajustes pedidos depois da implementação, olhando o site com cruzadas reais: dicas com fonte maior, número em negrito seguido de ponto ("10.") e na cor do texto, e a segunda linha voltando para baixo do número; títulos "Horizontais" e "Verticais" maiores e na cor do texto; letra da célula maior e centralizada; números do tabuleiro em negrito; cantos do tabuleiro sem falha; barra de rolagem padronizada (com cor própria de 3:1, apontada pela análise); Tab preso ao jogo enquanto o foco está no tabuleiro. Ficam em FR-023 a FR-026.
- Pedido depois da implementação: Delete apaga a letra da célula sem voltar, Home vai ao início da palavra e End ao fim. Fica em FR-027.
- Q: Os ajustes visuais feitos depois da implementação valem também no celular e no tablet, ou só no computador? → A: Valem em todas as telas. "Sem mudança" no celular (FR-013 e FR-017) se refere ao layout: alça, tamanhos, posição das dicas e da dica ativa.

## Contexto

A feature 010 entregou a biblioteca em calendário mensal e a tela de jogo. No computador, as duas aproveitam mal a tela:

- Na tela de jogo, o tabuleiro tem só a largura que precisa e a coluna de dicas fica com todo o resto. Numa janela de 1920 px, as dicas passam de 1000 px de largura, mas com altura limitada, e o tabuleiro fica encostado à esquerda. O tabuleiro parece pequeno e a tela parece desequilibrada.
- A biblioteca fica numa coluna estreita no meio da janela, com muito espaço vazio dos lados e dias pequenos.

Esta feature reorganiza a tela de jogo no computador como um bloco centralizado, com o tabuleiro no maior tamanho que cabe inteiro na janela. Ela também deixa a pessoa ajustar esse tamanho, guardando a escolha no aparelho. Por fim, alarga a biblioteca e deixa a pessoa redimensionar o calendário arrastando a borda, também com a escolha guardada no aparelho.

Ela **substitui** partes do FR-010 da feature 010, só no computador:

- A dica ativa passa a ficar numa barra acima do tabuleiro, e não na coluna ao lado.
- A coluna de dicas passa a ter largura limitada, colada ao tabuleiro.
- O tamanho da célula passa a ser o padrão definido aqui ou o escolhido pela pessoa.
- A página pode rolar na vertical quando a pessoa escolhe um tamanho maior que a janela.

O restante do FR-010 continua valendo, inclusive o layout do celular. Os ajustes de FR-023 a FR-027, visuais (texto das dicas, letra e números do tabuleiro, barra de rolagem) e de teclado (Tab, Delete, Home e End), valem em todas as telas.

Fora do escopo: redimensionar no celular, zoom por gesto de pinça, sincronizar o tamanho entre aparelhos ou contas, mudar o tamanho de outras telas (login, conclusão, convites) e qualquer mudança no servidor.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Tela de jogo equilibrada no computador (Priority: P1)

Ao abrir uma cruzada no computador, a pessoa vê o tabuleiro e as dicas como um bloco só, no centro da tela. A dica ativa fica numa barra logo acima do tabuleiro, e as horizontais e verticais ficam em duas colunas ao lado dele, com a mesma altura. O tabuleiro tem o maior tamanho que cabe inteiro na janela.

**Why this priority**: é a queixa principal. Sem mudar o layout, o tabuleiro continua parecendo pequeno e encostado num canto, mesmo para quem nunca mexe no tamanho.

**Independent Test**: num aparelho sem tamanho guardado, abrir uma cruzada 11 × 11 numa janela de 1920 × 1080. Conferir que o bloco está centralizado, que a coluna de dicas tem no máximo 30% da largura e que o tabuleiro aparece inteiro, sem rolar.

**Acceptance Scenarios**:

1. **Given** uma janela de computador sem tamanho guardado, **When** a pessoa abre uma cruzada, **Then** o tabuleiro usa a maior célula que deixa o tabuleiro inteiro visível, com a barra da dica ativa acima dele, sem rolagem vertical. O teto é de 110 px por célula e o mínimo, 30 px.
2. **Given** a tela de jogo no computador, **When** a pessoa a vê, **Then** o tabuleiro e a coluna de dicas ficam colados um ao outro e o bloco formado pelos dois fica centralizado na janela, com o espaço que sobrar dividido igualmente entre os dois lados.
3. **Given** a tela de jogo no computador, **When** a pessoa a vê, **Then** a barra da dica ativa fica logo acima do tabuleiro, na mesma largura dele, com botões para ir à dica anterior e à próxima.
4. **Given** a tela de jogo no computador, **When** a pessoa vê as dicas, **Then** horizontais e verticais ficam em duas colunas lado a lado, com a altura do tabuleiro, e cada coluna rola por dentro quando não cabe, com o título fixo no topo.
5. **Given** uma dica ativa fora da área visível da sua coluna, **When** a seleção muda, **Then** a coluna rola por dentro até a dica ativa ficar visível, sem rolar a página.
6. **Given** um celular, **When** a pessoa abre uma cruzada, **Then** a tela fica como na feature 010: o tabuleiro ocupa a largura da tela, com células de pelo menos 30 px numa grade 11 × 11 em 360 px.

---

### User Story 2 - Ajustar o tamanho do tabuleiro e guardar a escolha (Priority: P1)

No computador, a pessoa arrasta uma alça no canto inferior direito do tabuleiro, como numa janela do Windows, para deixá-lo maior ou menor, e pode voltar ao tamanho padrão por um botão na barra de ferramentas. A escolha fica guardada no aparelho e vale nas próximas cruzadas e visitas.

**Why this priority**: cada pessoa tem uma tela e uma preferência. Há quem queira letras maiores, mesmo tendo que rolar, e quem prefira o tabuleiro menor.

**Independent Test**: arrastar a alça para aumentar o tabuleiro, recarregar a página e abrir outra cruzada; o tamanho escolhido continua. Depois, usar "Tamanho padrão".

**Acceptance Scenarios**:

1. **Given** a tela de jogo no computador, **When** a pessoa passa o mouse no canto inferior direito do tabuleiro, **Then** aparece uma alça visível e o cursor de redimensionar; ao arrastar, o tabuleiro cresce ou diminui acompanhando o ponteiro, mantendo as células quadradas, sem perder letras, seleção, direção nem tempo do cronômetro.
2. **Given** um arraste, **When** a pessoa tenta passar do limite, **Then** o tabuleiro para em 30 px por célula no mínimo e em 110 px (ou menos, se a largura não comportar) no máximo.
3. **Given** a barra de ferramentas no computador, **When** a pessoa a vê, **Then** há o botão "Tamanho padrão", indisponível enquanto não há tamanho escolhido. Um clique duplo na alça faz o mesmo que o botão.
4. **Given** um tamanho escolhido maior que a janela, **When** a pessoa joga, **Then** a página rola na vertical. A coluna de dicas continua visível ao lado do tabuleiro durante a rolagem, e a página rola o necessário para a célula selecionada ficar visível.
5. **Given** um tamanho escolhido ao soltar o mouse, **When** a pessoa recarrega a página, abre outra cruzada ou volta outro dia no mesmo aparelho e navegador, **Then** o tabuleiro abre no tamanho escolhido.
6. **Given** um tamanho escolhido, **When** a pessoa usa "tamanho padrão", **Then** o tabuleiro volta ao padrão da história 1 e a escolha guardada é apagada.
7. **Given** um tamanho escolhido que não cabe na largura da janela atual (janela menor ou grade com mais colunas), **When** a cruzada abre ou a janela muda de tamanho, **Then** o tabuleiro usa o maior tamanho que cabe na largura, sem rolagem horizontal, e a escolha guardada não muda. Ela volta a valer quando houver espaço.
8. **Given** a alça, **When** a pessoa a usa só pelo teclado ou por leitor de tela, **Then** ela recebe foco com Tab, com foco visível; as setas para a esquerda ou para baixo diminuem e as setas para a direita ou para cima aumentam o tabuleiro em passos fixos, Home e End vão ao mínimo e ao máximo, cada tecla grava a escolha, e o leitor anuncia o tamanho atual. Usar a alça não digita letras no tabuleiro.
9. **Given** um celular, **When** a pessoa abre a tela de jogo, **Then** a alça e o botão "Tamanho padrão" não aparecem e o tamanho guardado no aparelho é ignorado.

---

### User Story 3 - Biblioteca mais larga e redimensionável no computador (Priority: P2)

No computador, o calendário da biblioteca ocupa bem mais da largura da janela, com dias maiores e mais fáceis de ler e clicar. O mês inteiro continua visível sem rolar numa tela comum de computador. A pessoa também pode arrastar a borda do calendário, como numa janela do Windows, para deixá-lo mais estreito ou mais largo, entre um mínimo e um máximo fixos. A largura escolhida fica guardada no aparelho.

**Why this priority**: melhora a leitura e o clique, mas a biblioteca já funciona; a tela de jogo é o incômodo maior.

**Independent Test**: abrir a biblioteca numa janela de 1920 × 1080 e medir a largura do calendário e a altura de um dia, comparando com a feature 010. Depois, arrastar a borda até o mínimo, recarregar e conferir que a largura foi mantida.

**Acceptance Scenarios**:

1. **Given** uma janela de computador, **When** a pessoa abre a biblioteca, **Then** o calendário ocupa a largura da janela descontadas as margens laterais, até um limite de 1600 px.
2. **Given** o calendário mais largo, **When** a pessoa vê um dia, **Then** a altura do dia, o número e o texto da situação (tempo, "Em jogo" etc.) crescem junto com a largura, para o dia não ficar achatado.
3. **Given** uma janela de 1920 × 1080, **When** a pessoa abre um mês de seis semanas, **Then** o mês inteiro (título, navegação, dias da semana e todos os dias) cabe na altura da janela sem rolar.
4. **Given** um celular, **When** a pessoa abre a biblioteca, **Then** o calendário fica como na feature 010, sem alça de redimensionar.
5. **Given** o calendário no computador, **When** a pessoa passa o mouse na borda direita ou no canto inferior direito, **Then** aparece uma alça visível e o cursor de redimensionar; ao arrastar, a largura do calendário acompanha o mouse e os dias crescem ou diminuem na mesma proporção.
6. **Given** um arraste, **When** a pessoa tenta passar do limite, **Then** o calendário para em 720 px de largura no mínimo e em 1600 px (ou na largura da janela, se for menor) no máximo.
7. **Given** uma largura escolhida, **When** a pessoa solta o mouse e depois recarrega a página ou volta outro dia no mesmo navegador, **Then** o calendário abre na largura escolhida.
8. **Given** uma largura escolhida, **When** a pessoa dá um clique duplo na alça, **Then** o calendário volta ao ajuste automático e a escolha guardada é apagada.
9. **Given** a alça, **When** a pessoa a usa só pelo teclado, **Then** ela recebe foco com Tab, as setas para a esquerda ou para baixo estreitam e as setas para a direita ou para cima alargam o calendário em passos fixos, Home e End vão ao mínimo e ao máximo, cada tecla grava a escolha, e o leitor de tela anuncia a largura atual.

---

### Edge Cases

- Janela baixa e larga (por exemplo 1920 × 800): o padrão limita o tabuleiro pela altura, e o bloco continua centralizado; o espaço sobra dos lados, não entre o tabuleiro e as dicas.
- Janela alta e estreita no layout de computador (por exemplo 900 × 1200): o padrão limita o tabuleiro pela largura que sobra depois da coluna de dicas, sem rolagem horizontal.
- Dica longa na barra acima do tabuleiro: quebra em mais linhas sem cobrir o tabuleiro; o cálculo do padrão considera a barra com uma linha, e uma dica longa pode exigir uma pequena rolagem.
- Armazenamento do navegador indisponível (janela anônima com bloqueio, cota cheia): as alças continuam funcionando na visita atual, o tabuleiro abre no padrão na próxima e nenhum erro aparece.
- Valor guardado inválido ou fora dos limites (editado à mão, de uma versão antiga): é ignorado e o tabuleiro abre no padrão.
- Mudança do tamanho da janela durante a partida, inclusive passando do layout de computador para o de celular e voltando: o tabuleiro recalcula o tamanho sem perder estado; ao voltar para o computador, vale de novo a escolha guardada.
- Grade com tamanho diferente de 11 × 11: o padrão considera linhas e colunas da grade; o tamanho escolhido é por célula, então uma grade maior fica maior e é limitada pela largura disponível (cenário 7 da história 2).
- Modo leitura e pausa: a alça do tabuleiro também funciona no modo leitura; durante a pausa ela pode ficar oculta junto com o tabuleiro, mas o tamanho volta igual ao retomar.
- Duas contas no mesmo navegador: compartilham o tamanho escolhido, porque é uma preferência do aparelho, não da conta.
- Duas abas abertas: a escolha feita numa vale para a outra na próxima vez que ela abrir uma cruzada; não precisa atualizar a aba já aberta.
- Largura do calendário guardada maior que a janela atual: o calendário usa a largura da janela, sem rolagem horizontal, e a escolha guardada não muda.
- Arraste que sai da janela do navegador ou é interrompido (por exemplo, a pessoa troca de aba): o calendário fica na última largura válida e ela é guardada.
- Clicar na última linha do tabuleiro e depois na primeira: a coluna de dicas rola de volta até a dica ativa, que aparece inteira abaixo do título fixo, e não escondida atrás dele.
- Tamanho escolhido maior que a janela atual (escolhido numa janela maior): vale FR-007; "Tamanho padrão" (FR-010) volta ao tamanho que cabe sem rolar.
- Calendário estreitado até o mínimo: o mês continua legível, com texto da situação de cada dia sem cortar (o tempo pode ficar abreviado, mas não some).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: No layout de computador (o mesmo limite de largura da feature 010 em que as dicas ficam ao lado do tabuleiro), o tabuleiro e a coluna de dicas MUST formar um bloco centralizado na janela, colados um ao outro, com o espaço restante dividido igualmente entre os dois lados.
- **FR-002**: A dica ativa MUST ficar numa barra logo acima do tabuleiro, na largura dele, com botões de dica anterior e próxima dica.
- **FR-003**: Horizontais e verticais MUST ficar em duas colunas lado a lado, numa área de largura limitada (no máximo 30% de uma janela de 1920 px). As colunas MUST ter a altura do tabuleiro, limitada à altura da janela, e rolar por dentro com o título fixo; a dica ativa MUST ficar visível na sua coluna, inteira e abaixo do título. A coluna de dicas MUST NOT deixar o bloco mais alto que o tabuleiro.
- **FR-004**: O tamanho padrão da célula MUST ser o maior que deixa o tabuleiro e a barra da dica ativa inteiros visíveis na janela, sem rolagem vertical, cabendo também na largura ao lado da coluna de dicas, com teto de 110 px e mínimo de 30 px.
- **FR-005**: No layout de computador o tabuleiro MUST ter uma alça de redimensionar no canto inferior direito. Arrastá-la com o mouse MUST mudar o tamanho da célula acompanhando o ponteiro, com células quadradas e em pixels inteiros. A barra de ferramentas MUST ter o botão "Tamanho padrão", indisponível sem tamanho escolhido; um clique duplo na alça MUST fazer o mesmo. Não há botões de aumentar e diminuir.
- **FR-006**: O tamanho MUST ficar entre 30 px por célula e o menor entre 110 px e o que cabe na largura disponível; fora desses limites o arraste para no limite. O tamanho escolhido MUST ser guardado ao soltar o mouse; um arraste interrompido guarda o último tamanho válido.
- **FR-007**: Quando o tamanho escolhido deixar o tabuleiro maior que a janela, a página MAY rolar na vertical. Nesse caso, a coluna de dicas MUST continuar visível ao lado do tabuleiro, a página MUST rolar o mínimo necessário para mostrar a célula selecionada e MUST NOT rolar na horizontal.
- **FR-008**: Mudar o tamanho MUST NOT alterar letras, seleção, direção, marcas de ajuda, cronômetro nem salvamento, e MUST NOT tirar o tabuleiro do modo leitura ou da pausa.
- **FR-009**: O tamanho escolhido MUST ficar guardado só no aparelho, no navegador, valendo para todas as cruzadas e contas daquele navegador, sem envio ao servidor.
- **FR-010**: "Tamanho padrão" MUST apagar a escolha guardada e voltar ao comportamento de FR-004.
- **FR-011**: Se o tamanho escolhido não couber na largura, o tabuleiro MUST usar o maior que cabe, sem mudar a escolha guardada.
- **FR-012**: Valor guardado ausente, inválido ou ilegível, ou armazenamento indisponível, MUST resultar no tamanho padrão, sem mensagem de erro.
- **FR-013**: No layout de celular a tela de jogo MUST seguir o layout da feature 010 sem mudança, sem alça nem botão "Tamanho padrão", e ignorando o tamanho guardado. Os ajustes de FR-023 a FR-027 valem também no celular.
- **FR-014**: A alça do tabuleiro MUST ser utilizável sem mouse: recebe foco com Tab, com foco visível; as setas para a esquerda ou para baixo diminuem e as setas para a direita ou para cima aumentam o tamanho em passos de 10 px por célula; Home e End vão ao mínimo e ao máximo; cada tecla grava a escolha; o leitor de tela anuncia o tamanho (por exemplo "Tamanho do tabuleiro 80 de 110"). A alça, o botão "Tamanho padrão" e os botões da barra da dica ativa MUST ter rótulos acessíveis, foco visível, contraste de 3:1 e alvo de pelo menos 44 px.
- **FR-015**: No layout de computador, sem largura escolhida, o calendário da biblioteca MUST ocupar a largura da janela descontadas as margens laterais, até 1600 px, centralizado (ajuste automático).
- **FR-016**: A altura de cada dia, o número e o texto da situação MUST crescer com a largura do calendário, e um mês de seis semanas MUST caber inteiro na altura de uma janela de 1920 × 1080.
- **FR-017**: No layout de celular a biblioteca MUST seguir o layout da feature 010 sem mudança (a barra de rolagem de FR-025 vale também aqui).
- **FR-018**: Os requisitos de tema, contraste e acessibilidade da feature 010 (FR-026 da feature 010 e FR-027 da feature 010) MUST continuar valendo em todos os tamanhos e nos dois temas.
- **FR-019**: No layout de computador o calendário MUST ter uma alça de redimensionar na borda direita e no canto inferior direito. Arrastar a alça com o mouse MUST mudar a largura do calendário, que acompanha o ponteiro, e os dias, números e textos MUST acompanhar na mesma proporção. O calendário continua centralizado.
- **FR-020**: A largura MUST ficar entre 720 px e o menor entre 1600 px e a largura disponível na janela; fora desses limites o arraste para no limite. O calendário MUST NOT causar rolagem horizontal.
- **FR-021**: A largura escolhida MUST ficar guardada só no navegador do aparelho, para todas as contas dele, ao soltar o mouse. Clique duplo na alça MUST apagar a escolha e voltar ao ajuste automático de FR-015. Valor guardado ausente, inválido ou fora dos limites, ou armazenamento indisponível, MUST resultar no ajuste automático, sem mensagem de erro.
- **FR-022**: A alça MUST ser utilizável sem mouse: recebe foco com Tab, com foco visível; as setas para a esquerda ou para baixo estreitam e as setas para a direita ou para cima alargam o calendário em passos de 40 px; Home e End vão ao mínimo e ao máximo; cada tecla grava a escolha; o leitor de tela anuncia a largura (por exemplo "Largura do calendário 1200 de 1600"). A alça MUST ter alvo de pelo menos 44 px e contraste de 3:1 nos dois temas.
- **FR-023**: Em todas as telas, cada dica da lista MUST mostrar o número em negrito seguido de ponto ("10."), na cor do texto da dica, a um espaço dela; quando a dica quebra, a segunda linha MUST começar embaixo do número. O texto da lista MUST ter 16 px no celular e 17 px no computador (o mesmo da barra da dica ativa). Os títulos "Horizontais" e "Verticais" MUST ter 14 px, em negrito, na cor do texto. Uma dica já preenchida continua riscada e apagada, número incluído. _Nota (feature 016): a última frase foi substituída; a dica só fica riscada quando a palavra está certa (`specs/016-dica-riscada-ao-acertar/spec.md`, FR-001)._
- **FR-024**: Em todas as telas, a letra da célula MUST ocupar 70% da altura da célula e ficar centralizada pela altura da maiúscula, 6% da altura da célula abaixo do centro, para não encostar no número do canto; os números das células MUST ficar em negrito. As células dos cantos MUST acompanhar a borda arredondada do tabuleiro, para a moldura ter a mesma espessura nos cantos.
- **FR-025**: Em todas as telas e nos dois temas, as barras de rolagem do site MUST ser finas, com fundo transparente e uma cor do tema com contraste de pelo menos 3:1 sobre a página e sobre as superfícies, com a mesma aparência no Chrome, no Edge, no Firefox e no Safari (versões atuais).
- **FR-026**: Com o foco no tabuleiro, Tab e Shift+Tab MUST dar a volta na lista de palavras sem sair do tabuleiro (substitui a saída nas pontas da feature 010). Esc seguido de Tab ou Shift+Tab MUST sair do tabuleiro; qualquer outra tecla, ou sair do tabuleiro, cancela o Esc. A grade MUST ter uma descrição para leitor de tela que explica isso ("Tab e Shift+Tab mudam de palavra. Delete apaga a letra sem mover; Home e End vão ao início e ao fim da palavra. Para sair do tabuleiro, aperte Esc e depois Tab."), para o teclado nunca ficar preso sem saída (FR-027 da feature 010).
- **FR-027**: Com o foco no tabuleiro e um teclado físico, em todas as telas (o teclado na tela do celular não tem essas teclas), Delete MUST apagar a letra da célula selecionada sem mover o cursor (célula vazia ou travada por ajuda não muda; apagar uma letra marcada como errada tira a marca, como o Backspace). Home MUST levar o cursor à primeira célula da palavra ativa e End à última, sem mudar a direção e sem rolar a página. Em modo leitura essas teclas não fazem nada.

### Key Entities

- **Preferência de tamanho do tabuleiro**: o tamanho de célula escolhido pela pessoa. Existe só no navegador do aparelho, vale para todas as cruzadas e contas dele e, quando ausente, significa "tamanho padrão".
- **Preferência de largura do calendário**: a largura do calendário escolhida pela pessoa, entre 720 e 1600 px. Existe só no navegador do aparelho, vale para todas as contas dele e, quando ausente, significa "ajuste automático".

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Numa janela de 1920 × 1080, a coluna de dicas ocupa no máximo 30% da largura (hoje passa de 50%), e as margens à esquerda e à direita do bloco tabuleiro + dicas diferem em no máximo 2 px.
- **SC-002**: Numa janela de 1920 × 1080 sem tamanho guardado, o tabuleiro 11 × 11 e a barra da dica ativa aparecem inteiros sem rolar, com células de pelo menos 72 px. A feature 010 dava 80 px nessa janela, mas sem a barra acima do tabuleiro; o mockup aprovado, com a barra, dá 74 px.
- **SC-003**: A pessoa leva o tabuleiro do mínimo ao máximo num só arraste e, depois de recarregar a página, encontra o mesmo tamanho em 100% das vezes no mesmo navegador.
- **SC-004**: Nenhuma combinação de janela de computador (de 861 a 2560 px de largura) e tamanho escolhido produz rolagem horizontal da página.
- **SC-005**: Numa janela de 1920 × 1080, o calendário fica pelo menos 50% mais largo que na feature 010, e o mês inteiro aparece sem rolagem vertical.
- **SC-006**: A tela de jogo e a biblioteca no celular de 360 px mantêm o layout da feature 010 (mesmos tamanhos medidos de célula, grade e calendário); só os ajustes de FR-023 a FR-027 mudam.
- **SC-007**: Uma partida em andamento não perde nenhuma letra, seleção ou segundo do cronômetro ao mudar o tamanho 10 vezes seguidas.
- **SC-008**: Numa janela de 1920 × 1080, a pessoa leva o calendário do máximo ao mínimo num só arraste. O calendário nunca fica abaixo de 720 px nem acima de 1600 px, e depois de recarregar a largura é a mesma, com diferença de no máximo 1 px.
- **SC-009**: Só com o teclado, a pessoa chega às alças e muda o tamanho do tabuleiro e a largura do calendário sem usar o mouse.
- **SC-010**: Só com um teclado físico, no tabuleiro, a pessoa apaga uma letra sem mover o cursor (Delete), vai ao início e ao fim da palavra (Home e End), percorre todas as palavras com Tab sem sair do tabuleiro e sai dele com Esc e Tab, sem a página rolar.

## Assumptions

- "Apenas para web" foi entendido como apenas no layout de computador (o mesmo limite de largura da feature 010); celular e telas estreitas mantêm o layout, mas recebem os ajustes de FR-023 a FR-027.
- "Grande por padrão" foi entendido como o maior tamanho que deixa o tabuleiro inteiro visível; a sensação de tabuleiro pequeno vem principalmente do layout desequilibrado, que esta feature corrige.
- O teto de 110 px por célula da feature 010 continua; tamanhos acima do padrão existem só por escolha da pessoa.
- O tamanho é guardado por célula, não pelo tabuleiro inteiro, para as letras terem o mesmo tamanho em grades de dimensões diferentes.
- A preferência é do aparelho, não da conta, como o tema; não há sincronização entre aparelhos.
- "Janela de 1920 × 1080" nas histórias, nos requisitos e nos critérios de sucesso significa a área visível da página (viewport) com esse tamanho, sem contar barras e abas do navegador.
- O tabuleiro é redimensionado pela alça (arraste e teclado), sem os botões − e + do mockup; o botão "Tamanho padrão" do mockup continua. O passo de 10 px vale só para o teclado; o plano pode ajustá-lo desde que FR-005, FR-006 e FR-014 sejam atendidos.
- A largura da área de dicas (560 px no mockup), o limite de 1600 px da biblioteca e a proporção dos dias são valores iniciais; o plano pode ajustá-los se SC-001, SC-005 e FR-016 forem atendidos.
- O mínimo de 720 px do calendário cabe em qualquer janela do layout de computador (a partir de 861 px, descontadas as margens) e mantém os sete dias legíveis.
- "Igual uma janela do Windows" foi entendido como arrastar a borda direita ou o canto inferior direito; a altura não é arrastada à parte, porque os dias acompanham a largura na mesma proporção.
- O FR-010 da feature 010 é atualizado pelo plano desta feature para apontar para estas regras no computador.

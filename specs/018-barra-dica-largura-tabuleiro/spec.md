# Feature Specification: Barra da dica com a largura do tabuleiro e dica completa ao parar o mouse

**Feature Branch**: `feat/018-barra-dica-largura-tabuleiro`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "No jogo da cruzada a [captura de tela da tela de jogo no computador, com uma cruzada do Cruzada Online]"

Complemento do autor: "Na verdade é a largura fica aumentando e diminuindo, a largura máxima deve ser a mesma do jogo, se não fica empurrando a coluna das dicas"

Segundo complemento do autor: "Na dica em cima, ao passar o mouse em cima e ficar por um tempo, aparecer ela completa."

## Contexto

No computador (layout da feature 011), a tela de jogo é um bloco centralizado com duas partes lado a lado: à esquerda, a barra da dica ativa (com os botões anterior e próxima) em cima do tabuleiro; à direita, as colunas de dicas horizontais e verticais.

Hoje a largura da parte da esquerda é a maior entre a do tabuleiro e a da barra, e a largura da barra depende do texto da dica ativa. No Cruzada Online (feature 014) as dicas são longas. Ao passar de uma palavra para outra, a barra fica mais larga que o tabuleiro e depois encolhe de novo, e as colunas de dicas são empurradas para a direita e voltam. Na captura do autor, a dica "Estão a mudar leis do arrendamento, mas são donos de mais de mil imóveis." deixa a barra bem mais larga que o tabuleiro de 11 × 11.

A feature 017 deixou a barra com uma linha só e a dica longa cortada com reticências, para a altura não mudar. Esta feature fixa a **largura**: a barra fica com a largura do tabuleiro e nunca passa dela, seja qual for a dica. A dica que não cabe nessa largura é cortada com reticências, como na feature 017.

Com a barra presa à largura do tabuleiro, mais dicas são cortadas. Para lê-las sem procurar na lista, a pessoa pode deixar o mouse parado sobre a dica cortada: depois de um instante, a dica aparece completa num balão logo abaixo da barra, por cima do tabuleiro, sem mover nada na tela. A feature 017 tinha deixado isso fora do escopo; esta feature o inclui.

A feature muda só o site; a API e os dados salvos não mudam.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Colunas de dicas paradas ao trocar de palavra (Priority: P1)

No computador, a pessoa anda pelas palavras (clicando, com Tab, setas ou os botões anterior/próxima). A barra da dica ativa troca de texto, mas sua largura é sempre a do tabuleiro. Tabuleiro, barra e colunas de dicas ficam no mesmo lugar a partida inteira.

**Why this priority**: É o pedido do autor. O salto acontece a cada troca de palavra no Cruzada Online e move justamente a lista que a pessoa está lendo.

**Independent Test**: No computador, abrir uma cruzada do Cruzada Online, ir da dica mais curta para a mais longa e voltar, e conferir que a borda esquerda das colunas de dicas e a largura da barra não mudam, e que a barra tem a largura do tabuleiro.

**Acceptance Scenarios**:

1. **Given** uma cruzada aberta no computador, **When** a pessoa passa de uma dica curta para uma longa e volta, **Then** a barra da dica ativa mantém a mesma largura e as colunas de dicas não se movem.
2. **Given** uma cruzada aberta no computador, **When** qualquer dica é a ativa, **Then** as bordas esquerda e direita da barra coincidem com as do tabuleiro.
3. **Given** uma dica que não cabe na largura do tabuleiro, **When** ela é a ativa, **Then** a barra a mostra cortada no fim com reticências; o número, a direção ("1 Horizontal") e os botões anterior e próxima aparecem sempre inteiros.
4. **Given** uma dica que cabe na largura do tabuleiro, **When** ela é a ativa, **Then** ela aparece inteira, sem reticências.
5. **Given** uma dica cortada na barra, **When** a pessoa quer lê-la inteira, **Then** ela a encontra completa na lista de dicas ao lado; o leitor de tela continua ouvindo a dica inteira quando a palavra ativa muda, como hoje.

---

### User Story 2 - Largura acompanha o tamanho do tabuleiro (Priority: P2)

A pessoa muda o tamanho do tabuleiro (alça do canto, teclado na alça, "Tamanho padrão") ou a janela muda de tamanho. A barra acompanha a nova largura do tabuleiro, e só muda o ponto em que a dica é cortada.

**Why this priority**: Sem isso, a regra da história 1 quebraria assim que a pessoa usasse a alça de tamanho da feature 011.

**Independent Test**: No computador, diminuir o tabuleiro com a alça até o mínimo, aumentar até o máximo e voltar ao tamanho padrão, conferindo em cada passo que a barra tem a largura do tabuleiro e a dica ativa continua numa linha.

**Acceptance Scenarios**:

1. **Given** o tabuleiro redimensionado pela alça ou por "Tamanho padrão", **When** o novo tamanho é aplicado, **Then** a barra passa a ter a nova largura do tabuleiro.
2. **Given** a janela do computador redimensionada, **When** o tabuleiro muda de tamanho para caber nela, **Then** a barra acompanha a largura do tabuleiro.
3. **Given** um tabuleiro tão estreito que a barra não comporta os botões, o número e a direção, **When** ele é exibido, **Then** a barra usa uma largura mínima fixa que comporta esses itens, igual para todas as dicas, centralizada sobre o tabuleiro (FR-004).

---

### User Story 3 - Dica completa ao parar o mouse sobre ela (Priority: P2)

A dica ativa está cortada com reticências na barra. A pessoa para o mouse sobre ela e, depois de um instante, a dica aparece completa num balão logo abaixo da barra. O balão some quando o mouse sai da barra e do balão, quando a pessoa aperta Esc ou quando a palavra ativa muda.

**Why this priority**: Com a largura fixa da história 1, dicas longas ficam cortadas com mais frequência. A lista ao lado tem a dica inteira, mas ler direto na barra é mais rápido. O jogo funciona sem isso.

**Independent Test**: No computador, com uma dica longa ativa, parar o mouse sobre ela, conferir que o balão aparece com a dica inteira depois do intervalo, que nada na tela se move e que ele some ao tirar o mouse, ao apertar Esc e ao trocar de palavra; com uma dica curta, conferir que nenhum balão aparece.

**Acceptance Scenarios**:

1. **Given** a dica ativa cortada na barra, **When** a pessoa deixa o mouse parado sobre ela por cerca de meio segundo, **Then** aparece um balão logo abaixo da barra com a dica completa, quebrada em quantas linhas precisar, nas cores do tema.
2. **Given** o mouse só passando sobre a dica, sem parar, **When** ele sai antes do intervalo, **Then** nenhum balão aparece.
3. **Given** a dica ativa que cabe inteira na barra, **When** a pessoa para o mouse sobre ela, **Then** nenhum balão aparece.
4. **Given** o balão aberto, **When** o mouse sai da barra e do balão, **Then** o balão some; **When** o mouse vai da dica para o balão ou para os botões anterior e próxima, **Then** ele continua aberto.
5. **Given** o balão aberto, **When** a pessoa aperta Esc, **Then** o balão some e o jogo continua como antes (o comportamento do Esc no tabuleiro, feature 011, não muda).
6. **Given** o balão aberto, **When** a palavra ativa muda (digitação, Tab, setas, clique no tabuleiro ou nos botões anterior e próxima), **Then** o balão some.
7. **Given** o balão aberto, **When** a pessoa olha a tela, **Then** o tabuleiro, a barra e as colunas de dicas estão exatamente onde estavam; o balão fica por cima do tabuleiro.
8. **Given** um leitor de tela, **When** o balão aparece, **Then** nada novo é anunciado: a dica inteira já foi anunciada quando a palavra ficou ativa (FR-008).

---

### Edge Cases

- Cruzada com poucas colunas (por exemplo o puzzle de amostra 5 × 5) e tabuleiro reduzido ao mínimo pela alça: vale a largura mínima fixa da FR-004; a largura continua sem depender da dica.
- Modo leitura (cruzada concluída): a faixa de modo leitura ocupa o lugar da barra e segue a mesma regra de largura.
- Pausa e retomada: não mudam a largura da barra.
- Celular e tablet (teclado na tela) e janela estreita sem teclado na tela (entre 721 e 860 px, com mouse): a barra já ocupa a largura da coluna em que está, sem empurrar as dicas, e não muda nesta feature. A barra de letras acima do teclado do celular também não muda.
- Troca de tema: não muda a largura.
- A altura da barra continua com uma linha só (feature 017).
- Balão com uma dica muito longa: ele tem a largura da barra e cresce para baixo, por cima do tabuleiro, sem empurrar nada.
- Balão aberto e a janela ou o tabuleiro mudam de tamanho: o balão acompanha a largura da barra; se a dica passar a caber inteira, ele pode ficar aberto até o mouse sair.
- Toque (celular e tablet): não há mouse parado, então o balão não aparece. Lá a dica inteira fica na barra de letras acima do teclado (feature 010).
- Janela estreita sem teclado na tela (entre 721 e 860 px, com mouse): a barra fica na coluna de dicas e o balão funciona igual.
- Jogo pausado: a barra continua visível como hoje e o balão funciona igual.
- Modo leitura: a faixa de modo leitura não tem dica, então não há balão.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: No layout de computador, a barra da dica ativa MUST ter a mesma largura do tabuleiro, com bordas esquerda e direita alinhadas às dele.
- **FR-002**: A largura da barra e a posição das colunas de dicas MUST NOT depender do texto da dica ativa; trocar de palavra MUST NOT mover nem redimensionar nenhuma parte do bloco do jogo.
- **FR-003**: Quando a dica não cabe na largura da barra, ela MUST ser cortada no fim com reticências (feature 017), com o número, a direção e os botões anterior e próxima sempre inteiros. A dica inteira pode ser lida no balão da FR-010.
- **FR-004**: Quando o tabuleiro é mais estreito que o mínimo necessário para os botões, o número e a direção, a barra MUST usar uma largura mínima fixa, que não depende da dica, centralizada sobre o tabuleiro.
- **FR-005**: Ao mudar o tamanho do tabuleiro (alça, "Tamanho padrão" ou janela), a barra MUST acompanhar a nova largura do tabuleiro.
- **FR-006**: A faixa de modo leitura, quando ocupa o lugar da barra, MUST seguir a mesma regra de largura.
- **FR-007**: O tamanho padrão do tabuleiro, a regra de caber na janela sem rolagem e a largura das colunas de dicas (feature 011) MUST continuar como hoje.
- **FR-008**: O leitor de tela MUST continuar ouvindo a dica ativa inteira quando a palavra ativa muda; o corte é só visual.
- **FR-009**: Os layouts de celular, tablet e janela estreita sem teclado na tela MUST continuar como hoje, exceto pelo balão da FR-010 onde houver mouse.
- **FR-010**: Quando a dica ativa está cortada na barra e o mouse fica parado sobre ela por cerca de meio segundo, o site MUST mostrar a dica completa num balão logo abaixo da barra, com a largura da barra, o texto quebrado em linhas e as cores do tema (claro e escuro).
- **FR-011**: O balão MUST NOT aparecer quando a dica cabe inteira na barra, quando o mouse sai antes do intervalo, nem com toque.
- **FR-012**: O balão MUST continuar aberto enquanto o mouse estiver sobre a barra da dica (incluindo os botões anterior e próxima) ou sobre o próprio balão, e MUST sumir quando o mouse sair dos dois, quando a pessoa apertar Esc ou quando a palavra ativa mudar.
- **FR-013**: Abrir e fechar o balão MUST NOT mover nem redimensionar nenhuma parte da tela de jogo: ele fica por cima do tabuleiro.
- **FR-014**: O balão MUST ser só visual: o leitor de tela continua com o anúncio da dica inteira da FR-008, sem anúncio duplicado.
- **FR-015**: O texto do balão MUST ter contraste de pelo menos 4,5:1 com o fundo dele, e o balão MUST se distinguir do tabuleiro que fica por baixo, nos dois temas.

### Key Entities

Nenhuma entidade nova: a feature muda só a disposição da tela de jogo, sem nada guardado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Percorrendo todas as palavras de uma cruzada do Cruzada Online no computador, a posição das colunas de dicas e a largura da barra variam 0 px. O teste automático usa dicas longas inventadas, porque a suíte não acessa as fontes reais; a cruzada real do Cruzada Online é conferida à mão.
- **SC-002**: Em 100% das dicas testadas no computador, a diferença entre a largura da barra e a do tabuleiro é 0 px, salvo no caso da largura mínima (FR-004), em que a largura da barra é a mesma para todas as dicas.
- **SC-003**: Nos tamanhos mínimo, padrão e máximo do tabuleiro, a barra tem a largura do tabuleiro (ou a mínima) e a dica ativa aparece numa linha.
- **SC-004**: Teste automático de acessibilidade da tela do jogo sem violações nos dois temas, com a dica ativa ainda anunciada inteira.
- **SC-005**: Nenhuma mudança na API nem nos dados salvos.
- **SC-006**: Em 100% dos testes com o mouse parado sobre uma dica cortada, o balão mostra a dica inteira em até 1 segundo; com dica que cabe, nenhum balão aparece.
- **SC-007**: Abrir e fechar o balão muda em 0 px a posição do tabuleiro, da barra e das colunas de dicas.

## Assumptions

- "A largura máxima deve ser a mesma do jogo" quer dizer a largura do tabuleiro. A barra ocupa toda essa largura, mesmo quando a dica é curta, para ficar com a mesma largura em todas as dicas.
- Cortar a dica não tira informação: no computador a lista de dicas fica sempre ao lado com a dica inteira, e a dica ativa fica destacada nela.
- A largura mínima da FR-004 só aparece em tabuleiros muito estreitos (poucas colunas e tamanho reduzido pela alça); o valor exato fica para o plano.
- A feature 017 (barra numa linha com reticências) é pré-requisito. Esta feature parte da tela de jogo como fica depois dela.
- O balão só aparece para dica cortada porque, com a dica inteira visível, ele repetiria o mesmo texto.
- Meio segundo é um intervalo comum para balões de ajuda: curto o bastante para não fazer esperar e longo o bastante para não piscar quando o mouse só passa por cima.
- O balão é do próprio site, nas cores do tema, e não o balão nativo do navegador, que não segue o tema escuro e tem tempo de espera variável.
- Teclado: a dica não recebe foco; quem usa só o teclado tem a dica inteira na lista ao lado e no anúncio do leitor de tela.
- Fora do escopo: balão no toque (toque longo), balão nas dicas da lista, mudar o tamanho da letra da barra, mudar a largura das colunas de dicas e qualquer tela fora a de jogo.

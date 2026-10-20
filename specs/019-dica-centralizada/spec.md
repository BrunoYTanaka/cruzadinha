# Feature Specification: Dica no meio da altura da barra, balão da dica acima da barra e dica resolvida riscada

**Feature Branch**: `feat/019-dica-centralizada`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Corrigir alinhamento da dica que fica em cima do jogo, [captura de tela da barra da dica no computador, tema escuro], centralizar"

Complemento do autor: "Alinhar verticalmente também, a dica está um pouco para baixo"

Segundo complemento do autor: "Aproveitando, quando uma palavra é completada, adiciona o stroke de novo"

Terceiro complemento do autor, depois de ver o mockup: "Alinha a dica a esquerda"

Quarto complemento do autor: "Outro ponto, ao deixar o mouse em cima da dica, ele aparece ele completo, só que pra baixo, faz ficar para cima"

## Contexto

No computador (layout da feature 011), a barra da dica ativa fica acima do tabuleiro, com a largura dele (feature 018) e os botões anterior e próxima nas pontas. Entre os botões ficam o número e a direção ("15 Horizontal") e o texto da dica. Na captura do autor, o texto aparece um pouco abaixo do meio da barra: o espaço acima das letras é maior que o espaço abaixo, e o texto não fica na altura do centro das setas dos botões.

O pedido inicial era centralizar a dica também na horizontal. Depois de ver o mockup, o autor preferiu manter a dica alinhada à esquerda, como hoje, logo depois do botão anterior. Esta feature, então, só centraliza o texto da barra na vertical, na altura das setas dos botões.

O balão com a dica completa (feature 018), que abre quando o mouse para sobre uma dica cortada, hoje aparece logo abaixo da barra, por cima das primeiras linhas do tabuleiro, justamente as células em que a pessoa pode estar olhando. Esta feature faz o balão abrir logo acima da barra, por cima da barra de ferramentas do jogo (título, relógio e botões), que a pessoa não precisa ver enquanto lê a dica.

Aproveitando a mudança, a dica resolvida nas colunas de dicas (Horizontais e Verticais, ao lado do tabuleiro; no celular e no tablet, o painel de dicas) volta a ficar riscada. Hoje (feature 017) ela ganha um fundo verde claro e um visto no fim da linha, sem risco; a feature 016 riscava e apagava a dica. Esta feature junta as duas coisas: a dica resolvida fica riscada, com o fundo e o visto da feature 017, e o texto continua na cor normal, sem ficar apagado.

A feature muda só o site; a API e os dados salvos não mudam.

## Clarifications

### Session 2026-10-20

- Q: Onde o risco aparece quando uma palavra é completada corretamente? → A: Só nas colunas de dicas (Horizontais e Verticais; no celular e no tablet, o painel de dicas). A barra da dica acima do tabuleiro e a barra de letras acima do teclado não ficam riscadas.
- Q: A medição no Chromium mostrou as maiúsculas já centradas (1 px acima do meio) e as setas no meio; qual régua define "no meio da altura"? → A: O centro ótico: o meio da altura das letras minúsculas (do topo do "x" à linha de base) fica no meio da barra e na altura do centro das setas, o que sobe o texto cerca de 1 px.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dica no meio da altura da barra (Priority: P1)

No computador, o texto da barra (número, direção e dica) fica no meio da altura dela, pelo centro ótico: o meio da altura das letras minúsculas (do topo do "x" à linha de base) fica no meio da barra, na mesma altura do centro das setas anterior e próxima. Na horizontal, o texto continua alinhado à esquerda, logo depois do botão anterior.

**Why this priority**: É o pedido do autor; com o texto um pouco para baixo, a barra parece desalinhada.

**Independent Test**: No computador, abrir uma cruzada nos dois temas, medir o meio da altura das minúsculas do texto e conferir que coincide com o meio da barra e com o centro das setas, e que o texto começa logo depois do botão anterior.

**Acceptance Scenarios**:

1. **Given** uma dica ativa no computador, **When** a barra é exibida, **Then** o meio da altura das minúsculas do texto (do topo do "x" à linha de base) fica no meio da barra (tolerância de 1 px), sem contar maiúsculas, acentos e letras que descem abaixo da linha, como "g" e "p".
2. **Given** a barra exibida, **When** se compara o texto com os botões anterior e próxima, **Then** o meio da altura das minúsculas e o centro vertical das setas ficam na mesma altura (tolerância de 1 px).
3. **Given** o número e a direção em negrito e a dica em texto normal, **When** aparecem lado a lado, **Then** os dois ficam na mesma linha de base.
4. **Given** qualquer dica ativa, curta ou longa, **When** ela é exibida, **Then** o texto começa à esquerda, logo depois do botão anterior, no mesmo ponto em que começa hoje.
5. **Given** uma dica que não cabe na barra, **When** ela é exibida, **Then** ela é cortada no fim com reticências, como hoje, e segue a mesma centralização vertical; número e direção continuam inteiros.
6. **Given** nenhuma palavra ativa, **When** a barra mostra "Escolha uma célula para começar.", **Then** essa frase segue a mesma regra: à esquerda e no meio da altura.
7. **Given** a pessoa passando de uma dica para outra, **When** a nova dica aparece, **Then** a barra, o tabuleiro e as colunas de dicas não se movem nem mudam de tamanho, e o texto não sobe nem desce (features 017 e 018).

---

### User Story 2 - Balão da dica completa acima da barra (Priority: P2)

No computador, a pessoa para o mouse sobre uma dica cortada e, depois do mesmo intervalo da feature 018, o balão com a dica inteira aparece logo acima da barra, em vez de abaixo. Na janela estreita, em que a barra fica abaixo do tabuleiro, o balão continua abaixo dela. O tabuleiro fica todo à vista enquanto ela lê.

**Why this priority**: Pedido do autor; o balão abaixo da barra cobre as primeiras linhas do tabuleiro. O jogo funciona sem isso.

**Independent Test**: No computador, com uma dica longa ativa, parar o mouse sobre ela e conferir que o balão aparece acima da barra, com a largura dela, sem cobrir nenhuma célula do tabuleiro; levar o mouse da dica até o balão e conferir que ele continua aberto; com uma dica curta, conferir que nenhum balão aparece.

**Acceptance Scenarios**:

1. **Given** uma dica cortada, **When** o mouse fica parado sobre ela por cerca de meio segundo, **Then** o balão aparece logo acima da barra, com a largura dela e a dica completa quebrada em quantas linhas precisar, nas cores do tema.
2. **Given** o balão aberto, **When** a pessoa olha a tela, **Then** nenhuma célula do tabuleiro fica coberta; o balão fica por cima da barra de ferramentas do jogo, e nada na tela se move.
3. **Given** um balão com várias linhas, **When** ele abre, **Then** cresce para cima a partir da barra, com a última linha logo acima dela.
4. **Given** o balão aberto, **When** o mouse sobe da dica para o balão, **Then** ele continua aberto, como na feature 018 (o vão entre a barra e o balão não o fecha).
5. **Given** o balão aberto, **When** o mouse sai da barra e do balão, a pessoa aperta Esc ou a palavra ativa muda, **Then** o balão some, como na feature 018.
6. **Given** uma dica curta, **When** o mouse para sobre ela, **Then** nenhum balão aparece.
7. **Given** pouco espaço visível acima da barra para o balão inteiro (por exemplo, a página rolada ou uma janela baixa), **When** o balão abre, **Then** ele abre abaixo da barra, como hoje, para nunca ficar cortado fora da janela.

---

### User Story 3 - Dica resolvida riscada nas colunas de dicas (Priority: P2)

A pessoa completa uma palavra com as letras certas. Nas colunas de dicas, essa dica fica riscada, além do fundo verde claro e do visto que já tem hoje. Olhando as colunas, a pessoa vê de relance quais dicas já resolveu.

**Why this priority**: Pedido do autor, aproveitando a mudança; o jogo funciona sem isso, mas o risco é a forma mais conhecida de marcar dica feita.

**Independent Test**: Completar uma palavra corretamente e conferir que a dica dela na coluna Horizontais ou Verticais fica riscada, com fundo e visto, e que a barra acima do tabuleiro não fica riscada; apagar uma letra e conferir que o risco sai; completar uma palavra com letra errada e conferir que nada é riscado.

**Acceptance Scenarios**:

1. **Given** uma palavra completa e certa (regra da feature 016), **When** as colunas de dicas são exibidas, **Then** o número e o texto da dica aparecem riscados, com o fundo verde claro e o visto da feature 017.
2. **Given** uma palavra completa mas com letra errada, ou incompleta, **When** as colunas são exibidas, **Then** a dica não fica riscada, como hoje.
3. **Given** uma dica riscada, **When** a pessoa apaga ou troca uma letra da palavra, **Then** o risco, o fundo e o visto saem.
4. **Given** uma dica riscada que ocupa duas ou mais linhas, **When** ela é exibida, **Then** todas as linhas ficam riscadas.
5. **Given** a dica riscada e ativa ao mesmo tempo, **When** ela é exibida, **Then** ela fica com o fundo da palavra ativa (como hoje), riscada e com o visto.
6. **Given** uma dica que passa a ficar riscada ou deixa de ficar, **When** as colunas são exibidas, **Then** a altura da dica, a quebra de linhas e a altura das colunas não mudam (feature 017).
7. **Given** o modo leitura (cruzada concluída), **When** as colunas são exibidas, **Then** todas as dicas aparecem riscadas, com fundo e visto.
8. **Given** a palavra ativa completa e certa, **When** a barra da dica acima do tabuleiro é exibida, **Then** ela não fica riscada; só a dica nas colunas fica.

---

### Edge Cases

- Dica com acentos em maiúsculas (por exemplo "É") ou com letras que descem abaixo da linha ("g", "p", "q"): a posição vertical é a mesma para todas as dicas e não muda conforme as letras da dica, para o texto não pular ao trocar de palavra.
- Altura da barra: continua a de hoje; centralizar o texto na vertical não muda a altura da barra nem a posição do tabuleiro.
- Barra com a largura mínima (feature 018, tabuleiro estreito) e tamanho do tabuleiro alterado (alça, "Tamanho padrão", janela): a regra vertical é a mesma.
- Temas claro e escuro: só a posição vertical do texto muda; cores e contraste continuam como hoje.
- Modo leitura: a faixa de modo leitura ocupa o lugar da barra e não muda nesta feature.
- Celular, tablet e janela estreita sem teclado na tela: a barra da dica sem botões anterior e próxima e a barra de letras acima do teclado continuam como hoje.
- Balão acima da barra por cima da barra de ferramentas: enquanto está aberto, cobre o título, o relógio e os botões que ficam embaixo dele; eles voltam a aparecer quando o balão some, e nenhum deles muda de lugar.
- Balão na janela estreita sem teclado na tela (entre 721 e 860 px, com mouse): ali a barra fica na coluna de dicas, logo abaixo do tabuleiro, e um balão acima dela cobriria as últimas linhas do tabuleiro. Nesse layout o balão continua abrindo abaixo da barra, por cima das colunas de dicas, como na feature 018.
- Leitor de tela: o anúncio da dica ativa não muda; nas colunas, a dica resolvida continua com o texto oculto ", resolvida" (feature 016) e o risco é só visual.
- Dica riscada nos temas claro e escuro: o texto continua na cor normal, sem ficar apagado, para manter o contraste (feature 016 tinha o problema de contraste da dica apagada no tema escuro).
- Painel de dicas no celular e no tablet: a dica resolvida também fica riscada. A barra de letras acima do teclado e a barra da dica acima do tabuleiro não ficam riscadas.
- Ajuda "revelar palavra" ou letras reveladas que completam a palavra certa: a dica fica riscada, como qualquer palavra certa (regra da feature 016).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: No layout de computador, o texto da barra (número, direção e dica) MUST ficar centralizado na vertical pelo centro ótico: o meio da altura das minúsculas (do topo do "x" à linha de base) no meio da barra e na mesma altura do centro das setas dos botões anterior e próxima.
- **FR-002**: A posição vertical do texto MUST ser a mesma para todas as dicas, sem depender de acentos ou de letras que descem abaixo da linha.
- **FR-003**: Na horizontal, o texto MUST continuar alinhado à esquerda, começando logo depois do botão anterior, como hoje.
- **FR-004**: A ordem continua a de hoje: número e direção, depois a dica, na mesma linha e na mesma linha de base.
- **FR-005**: Quando a dica não cabe, ela MUST ser cortada no fim com reticências, com número e direção sempre inteiros (features 017 e 018).
- **FR-006**: A frase mostrada sem palavra ativa MUST seguir a mesma regra: à esquerda e no meio da altura.
- **FR-007**: O ajuste vertical MUST NOT mudar a altura, a largura ou a posição da barra, do tabuleiro ou das colunas de dicas, nem o comportamento do balão da dica completa (feature 018) além da posição definida na FR-015.
- **FR-008**: O anúncio do leitor de tela e o resultado do teste automático de acessibilidade MUST continuar como hoje, nos dois temas.
- **FR-009**: Os layouts de celular, tablet e janela estreita sem teclado na tela e a faixa de modo leitura MUST continuar como hoje, exceto pelo risco da FR-010 nas colunas de dicas.
- **FR-010**: Nas colunas de dicas (Horizontais e Verticais; no celular e no tablet, o painel de dicas), em todos os layouts, a dica resolvida (palavra completa e certa, regra da feature 016) MUST aparecer com número e texto riscados, em todas as linhas, mantendo o fundo e o visto da feature 017.
- **FR-011**: A dica riscada MUST manter o texto na cor normal (sem ficar apagada), com contraste de pelo menos 4,5:1 nos dois temas, inclusive quando também é a ativa.
- **FR-012**: Riscar ou tirar o risco MUST NOT mudar a altura da dica, a quebra de linhas nem a altura das colunas.
- **FR-013**: O risco MUST ser só visual: o texto oculto ", resolvida" e o visto decorativo continuam como hoje.
- **FR-014**: A barra da dica acima do tabuleiro e a barra de letras acima do teclado MUST NOT ficar riscadas.
- **FR-015**: No layout de computador, o balão da dica completa (feature 018) MUST abrir logo acima da barra da dica, com a largura dela, crescendo para cima, sem cobrir nenhuma célula do tabuleiro.
- **FR-016**: Quando não há espaço visível acima da barra para o balão inteiro, ele MUST abrir abaixo da barra, como na feature 018, para nunca ficar cortado fora da janela.
- **FR-017**: O resto do comportamento do balão MUST continuar o da feature 018: intervalo de cerca de meio segundo, só para dica cortada, nunca com toque, aberto enquanto o mouse está sobre a barra ou o balão (inclusive atravessando o vão entre eles), fechado com Esc ou ao mudar a palavra ativa, só visual para o leitor de tela, contraste de pelo menos 4,5:1 e sem mover nada na tela.
- **FR-018**: Na janela estreita sem teclado na tela, em que a barra fica abaixo do tabuleiro, o balão MUST continuar abrindo abaixo da barra, como na feature 018, sem cobrir nenhuma célula.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das dicas testadas no computador, nos dois temas, o meio da altura das minúsculas do texto fica a no máximo 1 px do meio da barra e do centro das setas, e número e dica ficam na mesma linha de base.
- **SC-002**: Em 100% das dicas testadas no computador, o texto começa no mesmo ponto à esquerda (variação de 0 px entre dicas).
- **SC-003**: Em 100% das dicas cortadas, o texto termina em reticências.
- **SC-004**: Percorrendo todas as palavras de uma cruzada no computador, a posição e o tamanho da barra, do tabuleiro e das colunas de dicas e a posição vertical do texto da barra variam 0 px.
- **SC-005**: Teste automático de acessibilidade da tela do jogo sem violações nos dois temas.
- **SC-006**: Nenhuma mudança na API nem nos dados salvos.
- **SC-007**: Em 100% das palavras completadas corretamente nos testes, a dica correspondente nas colunas fica riscada, e em 100% das palavras incompletas ou erradas nenhuma dica fica riscada.
- **SC-008**: Riscar e tirar o risco de uma dica muda em 0 px a altura dela e a altura das colunas.
- **SC-009**: Em 100% dos testes no computador com o mouse parado sobre uma dica cortada e espaço acima da barra, o balão aparece acima dela em até 1 segundo, cobrindo 0 células do tabuleiro, e abrir e fechar o balão muda em 0 px a posição do tabuleiro, da barra, da barra de ferramentas e das colunas de dicas.
- **SC-010**: Na janela estreita sem teclado na tela, o balão aberto cobre 0 células do tabuleiro.

## Assumptions

- "Alinha a dica à esquerda" (terceiro complemento) desfaz a centralização horizontal do pedido inicial e vale para a barra acima do tabuleiro; a centralização vertical do primeiro complemento continua.
- "Um pouco para baixo" é medido pelo centro ótico, o meio da altura das minúsculas, porque a dica é quase toda em minúsculas e é por elas que o olho compara o texto com a barra e com as setas (sessão de esclarecimento). Maiúsculas, acentos e letras que descem abaixo da linha não entram na conta.
- O pedido e a captura são do computador. No celular e no tablet a barra não tem os botões nas pontas; ajustá-la lá fica fora do escopo e pode ser pedido depois.
- A feature 018 (barra com a largura do tabuleiro e balão da dica completa) é pré-requisito.
- "Faz ficar para cima" quer dizer abrir o balão logo acima da barra, no lugar de logo abaixo, no computador, onde a barra fica acima do tabuleiro; na janela estreita a barra fica abaixo do tabuleiro, e lá o balão continua abaixo dela para não cobrir células; isso substitui, só nesse ponto, a posição definida na feature 018 (FR-010: "logo abaixo da barra"). Cobrir a barra de ferramentas por um instante é aceitável: ela não muda enquanto a pessoa lê a dica, e o relógio continua contando por baixo.
- Abrir abaixo quando falta espaço acima é um caso raro no computador, porque a tela de jogo cabe na janela sem rolar (feature 011); fica como garantia para o balão nunca sair da janela.
- "Adiciona o stroke de novo" quer dizer voltar a riscar o texto da dica resolvida (como na feature 016), somando ao fundo e ao visto da feature 017, e não trocar um pelo outro. Diferente da feature 016, o texto não fica apagado, pelo problema de contraste que a feature 016 registrou no tema escuro.
- O risco substitui, nesse ponto, a FR-011 da feature 017 ("a dica resolvida MUST NOT ficar riscada"); o resto da feature 017 continua valendo.
- Fora do escopo: centralizar a dica na horizontal, mudar fonte, tamanho da letra, cores ou altura da barra, riscar a barra da dica ou a barra de letras do teclado, alinhamento vertical da barra no celular e no tablet, a faixa de modo leitura e qualquer tela fora a de jogo.

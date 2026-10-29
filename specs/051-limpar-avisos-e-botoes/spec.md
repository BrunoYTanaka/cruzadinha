# Feature Specification: Menos avisos e botões no calendário e no jogo

**Feature Branch**: `feat/051-limpar-avisos-e-botoes`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "essas alterações que foi feito." (tirar o aviso "Há progresso esperando você entrar.", acertar o botão "Ajudas" e tirar o botão "Baixar as cruzadas de hoje")

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitante sem faixa de aviso (Priority: P1)

Hoje o visitante que deixou progresso esperando uma conta neste aparelho vê, em todas as telas, uma faixa "Há progresso esperando você entrar." com o botão "Entrar". A faixa atrapalha a leitura e o jogo. Ela deixa de existir: o visitante navega sem esse aviso.

**Why this priority**: É o que mais incomoda: a faixa aparece em todas as telas e toma espaço.

**Independent Test**: Deixar progresso de uma conta guardado no aparelho, abrir o site como visitante e percorrer landing, calendário e jogo sem ver a faixa.

**Acceptance Scenarios**:

1. **Given** um visitante e progresso de uma conta esperando no aparelho, **When** abre qualquer tela do site, **Then** não vê o aviso "Há progresso esperando você entrar." nem o botão "Entrar" que vinha com ele.
2. **Given** o mesmo visitante, **When** entra na conta, **Then** o progresso que esperava continua sendo enviado como antes.
3. **Given** uma conta que entrou num aparelho onde outra conta deixou progresso sem enviar, **When** a pessoa abre o site, **Then** continua vendo uma vez o aviso de que esse progresso foi descartado, com o botão "Fechar".

---

### User Story 2 - Botão "Ajudas" sem espaço sobrando (Priority: P2)

Na barra de ajudas do jogo, "Ajudas" tinha um espaço vazio ao lado do texto (reservado para o ponto da verificação automática), e o texto parecia fora do centro do botão, diferente de "Letra" e "Palavra". Passa a ter o texto centrado, como os botões vizinhos, que mantêm forma de pílula, altura e peso de letra iguais.

**Why this priority**: Acabamento visual; não muda o que a pessoa consegue fazer.

**Independent Test**: Abrir um jogo e comparar os três botões da barra de ajudas lado a lado.

**Acceptance Scenarios**:

1. **Given** um jogo aberto, **When** a pessoa olha a barra de ajudas, **Then** "Ajudas" tem o mesmo formato, altura e peso de letra de "Letra" e "Palavra", com o texto centrado e sem espaço sobrando.
2. **Given** a verificação automática desligada, **When** a pessoa a liga, **Then** um ponto aparece no canto do botão "Ajudas" e a largura do botão e da barra não muda.

---

### User Story 3 - Calendário sem o botão de baixar (Priority: P2)

O cabeçalho "Hoje" do calendário tinha o botão "Baixar as cruzadas de hoje" e, depois do clique, um resumo "Guardadas: N". O botão e o resumo saem. Uma cruzada continua disponível sem rede quando já foi aberta antes, e os cartões seguem marcando "Disponível sem rede".

**Why this priority**: Simplifica a tela; o uso sem rede continua possível pelas cruzadas já abertas.

**Independent Test**: Abrir o calendário e ver o cabeçalho "Hoje" sem o botão; abrir uma cruzada com rede, ficar sem rede e abri-la de novo.

**Acceptance Scenarios**:

1. **Given** o calendário aberto, **When** a pessoa olha a seção "Hoje", **Then** não há botão "Baixar as cruzadas de hoje" nem resumo de guardadas.
2. **Given** uma cruzada aberta antes com rede, **When** a pessoa perde a rede e abre a cruzada de novo, **Then** ela abre normalmente.
3. **Given** uma cruzada guardada no aparelho, **When** a pessoa vê o cartão dela em "Hoje", **Then** o cartão mostra "Disponível sem rede".

---

### Edge Cases

- Visitante com progresso esperando e sem rede: não vê aviso algum; o jogo segue como antes.
- Pessoa que já baixou cruzadas antes desta mudança: as cópias guardadas continuam valendo e abrindo sem rede.
- Tela estreita: a barra de ajudas continua numa linha, sem salto ao ligar ou desligar a verificação automática.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O site MUST NOT mostrar ao visitante aviso nem botão sobre progresso de uma conta esperando para ser enviado.
- **FR-002**: O progresso que espera uma conta MUST continuar guardado e ser enviado na entrada, exatamente como antes.
- **FR-003**: Quem está numa conta MUST continuar vendo uma vez o aviso de progresso descartado, com botão "Fechar".
- **FR-004**: O botão "Ajudas" MUST ter o mesmo formato, altura e peso de letra dos botões "Letra" e "Palavra" e MUST NOT ter espaço vazio ao lado do texto.
- **FR-005**: O indicador de verificação automática ligada MUST ficar no canto do botão "Ajudas" sem mudar a largura do botão nem a posição dos vizinhos.
- **FR-006**: O calendário MUST NOT oferecer o botão "Baixar as cruzadas de hoje" nem o resumo "Guardadas".
- **FR-007**: Cruzadas já abertas ou guardadas MUST continuar abrindo sem rede, e os cartões MUST continuar marcando "Disponível sem rede".

### Key Entities *(include if feature involves data)*

- **Progresso esperando**: saves feitos no aparelho que ainda não foram enviados à conta; a mudança só tira o aviso, não o dado.
- **Cruzada guardada**: cópia de uma cruzada no aparelho para jogar sem rede.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das telas, o visitante com progresso esperando não vê faixa de aviso.
- **SC-002**: Nenhum progresso guardado é perdido: após a entrada na conta, 100% do que esperava é enviado.
- **SC-003**: Os três botões da barra de ajudas têm a mesma altura e o mesmo formato, e o texto de "Ajudas" fica centrado no botão.
- **SC-004**: Ligar e desligar a verificação automática move a barra de ajudas em 0 pixels.
- **SC-005**: Uma cruzada aberta com rede abre sem rede em 100% das tentativas.

## Assumptions

- Esta feature substitui regras da feature 041: o aviso "Há progresso esperando você entrar." ao visitante (FR-011, só a parte do aviso) e o botão "Baixar as cruzadas de hoje" (US4, FR-014, SC-006 e o contrato do site). O `spec.md` da 041 recebe uma nota apontando para esta feature. Os demais comportamentos do modo sem rede ficam.
- Mudança só no site; API, contratos e dados não mudam.
- O código que baixa as cruzadas de hoje (`downloadToday`) e a função que diz se há progresso esperando (`hasAnyOutbox`) podem ficar no projeto sem uso na interface; apagá-los é uma decisão à parte.

# Feature Specification: Carregamento padronizado e amigável

**Feature Branch**: `feat/059-loading-padronizado`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Padronizar o carregamento do site: na landing, os botões que levam a jogar e ao calendário parecem mortos quando o servidor gratuito está dormindo; as telas de espera mostram só 'Carregando…'. Uma tela de espera única, bonita e amigável, o mesmo cuidado nos botões que enviam algo (como Entrar) e nos botões da landing."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Botões da landing que respondem ao clique (Priority: P1)

Quem chega à landing e clica em "Jogar a cruzada de hoje" (ou em outro botão que leva ao jogo ou ao calendário) com o servidor dormindo hoje não vê nada acontecer por até um minuto, e acha que o botão quebrou. Passa a ver o botão reagir na hora ("Abrindo…") e, se a espera passar de 2 s, uma explicação curta de que o servidor está acordando.

**Why this priority**: É o problema que originou a feature: o primeiro contato com o site parece defeituoso.

**Independent Test**: Com o servidor lento, abrir a landing, clicar em "Jogar a cruzada de hoje" e ver o botão mudar de imediato e o aviso aparecer depois de 2 s, sem o conteúdo da página se mexer.

**Acceptance Scenarios**:

1. **Given** a landing aberta, **When** a pessoa clica em um botão que leva ao jogo ou ao calendário, **Then** o botão mostra "Abrindo…" na hora e não aceita um segundo clique enquanto espera.
2. **Given** a espera passou de 2 s, **When** a pessoa olha a landing, **Then** vê perto do botão a mensagem "O servidor tirou uma soneca. Já estamos acordando ele, pode levar até um minuto.", num espaço que já estava reservado.
3. **Given** a API responde antes de 2 s, **When** a pessoa clica, **Then** o botão mostra "Abrindo…" e a próxima tela abre sem o aviso aparecer.
4. **Given** o botão "Experimentar aqui", **When** a pessoa clica, **Then** a página rola até a mini cruzada como antes, sem estado de espera.

---

### User Story 2 - Uma tela de espera só, bonita e amigável (Priority: P1)

As telas que esperam dados (entrada, jogo, dia, biblioteca, estatísticas) mostram hoje um "Carregando…" simples e, passados 2 s, trocam por outra tela ("Acordando o servidor"). Passam a ter uma tela de espera única, com casas de cruzada que se acendem em onda e um título amigável para cada tela. Se a espera passar de 2 s, aparecem nessa mesma tela a mensagem da soneca, uma barra de progresso e o contador de segundos. Título e casas não mudam.

**Why this priority**: É o visual e o texto que a pessoa vê em toda espera; troca a sensação de "travou" por "está vindo".

**Independent Test**: Abrir cada uma das cinco telas com o servidor lento e ver o mesmo layout, o título próprio da tela e a mensagem entrando depois de 2 s sem trocar de tela nem deslocar nada.

**Acceptance Scenarios**:

1. **Given** uma das cinco telas esperando dados, **When** a espera começa, **Then** a pessoa vê casas de cruzada com a palavra da tela e o título amigável dela: Entrada ("Preparando as palavras…", CRUZADA), Jogo ("Montando a grade…", GRADE), Dia ("Procurando a cruzada de hoje…", BUSCANDO), Biblioteca ("Folheando o calendário…", CALENDÁRIO), Estatísticas ("Contando seus acertos…", ACERTOS).
2. **Given** a espera passou de 2 s, **When** a pessoa olha a tela, **Then** surgem a mensagem "O servidor tirou uma soneca. Já estamos acordando ele, pode levar até um minuto.", a barra de progresso e o contador de segundos, sem que o título, as casas ou qualquer outro elemento mudem de lugar.
3. **Given** a API responde antes de 2 s, **When** a tela carrega, **Then** a pessoa não vê a mensagem, a barra nem o contador.
4. **Given** a pessoa usa leitor de tela, **When** a espera começa, **Then** ouve o título da tela, não as letras das casas, e ouve a mensagem da soneca quando ela surge.
5. **Given** a pessoa pediu menos movimento no sistema, **When** a tela de espera aparece, **Then** as casas e a barra ficam paradas.

---

### User Story 3 - Botões de envio que explicam a demora (Priority: P2)

Nos formulários de conta (entrar, cadastrar, recuperar senha e os demais), o botão fica em "Entrando…" e, com o servidor dormindo, a pessoa espera até um minuto sem saber por quê. Passa a ver o botão com um indicador de espera e, depois de 2 s, a mesma mensagem da soneca abaixo do botão.

**Why this priority**: O problema é o mesmo da landing, em outro lugar; vem depois porque quem entra já está dentro do site.

**Independent Test**: Com o servidor lento, enviar o formulário de login e ver o botão em espera com o indicador, sem mudar de largura, e a mensagem depois de 2 s.

**Acceptance Scenarios**:

1. **Given** um formulário de conta, **When** a pessoa envia, **Then** o botão mostra o indicador de espera e o texto de ação em andamento ("Entrando…" no login), fica desabilitado e mantém a mesma largura.
2. **Given** a espera passou de 2 s, **When** a pessoa olha o formulário, **Then** a mensagem da soneca aparece abaixo do botão, sem mover os campos (a feature 062 tirou o espaço reservado).
3. **Given** o envio terminou com sucesso ou com erro, **When** a resposta chega, **Then** o botão volta ao normal e a mensagem some.

---

### Edge Cases

- A pessoa clica duas vezes em um botão da landing: o segundo clique não faz nada.
- A navegação falha depois do clique na landing: a página de erro do site assume, como hoje.
- Uma palavra das casas é mais larga que a tela (celular estreito): as casas diminuem e, se ainda não couberem, passam para a linha de baixo, sem rolagem lateral.
- A espera dura mais de um minuto: o contador continua contando e o site trata o limite como já faz hoje.
- Tela com um texto de espera próprio ("Buscando a cruzada…" e similares hoje): passa a usar o título amigável da lista, e uma tela nova sem entrada na lista usa o título da Entrada.
- Esperas encadeadas: ao abrir uma cruzada, o portão do servidor mostra a tela de Entrada e, em seguida, a página mostra a do Jogo enquanto carrega os dados. São duas esperas distintas, ambas com o mesmo layout; só o título e a palavra mudam.
- "Tentar de novo" depois de o servidor esgotar o tempo: a tela de espera volta já com a mensagem, a barra e o contador visíveis e o foco no título.
- A pessoa abre a landing com o servidor já acordado: não vê nenhuma mensagem de espera nova em nenhum botão.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: As telas que esperam dados MUST mostrar uma única tela de espera, com casas de cruzada em onda e um título amigável fixo por tela. Durante a mesma espera, a tela não troca de layout nem de texto: a mensagem da soneca só se soma a ela.
- **FR-002**: A tela de espera MUST ter exatamente os cinco pares título e palavra do cenário 2.1, e uma tela de espera sem par próprio MUST usar o par da Entrada quando não informar a tela.
- **FR-003**: Passados 2 s de espera (o mesmo atraso de hoje), a tela de espera MUST mostrar a mensagem "O servidor tirou uma soneca. Já estamos acordando ele, pode levar até um minuto.", uma barra de progresso e o contador de segundos, no mesmo lugar da tela e sem alterar título, casas ou posição de qualquer elemento.
- **FR-004**: Antes de 2 s, a tela de espera MUST NOT mostrar a mensagem, a barra nem o contador, mas MUST reservar o espaço deles. A única exceção é a espera que recomeça depois de o servidor esgotar o tempo ("Tentar de novo"), que já nasce com os três visíveis.
- **FR-005**: A tela "Acordando o servidor" separada MUST deixar de existir; a espera de entrada no site usa a mesma tela de espera.
- **FR-006**: Os botões da landing que levam ao jogo (no topo, na faixa final e na mini cruzada) e ao calendário (faixa final) MUST reagir ao clique na hora, mostrando "Abrindo…", e MUST ignorar cliques repetidos enquanto esperam.
- **FR-007**: Passados 2 s do clique, a landing MUST mostrar a mensagem da soneca perto do botão clicado, em espaço reservado, sem deslocar o conteúdo.
- **FR-008**: O botão "Experimentar aqui" e o cabeçalho do site MUST continuar como estão.
- **FR-009**: Os botões de envio dos formulários de conta MUST mostrar um indicador de espera, MUST ficar desabilitados e MUST manter a largura enquanto esperam, e MUST mostrar a mensagem da soneca abaixo deles depois de 2 s, em espaço reservado.
- **FR-010**: O indicador e a mensagem MUST sumir quando a resposta chega, com sucesso ou erro.
- **FR-011**: Com a preferência de menos movimento ligada, casas, barra e indicadores MUST ficar parados.
- **FR-012**: As casas MUST ser ocultas para leitores de tela; o título MUST ser lido e a mensagem MUST ser anunciada quando surge.
- **FR-013**: As cores e as fontes MUST vir dos temas claro e escuro do site e da fonte de títulos já usada na landing, sem recurso externo novo.
- **FR-014**: O atraso de 2 s, o tempo limite de espera pela API e o comportamento de acordar o servidor MUST ficar como estão.
- **FR-015**: Nenhuma tela com a espera nova, nenhum botão e nenhum formulário MUST mudar de tamanho ou posição quando a mensagem entra ou sai.

### Key Entities

- **Tela de espera**: título amigável e palavra de cruzada por tela, mais a mensagem da soneca, a barra e o contador que entram depois de 2 s.
- **Botão em espera**: estado de um botão de ação com indicador, texto de ação em andamento, bloqueio de cliques e aviso da soneca opcional abaixo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com o servidor lento, 100% dos cliques nos botões da landing que levam ao jogo ou ao calendário mostram uma reação visível em menos de 0,2 s.
- **SC-002**: Quando uma espera passa de 2 s, a pessoa vê uma explicação em qualquer tela de espera e em qualquer botão em espera coberto, sem trocar de tela.
- **SC-003**: Em nenhuma das telas e botões cobertos o conteúdo muda de posição quando o aviso entra; a verificação de ausência de saltos do site continua passando.
- **SC-004**: Dentro de uma mesma espera, a tela de espera nunca é substituída por outra com layout diferente (como "Carregando…" seguido de "Acordando o servidor" hoje); só a mensagem, a barra e o contador entram.
- **SC-005**: As telas de espera e os botões em espera passam nas verificações de acessibilidade automáticas do projeto, nos temas claro e escuro e com menos movimento.

## Assumptions

- "Formulários de conta" (FR-009) são os sete que enviam algo ao servidor: entrar, cadastrar, criar a conta pelo link do e-mail, recuperar senha, definir nova senha, trocar senha e trocar e-mail. Ficam de fora os botões de diálogo (apagar conta, encerrar outras sessões) e o link de reenvio.

- O atraso de 2 s, o limite de espera e a lógica de acordar o servidor não mudam; a feature só muda o que a pessoa vê.
- O aviso de demora usa o mesmo sinal de "servidor lento" que o site já tem.
- Textos e palavras são fixos e curtos; não há mensagem aleatória.
- Fica fora desta feature: adivinhar se o servidor dorme antes do primeiro pedido, aquecer o servidor, qualquer mudança no servidor de borda ou na API, esqueleto de conteúdo (placeholders no formato da lista) e o cabeçalho do site.
- A landing só usa o que já existe nela; não passa a depender de outras áreas do site.
- A prévia visual aprovada em HTML é a referência de aparência das casas, da barra e do contador.

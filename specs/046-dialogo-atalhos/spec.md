# Feature Specification: Diálogo com atalhos de teclado

**Feature Branch**: `feat/046-dialogo-atalhos`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Diálogo com atalhos de teclado (ref. issue #90)"

## Clarifications

### Session 2026-10-28

- Q: Onde o botão e o atalho `?` ficam disponíveis: só no layout de computador (janela acima de 860 px e sem teclado na tela) ou sempre que não há teclado na tela? → A: Sempre que não há teclado na tela (o mesmo critério que hoje esconde o teclado da tela), em qualquer largura.
  - Motivo: usabilidade: o teclado físico funciona numa janela entre 721 e 860 px, e quem o usa ali também precisa da lista.
- Q: Com a partida pausada (tabuleiro coberto), o botão e o `?` abrem o diálogo, e fechar o diálogo retoma o relógio? → A: Abrem; fechar não retoma, a partida continua pausada até a pessoa tocar em "Continuar".
  - Motivo: usabilidade: consultar a lista não deve exigir despausar, e fechar não pode mudar o estado do relógio sem a pessoa pedir.
- Q: O Esc que fecha o diálogo pode chegar ao tabuleiro e liberar o Tab seguinte? → A: Não; o Esc que fecha o diálogo é consumido por ele, e o próximo Tab no tabuleiro continua mudando de palavra.
  - Motivo: usabilidade: fechar o diálogo não pode mudar o comportamento do Tab sem a pessoa perceber (FR-007).
- Q: Como cada tecla aparece na lista? → A: Pelo nome impresso no teclado (Tab, Shift+Tab, Esc, Backspace, Delete, Home, End), as setas com o símbolo e um nome acessível em português ("seta para cima"), e as letras como "A a Z".
  - Motivo: acessibilidade: o leitor de tela anuncia o nome da tecla em vez de um símbolo; quem enxerga reconhece o que está impresso no teclado.
- Q: Como o atalho `?` é reconhecido nos diferentes teclados (ABNT2, americano)? → A: Pelo caractere produzido (`?`), com Shift permitido e Ctrl, Alt ou Meta recusados; a posição física da tecla não importa.
  - Motivo: usabilidade: o `?` fica em teclas diferentes conforme o layout, e quase sempre exige Shift.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar os atalhos sem sair do jogo (Priority: P1)

Quem joga com teclado no computador não tem como saber, olhando a tela, que Tab muda de palavra, que Home e End vão ao começo e ao fim da palavra ou que Esc libera o Tab. Um diálogo lista os atalhos do tabuleiro, agrupados por assunto, e fecha sem alterar o jogo.

**Why this priority**: É o objetivo da feature; sem a lista, os atalhos continuam escondidos.

**Independent Test**: Na tela do jogo, abrir o diálogo pelo botão da faixa de ferramentas e ver todos os atalhos do tabuleiro com a descrição de cada um; fechar e continuar digitando na mesma casa.

**Acceptance Scenarios**:

1. **Given** a tela do jogo carregada, **When** a pessoa aciona o botão "Atalhos de teclado", **Then** abre um diálogo com a lista de atalhos (setas, letras, Backspace, Delete, Home, End, Tab, Shift+Tab, Esc e o próprio atalho do diálogo), cada um com uma descrição curta.
2. **Given** o diálogo aberto, **When** a pessoa fecha com Esc, com o botão "Fechar" ou clicando fora, **Then** o diálogo some, o foco volta para onde estava e a seleção, a direção e as letras do tabuleiro não mudaram.
3. **Given** o diálogo aberto, **When** a pessoa digita letras ou usa as setas, **Then** nada é escrito no tabuleiro por trás.

---

### User Story 2 - Abrir o diálogo pelo teclado (Priority: P2)

Quem usa só o teclado abre o diálogo com a tecla `?` e fecha com Esc, sem pegar o mouse.

**Why this priority**: Um atalho que lista atalhos precisa ser alcançável pelo teclado; o botão (P1) já entrega a lista a quem usa o mouse.

**Independent Test**: Com o foco no tabuleiro, apertar `?`, ver o diálogo, apertar Esc e voltar a digitar na mesma casa.

**Acceptance Scenarios**:

1. **Given** o foco no tabuleiro, **When** a pessoa aperta `?`, **Then** o diálogo abre e nenhuma letra é digitada.
2. **Given** o foco em um campo de texto ou em outro diálogo aberto, **When** a pessoa aperta `?`, **Then** nada abre e o caractere segue seu caminho normal.
3. **Given** o diálogo aberto, **When** a pessoa aperta `?` de novo, **Then** nada muda (continua um só diálogo aberto).

---

### User Story 3 - Convivência com relógio, acessibilidade e telas pequenas (Priority: P3)

O diálogo se comporta como os demais: suspende o relógio enquanto está aberto, é acessível a leitor de tela e só aparece onde há teclado físico.

**Why this priority**: Evita cobrar tempo de quem está lendo e evita mostrar atalhos inúteis no celular.

**Independent Test**: Abrir o diálogo, conferir que o tempo da partida não avança, e abrir a tela no celular (com o teclado na tela) sem ver o botão.

**Acceptance Scenarios**:

1. **Given** uma partida em andamento, **When** o diálogo fica aberto por 10 segundos, **Then** o relógio da partida não conta esse tempo (mesma regra do diálogo de ajustes).
2. **Given** um leitor de tela, **When** o diálogo abre, **Then** o foco vai para dentro dele, o título é anunciado e a lista é lida como lista com cada atalho e sua descrição.
3. **Given** o tabuleiro com o teclado da tela (celular), **When** a tela carrega, **Then** o botão e o atalho `?` não existem.

---

### Edge Cases

- Jogo concluído (tabuleiro somente leitura): o diálogo ainda abre; a lista é a mesma.
- Pessoa convidada, com conta ou offline: igual; o diálogo não usa rede nem grava nada.
- Com o lápis ligado, a lista continua valendo (as teclas são as mesmas; não há atalho novo para o lápis nesta feature).
- Combinações com Ctrl, Alt ou Meta, como `Ctrl+?`: não abrem o diálogo. Shift é permitido, pois a maioria dos teclados exige Shift para produzir `?`.
- Partida pausada: o botão e o `?` abrem o diálogo; ao fechar, a partida continua pausada.
- Esc que fecha o diálogo: não chega ao tabuleiro; o próximo Tab continua mudando de palavra.
- Janela entre 721 e 860 px com teclado físico e mouse: o botão e o `?` existem, pois não há teclado na tela.
- Dois diálogos ao mesmo tempo (ajustes, conclusão): o de atalhos não abre por cima de outro.
- Tema escuro, movimento reduzido e zoom de 200%: o diálogo continua legível e sem rolagem horizontal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela do jogo MUST oferecer um botão "Atalhos de teclado" na faixa de ferramentas, com nome acessível e dica de texto, que abre o diálogo.
- **FR-002**: O diálogo MUST listar todos os atalhos que o tabuleiro já aceita: setas, letras, Backspace, Delete, Home, End, Tab, Shift+Tab e Esc (incluindo que Esc libera o Tab seguinte), cada um com descrição curta em português. Cada tecla aparece pelo nome impresso no teclado (Tab, Shift+Tab, Esc, Backspace, Delete, Home, End); as setas aparecem como símbolo com nome acessível em português ("seta para cima") e as letras como "A a Z".
- **FR-003**: A lista MUST estar agrupada por assunto (por exemplo, "Mover", "Escrever", "Sair do tabuleiro") e incluir o atalho que abre o próprio diálogo.
- **FR-004**: A tecla `?` MUST abrir o diálogo quando o foco está no tabuleiro, em outro elemento da tela do jogo ou no corpo da página (nenhum elemento focado, como depois de clicar numa área vazia ou com a partida pausada) e não em um campo de texto, sem digitar `?`. Foco no cabeçalho do site fora da tela do jogo, ou dentro de outro diálogo, não conta. O atalho é reconhecido pelo caractere produzido (`?`), qualquer que seja o layout do teclado; Shift é permitido e combinações com Ctrl, Alt ou Meta não abrem o diálogo.
- **FR-005**: O diálogo MUST fechar com Esc, com o botão "Fechar" e com clique fora, devolvendo o foco ao elemento anterior. O Esc que fecha o diálogo MUST NOT chegar ao tabuleiro (não libera o Tab seguinte).
- **FR-006**: Enquanto aberto, o diálogo MUST impedir que teclas cheguem ao tabuleiro e MUST suspender o relógio da partida, como o diálogo de ajustes. Com a partida pausada, o botão e o `?` também abrem o diálogo, e fechá-lo MUST NOT retomar o relógio.
- **FR-007**: Abrir e fechar o diálogo MUST NOT alterar a seleção, a direção, as letras, o rascunho, as ajudas usadas nem o progresso salvo.
- **FR-008**: O botão e o atalho `?` MUST aparecer sempre que o jogo não mostra o teclado na tela (o mesmo critério que decide o teclado na tela), em qualquer largura de janela, e MUST NOT aparecer quando o teclado na tela é mostrado.
- **FR-009**: A lista de atalhos mostrada MUST sair de uma única definição usada também pelo tabuleiro, para que um atalho novo ou removido não deixe a lista desatualizada.
- **FR-010**: O diálogo MUST cumprir as regras de interface do projeto: um `h1` por página (o título do diálogo não conta), botões sem sublinhado, contraste nos dois temas e nenhuma mudança de layout atrás dele.

### Key Entities *(include if feature involves data)*

- **Atalho**: uma tecla ou combinação (por exemplo "Shift+Tab"), a descrição curta e o grupo a que pertence. Não é gravado em lugar nenhum; é só a definição que o tabuleiro e o diálogo compartilham.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem joga no computador chega à lista de atalhos em no máximo 2 ações (um clique, ou uma tecla), a partir de qualquer momento da partida, com o foco no tabuleiro, em outro elemento da tela do jogo ou no corpo da página.
- **SC-002**: 100% dos atalhos que o tabuleiro aceita aparecem na lista, e nenhum atalho da lista deixa de funcionar (verificado por teste que compara as duas fontes).
- **SC-003**: Abrir e fechar o diálogo 10 vezes seguidas não muda nenhuma casa, a seleção nem o tempo de partida.
- **SC-004**: O diálogo passa na verificação automática de acessibilidade do projeto nos dois temas e é operável só com teclado.

## Assumptions

- Escopo: só os atalhos do tabuleiro que já existem. Criar atalhos novos (por exemplo, para ajudas ou lápis) fica para outra feature.
- A dica fixa do tabuleiro (descrição lida por leitor de tela) continua como texto próprio e não faz parte da tabela; ela só cita Tab e Esc e é revisada junto com a tabela quando um atalho mudar.
- A tecla escolhida é `?`, convenção comum em sites; ela não conflita com letras, pois o tabuleiro só digita letras do alfabeto.
- O texto fica em português, sem tradução, como o resto do site.
- Não há ajuste novo, campo novo no progresso nem mudança na API; a feature é só do site.
- O diálogo reaproveita o componente de diálogo existente, com o mesmo tratamento do relógio dos ajustes.

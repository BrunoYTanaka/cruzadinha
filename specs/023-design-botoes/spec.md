# Feature Specification: Botões que parecem botões, distintos dos links

**Feature Branch**: `feat/023-design-botoes`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Issue #41 (https://github.com/BrunoYTanaka/cruzadinha/issues/41) — Refatorar o design dos botões para melhorar identificação visual. Os botões do projeto estão com um visual muito simples e sem diferenciação clara em relação aos links. Hoje é difícil identificar visualmente quando um elemento é um botão ou um link, o que prejudica a usabilidade e a clareza da interface. Precisamos revisar o visual dos botões para deixar a ação mais evidente e consistente com os padrões de interface. Por exemplo o botão de configurações não tem animação de hover e o botão de restaurar padrões nem parece que é um botão. Objetivo: diferenciar claramente botões de links; melhorar a hierarquia visual entre ações principais e secundárias; adicionar estados visuais de hover, focus e active; aumentar a acessibilidade e legibilidade; manter uma identidade visual mais consistente no projeto. Critérios de aceitação: botões devem ser facilmente reconhecíveis como elementos interativos; links e botões devem apresentar estilos distintos; estados visuais devem funcionar corretamente em hover, focus e active; a interface deve manter consistência visual em todas as telas."

## Contexto

Hoje o site tem três aparências de botão de texto: o principal (fundo na cor de destaque), o padrão (só uma borda fina na cor das linhas, fundo transparente) e o discreto (sem borda e sem fundo, só o texto). O discreto é usado em ações como "Restaurar padrões" na modal de configurações e fica igual a um texto solto: nada indica que dá para clicar nele. O padrão, com a borda fina e clara, também se confunde com o fundo, sobretudo no tema escuro.

Além disso, há botões só de ícone (engrenagem das configurações, fechar das modais, botões da barra de ferramentas do jogo, setas da barra da dica) e botões com estilo próprio (botão de tema, botão redondo de legenda, pílulas de ajuda, tamanho padrão do tabuleiro, abas das fontes, seletor da cruzada padrão, chave liga/desliga, passos − e +). Quase nenhum deles muda quando o mouse passa por cima ou quando é pressionado. Só o contorno de foco do teclado existe para todos. A engrenagem, citada na issue, não reage ao mouse.

Os links usam a cor de destaque, a mesma do botão principal e do "Tamanho padrão", que é um botão com texto azul. Assim a cor sozinha não diz se o elemento navega para outra página ou executa uma ação.

Esta feature define uma linguagem visual única para os controles interativos do site:

- **Botão principal**: a ação mais importante de uma tela ou modal.
- **Botão secundário**: as demais ações, com contorno e fundo visíveis.
- **Botão discreto**: ações de baixa ênfase, que continuam com cara de botão.
- **Botão de ícone**: só o ícone, com fundo que aparece ao passar o mouse.
- **Link**: texto sublinhado; nunca tem cara de botão no meio do texto.

Todos ganham os estados de passar o mouse, pressionar, foco do teclado e desativado, iguais em todas as telas e nos dois temas.

A feature muda só a aparência do site; a API, os dados salvos e o comportamento dos controles não mudam.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reconhecer um botão à primeira vista (Priority: P1)

Quem abre uma tela ou uma modal (por exemplo, as configurações) identifica, sem passar o mouse, todos os elementos em que pode clicar para executar uma ação: cada botão tem um formato de botão (área delimitada por contorno ou fundo), inclusive as ações de baixa ênfase como "Restaurar padrões".

**Why this priority**: É o problema central da issue: hoje há botões que parecem texto solto, e a pessoa não sabe que pode clicar.

**Independent Test**: Abrir cada tela e modal nos dois temas e verificar que todo botão de texto tem contorno ou fundo visível em repouso, com contraste suficiente contra o fundo em volta.

**Acceptance Scenarios**:

1. **Given** a modal de configurações aberta, **When** a pessoa olha o rodapé, **Then** "Restaurar padrões" aparece como um botão (com contorno ou fundo visível), e não como texto solto.
2. **Given** qualquer tela com botões de texto, no tema claro ou no escuro, **When** nada está sob o mouse nem com foco, **Then** o limite de cada botão se distingue do fundo com contraste de pelo menos 3:1.
3. **Given** uma tela com uma ação principal e outras secundárias (entrar, cadastrar, modal de conclusão, modal de nova entrada), **When** a pessoa olha a tela, **Then** a ação principal é a de maior destaque e há no máximo uma ação principal visível em cada grupo de ações.

---

### User Story 2 - Resposta visual ao passar o mouse, pressionar e navegar pelo teclado (Priority: P1)

Ao passar o mouse sobre qualquer botão (inclusive os de ícone, como a engrenagem), o botão muda de aparência; ao pressionar, muda de novo, confirmando o clique; ao chegar nele pelo teclado, o contorno de foco aparece. Um botão desativado não reage ao mouse e parece claramente indisponível.

**Why this priority**: É o segundo pedido explícito da issue (a engrenagem sem animação) e o que confirma, no momento do uso, que o elemento é interativo.

**Independent Test**: Em cada tela, passar o mouse, pressionar e navegar com Tab por cada botão, nos dois temas, e verificar os três estados; repetir com um botão desativado.

**Acceptance Scenarios**:

1. **Given** a engrenagem do cabeçalho, **When** o mouse passa sobre ela, **Then** aparece um fundo atrás do ícone em até 150 ms, e o fundo some quando o mouse sai.
2. **Given** qualquer botão habilitado, **When** a pessoa o pressiona (mouse, toque ou tecla Espaço/Enter), **Then** ele mostra um estado pressionado diferente do estado com o mouse por cima, enquanto estiver pressionado.
3. **Given** qualquer botão, **When** recebe foco pelo teclado, **Then** o contorno de foco atual aparece por inteiro, sem ser cortado nem coberto pelo novo visual.
4. **Given** um botão desativado (por exemplo, "Tamanho padrão" já no tamanho padrão, ou o − com o limite em 0), **When** o mouse passa por cima ou a pessoa clica, **Then** a aparência não muda e o botão continua parecendo indisponível.
5. **Given** um aparelho de toque, **When** a pessoa toca um botão, **Then** o estado de "mouse por cima" não fica preso no botão depois do toque.
6. **Given** a preferência do aparelho por menos movimento, **When** a pessoa passa o mouse ou pressiona um botão, **Then** os estados mudam sem animação de transição.

---

### User Story 3 - Diferenciar link de botão (Priority: P2)

Quem lê a interface distingue o que leva para outra página (link) do que executa uma ação ali mesmo (botão): os links de texto são sublinhados e nunca têm contorno ou fundo de botão; os botões nunca são sublinhados, e o texto de um botão secundário ou discreto não usa a cor reservada aos links.

**Why this priority**: É o primeiro objetivo da issue, mas depende da linguagem de botões das histórias 1 e 2 para ficar claro.

**Independent Test**: Percorrer as telas de entrar, cadastro, biblioteca, jogo, modal de configurações, modal de conclusão, página não encontrada e erro, classificando cada elemento clicável como link ou botão só pela aparência, e conferir com o que ele realmente faz.

**Acceptance Scenarios**:

1. **Given** a tela de entrar, **When** a pessoa olha "Criar conta" e "Jogar sem entrar", **Then** eles aparecem como links (texto sublinhado), e "Entrar" aparece como botão principal.
2. **Given** a barra de ferramentas do jogo, **When** a pessoa olha "Tamanho padrão", **Then** ele aparece como botão (secundário ou discreto, com texto na cor normal), e não com a cor dos links.
3. **Given** um link no meio de um texto (por exemplo, "Entre" na dica das configurações de visitante), **When** a pessoa passa o mouse, **Then** o link muda de aparência (por exemplo, sublinhado mais grosso ou outra cor), e não ganha fundo nem contorno de botão.
4. **Given** um link que funciona como controle de navegação numa barra (a seta de voltar da barra de ferramentas do jogo) ou como cartão (cartões "Hoje" e dias do calendário), **When** a pessoa o vê, **Then** ele mantém a aparência de controle ou cartão que já tem e ganha os mesmos estados de mouse, pressionado e foco dos botões de ícone ou dos cartões.

---

### User Story 4 - Consistência entre telas e temas (Priority: P3)

Os mesmos tipos de controle têm a mesma aparência e os mesmos estados em todas as telas e nos temas claro e escuro: um botão secundário na modal de conclusão é igual a um na tela de erro; um botão de ícone na barra do jogo se comporta como a engrenagem do cabeçalho.

**Why this priority**: Consolida as histórias anteriores; o risco de regressão aparece quando cada tela tem estilo próprio.

**Independent Test**: Comparar lado a lado os botões de cada tipo em todas as telas, nos dois temas, conferindo cor, contorno, raio, altura e estados.

**Acceptance Scenarios**:

1. **Given** dois botões do mesmo tipo em telas diferentes, **When** comparados em repouso, com o mouse por cima e pressionados, **Then** têm a mesma aparência.
2. **Given** a troca entre os temas claro e escuro, **When** a pessoa olha qualquer botão, **Then** os contrastes dos critérios de sucesso valem nos dois temas.

---

### Edge Cases

- **Botões dentro do tabuleiro e do teclado na tela**: as células do tabuleiro e as teclas do teclado do celular têm visual próprio de jogo e ficam fora da linguagem de botões desta feature; as teclas só ganham o estado pressionado se ainda não tiverem um.
- **Itens da lista de dicas**: são botões que selecionam uma dica, mas aparecem como linhas de lista com destaque de dica ativa e de dica resolvida (features 017 e 019). Eles mantêm esse visual; podem ganhar o estado de mouse por cima, desde que ele não se confunda com o destaque da dica ativa nem com o da resolvida.
- **Abas das fontes, seletor da cruzada padrão e chave liga/desliga**: são controles com estado (selecionado, ligado). O estado selecionado continua o mais forte; os estados de mouse e pressionado se somam a ele sem apagá-lo.
- **Botão principal desativado ou "carregando"** (por exemplo, enviando o formulário de entrar): continua reconhecível como o botão principal, mas claramente indisponível.
- **Mouse por cima e foco ao mesmo tempo**: o contorno de foco continua visível sobre o estado de mouse.
- **Modo de alto contraste do sistema (cores forçadas)**: os botões continuam com o limite visível (contorno) mesmo quando o sistema troca as cores.
- **Layout sem saltos (feature 017)**: os estados de mouse, pressionado e foco não mudam o tamanho nem a posição do botão nem dos elementos vizinhos.
- **Tooltip da engrenagem e do tema (feature 021)**: o fundo de mouse por cima aparece junto com o tooltip, sem cobri-lo.
- **Link com cor própria** (por exemplo, o "Voltar à biblioteca" verde do modo leitura): mantém a cor ao ser pressionado e só engrossa o sublinhado, o que basta para mudar de aparência (FR-014).

## Requirements *(mandatory)*

### Functional Requirements

**Tipos de botão e hierarquia**

- **FR-001**: O site MUST ter quatro tipos de botão, com aparência definida uma vez e reaproveitada em todas as telas: principal, secundário, discreto e de ícone.
- **FR-002**: O botão principal MUST ter fundo preenchido na cor de destaque e ser o de maior destaque visual; MUST haver no máximo um botão principal visível por grupo de ações (formulário, modal ou bloco de ações).
- **FR-003**: O botão secundário MUST ter contorno e fundo visíveis em repouso, com o limite do botão em contraste de pelo menos 3:1 com o fundo em volta, nos dois temas.
- **FR-004**: O botão discreto MUST continuar reconhecível como botão em repouso (contorno ou fundo sutil visível) e ter menos destaque que o secundário; "Restaurar padrões" MUST usar um tipo de botão com aparência de botão.
- **FR-005**: O botão de ícone MUST mostrar um fundo atrás do ícone ao passar o mouse e ao ser pressionado; em repouso pode não ter fundo. A engrenagem, o fechar das modais, os botões da barra de ferramentas do jogo (inclusive o link de voltar) e as setas da barra da dica MUST seguir esse tipo. O botão de tema e o de legenda têm texto ou preenchimento e seguem o FR-006.
- **FR-006**: Os botões que hoje têm estilo próprio fora do tabuleiro e do teclado ("Tamanho padrão", passos − e +, navegação do calendário, botões de fechar modal, pílulas de ajuda, botão de tema e botão de legenda) MUST passar a seguir um dos quatro tipos, mudando no máximo o formato (tamanho e arredondamento), nunca as cores nem os estados; o "Tamanho padrão" MUST deixar de usar a cor dos links no texto.

**Estados**

- **FR-007**: Todo botão habilitado MUST ter estados visuais distintos para repouso, mouse por cima e pressionado.
- **FR-008**: A mudança de estado MUST começar em até 150 ms e, para quem pede menos movimento ao aparelho, acontecer sem animação.
- **FR-009**: O estado de mouse por cima MUST aparecer só em aparelhos com ponteiro que passa por cima (mouse ou caneta), para não ficar preso depois de um toque.
- **FR-010**: O contorno de foco do teclado (3 px na cor de foco, já existente) MUST continuar visível por inteiro em todos os botões e links, em qualquer outro estado.
- **FR-011**: Um botão desativado MUST parecer indisponível, não mudar ao passar o mouse nem ao pressionar e mostrar o cursor de indisponível.
- **FR-012**: Os estados MUST NOT mudar o tamanho nem a posição do botão nem dos elementos vizinhos.
- **FR-013**: Nos controles com estado selecionado ou ligado (abas das fontes, seletor da cruzada padrão, chave liga/desliga), os estados de mouse e pressionado MUST se somar ao selecionado sem escondê-lo.

**Links**

- **FR-014**: Links de texto MUST ser sublinhados em repouso e mudar de aparência ao passar o mouse e ao pressionar, sem ganhar contorno nem fundo de botão.
- **FR-015**: Botões MUST NOT ser sublinhados, e o texto de botões secundários, discretos e de ícone MUST NOT usar a cor de destaque reservada aos links.
- **FR-016**: Links que funcionam como cartão ou controle (cartões "Hoje", dias do calendário, seta de voltar da barra do jogo, marca do site no cabeçalho) MUST manter o visual atual de cartão ou controle e seguir os estados de mouse, pressionado e foco do tipo correspondente.
- **FR-017**: Uma ação que leva para outra página e aparece como ação principal de um bloco (por exemplo, "Entrar" no cabeçalho do visitante) MAY ter aparência de botão; nesse caso MUST seguir um dos quatro tipos de botão por inteiro.

**Acessibilidade e consistência**

- **FR-018**: O texto de todos os botões MUST ter contraste de pelo menos 4,5:1 com o fundo do botão em todos os estados habilitados, nos dois temas.
- **FR-019**: Todos os botões MUST manter a área de toque mínima atual de 44 × 44 px (fora do tabuleiro).
- **FR-020**: No modo de cores forçadas do sistema, todo botão MUST ter o limite visível.
- **FR-021**: As cores de todos os estados MUST vir dos tokens de tema, com valores para claro e escuro, sem cores fixas nos componentes.
- **FR-022**: As verificações automáticas de acessibilidade já existentes MUST continuar passando em todas as telas, nos dois temas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das telas e modais, nos dois temas, todo botão de texto tem limite visível em repouso com contraste de pelo menos 3:1 com o fundo em volta.
- **SC-002**: 100% dos botões habilitados fora do tabuleiro e do teclado mostram aparência diferente em repouso, com o mouse por cima e pressionados.
- **SC-003**: Numa revisão das telas de entrar, cadastro, biblioteca, jogo, configurações, conclusão, página não encontrada e erro, cada elemento clicável é classificado corretamente como link ou botão só pela aparência, em 100% dos casos.
- **SC-004**: O texto de todos os botões tem contraste de pelo menos 4,5:1 em todos os estados habilitados, nos dois temas.
- **SC-005**: Zero violações novas nas verificações automáticas de acessibilidade em relação à versão anterior.
- **SC-006**: Nenhum salto de layout ao passar o mouse, pressionar ou focar um botão: a posição e o tamanho de cada controle e dos vizinhos variam no máximo 1 px.
- **SC-007**: A resposta visual ao passar o mouse ou pressionar começa em até 150 ms.

## Assumptions

- Os quatro tipos substituem as três variantes atuais: "principal" continua como está (com os novos estados), "padrão" vira "secundário" com contorno mais forte e fundo, e "discreto" ganha um limite visível.
- Os links de texto continuam na cor de destaque e sublinhados; quem perde a cor de destaque são os botões que hoje a usam no texto.
- As células do tabuleiro, as teclas do teclado na tela, a alça de redimensionar (que já tem estados) e a linha de cada dica na lista mantêm o visual próprio; esta feature só acrescenta estados a eles quando faltarem e não conflitarem com os destaques do jogo.
- O "Entrar" do cabeçalho para visitante vira um link com aparência de botão discreto, igual ao "Sair" de quem tem conta (decidido no plano). O link de entrar na barra do jogo, ao lado de "Progresso só neste aparelho", e os links no meio de texto continuam links.
- A animação de troca de tema (View Transition, feature 021) e o giro do ícone do tema continuam como estão.
- O documento de design (`docs/design.md`) ganha uma seção curta descrevendo os tipos de botão, os estados e a regra link × botão.
- Nenhuma mudança na API, nos dados salvos ou nas configurações.

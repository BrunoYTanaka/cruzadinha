# Feature Specification: Ajustes de layout e comportamento (landing, cabeçalho, balões, jogo)

**Feature Branch**: `feat/063-landing-sem-atalhos`

**Created**: 2026-11-09

**Updated**: 2026-11-10 (sete ajustes)

**Status**: Draft

**Input**: User description: "Na landing-page quero remova os botões de calendário, estatisicas e x1. Não faz sentido aparecerem na landingpage" e, depois: "Quero fazer alguns ajustes de layout e comportamento. 1. Na landing-page quero que não mostre no header estatísticas, x1 e configurações; 2. Quero que esses dois botões fiquem do lado do botão de configurações; 3. Os tooltips estão aparecendo qdo o botão fica focado, então depois que clicar ele fica aparecendo; 4. Na landing-page após clicar em algum botão e o servidor está dormindo, quero que apareça a tela e depois que acordar enviar para onde deve; 4. Não sei já tem, mas colocar o botão de login na landing-page, depois de logar joga pro calendário; 5. No jogo remover "Progresso só neste aparelho / Entrar para salvar na sua conta / Seu progresso fica salvo só neste aparelho.""

## Clarifications

### Session 2026-11-10

- Q: O aviso "servidor acordando" que já existe (tela de espera e aviso sob o botão de envio dos formulários de conta) sai com esta feature? → A: Não. Nenhum deles muda; esta feature só faz a landing usar a tela de espera já existente antes de navegar.
- Q: O aviso sob o botão de envio dos formulários de conta sai, já que a tela de espera vem antes? → A: Não (opção A). As rotas fora da landing, incluindo `/login`, já esperam o servidor antes de aparecer; o aviso sob o botão fica só para o servidor dormir de novo com a página aberta.
- Q: O aviso no próprio botão da landing ("Abrindo…" e o balão após 2 s) sai, já que a tela de espera aparece? → A: Sim; só o dos formulários de conta fica.
- Q: Com o servidor dormindo, "Entrar" na landing mostra a tela de espera antes de abrir o login? → A: Sim (opção A), como os outros botões da landing; o login abre já com o servidor acordado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cabeçalho da landing enxuto (Priority: P1)

Hoje o cabeçalho da landing (`/`) mostra os mesmos atalhos das telas internas: "Calendário", "Estatísticas" e "x1" junto da marca, o botão de configurações e, em telas estreitas, o botão "Menu". Na landing eles distraem de quem ainda está conhecendo o site; a página já leva ao jogo pelos botões do conteúdo. Nela o cabeçalho passa a ter só a marca e a ação de entrar na conta (ou o círculo da conta, para quem já entrou), além de "Instalar" quando o navegador oferece.

**Why this priority**: É o pedido original; funciona sozinho.

**Independent Test**: Abrir `/` em tela larga e em celular e conferir que o cabeçalho não tem "Calendário", "Estatísticas", "x1", configurações nem "Menu"; abrir `/calendario` e conferir que continuam lá.

**Acceptance Scenarios**:

1. **Given** a landing aberta em tela larga, **When** a página carrega, **Then** o cabeçalho não tem "Calendário", "Estatísticas", "x1" nem configurações; a marca e "Entrar" (ou a conta) continuam.
2. **Given** a landing em tela de celular (até 560 px), **When** a página carrega, **Then** não existe o botão "Menu".
3. **Given** o HTML pré-gerado da landing, antes de o site montar, **When** a página aparece, **Then** o cabeçalho já tem a marca, sem atalhos, e nada no conteúdo se desloca quando o site monta e as ações da direita aparecem.
4. **Given** qualquer outra tela (calendário, jogo, estatísticas, x1, conta), **When** ela abre, **Then** o cabeçalho continua com os atalhos e o "Menu" (ver história 2 para a posição).
5. **Given** uma conta com x1 aguardando, **When** ela abre a landing, **Then** o contador de x1 não aparece na landing, mas continua nas outras telas.

---

### User Story 2 - Estatísticas e x1 junto das configurações (Priority: P2)

Nas telas internas, "Estatísticas" e "x1" passam a ficar no grupo da direita, ao lado do botão de configurações, em vez de junto da marca. "Calendário" continua ao lado da marca.

**Why this priority**: Ajuste de layout; não bloqueia as demais.

**Independent Test**: Abrir `/calendario` em tela larga e conferir que "Estatísticas" e "x1" aparecem no grupo da direita, logo antes de "Instalar" (quando houver) e do botão de configurações.

**Acceptance Scenarios**:

1. **Given** uma tela interna em tela larga, **When** o cabeçalho aparece, **Then** "Estatísticas", "x1", "Instalar" (quando houver) e configurações formam um grupo contíguo à direita, e "Calendário" fica ao lado da marca.
2. **Given** uma tela estreita (até 560 px), **When** o cabeçalho aparece, **Then** o "Menu" continua reunindo os destinos como antes.
3. **Given** a nova ordem, **When** a pessoa navega só pelo teclado, **Then** a ordem de foco segue a ordem visual.

---

### User Story 3 - Balão só com foco de teclado (Priority: P1)

Hoje o balão de dica (tooltip) de um botão de ícone abre quando o botão recebe foco; ao clicar, o botão fica focado e o balão permanece na tela. O balão deve abrir com o mouse parado em cima ou com foco vindo do teclado, e não por foco causado por clique (nem por foco devolvido ao botão ao fechar um diálogo).

**Why this priority**: Defeito visível em qualquer clique.

**Independent Test**: Clicar num botão de ícone com balão, tirar o mouse de cima: o balão não fica na tela. Navegar com Tab até o mesmo botão: o balão aparece.

**Acceptance Scenarios**:

1. **Given** um botão de ícone com balão, **When** a pessoa clica nele e move o mouse para fora, **Then** o balão não permanece aberto.
2. **Given** o mesmo botão, **When** o foco chega por Tab, **Then** o balão abre imediatamente e fecha com Esc ou ao perder o foco.
3. **Given** um diálogo aberto a partir do botão, **When** o diálogo fecha e o foco volta ao botão, **Then** o balão não abre sozinho.
4. **Given** toque em tela sensível, **When** a pessoa toca no botão, **Then** nenhum balão abre (como antes).

---

### User Story 4 - Landing com servidor dormindo mostra a espera e segue (Priority: P1)

O servidor gratuito dorme e demora a acordar. Na landing, quem clica num botão que leva ao jogo ou ao calendário enquanto o servidor dorme deve ver a tela de espera padrão e, assim que o servidor acordar, ser levado ao destino do botão. Hoje a pessoa fica sem resposta ou chega a uma tela que falha.

**Why this priority**: Primeira impressão de quem chega de fora.

**Independent Test**: Com a API lenta para responder, clicar em "Jogar agora" na landing: aparece a tela de espera; quando a API responde, abre `/dia/<hoje>?fonte=<padrão>`.

**Acceptance Scenarios**:

1. **Given** a landing e o servidor dormindo, **When** a pessoa clica em qualquer botão que leva a outra página, **Then** a tela de espera aparece e, quando o servidor acorda, a pessoa chega ao destino daquele botão.
2. **Given** o servidor já acordado, **When** a pessoa clica no mesmo botão, **Then** chega ao destino sem tela de espera perceptível.
3. **Given** o servidor que não acorda dentro do limite de espera, **When** o tempo acaba, **Then** a pessoa vê a mensagem de erro de conexão já usada no site, com como tentar de novo, e não fica presa na tela de espera.
4. **Given** a landing e o servidor dormindo, **When** a pessoa clica em "Entrar", **Then** a tela de espera aparece e, quando o servidor acorda, abre a página de login.
5. **Given** a tela de espera aberta, **When** a pessoa volta com o botão do navegador, **Then** retorna à landing sem erro.

---

### User Story 5 - Entrar pela landing e cair no calendário (Priority: P2)

A landing deve ter o botão para entrar na conta. Depois de entrar, a pessoa vai para o calendário.

**Why this priority**: Provavelmente já existe; a história garante que continue valendo depois dos outros ajustes.

**Independent Test**: Na landing, clicar em "Entrar", fazer login e conferir que a tela final é `/calendario`.

**Acceptance Scenarios**:

1. **Given** uma pessoa sem sessão na landing, **When** a página carrega, **Then** há um botão "Entrar" visível no cabeçalho, em qualquer largura.
2. **Given** a página de login aberta a partir da landing, **When** o login conclui, **Then** a pessoa chega ao calendário.
3. **Given** uma pessoa já com sessão, **When** abre a landing, **Then** vê o círculo da conta em vez de "Entrar".

---

### User Story 6 - Jogo sem aviso de progresso só neste aparelho (Priority: P2)

Na tela do jogo, para visitante, sai o bloco que diz "Progresso só neste aparelho", o link "Entrar para salvar na sua conta" e o aviso falado "Seu progresso fica salvo só neste aparelho.".

**Why this priority**: Remoção de ruído; independente.

**Independent Test**: Abrir um jogo como visitante e conferir que nenhum desses três textos está na tela nem é anunciado por leitor de tela.

**Acceptance Scenarios**:

1. **Given** um visitante no jogo, **When** a tela carrega, **Then** nenhum dos três textos aparece.
2. **Given** uma pessoa com conta no jogo, **When** o progresso salva, **Then** o indicador de salvamento da conta (salvando, salvo, erro) continua como antes.
3. **Given** um visitante, **When** a tela carrega, **Then** nada no jogo se desloca por causa da ausência do bloco.

---

### User Story 7 - Títulos das dicas legíveis ao rolar (Priority: P2)

Na lista de dicas do jogo, os títulos "Horizontais" e "Verticais" ficam fixos no topo enquanto a lista rola. Hoje as linhas das dicas passam pela borda do título e aparecem cortadas ou coladas nele (texto pela metade logo acima e abaixo do título), o que mistura título e dica. Entre o título e as dicas que rolam por baixo dele passa a haver uma transição suave (esmaecer em gradiente) que separa os dois sem esconder dicas que ainda cabem na lista.

**Why this priority**: Defeito visual, só na lista com rolagem.

**Independent Test**: Abrir um jogo com muitas dicas no computador, rolar a lista de Horizontais e de Verticais e conferir que nenhuma linha de dica aparece nítida e cortada junto do título.

**Acceptance Scenarios**:

1. **Given** a lista de dicas rolada, **When** uma dica passa sob o título fixo, **Then** ela esmaece suavemente até sumir sob o título, sem aparecer cortada nítida ao lado dele.
2. **Given** a lista no topo (sem rolar), **When** a tela carrega, **Then** a primeira dica aparece inteira, sem esmaecer, e o título não ocupa mais espaço do que hoje.
3. **Given** a folha de dicas do celular, **When** ela rola, **Then** o título tem o mesmo tratamento.
4. **Given** os temas claro e escuro e o modo de alto contraste, **When** a lista rola, **Then** o esmaecer usa a cor de fundo do tema e o título continua legível.
5. **Given** a digitação no tabuleiro, **When** a dica ativa muda e a lista rola sozinha, **Then** nada se desloca por causa do esmaecer.

---

### User Story 8 - "Tamanho padrão" vira botão de ícone (Priority: P3)

Na faixa de ferramentas do jogo no computador, o botão de texto "Tamanho padrão" (que apaga o tamanho escolhido pela alça do tabuleiro) passa a ser um botão de ícone, como os vizinhos (pausa, calendário, atalhos, imprimir). Mantém o nome acessível "Tamanho padrão" e o balão com o mesmo texto; continua indisponível quando o tabuleiro já está no tamanho padrão.

**Why this priority**: Ajuste de aparência, libera espaço na faixa.

**Independent Test**: No computador, arrastar a alça do tabuleiro, conferir que o botão de ícone fica ativo, clicar nele e conferir que o tabuleiro volta ao tamanho padrão e o botão fica indisponível.

**Acceptance Scenarios**:

1. **Given** o jogo no computador, **When** a faixa de ferramentas aparece, **Then** não há botão de texto "Tamanho padrão"; há um botão de ícone com o nome acessível "Tamanho padrão".
2. **Given** o tabuleiro no tamanho padrão, **When** a tela carrega, **Then** o botão está indisponível; depois de mudar o tamanho pela alça ou pelo teclado, fica ativo e, ao acionar, restaura o padrão.
3. **Given** o mouse parado ou o foco de teclado sobre o botão, **When** o balão abre, **Then** diz "Tamanho padrão" (regra da história 3).
4. **Given** a janela estreita ou o teclado na tela, **When** a faixa aparece, **Then** o botão continua ausente, como hoje.
5. **Given** a faixa de ferramentas, **When** o botão troca de texto para ícone, **Then** nada se desloca na digitação (`sem-saltos`).

### Edge Cases

- O botão "Ver o calendário" da faixa final da landing faz parte do conteúdo e continua; ele também passa pela espera da história 4.
- A landing segue indexável, com um único `h1`; o conteúdo e o mini cruzadinha não mudam.
- A pessoa que já entrou continua vendo o círculo da conta na landing.
- Sem a configuração na landing, quem quiser mudar tema ou ajustes os acha ao entrar nas telas internas.
- Visitante deixa de ser avisado, no jogo, de que o progresso fica só no aparelho. Aceito: o "Entrar" do cabeçalho e a oferta de importar o progresso ao entrar (feature 057) continuam.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Na landing, o cabeçalho MUST NOT mostrar "Calendário", "Estatísticas", "x1", o contador de x1, o botão de configurações nem "Menu", em nenhuma largura.
- **FR-002**: O HTML pré-gerado da landing MUST ter o mesmo começo de cabeçalho da landing montada (só a marca); as ações da direita (Instalar, "Entrar", círculo da conta) entram ao montar sem deslocar o conteúdo.
- **FR-003**: Nas demais telas, "Estatísticas" e "x1" MUST ficar no grupo da direita, logo antes de "Instalar" (quando houver) e do botão de configurações; "Calendário" MUST ficar ao lado da marca; o "Menu" de celular segue como antes.
- **FR-004**: O balão de um botão de ícone MUST abrir só com mouse parado em cima ou foco de teclado, e MUST NOT abrir por foco causado por clique, toque ou devolução de foco ao fechar um diálogo.
- **FR-005**: Na landing, todo botão que leva a outra página MUST mostrar a tela de espera padrão enquanto o servidor não responde e, ao responder, MUST levar ao destino original do botão.
- **FR-006**: Se o servidor não acordar no limite de espera, a pessoa MUST ver a mensagem de erro de conexão existente, sem ficar presa na espera.
- **FR-007**: A landing MUST mostrar "Entrar" para quem não tem sessão, e o login iniciado nela MUST terminar no calendário.
- **FR-008**: No jogo, o visitante MUST NOT ver nem ouvir "Progresso só neste aparelho", "Entrar para salvar na sua conta" nem "Seu progresso fica salvo só neste aparelho.".
- **FR-009**: O indicador de salvamento de quem tem conta MUST continuar igual.
- **FR-010**: A tela de espera existente das demais rotas e o aviso sob o botão de envio dos formulários de conta MUST permanecer como estão.
- **FR-011**: Os títulos "Horizontais" e "Verticais" fixos na lista de dicas MUST separar-se das dicas que rolam por baixo com um esmaecer em gradiente na cor de fundo do tema, sem ocupar espaço extra nem deslocar o layout.
- **FR-012**: No jogo no computador, "Tamanho padrão" MUST ser um botão de ícone com nome acessível e balão "Tamanho padrão", com o mesmo comportamento de hoje (indisponível no padrão, restaura o padrão, ausente no celular).
- **FR-013**: Na landing, o aviso no próprio botão ("Abrindo…" e o balão com a explicação após 2 s, feature 059) MUST sair: a tela de espera o substitui.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das larguras testadas, o cabeçalho da landing mostra 0 dos atalhos, 0 configurações e 0 "Menu".
- **SC-002**: Nas outras telas, "Estatísticas" e "x1" estão no grupo das configurações em 100% das larguras acima de 560 px.
- **SC-003**: Após clicar num botão de ícone com o mouse, 0 balões permanecem abertos quando o mouse sai; com Tab, o balão abre em todos os botões de ícone.
- **SC-004**: Com servidor dormindo, 100% dos cliques em botões da landing mostram a tela de espera e terminam no destino certo assim que o servidor responde.
- **SC-005**: A partir da landing, o login termina no calendário em 100% dos casos sem destino explícito.
- **SC-006**: Visitante no jogo vê 0 dos três textos removidos; o conteúdo da landing não se desloca entre HTML pré-gerado e página montada; sem violações de acessibilidade na verificação automática.
- **SC-007**: Em qualquer posição de rolagem, 0 linhas de dica aparecem nítidas e cortadas junto ao título fixo, nos dois temas.

## Assumptions

- O esmaecer é um gradiente curto sob o título, só visual, que não captura cliques (a dica sob ele continua clicável quando visível). Vale para a lista do computador e para a folha de dicas do celular.
- Os "dois botões" do item 2 são "Estatísticas" e "x1", e o pedido vale para as telas internas (na landing eles não aparecem, item 1). Se a intenção era outra, ajustar em `/speckit-clarify`.
- O item 1 do pedido novo acrescenta "configurações" à lista da landing; o botão "Menu" de celular sai junto, pois só reunia esses destinos.
- A correção do balão (somente foco de teclado) já está em andamento no código e entra nesta feature com teste de regressão.
- "Botão" na história 4 inclui links com aparência de botão que levam a outra rota (jogar agora, ver o calendário, entrar), sem exceção para "Entrar". Usa a espera pelo servidor já existente.
- "Entrar" no cabeçalho da landing já existe; o destino pós-login no calendário já é o padrão sem `next`. Falta apenas garantir por teste.
- Nenhuma mudança na API, nas rotas ou nos dados.

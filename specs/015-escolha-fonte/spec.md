# Feature Specification: Escolha da fonte mais visível

**Feature Branch**: `feat/015-escolha-fonte`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Implementar no frontend poder jogar a nova fontes de cruzada disponíveis. Criar mockup para mostrar como vai ficar."

## Clarifications

### Session 2026-10-19

- Q: Qual alternativa de layout do mockup? → A: A ("Hoje" com um cartão por fonte + abas de fonte sobre o calendário); B (só abas) e C (tela inicial de fontes) foram descartadas.
- Q: Até quantas fontes o layout da biblioteca (cartões de "Hoje" e abas) deve comportar sem redesenho? → A: Até 3 fontes; mais que isso exige rever o layout numa feature própria.

## Contexto

A feature 014 já permite jogar a Cruzada Online: no calendário, dois botões (O Globo e Cruzada Online) trocam a fonte, a escolha fica no aparelho e O Globo é o padrão. Na prática a segunda fonte passa despercebida: os botões parecem um filtro e não uma escolha de jogo, o botão "Jogar a de hoje" só abre a fonte que está selecionada, e quem entra não vê que há duas cruzadas novas por dia nem como está em cada uma.

Esta feature redesenha a escolha da fonte no site para que as fontes disponíveis apareçam como cruzadas para jogar. Ela muda só o site: a API já aceita a fonte nas rotas de puzzle e de biblioteca (feature 014) e não muda.

Mockup das alternativas: https://claude.ai/artifact/F4cAndr5GyavzEUiTdYb9B (A no computador e no celular, B, C e a tela de conclusão da história 3). A alternativa escolhida é a **A: "Hoje" com um cartão por fonte e abas de fonte sobre o calendário**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver e abrir a cruzada de hoje de cada fonte (Priority: P1)

Quem abre o site vê, no topo da biblioteca, uma seção "Hoje" com um cartão por fonte disponível. Cada cartão mostra o nome da fonte, a data, a situação do jogador nesse puzzle (não iniciado, em andamento com o tempo corrido, concluído com o tempo final) e uma ação principal ("Jogar", "Continuar" ou "Ver"). Um toque no cartão abre o jogo daquela fonte.

**Why this priority**: É o que faz a segunda fonte ser vista e jogada: hoje ela só aparece para quem troca o filtro. Entrega valor sozinha, mesmo sem mudar o resto do calendário.

**Independent Test**: Com as duas fontes guardadas para hoje, abrir a biblioteca e conferir que há dois cartões com as situações corretas e que cada um abre o puzzle da sua fonte.

**Acceptance Scenarios**:

1. **Given** as duas fontes têm a cruzada de hoje guardada e o jogador não começou nenhuma, **When** ele abre a biblioteca, **Then** vê dois cartões, "O Globo" e "Cruzada Online", ambos com a ação "Jogar".
2. **Given** o jogador está no meio da cruzada de hoje do O Globo e já concluiu a da Cruzada Online, **When** abre a biblioteca, **Then** o cartão do O Globo mostra "Em jogo" com o tempo corrido e a ação "Continuar", e o da Cruzada Online mostra "Concluída" com o tempo final e a ação "Ver".
3. **Given** a cruzada de hoje de uma fonte ainda não está guardada mas pode ser buscada, **When** o jogador toca no cartão dela, **Then** o site busca e abre o puzzle, com o mesmo tratamento de "fonte fora do ar" e "sem cruzada" do calendário.
4. **Given** um visitante sem conta, **When** abre a biblioteca, **Then** os cartões mostram a situação guardada no navegador dele, como o calendário já faz.
5. **Given** uma fonte não tem cruzada hoje (já se sabe que não há), **When** a biblioteca abre, **Then** o cartão dela diz "Sem cruzada hoje" e não tem ação de jogar; o outro cartão continua normal.

---

### User Story 2 - Trocar a fonte do calendário por abas (Priority: P2)

Abaixo de "Hoje", o calendário mensal tem abas com o nome de cada fonte. A aba ativa decide os dias e estados mostrados no mês, como o seletor atual. Cada aba diz, além do nome, quantas cruzadas o jogador concluiu no mês exibido, para mostrar que há progresso separado em cada fonte.

**Why this priority**: Melhora a clareza da troca de fonte, mas o calendário já funciona com o seletor atual.

**Independent Test**: Trocar de aba e conferir que o mês mostra os dias da fonte certa, que a aba ativa é anunciada para leitor de tela e que a escolha volta igual depois de recarregar.

**Acceptance Scenarios**:

1. **Given** o calendário na aba O Globo, **When** o jogador escolhe a aba Cruzada Online, **Then** o mês mostra os dias e estados da Cruzada Online, sem recarregar a página, e o mês exibido continua o mesmo.
2. **Given** o jogador escolheu a aba Cruzada Online, **When** volta ao site depois, no mesmo aparelho, **Then** a aba Cruzada Online continua escolhida.
3. **Given** um leitor de tela, **When** o foco chega às abas, **Then** ele ouve o nome de cada aba, qual está selecionada e a contagem de concluídas; as setas trocam de aba.
4. **Given** o jogador concluiu 3 cruzadas do O Globo em outubro e nenhuma da Cruzada Online, **When** vê outubro, **Then** as abas mostram "3 concluídas" e "0 concluídas" (ou texto equivalente).

---

### User Story 3 - Saber de qual fonte é o jogo aberto e trocar para a outra do mesmo dia (Priority: P3)

Na tela do jogo, o nome da fonte aparece junto da data no topo (não só na linha de atribuição) e, quando a outra fonte tem cruzada no mesmo dia, há, ao concluir o puzzle, um atalho para a cruzada da outra fonte desse dia.

**Why this priority**: Fecha o ciclo de descoberta: quem termina uma cruzada é levado à outra. É independente das histórias 1 e 2, mas tem menos impacto.

**Independent Test**: Concluir a cruzada de um dia em uma fonte e conferir que o diálogo de conclusão oferece a outra fonte do mesmo dia e que o atalho abre o puzzle certo.

**Acceptance Scenarios**:

1. **Given** o jogo do O Globo de 2026-10-18 aberto, **When** o jogador olha o topo da tela, **Then** vê "O Globo" junto da data.
2. **Given** o jogador concluiu a cruzada do O Globo de um dia e a Cruzada Online desse dia não está concluída, **When** o diálogo de conclusão aparece, **Then** há uma ação para jogar a cruzada da Cruzada Online desse dia (por exemplo "Jogar Cruzada Online deste dia"), que abre esse puzzle.
3. **Given** as duas fontes do dia já estão concluídas, **When** o diálogo de conclusão aparece, **Then** o atalho para a outra fonte não aparece.

---

### Edge Cases

- A biblioteca de uma fonte falha ao carregar e a da outra não: o cartão da fonte com erro mostra um aviso curto com "Tentar de novo"; o outro cartão e o calendário da fonte que carregou continuam usáveis.
- Fonte marcada como fora do ar (aviso de feature 014): o cartão dela mostra o aviso em vez da ação de buscar, mas uma cruzada já guardada continua jogável.
- Uma fonte nova no futuro: os cartões e as abas saem da lista de fontes disponíveis, sem texto fixo por fonte; com até 3 fontes o layout não muda. Uma quarta fonte exige rever o layout (fora desta feature).
- A fonte guardada como aba escolhida deixa de existir (retirada da lista): a biblioteca abre na primeira fonte da lista, sem erro.
- Celular estreito (360 px): os cartões ficam empilhados, as abas (até 3) cabem numa linha, dividindo a largura, e a página não rola para os lados.
- Site aberto contra uma API anterior à feature 014 (que ignora a fonte): o cartão e a aba da Cruzada Online não mostram dias do O Globo como se fossem dela, como o filtro atual já garante.
- Preferência de fonte já guardada no aparelho pela feature 014: continua valendo para a aba inicial.
- O dia vira (meia-noite em Brasília) com a página aberta: os cartões de "Hoje" passam a apontar para o novo dia na próxima vez que a biblioteca for aberta ou recarregada; não é preciso trocar ao vivo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A biblioteca MUST seguir a alternativa A do mockup: a seção "Hoje" com um cartão por fonte, seguida do calendário com abas de fonte.
- **FR-002**: A biblioteca MUST mostrar, antes do calendário, uma seção "Hoje" com um cartão por fonte disponível, na mesma ordem das abas, a da lista de fontes (hoje O Globo primeiro).
- **FR-003**: A seção "Hoje" MUST mostrar a data de hoje por extenso, e cada cartão MUST mostrar o nome da fonte e a situação do jogador nesse puzzle por texto (não só por cor): não iniciado, em andamento com o tempo corrido, concluído com o tempo final, ainda não guardado (buscável) ou sem cruzada.
- **FR-004**: O cartão inteiro MUST ser um único alvo de toque/clique que abre o jogo daquela fonte para hoje, com a ação escrita conforme a situação ("Jogar", "Continuar", "Ver"); um cartão sem cruzada MUST NOT ser clicável.
- **FR-005**: Abrir um cartão de puzzle ainda não guardado MUST usar o mesmo caminho de busca do calendário (inclusive os avisos de fonte fora do ar, sem cruzada e limite de pedidos).
- **FR-006**: O botão "Jogar a de hoje" atual MUST sair, já que os cartões o substituem.
- **FR-007**: O seletor de fonte do calendário MUST virar um conjunto de abas acessível (anuncia a aba selecionada, setas trocam de aba, um só ponto de parada do Tab) e cada aba MUST mostrar quantas cruzadas daquela fonte o jogador concluiu no mês exibido.
- **FR-008**: A aba escolhida MUST continuar sendo uma preferência do aparelho, lida da mesma chave da feature 014; sem escolha guardada, ou se a fonte guardada não estiver mais na lista, MUST valer a primeira fonte da lista (hoje O Globo). _Nota (feature 021): a aba deixou de ser preferência. O calendário abre na cruzada padrão das configurações (`defaultSource`, com a mesma volta à primeira fonte quando desconhecida), e trocar de aba vale só durante a visita._
- **FR-009**: Trocar de aba MUST manter o mês exibido e MUST NOT recarregar a página.
- **FR-010**: A tela do jogo MUST mostrar o nome da fonte junto da data no topo.
- **FR-011**: O diálogo de conclusão MUST oferecer abrir a cruzada da outra fonte do mesmo dia quando ela existir (guardada ou buscável) e não estiver concluída; com mais de duas fontes, MUST oferecer a primeira não concluída na ordem das fontes.
- **FR-012**: A situação mostrada nos cartões e nas contagens das abas MUST vir da mesma origem do calendário: o servidor para quem tem conta e o navegador para o visitante, sem misturar os dois.
- **FR-013**: Cartões, abas e o atalho de conclusão MUST ser montados a partir da lista de fontes disponíveis, sem texto ou regra fixa por fonte, para que uma terceira fonte apareça sem mudar estas telas.
- **FR-014**: A falha ao carregar os dados de uma fonte MUST afetar só o cartão e a aba dela, com uma forma de tentar de novo.
- **FR-015**: As telas MUST seguir os tokens de tema (claro e escuro) e funcionar a partir de 360 px de largura sem rolagem horizontal da página.
- **FR-016**: O layout MUST comportar de 1 a 3 fontes: no computador, os cartões de "Hoje" ficam lado a lado numa linha e as abas numa linha; no celular, os cartões empilham e as abas dividem a largura numa linha, sem rolagem horizontal.

### Key Entities

- **Fonte disponível**: uma origem de cruzadas que o site conhece (hoje O Globo e Cruzada Online), com nome de exibição e ordem.
- **Cartão de hoje**: a cruzada de hoje de uma fonte, com a situação do jogador (estado, tempos) e o destino ao tocar (jogo guardado ou busca do dia).
- **Resumo do mês por fonte**: quantas cruzadas daquela fonte o jogador concluiu no mês exibido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A partir da biblioteca, o jogador abre a cruzada de hoje de qualquer fonte com um único toque, sem trocar filtro antes.
- **SC-002**: Na primeira tela da biblioteca, sem rolar, aparecem todas as fontes disponíveis e a situação de hoje em cada uma, em 360 px e em 1280 px de largura.
- **SC-003**: Em teste de uso informal com 5 pessoas que nunca viram o site, pelo menos 4 percebem que há duas cruzadas diferentes por dia sem explicação.
- **SC-004**: Teste automático de acessibilidade sem violações na biblioteca e na tela do jogo; o contraste das cores novas é verificado nos dois temas pelo teste de tokens; navegação completa pelas abas e cartões só com teclado.
- **SC-005**: A biblioteca não fica mais lenta: os dados da seção "Hoje" e do calendário são pedidos ao mesmo tempo, em paralelo, sem espera extra em relação ao carregamento de hoje, com a API acordada.
- **SC-006**: Nenhuma mudança na API; o site novo funciona contra a API em produção (que já aceita a fonte, feature 014) e continua lidando corretamente com uma API anterior à feature 014, que ignora a fonte.

## Assumptions

- A API não muda: o site pede a biblioteca por fonte (uma vez por fonte disponível) e já recebe estado e tempos por item (features 009, 013 e 014).
- "Hoje" é o dia em Brasília, a mesma regra do calendário.
- O tamanho do tabuleiro ou a autoria não aparecem no cartão, porque a biblioteca não traz esses dados e trazê-los mudaria a API.
- A escolha da aba continua só no aparelho, como tema e tamanhos; não vira dado da conta.
- Estilo segue `docs/design.md` e os tokens existentes; nenhuma identidade visual (logo ou cor de marca) das fontes é usada, só o nome, para não imitar os jornais.
- Fora do escopo: ranking ou estatísticas entre fontes, notificações, ordem de fontes escolhida pelo jogador, novas fontes.

# Feature Specification: Design system aplicado ao site

**Feature Branch**: `feat/062-design-system`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Aplicar o design system no site (feature 062). Brief em `specs/062-design-system/brief.md`; contrato visual em `specs/062-design-system/design-system.html`. Só web, cinco fatias (tokens, componentes de base, cabeçalho, calendário, demais telas) mais arrastar para ordenar na Administração."

## Contrato visual e limites

O contrato visual é `design-system.html` (abas Fundamentos, Componentes e Telas, em claro e escuro, com seletor de largura). Esta feature traz esse estilo para as telas do site fora da landing e fora do tabuleiro. Nenhum valor de cor novo além do token `--edge` (o `--focus` já existe). Valores exatos de sombra, contorno, tamanho e tempo são os do artefato; em divergência com este texto vale o artefato, e a diferença é registrada em `research.md`. Sem mudança de API, de schema ou de contrato.

Ficam como estão, por regra: a landing `/` (feature 050), o tabuleiro e tudo que é parte dele (células, barra de dica, lista de dicas, teclado na tela, impressão); o diálogo de conclusão e o de compartilhar usam o estilo novo, como no artefato (decisão posterior à primeira versão). O que está ao redor do tabuleiro usa os componentes novos.

Cada fatia (histórias 1 a 5, e a 6 que depende da 5) é entregue num PR próprio, nesta ordem.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tokens de contorno e foco nos dois temas (Priority: P1)

Quem usa o site vê o mesmo contorno escuro nos controles e um anel de foco claro em qualquer tela, no tema claro e no escuro. O token `--edge` (contorno) passa a existir, derivado de `--ink`, o `--focus` (já existente, derivado de `--accent`) é conferido, e as camadas `--hover-overlay` e `--press-overlay` estão conferidas nos dois temas.

**Why this priority**: Todas as outras fatias usam esses tokens; sem eles nada mais pode ser alinhado.

**Independent Test**: Abrir qualquer tela nos dois temas e conferir que os tokens existem com valor definido e que o contraste de contorno e de foco contra o fundo atinge o mínimo de acessibilidade.

**Acceptance Scenarios**:

1. **Given** o tema claro ou o escuro, **When** o site carrega, **Then** `--edge` e `--focus` têm valor definido, `--edge` derivado de `--ink` e `--focus` de `--accent`.
2. **Given** um controle com foco de teclado, **When** o foco chega nele, **Then** o anel `--focus` é visível com contraste suficiente contra o fundo nos dois temas.
3. **Given** a escala de tipografia, os raios (6, 10, 16) e `--tap: 44px`, **When** conferidos contra o artefato, **Then** o que faltar é alinhado e o que já existe não muda de valor.

---

### User Story 2 - Componentes de base consistentes (Priority: P1)

Botões, links, dicas flutuantes, avisos, diálogos e menus parecem e se comportam igual em todo o site, como no artefato.

**Why this priority**: As telas das fatias seguintes são feitas só com estes componentes.

**Independent Test**: Para cada componente, conferir no site local, nos dois temas e em 390 px, 768 px e computador, que o visual e o comportamento batem com a aba Componentes.

**Acceptance Scenarios**:

1. **Given** qualquer `Button` (4 variantes, `small`, `block`, `pending`), **When** o mouse passa ou a pessoa clica, **Then** só a camada de hover/press muda; não há sombra nem movimento.
2. **Given** um `Link` em repouso, **When** é exibido, **Then** está em negrito; **When** o mouse passa (dispositivo com hover), **Then** um sublinhado amarelo de 3 px corre da esquerda para a direita em 280 ms, e no clique fica com 5 px.
3. **Given** movimento reduzido ligado, ou um dispositivo sem hover, **When** a pessoa interage com um `Link`, **Then** não há animação de movimento.
4. **Given** um botão só de ícone, **When** recebe mouse ou foco, **Then** a dica única (`Tooltip`) mostra o nome dele, com sombra suave; o mesmo componente mostra o aviso de espera.
5. **Given** um `Notice` de qualquer variante, **When** exibido, **Then** o estado aparece por texto ou símbolo e borda, nunca só por cor.
6. **Given** um `Dialog` aberto, **When** exibido, **Then** está centralizado e tem botão de fechar em ícone no canto superior direito com área de toque de `--tap`.
7. **Given** um `Menu`, **When** aberto sem o teclado na tela, **Then** é um popover; **When** aberto com o teclado na tela, **Then** é uma folha embaixo com itens de 48 px, como já é hoje, e o contorno e o hover seguem o artefato.
8. **Given** um texto de link em qualquer tela alterada, **When** exibido, **Then** usa o componente `Link`.

---

### User Story 3 - Cabeçalho com conta e menu no celular (Priority: P2)

Logada, a pessoa vê um círculo de 38 px com as iniciais do e-mail que leva a "Sua conta"; a ação Sair fica dentro de "Sua conta". O botão de configurações tem 44 px. Em até 560 px os links viram um botão de menu que abre uma folha embaixo.

**Why this priority**: O cabeçalho aparece em quase toda tela, mas depende dos componentes de base.

**Independent Test**: Entrar, conferir círculo, Sair em "Sua conta", botão de configurações, e redimensionar até 560 px para conferir o botão de menu e a folha.

**Acceptance Scenarios**:

1. **Given** uma conta logada, **When** o cabeçalho é exibido, **Then** há um círculo de 38 px com as iniciais do e-mail e ele leva a "Sua conta".
2. **Given** o cabeçalho, **When** conferido, **Then** não há botão Sair solto; Sair está em "Sua conta".
3. **Given** o botão de configurações, **When** exibido, **Then** tem 44 px.
4. **Given** largura de até 560 px, **When** o cabeçalho é exibido, **Then** os links são trocados por um botão de menu que abre uma folha embaixo com os mesmos destinos.
5. **Given** um visitante (sem conta), **When** o cabeçalho é exibido, **Then** não há círculo de iniciais e o acesso a entrar continua disponível.

---

### User Story 4 - Calendário compacto no celular (Priority: P2)

No calendário, as abas de fonte ficam numa linha só que rola para o lado no celular, sem barra, com a última aba cortada como sinal de que há mais; o botão de data fica fixo à direita. Abaixo de 480 px as células mostram só "✓" e "◐" no lugar do texto de estado, e a legenda usa os mesmos símbolos.

**Why this priority**: Melhora o uso no celular, mas só depois dos componentes.

**Independent Test**: Abrir o calendário em 390 px e em computador, rolar as abas, conferir símbolos nas células e na legenda, e conferir o `aria-label` por extenso.

**Acceptance Scenarios**:

1. **Given** mais abas do que cabem na largura, **When** a pessoa rola a linha de abas, **Then** ela rola de lado sem barra visível, a última aba aparece cortada, e o botão de data não sai da direita.
2. **Given** o calendário com menos de 480 px de largura disponível, **When** uma célula tem estado concluído ou em andamento, **Then** mostra "✓" ou "◐" em vez do texto.
3. **Given** qualquer largura, **When** um leitor de tela lê uma célula, **Then** o `aria-label` traz o estado por extenso.
4. **Given** o calendário com menos de 480 px de largura disponível, **When** a legenda é exibida, **Then** usa os mesmos símbolos das células.
5. **Given** o calendário, **When** conferido, **Then** não há seção "Hoje" (já removida na feature 061).

---

### User Story 5 - Demais telas no mesmo estilo (Priority: P2)

Sua conta (com ícone de sair no botão Sair), Estatísticas, todas as telas do x1, Administração, erro, espera e status seguem o artefato, usando os componentes novos.

**Why this priority**: Fecha a aplicação do design system, mas é a maior fatia e não bloqueia as anteriores.

**Independent Test**: Para cada tela, conferir contra a aba Telas do artefato, nos dois temas e em 390, 768 e computador.

**Acceptance Scenarios**:

1. **Given** cada tela listada, **When** aberta no site local, **Then** o visual corresponde ao artefato, sem valor de cor fora dos tokens.
2. **Given** "Sua conta", **When** exibida, **Then** o botão Sair tem o ícone de sair.
3. **Given** qualquer uma dessas telas, **When** a pessoa usa só o teclado, **Then** todo controle é alcançável e mostra o anel de foco.
4. **Given** a tela de Administração, **When** exibida, **Then** o texto não menciona mais os cartões de "Hoje".

---

### User Story 6 - Ordenar fontes arrastando, na Administração (Priority: P3)

Quem administra as fontes ordena arrastando uma alça de seis pontos de 44 px, em vez das setas de subir e descer. Existe uma alternativa sem arrastar pelo teclado.

**Why this priority**: Melhora um fluxo só de administração, com risco próprio (toque e acessibilidade).

**Independent Test**: Reordenar uma fonte com mouse, com toque e só com teclado, salvar e conferir a ordem pública.

**Acceptance Scenarios**:

1. **Given** a lista de fontes, **When** a pessoa arrasta pela alça com mouse ou toque, **Then** a linha levantada mostra contorno escuro e sombra suave, uma faixa amarela de 4 px marca o destino, e soltar muda a ordem.
2. **Given** a lista, **When** a pessoa arrasta por fora da alça, **Then** nada é arrastado.
3. **Given** o foco na alça, **When** a pessoa aperta Espaço, **Then** a linha é pega; as setas movem; Espaço solta; Esc cancela e devolve a posição original.
4. **Given** um leitor de tela, **When** a linha é pega e movida, **Then** a nova posição é anunciada; o `aria-label` da alça é curto (por exemplo "Arrastar O Globo") e as instruções estão num texto fixo ligado à alça.
5. **Given** uma tela de toque, **When** a pessoa arrasta pela alça, **Then** a página não rola durante o arraste, e fora da alça rola normalmente.
6. **Given** uma ordem salva, **When** a pessoa recarrega, **Then** a ordem e as regras da feature 060 (ao menos uma visível, sem mudança não grava) seguem iguais.

---

### Edge Cases

- E-mail com um só caractere antes do arroba, ou com caracteres fora do alfabeto: o círculo ainda mostra iniciais legíveis (nunca vazio).
- Largura exatamente 560 px e 480 px: valem as regras "até 560" (janela) e "abaixo de 480" (largura disponível do calendário) como escritas.
- Movimento reduzido e dispositivos sem hover: sem animação de movimento em nenhum componente novo.
- Arraste cancelado por perda de foco, mudança de aba ou toque interrompido: a lista volta à ordem original.
- Lista de fontes com uma só fonte: a alça existe mas não há destino; teclado não quebra.
- Tema escuro: contornos, foco e faixa de destino mantêm contraste.
- Texto longo em português (rótulos, avisos): não quebra o layout nem desloca o conteúdo enquanto a pessoa digita ou espera.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O site MUST ter `--edge` (derivado de `--ink`) e `--focus` (derivado de `--accent`) nos dois temas, sem outro valor de cor novo.
- **FR-002**: `--hover-overlay` e `--press-overlay` MUST estar conferidos nos dois temas; botões MUST usar só essa camada para hover e clique, sem sombra e sem movimento.
- **FR-003**: `Button` MUST ter as variantes `primary`, `secondary`, `quiet` e `icon`, `small`, `block` e `pending`, como no artefato.
- **FR-004**: O site MUST ter um componente `Link` em negrito em repouso, com sublinhado amarelo de 3 px que corre da esquerda para a direita em 280 ms no mouse e 5 px no clique, só com `(hover: hover)` e sem animação com movimento reduzido; os textos de link das telas alteradas MUST usá-lo (a landing não).
- **FR-005**: O site MUST ter uma única dica flutuante para nome de botão de ícone e aviso de espera, com sombra suave, que fica dentro da janela.
- **FR-006**: `Notice` MUST indicar o estado por texto ou símbolo e borda, nunca só por cor.
- **FR-007**: `Dialog` MUST ser centralizado, com botão de fechar em ícone no canto superior direito de tamanho `--tap`.
- **FR-008**: O cabeçalho MUST mostrar, para conta logada, um círculo de 38 px com as iniciais do e-mail que leva a "Sua conta", e MUST ter Sair dentro de "Sua conta".
- **FR-009**: O botão de configurações MUST ter 44 px.
- **FR-010**: Até 560 px, os links do cabeçalho MUST virar um botão de menu que abre uma folha embaixo.
- **FR-011**: As abas de fonte do calendário MUST ficar numa linha só, rolável de lado sem barra visível, com a última aba cortada como sinal e o botão de data fixo à direita.
- **FR-012**: Com menos de 480 px de largura disponível para o calendário, as células do calendário MUST mostrar "✓" e "◐" no lugar do texto de estado, mantendo o `aria-label` por extenso, e a legenda MUST usar os mesmos símbolos.
- **FR-013**: Sua conta (com ícone de sair no botão Sair), as telas de entrada, cadastro, recuperação e confirmação de e-mail, Estatísticas, todas as telas do x1, Administração, configurações, importação do progresso, erro, espera, sem conexão, não encontrada e status MUST usar os componentes novos e corresponder ao artefato.
- **FR-014**: O texto da Administração MUST deixar de citar os cartões de "Hoje".
- **FR-015**: A ordenação da Administração MUST ser feita por uma alça de arrastar de seis pontos e 44 px, que substitui as setas; o arraste MUST começar só pela alça e MUST funcionar com mouse e com toque.
- **FR-016**: A ordenação MUST ter alternativa sem arrastar: a alça é focável; Espaço pega, setas movem, Espaço solta, Esc cancela; a posição é anunciada a leitores de tela; `aria-label` curto e instruções num texto fixo associado.
- **FR-017**: A linha levantada MUST ter contorno escuro e sombra suave, e o destino MUST ter faixa amarela de 4 px.
- **FR-018**: Toda mudança MUST valer nos dois temas e em 390 px, 768 px e computador, e o estado MUST nunca depender só de cor.
- **FR-019**: A landing e o tabuleiro (e seus elementos listados em "Contrato visual e limites") MUST ficar sem alteração visual ou de comportamento.
- **FR-020**: Nenhuma rota, esquema, contrato de API ou regra de dados MUST mudar; o site novo MUST continuar funcionando com a API atual.

### Key Entities

- Não envolve dados novos. A ordem das fontes e a visibilidade continuam as da feature 060.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das telas listadas na aba Telas do artefato foram conferidas contra o site local, nos dois temas e em 390 px, 768 px e computador, sem divergência aberta.
- **SC-002**: Nenhuma tela do site fora da landing e do tabuleiro usa valor de cor, raio ou tamanho de toque fora dos tokens do design system.
- **SC-003**: Todo controle interativo novo ou alterado tem área de toque de pelo menos 44 px e mostra o foco por teclado.
- **SC-004**: Uma pessoa consegue mover uma fonte de uma ponta da lista à outra e salvar usando só o teclado, sem arrastar, em no máximo N+2 teclas (N = número de fontes), verificado por teste automatizado.
- **SC-005**: Uma pessoa consegue reordenar as fontes por toque num celular sem que a página role durante o arraste.
- **SC-006**: Nenhuma verificação automática de acessibilidade das telas alteradas aponta erro de contraste ou de nome acessível, nos dois temas.
- **SC-007**: A landing e o tabuleiro não têm diferença visual nem de comportamento antes e depois, e as verificações já existentes deles continuam passando.
- **SC-008**: Nenhuma mudança de layout acontece ao digitar ou ao esperar nas telas alteradas (medida pelas verificações de "sem saltos" já existentes).

## Assumptions

- A ordenação por arraste usa uma biblioteca de arrastar e soltar (`@dnd-kit`), aprovada pela pessoa responsável; o contrato de comportamento (alça, teclado, anúncios, toque) é o das histórias e requisitos, não o da biblioteca.
- O `Notice` com a variante `ok` (mostrada no artefato) entra, com símbolo e texto além da cor (decidido em `research.md`, D2).
- Os degraus de espaçamento (4, 8, 12, 16, 24, 40) e os pontos de quebra dos Fundamentos do artefato foram inferidos; o plano os confere com o código e ajusta o artefato ou o código, nunca os dois sem registro.
- O artefato nunca foi conferido renderizado com login; a conferência tela a tela contra o site local faz parte desta feature.
- A feature 061 já removeu a seção "Hoje" do calendário; esta feature não a recoloca.
- Só `apps/web` muda; `packages/shared` e `apps/api` não são alterados.
- Cada fatia é um PR separado, mergeável sozinho, na ordem descrita, e cada uma deixa o site funcional.

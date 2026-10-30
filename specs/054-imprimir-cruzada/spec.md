# Feature Specification: Imprimir a cruzada

**Feature Branch**: `feat/054-imprimir-cruzada`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: https://github.com/BrunoYTanaka/cruzadinha/issues/104 — "Folha de impressão com a grade e as dicas, sem a solução, usando CSS de impressão. Decidir se exporta também em PDF direto." (origem: #90)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Imprimir a cruzada em branco (Priority: P1)

Na tela do jogo, a pessoa toca em "Imprimir". O navegador abre a janela de impressão com uma folha limpa: título com fonte e data, a grade vazia e as dicas na horizontal e na vertical. A folha não mostra letras da solução, nem as que a pessoa já digitou, nem botões, barras ou diálogos. Ela imprime e resolve a lápis, no papel.

**Why this priority**: É o pedido todo. Funciona sozinho, sem conta e sem rede (com a cruzada já aberta).

**Independent Test**: Abrir uma cruzada, tocar em "Imprimir" e conferir a pré-visualização: grade vazia, numeração, dicas e atribuição, sem letras e sem controles do site.

**Acceptance Scenarios**:

1. **Given** uma cruzada aberta, **When** a pessoa toca em "Imprimir", **Then** a janela de impressão do navegador abre com a folha da cruzada.
2. **Given** a folha de impressão, **When** a pessoa a vê, **Then** ela traz o nome da fonte, a data, a grade com a numeração das casas e as dicas separadas em horizontais e verticais, cada uma com seu número e tamanho.
3. **Given** uma cruzada em que a pessoa já digitou letras, usou ajudas ou marcou erros, **When** a folha é impressa, **Then** a grade sai vazia, sem letras, rascunhos nem marcas de erro.
4. **Given** qualquer cruzada, **When** a folha é impressa, **Then** nenhuma letra da solução aparece, nem em texto escondido ou legível por leitor de tela na impressão.
5. **Given** a folha de impressão, **When** a pessoa a vê, **Then** não aparecem cabeçalho do site, barra de ferramentas, teclado na tela, relógio, diálogos nem avisos.
6. **Given** um visitante sem conta, **When** toca em "Imprimir", **Then** recebe a mesma folha de quem tem conta.

---

### User Story 2 - Folha legível em papel (Priority: P1)

A folha cabe em papel A4 e carta na vertical, em preto e branco, sem depender do tema claro ou escuro do site nem de cores de fundo (que muitos navegadores não imprimem). As casas têm tamanho suficiente para escrever à mão, e as dicas não são cortadas no meio nem saem da página.

**Why this priority**: Uma folha que sai cortada, cinza ou com tinta demais não serve; faz parte de entregar a impressão.

**Independent Test**: Imprimir (ou pré-visualizar) cruzadas de tamanhos diferentes, no tema claro e no escuro, em A4 e carta, e conferir que tudo cabe e é legível em preto e branco.

**Acceptance Scenarios**:

1. **Given** o site no tema escuro, **When** a pessoa imprime, **Then** a folha sai com fundo branco e texto preto, igual à do tema claro.
2. **Given** uma cruzada grande e outra pequena, **When** impressas em A4 ou carta, **Then** a grade inteira cabe na largura da página, com casas grandes o bastante para uma letra à mão.
3. **Given** uma lista longa de dicas, **When** a folha é impressa, **Then** as dicas continuam em colunas ou em outra página sem cortar uma dica ao meio.
4. **Given** impressão sem cores de fundo, **When** a folha sai, **Then** as casas pretas (bloqueios) continuam distinguíveis das casas de escrever.

---

### User Story 3 - Salvar como PDF pelo navegador (Priority: P3)

Quem prefere um arquivo escolhe "Salvar como PDF" na própria janela de impressão do navegador. O site não gera nem baixa PDF por conta própria: a mesma folha serve para papel e para PDF.

**Why this priority**: Responde à dúvida da issue ("decidir se exporta também em PDF direto") sem código a mais; o ganho é só de documentação.

**Independent Test**: Tocar em "Imprimir" e escolher "Salvar como PDF"; o arquivo traz a mesma folha da User Story 1.

**Acceptance Scenarios**:

1. **Given** a janela de impressão aberta, **When** a pessoa escolhe salvar como PDF, **Then** o arquivo contém a mesma folha, sem solução.

---

### Edge Cases

- Cruzada ainda carregando ou com erro de carregamento: não há botão "Imprimir" (nada a imprimir).
- Cruzada já concluída: a folha continua em branco, sem letras e sem o resultado do jogo.
- Navegador no celular sem impressão: o botão abre o que o navegador oferece; se o navegador não imprime, nada quebra no jogo.
- Pessoa aperta Ctrl+P (ou Cmd+P) direto, sem o botão: sai a mesma folha limpa, não a tela do jogo.
- Navegador sem `window.print` ou que o recusa: o botão não quebra o jogo (sem erro não tratado).
- Janela de impressão cancelada: o jogo volta como estava, com cursor, relógio e progresso intactos.
- Relógio: a impressão não conta como pausa nem altera o tempo, o progresso salvo ou as ajudas usadas.
- Dica longa em cruzada pequena e dica curta em cruzada grande: o layout se ajusta sem cortar texto.
- Letras acentuadas e caracteres especiais nas dicas saem corretos.
- Cruzada aberta sem rede a partir da cópia guardada: imprime igual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela do jogo MUST oferecer um botão "Imprimir" quando a cruzada está carregada, e MUST NOT mostrá-lo antes disso nem em erro de carregamento.
- **FR-002**: Ao acioná-lo, o site MUST abrir a janela de impressão do navegador com a folha da cruzada.
- **FR-003**: A folha MUST conter o nome da fonte, a linha de atribuição da fonte, a data completa da cruzada (dia, mês e ano), a grade com a numeração das casas e as dicas horizontais e verticais, cada uma com número e tamanho.
- **FR-004**: A folha MUST NOT conter nenhuma letra da solução, nenhuma letra digitada, rascunho, marca de erro ou ajuda usada, em nenhuma forma (inclusive texto oculto).
- **FR-005**: A folha MUST NOT conter elementos do site que não sejam a cruzada: cabeçalho, barra de ferramentas, teclado na tela, relógio, diálogos, avisos e botões.
- **FR-006**: Com a cruzada carregada, a mesma folha MUST sair ao imprimir por atalho do navegador (Ctrl/Cmd+P) ou menu, sem usar o botão.
- **FR-007**: A folha MUST ter fundo branco e texto preto independentemente do tema do site, e os bloqueios MUST ser distinguíveis mesmo sem impressão de cores de fundo.
- **FR-008**: A grade e as dicas MUST caber em A4 e carta na vertical, com casas grandes o bastante para escrever à mão; uma dica MUST NOT ser cortada entre páginas ou colunas.
- **FR-009**: Imprimir MUST NOT alterar o jogo: progresso, relógio, ajudas, rascunho, seleção e configurações ficam como estavam antes e depois da janela de impressão.
- **FR-010**: O botão MUST ser acessível por teclado e leitor de tela, com nome claro, e seguir o padrão visual dos demais botões da barra do jogo; não pode deslocar o layout da tela ao aparecer (regra do projeto).
- **FR-011**: O site MUST NOT gerar, baixar, guardar ou enviar arquivo (PDF, imagem ou outro), link ou endpoint com a cruzada; o PDF é opção da janela de impressão do navegador.
- **FR-012**: Nada da impressão MUST sair do aparelho: sem pedido à API, sem conta exigida, sem registro novo guardado.
- **FR-013**: Os atalhos de teclado do jogo MUST continuar a valer; esta feature não cria atalho próprio (Ctrl/Cmd+P é do navegador) e imprimir não pode digitar nem mover nada no tabuleiro.

### Key Entities

- **Folha de impressão**: visão só de leitura da cruzada aberta, formada por título (fonte e data), grade vazia numerada e listas de dicas. Deriva apenas da parte pública da cruzada; não tem acesso à solução nem ao estado do jogo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das cruzadas de teste (tamanhos pequeno e grande, com letras já digitadas e com a cruzada concluída), a folha impressa tem zero letras de solução ou digitadas.
- **SC-002**: A pessoa chega à janela de impressão com no máximo 1 toque ou clique a partir da tela do jogo.
- **SC-003**: Em A4 e carta, 100% das cruzadas testadas cabem sem corte da grade e sem dica partida entre páginas.
- **SC-004**: A folha é igual (grade e dicas) nos temas claro e escuro, e legível em preto e branco.
- **SC-005**: Antes e depois de imprimir ou cancelar, tempo, progresso e ajudas ficam idênticos em 100% dos testes.

## Assumptions

- **Decisão da issue**: não haverá exportação direta de PDF. A impressão do navegador cobre papel e "Salvar como PDF", sem biblioteca nova e sem arquivo gerado pelo site.
- **Constituição VIII**: o princípio proíbe redistribuir o conteúdo fora do site por "exportação". Imprimir leva a cruzada para fora do site, então a feature depende de uma emenda explícita à constituição (como a 5.0.0 fez para a landing) que permita a impressão para uso pessoal, com atribuição da fonte e sem arquivo, link ou endpoint gerado pelo site. A emenda é a primeira tarefa e bloqueia o resto.
- A folha usa apenas a parte pública da cruzada (grade, numeração, dicas), nunca a solução, o que também vale se a impressão for feita com a cruzada já resolvida.
- Fica fora do escopo: imprimir com a solução, imprimir o progresso atual, escolher tamanho de papel ou de letra pelo site, imprimir várias cruzadas de uma vez, impressão a partir do calendário.
- O botão aparece em todos os modos da tela do jogo que mostram a cruzada, com ou sem teclado na tela; local exato na barra fica para o plano.
- Todo texto visível ao usuário em português do Brasil.

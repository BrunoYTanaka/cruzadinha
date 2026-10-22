# Feature Specification: Ajustes de layout e animação nas configurações e no botão de tema

**Feature Branch**: `feat/024-ajustes-seletor-tema`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Issue #40 (https://github.com/BrunoYTanaka/cruzadinha/issues/40) — Ajustes de layout, responsividade e animação no seletor de cruzadas e botão de tema. Cinco problemas: (1) o seletor da cruzada padrão está com o visual desalinhado e quebrado em algumas telas; (2) em telas maiores a opção "Sem limite" deve ficar alinhada à direita; (3) a troca da cruzada padrão deve ter uma animação suave; (4) o botão de tema encolhe ao trocar de automático para claro, e deve manter o mesmo tamanho nos três estados; (5) com o projeto "acordando", o texto do tooltip do botão de configurações, à direita do cabeçalho, fica cortado para fora da tela e precisa ser legível."

## Contexto

A modal de configurações (feature 021) tem o seletor "Cruzada padrão", um grupo de botões lado a lado, um por fonte de cruzadas. Também tem, para cada ajuda (letras e palavras), uma linha com os passos − e +, o valor e a opção "Sem limite". O cabeçalho do site tem a engrenagem das configurações (com um balão de texto ao passar o mouse ou focar). Dentro da modal, a linha "Tema" tem o botão de tema, que alterna entre automático, claro e escuro, e a linha "Sem limite" de cada ajuda é uma caixa de seleção que hoje fica abaixo dos passos − e +. Mais abaixo ficam os interruptores ("Riscar a dica só quando acerta", "Ir direto ao jogo"), o seletor "Cruzada padrão" e o botão "Restaurar padrões".

A issue lista cinco defeitos visuais nesses controles. Todos são só de aparência: a API, os dados salvos e o comportamento das configurações não mudam. Os três botões de tema, o seletor e a opção "Sem limite" continuam fazendo o que fazem hoje.

Os cinco pontos:

1. O layout da modal fica desalinhado ou quebrado em algumas larguras de tela. As setas da imagem da issue apontam para os interruptores à direita (o de "Riscar a dica" e o de "Ir direto ao jogo", que não parecem ter o mesmo tamanho e cor de acabamento) e o botão "Restaurar padrões" aparece recuado em relação às demais linhas. O seletor da cruzada padrão entra na revisão pelo mesmo motivo.
2. Em telas maiores, "Sem limite" fica sozinha numa linha abaixo dos passos, na esquerda; deve ficar na mesma linha, no canto direito.
3. Ao escolher outra cruzada padrão, a marca de "selecionada" pula de um botão para o outro sem transição.
4. O botão de tema da modal muda de largura conforme o texto do estado atual (Automático é bem mais largo que Claro e Escuro), e a linha "Tema" dá um salto visual a cada clique.
5. O balão da engrenagem é centralizado sobre ela, que fica rente à borda direita da tela. Parte do texto sai da janela e não dá para lê-lo. A issue relata o defeito com o site "acordando". Causa confirmada por medição: com a API acordando, a sessão demora a responder e o cabeçalho mostra só a engrenagem, rente à borda direita (sem "Visitante" nem "Entrar" ao lado), e o balão passa da janela (em 360 px, de 270 a 374 px). Com a sessão já carregada, a engrenagem fica longe da borda e o balão cabe. A correção vale para qualquer posição.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ler o balão da engrenagem por inteiro (Priority: P1)

Quem passa o mouse sobre a engrenagem das configurações, ou chega nela com o teclado, lê o texto do balão por completo, mesmo com a engrenagem junto à borda direita da janela, em tela larga ou estreita e também enquanto o site mostra "Acordando o servidor".

**Why this priority**: É o único defeito que impede ler algo; os demais são de acabamento. Sem o texto, a pessoa não sabe o que o botão faz.

**Independent Test**: Abrir o site (com a API respondendo e com a tela de "Acordando o servidor"), focar a engrenagem e verificar que a caixa do balão fica inteira dentro da janela, em larguras de 320 px a 1920 px.

**Acceptance Scenarios**:

1. **Given** o site aberto em qualquer largura de janela, **When** a pessoa passa o mouse parado sobre a engrenagem, **Then** o balão aparece com o texto completo e nenhuma parte dele fica fora da janela.
2. **Given** o site em estado "Acordando o servidor", **When** a pessoa foca a engrenagem com o teclado, **Then** o balão aparece inteiro dentro da janela.
3. **Given** o balão aberto, **When** a pessoa aperta Esc ou tira o mouse e o foco, **Then** o balão fecha como hoje.
4. **Given** qualquer outro botão de ícone com balão, **When** o balão abre, **Then** continua inteiro dentro da janela e no mesmo lugar de antes quando já cabia.

---

### User Story 2 - Botão de tema com o mesmo tamanho nos três estados (Priority: P1)

Quem clica no botão de tema para alternar entre automático, claro e escuro vê o botão com largura e altura idênticas nos três estados, e nada em volta dele se mexe.

**Why this priority**: O salto acontece a cada uso do botão, em todas as telas, e é um salto visível na própria modal.

**Independent Test**: Medir a caixa do botão e a posição dos vizinhos na linha "Tema" da modal nos três estados e nas larguras de desktop e de celular, nos dois temas.

**Acceptance Scenarios**:

1. **Given** o botão de tema em "automático", **When** a pessoa clica e ele passa a "claro", **Then** a largura e a altura do botão são iguais às de antes, e os itens vizinhos na linha "Tema" não mudam de posição.
2. **Given** o botão em "claro", **When** a pessoa clica e ele passa a "escuro", **Then** o tamanho continua igual, e igual de novo ao voltar a "automático".
3. **Given** a animação do ícone do botão (feature 021), **When** o estado muda, **Then** ela segue acontecendo como hoje e não altera o tamanho do botão em nenhum quadro.
4. **Given** um leitor de tela, **When** o estado muda, **Then** o nome acessível do botão continua dizendo o estado atual.

---

### User Story 3 - Modal alinhada em qualquer tela (Priority: P2)

Quem abre as configurações vê os interruptores, o botão "Restaurar padrões" e o seletor da cruzada padrão alinhados com as demais linhas da modal, com o mesmo tamanho e cor de acabamento entre interruptores, e os botões das fontes alinhados, com o mesmo tamanho e sem quebra visual, em qualquer largura de janela, com uma, duas ou três fontes.

**Why this priority**: Corrige um visual quebrado em algumas telas, mas não impede o uso.

**Independent Test**: Abrir a modal em larguras de 320 px a 1920 px, nos dois temas, e verificar que os interruptores têm o mesmo tamanho e a mesma borda direita, "Restaurar padrões" está alinhado e os botões do seletor ficam alinhados, com alturas iguais e sem texto cortado ou sobreposto.

**Acceptance Scenarios**:

1. **Given** a modal de configurações em qualquer largura, **When** a pessoa olha os interruptores ("Riscar a dica só quando acerta" e "Ir direto ao jogo"), **Then** os dois têm o mesmo tamanho e o mesmo acabamento, e a borda direita de ambos coincide com a borda direita da área de conteúdo da modal.
2. **Given** a modal de configurações em qualquer largura, **When** a pessoa olha o botão "Restaurar padrões", **Then** o texto dele começa na mesma margem esquerda das demais linhas, sem recuo. *(Substituído pela feature 025: a caixa visível do botão fica na margem.)*
3. **Given** a modal de configurações em uma janela larga, **When** a pessoa olha o seletor, **Then** os botões ficam lado a lado, com a mesma altura e a mesma largura, alinhados com as demais linhas da modal.
4. **Given** a modal em um celular estreito (360 px), **When** a pessoa olha o seletor, **Then** os nomes das fontes aparecem inteiros, sem cortar, sobrepor nem estourar a modal, e a modal não ganha rolagem lateral.
5. **Given** uma fonte com nome longo, **When** o seletor é mostrado, **Then** o nome quebra em linhas ou se ajusta sem desalinhar os demais botões.
6. **Given** o zoom do navegador a 200 % ou o texto maior, **When** a pessoa abre a modal, **Then** o seletor continua legível e alinhado.

---

### User Story 4 - "Sem limite" à direita em telas maiores (Priority: P2)

Quem abre as configurações em uma tela larga vê, em cada ajuda (letras e palavras), a opção "Sem limite" na mesma linha dos passos − e +, encostada no canto direito, com o nome, os passos e o valor à esquerda.

**Why this priority**: É um ajuste de composição; a opção já funciona e continua acessível em qualquer posição.

**Independent Test**: Abrir a modal em desktop e comparar a posição horizontal de "Sem limite" nas duas linhas de ajuda com a borda direita da área de conteúdo.

**Acceptance Scenarios**:

1. **Given** a modal em uma janela larga, **When** a pessoa olha as linhas de ajuda, **Then** "Sem limite" fica alinhada à direita, no mesmo ponto nas duas linhas.
2. **Given** a modal em um celular estreito, **When** a linha não cabe numa linha só, **Then** "Sem limite" desce para uma linha própria, alinhada à esquerda como hoje, sem sair da modal.
3. **Given** "Sem limite" marcado, **When** a pessoa vê a linha, **Then** o valor mostra "Sem limite" e os passos − e + seguem desativados, como hoje, sem que a posição dos controles se mexa.

---

### User Story 5 - Troca suave da cruzada padrão (Priority: P3)

Quem escolhe outra cruzada padrão vê a marca de "selecionada" deslizar e mudar de cor com uma transição curta, em vez de trocar de repente.

**Why this priority**: Melhora a percepção da mudança, mas o resultado já é correto sem a animação.

**Independent Test**: Clicar em outra fonte no seletor e verificar que o destaque se move até ela em uma transição curta; repetir com movimento reduzido ativado e verificar que a troca é imediata.

**Acceptance Scenarios**:

1. **Given** o seletor com a fonte A marcada, **When** a pessoa escolhe a fonte B, **Then** o destaque passa de A para B com uma transição de até 300 ms.
2. **Given** a preferência do sistema por menos movimento, **When** a pessoa escolhe outra fonte, **Then** o destaque troca na hora, sem animação.
3. **Given** a pessoa escolhendo a fonte pelo teclado (setas e Enter ou Espaço), **When** a marca troca, **Then** a transição acontece igual e o foco continua visível.
4. **Given** dois cliques rápidos em fontes diferentes, **When** o segundo ocorre no meio da transição, **Then** o destaque termina na última fonte escolhida, sem ficar preso no meio.

---

### Edge Cases

- Janela muito estreita (320 px): o cabeçalho, a engrenagem, a modal e o balão continuam sem rolagem lateral, e o balão cabe (quebrando o texto em mais de uma linha, se preciso).
- Idioma ou texto do balão mais longo que o atual: o balão não ultrapassa a janela em nenhum lado.
- Balão de um botão no canto esquerdo da tela ou no meio: continua centralizado sobre o botão quando cabe, e só se desloca quando precisaria sair da janela.
- Balão de um botão no topo da tela, quando o espaço abaixo não basta: segue as regras de posição que já valem hoje (abaixo ou acima).
- Cores forçadas e tema escuro: o destaque do seletor e o botão de tema continuam com a borda e o contraste da feature 023.
- Uma só fonte cadastrada: o seletor mostra o único botão marcado, sem animação nem salto.
- A modal aberta por cima de uma tela em carregamento ("Acordando o servidor"): o seletor e as linhas de ajuda têm o mesmo visual que na tela normal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O balão de qualquer botão de ícone MUST ficar inteiro dentro da janela visível em todas as larguras de 320 px em diante, inclusive o da engrenagem junto à borda direita.
- **FR-002**: O balão MUST continuar centralizado sobre o seu botão quando couber na janela, e só deslocar-se o necessário (ou quebrar o texto em linhas) quando não couber. O balão MUST continuar aparecendo só com o mouse parado ou o foco do teclado, nunca com toque, e fechando com Esc.
- **FR-003**: O balão da engrenagem MUST ser legível também com o site em estado "Acordando o servidor".
- **FR-004**: O botão de tema MUST ter a mesma largura e a mesma altura nos três estados (automático, claro, escuro), em todas as larguras de tela e nos dois temas.
- **FR-005**: A troca de estado do botão de tema MUST NOT mudar a posição nem o tamanho de nenhum outro item da linha "Tema" nem da modal.
- **FR-006**: O nome acessível e o texto visível do botão de tema MUST continuar indicando o estado atual, e a animação do ícone e a transição de tema (feature 021) MUST seguir como hoje.
- **FR-006a**: Os interruptores da modal MUST ter o mesmo tamanho, a mesma borda direita e o mesmo acabamento (borda, cor de ligado e de desligado) entre si, e o botão "Restaurar padrões" MUST ficar alinhado à mesma margem das demais linhas. *(Substituído pela feature 025: a caixa visível do botão fica na margem.)*
- **FR-007**: Os botões do seletor da cruzada padrão MUST ter altura e alinhamento iguais entre si e com as demais linhas da modal, sem texto cortado, sobreposto ou fora da modal, em todas as larguras de 320 px em diante e com 1 a 3 fontes.
- **FR-008**: O seletor MUST se adaptar a nomes de fonte longos e a textos maiores (zoom de 200 %) sem rolagem lateral na modal e sem desalinhar os botões.
- **FR-009**: Em telas largas, a opção "Sem limite" MUST ficar alinhada à direita da linha de cada ajuda, no mesmo ponto nas linhas de letras e de palavras.
- **FR-010**: Em telas estreitas, quando a linha da ajuda não couber, "Sem limite" MUST descer para uma linha própria, sem sair da modal.
- **FR-011**: A posição dos passos − e +, do valor e de "Sem limite" MUST NOT mudar ao marcar ou desmarcar "Sem limite", nem ao mudar o valor.
- **FR-012**: A troca da cruzada padrão MUST ter uma transição visual do destaque de uma fonte para a outra, com duração de até 300 ms.
- **FR-013**: Com a preferência de movimento reduzido ativa, a troca da cruzada padrão MUST ser imediata, sem animação. O mesmo vale para qualquer outra animação nova desta feature.
- **FR-014**: A transição do seletor MUST funcionar igual com mouse, toque e teclado, e uma nova escolha no meio da transição MUST terminar na última fonte escolhida.
- **FR-015**: A cruzada padrão salva, o valor das ajudas e a opção "Sem limite" MUST continuar sendo gravados e lidos exatamente como hoje; esta feature muda só a aparência.
- **FR-016**: Todos os controles alterados MUST manter as regras de acessibilidade já em vigor: contraste mínimo, alvo de toque, anel de foco do teclado, funcionamento em cores forçadas e sem violações do verificador automático nos dois temas.

### Key Entities

Nenhuma. A feature não cria nem altera dados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100 % das larguras testadas (320 px a 1920 px), o balão da engrenagem fica com todas as bordas dentro da janela.
- **SC-002**: A largura e a altura do botão de tema são idênticas (diferença de 0 px) nos três estados, nos dois temas e nas larguras de desktop e de celular.
- **SC-003**: Ao alternar o botão de tema pelos três estados, nenhum item vizinho na linha "Tema" muda de posição (diferença de até 1 px, margem de medição).
- **SC-004**: Em larguras de 320 px a 1920 px, os botões do seletor da cruzada padrão têm a mesma altura (diferença de até 1 px), não há texto cortado e a modal não tem rolagem lateral.
- **SC-008**: Em larguras de 320 px a 1920 px, os dois interruptores têm o mesmo tamanho e a borda direita de ambos fica a no máximo 1 px da borda direita da área de conteúdo, e o texto de "Restaurar padrões" fica a no máximo 1 px da margem esquerda das demais linhas. *(Substituído pela feature 025: a caixa visível do botão fica na margem.)*
- **SC-005**: Em janelas de desktop, "Sem limite" fica a no máximo 1 px da borda direita da área de conteúdo, nas duas linhas de ajuda.
- **SC-006**: A transição do destaque do seletor dura entre 100 ms e 300 ms e não ocorre com movimento reduzido.
- **SC-007**: Nenhum teste existente de acessibilidade, contraste ou botões da feature 023 deixa de passar, e as telas alteradas não têm violações do verificador automático nos dois temas.

## Assumptions

- O defeito do balão vem de a engrenagem ficar rente à borda direita enquanto a sessão carrega (confirmado por medição); a correção não depende do estado e vale para qualquer botão com balão, em todas as telas.
- "Telas maiores" para "Sem limite" segue o mesmo limite de largura que o site já usa para o layout de desktop e para a modal; em telas estreitas a opção pode descer de linha.
- As imagens da issue mostram o visual atual; a issue não diz exatamente o que as setas da primeira imagem apontam (interruptores e linha de "Restaurar padrões" são a leitura mais provável), então a história 3 cobre a modal inteira. O aspecto final dos botões segue o que a feature 023 definiu (contorno, cores e estados), sem redesenho.
- O botão de tema pode manter o texto atual de cada estado; para largura fixa, o espaço reservado é o do texto mais largo dos três.
- O balão não ganha novo conteúdo nem novo comportamento de abertura; só muda onde ele é posicionado.
- A modal de configurações passa a ter até 460 px de largura (hoje 420 px), porque o conteúdo atual não comporta nome, passos, valor e "Sem limite" numa linha. "Telas maiores" e "desktop", para "Sem limite", significam a modal com pelo menos 400 px de área de conteúdo; abaixo disso a opção desce de linha. As outras modais não mudam de largura.
- Só `apps/web` é alterado; a API, o banco e o pacote `shared` ficam como estão.
- Sem nova dependência: as animações usam os recursos do navegador já usados em outras partes do site.
